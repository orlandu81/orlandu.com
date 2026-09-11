// ═══════════════════════════════════════════════════════════
// SITE.JS — Orlandu's Arcade shared chrome + lightbox
// Header/footer are injected here so nav changes are one edit.
// Pages carry: <header class="site" data-page="games"></header>
// and <footer class="site"></footer> plus this script (defer).
// ═══════════════════════════════════════════════════════════
(function(){
  const NAV = [
    ["/",             "Home"],
    ["games.html",    "Coin-Op"],
    ["monitors.html", "Monitors"],
    ["consoles.html", "Consoles"],
    ["signage.html",  "Signage"],
    ["guide-shelf.html", "Guides"],
    ["gallery.html",  "Gallery"],
    ["stories.html",  "Stories"],
    ["projects.html", "Projects"],
    ["forsale.html",  "For Sale"],
    ["wanted.html",   "Wanted"],
    ["about.html",    "About"]
  ];

  // Keyboard access: a skip link ahead of the injected chrome.
  const mainEl = document.querySelector("main");
  if (mainEl && !mainEl.id) mainEl.id = "main";
  const skip = document.createElement("a");
  skip.className = "skip";
  skip.href = "#main";
  skip.textContent = "Skip to content";
  document.body.insertBefore(skip, document.body.firstChild);

  // Vercel Web Analytics (privacy-friendly, cookieless). Counts nothing until
  // Analytics is enabled on the Vercel project; harmless before that.
  const va = document.createElement("script");
  va.defer = true;
  va.src = "/_vercel/insights/script.js";
  document.head.appendChild(va);

  const header = document.querySelector("header.site");
  if (header){
    const here = header.dataset.page || "";
    header.innerHTML =
      '<div class="navwrap">' +
        '<a class="navlogo" href="/"><img src="assets/logo-wordmark-nav.webp" alt="Orlandu’s Arcade" width="335" height="132" fetchpriority="high" decoding="async"></a>' +
        '<button class="burger" aria-label="Menu" aria-expanded="false">☰ MENU</button>' +
        '<nav class="main">' +
          NAV.map(([href, label]) =>
            '<a href="' + href + '"' + (href === here + ".html" || href === here || (href === "/" && here === "index") ? ' class="here"' : '') + '>' + label + '</a>'
          ).join("") +
        '</nav>' +
      '</div>';
    const burger = header.querySelector(".burger");
    const nav = header.querySelector("nav.main");
    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  const footer = document.querySelector("footer.site");
  if (footer){
    footer.innerHTML =
      '<div class="footwrap">' +
        '<img src="assets/mascot-foot.webp" alt="Orlandu’s Arcade mascot" width="176" height="216" loading="lazy" decoding="async">' +
        '<div class="links">' +
          '<a href="about.html">About</a>' +
          '<a href="about.html#contact">Contact</a>' +
          '<a href="stories.html">Stories</a>' +
          '<a href="mailto:orlandusarcade@gmail.com">Email</a>' +
          '<a href="https://www.instagram.com/orlandusarcade/" target="_blank" rel="noopener">Instagram</a>' +
          '<a href="https://www.ebay.com/usr/orlandu81" target="_blank" rel="noopener">eBay</a>' +
        '</div>' +
        '<nav class="explore" aria-label="Explore the site">' +
          '<div><span>Pages</span>' + NAV.slice(1).map(([href, label]) => '<a href="' + href + '">' + label + '</a>').join('') +
            '<a href="glossary.html">Glossary</a><a href="timeline.html">Timeline</a><a href="about.html#faq">FAQ</a></div>' +
          '<div><span>Reading</span>' +
            '<a href="crt-field-guide.html">Professional glass in the wild</a>' +
            '<a href="ams-100-monograph.html">The AMS-100 monograph</a>' +
            '<a href="pvm-20l5-buying-guide.html">PVM-20L5 buying guide</a>' +
            '<a href="ams-3-vs-ams-100.html">Ancestor and descendant</a>' +
            '<a href="trinitron-fleet-vol1.html">Trinitron Fleet, Vol. 1</a>' +
            '<a href="signal-chain.html">The signal chain</a>' +
            '<a href="vs-smb.html">VS. Super Mario Bros.</a>' +
            '<a href="pvm-vs-bvm.html">PVM vs. BVM</a>' +
            '<a href="red-tent.html">The Red Tent</a>' +
            '<a href="mini-cute.html">The Mini Cute</a>' +
            '<a href="orlandu-100.html">The Orlandu 100</a>' +
          '</div>' +
        '</nav>' +
        '<div class="fine">© 2026 Orlandu’s Arcade™ · Orange County, CA<br>Photography © Orlandu’s Arcade. Game logos and characters are the property of their respective owners.</div>' +
      '</div>';
  }

  // ── Lightbox ─────────────────────────────────────────────
  // Any <img data-full="..."> opens in the lightbox on click.
  const lb = document.createElement("div");
  lb.id = "lightbox";
  lb.hidden = true;
  lb.setAttribute("role", "dialog");
  lb.setAttribute("aria-modal", "true");
  lb.setAttribute("aria-label", "Photo viewer");
  lb.innerHTML =
    '<button class="lb-close" aria-label="Close">✕</button>' +
    '<button class="lb-prev" aria-label="Previous">‹</button>' +
    '<figure><div class="lb-stage"><img alt=""></div><figcaption></figcaption></figure>' +
    '<button class="lb-next" aria-label="Next">›</button>' +
    '<div class="lb-tools">' +
      '<button class="lb-zoom" aria-label="Zoom to actual pixels" aria-pressed="false">1:1</button>' +
      '<button class="lb-play" aria-label="Play slideshow" aria-pressed="false" hidden>▶</button>' +
    '</div>';
  document.body.appendChild(lb);

  const lbImg = lb.querySelector("img");
  const lbCap = lb.querySelector("figcaption");
  const stage = lb.querySelector(".lb-stage");
  let items = [], idx = 0, opener = null;

  // ── Zoom + pan (2026-09-11) ─────────────────────────────
  // Wheel and drag on desktop, pinch and double-tap on touch, and a 1:1 button
  // that shows the master at its native pixels. Pure CSS transforms on the img;
  // swipe-to-navigate only fires when the photo is at fit size.
  const zoomBtn = lb.querySelector(".lb-zoom");
  let z = 1, px = 0, py = 0, dragging = false, dx0 = 0, dy0 = 0, moved = false, pinch0 = null, lastTap = 0;
  function fitScale(){ // CSS pixels the img is displayed at vs its natural size
    return lbImg.naturalWidth ? lbImg.getBoundingClientRect().width / z / lbImg.naturalWidth : 1;
  }
  function clamp(){
    const r = stage.getBoundingClientRect();
    const w = lbImg.offsetWidth * z, h = lbImg.offsetHeight * z;
    const mx = Math.max(0, (w - r.width) / 2), my = Math.max(0, (h - r.height) / 2);
    px = Math.max(-mx, Math.min(mx, px)); py = Math.max(-my, Math.min(my, py));
  }
  function apply(){
    clamp();
    lbImg.style.transform = z === 1 ? "" : "translate(" + px + "px," + py + "px) scale(" + z + ")";
    lb.classList.toggle("zoomed", z > 1);
    const oneToOne = Math.abs(z * fitScale() - 1) < 0.02;
    zoomBtn.setAttribute("aria-pressed", oneToOne ? "true" : "false");
    zoomBtn.textContent = z > 1 ? "Fit" : "1:1";
    zoomBtn.setAttribute("aria-label", z > 1 ? "Fit to screen" : "Zoom to actual pixels");
  }
  function resetZoom(){ z = 1; px = py = 0; apply(); }
  function zoomAt(factor, cx, cy){ // keep the point under the cursor fixed
    const r = stage.getBoundingClientRect();
    const ox = cx - (r.left + r.width / 2), oy = cy - (r.top + r.height / 2);
    const nz = Math.max(1, Math.min(8, z * factor));
    const k = nz / z;
    px = ox - (ox - px) * k; py = oy - (oy - py) * k; z = nz;
    if (z === 1){ px = py = 0; }
    apply();
  }
  zoomBtn.addEventListener("click", e => {
    e.stopPropagation();
    if (z > 1) return resetZoom();
    const r = stage.getBoundingClientRect();
    const f = fitScale();
    z = f > 0 ? Math.max(1, 1 / f) : 2; px = py = 0;
    if (z === 1) z = 2; // already at native size on this screen: give the reader something
    apply(); void r;
  });
  stage.addEventListener("wheel", e => {
    if (lb.hidden) return;
    e.preventDefault();
    zoomAt(e.deltaY < 0 ? 1.25 : 0.8, e.clientX, e.clientY);
  }, { passive: false });
  stage.addEventListener("dblclick", e => {
    e.preventDefault();
    if (z > 1) resetZoom(); else zoomAt(2.5, e.clientX, e.clientY);
  });
  stage.addEventListener("pointerdown", e => {
    if (z === 1 || e.pointerType === "touch") return;
    dragging = true; moved = false; dx0 = e.clientX - px; dy0 = e.clientY - py;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", e => {
    if (!dragging) return;
    px = e.clientX - dx0; py = e.clientY - dy0; moved = true; apply();
  });
  stage.addEventListener("pointerup", () => { dragging = false; });
  stage.addEventListener("pointercancel", () => { dragging = false; });
  stage.addEventListener("touchstart", e => {
    if (e.touches.length === 2){
      const [a, b] = e.touches;
      pinch0 = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: z,
                 cx: (a.clientX + b.clientX) / 2, cy: (a.clientY + b.clientY) / 2 };
    } else if (e.touches.length === 1){
      const now = Date.now();
      if (now - lastTap < 300){
        const t = e.touches[0];
        if (z > 1) resetZoom(); else zoomAt(2.5, t.clientX, t.clientY);
        lastTap = 0;
      } else lastTap = now;
      if (z > 1){ dx0 = e.touches[0].clientX - px; dy0 = e.touches[0].clientY - py; }
    }
  }, { passive: true });
  stage.addEventListener("touchmove", e => {
    if (e.touches.length === 2 && pinch0){
      const [a, b] = e.touches;
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const nz = Math.max(1, Math.min(8, pinch0.z * d / pinch0.d));
      const k = nz / z; const r = stage.getBoundingClientRect();
      const ox = pinch0.cx - (r.left + r.width / 2), oy = pinch0.cy - (r.top + r.height / 2);
      px = ox - (ox - px) * k; py = oy - (oy - py) * k; z = nz; apply();
      e.preventDefault();
    } else if (e.touches.length === 1 && z > 1){
      px = e.touches[0].clientX - dx0; py = e.touches[0].clientY - dy0; apply();
      e.preventDefault();
    }
  }, { passive: false });
  stage.addEventListener("touchend", e => { if (e.touches.length < 2) pinch0 = null; }, { passive: true });

  function visibleItems(){
    return Array.from(document.querySelectorAll("img[data-full]"))
      .filter(el => el.offsetParent !== null);
  }
  function captionFor(el){
    const fig = el.closest("figure");
    const cap = fig && fig.querySelector("figcaption");
    return cap ? cap.innerHTML : (el.alt || "");
  }
  // Warm the full-size photo before it is asked for: on hover/touch of a thumb, and
  // for the neighbors once the lightbox is open. Costs nothing on pages nobody clicks.
  const warmed = new Set();
  function warm(src){
    if (!src || warmed.has(src)) return;
    warmed.add(src);
    const im = new Image();
    im.decoding = "async";
    im.src = src;
  }
  function show(i){
    idx = (i + items.length) % items.length;
    const el = items[idx];
    resetZoom();
    lbImg.src = el.dataset.full;
    lbImg.alt = el.alt || "";
    lbCap.innerHTML = captionFor(el);
    if (lb.hidden){
      opener = document.activeElement;
      lb.hidden = false;
      lb.querySelector(".lb-close").focus();
    }
    document.body.style.overflow = "hidden";
    if (items.length > 1){
      warm(items[(idx + 1) % items.length].dataset.full);
      warm(items[(idx - 1 + items.length) % items.length].dataset.full);
    }
  }
  const warmOnIntent = e => {
    const img = e.target.closest && e.target.closest("img[data-full]");
    if (img) warm(img.dataset.full);
  };
  document.addEventListener("pointerenter", warmOnIntent, true);
  document.addEventListener("touchstart", warmOnIntent, {capture:true, passive:true});
  function close(){
    stopShow();
    if (document.fullscreenElement === lb && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    resetZoom();
    lb.hidden = true;
    lbImg.src = "";
    document.body.style.overflow = "";
    if (opener && opener.focus) opener.focus();
    opener = null;
  }

  document.addEventListener("click", e => {
    const img = e.target.closest("img[data-full]");
    if (img){
      items = visibleItems();
      show(items.indexOf(img));
      return;
    }
  });
  lb.querySelector(".lb-close").addEventListener("click", close);
  lb.querySelector(".lb-prev").addEventListener("click", e => { e.stopPropagation(); resetZoom(); show(idx - 1); });
  lb.querySelector(".lb-next").addEventListener("click", e => { e.stopPropagation(); resetZoom(); show(idx + 1); });
  lb.addEventListener("click", e => { if (e.target === lb) close(); });

  // ── Slideshow / Attract Mode (2026-09-11) ────────────────
  // Opt in per page with <body data-slideshow>: the gallery. Auto-advances the
  // current set (so a filter or #tag= plays only that set), goes fullscreen where
  // the browser allows it, hides the cursor after a moment, and a tap on the photo
  // pauses. gallery.html#play (or #pinball&play, #tag=tna&play) starts it on load.
  const playBtn = lb.querySelector(".lb-play");
  const SHOW_MS = 5000;
  let showT = null, cursorT = null;
  function setPlayUI(on){
    playBtn.setAttribute("aria-pressed", on ? "true" : "false");
    playBtn.textContent = on ? "❚❚" : "▶";
    playBtn.setAttribute("aria-label", on ? "Pause slideshow" : "Play slideshow");
    lb.classList.toggle("playing", on);
  }
  function stopShow(){
    if (showT){ clearInterval(showT); showT = null; }
    clearTimeout(cursorT); lb.classList.remove("idle");
    setPlayUI(false);
  }
  function startShow(){
    if (showT) return;
    showT = setInterval(() => { resetZoom(); show(idx + 1); }, SHOW_MS);
    setPlayUI(true);
    if (lb.requestFullscreen && !document.fullscreenElement) lb.requestFullscreen().catch(() => {});
    wake();
  }
  function wake(){
    lb.classList.remove("idle"); clearTimeout(cursorT);
    if (showT) cursorT = setTimeout(() => lb.classList.add("idle"), 2200);
  }
  lb.addEventListener("mousemove", wake, { passive: true });
  lb.addEventListener("touchstart", wake, { passive: true });
  playBtn.addEventListener("click", e => { e.stopPropagation(); showT ? stopShow() : startShow(); });
  stage.addEventListener("click", e => { if (showT && !moved){ e.stopPropagation(); stopShow(); } });
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && showT) stopShow(); });
  if (document.body.dataset.slideshow !== undefined){
    playBtn.hidden = false;
    // public hook for the gallery page: play the given thumbs from the first one
    window.orlanduSlideshow = function(list){
      items = (list && list.length) ? list : visibleItems();
      if (!items.length) return;
      show(0); startShow();
    };
  }

  document.addEventListener("keydown", e => {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === " " && !playBtn.hidden){ e.preventDefault(); showT ? stopShow() : startShow(); }
    if (e.key === "ArrowLeft"){ resetZoom(); show(idx - 1); }
    if (e.key === "ArrowRight"){ resetZoom(); show(idx + 1); }
    if (e.key === "Tab"){
      // keep focus inside the dialog: cycle the three buttons
      const btns = Array.from(lb.querySelectorAll("button")).filter(b => !b.hidden);
      const i = btns.indexOf(document.activeElement);
      const next = e.shiftKey ? (i <= 0 ? btns.length - 1 : i - 1) : (i === -1 || i === btns.length - 1 ? 0 : i + 1);
      btns[next].focus();
      e.preventDefault();
    }
  });
  // touch swipe
  let tx = null;
  lb.addEventListener("touchstart", e => { tx = e.touches[0].clientX; }, {passive:true});
  lb.addEventListener("touchend", e => {
    if (tx === null || z > 1 || pinch0) { tx = null; return; }
    const dx = e.changedTouches[0].clientX - tx;
    if (dx > 50) show(idx - 1);
    else if (dx < -50) show(idx + 1);
    tx = null;
  }, {passive:true});
})();

// ═══════════════════════════════════════════════════════════
// Autoplay silent videos when they scroll into view.
// Opt in per element with data-autoplay. Requires muted (browsers
// block autoplay with sound). Honors prefers-reduced-motion, and
// never fights a viewer who pressed pause themselves.
// ═══════════════════════════════════════════════════════════
(function(){
  const vids = document.querySelectorAll("video[data-autoplay]");
  if (!vids.length) return;
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  vids.forEach(v => {
    v.muted = true;               // belt and braces: autoplay needs it
    v._autoPausing = false;
    v._userPaused  = false;
    // NOTE: the pause event fires asynchronously, so the flag must be
    // cleared *here* rather than right after calling pause() — otherwise
    // our own scroll-away pause gets misread as the viewer pausing.
    v.addEventListener("pause", () => {
      if (v._autoPausing) v._autoPausing = false;
      else v._userPaused = true;
    });
    v.addEventListener("play", () => { v._userPaused = false; });
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const v = e.target;
      if (e.isIntersecting) {
        if (!v._userPaused) { const p = v.play(); if (p) p.catch(() => {}); }
      } else if (!v.paused) {
        v._autoPausing = true;
        v.pause();
      }
    });
  }, { threshold: 0.4 });

  vids.forEach(v => io.observe(v));
})();

/* ── Marquee speed ────────────────────────────────────────────────
   The CSS duration is a fallback. A fixed duration means a fixed
   time for a full loop, so the ticker speeds up every time a segment
   is added to the strip. Measure the content and set the duration
   from a target reading speed instead, so adding copy makes the loop
   longer rather than faster.
   Travel distance == the span's own offsetWidth, because the keyframe
   is translateX(-100%) and padding-left:100% is part of that width. */
(function () {
  const TARGET_PX_PER_SEC = 75;   // comfortable read for .7rem letterspaced caps
  const MIN_S = 20, MAX_S = 300;

  const span = document.querySelector(".strip span");
  if (!span) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let applied = null;
  function setSpeed() {
    const w = span.offsetWidth;
    if (!w) return;
    const dur = Math.min(MAX_S, Math.max(MIN_S, w / TARGET_PX_PER_SEC));
    const val = dur.toFixed(1) + "s";
    if (val === applied) return;          // avoid restarting the animation needlessly
    applied = val;
    span.style.animationDuration = val;
  }

  setSpeed();
  // Web fonts land after first paint and change the text width.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setSpeed);

  let t;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(setSpeed, 250);
  });
})();

/* scroll reveal — sections and tiles fade up once as they enter the viewport.
   ⚠ threshold MUST stay 0. IntersectionObserver measures it as a fraction of the
   TARGET's own area, so a tall element needs 5% of ITSELF on screen — impossible
   past roughly 20x the viewport height, and the element then sits at opacity 0
   forever. orlandu-100.html's 11-100 grid is 13,120px at 1280 and 38,950px on a
   phone; at threshold 0.05 it never faded in on mobile at all, and on desktop it
   failed whenever the reader arrived by anchor jump rather than by scrolling.
   Verified 2026-09-04 across all 33 pages at 1280x900 and 390x844: nothing is
   left untriggered and the fade itself is unchanged. */
(function(){
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var els=document.querySelectorAll('main section, .grid > *, .shot, .masonry > *');
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -8% 0px',threshold:0});
  els.forEach(function(el,i){ if(el.getBoundingClientRect().top>innerHeight){el.classList.add('reveal');io.observe(el);} });
})();

/* back to top — appears once the reader is a screen and a half down */
(function(){
  var b = document.createElement("button");
  b.className = "totop"; b.type = "button"; b.hidden = true;
  b.setAttribute("aria-label", "Back to top"); b.textContent = "\u2191 TOP";
  b.addEventListener("click", function(){
    var smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({top: 0, behavior: smooth ? "smooth" : "auto"});
  });
  document.body.appendChild(b);
  var t;
  function check(){ b.hidden = window.scrollY < innerHeight * 1.5; }
  window.addEventListener("scroll", function(){ clearTimeout(t); t = setTimeout(check, 80); }, {passive:true});
  check();
})();

/* ═══════════════════════════════════════════════════════════
   Section links + share (2026-09-11)
   Every h2 inside <main> gets a stable id (derived from its text, so nothing is
   hand-maintained) and a hover/focus "#" that copies the deep link. Story, guide
   and machine pages also get a Share control that opens the phone's native share
   sheet, falling back to copy-link on desktop. Existing ids are left alone.
   ═══════════════════════════════════════════════════════════ */
(function(){
  var main = document.querySelector("main");
  if (!main) return;
  function slug(s){
    return s.toLowerCase().replace(/&[a-z]+;/g," ").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60) || "section";
  }
  function toast(msg, near){
    var t = document.createElement("div");
    t.className = "linktoast"; t.setAttribute("role","status"); t.textContent = msg;
    document.body.appendChild(t);
    var r = near && near.getBoundingClientRect();
    if (r){ t.style.left = Math.max(8, Math.min(innerWidth - t.offsetWidth - 8, r.left)) + "px"; t.style.top = (r.bottom + 6 + scrollY) + "px"; }
    setTimeout(function(){ t.classList.add("out"); }, 1400);
    setTimeout(function(){ t.remove(); }, 1800);
  }
  function copy(text){
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function(res, rej){
      var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.left = "-9999px";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); res(); } catch(e){ rej(e); }
      ta.remove();
    });
  }
  var used = {};
  Array.prototype.forEach.call(main.querySelectorAll("h2"), function(h){
    if (h.closest("nav, .machnav, #lightbox")) return;
    if (!h.id){
      var base = slug(h.querySelector("small") ? h.textContent.replace(h.querySelector("small").textContent, "") : h.textContent);
      var id = base, n = 2;
      while (used[id] || document.getElementById(id)) id = base + "-" + (n++);
      h.id = id;
    }
    used[h.id] = true;
    var a = document.createElement("a");
    a.className = "hlink"; a.href = "#" + h.id; a.setAttribute("aria-label", "Copy link to this section"); a.textContent = "#";
    a.addEventListener("click", function(e){
      e.preventDefault();
      var url = location.origin + location.pathname + "#" + h.id;
      history.replaceState(null, "", "#" + h.id);
      copy(url).then(function(){ toast("Link copied", a); }, function(){ location.hash = h.id; });
    });
    h.appendChild(a);
  });

  // Share control: pages with a reading time, and machine profiles.
  var h1 = main.querySelector("h1");
  if (h1 && (main.querySelector(".rt") || main.classList.contains("profile")) && !main.querySelector(".sharerow")){
    var row = document.createElement("div");
    row.className = "sharerow";
    var b = document.createElement("button");
    b.type = "button"; b.className = "share";
    b.innerHTML = '<span aria-hidden="true">⇪</span> Share this page';
    b.addEventListener("click", function(){
      var data = { title: document.title, url: location.origin + location.pathname };
      if (navigator.share){ navigator.share(data).catch(function(){}); }
      else copy(data.url).then(function(){ toast("Link copied", b); });
    });
    row.appendChild(b);
    var lede = h1.nextElementSibling && h1.nextElementSibling.classList.contains("lede") ? h1.nextElementSibling : null;
    (lede || h1).insertAdjacentElement("afterend", row);
  }
})();

/* ═══════════════════════════════════════════════════════════
   Reading progress + resume (2026-09-11)
   Pages with a reading time (div.rt) get a thin progress bar under the header,
   and a "pick up where you left off" pill when a reader returns to a page they
   had read past a third of. Position lives in this browser only (localStorage,
   try/catch'd — private windows throw). Cleared once the reader reaches the end.
   ═══════════════════════════════════════════════════════════ */
(function(){
  var main = document.querySelector("main");
  if (!main || !main.querySelector(".rt")) return;
  var KEY = "orl-read:" + location.pathname;
  var bar = document.createElement("div");
  bar.className = "readbar"; bar.setAttribute("aria-hidden", "true");
  bar.innerHTML = "<i></i>";
  document.body.appendChild(bar);
  var fill = bar.firstChild;
  function frac(){
    var h = document.documentElement.scrollHeight - innerHeight;
    return h > 0 ? Math.min(1, Math.max(0, scrollY / h)) : 0;
  }
  function nearestHeading(){
    var hs = main.querySelectorAll("h2[id]"), best = null;
    for (var i = 0; i < hs.length; i++){
      if (hs[i].getBoundingClientRect().top < innerHeight * 0.4) best = hs[i];
    }
    return best;
  }
  var t, saveT;
  function tick(){
    var f = frac();
    fill.style.transform = "scaleX(" + f + ")";
    clearTimeout(saveT);
    saveT = setTimeout(function(){
      try {
        if (f >= 0.95 || f < 0.05) localStorage.removeItem(KEY);
        else {
          var h = nearestHeading();
          localStorage.setItem(KEY, JSON.stringify({ f: f, id: h ? h.id : "", t: h ? h.textContent.replace(/#$/, "").trim() : "" }));
        }
      } catch(e){}
    }, 400);
  }
  addEventListener("scroll", function(){ clearTimeout(t); t = setTimeout(tick, 60); }, { passive: true });
  tick();

  var saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || "null"); } catch(e){}
  if (saved && saved.f >= 0.33 && !location.hash && scrollY < 200){
    var pill = document.createElement("div");
    pill.className = "resume"; pill.setAttribute("role", "status");
    var go = document.createElement("button");
    go.type = "button";
    go.textContent = "Pick up where you left off" + (saved.t ? " — " + saved.t : "");
    var x = document.createElement("button");
    x.type = "button"; x.className = "x"; x.setAttribute("aria-label", "Dismiss"); x.textContent = "✕";
    go.addEventListener("click", function(){
      var target = saved.id && document.getElementById(saved.id);
      var smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (target) target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
      else scrollTo({ top: saved.f * (document.documentElement.scrollHeight - innerHeight), behavior: smooth ? "smooth" : "auto" });
      pill.remove();
    });
    x.addEventListener("click", function(){ pill.remove(); });
    pill.appendChild(go); pill.appendChild(x);
    document.body.appendChild(pill);
    setTimeout(function(){ if (pill.parentNode) pill.classList.add("out"); }, 12000);
    setTimeout(function(){ pill.remove(); }, 12600);
  }
})();

/* ═══════════════════════════════════════════════════════════
   Glossary tooltips (2026-09-11)
   On story and guide pages, the first mention of each glossary term gets a
   dotted underline and a definition on hover, focus or tap. The term list is
   generated from glossary.html into assets/glossary-data.js (tools/build-glossary.py)
   and only loads on pages that use it. Skips headings, links, code, figcaptions,
   the glossary itself, and the two documents with their own typographic rules.
   ═══════════════════════════════════════════════════════════ */
(function(){
  var main = document.querySelector("main");
  if (!main || !main.querySelector(".rt")) return;
  var page = location.pathname.split("/").pop();
  if (/^(glossary|ams-100-monograph|orlandu-100|orlandu-50-games)\.html$/.test(page)) return;
  var s = document.createElement("script");
  s.src = "assets/glossary-data.js";
  s.onload = function(){
    if (typeof GLOSSARY === "undefined") return;
    var terms = Object.keys(GLOSSARY).map(function(id){ return { id: id, t: GLOSSARY[id].t, aliases: GLOSSARY[id].a || [] }; });
    // longest first so "candy cab" wins over "cab"
    var pats = [];
    terms.forEach(function(x){
      [x.t].concat(x.aliases).forEach(function(w){
        if (w.length < 3) return;
        pats.push({ id: x.id, w: w });
      });
    });
    pats.sort(function(a, b){ return b.w.length - a.w.length; });
    var esc = function(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
    var re = new RegExp("(^|[^A-Za-z0-9-])(" + pats.map(function(p){ return esc(p.w); }).join("|") + ")(?![A-Za-z0-9-])", "i");
    var byWord = {};
    pats.forEach(function(p){ byWord[p.w.toLowerCase()] = p.id; });
    var done = {};
    var walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
      acceptNode: function(n){
        if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentElement;
        if (!p || p.closest("h1,h2,h3,h4,a,code,pre,figcaption,button,nav,.gt,.kicker,.rt,.badge,.machnav,.sharerow,.worklog,table")) return NodeFilter.FILTER_REJECT;
        if (!p.closest("p,li,dd,blockquote")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function(node){
      var pos = 0, guard = 0;
      while (node && node.nodeValue && guard++ < 40){
        var m = re.exec(node.nodeValue.slice(pos));
        if (!m) break;
        var id = byWord[m[2].toLowerCase()];
        var start = pos + m.index + m[1].length;
        if (done[id]){ pos = start + m[2].length; continue; }
        done[id] = true;
        var mid = node.splitText(start);
        var rest = mid.splitText(m[2].length);
        var span = document.createElement("span");
        span.className = "gt"; span.tabIndex = 0; span.dataset.g = id;
        span.setAttribute("role", "button"); span.setAttribute("aria-label", mid.nodeValue + " \u2014 definition");
        span.textContent = mid.nodeValue;
        mid.parentNode.replaceChild(span, mid);
        node = rest; pos = 0;
      }
    });
    if (!Object.keys(done).length) return;

    var tip = document.createElement("div");
    tip.className = "gtip"; tip.hidden = true; tip.setAttribute("role", "tooltip");
    document.body.appendChild(tip);
    var current = null, hideT;
    function place(el){
      var r = el.getBoundingClientRect();
      var w = Math.min(340, innerWidth - 24);
      tip.style.width = w + "px";
      var left = Math.max(12, Math.min(innerWidth - w - 12, r.left));
      var below = r.bottom + 8 + scrollY;
      tip.style.left = left + "px";
      tip.style.top = below + "px";
      tip.classList.toggle("up", false);
      if (r.bottom + tip.offsetHeight + 16 > innerHeight && r.top > tip.offsetHeight + 16){
        tip.style.top = (r.top + scrollY - tip.offsetHeight - 8) + "px";
        tip.classList.add("up");
      }
    }
    function showTip(el){
      clearTimeout(hideT);
      var g = GLOSSARY[el.dataset.g];
      if (!g) return;
      tip.innerHTML = '<b>' + g.t + '</b><span>' + g.d + '</span><a href="glossary.html#' + el.dataset.g + '">Full glossary →</a>';
      tip.hidden = false;
      current = el;
      place(el);
    }
    function hideTip(){ hideT = setTimeout(function(){ tip.hidden = true; current = null; }, 120); }
    main.addEventListener("mouseover", function(e){ var el = e.target.closest(".gt"); if (el) showTip(el); });
    main.addEventListener("mouseout", function(e){ var el = e.target.closest(".gt"); if (el && !tip.matches(":hover")) hideTip(); });
    tip.addEventListener("mouseenter", function(){ clearTimeout(hideT); });
    tip.addEventListener("mouseleave", hideTip);
    main.addEventListener("focusin", function(e){ var el = e.target.closest(".gt"); if (el) showTip(el); });
    main.addEventListener("focusout", function(e){ if (e.target.closest(".gt")) hideTip(); });
    main.addEventListener("click", function(e){
      var el = e.target.closest(".gt"); if (!el) return;
      e.preventDefault();
      if (current === el && !tip.hidden){ tip.hidden = true; current = null; } else showTip(el);
    });
    main.addEventListener("keydown", function(e){
      var el = e.target.closest(".gt"); if (!el) return;
      if (e.key === "Enter" || e.key === " "){ e.preventDefault(); el.click(); }
      if (e.key === "Escape"){ tip.hidden = true; }
    });
    document.addEventListener("click", function(e){ if (!e.target.closest(".gt, .gtip")) { tip.hidden = true; current = null; } });
    addEventListener("resize", function(){ if (current && !tip.hidden) place(current); });
  };
  document.head.appendChild(s);
})();

/* ═══════════════════════════════════════════════════════════
   Site search (2026-09-11)
   A magnifier in the header opens a search dialog over assets/search-index.js —
   pages, headings, glossary terms, gallery captions, For Sale and Wanted items —
   which is regenerated by tools/build-search-index.py at every deploy. All
   client-side; the index only loads when the dialog first opens. "/" focuses it.
   ═══════════════════════════════════════════════════════════ */
(function(){
  var header = document.querySelector("header.site .navwrap");
  if (!header) return;
  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "sbtn"; btn.setAttribute("aria-label", "Search the site");
  btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg><span>Search</span><kbd>/</kbd>';
  var burger = header.querySelector(".burger");
  header.insertBefore(btn, burger);

  var dlg = document.createElement("div");
  dlg.id = "search"; dlg.hidden = true;
  dlg.setAttribute("role", "dialog"); dlg.setAttribute("aria-modal", "true"); dlg.setAttribute("aria-label", "Search the site");
  dlg.innerHTML =
    '<div class="sbox">' +
      '<form role="search" class="sform"><input type="search" id="q" autocomplete="off" spellcheck="false" placeholder="Search machines, monitors, terms, photos…" aria-label="Search"><button type="button" class="sclose" aria-label="Close">✕</button></form>' +
      '<div class="shint">Try <b>PC-10</b>, <b>BKM</b>, <b>scanlines</b>, <b>Rottendog</b> — or a machine name.</div>' +
      '<ol class="sres" aria-live="polite"></ol>' +
    '</div>';
  document.body.appendChild(dlg);
  var input = dlg.querySelector("#q"), res = dlg.querySelector(".sres"), hint = dlg.querySelector(".shint");
  var INDEX = null, loading = false, opener = null;

  function loadIndex(cb){
    if (INDEX) return cb();
    if (loading) return;
    loading = true;
    var s = document.createElement("script");
    s.src = "assets/search-index.js";
    s.onload = function(){ INDEX = (typeof SEARCH_INDEX !== "undefined") ? SEARCH_INDEX : []; loading = false; cb(); };
    s.onerror = function(){ loading = false; hint.textContent = "Search is unavailable right now."; };
    document.head.appendChild(s);
  }
  function open(){
    opener = document.activeElement;
    dlg.hidden = false; document.body.style.overflow = "hidden";
    input.focus(); input.select();
    loadIndex(function(){ if (input.value) run(); });
  }
  function close(){
    dlg.hidden = true; document.body.style.overflow = "";
    if (opener && opener.focus) opener.focus();
  }
  function norm(s){ return (s || "").toLowerCase().replace(/[’']/g, "'"); }
  function esc(s){ return s.replace(/[&<>]/g, function(c){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function hl(text, words){
    var out = esc(text);
    words.forEach(function(w){
      if (w.length < 2) return;
      out = out.replace(new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"), "<mark>$1</mark>");
    });
    return out;
  }
  function run(){
    var q = norm(input.value).trim();
    res.innerHTML = "";
    if (q.length < 2){ hint.hidden = false; return; }
    hint.hidden = true;
    var words = q.split(/\s+/).filter(Boolean);
    var scored = [];
    INDEX.forEach(function(e){
      var t = norm(e.t), h = norm(e.h), b = norm(e.b), k = norm(e.k);
      var score = 0, all = true;
      words.forEach(function(w){
        var hit = 0;
        if (t.indexOf(w) >= 0) hit += t === w ? 40 : (t.indexOf(w) === 0 ? 24 : 16);
        if (h.indexOf(w) >= 0) hit += 8;
        if (k.indexOf(w) >= 0) hit += 6;
        if (b.indexOf(w) >= 0) hit += 3;
        if (!hit) all = false;
        score += hit;
      });
      if (all) scored.push({ e: e, s: score + (e.w || 0) });
    });
    scored.sort(function(a, b){ return b.s - a.s; });
    scored.slice(0, 12).forEach(function(x){
      var e = x.e, li = document.createElement("li");
      var snippet = e.s || "";
      var bi = norm(e.b).indexOf(words[0]);
      if (bi >= 0 && e.b){ var st = Math.max(0, bi - 60); snippet = (st ? "…" : "") + e.b.slice(st, st + 150) + "…"; }
      li.innerHTML = '<a href="' + e.u + '"><span class="sk">' + esc(e.k || "") + '</span><b>' + hl(e.t, words) + '</b><span class="ss">' + hl(snippet, words) + '</span></a>';
      res.appendChild(li);
    });
    if (!scored.length){
      var li = document.createElement("li"); li.className = "none"; li.textContent = "Nothing matched. Try a shorter word, or a model number.";
      res.appendChild(li);
    }
  }
  var rt;
  input.addEventListener("input", function(){ clearTimeout(rt); rt = setTimeout(function(){ loadIndex(run); if (INDEX) run(); }, 90); });
  dlg.querySelector(".sform").addEventListener("submit", function(e){ e.preventDefault(); var a = res.querySelector("a"); if (a) a.click(); });
  dlg.querySelector(".sclose").addEventListener("click", close);
  dlg.addEventListener("click", function(e){ if (e.target === dlg) close(); });
  btn.addEventListener("click", open);
  document.addEventListener("keydown", function(e){
    if (!dlg.hidden){
      if (e.key === "Escape"){ close(); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp"){
        var links = Array.prototype.slice.call(res.querySelectorAll("a"));
        if (!links.length) return;
        var i = links.indexOf(document.activeElement);
        var nxt = e.key === "ArrowDown" ? (i + 1) % links.length : (i <= 0 ? links.length - 1 : i - 1);
        links[nxt].focus(); e.preventDefault();
      }
      return;
    }
    if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey){
      var a = document.activeElement, tag = a && a.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (a && a.isContentEditable)) return;
      e.preventDefault(); open();
    }
  });
  // A page can ask for the dialog on load (404 uses this) or open it from any link to #search.
  if (location.hash === "#search" || document.body.dataset.search === "open") setTimeout(open, 50);
  document.addEventListener("click", function(e){ var a = e.target.closest('a[href="#search"]'); if (a){ e.preventDefault(); open(); } });
})();

/* ═══════════════════════════════════════════════════════════
   Contact form (2026-09-11)
   Any <form class="cform"> posts JSON to /api/contact (a Vercel function relaying
   through Resend). A photo can ride along (≤3 MB; bigger phone photos are downscaled
   in the browser first). If the function is not configured yet it answers 503, the
   form says so and points at the mailto link; the mailto is always there as a fallback.
   ?subject= in the URL, or a click on any <a data-item>, prefills the subject — that
   is how the Wanted page's "I have one →" links work.
   ═══════════════════════════════════════════════════════════ */
(function(){
  var forms = document.querySelectorAll("form.cform");
  if (!forms.length) return;
  function setSubject(f, s){ var i = f.querySelector('[name="subject"]'); if (i && s){ i.value = s; } }
  var q = new URLSearchParams(location.search).get("subject");
  forms.forEach(function(f){ if (q) setSubject(f, q); });
  document.addEventListener("click", function(e){
    var a = e.target.closest("a[data-item]"); if (!a) return;
    var f = document.querySelector("form.cform"); if (!f) return;
    e.preventDefault();
    setSubject(f, a.dataset.item);
    f.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    setTimeout(function(){ var m = f.querySelector('[name="message"]'); if (m) m.focus(); }, 500);
  });
  function shrink(file){ // re-encode every decodable photo at ≤1600px so the request stays small
    return new Promise(function(res){
      if (!/^image\/(jpeg|png|webp|gif|bmp)$/.test(file.type)) return res(null);
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function(){
        var s = Math.min(1, 1600 / Math.max(img.width, img.height));
        var c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        try { res({ name: file.name.replace(/\.\w+$/, "") + ".jpg", type: "image/jpeg", data: c.toDataURL("image/jpeg", 0.82) }); }
        catch (e) { res(null); }
      };
      img.onerror = function(){ URL.revokeObjectURL(url); res(null); };
      img.src = url;
    });
  }
  function readFile(file){
    return new Promise(function(res, rej){ var r = new FileReader(); r.onload = function(){ res({ name: file.name, type: file.type, data: r.result }); }; r.onerror = rej; r.readAsDataURL(file); });
  }
  forms.forEach(function(f){
    var status = f.querySelector(".cstatus"), btn = f.querySelector('button[type="submit"]');
    function say(msg, kind){
      status.textContent = msg; status.className = "cstatus " + (kind || ""); status.hidden = false;
      var r = status.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) status.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
    var fi = f.querySelector('input[type="file"]');
    if (fi) fi.addEventListener("change", function(){
      var file = fi.files[0];
      if (!file){ status.hidden = true; return; }
      var mb = (file.size / 1048576).toFixed(1);
      if (!/^image\/(jpeg|png|webp|gif|bmp)$/.test(file.type) && file.size > 2.5 * 1024 * 1024)
        say("That " + (file.type.replace("image/", "").toUpperCase() || "file") + " is " + mb + " MB and can't be shrunk here — email it instead, or pick a JPEG.", "warn");
      else say("Attached: " + file.name + " (" + mb + " MB" + (file.size > 1.5 * 1048576 ? ", will be shrunk before sending" : "") + ")", "");
    });
    f.addEventListener("submit", function(e){
      e.preventDefault();
      var fd = new FormData(f);
      var msg = (fd.get("message") || "").trim();
      if (msg.length < 5){ say("Write a line or two first.", "warn"); f.querySelector('[name="message"]').focus(); return; }
      var fileInput = f.querySelector('input[type="file"]');
      var file = fileInput && fileInput.files[0];
      if (file && file.size > 40 * 1024 * 1024){ say("That photo is over 40 MB — pick a smaller one or send it by email.", "warn"); return; }
      btn.disabled = true; say("Sending…", "");
      var body = { name: fd.get("name"), email: fd.get("email"), subject: fd.get("subject"), message: msg, site: fd.get("site") || "" };
      var prep = file ? shrink(file).then(function(r){ return r || readFile(file); }) : Promise.resolve(null);
      prep.then(function(photo){
        if (photo){
          if (photo.data.length * 0.75 > 2.5 * 1024 * 1024) throw new Error("photo-too-big");
          body.photo = photo;
        }
        return fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }).then(function(r){
        if (r.ok){ f.reset(); say("Sent. Thanks — replies come from orlandusarcade@gmail.com.", "ok"); btn.disabled = false; return; }
        return r.json().catch(function(){ return {}; }).then(function(j){ throw new Error(j.error || ("http-" + r.status)); });
      }).catch(function(err){
        btn.disabled = false;
        var k = err && err.message;
        console.error("contact form:", err);
        if (k === "not-configured") say("The form isn't switched on yet — use the email link below instead.", "warn");
        else if (k === "photo-too-big" || k === "http-413") say("That photo is too large for the form — send it by email instead.", "warn");
        else if (k === "bad-email") say("That email address doesn't look right.", "warn");
        else say("Couldn't send just now — the email link below always works.", "warn");
      });
    });
  });
})();
