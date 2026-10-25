// The Orlandu Registry — submissions (Vercel Node function).
// POST JSON { model, model_other?, serial, hours?, cond, note?, acq_year?, acq_src?, price?, currency?,
//             seller?, handle?, country?, state?, email, photo?: {name, type, data(base64)}, site? }
// `site` is the honeypot. Entries publish at once; David gets a Resend alert with a delete link.
// Rate limit: RATE_PER_HOUR per hashed IP, RATE_PER_DAY_ALL from everyone, counted in the table itself.
const R = require("../lib/registry");
const TO = "orlandusarcade@gmail.com";
const FROM = "The Orlandu Registry <onboarding@resend.dev>"; // Resend free tier: delivers to the account's own address only
const MAX_PHOTO = 2.5 * 1024 * 1024; // decoded bytes; the page resizes to 1600 px first, so this is a backstop
let schemaReady = false;

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "POST only" }); return; }
  let q;
  try { q = R.sql(); } catch (e) { res.status(503).json({ ok: false, error: "not-configured" }); return; }

  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || typeof b !== "object") { res.status(400).json({ ok: false, error: "bad-json" }); return; }
  if (b.site) { res.status(200).json({ ok: true, id: 0 }); return; } // honeypot: pretend success, store nothing

  const { errors, row } = R.validate(b);
  if (errors.length) { res.status(400).json({ ok: false, error: "invalid", fields: errors }); return; }

  let photo = null;
  if (b.photo && b.photo.data) {
    const type = String(b.photo.type || "");
    if (!/^image\/(jpeg|png|webp)$/.test(type)) { res.status(400).json({ ok: false, error: "bad-photo" }); return; }
    const data = String(b.photo.data).replace(/^data:[^,]*,/, "");
    const buf = Buffer.from(data, "base64");
    if (buf.length > MAX_PHOTO || buf.length < 100) { res.status(413).json({ ok: false, error: "photo-too-big" }); return; }
    photo = { buf, type };
  }

  const ip = R.ipHash(req), ua = R.clean(req.headers["user-agent"], 200);
  try {
    if (!schemaReady) { await R.ensureSchema(q); schemaReady = true; }
    const [[perIp], [perDay]] = await Promise.all([
      q.query(`SELECT count(*)::int AS n FROM registry_entries WHERE ip_hash = $1 AND created_at > now() - interval '1 hour'`, [ip]),
      q.query(`SELECT count(*)::int AS n FROM registry_entries WHERE created_at > now() - interval '1 day'`)
    ]);
    if (perIp.n >= R.RATE_PER_HOUR || perDay.n >= R.RATE_PER_DAY_ALL) { res.status(429).json({ ok: false, error: "rate-limit" }); return; }
    const [dup] = await q.query(`SELECT id FROM registry_entries WHERE model_slug = $1 AND serial = $2 AND deleted_at IS NULL`, [row.model_slug, row.serial]);
    if (dup) { res.status(409).json({ ok: false, error: "duplicate", id: dup.id }); return; }

    let photo_url = null;
    if (photo) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) { res.status(503).json({ ok: false, error: "photos-not-configured" }); return; }
      const { put } = require("@vercel/blob");
      const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
      const blob = await put(`registry/${row.model_slug}-${row.serial_masked.toLowerCase()}.${ext}`, photo.buf, { access: "public", addRandomSuffix: true, contentType: photo.type, cacheControlMaxAge: 31536000 });
      photo_url = blob.url;
    }

    const [ins] = await q.query(
      `INSERT INTO registry_entries (model_slug, model, model_as_entered, line, catalog, serial, serial_masked, serial_num, built, hours, cond, note, acq_year, acq_src, price, currency, seller, handle, country, state, email, photo_url, ip_hash, ua)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24) RETURNING id, created_at`,
      [row.model_slug, row.model, row.model_as_entered, row.line, row.catalog, row.serial, row.serial_masked, row.serial_num, row.built, row.hours, row.cond, row.note || null, row.acq_year, row.acq_src, row.price, row.currency, row.seller, row.handle, row.country, row.state, row.email, photo_url, ip, ua]
    );
    const id = ins.id;
    // The alert. A failure here must not fail the submission — the entry is already in.
    try { await alert(id, row, photo_url, ua); } catch (e) { console.error("registry alert", e && e.message); }
    res.status(200).json({ ok: true, id, model: row.model, model_slug: row.model_slug, serial_masked: row.serial_masked, catalog: row.catalog, photo_url });
  } catch (e) {
    if (e && (e.code === "23505" || /registry_live_serial/.test(String(e.message)))) { res.status(409).json({ ok: false, error: "duplicate" }); return; }
    console.error("registry submit", e && e.message);
    res.status(502).json({ ok: false, error: "db" });
  }
};

async function alert(id, row, photo_url, ua) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const base = "https://www.orlandu.com";
  const del = `${base}/api/registry-admin?id=${id}&t=${R.signId(id)}`;
  const line = (k, v) => v == null || v === "" ? "" : `<tr><td style="color:#888;padding:2px 10px 2px 0">${R.esc(k)}</td><td>${R.esc(v)}</td></tr>`;
  const html =
    `<p><b>New registry entry #${id}</b> — ${R.esc(row.model)}${row.catalog ? "" : " (NOT in the catalog, typed by the owner)"}</p>` +
    `<table style="font:14px/1.5 -apple-system,Segoe UI,sans-serif;border-collapse:collapse">` +
    line("Badge as printed", row.model_as_entered) + line("Serial (full, private)", row.serial) + line("Shown as", row.serial_masked) + line("Built", row.built) + line("Hours", row.hours) + line("Condition", R.COND[row.cond]) +
    line("Note", row.note) + line("Acquired", [row.acq_year, row.acq_src].filter(Boolean).join(" · ")) + line("Price", row.price != null ? `${row.price} ${row.currency}` : null) +
    line("Seller", row.seller) + line("Handle", row.handle) + line("Location", [row.state, row.country].filter(Boolean).join(", ")) + line("Email (private)", row.email) + line("Browser", ua) +
    `</table>` +
    (photo_url ? `<p><a href="${R.esc(photo_url)}">Photo</a></p>` : "") +
    `<p><a href="${base}/registry-${R.esc(row.model_slug)}.html">See it on the model page</a> · <a href="${R.esc(del)}">Delete this entry</a> (asks you to confirm)</p>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [TO], reply_to: row.email, subject: `[registry] ${row.model} · ${row.serial_masked}${row.handle ? " · " + row.handle : ""}`, html })
  });
  if (!r.ok) throw new Error("resend " + r.status);
}
