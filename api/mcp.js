// Orlandu's Arcade — MCP server (Model Context Protocol, Streamable HTTP transport, stateless).
// Vercel serverless function, Node runtime, no dependencies. POST JSON-RPC 2.0 to /api/mcp.
//
// Lets any MCP-capable assistant or agent (Claude, ChatGPT, Cursor, Copilot, Claude Code…) use the
// site as a tool: search it, read a page as text, and query the open datasets, plan a console-to-monitor connection (eight tools). Everything served
// here is already public on the site; the data files are generated before each push by
// tools/build-llms-full.py and tools/build-datasets.py. Human instructions live at /mcp.html.
//
// Methods: initialize, ping, tools/list, tools/call (+ notifications, which get a 202). No sessions,
// no SSE: every request is answered with one JSON body, which the spec allows. GET answers 405 with
// a pointer to the docs, so a browser hitting the URL by hand learns what it is.

const PAGES = require("../data/pages.json");
const INDEX = require("../data/search-index.json");
const MONITORS = require("../data/sony-monitor-specs.json");
const PC10 = require("../data/playchoice-10-library.json");
const CONSOLES = require("../data/console-video-out.json");
const BKM = require("../data/bkm-cards.json");
const CONNECT = require("../data/connect.json");
const ConnectPlan = require("../assets/connect-plan.js");

const SITE = "https://www.orlandu.com/";
const SERVER = { name: "orlandu-arcade", title: "Orlandu's Arcade", version: "1.0.0" };
const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const INSTRUCTIONS =
  "Orlandu's Arcade is a private arcade and working collection in Orange County, California: arcade cabinets, " +
  "pinball, RGB-modded consoles and a fleet of Sony professional broadcast monitors (PVM, BVM, LMD), each documented " +
  "with its work log, plus buying guides and reference pieces. Use search_orlandu to find pages, read_orlandu_page to " +
  "read one in full, and the dataset tools for structured specs. Cite pages by their URL. The arcade is private — not " +
  "open to the public — and nothing here is for sale except what the For Sale page lists on eBay.";

const TOOLS = [
  {
    name: "search_orlandu",
    title: "Search orlandu.com",
    description: "Full-text search over every page, card, glossary term and gallery caption on orlandu.com. Returns the best-matching pages with a snippet and URL. Use it first, then read_orlandu_page for the full text.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Words to look for, e.g. 'BVM-20E1U option slots' or 'PlayChoice-10 toppers'" }, limit: { type: "integer", minimum: 1, maximum: 20, default: 8 } }, required: ["query"] },
  },
  {
    name: "read_orlandu_page",
    title: "Read a page",
    description: "The full readable text of one orlandu.com page as Markdown (no images). Give the page's URL or slug, e.g. 'pvm-20l5-buying-guide' or 'https://www.orlandu.com/pvm-vs-bvm.html'.",
    inputSchema: { type: "object", properties: { page: { type: "string", description: "Slug or URL" }, max_chars: { type: "integer", minimum: 1000, maximum: 200000, default: 60000 } }, required: ["page"] },
  },
  {
    name: "list_orlandu_pages",
    title: "List pages",
    description: "Every page on orlandu.com with its title, URL and one-line description — the site map for an agent.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "sony_monitor_specs",
    title: "Sony monitor specs",
    description: "Specifications of the Sony PVM, BVM and LMD monitors in the collection (display, size, resolution, formats, inputs, option slots, weight, dimensions, era). Optional model filter, e.g. 'PVM-20L5' or 'BVM'. Dataset CC BY 4.0.",
    inputSchema: { type: "object", properties: { model: { type: "string", description: "Substring of a model name; omit for all" } } },
  },
  {
    name: "playchoice_10_library",
    title: "PlayChoice-10 library",
    description: "The 52 games Nintendo released for the PlayChoice-10 arcade system, each with a photo of its original game board. Dataset CC BY 4.0.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "bkm_cards",
    title: "Sony BKM option cards",
    description: "Every Sony BKM option card for the CRT-era BVM and PVM monitors: Sony's name, what it does, which chassis it fits, and the Sony source. Optional filter matched against the card model AND the Fits column, e.g. 'BKM-129X', 'PVM-20L5' or 'BVM-A'. Dataset CC BY 4.0.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Substring of a card model or a monitor model; omit for all" } } },
  },
  {
    name: "console_video_out",
    title: "Console video out",
    description: "How each retro console in the collection reaches a Sony professional monitor: the modification (if any), the video output used, and the cable chain. Optional console filter, e.g. 'Genesis'. Dataset CC BY 4.0.",
    inputSchema: { type: "object", properties: { console: { type: "string", description: "Substring of a console name; omit for all" } } },
  },
  {
    name: "plan_connection",
    title: "Will it connect?",
    description: "Plan the connection from a retro console to one of the Sony monitors in the collection: the best signal the pair shares, the cable chain step by step, sync and 75-ohm termination rules, and whether a BKM card, a console mod or adapter, or a converter is needed. Consoles: NES, SNES, N64, GameCube, Genesis, Saturn, PC Engine, PlayStation, PS2, Dreamcast, Xbox, Wii, Neo Geo, Master System. Monitors: PVM-2950Q, PVM-20L5, BVM-20E1U, BVM-A14F5U, LMD-9020/9030/9050/940W. Rules dataset CC BY 4.0.",
    inputSchema: { type: "object", properties: { console: { type: "string", description: "Console name, e.g. 'Super Nintendo' or 'Dreamcast'" }, monitor: { type: "string", description: "Monitor model, e.g. 'BVM-20E1U'" } }, required: ["console", "monitor"] },
  },
];

// ── tool implementations ──
// Matching rules shared with the header search in assets/site.js (keep the two in step; tools/eval-search.mjs
// scores both against tools/search-battery.json): hyphens, periods and apostrophes are dropped before comparing,
// so "pvm 20l5", "pvm-20l5" and "PVM20L5" all find PVM-20L5 and "players guide" finds "Player's Guide"; filler
// words (what/is/how/to…) are ignored; a run-together token ("donkeykong", "15khz") can match a title or heading
// with its spaces removed; a token that matches nothing anywhere is retried as a one-letter typo of a title/heading
// word ("playchoise", "trinatron"); and a few hobby abbreviations expand (n64, snes, pc10, smb, tna).
const STOP = new Set(["a", "an", "the", "is", "are", "was", "what", "whats", "which", "how", "do", "does", "to", "of", "for", "in", "on", "and", "or", "my", "your", "with", "it", "i", "can", "about", "me", "any", "some"]);
const ALIAS = { n64: "nintendo 64", snes: "super nintendo", nes: "nintendo entertainment system", gba: "game boy advance", gb: "game boy", ps2: "playstation 2", pce: "pc engine", tg16: "turbografx", pc10: "playchoice 10", smb: "super mario bros", dk: "donkey kong", tna: "total nuclear annihilation", ij: "indiana jones", mvc: "marvel vs capcom", cps2: "cps 2", cps1: "cps 1", crt: "tube", lcd: "panel", vs: "vs", scanline: "scan line", scanlines: "scan line", controller: "control unit", comparison: "compare", naming: "model number" };
const norm = s => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[\u2019'.-]/g, "");
const compact = s => norm(s).replace(/[^a-z0-9]/g, "");
const tokens = q => { const all = norm(q).split(/[^a-z0-9]+/).filter(t => t.length > 1); const kept = all.filter(t => !STOP.has(t)); return kept.length ? kept : all; };
const forms = raw => { // the spellings of one query token that count as a hit: as typed, singular, verb stem, abbreviation expansion
  const out = [raw];
  if (raw.length > 3 && !raw.endsWith("ss") && raw.endsWith("s")) out.push(raw.slice(0, -1));
  if (raw.length > 5 && raw.endsWith("ing")) out.push(raw.slice(0, -3));
  if (raw.length > 6 && raw.endsWith("ate")) out.push(raw.slice(0, -1)); // "simulate" finds "simulator", "calibrate" finds "calibration"
  if (ALIAS[raw] && ALIAS[raw] !== raw) out.push(ALIAS[raw]);
  return out;
};

let PREP = null, VOCAB = null;
function prep() {
  if (PREP) return PREP;
  PREP = INDEX.map(e => {
    const slug = String(e.u).toLowerCase().replace(/\.html$/, "").split("#")[0].split(/[^a-z0-9]+/).filter(Boolean);
    return { e, t: norm(e.t), tt: norm(e.tt), h: norm(e.h), s: norm(e.s), b: norm(e.b), k: norm(e.k), tc: compact(e.t), hc: compact(e.h), u: slug.concat(slug.length > 1 ? [slug.join("")] : []) };
  });
  VOCAB = new Set();
  for (const p of PREP) for (const w of (p.t + " " + p.tt + " " + p.h + " " + p.u.join(" ")).split(/[^a-z]+/)) if (w.length >= 4) VOCAB.add(w);
  return PREP;
}
function edits1(a, b) { // true when a and b differ by one substitution, insertion, deletion or adjacent swap
  if (a === b) return false;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0; while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}
function typo(tok) {
  if (tok.length < 5 || !/^[a-z]+$/.test(tok)) return null;
  for (const w of VOCAB) if (edits1(tok, w)) return w;
  return null;
}
const hitsAnywhere = (P, raw) => forms(raw).some(f => P.some(p => p.t.includes(f) || p.tt.includes(f) || p.h.includes(f) || p.b.includes(f) || p.tc.includes(f) || p.hc.includes(f) || p.u.includes(f)));

function scoreEntry(p, tok) { // one query token against one index entry; the best of the token's forms counts
  let best = 0;
  for (const f of forms(tok)) {
    let v = 0;
    if (p.t.includes(f) || (f.length > 3 && p.tc.includes(f))) v += 20;
    else if (p.tt.includes(f)) v += 15; // the page <title> where it differs from the H1 ("PVM vs. BVM: …")
    if (p.u.includes(f)) v += 10; // slug words: "gba sp" → gba-sp.html, "pvm20l5" → the joined slug
    if (p.h.includes(f) || (f.length > 3 && p.hc.includes(f))) v += 5;
    if (p.k.includes(f)) v += 6; // the kind label: "glossary", "console", "project"
    if (p.s.includes(f)) v += 3;
    const n = p.b.split(f).length - 1;
    if (n) v += Math.min(n, 3);
    if (v > best) best = v;
  }
  return best;
}

function search(query, limit) {
  const P = prep();
  let toks = tokens(query);
  if (!toks.length) return [];
  toks = toks.map(raw => (hitsAnywhere(P, raw) ? raw : (typo(raw) || raw)));
  const phrase = norm(query).trim().replace(/\s+/g, " ");
  const scored = [];
  for (const p of P) {
    let score = 0, hits = 0;
    for (const tok of toks) { const v = scoreEntry(p, tok); if (v) hits++; score += v; }
    if (toks.length > 1 && phrase.length > 3 && (p.t.includes(phrase) || p.h.includes(phrase) || p.b.includes(phrase))) score += 10;
    if (phrase === p.t) score += 8; // the exact title (a tie-breaker, not enough to lift a photo over its profile page)
    if (hits === toks.length || (toks.length > 2 && hits >= toks.length - 1)) scored.push([score + (p.e.w || 0), p.e]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  return scored.slice(0, limit).map(([score, e]) => {
    const url = e.u === "/" ? SITE : SITE + e.u;
    let snippet = e.s || "";
    if (!snippet && e.b) {
      const i = norm(e.b).indexOf(toks[0]);
      snippet = e.b.slice(Math.max(0, i - 80), i + 160).trim();
    }
    return { title: e.t, kind: e.k, url, snippet: snippet.slice(0, 240), score };
  });
}

function findPage(ref) {
  const r = String(ref || "").trim().toLowerCase();
  // strip the fragment/query FIRST, or ".html#section" and ".html?x" never lose their extension
  const slug = r.split("#")[0].split("?")[0].replace(/^https?:\/\/(www\.)?orlandu\.com\//, "").replace(/^\//, "").replace(/\.html$/, "");
  return PAGES.find(p => p.slug === slug || p.url.toLowerCase() === r || (slug === "" && p.slug === "home") || (slug === "index" && p.slug === "home"));
}

function rows(ds, key, filter) {
  const f = norm(filter);
  const out = f ? ds.rows.filter(r => norm(r[key]).includes(f)) : ds.rows;
  return { dataset: ds.dataset, source: ds.source, license: ds.license, credit: ds.credit, count: out.length, rows: out };
}

function callTool(name, args) {
  args = args && typeof args === "object" ? args : {};
  switch (name) {
    case "search_orlandu": {
      if (typeof args.query !== "string" || !args.query.trim()) throw rpcError(-32602, "query (string) is required");
      const limit = Math.min(Math.max(parseInt(args.limit, 10) || 8, 1), 20);
      const hits = search(args.query, limit);
      if (!hits.length) return text(`No matches on orlandu.com for "${args.query}". Try fewer or different words, or list_orlandu_pages.`);
      return text(hits.map((h, i) => `${i + 1}. ${h.title} (${h.kind})\n   ${h.url}\n   ${h.snippet}`).join("\n\n"));
    }
    case "read_orlandu_page": {
      if (typeof args.page !== "string") throw rpcError(-32602, "page (string) is required — a slug or URL; use list_orlandu_pages for slugs");
      const p = findPage(args.page);
      if (!p) throw rpcError(-32602, `No page matches "${args.page}". Use list_orlandu_pages for slugs.`);
      const max = Math.min(Math.max(parseInt(args.max_chars, 10) || 60000, 1000), 200000);
      let body = p.text;
      if (body.length > max) body = body.slice(0, max) + `\n\n[… truncated at ${max} characters; the full page is at ${p.url}]`;
      return text(`# ${p.title}\n\nURL: ${p.url}\n\n${p.description}\n\n${body}`);
    }
    case "list_orlandu_pages":
      return text(PAGES.map(p => `- ${p.title} — ${p.url}\n  ${p.description}`).join("\n"));
    case "sony_monitor_specs":
      return json(rows(MONITORS, "model", args.model));
    case "playchoice_10_library":
      return json({ dataset: PC10.dataset, source: PC10.source, license: PC10.license, credit: PC10.credit, count: PC10.rows.length, rows: PC10.rows });
    case "console_video_out":
      return json(rows(CONSOLES, "console", args.console));
    case "plan_connection": {
      if (typeof args.console !== "string" || typeof args.monitor !== "string") throw rpcError(-32602, "console (string) and monitor (string) are required");
      const p = ConnectPlan.plan(CONNECT, args.console, args.monitor);
      if (p.error) throw rpcError(-32602, p.error + (p.consoles ? ". Consoles: " + p.consoles.join(", ") : "") + (p.monitors ? ". Monitors: " + p.monitors.join(", ") : ""));
      return json({ dataset: CONNECT.dataset, source: CONNECT.source, license: CONNECT.license, credit: CONNECT.credit, plan: p });
    }
    case "bkm_cards": {
      const f = norm(args.query);
      // Substring match on model, Fits and family — but a Fits that says "not BVM-A" must not answer "BVM-A".
      const out = f ? BKM.rows.filter(r => norm(r.model).includes(f) || norm(r.family).includes(f) || (norm(r.fits).includes(f) && !norm(r.fits).includes("not " + f))) : BKM.rows;
      return json({ dataset: BKM.dataset, source: BKM.source, license: BKM.license, credit: BKM.credit, count: out.length, rows: out });
    }
    default:
      throw rpcError(-32602, `Unknown tool: ${name}`);
  }
}

const text = s => ({ content: [{ type: "text", text: s }] });
const json = o => ({ content: [{ type: "text", text: JSON.stringify(o, null, 1) }], structuredContent: o });
function rpcError(code, message) { const e = new Error(message); e.rpc = { code, message }; return e; }

// ── JSON-RPC dispatch ──
function handle(msg) {
  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return { jsonrpc: "2.0", id: msg && msg.id !== undefined ? msg.id : null, error: { code: -32600, message: "Invalid Request" } };
  }
  const { id, method, params } = msg;
  const isNotification = id === undefined || id === null;
  try {
    let result;
    if (method === "initialize") {
      const want = params && params.protocolVersion;
      result = { protocolVersion: PROTOCOLS.includes(want) ? want : PROTOCOLS[0], capabilities: { tools: { listChanged: false } }, serverInfo: SERVER, instructions: INSTRUCTIONS };
    } else if (method === "ping") {
      result = {};
    } else if (method === "tools/list") {
      result = { tools: TOOLS };
    } else if (method === "tools/call") {
      const name = params && params.name;
      try { result = callTool(name, params && params.arguments); }
      catch (e) { if (e.rpc && e.rpc.code === -32602) result = { content: [{ type: "text", text: e.rpc.message }], isError: true }; else throw e; }
    } else if (method.startsWith("notifications/")) {
      return null;
    } else if (method === "resources/list" || method === "prompts/list") {
      result = method === "resources/list" ? { resources: [] } : { prompts: [] };
    } else {
      throw rpcError(-32601, `Method not found: ${method}`);
    }
    return isNotification ? null : { jsonrpc: "2.0", id, result };
  } catch (e) {
    if (isNotification) return null;
    return { jsonrpc: "2.0", id, error: e.rpc || { code: -32603, message: "Internal error" } };
  }
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json({ ok: false, error: "This is an MCP server. POST JSON-RPC 2.0 here, or read https://www.orlandu.com/mcp.html for how to connect an assistant.", server: SERVER, tools: TOOLS.map(t => t.name) });
    return;
  }
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = undefined; } }
  if (b === undefined || b === null) { res.status(400).json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); return; }
  const out = Array.isArray(b) ? b.map(handle).filter(Boolean) : handle(b);
  if (out === null || (Array.isArray(out) && !out.length)) { res.status(202).end(); return; }
  res.setHeader("Content-Type", "application/json");
  res.status(200).send(JSON.stringify(out));
};
