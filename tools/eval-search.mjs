#!/usr/bin/env node
// Search-quality evaluation: runs tools/search-battery.json against BOTH search paths —
// (a) the MCP tool search_orlandu (api/mcp.js over data/search-index.json) and
// (b) the header search dialog's ranking, replicated line-for-line from assets/site.js over
//     assets/search-index.js (the browser runs this code; the copy below must stay in step).
// Prints top-1 / top-3 hit rates per category and every miss. `--json out.json` dumps details.
//     node tools/eval-search.mjs [--json file] [--misses]

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const require = createRequire(import.meta.url);
const handler = require(path.join(root, "api", "mcp.js"));
const battery = JSON.parse(fs.readFileSync(path.join(here, "search-battery.json"), "utf8")).queries;

// ── (b) the header search, verbatim from assets/site.js ──
const SEARCH_INDEX = vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "search-index.js"), "utf8") + "\nSEARCH_INDEX;");
const siteJs = fs.readFileSync(path.join(root, "assets", "site.js"), "utf8");
// Lift the marked scoring block out of site.js so the harness cannot drift from the browser.
const blk = siteJs.match(/\/\* search-score:start[\s\S]*?\/\* search-score:end \*\//);
if (!blk) { console.error("could not find the /* search-score:start */ … /* search-score:end */ block in assets/site.js"); process.exit(2); }
const headerSearch = (INDEX, input) => {
  const rank = new Function("INDEX", blk[0] + "\nreturn rank;")(INDEX);
  const r = rank(input);
  return (r || []).slice(0, 12).map(x => x.e.u);
};

// ── (a) the MCP tool ──
async function mcpSearch(q) {
  const r = { h: {}, setHeader() {}, status(c) { this.c = c; return this; }, json(o) { this.b = JSON.stringify(o); }, send(s) { this.b = s; }, end() {} };
  await handler({ method: "POST", body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_orlandu", arguments: { query: q, limit: 12 } } } }, r);
  const text = JSON.parse(r.b).result.content[0].text;
  return [...text.matchAll(/^\s+(https:\/\/www\.orlandu\.com\/\S*)$/gm)].map(x => x[1]);
}

const page = u => {
  let s = String(u).replace(/^https?:\/\/(www\.)?orlandu\.com\//, "").split("#")[0].split("?")[0].replace(/\.html$/, "");
  return s === "" ? "home" : s;
};
const targets = t => (Array.isArray(t) ? t : [t]);

const args = process.argv.slice(2);
const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
const showMisses = args.includes("--misses") || !jsonOut;

const results = [];
for (const q of battery) {
  const want = targets(q.target);
  const a = (await mcpSearch(q.q)).map(page);
  const b = headerSearch(SEARCH_INDEX, q.q).map(page);
  const grade = list => ({ top1: list.length > 0 && want.includes(list[0]), top3: list.slice(0, 3).some(p => want.includes(p)), got: list.slice(0, 3) });
  results.push({ q: q.q, cat: q.cat, want, mcp: grade(a), hdr: grade(b) });
}

function table(key) {
  const cats = {};
  for (const r of results) {
    const c = cats[r.cat] || (cats[r.cat] = { n: 0, t1: 0, t3: 0 });
    c.n++; if (r[key].top1) c.t1++; if (r[key].top3) c.t3++;
  }
  const all = { n: results.length, t1: results.filter(r => r[key].top1).length, t3: results.filter(r => r[key].top3).length };
  const pct = (a, b) => (100 * a / b).toFixed(0).padStart(3) + "%";
  const lines = Object.entries(cats).map(([c, v]) => `  ${c.padEnd(16)} n=${String(v.n).padStart(3)}  top1 ${pct(v.t1, v.n)}  top3 ${pct(v.t3, v.n)}`);
  lines.push(`  ${"ALL".padEnd(16)} n=${String(all.n).padStart(3)}  top1 ${pct(all.t1, all.n)}  top3 ${pct(all.t3, all.n)}`);
  return lines.join("\n");
}
console.log("MCP search_orlandu\n" + table("mcp"));
console.log("\nHeader search (site.js)\n" + table("hdr"));
if (showMisses) {
  for (const key of ["mcp", "hdr"]) {
    console.log(`\nMisses (top-3) — ${key}`);
    for (const r of results) if (!r[key].top3) console.log(`  "${r.q}" [${r.cat}] want ${r.want.slice(0, 3).join("|")}${r.want.length > 3 ? "…" : ""} → got ${r[key].got.join(", ") || "(nothing)"}`);
    console.log(`\nTop-1 misses that are top-3 hits — ${key}`);
    for (const r of results) if (r[key].top3 && !r[key].top1) console.log(`  "${r.q}" want ${r.want.slice(0, 3).join("|")} → got ${r[key].got.join(", ")}`);
  }
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(results, null, 1));
