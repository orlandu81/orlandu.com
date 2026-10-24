// The Orlandu Registry — page scripts for registry.html, registry-models.html, registry-submit.html and the
// generated registry-<model>.html pages. Reads /api/registry (public, masked data only) and
// data/registry-models.json (the catalog). One file so the entry card renders the same everywhere.
(function () {
  const API = "/api/registry";
  const COND = { serviced: ["Working · recently serviced", "serviced"], working: ["Working", "working"], attention: ["Working · needs attention", "attention"], dead: ["Not working", "dead"], parts: ["Parts / donor", "parts"] };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = n => Number(n).toLocaleString("en-US");
  const COUNTRY = { US: "US", CA: "Canada", GB: "United Kingdom", JP: "Japan", DE: "Germany", AU: "Australia", FR: "France", NL: "Netherlands", IT: "Italy", ES: "Spain", SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland", BE: "Belgium", CH: "Switzerland", AT: "Austria", IE: "Ireland", PT: "Portugal", PL: "Poland", CZ: "Czechia", BR: "Brazil", MX: "Mexico", AR: "Argentina", CL: "Chile", NZ: "New Zealand", KR: "South Korea", TW: "Taiwan", HK: "Hong Kong", SG: "Singapore", TH: "Thailand", MY: "Malaysia", PH: "Philippines", ID: "Indonesia", IN: "India", ZA: "South Africa", IL: "Israel", TR: "Turkey", GR: "Greece", HU: "Hungary", RO: "Romania", RU: "Russia", UA: "Ukraine", AE: "United Arab Emirates", SA: "Saudi Arabia", CN: "China" };
  let CAT = null;
  const catalog = () => CAT || (CAT = fetch("data/registry-models.json").then(r => r.json()).then(d => { d.bySlug = {}; d.models.forEach(m => { d.bySlug[m.slug] = m; }); return d; }));
  const slugOf = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const seriesLine = (e, cat) => {
    const m = cat && cat.bySlug[e.model_slug];
    if (!m) return esc(e.line) + (e.model_slug.startsWith("other-") ? " · not in the catalog yet" : "");
    return esc(m.line) + " · " + m.size_in + "-inch · " + esc(m.series) + (m.line === "PVM" ? " series" : " generation");
  };
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const builtTxt = b => { if (!b) return null; const m = String(b).match(/^(\d{4})(?:-(\d{2}))?$/); return m ? (m[2] ? MON[+m[2] - 1] + " " : "") + m[1] : null; };
  const where = e => [e.state, e.country ? (COUNTRY[e.country] || e.country) : null].filter(Boolean).join(", ");
  const pageFor = e => "registry-" + e.model_slug + ".html";

  function card(e, cat, opts) {
    opts = opts || {};
    const c = COND[e.cond] || ["", ""];
    const mask = esc(e.serial_masked).replace(/x+$/i, m => '<span class="mask">' + m + "</span>");
    const hours = e.hours == null ? "—" : fmt(e.hours) + " h", built = builtTxt(e.built);
    const acq = [e.acq_year, e.acq_src].filter(Boolean).map(esc).join(" · ");
    const price = e.price != null ? fmt(e.price) + " " + esc(e.currency || "USD") : null;
    const title = opts.nolink || e.model_slug.startsWith("other-") ? esc(e.model) : '<a href="' + pageFor(e) + '">' + esc(e.model) + "</a>";
    return '<article class="card entry" data-id="' + e.id + '">' +
      '<div class="ebody"><div class="etop"><div><h3>' + title + '</h3><div class="sub">' + seriesLine(e, cat) + "</div></div>" +
      '<span class="badge cond ' + c[1] + '">' + c[0] + "</span></div>" +
      '<div class="eline"><div><div class="serial"><b>Serial</b>' + mask + "</div>" +
      '<div class="emeta">' + (built ? "<div><b>Built</b>" + built + "</div>" : "") + "<div><b>Hours</b>" + hours + "</div><div><b>Acquired</b>" + (acq || "—") + "</div>" + (price ? "<div><b>Paid</b>" + price + "</div>" : "") + (e.seller ? "<div><b>Bought from</b>" + esc(e.seller) + "</div>" : "") + "</div></div>" +
      (e.photo_url ? '<img class="ethumb" src="' + esc(e.photo_url) + '" data-full="' + esc(e.photo_url) + '" alt="' + esc(e.model) + " registered by " + esc(e.handle || "an owner") + '" loading="lazy" width="112" height="76">' : "") + "</div>" +
      (e.note ? '<p class="enote">' + esc(e.note) + "</p>" : "") +
      '<div class="ewho"><span>' + (e.handle ? esc(e.handle) : "Anonymous owner") + "</span>" + esc(where(e)) + "</div>" +
      "</div></article>";
  }
  const bindLightbox = () => {}; // site.js delegates img[data-full] clicks at the document level, so late cards just work
  const fail = (el, msg) => { el.innerHTML = '<p class="note">' + esc(msg) + "</p>"; };

  // ── registry.html ──────────────────────────────────────────────────────
  async function landing() {
    const cen = document.getElementById("census-out"), lat = document.getElementById("entries-out"), st = document.getElementById("stats");
    let d, cat;
    try { [d, cat] = await Promise.all([fetch(API).then(r => r.json()), catalog()]); } catch (e) { fail(cen, "The registry is taking a moment to answer. Reload in a few seconds."); return; }
    if (!d.ok) { fail(cen, d.error === "not-configured" ? "The registry is not switched on yet." : "The registry is taking a moment to answer. Reload in a few seconds."); return; }
    const s = d.stats;
    st.innerHTML = [[s.entries, "Monitors registered"], [s.models, "Models accounted for"], [s.owners, "Owners"], [s.countries, "Countries"]].map(([n, l]) => '<div><span class="n">' + fmt(n) + '</span><span class="l">' + l + "</span></div>").join("");
    const max = Math.max(1, ...d.counts.map(c => c.n));
    const col = line => {
      const rows = d.counts.filter(c => c.line === line);
      const total = cat.models.filter(m => m.line === line).length, left = total - rows.filter(c => !c.model_slug.startsWith("other-")).length;
      const list = rows.length ? "<ol>" + rows.map(c => {
        const m = cat.bySlug[c.model_slug];
        const small = m ? m.size_in + "-inch · " + esc(m.series) + (line === "PVM" ? " series" : " generation") : "not in the catalog yet";
        const name = m ? '<a href="registry-' + c.model_slug + '.html">' + esc(c.model) + "<small>" + small + "</small></a>" : "<a>" + esc(c.model) + "<small>" + small + "</small></a>";
        return "<li>" + name + '<div class="bar"><i style="width:' + Math.round(c.n / max * 100) + '%"></i></div><span class="n">' + c.n + "</span></li>";
      }).join("") + "</ol>" : '<p class="more">No ' + line + " registered yet.</p>";
      return "<div><h3>" + (line === "BVM" ? "BVM · broadcast and master monitors" : "PVM · production monitors") + "</h3>" + list + '<p class="more">' + left + " more " + line + ' models in the catalog with no entry yet. <a href="registry-models.html">See every model →</a></p></div>';
    };
    cen.innerHTML = col("BVM") + col("PVM");
    lat.innerHTML = d.latest.length ? d.latest.map(e => card(e, cat)).join("") : '<div class="card"><h3>Nothing here yet</h3><p>The first entry is the hardest. <a href="registry-submit.html">Add yours →</a></p></div>';
    bindLightbox(lat);
  }

  // ── registry-<model>.html ───────────────────────────────────────────────
  async function model(slug) {
    const out = document.getElementById("entries-out"), st = document.getElementById("stats"), lede = document.getElementById("mlede");
    let d, cat;
    try { [d, cat] = await Promise.all([fetch(API + "?model=" + encodeURIComponent(slug)).then(r => r.json()), catalog()]); } catch (e) { fail(out, "The registry is taking a moment to answer. Reload in a few seconds."); return; }
    if (!d.ok) { fail(out, "The registry is taking a moment to answer. Reload in a few seconds."); return; }
    const m = cat.bySlug[slug], E = d.entries, n = E.length;
    const working = E.filter(e => e.cond === "serviced" || e.cond === "working").length;
    const hrs = E.map(e => e.hours).filter(h => h != null).sort((a, b) => a - b);
    const med = hrs.length ? hrs[Math.floor(hrs.length / 2)] : null;
    const owners = new Set(E.map(e => e.handle || "anon-" + e.id)).size, countries = new Set(E.map(e => e.country).filter(Boolean)).size;
    const P = d.points;
    const range = P.length > 1 ? String(P[0].h).slice(0, -1) + "k–" + String(P[P.length - 1].h).slice(0, -1) + "k" : P.length ? String(P[0].h).slice(0, -1) + "k" : "—";
    st.innerHTML = [[n, "Registered"], [n ? working + " of " + n : "—", "Working"], [med != null ? fmt(med) + " h" : "—", "Median hours · " + hrs.length + " reported"], [range, "Serial range seen"]].map(([v, l]) => '<div><span class="n">' + v + '</span><span class="l">' + l + "</span></div>").join("");
    if (lede) lede.textContent = n ? (n === 1 ? "One registered so far" : fmt(n) + " registered so far") + (n > 1 ? ", from " + owners + (owners === 1 ? " owner" : " owners") + (countries > 1 ? " in " + countries + " countries" : "") : "") + "." : "None registered yet. Yours would be the first.";
    charts(P, m ? m.model : d.model);
    out.innerHTML = n ? E.map(e => card(e, cat, { nolink: true })).join("") : '<div class="card"><h3>No ' + esc(m ? m.model : d.model) + ' registered yet</h3><p>Be the first: <a href="registry-submit.html?m=' + esc(slug) + '">add yours →</a></p></div>';
    bindLightbox(out);
  }

  function charts(P, modelName) {
    const strip = document.getElementById("strip-svg"), bands = document.getElementById("bands-svg"), wrap = document.getElementById("strip");
    if (!strip || !bands) return;
    if (P.length < 2) { strip.innerHTML = '<p class="note" style="margin:0">' + (P.length ? "One serial so far; the strip needs two to draw a range." : "No serials yet.") + "</p>"; bands.innerHTML = ""; document.getElementById("bands").hidden = true; return; }
    const W = 1000, PL = 24, PR = 24;
    const lo0 = P[0].h * 100, hi0 = P[P.length - 1].h * 100 + 99;
    const span = Math.max(hi0 - lo0, 1);
    const step = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000].find(s => span / s <= 10) || 500000;
    const lo = Math.floor(lo0 / step) * step, hi = Math.ceil((hi0 + 1) / step) * step;
    const x = s => PL + (s - lo) / (hi - lo) * (W - PL - PR);
    const lab = s => { const t = String(s); return step >= 1000 ? t.slice(0, -3) + "k" : t; };
    // strip
    const y = 62; let svg = '<svg viewBox="0 0 ' + W + ' 120" role="img" aria-label="Serial-number strip for the ' + esc(modelName) + '"><g class="grid">';
    for (let s = lo; s <= hi; s += step) svg += '<line x1="' + x(s) + '" x2="' + x(s) + '" y1="' + (y - 26) + '" y2="' + (y + 26) + '"/>';
    svg += '</g><g class="axis"><line x1="' + PL + '" x2="' + (W - PR) + '" y1="' + y + '" y2="' + y + '"/>';
    for (let s = lo; s <= hi; s += step) svg += '<text x="' + x(s) + '" y="' + (y + 44) + '" text-anchor="middle">' + lab(s) + "</text>";
    svg += "</g>";
    // same hundred → spread the dots a little so they stay countable
    const seen = {};
    P.forEach((p, i) => { const k = p.h; seen[k] = (seen[k] || 0) + 1; const off = (seen[k] - 1) * 6; svg += '<circle class="dot' + (p.who === "orlandu81" ? " mine" : "") + '" data-i="' + i + '" cx="' + (x(p.h * 100 + 50) + off) + '" cy="' + y + '" r="7"><title>' + esc(p.label) + "</title></circle>"; });
    const labels = new Set([0, P.length - 1, P.findIndex(p => p.who === "orlandu81")].filter(i => i >= 0));
    labels.forEach(i => { const p = P[i]; svg += '<text class="lbl" x="' + x(p.h * 100 + 50) + '" y="' + (y - 16) + '" text-anchor="middle">' + esc(p.label) + "</text>"; });
    strip.innerHTML = svg + "</svg>";
    let tip = wrap.querySelector(".tip"); if (!tip) { tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; wrap.appendChild(tip); }
    strip.querySelectorAll(".dot").forEach(d => {
      const show = () => { const p = P[+d.dataset.i]; tip.innerHTML = "<b>" + esc(p.label) + "</b>" + (builtTxt(p.built) ? " · built " + builtTxt(p.built) : "") + " · " + esc(COND[p.cond][0]) + (p.hours != null ? " · " + fmt(p.hours) + " h" : "") + "<br>" + esc(p.who || "Anonymous owner"); tip.hidden = false; const r = d.getBoundingClientRect(), w = wrap.getBoundingClientRect(); tip.style.left = (r.left - w.left + r.width / 2) + "px"; tip.style.top = (r.top - w.top) + "px"; };
      d.addEventListener("mouseenter", show); d.addEventListener("focus", show); d.addEventListener("click", show);
      d.addEventListener("mouseleave", () => { tip.hidden = true; });
    });
    // bands
    const nb = Math.round((hi - lo) / step), counts = new Array(nb).fill(0);
    P.forEach(p => { counts[Math.min(nb - 1, Math.floor((p.h * 100 - lo) / step))]++; });
    const maxN = Math.max(4, ...counts), bw = (W - PL - PR) / nb, base = 112;
    let b = '<svg viewBox="0 0 ' + W + ' 150" role="img" aria-label="Registered units per ' + lab(step) + ' serial numbers"><g class="axis"><line x1="' + PL + '" x2="' + (W - PR) + '" y1="' + base + '" y2="' + base + '"/></g>';
    counts.forEach((c, i) => { const h = c / maxN * 80, bx = PL + i * bw + 2; if (c) b += '<rect class="bar lit" x="' + bx + '" y="' + (base - h) + '" width="' + Math.max(2, bw - 4) + '" height="' + h + '" rx="4"/>'; b += '<text class="lbl" x="' + (bx + (bw - 4) / 2) + '" y="' + (base - h - 8) + '" text-anchor="middle">' + (c || "") + "</text>"; if (nb <= 12 || i % Math.ceil(nb / 10) === 0) b += '<g class="axis"><text x="' + (bx + (bw - 4) / 2) + '" y="' + (base + 22) + '" text-anchor="middle">' + lab(lo + i * step) + "</text></g>"; });
    bands.innerHTML = b + "</svg>";
    const bh = document.querySelector("#bands .ch h3"); if (bh) bh.textContent = "Units per " + (step >= 1000 ? lab(step).replace("k", ",000") : step) + " serials";
    document.getElementById("bands").hidden = false;
  }

  // ── registry-models.html ───────────────────────────────────────────────
  async function models() {
    const out = document.getElementById("models-out");
    let d, cat;
    try { [d, cat] = await Promise.all([fetch(API).then(r => r.json()).catch(() => ({ ok: false })), catalog()]); } catch (e) { fail(out, "Couldn't load the catalog."); return; }
    const n = {}; if (d.ok) d.counts.forEach(c => { n[c.model_slug] = c.n; });
    const conf = { high: "Sony-dated", medium: "Manual or brochure year", low: "Collector estimate" };
    const block = line => {
      const rows = cat.models.filter(m => m.line === line);
      return '<h2 class="sec" id="' + line.toLowerCase() + '">' + (line === "BVM" ? "BVM · broadcast and master monitors" : "PVM · production monitors") + " <small>" + rows.length + " chassis</small></h2>" +
        '<div class="tablewrap" tabindex="0"><table class="spec models"><thead><tr><th>Model</th><th>Size</th><th>Series</th><th>Era</th><th>Variants</th><th class="num">Registered</th></tr></thead><tbody>' +
        rows.map(m => '<tr><td><a href="registry-' + m.slug + '.html">' + esc(m.model) + "</a></td><td>" + m.size_in + '"</td><td>' + esc(m.series) + '</td><td><span class="conf ' + m.era_confidence + '" title="' + conf[m.era_confidence] + '">' + esc(m.era) + '</span></td><td class="dim">' + esc(m.variants.filter(v => v !== m.model).join(", ")) + '</td><td class="num">' + (n[m.slug] ? '<b>' + n[m.slug] + "</b>" : '<span class="dim">0</span>') + "</td></tr>").join("") +
        "</tbody></table></div>";
    };
    const others = d.ok ? d.counts.filter(c => c.model_slug.startsWith("other-")) : [];
    out.innerHTML = block("BVM") + block("PVM") + (others.length ? '<h2 class="sec">Typed by owners, not yet in the catalog</h2><p>' + others.map(c => esc(c.model) + " (" + c.n + ")").join(" · ") + "</p>" : "");
  }

  // ── registry-submit.html ───────────────────────────────────────────────
  async function submitPage() {
    const form = document.getElementById("rf"), sel = document.getElementById("model"), other = document.getElementById("model_other"), otherWrap = document.getElementById("otherwrap");
    const status = document.getElementById("rstatus"), btn = form.querySelector("button[type=submit]");
    const cat = await catalog();
    const group = line => '<optgroup label="' + (line === "BVM" ? "BVM · broadcast and master" : "PVM · production") + '">' + cat.models.filter(m => m.line === line).map(m => '<option value="' + m.slug + '">' + esc(m.model) + "</option>").join("") + "</optgroup>";
    sel.innerHTML = '<option value="">Choose a model…</option>' + group("BVM") + group("PVM") + '<option value="other">Not listed — I\'ll type it</option>';
    const want = new URLSearchParams(location.search).get("m"); if (want && cat.bySlug[want]) sel.value = want;
    const syncOther = () => { otherWrap.hidden = sel.value !== "other"; }; sel.addEventListener("change", syncOther); syncOther();
    const country = document.getElementById("country"), sw = document.getElementById("statewrap");
    const syncState = () => { sw.hidden = country.value !== "US"; }; country.addEventListener("change", syncState); syncState();
    // photo preview + resize
    const file = document.getElementById("photo"), prev = document.getElementById("preview"); let photo = null;
    file.addEventListener("change", async () => {
      photo = null; prev.innerHTML = "";
      const f = file.files && file.files[0]; if (!f) return;
      try { photo = await shrink(f); prev.innerHTML = '<img src="' + photo.data + '" alt=""><span>' + esc(f.name) + " · " + Math.round(photo.bytes / 1024) + " KB after resizing · the plate's serial is visible if it's in the shot</span>"; }
      catch (e) { prev.innerHTML = "<span>That file couldn't be read as an image. JPEG, PNG or WebP.</span>"; file.value = ""; }
    });
    const say = (cls, msg) => { status.hidden = false; status.className = "cstatus " + cls; status.innerHTML = msg; };
    form.addEventListener("submit", async ev => {
      ev.preventDefault();
      const f = new FormData(form), body = {};
      for (const [k, v] of f.entries()) if (k !== "photo") body[k] = v;
      if (sel.value === "other") body.model_other = other.value;
      if (body.built && !/^\d{4}(-\d{2})?$/.test(body.built)) { // browsers without a month picker: "June 2007", "6/2007", "2007-6"
        const s = String(body.built).trim(), mi = MON.findIndex(m => s.toLowerCase().startsWith(m.toLowerCase())), y = (s.match(/\d{4}/) || [])[0], mn = (s.match(/^(\d{1,2})[\/\-.]/) || s.match(/-(\d{1,2})$/) || [])[1];
        if (y && mi >= 0) body.built = y + "-" + String(mi + 1).padStart(2, "0"); else if (y && mn && +mn >= 1 && +mn <= 12) body.built = y + "-" + String(mn).padStart(2, "0"); else if (y) body.built = y; else { say("warn", "The build date should be a month and year, like 2005-01 or Jan 2005."); document.getElementById("built").focus(); return; }
      }
      if (!body.model) { say("warn", "Pick the model first."); sel.focus(); return; }
      if (!/^[A-Za-z0-9\s\-_.]{4,24}$/.test(body.serial || "")) { say("warn", "The serial looks wrong. Digits and letters as printed on the plate, no punctuation needed."); document.getElementById("serial").focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email || "")) { say("warn", "An email address is needed (it stays private)."); document.getElementById("email").focus(); return; }
      if (photo) body.photo = { name: file.files[0].name, type: photo.type, data: photo.data };
      btn.disabled = true; say("", "Sending…");
      try {
        const r = await fetch("/api/registry-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.ok) {
          const page = j.catalog ? "registry-" + j.model_slug + ".html" : "registry.html";
          say("ok", "In. <b>" + esc(j.model) + " · " + esc(j.serial_masked) + "</b> is entry #" + j.id + '. <a href="' + page + '">See it on the ' + (j.catalog ? esc(j.model) + " page" : "registry") + " →</a>" + (j.catalog ? "" : " (a model not in the catalog shows on the registry list until the catalog catches up)"));
          form.reset(); photo = null; prev.innerHTML = ""; syncOther(); syncState();
        } else if (r.status === 409) say("warn", "That serial is already registered for this model. If it's yours and something's wrong with the entry, write through the <a href=\"about.html#write\">contact form</a> with the masked serial.");
        else if (r.status === 429) say("warn", "Too many entries from this connection for now. Try again in an hour.");
        else if (r.status === 413) say("warn", "The photo is too big even after resizing. Try a smaller one, or skip it.");
        else if (r.status === 503) say("warn", j.error === "photos-not-configured" ? "Photos aren't switched on yet. Send the entry without one." : "The registry isn't switched on yet.");
        else if (r.status === 400 && j.fields) say("warn", "Check these fields: " + j.fields.map(esc).join(", ") + ".");
        else say("warn", "That didn't go through. Try again in a minute, or <a href=\"about.html#write\">write to the arcade</a>.");
      } catch (e) { say("warn", "No connection. Try again in a minute."); }
      btn.disabled = false;
    });
  }
  // Resize in the browser: longest side 1600, JPEG 0.82 — strips EXIF (and GPS) by re-encoding.
  function shrink(f) {
    return new Promise((ok, no) => {
      const img = new Image(), url = URL.createObjectURL(f);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        const data = c.toDataURL("image/jpeg", 0.82);
        ok({ data, type: "image/jpeg", bytes: Math.round((data.length - 23) * 0.75) });
      };
      img.onerror = () => { URL.revokeObjectURL(url); no(new Error("bad image")); };
      img.src = url;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const b = document.body;
    if (b.dataset.registry === "landing") landing();
    else if (b.dataset.registry === "models") models();
    else if (b.dataset.registry === "submit") submitPage();
    else if (b.dataset.registry === "model") model(b.dataset.model);
  });
})();
