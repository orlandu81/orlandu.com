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
    ["signage.html",  "Signage"],
    ["guide-shelf.html", "Guides"],
    ["consoles.html", "Consoles"],
    ["monitors.html", "Monitor Fleet"],
    ["gallery.html",  "Gallery"],
    ["stories.html",  "Stories"],
    ["projects.html", "Projects"],
    ["forsale.html",  "For Sale"],
    ["wanted.html",   "Wanted"],
    ["about.html",    "About"]
  ];

  const header = document.querySelector("header.site");
  if (header){
    const here = header.dataset.page || "";
    header.innerHTML =
      '<div class="navwrap">' +
        '<a class="navlogo" href="index.html"><img src="assets/logo-wordmark.png" alt="Orlandu’s Arcade"></a>' +
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
        '<img src="assets/mascot.png" alt="Orlandu’s Arcade mascot">' +
        '<div class="links">' +
          '<a href="about.html">About</a>' +
          '<a href="about.html#contact">Contact</a>' +
          '<a href="stories.html">Stories</a>' +
          '<a href="mailto:orlandusarcade@gmail.com">Email</a>' +
          '<a href="https://www.instagram.com/orlandusarcade/" target="_blank" rel="noopener">Instagram</a>' +
          '<a href="https://www.ebay.com/usr/orlandu81" target="_blank" rel="noopener">eBay</a>' +
        '</div>' +
        '<div class="fine">© 2026 Orlandu’s Arcade™ · Orange County, CA<br>Photography © Orlandu’s Arcade. Game logos and characters are the property of their respective owners.</div>' +
      '</div>';
  }

  // ── Lightbox ─────────────────────────────────────────────
  // Any <img data-full="..."> opens in the lightbox on click.
  const lb = document.createElement("div");
  lb.id = "lightbox";
  lb.hidden = true;
  lb.innerHTML =
    '<button class="lb-close" aria-label="Close">✕</button>' +
    '<button class="lb-prev" aria-label="Previous">‹</button>' +
    '<figure><img alt=""><figcaption></figcaption></figure>' +
    '<button class="lb-next" aria-label="Next">›</button>';
  document.body.appendChild(lb);

  const lbImg = lb.querySelector("img");
  const lbCap = lb.querySelector("figcaption");
  let items = [], idx = 0;

  function visibleItems(){
    return Array.from(document.querySelectorAll("img[data-full]"))
      .filter(el => el.offsetParent !== null);
  }
  function captionFor(el){
    const fig = el.closest("figure");
    const cap = fig && fig.querySelector("figcaption");
    return cap ? cap.innerHTML : (el.alt || "");
  }
  function show(i){
    idx = (i + items.length) % items.length;
    const el = items[idx];
    lbImg.src = el.dataset.full;
    lbImg.alt = el.alt || "";
    lbCap.innerHTML = captionFor(el);
    lb.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function close(){
    lb.hidden = true;
    lbImg.src = "";
    document.body.style.overflow = "";
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
