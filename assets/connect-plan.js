/* Will it connect? — the planner. One copy of the logic, used by will-it-connect.html in the browser and by
   api/mcp.js (plan_connection) on the server. Data: data/connect.json. UMD so both can load it. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ConnectPlan = factory();
})(typeof self !== "undefined" ? self : this, function () {
  // Common short names (the MCP tool's description advertises several of them). Only unambiguous ones:
  // "nes" means the front loader, "genesis" the Model 1 — the longer names still reach the other units.
  var ALIAS = { nes: "NES (front loader)", famicom: "NES (front loader)", snes: "Super Nintendo", superfamicom: "Super Nintendo",
    sfc: "Super Nintendo", n64: "Nintendo 64", gc: "GameCube", gcn: "GameCube", ngc: "GameCube", genesis: "Genesis Model 1",
    megadrive: "Genesis Model 1", md: "Genesis Model 1", cdx: "Genesis CDX", ps1: "PlayStation", psx: "PlayStation",
    psone: "PlayStation", ps2: "PlayStation 2", pce: "PC Engine Duo-R", tg16: "TurboGrafx-16", sms: "Master System",
    aes: "Neo Geo AES", dc: "Dreamcast" };
  function find(list, id) {
    var q = String(id || "").toLowerCase().replace(/[\s\-_.]/g, "");
    if (!q) return null;
    if (ALIAS[q]) q = ALIAS[q].toLowerCase().replace(/[\s\-_.]/g, "");
    var exact = list.filter(function (x) { return x.id.toLowerCase().replace(/[\s\-_.]/g, "") === q; });
    if (exact.length) return exact[0];
    var part = list.filter(function (x) { return x.id.toLowerCase().replace(/[\s\-_.]/g, "").indexOf(q) >= 0; });
    return part.length === 1 ? part[0] : null;
  }
  // Rank an option: lower is better. Working (as-is, or with the console's mod or adapter) beats needs-a-card beats
  // needs-a-converter; among working, the signal rank.
  function score(opt) {
    var s = opt.status === "ok" || opt.status === "mod" || opt.status === "adapter" ? 0 : opt.status === "card" ? 100 : opt.status === "converter" ? 200 : 900;
    return s + opt.rank;
  }
  function plan(data, consoleId, monitorId) {
    var c = find(data.consoles, consoleId), m = find(data.monitors, monitorId);
    if (!c) return { error: "Unknown console: " + consoleId, consoles: data.consoles.map(function (x) { return x.id; }) };
    if (!m) return { error: "Unknown monitor: " + monitorId, monitors: data.monitors.map(function (x) { return x.id; }) };
    var opts = [];
    Object.keys(c.outputs).forEach(function (sig) {
      var out = c.outputs[sig], inp = m.inputs[sig], S = data.signals[sig];
      if (!S) return;
      var formats = S.formats.slice();
      if (!inp) {
        opts.push({ signal: sig, name: S.name, rank: S.rank, status: "no", console_how: out.how, console_state: out.state, monitor_how: "No " + S.name + " input on this monitor", formats: formats, chain: [] });
        return;
      }
      if (sig === "comp_hd" && !m.hd) {
        opts.push({ signal: sig, name: S.name, rank: S.rank, status: "no", console_how: out.how, console_state: out.state, monitor_how: "This monitor is standard-definition only; use the 480i output instead", formats: formats, chain: [] });
        return;
      }
      var status = inp.state === "ok" ? "ok" : inp.state === "card" ? "card" : inp.state === "converter" ? "converter" : "no";
      if (out.state === "region") status = status === "ok" ? "region" : status;
      // "Works as-is" only when the console side needs nothing: a mod or an external adapter is its own verdict
      if ((out.state === "mod" || out.state === "adapter") && status === "ok") status = out.state;
      var chain = (status === "converter" ? data.chains.converter : data.chains[sig] || []).slice();
      opts.push({ signal: sig, name: S.name, rank: S.rank, status: status, card: inp.card || null, console_how: out.how, console_state: out.state, monitor_how: inp.how, formats: formats, chain: chain });
    });
    opts.sort(function (a, b) { return score(a) - score(b); });
    var best = opts[0] || null;
    var verdict = !best ? "no" : best.status;
    var rgb = best && (best.signal === "rgb15" || best.signal === "rgb31");
    var headline = {
      ok: "Works as-is",
      mod: rgb ? "Works with an RGB mod" : "Works with a console mod",
      adapter: rgb ? "Works with an RGB adapter" : "Works with an adapter",
      region: "Works — on the PAL console",
      card: "Works with a card",
      converter: "Works with a converter",
      no: "Not on this monitor"
    }[verdict] || "Not on this monitor";
    return {
      console: c.id, monitor: m.id, monitor_url: m.url, in_the_collection: c.here,
      verdict: verdict, headline: headline, best: best, options: opts
    };
  }
  return { plan: plan, find: find };
});
