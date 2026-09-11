// Contact form relay — Vercel serverless function (Node runtime, no dependencies).
// POST JSON { name, email, subject, message, photo?: {name, type, data(base64)}, site? }
// Sends through Resend's REST API to the arcade's address. Needs RESEND_API_KEY in the
// Vercel project's environment variables; without it, replies 503 and the page falls
// back to the mailto link. `site` is a honeypot — bots fill it, people never see it.
const TO = "orlandusarcade@gmail.com";
const FROM = "Orlandu's Arcade <onboarding@resend.dev>"; // free tier: delivers to the account's own verified address only
const MAX_PHOTO = 3 * 1024 * 1024; // decoded bytes; Vercel caps the whole request at 4.5 MB

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "POST only" }); return; }
  const key = process.env.RESEND_API_KEY;
  if (!key) { res.status(503).json({ ok: false, error: "not-configured" }); return; }

  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || typeof b !== "object") { res.status(400).json({ ok: false, error: "bad-json" }); return; }
  if (b.site) { res.status(200).json({ ok: true }); return; } // honeypot: pretend success, send nothing

  const clean = (s, n) => String(s || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, n);
  const name = clean(b.name, 120), email = clean(b.email, 200), subject = clean(b.subject, 160), message = clean(b.message, 6000);
  if (!message || message.length < 5) { res.status(400).json({ ok: false, error: "empty" }); return; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ ok: false, error: "bad-email" }); return; }

  const attachments = [];
  if (b.photo && b.photo.data) {
    const type = String(b.photo.type || "");
    if (!/^image\/(jpeg|png|webp|heic|heif|gif)$/.test(type)) { res.status(400).json({ ok: false, error: "bad-photo" }); return; }
    const data = String(b.photo.data).replace(/^data:[^,]*,/, "");
    if (data.length * 0.75 > MAX_PHOTO) { res.status(413).json({ ok: false, error: "photo-too-big" }); return; }
    attachments.push({ filename: clean(b.photo.name, 120).replace(/[^\w.\-]+/g, "_") || "photo", content: data });
  }

  const esc = s => s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const ua = clean(req.headers["user-agent"], 200);
  const html =
    `<p><b>From:</b> ${esc(name || "(no name)")} ${email ? `&lt;${esc(email)}&gt;` : "(no email given)"}</p>` +
    `<p><b>Subject:</b> ${esc(subject || "Message from orlandu.com")}</p>` +
    `<pre style="font:14px/1.5 -apple-system,Segoe UI,sans-serif;white-space:pre-wrap">${esc(message)}</pre>` +
    `<p style="color:#888;font-size:12px">Sent from the orlandu.com contact form${attachments.length ? " with a photo attached" : ""}.<br>${esc(ua)}</p>`;

  const payload = {
    from: FROM, to: [TO],
    subject: `[orlandu.com] ${subject || "Message"}${name ? " — " + name : ""}`,
    html, text: `From: ${name} <${email}>\nSubject: ${subject}\n\n${message}`,
    attachments
  };
  if (email) payload.reply_to = email;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      console.error("resend", r.status, t.slice(0, 300));
      res.status(502).json({ ok: false, error: "send-failed" });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("contact", e && e.message);
    res.status(502).json({ ok: false, error: "send-failed" });
  }
};
