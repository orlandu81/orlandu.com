// The Orlandu Registry — delete an entry from the alert email (Vercel Node function).
//   GET  /api/registry-admin?id=N&t=<sig>  → a confirm page (so a link preview or mail scanner can't delete)
//   POST /api/registry-admin  id=N&t=<sig>  → soft-delete (deleted_at), the Blob photo removed too
// The signature is an HMAC of the id with REGISTRY_ADMIN_SECRET (or, unset, a key derived from DATABASE_URL),
// so only someone holding the alert email can delete, and only that entry.
const R = require("../lib/registry");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  let b = req.body;
  if (typeof b === "string") { const u = new URLSearchParams(b); b = Object.fromEntries(u.entries()); }
  const src = req.method === "POST" ? (b || {}) : (req.query || {});
  const id = parseInt(src.id, 10), t = String(src.t || "");
  if (!id || !R.checkSig(id, t)) { res.status(403).send(page("Not a valid link.", "")); return; }
  let q;
  try { q = R.sql(); } catch (e) { res.status(503).send(page("The database is not configured.", "")); return; }
  try {
    const [row] = await q.query(`SELECT ${R.PUBLIC}, serial, email, deleted_at FROM registry_entries WHERE id = $1`, [id]);
    if (!row) { res.status(404).send(page("No entry #" + id + ".", "")); return; }
    if (req.method === "GET") {
      if (row.deleted_at) { res.status(200).send(page(`Entry #${id} (${R.esc(row.model)} · ${R.esc(row.serial_masked)}) is already deleted.`, "")); return; }
      const form = `<form method="post" action="/api/registry-admin"><input type="hidden" name="id" value="${id}"><input type="hidden" name="t" value="${R.esc(t)}"><button type="submit">Yes, delete entry #${id}</button></form>`;
      res.status(200).send(page(`Delete <b>${R.esc(row.model)} · ${R.esc(row.serial_masked)}</b>${row.handle ? " by " + R.esc(row.handle) : ""}? The card comes off the site within a minute; the row is kept, marked deleted.`, form));
      return;
    }
    if (req.method !== "POST") { res.status(405).send(page("GET or POST.", "")); return; }
    if (!row.deleted_at) {
      await q.query(`UPDATE registry_entries SET deleted_at = now() WHERE id = $1`, [id]);
      if (row.photo_url && process.env.BLOB_READ_WRITE_TOKEN) {
        try { const { del } = require("@vercel/blob"); await del(row.photo_url); } catch (e) { console.error("blob del", e && e.message); }
      }
    }
    res.status(200).send(page(`Deleted entry #${id} (${R.esc(row.model)} · ${R.esc(row.serial_masked)}).`, ""));
  } catch (e) {
    console.error("registry admin", e && e.message);
    res.status(502).send(page("Database error.", ""));
  }
};

function page(msg, form) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Registry admin — Orlandu's Arcade</title>` +
    `<style>body{background:#0a0a12;color:#e8e8f4;font:18px/1.5 -apple-system,"Segoe UI",sans-serif;margin:0;padding:3rem 1.2rem;max-width:40rem}b{color:#5ee9ff}button{font:inherit;background:transparent;color:#ffd400;border:1px solid #ff8a00;border-radius:8px;padding:.7rem 1.3rem;cursor:pointer;margin-top:1rem}a{color:#5ee9ff}</style></head>` +
    `<body><p style="font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;color:#5ee9ff">The Orlandu Registry · admin</p><p>${msg}</p>${form}<p style="margin-top:2rem"><a href="/registry.html">Back to the registry</a></p></body></html>`;
}
