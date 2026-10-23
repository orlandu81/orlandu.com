#!/usr/bin/env node
// Smoke/contract tests for api/mcp.js — run from the repo root before every push:
//     node tools/test-mcp.mjs
// Loads the function with mock req/res (no network), exercises every JSON-RPC method and every
// tool with normal, empty, nonsense, oversized, missing and wrong-type input, and checks the
// transport rules (GET → 405 JSON, OPTIONS → 204, notifications → 202, malformed body → 400,
// CORS headers, batch requests). Exits 1 on the first failed assertion group so a broken data
// file or a thrown tool cannot ship. Takes ~1 s.

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const handler = require(path.join(here, "..", "api", "mcp.js"));

let failures = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { failures++; console.log("  FAIL  " + msg); } }

function mockRes() {
  const r = { headers: {}, code: 200, body: undefined, ended: false };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.status = c => { r.code = c; return r; };
  r.json = o => { r.body = JSON.stringify(o); r.ended = true; return r; };
  r.send = s => { r.body = s; r.ended = true; return r; };
  r.end = () => { r.ended = true; return r; };
  return r;
}
async function call(method, body, extra = {}) {
  const res = mockRes();
  await handler({ method, body, headers: {}, ...extra }, res);
  let parsed = null;
  if (typeof res.body === "string") { try { parsed = JSON.parse(res.body); } catch (e) { parsed = undefined; } }
  return { res, parsed };
}
let nextId = 1;
const rpc = (method, params) => ({ jsonrpc: "2.0", id: nextId++, method, ...(params !== undefined ? { params } : {}) });
async function tool(name, args) {
  const { res, parsed } = await call("POST", rpc("tools/call", { name, arguments: args }));
  return { res, parsed, result: parsed && parsed.result, error: parsed && parsed.error };
}
const section = name => console.log("\n" + name);

// ── transport ──
section("transport");
{
  const { res, parsed } = await call("GET", undefined);
  ok(res.code === 405, "GET → 405 (got " + res.code + ")");
  ok(parsed && parsed.ok === false && Array.isArray(parsed.tools) && parsed.tools.length === 8, "GET body is JSON with 8 tool names");
  ok(res.headers["allow"] === "POST, OPTIONS", "GET sets Allow");
  ok(res.headers["access-control-allow-origin"] === "*", "CORS origin * on GET");
}
{
  const { res } = await call("OPTIONS", undefined);
  ok(res.code === 204 && res.ended, "OPTIONS → 204");
  ok(/POST/.test(res.headers["access-control-allow-methods"] || ""), "CORS methods header");
  ok(/Mcp-Session-Id/i.test(res.headers["access-control-allow-headers"] || ""), "CORS allows Mcp-Session-Id");
  ok(res.headers["cache-control"] === "no-store", "Cache-Control no-store");
}
{
  const { res, parsed } = await call("POST", "{not json");
  ok(res.code === 400 && parsed && parsed.error && parsed.error.code === -32700, "malformed JSON string body → 400 / -32700");
}
{
  const { res } = await call("POST", undefined);
  ok(res.code === 400, "missing body → 400");
}
{
  const { res } = await call("POST", { jsonrpc: "2.0", method: "notifications/initialized" });
  ok(res.code === 202 && res.body === undefined, "notification → 202 with no body");
}
{
  const { res, parsed } = await call("POST", { jsonrpc: "2.0", id: 7, method: "no/such/method" });
  ok(res.code === 200 && parsed.error && parsed.error.code === -32601 && parsed.id === 7, "unknown method → -32601 with id echoed");
}
{
  const { parsed } = await call("POST", { foo: "bar" });
  ok(parsed && parsed.error && parsed.error.code === -32600 && parsed.id === null, "non-JSON-RPC object → -32600 Invalid Request");
}
{
  const { parsed } = await call("POST", [1, "two", null]);
  ok(Array.isArray(parsed) && parsed.length === 3 && parsed.every(r => r.error && r.error.code === -32600), "batch of junk → three -32600 errors");
}
{
  const { res } = await call("POST", []);
  ok(res.code === 202, "empty batch → 202 (treated as all-notifications)");
}
{
  const { parsed } = await call("POST", [rpc("ping"), { jsonrpc: "2.0", method: "notifications/x" }, rpc("tools/list")]);
  ok(Array.isArray(parsed) && parsed.length === 2, "batch drops the notification, answers the two requests");
  ok(parsed[1].result && parsed[1].result.tools.length === 8, "batch tools/list answered");
}
{
  const { res, parsed } = await call("POST", JSON.stringify(rpc("ping")));
  ok(res.code === 200 && parsed.result && Object.keys(parsed.result).length === 0, "string JSON body is parsed; ping → {}");
  ok(res.headers["content-type"] === "application/json", "Content-Type application/json on success");
}

// ── initialize / list ──
section("initialize, tools/list");
{
  const { parsed } = await call("POST", rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0" } }));
  ok(parsed.result.protocolVersion === "2025-06-18", "initialize echoes a supported protocolVersion");
  ok(parsed.result.serverInfo && parsed.result.serverInfo.name === "orlandu-arcade", "serverInfo.name");
  ok(parsed.result.capabilities && parsed.result.capabilities.tools, "capabilities.tools present");
  ok(typeof parsed.result.instructions === "string" && !/san clemente/i.test(parsed.result.instructions), "instructions present, no city name");
}
{
  const { parsed } = await call("POST", rpc("initialize", { protocolVersion: "1999-01-01" }));
  ok(parsed.result.protocolVersion === "2025-06-18", "unknown protocolVersion → server's latest");
  const { parsed: p2 } = await call("POST", rpc("initialize"));
  ok(p2.result && p2.result.protocolVersion, "initialize with no params does not throw");
}
let TOOLS;
{
  const { parsed } = await call("POST", rpc("tools/list"));
  TOOLS = parsed.result.tools;
  ok(TOOLS.length === 8, "tools/list has 8 tools (got " + TOOLS.length + ")");
  const names = TOOLS.map(t => t.name).sort().join(",");
  ok(names === "bkm_cards,console_video_out,list_orlandu_pages,plan_connection,playchoice_10_library,read_orlandu_page,search_orlandu,sony_monitor_specs", "tool names: " + names);
  for (const t of TOOLS) {
    ok(/^[a-z0-9_]+$/.test(t.name), t.name + " name is snake_case");
    ok(typeof t.description === "string" && t.description.length > 40, t.name + " has a description");
    const s = t.inputSchema;
    ok(s && s.type === "object" && typeof s.properties === "object", t.name + " inputSchema is an object schema");
    for (const r of s.required || []) ok(r in s.properties, t.name + " required '" + r + "' is defined");
    for (const [k, v] of Object.entries(s.properties)) ok(["string", "integer", "number", "boolean"].includes(v.type), t.name + "." + k + " has a scalar type");
  }
  ok(parsed.result.tools.length === new Set(TOOLS.map(t => t.name)).size, "no duplicate tool names");
}
{
  const { parsed } = await call("POST", rpc("resources/list"));
  ok(parsed.result && Array.isArray(parsed.result.resources), "resources/list → empty list, not an error");
  const { parsed: p } = await call("POST", rpc("prompts/list"));
  ok(p.result && Array.isArray(p.result.prompts), "prompts/list → empty list");
}

// ── tools/call plumbing ──
section("tools/call plumbing");
{
  const { parsed } = await call("POST", rpc("tools/call", {}));
  ok(parsed.result && parsed.result.isError === true, "tools/call without name → isError result, not a crash");
  const { parsed: p2 } = await call("POST", rpc("tools/call", { name: "nope" }));
  ok(p2.result && p2.result.isError && /Unknown tool/.test(p2.result.content[0].text), "unknown tool → isError 'Unknown tool'");
  const { parsed: p3 } = await call("POST", rpc("tools/call"));
  ok(p3.result && p3.result.isError, "tools/call with no params → isError");
  const { parsed: p4 } = await call("POST", rpc("tools/call", { name: "search_orlandu", arguments: "not an object" }));
  ok(p4.result && p4.result.isError, "arguments of wrong type → isError");
  const { parsed: p5 } = await call("POST", rpc("tools/call", { name: "search_orlandu", arguments: null }));
  ok(p5.result && p5.result.isError, "arguments null → isError");
}

// ── search_orlandu ──
section("search_orlandu");
{
  const r = await tool("search_orlandu", { query: "PVM-20L5" });
  ok(r.result && !r.result.isError && /pvm-20l5/i.test(r.result.content[0].text), "normal query returns PVM-20L5 pages");
  ok(/^1\. /.test(r.result.content[0].text), "results are numbered");
  for (const bad of [{}, { query: "" }, { query: "   " }, { query: 42 }, { query: null }, { query: ["a"] }]) {
    const x = await tool("search_orlandu", bad);
    ok(x.result && x.result.isError === true && /query/.test(x.result.content[0].text), "bad query " + JSON.stringify(bad) + " → isError");
  }
  const no = await tool("search_orlandu", { query: "zqxjkvwpf" });
  ok(no.result && !no.result.isError && /No matches/.test(no.result.content[0].text), "nonsense → 'No matches' text, not an error");
  const punct = await tool("search_orlandu", { query: "!!! ??? ... ---" });
  ok(punct.result && /No matches/.test(punct.result.content[0].text), "punctuation-only → No matches (tokens empty)");
  const huge = await tool("search_orlandu", { query: "pvm ".repeat(20000) });
  ok(huge.result && !huge.error, "80k-char query does not throw");
  const uni = await tool("search_orlandu", { query: "Kay·Bee × World of Nintendo ñ 東京" });
  ok(uni.result && !uni.error, "unicode query does not throw");
  const regexy = await tool("search_orlandu", { query: "(pvm|bvm)+$^\\d" });
  ok(regexy.result && !regexy.error, "regex metacharacters are literal, no throw");
  for (const lim of [0, -5, 999, "7", "abc", 2.9, null]) {
    const x = await tool("search_orlandu", { query: "sony", limit: lim });
    const n = (x.result.content[0].text.match(/^\d+\. /gm) || []).length;
    ok(x.result && !x.result.isError && n >= 1 && n <= 20, "limit=" + JSON.stringify(lim) + " clamps to 1..20 (got " + n + ")");
  }
  const one = await tool("search_orlandu", { query: "sony", limit: 1 });
  ok((one.result.content[0].text.match(/^\d+\. /gm) || []).length === 1, "limit=1 returns one");
}

// ── read_orlandu_page ──
section("read_orlandu_page");
{
  for (const ref of ["pvm-vs-bvm", "pvm-vs-bvm.html", "/pvm-vs-bvm.html", "https://www.orlandu.com/pvm-vs-bvm.html", "https://orlandu.com/pvm-vs-bvm.html#table", "PVM-VS-BVM.HTML?x=1", "  pvm-vs-bvm  "]) {
    const r = await tool("read_orlandu_page", { page: ref });
    ok(r.result && !r.result.isError && /^# /.test(r.result.content[0].text) && /pvm-vs-bvm\.html/.test(r.result.content[0].text), "resolves " + JSON.stringify(ref));
  }
  for (const ref of ["/", "index", "index.html", "https://www.orlandu.com/"]) {
    const r = await tool("read_orlandu_page", { page: ref });
    ok(r.result && !r.result.isError && /URL: https:\/\/www\.orlandu\.com\/\n/.test(r.result.content[0].text), "home resolves from " + JSON.stringify(ref));
  }
  for (const bad of [{}, { page: "no-such-page" }, { page: 12 }, { page: null }, { page: "https://evil.example/pvm-vs-bvm.html" }, { page: "../../etc/passwd" }]) {
    const r = await tool("read_orlandu_page", bad);
    ok(r.result && r.result.isError === true && /No page matches|page \(string\) is required/.test(r.result.content[0].text), "bad page " + JSON.stringify(bad) + " → isError");
  }
  const small = await tool("read_orlandu_page", { page: "ams-100-monograph", max_chars: 1000 });
  ok(/truncated at 1000 characters/.test(small.result.content[0].text), "max_chars truncates with a note");
  const tiny = await tool("read_orlandu_page", { page: "ams-100-monograph", max_chars: 5 });
  ok(/truncated at 1000 characters/.test(tiny.result.content[0].text), "max_chars below 1000 clamps to 1000");
  const big = await tool("read_orlandu_page", { page: "ams-100-monograph", max_chars: 10 ** 9 });
  ok(big.result && !big.result.isError && !/truncated at 200000/.test(big.result.content[0].text) || /truncated at 200000/.test(big.result.content[0].text), "huge max_chars clamps to 200000 without throwing");
  const str = await tool("read_orlandu_page", { page: "about", max_chars: "abc" });
  ok(str.result && !str.result.isError, "non-numeric max_chars falls back to default");
}

// ── list_orlandu_pages ──
section("list_orlandu_pages");
{
  const r = await tool("list_orlandu_pages", {});
  const lines = r.result.content[0].text.split("\n").filter(l => l.startsWith("- "));
  ok(lines.length >= 45, "lists every page (" + lines.length + ")");
  ok(lines.every(l => /https:\/\/www\.orlandu\.com\//.test(l)), "every line carries an absolute URL");
  const r2 = await tool("list_orlandu_pages", { junk: 1, more: [1, 2] });
  ok(r2.result && !r2.result.isError, "extra args ignored");
  const r3 = await tool("list_orlandu_pages");
  ok(r3.result && !r3.result.isError, "missing arguments object is fine");
}

// ── datasets ──
section("dataset tools");
function dsOk(r, label) {
  ok(r.result && !r.result.isError, label + " answers");
  const sc = r.result && r.result.structuredContent;
  ok(sc && typeof sc.count === "number" && Array.isArray(sc.rows) && sc.rows.length === sc.count, label + " structuredContent count matches rows");
  ok(sc && /creativecommons\.org\/licenses\/by|CC BY/.test(sc.license || ""), label + " carries the CC BY license");
  ok(sc && sc.credit && sc.source, label + " carries credit + source");
  let parsed; try { parsed = JSON.parse(r.result.content[0].text); } catch (e) {}
  ok(parsed && parsed.count === sc.count, label + " text content is the same JSON");
  return sc;
}
{
  const all = dsOk(await tool("sony_monitor_specs", {}), "sony_monitor_specs (all)");
  ok(all.count === 8, "8 monitor rows (got " + all.count + ")");
  const one = dsOk(await tool("sony_monitor_specs", { model: "pvm-20l5" }), "sony_monitor_specs PVM-20L5");
  ok(one.count === 1 && one.rows[0].model === "PVM-20L5", "case-insensitive model filter → 1 row");
  const bvm = dsOk(await tool("sony_monitor_specs", { model: "BVM" }), "sony_monitor_specs BVM");
  ok(bvm.count === 2, "'BVM' → 2 rows");
  const none = dsOk(await tool("sony_monitor_specs", { model: "zzz" }), "sony_monitor_specs nonsense");
  ok(none.count === 0, "nonsense filter → 0 rows, no error");
  const num = dsOk(await tool("sony_monitor_specs", { model: 2950 }), "sony_monitor_specs numeric filter");
  ok(num.count === 1, "numeric filter is stringified (2950 → 1 row)");
  const hugeF = await tool("sony_monitor_specs", { model: "x".repeat(100000) });
  ok(hugeF.result && !hugeF.result.isError, "100k-char filter does not throw");
  const objF = await tool("sony_monitor_specs", { model: { a: 1 } });
  ok(objF.result && !objF.result.isError, "object filter does not throw");
}
{
  const pc = dsOk(await tool("playchoice_10_library", {}), "playchoice_10_library");
  ok(pc.count === 52, "52 PlayChoice-10 titles (got " + pc.count + ")");
  ok(pc.rows.every(r => r.title || r.game), "every PC-10 row has a title");
}
{
  const all = dsOk(await tool("console_video_out", {}), "console_video_out (all)");
  ok(all.count === 9, "9 console rows (got " + all.count + ")");
  const gen = dsOk(await tool("console_video_out", { console: "genesis" }), "console_video_out genesis");
  ok(gen.count === 2, "'genesis' → 2 rows (Model 1 + CDX)");
  const nes = dsOk(await tool("console_video_out", { console: "NES" }), "console_video_out NES");
  // plan_connection
  {
    const r = await tool("plan_connection", { console: "Super Nintendo", monitor: "BVM-20E1U" });
    const j = JSON.parse(r.result.content[0].text);
    ok(j.plan && j.plan.verdict === "ok" && j.plan.best.signal === "rgb15", "plan_connection SNES→20E1U is RGB, works as-is");
    ok(Array.isArray(j.plan.best.chain) && j.plan.best.chain.length >= 5, "plan_connection returns the chain steps");
    const r2 = await tool("plan_connection", { console: "GameCube", monitor: "BVM-20E1U" });
    const j2 = JSON.parse(r2.result.content[0].text);
    ok(j2.plan.best.signal === "comp_sd", "plan_connection GameCube→20E1U falls back to 480i component (SD-only monitor)");
    const r3 = await tool("plan_connection", { console: "Xbox", monitor: "LMD-940W" });
    const j3 = JSON.parse(r3.result.content[0].text);
    ok(j3.plan.verdict === "converter", "plan_connection Xbox→940W needs a converter");
    const r4 = await tool("plan_connection", { console: "dreamcast", monitor: "pvm 20l5" });
    const j4 = JSON.parse(r4.result.content[0].text);
    ok(j4.plan.console === "Dreamcast" && j4.plan.monitor === "PVM-20L5", "plan_connection matches loosely spelled names");
    const bad = await tool("plan_connection", { console: "Atari Jaguar", monitor: "PVM-20L5" });
    ok(bad.result && bad.result.isError && /Unknown console/.test(bad.result.content[0].text), "plan_connection unknown console → isError with the console list");
    // Every console name the tool's description advertises must resolve (SNES, N64, PS2… used to return Unknown console)
    for (const name of ["NES", "SNES", "N64", "GameCube", "Genesis", "Saturn", "PC Engine", "PlayStation", "PS2", "Dreamcast", "Xbox", "Wii", "Neo Geo", "Master System"]) {
      const rr = await tool("plan_connection", { console: name, monitor: "PVM-20L5" });
      ok(rr.result && !rr.result.isError, "plan_connection resolves the advertised name '" + name + "'");
    }
  }
  ok(nes.count >= 1, "'NES' matches the NES row (substring also hits 'Genesis'? count=" + nes.count + ")");
}
{
  const all = dsOk(await tool("bkm_cards", {}), "bkm_cards (all)");
  ok(all.count === 34, "34 BKM rows (got " + all.count + ")");
  ok(all.rows.every(r => r.model && r.fits && r.family), "every BKM row has model/fits/family");
  const x = dsOk(await tool("bkm_cards", { query: "BKM-129X" }), "bkm_cards BKM-129X");
  ok(x.count >= 1 && x.rows.some(r => r.model === "BKM-129X"), "BKM-129X found by model");
  const l5 = dsOk(await tool("bkm_cards", { query: "PVM-20L5" }), "bkm_cards PVM-20L5");
  ok(l5.count >= 1 && l5.rows.every(r => /20l5|l5/i.test(r.fits + " " + r.family)), "PVM-20L5 filter hits via Fits/family");
  const bvma = dsOk(await tool("bkm_cards", { query: "BVM-A" }), "bkm_cards BVM-A");
  const leak = bvma.rows.filter(r => /not bvm-a/i.test(r.fits));
  ok(bvma.count >= 1 && leak.length === 0, "'BVM-A' excludes rows whose Fits says 'not BVM-A' (leaked: " + leak.map(r => r.model).join(", ") + ")");
  const r10 = dsOk(await tool("bkm_cards", { query: "BKM-10R" }), "bkm_cards BKM-10R");
  ok(r10.count === 1, "BKM-10R still found by its own model");
  const none = dsOk(await tool("bkm_cards", { query: "zzzz" }), "bkm_cards nonsense");
  ok(none.count === 0, "nonsense → 0 rows");
}

// ── id handling ──
section("ids");
{
  const { parsed } = await call("POST", { jsonrpc: "2.0", id: "abc", method: "ping" });
  ok(parsed.id === "abc", "string id echoed");
  const { parsed: p0 } = await call("POST", { jsonrpc: "2.0", id: 0, method: "ping" });
  ok(p0.id === 0 && p0.result, "id 0 is a request, not a notification");
  const { res } = await call("POST", { jsonrpc: "2.0", id: null, method: "ping" });
  ok(res.code === 202, "id null is treated as a notification (202)");
  const { parsed: pj } = await call("POST", { jsonrpc: "1.0", id: 1, method: "ping" });
  ok(pj.error && pj.error.code === -32600, "jsonrpc != 2.0 → Invalid Request");
}

console.log("\n" + checks + " checks, " + failures + " failed");
process.exit(failures ? 1 : 0);
