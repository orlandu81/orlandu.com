#!/usr/bin/env python3
"""Build the Coin-Op "select your machine" screen on games.html.

The screen is ten static panels (one visible) plus a roster of small uncropped tiles; a short inline
script swaps the panel. Everything is in the HTML, so the page reads the same without JavaScript:
the first machine shows and every tile is a plain link to its profile.

  - The roster below (order, group, card copy, portrait) lives HERE.
  - The four spec tiles and the accent color are READ from each machine's profile page
    (`.specs` and `main.profile{--acc}`), so a spec is corrected in one place: the profile.
  - Tiles are media/select/<portrait>.webp, 240 px wide, the whole portrait (never cropped).

Run from the repo root after a profile's spec tiles, a card's copy, a portrait or the roster changes:
    python3 tools/build-machine-select.py
It rewrites games.html between <!-- select:start --> and <!-- select:end -->.
"""
import io, re, sys, pathlib
from PIL import Image
root = pathlib.Path(__file__).resolve().parent.parent

GROUPS = [("uprights", "Uprights"), ("pinball", "Pinball"), ("gameroom", "Candy &amp; cocktail")]
# (profile, group, tile label, name, maker · year, card copy, thumb, full, alt, width, height, view-transition name)
MACHINES = [('donkey-kong.html', 'uprights', 'Donkey Kong', 'Donkey Kong', 'Nintendo · 1981', "Blue plywood — the machine that started Nintendo's arcade legend, and most collections worth the name.", 'media/thumbs/dk-portrait.webp?v=2', 'media/2026/dk-portrait.webp?v=2', 'Nintendo Donkey Kong upright in blue plywood, marquee lit', 800, 1067, 'm-donkey-kong'),
 ('mario-bros.html', 'uprights', 'Mario Bros.', 'Mario Bros. — Widebody', 'Nintendo · 1983', 'Two players, one sewer. The widebody Mario Bros. joins the Nintendo upright lineup.', 'media/thumbs/mariobros-portrait.webp?v=2', 'media/2026/mariobros-portrait.webp?v=2', 'Nintendo Mario Bros. widebody arcade cabinet, marquee lit', 800, 1067, 'm-mario-bros'),
 ('vs-unisystem.html', 'uprights', 'VS. UniSystem', 'VS. UniSystem — Dedicated', 'Nintendo · 1984', 'Nintendo\'s arcade answer to the NES era. A VS. Interchanger runs both VS. Super Mario Bros. and VS. Duck Hunt — and the Mario is not the game you think it is. <a href="vs-smb.html">Did you know? →</a>', 'media/thumbs/unisystem-portrait.webp?v=2', 'media/2026/unisystem-portrait.webp?v=2', 'Nintendo VS. UniSystem dedicated arcade cabinet with the VS. Super Mario Bros. marquee lit', 800, 1067, 'm-vs-unisystem'),
 ('big-blue.html', 'uprights', 'Big Blue', 'Big Blue', 'Dynamo Gen 1 · 1992', "The classic American showcase cabinet — rebuilt power supply, and now wearing fresh Capcom-logo side art. It runs a Darksoft CPS-2 multi in a Jasen's Customs case, so the whole CPS-2 library is on tap — Marvel vs. Capcom most of the time.", 'media/thumbs/big-blue-portrait.webp?v=2', 'media/2026/big-blue-portrait.webp?v=2', 'Dynamo Big Blue arcade cabinet in blue with Capcom side art and a Marvel vs. Capcom marquee', 800, 1067, 'm-big-blue'),
 ('indiana-jones.html', 'pinball', 'Indiana Jones', 'Indiana Jones: The Pinball Adventure', 'Williams · 1993', 'The widebody DCS-era classic — three films on one playfield, and Williams’ first year of digital sound.', 'media/thumbs/ij-portrait.webp?v=2', 'media/2026/ij-portrait.webp?v=2', 'Williams Indiana Jones widebody pinball machine, backbox lit', 800, 1067, 'm-indiana-jones'),
 ('ghostbusters.html', 'pinball', 'Ghostbusters', 'Ghostbusters Premium', 'Stern · 2016', "Who you gonna call when the magna-slings throw the ball somewhere unfair? Nobody. That's the game.", 'media/thumbs/ghostbusters-portrait.webp', 'media/2026/ghostbusters-portrait.webp', 'Stern Ghostbusters Premium pinball machine, backbox and topper lit', 800, 1067, 'm-ghostbusters'),
 ('tna.html', 'pinball', 'TNA', 'Total Nuclear Annihilation', 'Spooky Pinball · 2017', "Scott Danesi's synthwave fever dream. Fast, brutal, single-level, perfect.", 'media/thumbs/tna-portrait.webp?v=2', 'media/2026/tna-portrait.webp?v=2', 'Total Nuclear Annihilation pinball machine by Spooky Pinball with its full topper set', 800, 1067, 'm-tna'),
 ('rick-and-morty.html', 'pinball', 'Rick &amp; Morty', 'Rick and Morty — Blood Sucker Edition', 'Spooky · 2020', 'The limited Blood Sucker Edition — bought new in box, home use only, running in its original butter cabinet.', 'media/thumbs/rickmorty-portrait.webp?v=2', 'media/2026/rickmorty-portrait.webp?v=2', 'Spooky Pinball Rick and Morty Blood Sucker Edition pinball machine, backbox lit', 800, 1066, 'm-rick-and-morty'),
 ('red-tent.html', 'gameroom', 'Red Tent', 'VS. DualSystem — Red Tent Cocktail', 'Nintendo · 1984', 'The rarer sit-down side of the VS. family — the distinctive red-canopy cocktail DualSystem.', 'media/thumbs/redtent-excitebike.webp', 'media/2026/redtent-excitebike.webp', 'The restored Red Tent cocktail seen at an angle, VS. Excitebike on the screen and three PlayChoice-10 toppers displayed on the canopy', 800, 887, 'm-red-tent'),
 ('mini-cute.html', 'gameroom', 'Mini Cute', 'Mini Cute — Pink', 'Capcom Candy Cab · 1991', "The only candy-style cabinet in the collection, and it's the one that matters: Capcom's compact Mini Cute in the pink variant.", 'media/thumbs/minicute-portrait.webp?v=2', 'media/2026/minicute-portrait.webp?v=2', 'The pink Capcom Mini Cute candy cabinet head on at night, Street Fighter II lit on its screen and a Capcom poster above', 800, 940, 'm-mini-cute')]

def profile(href):
    p = (root / href).read_text(encoding="utf-8")
    specs = re.findall(r'<span class="sl">(.*?)</span>\s*<span class="sv">(.*?)</span>', p, re.S)[:4]
    acc = re.search(r'main\.profile\{--acc:\s*([^;}]+)', p)
    if len(specs) != 4 or not acc:
        sys.exit(f"{href}: expected four .specs tiles and main.profile{{--acc}}")
    return specs, acc.group(1).strip()

def tile_file(thumb):
    path = thumb.split("?")[0]
    out = "media/select/" + path.rsplit("/", 1)[1]
    im = Image.open(root / path).convert("RGB")
    im = im.resize((240, round(im.height * 240 / im.width)), Image.LANCZOS)
    (root / "media/select").mkdir(exist_ok=True)
    im.save(root / out, "WEBP", quality=80, method=6)
    return out, im.size

panels, groups = [], {k: [] for k, _ in GROUPS}
for i, (href, group, short, name, sub, blurb, thumb, full, alt, w, h, vt) in enumerate(MACHINES):
    specs, acc = profile(href)
    tfile, (tw, th) = tile_file(thumb)
    first = i == 0
    img_attrs = 'fetchpriority="high"' if first else 'loading="lazy"'
    spec_html = "".join(f'<div><span class="sl">{a}</span><span class="sv">{b}</span></div>' for a, b in specs)
    panels.append(
        f'      <div class="spanel" id="m-{href[:-5]}" style="--acc:{acc}"{"" if first else " hidden"}>\n'
        f'        <figure class="sphoto"><img {img_attrs} style="view-transition-name:{vt}" src="{thumb}" data-full="{full}" alt="{alt}" width="{w}" height="{h}" decoding="async"></figure>\n'
        f'        <div class="sinfo">\n'
        f'          <div class="sub">{sub}</div>\n'
        f'          <h3>{name}</h3>\n'
        f'          <p>{blurb}</p>\n'
        f'          <div class="specs">{spec_html}</div>\n'
        f'          <a class="btn" href="{href}">Open the full profile &rarr;</a>\n'
        f'        </div>\n'
        f'      </div>\n')
    cur = ' aria-current="true"' if first else ''
    groups[group].append(
        f'<a class="st{" on" if first else ""}" href="{href}" data-m="m-{href[:-5]}" style="--acc:{acc}"'
        f'{cur}><img src="{tfile}" alt="" width="{tw}" height="{th}" decoding="async"><span>{short}</span></a>')

roster = "".join(f'        <div class="sg" id="{k}"><div class="sgl">{label}</div><div class="sgt">{"".join(groups[k])}</div></div>\n' for k, label in GROUPS)
block = (
    '<!-- select:start (generated by tools/build-machine-select.py - edit the tool, not this block) -->\n'
    '  <section id="select" class="select" aria-label="Select a machine">\n'
    f'    <div class="shead"><span class="spx">Select your machine</span><span class="scount"><b>{len(MACHINES)}</b> machines &middot; all on free play</span></div>\n'
    '    <div class="sstage">\n' + "".join(panels) +
    '      <nav class="sroster" aria-label="The machines">\n' + roster +
    '        <div class="shint" aria-hidden="true"><kbd>&larr;</kbd><kbd>&rarr;</kbd> browse &middot; <kbd>Enter</kbd> open</div>\n'
    '      </nav>\n'
    '    </div>\n'
    '  </section>\n'
    '  <!-- select:end -->')

page = root / "games.html"
s = io.open(page, encoding="utf-8", newline="").read()
a, b = s.find("<!-- select:start"), s.find("<!-- select:end -->")
if a < 0 or b < 0:
    sys.exit("games.html: select markers not found")
io.open(page, "w", encoding="utf-8", newline="").write(s[:a] + block + s[b + len("<!-- select:end -->"):])
print(f"machine select: {len(MACHINES)} machines, {len(GROUPS)} groups")
