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

Y0, Y1 = 1979, 2021
PX = 64  # px per year
W = (Y1 - Y0 + 1) * PX

def lane_html(title, key, items, color):
    # stack same-year items downward within the lane
    rows = {}
    out = []
    for name, year, thumb, href in sorted(items, key=lambda x: (x[1], x[0])):
        k = rows.get(year, 0); rows[year] = k + 1
        left = (year - Y0) * PX + PX // 2
        out.append(
            f'<a class="ti" href="{href}" style="left:{left}px;--row:{k}" data-year="{year}">'
            f'<img src="{thumb}" alt="" loading="lazy" decoding="async" width="56" height="56">'
            f'<span class="tl"><b>{html.escape(name)}</b> {year}</span></a>')
    depth = max(rows.values()) if rows else 1
    return (f'<div class="lane {key}" style="--acc:{color};--depth:{depth}"><div class="lanehead">{title}</div>'
            + "".join(out) + "</div>")

years = "".join(f'<span style="left:{(y - Y0) * PX}px">{y}</span>' for y in range(Y0, Y1 + 1) if y % 5 == 0)
grid = "".join(f'<i style="left:{(y - Y0) * PX}px"></i>' for y in range(Y0, Y1 + 1))
lanes = "".join(lane_html(*l) for l in LANES)

# plain list for screen readers / no-CSS
lists = ""
for title, key, items, color in LANES:
    lists += f"<h3>{title}</h3><ul>" + "".join(f'<li><a href="{h}">{html.escape(n)}</a> — {y}</li>' for n, y, t, h in sorted(items, key=lambda x: (x[1], x[0]))) + "</ul>"

desc = "Every machine, console and monitor in the collection plotted by the year it was released — four decades from the 1981 Donkey Kong to the 2020 Rick and Morty, with the console generations and the Sony monitor eras alongside."
page = f'''<!DOCTYPE html>
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
  .tlwrap{{position:relative;overflow-x:auto;overflow-y:hidden;border:1px solid var(--line);border-radius:14px;background:linear-gradient(180deg,var(--panel),var(--bg2));-webkit-overflow-scrolling:touch;scrollbar-color:var(--line) transparent}}
  .tlinner{{position:relative;width:{W}px;padding:2.2rem 0 .6rem}}
  .years{{position:relative;height:1.4rem}}
  .years span{{position:absolute;top:0;transform:translateX(-50%);font-family:var(--disp);font-size:.72rem;letter-spacing:.08em;color:var(--dim)}}
  .gridl{{position:absolute;inset:2.2rem 0 0 0;pointer-events:none}}
  .gridl i{{position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,.035)}}
  .gridl i:nth-child(5n+1){{background:rgba(255,255,255,.09)}}
  .lane{{position:relative;height:calc(2.2rem + var(--depth) * 78px + 10px);border-top:1px solid var(--line)}}
  .lanehead{{position:sticky;left:0;display:inline-block;padding:.45rem .9rem;font-family:var(--cond);font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;color:var(--acc);background:linear-gradient(90deg,var(--panel) 70%,transparent);z-index:3;pointer-events:none}}
  .ti{{position:absolute;top:calc(2.2rem + var(--row) * 78px);transform:translateX(-50%);width:56px;text-decoration:none;color:var(--ink);z-index:2}}
  .ti img{{width:56px;height:56px;object-fit:cover;border-radius:50%;border:2px solid var(--acc);box-shadow:0 0 0 3px var(--bg),0 6px 18px rgba(0,0,0,.6);transition:transform .18s ease;display:block}}
  .ti::before{{content:"";position:absolute;left:50%;top:-2.2rem;height:2.2rem;width:1px;background:var(--acc);opacity:.35}}
  .ti .tl{{position:absolute;left:50%;top:60px;transform:translateX(-50%);white-space:nowrap;font-size:.86rem;line-height:1.15;text-align:center;opacity:0;transition:opacity .15s;background:var(--panel2);border:1px solid var(--line);border-radius:6px;padding:.25rem .5rem;pointer-events:none;color:var(--dim)}}
  .ti .tl b{{color:var(--ink);display:block;font-weight:600}}
  .ti:hover img,.ti:focus-visible img{{transform:scale(1.15)}}
  .ti:hover .tl,.ti:focus-visible .tl{{opacity:1;z-index:5}}
  .ti:hover{{z-index:6}}
  .tlhint{{font-family:var(--cond);font-size:.85rem;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);margin:.6rem 0 0}}
  .tllist{{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem 2rem;margin-top:1rem}}
  .tllist h3{{font-family:var(--cond);font-size:.85rem;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);margin-bottom:.4rem}}
  .tllist ul{{list-style:none;margin:0;padding:0}}
  .tllist li{{padding:.2rem 0;border-top:1px solid var(--line);font-size:1rem;color:var(--dim)}}
  @media(prefers-reduced-motion:reduce){{.ti img,.ti .tl{{transition:none}}}}
  @media(hover:none){{.ti .tl{{opacity:1;font-size:.72rem;top:58px}}.lane{{height:calc(2.2rem + var(--depth) * 96px + 10px)}}.ti{{top:calc(2.2rem + var(--row) * 96px)}}}}
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
    <p class="lede">Everything in the collection, placed at the year it was released &mdash; the cabinets and pins in one row, the consoles in another, the Sony monitors in a third. Scroll sideways; tap or hover anything to see what it is, and click through to its page.</p>
  </div>

  <section>
    <div class="tlwrap" tabindex="0" aria-label="Timeline, scrolls sideways">
      <div class="tlinner">
        <div class="gridl" aria-hidden="true">{grid}</div>
        <div class="years" aria-hidden="true">{years}</div>
        {lanes}
      </div>
    </div>
    <p class="tlhint">&larr; drag or scroll sideways &rarr; &middot; years are release years, not the year each one arrived here</p>
  </section>

  <section>
    <h2 class="sec">The same thing as a list</h2>
    <div class="tllist">{lists}</div>
  </section>
</main>

<footer class="site"></footer>

</body>
</html>
'''
(root / "timeline.html").write_text(page, encoding="utf-8")
print("timeline.html written,", W, "px wide")
