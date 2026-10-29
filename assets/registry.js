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
    const badge = e.model_as_entered && e.model_as_entered.toUpperCase() !== m.model.toUpperCase() ? esc(e.model_as_entered.toUpperCase()) + " · " : "";
    return badge + esc(m.line) + " · " + m.size_in + "-inch · " + esc(m.series) + (m.line === "PVM" ? " series" : " generation");
  };
  // Dropdown label: "BVM-20E1 U/E/J/A" when the variants are suffix swaps on one stem, else the twins written out ("PVM-1954Q / 2054QM").
  const optionLabel = m => {
    const pre = m.model.slice(0, 4), tail = v => v.startsWith(pre) ? v.slice(4) : v;
    if (!/[UEJAM]$/.test(m.model)) { // base badge has no region letter: write every twin out ("PVM-1954Q / 2054QM", "PVM-20L4 / 20L4E")
      const rest = m.variants.filter(v => v !== m.model).map(tail);
      return rest.length ? m.model + " / " + rest.join(" / ") : m.model;
    }
    const stem = m.model.slice(0, -1), swaps = [], others = [];
    m.variants.forEach(v => { const s = v.startsWith(stem) ? v.slice(stem.length) : ""; (/^[UEJAM]$/.test(s) ? swaps : others).push(v); });
    const base = swaps.length > 1 ? stem + " " + swaps.map(v => v.slice(stem.length)).join("/") : m.model;
    const rest = others.map(tail);
    return rest.length ? base + " / " + rest.join(" / ") : base;
  };
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const builtTxt = b => { if (!b) return null; const m = String(b).match(/^(\d{4})(?:-(\d{2}))?$/); return m ? (m[2] ? MON[+m[2] - 1] + " " : "") + m[1] : null; };
  const where = e => [e.state, e.country ? (COUNTRY[e.country] || e.country) : null].filter(Boolean).join(", ");
  const pageFor = e => "registry-" + e.model_slug + ".html";
  // Every entry has an address (2026-10-28): the model page plus #e<id>, or the hub for a model not in the catalog.
  const linkFor = e => (e.model_slug && !String(e.model_slug).startsWith("other-") ? pageFor(e) : "registry.html") + "#e" + e.id;
  const absLink = e => new URL(linkFor(e), location.href).href;

  function card(e, cat, opts) {
    opts = opts || {};
    const c = COND[e.cond] || ["", ""];
    const mask = esc(e.serial_masked).replace(/x+$/i, m => '<span class="mask">' + m + "</span>");
    const hours = e.hours == null ? "—" : fmt(e.hours) + " h", built = builtTxt(e.built);
    const hoursCell = e.line === "PVM" ? "" : "<div><b>Hours</b>" + hours + "</div>"; // PVMs have no meter (David, 10/25)
    const acq = [e.acq_year, e.acq_src].filter(Boolean).map(esc).join(" · ");
    const price = e.price != null ? fmt(e.price) + " " + esc(e.currency || "USD") : null;
    const title = opts.nolink || e.model_slug.startsWith("other-") ? esc(e.model) : '<a href="' + pageFor(e) + '">' + esc(e.model) + "</a>";
    return '<article class="card entry" id="e' + e.id + '" data-id="' + e.id + '">' +
      '<div class="ebody"><div class="etop"><div><h3>' + title + '</h3><div class="sub">' + seriesLine(e, cat) + "</div></div>" +
      '<span class="badge cond ' + c[1] + '">' + c[0] + "</span></div>" +
      '<div class="eline"><div><div class="serial"><b>Serial</b>' + mask + "</div>" +
      '<div class="emeta">' + (built ? "<div><b>Built</b>" + built + "</div>" : "") + hoursCell + "<div><b>Acquired</b>" + (acq || "—") + "</div>" + (price ? "<div><b>Paid</b>" + price + "</div>" : "") + (e.seller ? "<div><b>Bought from</b>" + esc(e.seller) + "</div>" : "") + "</div></div>" +
      (e.photo_url ? '<img class="ethumb" src="' + esc(e.photo_url) + '" data-full="' + esc(e.photo_url) + '" alt="' + esc(e.model) + " registered by " + esc(e.handle || "an owner") + '" loading="lazy" width="112" height="76">' : "") + "</div>" +
      (e.note ? '<p class="enote">' + esc(e.note) + "</p>" : "") +
      '<div class="ewho"><span>' + (e.handle ? esc(e.handle) : "Anonymous owner") + "</span>" + esc(where(e)) + "</div>" +
      '<div class="elink"><a class="plink" href="' + linkFor(e) + '" title="Link to this entry">Entry #' + e.id + '</a><button type="button" class="copy" data-copy="' + esc(absLink(e)) + '" aria-label="Copy a link to entry ' + e.id + '">Copy link</button></div>' +
      "</div></article>";
  }
  // "Copy link" on every card, one listener for all of them (cards arrive after load).
  document.addEventListener("click", ev => {
    const b = ev.target.closest && ev.target.closest("button.copy[data-copy]");
    if (!b) return;
    const done = () => { const t = b.textContent; b.textContent = "Copied"; b.classList.add("did"); setTimeout(() => { b.textContent = t; b.classList.remove("did"); }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(b.dataset.copy).then(done, () => fallbackCopy(b.dataset.copy, done));
    else fallbackCopy(b.dataset.copy, done);
  });
  function fallbackCopy(text, done) {
    const t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select(); try { document.execCommand("copy"); done(); } catch (e) {} t.remove();
  }
  // The phone's share sheet where there is one (most of the registry's visitors are on phones), copy where there isn't.
  function share(url, title, text) {
    if (navigator.share) return navigator.share({ url, title, text }).catch(() => {});
    return Promise.resolve(false);
  }
  const bindLightbox = () => {}; // site.js delegates img[data-full] clicks at the document level, so late cards just work
  const fail = (el, msg) => { el.innerHTML = '<p class="note">' + esc(msg) + "</p>"; };
  // No wait on a return visit (David, 10/26: the entries took ~2 s to appear). The browser keeps the last answer
  // for each API URL; the page paints from that copy at once, then repaints only if the network says something
  // different. A first visit waits on the network once. After an owner submits, this tab skips the edge cache for
  // the rest of the session so the new entry shows on the next page. Storage can be off; every access is guarded.
  const KEY = u => "orlandu-registry:" + u;
  const peek = u => { try { const v = localStorage.getItem(KEY(u)); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
  const keep = (u, d) => { try { localStorage.setItem(KEY(u), JSON.stringify(d)); } catch (e) {} };
  const bust = () => { try { return sessionStorage.getItem("orlandu-registry-fresh"); } catch (e) { return null; } };
  function live(u, paint) { // paint(d, first): first is true the first time it runs on this page view
    const old = peek(u), was = old && old.ok ? JSON.stringify(old) : null;
    if (was) paint(old, true);
    const b = bust();
    return fetch(b ? u + (u.indexOf("?") < 0 ? "?" : "&") + "fresh=" + b : u, { cache: "no-cache" }).then(r => r.json()).then(d => {
      if (d.ok) keep(u, d);
      if (JSON.stringify(d) !== was && (d.ok || !was)) paint(d, !was); // a failed refresh never wipes a good copy
    }, e => { if (!was) throw e; });
  }

  // ── registry.html ──────────────────────────────────────────────────────
  async function landing() {
    const cen = document.getElementById("census-out"), lat = document.getElementById("entries-out"), st = document.getElementById("stats");
    let cat;
    try { cat = await catalog(); await live(API, d => paintLanding(d, cat, cen, lat, st)); } catch (e) { fail(cen, "The registry is taking a moment to answer. Reload in a few seconds."); }
  }
  function paintLanding(d, cat, cen, lat, st) {
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
    records(d.records, d.counts, cat);
    if (lat.dataset.expanded) return; // the owner already asked for the full list; a background refresh must not shrink it back to nine
    lat.innerHTML = d.latest.length ? d.latest.map(e => card(e, cat)).join("") : '<div class="card"><h3>Nothing here yet</h3><p>The first entry is the hardest. <a href="registry-submit.html">Add yours →</a></p></div>';
    bindLightbox(lat);
    loadMore(lat, cat, s.entries, d.latest.length);
  }
  // "Show all N entries" under the nine-card strip (David, 10/27: the older entries were reachable only through
  // their model pages). Page 1 of ?entries=1 replaces the strip with the 24 newest; later pages append.
  function loadMore(lat, cat, total, shown) {
    const wrap = document.getElementById("entries-more"), btn = document.getElementById("entries-more-btn");
    if (!wrap || !btn) return;
    if (!(total > shown)) { wrap.hidden = true; return; }
    btn.textContent = "Show all " + fmt(total) + " entries";
    wrap.hidden = false;
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    let page = 0, count = 0;
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const d = await fetch(API + "?entries=1&page=" + (page + 1), { cache: "no-cache" }).then(r => r.json());
        if (!d.ok) throw new Error(d.error || "bad");
        page += 1;
        const html = d.entries.map(e => card(e, cat)).join("");
        if (page === 1) { lat.dataset.expanded = "1"; lat.innerHTML = html; count = d.entries.length; }
        else { lat.insertAdjacentHTML("beforeend", html); count += d.entries.length; }
        bindLightbox(lat);
        const small = document.querySelector("#entries h2.sec small");
        if (small) small.textContent = "all " + fmt(count) + " · newest first";
        if (d.more) { btn.textContent = "Show more"; btn.disabled = false; } else wrap.hidden = true;
      } catch (e) {
        btn.textContent = "Try again"; btn.disabled = false;
      }
    });
  }

  function records(r, counts, cat) {
    const sec = document.getElementById("records"), out = document.getElementById("records-out");
    if (!sec || !out || !r || !counts.length) return;
    const tile = (v, l, e, extra) => e ? '<a class="rec" href="registry-' + esc(e.model_slug) + '.html#e' + e.id + '"><span class="n">' + v + '</span><span class="l">' + l + '</span><span class="w">' + esc(e.model_as_entered && e.model_as_entered.toUpperCase() !== e.model ? e.model_as_entered.toUpperCase() : e.model) + (extra ? " · " + extra : "") + " · " + esc(e.handle || "anonymous owner") + "</span></a>" : "";
    const tiles = [];
    if (r.top) { const tied = counts.filter(c => c.n === r.top.n).length; tiles.push('<a class="rec" href="registry-' + esc(r.top.model_slug) + '.html"><span class="n">' + esc(r.top.model) + '</span><span class="l">Most registered</span><span class="w">' + r.top.n + (r.top.n === 1 ? " unit" : " units") + (tied > 1 ? " · tied with " + (tied - 1) + (tied === 2 ? " other" : " others") : "") + "</span></a>"); }
    if (r.biggest) tiles.push(tile(r.biggest.size + "-inch", "Biggest tube", r.biggest.entry));
    if (r.hours) tiles.push(tile(fmt(r.hours.hours) + " h", "Lowest hours", r.hours));
    if (r.oldest) tiles.push(tile(builtTxt(r.oldest.built), "Oldest plate", r.oldest));
    if (r.newest && (!r.oldest || r.newest.id !== r.oldest.id)) tiles.push(tile(builtTxt(r.newest.built), "Newest plate", r.newest));
    if (r.countries && r.countries.length) tiles.push('<span class="rec"><span class="n">' + r.countries.length + '</span><span class="l">' + (r.countries.length === 1 ? "Country" : "Countries") + '</span><span class="w">' + r.countries.map(c => esc(COUNTRY[c] || c)).join(" · ") + "</span></span>");
    out.innerHTML = tiles.join("");
    sec.hidden = false;
  }

  // ── registry-<model>.html ───────────────────────────────────────────────
  async function model(slug) {
    const out = document.getElementById("entries-out"), st = document.getElementById("stats"), lede = document.getElementById("mlede");
    let cat;
    try { cat = await catalog(); await live(API + "?model=" + encodeURIComponent(slug), (d, first) => paintModel(d, first, cat, slug, out, st, lede)); } catch (e) { fail(out, "The registry is taking a moment to answer. Reload in a few seconds."); }
  }
  function paintModel(d, first, cat, slug, out, st, lede) {
    if (!d.ok) { fail(out, "The registry is taking a moment to answer. Reload in a few seconds."); return; }
    const m = cat.bySlug[slug], E = d.entries, n = E.length;
    const working = E.filter(e => e.cond === "serviced" || e.cond === "working").length;
    const hrs = E.map(e => e.hours).filter(h => h != null).sort((a, b) => a - b);
    const med = hrs.length ? hrs[Math.floor(hrs.length / 2)] : null;
    const owners = new Set(E.map(e => e.handle || "anon-" + e.id)).size, countries = new Set(E.map(e => e.country).filter(Boolean)).size;
    const P = d.points;
    const range = P.length > 1 ? String(P[0].h).slice(0, -1) + "k–" + String(P[P.length - 1].h).slice(0, -1) + "k" : P.length ? String(P[0].h).slice(0, -1) + "k" : "—";
    const builts = E.map(e => e.built).filter(Boolean).sort();
    const tile3 = (m ? m.line : d.model.slice(0, 3)) === "PVM"
      ? [builts.length > 1 ? (builts[0].slice(0, 4) === builts[builts.length - 1].slice(0, 4) ? builtTxt(builts[0]) + " – " + builtTxt(builts[builts.length - 1]) : builts[0].slice(0, 4) + "–" + builts[builts.length - 1].slice(0, 4)) : builts.length ? builtTxt(builts[0]) : "—", "Build dates seen · " + builts.length + (builts.length === 1 ? " plate" : " plates")]
      : [med != null ? fmt(med) + " h" : "—", "Median hours · " + hrs.length + " reported"];
    st.innerHTML = [[n, "Registered"], [n ? working + " of " + n : "—", "Working"], tile3, [range, "Serial range seen"]].map(([v, l]) => '<div><span class="n">' + v + '</span><span class="l">' + l + "</span></div>").join("");
    if (lede) lede.textContent = n ? (n === 1 ? "One registered so far" : fmt(n) + " registered so far") + (n > 1 ? ", from " + owners + (owners === 1 ? " owner" : " owners") + (countries > 1 ? " in " + countries + " countries" : "") : "") + "." : "None registered yet. Yours would be the first.";
    charts(P, m ? m.model : d.model);
    out.innerHTML = n ? E.map(e => card(e, cat, { nolink: true })).join("") : '<div class="card"><h3>No ' + esc(m ? m.model : d.model) + ' registered yet</h3><p>Be the first: <a href="registry-submit.html?m=' + esc(slug) + '">add yours →</a></p></div>';
    const want = location.hash && /^#e\d+$/.test(location.hash) ? document.getElementById(location.hash.slice(1)) : null; // a records link: the cards arrive after load, so :target never fires
    if (want) { want.classList.add("lit"); if (first) want.scrollIntoView({ block: "center" }); }
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
    let cat;
    try { cat = await catalog(); } catch (e) { fail(out, "Couldn't load the catalog."); return; }
    paintModels({ ok: false }, cat, out); // the table needs only the catalog; the counts fill in from the copy kept or the network
    live(API, d => paintModels(d, cat, out)).catch(() => {});
  }
  function paintModels(d, cat, out) {
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
    const group = line => '<optgroup label="' + (line === "BVM" ? "BVM · broadcast and master" : "PVM · production") + '">' + cat.models.filter(m => m.line === line).map(m => '<option value="' + m.slug + '">' + esc(optionLabel(m)) + "</option>").join("") + "</optgroup>";
    sel.innerHTML = '<option value="">Choose a model…</option>' + group("BVM") + group("PVM") + '<option value="other">Not listed — I\'ll type it</option>';
    const want = new URLSearchParams(location.search).get("m"); if (want && cat.bySlug[want]) sel.value = want;
    const hoursWrap = document.getElementById("hourswrap"), varWrap = document.getElementById("variantwrap"), varSel = document.getElementById("variant"), hint = document.getElementById("builthint");
    const CONFW = { high: "Sony's own date", medium: "from a manual or brochure year", low: "a collector estimate" };
    // Build year vs catalog era — a nudge, not a gate (David, 10/25): warn once, send on the second press.
    const eraYears = m => { const t = m && m.era ? String(m.era).match(/(\d{4}).*?(\d{4})/) : null; return t ? [+t[1], +t[2]] : null; };
    let eraOk = "";
    const syncOther = () => {
      otherWrap.hidden = sel.value !== "other";
      const cm = cat.bySlug[sel.value];
      if (varWrap) {
        varWrap.hidden = !cm || cm.variants.length < 2;
        if (cm && cm.variants.length > 1 && varSel.dataset.for !== cm.slug) { varSel.innerHTML = cm.variants.map(v => '<option' + (v === cm.model ? " selected" : "") + ">" + esc(v) + "</option>").join(""); varSel.dataset.for = cm.slug; }
      }
      const pvm = sel.value.startsWith("pvm-") || (sel.value === "other" && /^\s*pvm/i.test(other.value));
      if (hoursWrap) hoursWrap.hidden = pvm; // PVMs have no hours meter
      if (hint) hint.innerHTML = cm ? "The catalog has the " + esc(cm.model) + " at <b>" + esc(cm.era) + "</b> (" + CONFW[cm.era_confidence] + "). A plate outside that still goes in — it's how the catalog gets corrected." : "";
    };
    sel.addEventListener("change", syncOther); other.addEventListener("input", syncOther); syncOther();
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
      else if (varWrap && !varWrap.hidden) body.variant = varSel.value; else delete body.variant;
      if (body.built && !/^\d{4}(-\d{2})?$/.test(body.built)) { // browsers without a month picker: "June 2007", "6/2007", "2007-6"
        const s = String(body.built).trim(), mi = MON.findIndex(m => s.toLowerCase().startsWith(m.toLowerCase())), y = (s.match(/\d{4}/) || [])[0], mn = (s.match(/^(\d{1,2})[\/\-.]/) || s.match(/-(\d{1,2})$/) || [])[1];
        if (y && mi >= 0) body.built = y + "-" + String(mi + 1).padStart(2, "0"); else if (y && mn && +mn >= 1 && +mn <= 12) body.built = y + "-" + String(mn).padStart(2, "0"); else if (y) body.built = y; else { say("warn", "The build date should be a month and year, like 2005-01 or Jan 2005."); document.getElementById("built").focus(); return; }
      }
      if (body.built && +String(body.built).slice(0, 4) > 2010) { say("warn", "The build date reads <b>" + esc(builtTxt(body.built) || body.built) + "</b> — no Sony CRT monitor was built after about 2009. Phones often fill in today's date when the field is tapped; enter the month and year from the rear plate, or leave it blank."); document.getElementById("built").focus(); return; }
      if (!body.model) { say("warn", "Pick the model first."); sel.focus(); return; }
      const cm = cat.bySlug[sel.value], ey = eraYears(cm), by = body.built ? +String(body.built).slice(0, 4) : 0;
      if (ey && by && (by < ey[0] - 1 || by > ey[1] + 1) && eraOk !== sel.value + "|" + body.built) {
        eraOk = sel.value + "|" + body.built;
        say("warn", "<b>" + by + "</b> is outside the years the catalog has for the " + esc(cm.model) + " (" + esc(cm.era) + ", " + CONFW[cm.era_confidence] + "). A slip of a digit? Check the plate — if that's what it reads, press Send again and it goes in as written.");
        document.getElementById("built").focus(); return;
      }
      if (!/^[A-Za-z0-9\s\-_.]{4,24}$/.test(body.serial || "")) { say("warn", "The serial looks wrong. Digits and letters as printed on the plate, no punctuation needed."); document.getElementById("serial").focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email || "")) { say("warn", "An email address is needed (it stays private)."); document.getElementById("email").focus(); return; }
      if (photo) body.photo = { name: file.files[0].name, type: photo.type, data: photo.data };
      btn.disabled = true; say("", "Sending…");
      try {
        const r = await fetch("/api/registry-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.ok) {
          try { sessionStorage.setItem("orlandu-registry-fresh", String(Date.now())); } catch (e) {}
          const page = j.catalog ? "registry-" + j.model_slug + ".html" : "registry.html";
          say("ok", "In. <b>" + esc(j.model) + " · " + esc(j.serial_masked) + "</b> is entry #" + j.id + '. <a href="' + page + '">See it on the ' + (j.catalog ? esc(j.model) + " page" : "registry") + " →</a>" + (j.catalog ? "" : " (a model not in the catalog shows on the registry list until the catalog catches up)"));
          showDone(j, body, cat, form, page);
          form.reset(); photo = null; prev.innerHTML = ""; syncOther(); syncState();
        } else if (r.status === 409) say("warn", "That serial is already registered for this model. If it's yours and something's wrong with the entry, write through the <a href=\"about.html#write\">contact form</a> with the masked serial.");
        else if (r.status === 429) say("warn", "Too many entries from this connection for now. Try again in an hour.");
        else if (r.status === 413) say("warn", "The photo is too big even after resizing. Try a smaller one, or skip it.");
        else if (r.status === 503) say("warn", j.error === "photos-not-configured" ? "Photos aren't switched on yet. Send the entry without one." : "The registry isn't switched on yet.");
        else if (r.status === 400 && j.fields) {
          const WHY = { model: "pick a model, or type the badge under Not listed", "model-format": "the typed model should read like PVM-1442QM or BVM-D20F1J — letters and digits, no description", serial: "the serial should be 4 to 20 letters and digits as printed", hours: "hours should be a whole number", cond: "pick a condition", acq_year: "the year acquired should be a four-digit year", acq_src: "pick a source from the list", price: "the price should be a plain number", currency: "pick a currency", email: "an email address is needed (it stays private)", country: "pick a country from the list", built: "the build date should be a month and year, like 2005-01", "built-late": "the build date is after 2010 — check the rear plate, or leave it blank" };
          say("warn", "Not sent yet: " + j.fields.map(f => esc(WHY[f] || f)).join("; ") + ".");
        }
        else say("warn", "That didn't go through. Try again in a minute, or <a href=\"about.html#write\">write to the arcade</a>.");
      } catch (e) { say("warn", "No connection. Try again in a minute."); }
      btn.disabled = false;
    });
  }
  // After a submit (2026-10-28): the owner's finished card, its link, and a share button — the loop that brings the
  // next owner in is this one posting their own card where they found the registry.
  function showDone(j, body, cat, form, page) {
    const cm = j.catalog && cat.bySlug[j.model_slug];
    const e = { id: j.id, model: j.model, model_slug: j.model_slug || "other-" + slugOf(j.model), line: cm ? cm.line : (/^BVM/i.test(j.model) ? "BVM" : "PVM"),
      model_as_entered: body.variant || body.model_other || null, serial_masked: j.serial_masked, built: body.built || null, hours: body.hours ? +body.hours : null,
      cond: body.cond, note: body.note || null, acq_year: body.acq_year ? +body.acq_year : null, acq_src: body.acq_src || null, price: body.price ? +body.price : null,
      currency: body.currency || null, seller: body.seller || null, handle: body.handle || null, country: body.country || null, state: body.state || null, photo_url: j.photo_url || null };
    const url = absLink(e), title = "Sony " + j.model + " · " + j.serial_masked + " — the Orlandu Registry";
    const canShare = !!navigator.share;
    let box = document.getElementById("done");
    if (!box) { box = document.createElement("section"); box.id = "done"; box.className = "done"; form.parentNode.insertBefore(box, form); }
    box.innerHTML = '<h2 class="sec">You&rsquo;re in <small>entry #' + e.id + '</small></h2>' +
      '<div class="entries one">' + card(e, cat) + "</div>" +
      '<div class="cactions">' + (canShare ? '<button type="button" class="btn" id="done-share">Share this entry</button>' : '<button type="button" class="btn copy" data-copy="' + esc(url) + '">Copy a link to this entry</button>') +
      '<a class="btn cy" href="' + page + '">See it on the ' + (j.catalog ? esc(j.model) + " page" : "registry") + ' &rarr;</a>' +
      '<button type="button" class="btn cy" id="done-again">Add another monitor</button></div>' +
      '<p class="note">Know another owner? Send them the link, or post your card where you found the registry. The card shows what you chose to share and nothing else.</p>';
    form.hidden = true;
    box.scrollIntoView({ behavior: "smooth", block: "start" });
    if (canShare) document.getElementById("done-share").addEventListener("click", () => share(url, title, "My " + j.model + " is in the Orlandu Registry, a serial-number census of surviving Sony BVM and PVM monitors."));
    document.getElementById("done-again").addEventListener("click", () => { box.remove(); form.hidden = false; form.scrollIntoView({ behavior: "smooth", block: "start" }); });
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
