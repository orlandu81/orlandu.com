#!/usr/bin/env python3
"""Generate timeline.html — the collection plotted by RELEASE year, three lanes.
Years are the ones already printed on the cards (games.html "Maker · YYYY", consoles.html
sub line, the monitor spec table's production-era start). Never acquisition dates.
Run from the repo root after a card's year or thumbnail changes:  python3 tools/build-timeline.py
"""
import re, html, pathlib
root = pathlib.Path(__file__).resolve().parent.parent

# (name, year, thumb, href)
COINOP = [
    ("Donkey Kong", 1981, "media/thumbs/dk-portrait.webp?v=2", "donkey-kong.html"),
    ("Mario Bros.", 1983, "media/thumbs/mariobros-portrait.webp?v=2", "mario-bros.html"),
    ("VS. UniSystem", 1984, "media/thumbs/unisystem-portrait.webp?v=2", "vs-unisystem.html"),
    ("VS. Red Tent", 1984, "media/thumbs/redtent-excitebike.webp", "red-tent.html"),
    ("Mini Cute", 1991, "media/thumbs/minicute-portrait.webp?v=2", "mini-cute.html"),
    ("Big Blue", 1992, "media/thumbs/big-blue-portrait.webp?v=2", "big-blue.html"),
    ("Indiana Jones", 1993, "media/thumbs/ij-portrait.webp?v=2", "indiana-jones.html"),
    ("Ghostbusters", 2016, "media/thumbs/ghostbusters-portrait.webp", "ghostbusters.html"),
    ("Total Nuclear Annihilation", 2017, "media/thumbs/tna-portrait.webp?v=2", "tna.html"),
    ("Rick and Morty", 2020, "media/thumbs/rickmorty-portrait.webp?v=2", "rick-and-morty.html"),
]
CONSOLES = [
    ("Game Boy", 1989, "media/thumbs/consoles-gameboy-dmg.webp", "consoles.html"),
    ("Turbo Express", 1989, "media/thumbs/consoles-turbo-express.webp", "consoles.html"),
    ("Super Nintendo", 1990, "media/thumbs/consoles-snes.webp?v=2", "consoles.html"),
    ("PC Engine Duo-R", 1991, "media/thumbs/consoles-duo-r.webp?v=2", "consoles.html"),
    ("NES Top Loader", 1993, "media/thumbs/consoles-nes-toploader.webp?v=2", "consoles.html"),
    ("Genesis CDX", 1994, "media/thumbs/consoles-genesis-cdx.webp", "consoles.html"),
    ("Nomad", 1995, "media/thumbs/consoles-nomad.webp", "consoles.html"),
    ("Saturn", 1995, "media/thumbs/consoles-saturn.webp?v=2", "consoles.html"),
    ("Nintendo 64", 1996, "media/thumbs/consoles-n64.webp?v=2", "consoles.html"),
    ("Dreamcast", 1999, "media/thumbs/consoles-dreamcast.webp?v=2", "consoles.html"),
    ("GameCube", 2001, "media/thumbs/consoles-gamecube.webp?v=2", "consoles.html"),
    ("Game Boy Advance SP", 2003, "media/thumbs/consoles-gba-sp.webp", "consoles.html"),
    ("PlayStation 2", 2004, "media/thumbs/consoles-ps2.webp?v=2", "consoles.html"),
    ("New 3DS XL", 2014, "media/thumbs/consoles-3ds-black.webp", "consoles.html"),
    ("New 3DS XL — SNES Edition", 2016, "media/thumbs/consoles-3ds-snes.webp", "consoles.html"),
]
MONITORS = [
    ("PVM-2950Q", 1991, "media/thumbs/pvm-2950q.webp?v=7", "pvm-2950q.html"),
    ("BVM-20E1U", 1995, "media/thumbs/bvm-20e1u-lit.webp", "bvm-20e1u.html"),
    ("PVM-20L5", 2002, "media/thumbs/pvm-20l5.webp?v=3", "pvm-20l5.html"),
    ("BVM-A14F5U", 2003, "media/thumbs/bvm-a14f5u-lit.webp?v=2", "bvm-a14f5u.html"),
    ("LMD wall", 2005, "media/thumbs/lmd-rack.webp?v=3", "lmd-wall.html"),
]
LANES = [("Coin-op", "coinop", COINOP, "#ff8a00"), ("Consoles", "consoles", CONSOLES, "#5ee9ff"), ("Monitors", "monitors", MONITORS, "#9effa0")]


from collections import defaultdict
LANE_OF = {}
for title, key, items, color in LANES:
    for it in items: LANE_OF[it] = (title, key, color)
byyear = defaultdict(list)
for it in LANE_OF: byyear[it[1]].append(it)
years = sorted(byyear)

def card(it):
    name, year, thumb, href = it
    title, key, color = LANE_OF[it]
    return (f'<a class="tc {key}" href="{href}" style="--acc:{color}">'
            f'<img src="{thumb}" alt="" loading="lazy" decoding="async" width="84" height="84">'
            f'<span class="tn">{html.escape(name)}</span><span class="tk">{title}</span></a>')

spine = ""
prev = None
for y in years:
    if prev is not None and y - prev >= 3:
        n = y - prev - 1
        spine += f'<div class="gap" aria-hidden="true"><span>{n} quiet years</span></div>'
    items = sorted(byyear[y], key=lambda x: (["coinop", "consoles", "monitors"].index(LANE_OF[x][1]), x[0]))
    spine += (f'<section class="yr" id="y{y}"><div class="ymark"><b>{y}</b></div>'
              f'<div class="ycards">{"".join(card(i) for i in items)}</div></section>')
    prev = y

counts = {key: len(items) for title, key, items, color in LANES}
desc = "Every machine, console and monitor in the collection, in the order the world first saw them — four decades from the 1981 Donkey Kong to the 2020 Rick and Morty, with the console generations and the Sony monitor eras in between."
page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Forty Years on One Line &mdash; Orlandu&rsquo;s Arcade</title>
<meta name="description" content="{desc}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="assets/favicon-192.png">
<link rel="preload" href="assets/fonts/orbitron-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/rajdhani-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<meta name="theme-color" content="#0a0a12">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Orlandu's Arcade">
<meta property="og:title" content="Forty Years on One Line &mdash; Orlandu&rsquo;s Arcade">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="https://www.orlandu.com/timeline.html">
<meta property="og:image" content="https://www.orlandu.com/media/og/og-games.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Forty Years on One Line &mdash; Orlandu&rsquo;s Arcade">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="https://www.orlandu.com/media/og/og-games.jpg">
<link rel="canonical" href="https://www.orlandu.com/timeline.html">
<link rel="stylesheet" href="assets/style.css">
<link rel="preload" as="image" href="assets/logo-wordmark-nav.webp">
<style>main.hub{{--acc:#ffd400}}</style>
<script src="assets/site.js" defer></script>
<style>
  .spine{{position:relative;margin:.4rem 0 0;padding-left:5.6rem}}
  .spine::before{{content:"";position:absolute;left:2.2rem;top:0;bottom:0;width:2px;background:linear-gradient(180deg,var(--fire2),var(--cyan-dim) 60%,var(--line));opacity:.55}}
  .yr{{position:relative;padding:.3rem 0 1rem}}
  .ymark{{position:absolute;left:-5.6rem;top:.55rem;width:4.4rem;text-align:center}}
  .ymark b{{display:inline-block;font-family:var(--disp);font-weight:800;font-size:.95rem;letter-spacing:.04em;color:var(--fire3);background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:.35rem .55rem;min-width:4.2rem;box-shadow:0 0 0 4px var(--bg)}}
  .ycards{{display:flex;flex-wrap:wrap;gap:.7rem}}
  .tc{{display:grid;grid-template-columns:84px 1fr;grid-template-rows:auto auto;column-gap:.85rem;align-items:center;align-content:center;width:min(100%,300px);background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--acc);border-radius:10px;padding:.55rem .8rem .55rem .55rem;color:var(--ink);text-decoration:none;transition:transform .18s ease,border-color .18s ease}}
  .tc img{{grid-row:1/3;width:84px;height:84px;object-fit:cover;border-radius:8px}}
  .tc .tn{{font-weight:600;font-size:1.05rem;line-height:1.2;text-wrap:balance}}
  .tc .tk{{font-family:var(--cond);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--acc);margin-top:.25rem}}
  .tc:hover,.tc:focus-visible{{transform:translateY(-2px);border-color:var(--acc);text-decoration:none}}
  .gap{{position:relative;margin:-.4rem 0 1.4rem;font-family:var(--cond);font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}}
  .gap span{{display:inline-block;background:var(--bg);padding:.1rem .4rem;margin-left:-.4rem}}
  .gap::before{{content:"";position:absolute;left:-3.4rem;top:.55rem;width:2px;height:1.2rem;border-left:2px dashed var(--line)}}
  .filters .cnt{{opacity:.55;margin-left:.3rem;font-size:.85em}}
  .spine[data-show="coinop"] .tc:not(.coinop),.spine[data-show="consoles"] .tc:not(.consoles),.spine[data-show="monitors"] .tc:not(.monitors){{display:none}}
  .spine[data-show] .yr:not(:has(.tc:not([style*="display: none"]))){{}}
  .yr.empty,.gap.hidden{{display:none}}
  @media(max-width:560px){{.spine{{padding-left:4.4rem}}.spine::before{{left:1.5rem}}.ymark{{left:-4.4rem;width:3.4rem}}.ymark b{{min-width:0;font-size:.8rem;padding:.3rem .4rem}}.gap::before{{left:-2.7rem}}.tc{{width:100%}}}}
  @media(prefers-reduced-motion:reduce){{.tc{{transition:none}}}}
</style>
<script type="application/ld+json">
{{
 "@context": "https://schema.org",
 "@type": "WebPage",
 "@id": "https://www.orlandu.com/timeline.html#webpage",
 "url": "https://www.orlandu.com/timeline.html",
 "name": "Forty Years on One Line — Orlandu's Arcade",
 "description": "{desc}",
 "isPartOf": {{ "@id": "https://www.orlandu.com/#website" }},
 "inLanguage": "en-US"
}}
</script>
</head>
<body>

<header class="site" data-page="timeline"></header>

<main class="hub">
  <div class="pagehead">
    <div class="kicker">The Long View</div>
    <h1 class="page">Forty Years on One Line</h1>
    <p class="lede">Everything in the collection in the order the world first saw it &mdash; the cabinets and pins, the consoles, and the Sony monitors on one line, oldest at the top. Years are release years, not the year each one arrived here. Click anything to open its page.</p>
  </div>

  <section>
    <div class="filters" id="tlf">
      <button data-show="all" class="on">All</button>
      <button data-show="coinop">Coin-op<span class="cnt">{counts["coinop"]}</span></button>
      <button data-show="consoles">Consoles<span class="cnt">{counts["consoles"]}</span></button>
      <button data-show="monitors">Monitors<span class="cnt">{counts["monitors"]}</span></button>
    </div>
    <div class="spine" id="spine">
      {spine}
    </div>
  </section>
</main>

<footer class="site"></footer>
<script>
(function(){{
  var f = document.getElementById('tlf'), sp = document.getElementById('spine');
  f.addEventListener('click', function(e){{
    var b = e.target.closest('button'); if (!b) return;
    var k = b.dataset.show;
    f.querySelectorAll('button').forEach(function(x){{ x.classList.toggle('on', x === b); }});
    if (k === 'all') sp.removeAttribute('data-show'); else sp.setAttribute('data-show', k);
    // hide years with nothing left in them, and gaps that now sit between two hidden years
    var yrs = Array.prototype.slice.call(sp.querySelectorAll('.yr'));
    yrs.forEach(function(y){{ y.classList.toggle('empty', k !== 'all' && !y.querySelector('.tc.' + k)); }});
    Array.prototype.forEach.call(sp.querySelectorAll('.gap'), function(g){{
      var n = g.nextElementSibling, p = g.previousElementSibling;
      g.classList.toggle('hidden', (n && n.classList.contains('empty')) || (p && p.classList.contains('empty')));
    }});
  }});
}})();
</script>

</body>
</html>
"""
(root / "timeline.html").write_text(page, encoding="utf-8")
print("timeline.html written:", len(years), "years")
