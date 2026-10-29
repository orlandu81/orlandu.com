// The Orlandu Registry — shared server code for api/registry*.js (Node, CommonJS).
// Postgres on Neon through @neondatabase/serverless (HTTP, no connection pool to manage);
// photos on Vercel Blob. Needs DATABASE_URL and BLOB_READ_WRITE_TOKEN in the Vercel env
// (both written by the Marketplace/Storage integrations) and RESEND_API_KEY for alerts.
const crypto = require("crypto");
const CATALOG = require("../data/registry-models.json");

const COND = { serviced: "Working · recently serviced", working: "Working", attention: "Working · needs attention", dead: "Not working", parts: "Parts / donor" };
const SOURCES = ["Online auction", "Private sale", "Local pickup", "Studio or broadcast surplus", "University or hospital surplus", "Other collector", "Imported from Japan", "Original owner", "Other"];
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"];
const RATE_PER_HOUR = Number(process.env.REGISTRY_RATE_PER_HOUR) || 12; // entries per IP per hour (seeding a fleet needs headroom)
const BUILT_MAX = 2010; // last plausible plate year for a Sony CRT BVM/PVM
const RATE_PER_DAY_ALL = 150; // entries from everyone per day — a circuit breaker, not a quota

// ── catalog ────────────────────────────────────────────────────────────────
const bySlug = new Map(), byVariant = new Map();
for (const m of CATALOG.models) {
  bySlug.set(m.slug, m);
  for (const v of m.variants) byVariant.set(normModel(v), m);
  byVariant.set(normModel(m.model), m);
}
function normModel(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
// Find the chassis for a badge as typed: exact variant, then the badge with its region suffix dropped.
function resolveModel(input) {
  const n = normModel(input);
  if (!n) return null;
  if (byVariant.has(n)) return byVariant.get(n);
  const m = n.match(/^((?:BVM|PVM)[A-Z0-9]*?)([UEJAM]|MDE|MDU|MDA|MDJ|QM|PM)?$/);
  if (m && byVariant.has(m[1])) return byVariant.get(m[1]);
  return null;
}

// ── serials ────────────────────────────────────────────────────────────────
function normSerial(s) { return String(s || "").toUpperCase().replace(/[\s\-_.]/g, ""); }
function maskSerial(s) { return s.length >= 4 ? s.slice(0, -2) + "xx" : s; }
function serialNumber(s) { const d = s.replace(/\D/g, ""); return d.length >= 4 && d.length <= 12 ? Number(d) : null; }

// ── validation of a submission ─────────────────────────────────────────────
const clean = (s, n) => String(s == null ? "" : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, n);
function validate(b) {
  const errors = [];
  const modelIn = clean(b.model, 40);
  // A typed badge arrives however the owner wrote it: "Sony PVM-20L5", "pvm 20l5 u", "BVM-14F5U (ex-NBC)". Keep the badge, drop the rest.
  const typed = clean(b.model_other, 60), tm = typed.toUpperCase().replace(/\bSONY\b/g, "").replace(/\s+/g, "").match(/(BVM|PVM)-?([A-Z0-9]{2,14})/);
  const other = tm ? tm[1] + "-" + tm[2] : typed;
  let model = null, asEntered = modelIn;
  if (modelIn === "other" || !modelIn) { asEntered = other; model = resolveModel(other); }
  else {
    model = resolveModel(modelIn);
    const variant = clean(b.variant, 40); // the badge as printed, from the picker — kept only when it is one of this chassis's variants
    if (model && variant && model.variants.some(v => normModel(v) === normModel(variant))) asEntered = model.variants.find(v => normModel(v) === normModel(variant));
    else if (model) asEntered = model.model;
  }
  if (!asEntered) errors.push("model");
  if (!model && asEntered && !/^(BVM|PVM)-[A-Z0-9]{2,14}$/i.test(asEntered)) errors.push("model-format");
  const serial = normSerial(b.serial);
  if (!/^[A-Z0-9]{4,20}$/.test(serial)) errors.push("serial");
  const builtIn = clean(b.built, 7), bm = builtIn.match(/^(\d{4})(?:-(\d{2}))?$/);
  // BUILT_MAX is a hard stop, unlike the era check: no Sony BVM/PVM CRT was built after the catalog's last year (2009),
  // and a phone's month picker fills in TODAY when tapped — entry 17 arrived as 2026-10 that way (David, 10/26).
  const built = !builtIn ? null : bm && +bm[1] >= 1975 && (!bm[2] || (+bm[2] >= 1 && +bm[2] <= 12)) ? builtIn : "bad";
  if (built === "bad") errors.push("built");
  else if (built && +built.slice(0, 4) > BUILT_MAX) errors.push("built-late");
  const hours = b.hours === "" || b.hours == null ? null : Number(b.hours);
  if (hours != null && !(Number.isInteger(hours) && hours >= 0 && hours <= 300000)) errors.push("hours");
  const cond = clean(b.cond, 12);
  if (!COND[cond]) errors.push("cond");
  const acq_year = b.acq_year === "" || b.acq_year == null ? null : Number(b.acq_year);
  if (acq_year != null && !(Number.isInteger(acq_year) && acq_year >= 1975 && acq_year <= new Date().getFullYear())) errors.push("acq_year");
  const acq_src = clean(b.acq_src, 40);
  if (acq_src && !SOURCES.includes(acq_src)) errors.push("acq_src");
  const price = b.price === "" || b.price == null ? null : Number(b.price);
  if (price != null && !(price >= 0 && price <= 1e7)) errors.push("price");
  const currency = clean(b.currency, 3).toUpperCase() || "USD";
  if (!CURRENCIES.includes(currency)) errors.push("currency");
  const email = clean(b.email, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email");
  const country = clean(b.country, 2).toUpperCase();
  if (country && !/^[A-Z]{2}$/.test(country)) errors.push("country");
  const state = country === "US" ? clean(b.state, 40) : "";
  return {
    errors,
    row: {
      model: model ? model.model : asEntered.toUpperCase().replace(/\s+/g, "-"),
      model_slug: model ? model.slug : "other-" + asEntered.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      model_as_entered: asEntered, line: model ? model.line : (asEntered.toUpperCase().startsWith("BVM") ? "BVM" : "PVM"),
      catalog: !!model,
      serial, serial_masked: maskSerial(serial), serial_num: serialNumber(serial),
      built: built === "bad" || (built && +built.slice(0, 4) > BUILT_MAX) ? null : built, hours, cond, note: clean(b.note, 400), acq_year, acq_src: acq_src || null,
      price: price == null ? null : Math.round(price), currency: price == null ? null : currency,
      seller: clean(b.seller, 80) || null, handle: clean(b.handle, 40) || null,
      country: country || null, state: state || null, email
    }
  };
}

// ── database ───────────────────────────────────────────────────────────────
function sql() {
  const { neon } = require("@neondatabase/serverless");
  if (!process.env.DATABASE_URL) throw new Error("not-configured");
  return neon(process.env.DATABASE_URL);
}
const SCHEMA = `
CREATE TABLE IF NOT EXISTS registry_entries (
  id SERIAL PRIMARY KEY,
  model_slug TEXT NOT NULL, model TEXT NOT NULL, model_as_entered TEXT, line TEXT NOT NULL, catalog BOOLEAN NOT NULL DEFAULT true,
  serial TEXT NOT NULL, serial_masked TEXT NOT NULL, serial_num BIGINT,
  built TEXT, hours INTEGER, cond TEXT NOT NULL, note TEXT,
  acq_year SMALLINT, acq_src TEXT, price INTEGER, currency TEXT, seller TEXT,
  handle TEXT, country TEXT, state TEXT, email TEXT NOT NULL,
  photo_url TEXT, ip_hash TEXT, ua TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS registry_live_serial ON registry_entries (model_slug, serial) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS registry_live_model ON registry_entries (model_slug, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS registry_ip_hour ON registry_entries (ip_hash, created_at DESC);`;
async function ensureSchema(q) { for (const stmt of SCHEMA.split(";").map(s => s.trim()).filter(Boolean)) await q.query(stmt); }

// Data corrections that ship with the code (David, 10/27: he approves the wording in chat, Claude makes the change,
// nobody runs SQL in the Neon console). Each one is an exact old-text → new-text swap on one row, so it applies at
// most once (after that the old text no longer matches) and a stale row elsewhere is never touched. The read API
// runs the list once per cold start. Leave applied entries here as the record; prune when the file gets long.
const FIXUPS = [
  { id: 10, field: "note", from: "Great BMV the servers as another test bench monitor for me. Serviced by tye one and only Pat S. (Former Sony technician)",
    to: "Great BVM that serves as another test bench monitor for me. Serviced by the one and only Pat S. (former Sony technician)", when: "2026-10-27" },
  // 10/28 photo privacy sweep: the two BVM-D14H1E fronts (entries 18, 19) carried a front-panel label with the serial
  // readable; the last two digits are blurred on the replacement files (uploaded via the Blob dashboard), as on entry 20.
  { id: 18, field: "photo_url", from: "https://ei5j7ebcefa4vqjl.public.blob.vercel-storage.com/registry/bvm-d14h1u-20002xx-9UVOzEMI8PqDyeZYX5M5mWJk4Wl2qn.jpg",
    to: "https://ei5j7ebcefa4vqjl.public.blob.vercel-storage.com/registry/bvm-d14h1u-20002xx-e18-blur.jpg", when: "2026-10-28" },
  { id: 19, field: "photo_url", from: "https://ei5j7ebcefa4vqjl.public.blob.vercel-storage.com/registry/bvm-d14h1u-20003xx-GprQSQCkTVN0pT7X7kAsq2Kr5QMMfF.jpg",
    to: "https://ei5j7ebcefa4vqjl.public.blob.vercel-storage.com/registry/bvm-d14h1u-20003xx-e19-blur.jpg", when: "2026-10-28" },
];
const FIXUP_FIELDS = new Set(["note", "seller", "acq_src", "handle", "photo_url"]); // photo_url added 10/28 for the serial-blur swaps
async function applyFixups(q) {
  let n = 0;
  for (const f of FIXUPS) {
    if (!FIXUP_FIELDS.has(f.field)) continue;
    const rows = await q.query(`UPDATE registry_entries SET ${f.field} = $2 WHERE id = $1 AND ${f.field} = $3 AND deleted_at IS NULL RETURNING id`, [f.id, f.to, f.from]);
    n += rows.length;
  }
  return n;
}

// Edge cache for the public read API. Fresh for a minute; after that the edge still answers at once with the
// copy it holds and refetches behind the scenes, for up to a week of quiet. Without the long stale window, the first
// visit after ten idle minutes waited on a cold function + a sleeping Neon compute (~2 s; David, 10/26).
const CACHE = "public, s-maxage=60, stale-while-revalidate=604800";
const PUBLIC = "id, model, model_as_entered, model_slug, line, serial_masked, built, hours, cond, note, acq_year, acq_src, price, currency, seller, handle, country, state, photo_url, created_at";
function pub(r) { return { ...r, created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at }; }

// ── misc ───────────────────────────────────────────────────────────────────
function ipHash(req) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();
  return crypto.createHash("sha256").update("orlandu-registry|" + ip).digest("hex").slice(0, 32);
}
function adminKey() { return process.env.REGISTRY_ADMIN_SECRET || crypto.createHash("sha256").update("registry-admin|" + (process.env.DATABASE_URL || "")).digest("hex"); }
function signId(id) { return crypto.createHmac("sha256", adminKey()).update(String(id)).digest("hex").slice(0, 24); }
function checkSig(id, t) { const a = Buffer.from(signId(id)), b = Buffer.from(String(t || "")); return a.length === b.length && crypto.timingSafeEqual(a, b); }
// Era check for a build date — a NUDGE, never a gate (David, 10/25, on Dan's "limit years per model"): the
// catalog eras are partly estimates and plates have already corrected two of them, so a plate outside the
// era is flagged in the alert mail and on the form, and still goes in as written. One year of slack.
const eraYears = m => { const t = m && m.era ? String(m.era).match(/(\d{4}).*?(\d{4})/) : null; return t ? [+t[1], +t[2]] : null; };
const eraOutlier = (m, built) => { const y = built ? +String(built).slice(0, 4) : NaN, e = eraYears(m); return !!(e && y && (y < e[0] - 1 || y > e[1] + 1)); };
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

module.exports = { clean, applyFixups, FIXUPS, CACHE, CATALOG, COND, SOURCES, CURRENCIES, RATE_PER_HOUR, RATE_PER_DAY_ALL, bySlug, resolveModel, normSerial, maskSerial, serialNumber, validate, sql, ensureSchema, PUBLIC, pub, ipHash, signId, checkSig, esc, clean, eraYears, eraOutlier, BUILT_MAX };
