// The Orlandu Registry — public read API (Vercel Node function).
//   GET /api/registry                → summary: stats, survivor counts per model, latest entries
//   GET /api/registry?model=<slug>   → one model: count, entries, chart points (masked serials only)
//   GET /api/registry?entries=1&page=N  → the browsable list, 24 per page, newest first
// Nothing private ever leaves here: no full serial, no email, no IP. The chart gets each
// serial rounded DOWN to its hundred — exactly what the masked serial already shows.
const R = require("../lib/registry");
let fixupsDone = false; // per cold start; the list in lib/registry.js is idempotent, so a repeat costs one no-op UPDATE per item

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") { res.status(405).json({ ok: false, error: "GET only" }); return; }
  let q;
  try { q = R.sql(); } catch (e) { res.setHeader("Cache-Control", "no-store"); res.status(503).json({ ok: false, error: "not-configured" }); return; }
  if (!fixupsDone && R.FIXUPS.length) {
    fixupsDone = true;
    try { const n = await R.applyFixups(q); if (n) console.log("registry fixups applied:", n); } catch (e) { console.error("registry fixups", e && e.message); }
  }
  const p = req.query || {};
  try {
    if (p.model) {
      const slug = String(p.model).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
      const rows = await q.query(`SELECT ${R.PUBLIC}, serial_num FROM registry_entries WHERE model_slug = $1 AND deleted_at IS NULL ORDER BY created_at DESC`, [slug]);
      const entries = rows.map(r => { const o = R.pub(r); delete o.serial_num; return o; });
      const points = rows.filter(r => r.serial_num != null).map(r => ({ id: r.id, h: Math.floor(Number(r.serial_num) / 100), label: r.serial_masked, built: r.built, cond: r.cond, hours: r.hours, who: r.handle || null }))
        .sort((a, b) => a.h - b.h);
      const cat = R.bySlug.get(slug) || null;
      res.setHeader("Cache-Control", R.CACHE);
      res.status(200).json({ ok: true, model: cat ? cat.model : (entries[0] ? entries[0].model : slug), slug, n: entries.length, entries, points });
      return;
    }
    if (p.entries) {
      const page = Math.max(1, Math.min(500, parseInt(p.page, 10) || 1)), per = 24;
      const rows = await q.query(`SELECT ${R.PUBLIC} FROM registry_entries WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [per + 1, (page - 1) * per]);
      res.setHeader("Cache-Control", R.CACHE);
      res.status(200).json({ ok: true, page, entries: rows.slice(0, per).map(R.pub), more: rows.length > per });
      return;
    }
    // Every query below is independent, so they go out together: one Neon round trip of wait instead of
    // eight in a row (the summary took ~0.9 s warm and ~2 s cold that way — David, 10/26: "no delay").
    const live = "FROM registry_entries WHERE deleted_at IS NULL";
    const [[stats], counts, latest, [hi], [oldest], [newest], firsts, countryRows] = await Promise.all([
      q.query(`SELECT count(*)::int AS entries, count(DISTINCT model_slug)::int AS models, count(DISTINCT email)::int AS owners, count(DISTINCT country)::int AS countries, max(created_at) AS updated ${live}`),
      q.query(`SELECT model_slug, model, line, count(*)::int AS n ${live} GROUP BY model_slug, model, line ORDER BY n DESC, model`),
      q.query(`SELECT ${R.PUBLIC} ${live} ORDER BY created_at DESC LIMIT 9`),
      // Records — about the monitors, never a per-owner total (David, 10/25). Each points at one entry.
      q.query(`SELECT ${R.PUBLIC} ${live} AND hours IS NOT NULL AND hours > 0 ORDER BY hours ASC, created_at ASC LIMIT 1`), // the LOWEST meter reading is the record (David, 10/25): fewest hours is the ideal, not the most
      q.query(`SELECT ${R.PUBLIC} ${live} AND built IS NOT NULL ORDER BY built ASC, created_at ASC LIMIT 1`),
      q.query(`SELECT ${R.PUBLIC} ${live} AND built IS NOT NULL ORDER BY built DESC, created_at ASC LIMIT 1`),
      q.query(`SELECT DISTINCT ON (model_slug) ${R.PUBLIC} ${live} ORDER BY model_slug, created_at ASC`), // first entry of each model; the biggest tube's is picked below
      q.query(`SELECT DISTINCT country ${live} AND country IS NOT NULL ORDER BY country`),
    ]);
    let biggest = null, bigSize = 0;
    for (const c of counts) { const m = R.bySlug.get(c.model_slug); if (m && m.size_in > bigSize) { bigSize = m.size_in; biggest = c.model_slug; } }
    const big = biggest ? firsts.find(r => r.model_slug === biggest) || null : null;
    const countries = countryRows.map(r => r.country);
    const records = { top: counts[0] || null, biggest: big ? { size: bigSize, entry: R.pub(big) } : null, hours: hi ? R.pub(hi) : null, oldest: oldest ? R.pub(oldest) : null, newest: newest ? R.pub(newest) : null, countries };
    res.setHeader("Cache-Control", R.CACHE);
    res.status(200).json({ ok: true, stats: { ...stats, updated: stats.updated instanceof Date ? stats.updated.toISOString() : stats.updated }, counts, latest: latest.map(R.pub), records });
  } catch (e) {
    if (/does not exist/.test(String(e && e.message))) { // first run: no table yet
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ ok: true, stats: { entries: 0, models: 0, owners: 0, countries: 0, updated: null }, counts: [], latest: [], entries: [], points: [], n: 0, records: null });
      return;
    }
    console.error("registry", e && e.message);
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ ok: false, error: "db" });
  }
};
