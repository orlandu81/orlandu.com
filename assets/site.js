// ═══════════════════════════════════════════════════════════
// SITE.JS — Orlandu's Arcade shared chrome + lightbox
// Header/footer are injected here so nav changes are one edit.
// Pages carry: <header class="site" data-page="games"></header>
// and <footer class="site"></footer> plus this script (defer).
// ═══════════════════════════════════════════════════════════
(function(){
  const NAV = [
    ["index.html",    "Home"],
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
        '<a class="navlogo" href="index.html"><img src="assets/logo-wordmark-nav.webp" alt="Orlandu’s Arcade" width="335" height="132" fetchpriority="high" decoding="async"></a>' +
        '<button class="burger" aria-label="Menu" aria-expanded="false">☰ MENU</button>' +
        '<nav class="main">' +
          NAV.map(([href, label]) =>
            '<a href="' + href + '"' + (href === here + ".html" || href === here ? ' class="here"' : '') + '>' + label + '</a>'
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
            '<a href="glossary.html">Glossary</a><a href="about.html#faq">FAQ</a></div>' +
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
    '<figure><img alt=""><figcaption></figcaption></figure>' +
    '<button class="lb-next" aria-label="Next">›</button>';
  document.body.appendChild(lb);

  const lbImg = lb.querySelector("img");
  const lbCap = lb.querySelector("figcaption");
  let items = [], idx = 0, opener = null;

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
  lb.querySelector(".lb-prev").addEventListener("click", e => { e.stopPropagation(); show(idx - 1); });
  lb.querySelector(".lb-next").addEventListener("click", e => { e.stopPropagation(); show(idx + 1); });
  lb.addEventListener("click", e => { if (e.target === lb) close(); });
  document.addEventListener("keydown", e => {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(idx - 1);
    if (e.key === "ArrowRight") show(idx + 1);
    if (e.key === "Tab"){
      // keep focus inside the dialog: cycle the three buttons
      const btns = Array.from(lb.querySelectorAll("button"));
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
    if (tx === null) return;
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
