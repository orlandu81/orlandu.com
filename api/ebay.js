// eBay listing status — Vercel serverless function (Node runtime, no dependencies).
// GET /api/ebay?ids=206578310783,206614342586
//   → { ok, items: { "<id>": { live: true|false|null, end: ISO|null } }, seller: { pct, score } | null }
// The For Sale page asks this before it shows a card: a listing eBay no longer has is hidden on the
// spot, so no sold card ever walks a buyer into a dead listing — the sweep rule, enforced by code.
// Uses the public Browse API with an application token (client-credentials grant, scope api_scope).
// Needs EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in the Vercel project's environment; without them it
// replies 503 not-configured and the page shows every card as written. `live: null` means eBay
// could not be asked (token or network failure) — the page leaves that card alone.
const TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const ITEM_URL = "https://api.ebay.com/buy/browse/v1/item/v1%7C"; // v1|<legacy id>|0
const MARKET = "EBAY_US";
let tokenCache = { value: null, until: 0 };

async function appToken(id, secret) {
  if (tokenCache.value && Date.now() < tokenCache.until) return tokenCache.value;
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + Buffer.from(id + ":" + secret).toString("base64") },
    body: "grant_type=client_credentials&scope=" + encodeURIComponent("https://api.ebay.com/oauth/api_scope"),
  });
  if (!r.ok) throw new Error("token " + r.status);
  const j = await r.json();
  tokenCache = { value: j.access_token, until: Date.now() + Math.max(60, (j.expires_in || 7200) - 120) * 1000 };
  return tokenCache.value;
}

module.exports = async (req, res) => {
  // Half an hour at the edge, a further hour stale while a fresh copy is fetched: eBay is asked a few times a day, not per visitor.
  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");
  res.setHeader("Access-Control-Allow-Origin", "https://www.orlandu.com");
  if (req.method !== "GET") { res.status(405).json({ ok: false, error: "GET only" }); return; }
  const id = process.env.EBAY_CLIENT_ID, secret = process.env.EBAY_CLIENT_SECRET;
  if (!id || !secret) { res.setHeader("Cache-Control", "no-store"); res.status(503).json({ ok: false, error: "not-configured" }); return; }
  const ids = String((req.query && req.query.ids) || "").split(",").map(s => s.trim()).filter(s => /^\d{9,15}$/.test(s)).slice(0, 12);
  if (!ids.length) { res.status(400).json({ ok: false, error: "ids required" }); return; }

  let token;
  try { token = await appToken(id, secret); }
  catch (e) { res.setHeader("Cache-Control", "no-store"); res.status(502).json({ ok: false, error: "token" }); return; }

  const items = {}; let seller = null;
  await Promise.all(ids.map(async (itemId) => {
    try {
      const r = await fetch(ITEM_URL + itemId + "%7C0", { headers: { Authorization: "Bearer " + token, "X-EBAY-C-MARKETPLACE-ID": MARKET, Accept: "application/json" } });
      if (r.status === 404) { items[itemId] = { live: false, end: null }; return; }   // eBay no longer has it: ended or sold
      if (!r.ok) { items[itemId] = { live: null, end: null }; return; }
      const j = await r.json();
      const end = j.itemEndDate || null;
      const avail = j.estimatedAvailabilities && j.estimatedAvailabilities[0] && j.estimatedAvailabilities[0].estimatedAvailabilityStatus;
      const ended = (end && Date.parse(end) < Date.now()) || avail === "OUT_OF_STOCK";
      items[itemId] = { live: !ended, end: end };
      if (!seller && j.seller) seller = { pct: j.seller.feedbackPercentage ? Number(j.seller.feedbackPercentage) : null, score: j.seller.feedbackScore != null ? Number(j.seller.feedbackScore) : null };
    } catch (e) { items[itemId] = { live: null, end: null }; }
  }));
  res.status(200).json({ ok: true, items, seller });
};
