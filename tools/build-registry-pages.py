#!/usr/bin/env python3
"""Generate the Orlandu Registry pages from data/registry-models.json.

Writes registry.html (the census), registry-models.html (the catalog), registry-submit.html (the form)
and one registry-<slug>.html per catalog chassis (96). Edit THIS FILE and rerun; never hand-edit the
pages. Static parts (facts, era, variants, the model's notes) come from the catalog; the counts, the
chart and the entries are fetched by assets/registry.js from /api/registry at view time.
Run from the repo root, BEFORE stamp-assets.py (the pages are written with bare asset references).
"""
import json, re, pathlib, html as H

root = pathlib.Path(__file__).resolve().parent.parent
cat = json.loads((root / "data" / "registry-models.json").read_text(encoding="utf-8"))
SITE = "https://www.orlandu.com/"
OG = SITE + "media/og/og-registry.jpg"
e = H.escape

def head(fn, title, og_title, desc, kicker_kind, extra_ld="", robots="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1", crumbs=None):
    url = SITE + fn
    crumbs = crumbs or [("Registry", "registry.html")]
    items = [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE}] + [
        {"@type": "ListItem", "position": i + 2, "name": n, "item": SITE + u} for i, (n, u) in enumerate(crumbs)]
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebSite", "@id": SITE + "#website", "url": SITE, "name": "Orlandu's Arcade",
         "description": "A private arcade and Sony professional monitor collection in Orange County, California.",
         "publisher": {"@type": "Organization", "@id": SITE + "#org", "name": "Orlandu's Arcade", "url": SITE}, "inLanguage": "en-US"},
        {"@type": "Organization", "@id": SITE + "#org", "name": "Orlandu's Arcade", "url": SITE,
         "description": "A private arcade and Sony professional monitor collection in Orange County, California.",
         "logo": {"@type": "ImageObject", "creator": {"@type": "Organization", "name": "Orlandu's Arcade"}, "copyrightNotice": "© Orlandu's Arcade",
                  "creditText": "Orlandu's Arcade", "license": SITE + "about.html#photo-use", "acquireLicensePage": SITE + "about.html#photo-use",
                  "url": SITE + "assets/logo-wordmark.png", "width": 1080, "height": 425},
         "image": SITE + "media/og/og-home.jpg", "email": "orlandusarcade@gmail.com", "founder": {"@id": SITE + "#person"},
         "sameAs": ["https://www.instagram.com/orlandusarcade/", "https://www.ebay.com/usr/orlandu81",
                    "https://forums.arcade-museum.com/members/orlandu81.67452/", "https://www.arcade-projects.com/members/orlandu81.4521/"]},
        {"@type": "Person", "@id": SITE + "#person", "name": "orlandu81", "url": SITE + "about.html",
         "sameAs": ["https://forums.arcade-museum.com/members/orlandu81.67452/", "https://www.ebay.com/usr/orlandu81"]},
        {"@type": "CollectionPage", "@id": url + "#webpage", "url": url, "name": og_title, "description": desc,
         "isPartOf": {"@id": SITE + "#website"}, "about": {"@id": SITE + "#org"}, "inLanguage": "en-US",
         "primaryImageOfPage": {"@type": "ImageObject", "creator": {"@type": "Organization", "name": "Orlandu's Arcade"},
                                "copyrightNotice": "© Orlandu's Arcade", "creditText": "Orlandu's Arcade",
                                "license": SITE + "about.html#photo-use", "acquireLicensePage": SITE + "about.html#photo-use", "url": OG},
         "breadcrumb": {"@id": url + "#breadcrumb"}},
        {"@type": "BreadcrumbList", "@id": url + "#breadcrumb", "itemListElement": items}]}
    if extra_ld:
        ld["@graph"].append(extra_ld)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="{robots}">
<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="assets/favicon-192.png">
<link rel="preload" href="assets/fonts/orbitron-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/rajdhani-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<meta name="theme-color" content="#0a0a12">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Orlandu's Arcade">
<meta property="og:title" content="{e(og_title)} — Orlandu's Arcade">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{OG}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(og_title)} — Orlandu's Arcade">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{OG}">
<link rel="canonical" href="{url}">
<link rel="alternate" type="text/markdown" href="{SITE}llms-full.txt" title="Full text of this site for AI assistants">
<link rel="alternate" type="text/markdown" href="{SITE}llms.txt" title="Site index for AI assistants">
<link rel="stylesheet" href="assets/style.css">
<link rel="stylesheet" href="assets/registry.css">
<link rel="preload" as="image" href="assets/logo-wordmark-nav.webp">
<script src="assets/site.js" defer></script>
<script src="assets/registry.js" defer></script>
<script type="application/ld+json">
{json.dumps(ld, indent=1, ensure_ascii=False)}
</script>
</head>
"""

FOOT = """
<footer class="site"></footer>
</body>
</html>
"""

# ── "while you're here" (2026-10-28) ─────────────────────────────────────
# Facebook sends strangers straight to the registry; this is their path into the rest of the site. Picked by
# monitor line — a BVM owner wants the card and controller references, a PVM owner the buying and hookup guides.
RELATED = {
    "pvm-vs-bvm.html": ("Explainer", "PVM vs. BVM", "What the two lines were built for, what differs in the tube and the inputs, and which one a game collector should buy first."),
    "bkm-cards.html": ("Reference", "Every Sony BKM card, and which monitor it fits", "Three physical card families, 34 cards, the installation rules and the controllers — sourced to Sony."),
    "bkm-10r.html": ("Tool", "Operate a BKM-10R", "The control unit a BVM-20E1U cannot live without, button by button and menu by menu."),
    "sony-model-numbers.html": ("Reference", "What a Sony model number says", "Line, size, tube letter, the digit that means \"needs a control unit,\" and the market suffix — from Sony's own manuals."),
    "pvm-20l5-buying-guide.html": ("Buyer's guide", "What to check before you buy a PVM-20L5", "The geometry grid, judging a tube with no hours counter, what to pay — and why you should drive to it."),
    "connect-console-to-pvm.html": ("How-to", "Connect a console to a PVM or BVM", "Seven steps from the console's video-out to the BNCs, the sync and termination rules, and which cable each console wants."),
    "will-it-connect.html": ("Tool", "Will it connect?", "Pick any console and any monitor in the fleet: the cable chain step by step and a plain verdict."),
    "through-the-mask.html": ("Tool", "Through the mask", "Every tube in the fleet simulated from its own numbers — scan-line gap, grille pitch, center resolution — two side by side."),
    "monitors.html": ("The collection", "The monitor fleet", "The arcade's own Sony PVM, BVM and LMD units, with the full spec table, a compare mode and the fleet drawn to scale."),
}
RELATED_FOR = {
    "BVM": ["bkm-cards.html", "bkm-10r.html", "pvm-vs-bvm.html", "sony-model-numbers.html"],
    "PVM": ["pvm-20l5-buying-guide.html", "connect-console-to-pvm.html", "pvm-vs-bvm.html", "sony-model-numbers.html"],
    "hub": ["pvm-vs-bvm.html", "bkm-cards.html", "sony-model-numbers.html", "will-it-connect.html", "through-the-mask.html", "monitors.html"],
}
def related(kind, exclude=()):
    hrefs = [h for h in RELATED_FOR[kind] if h not in exclude]
    cards = "".join(f'<a class="card linked" href="{h}"><div class="sub">{e(RELATED[h][0])}</div><h3>{e(RELATED[h][1])}</h3><p>{e(RELATED[h][2])}</p></a>' for h in hrefs)
    return f'  <section id="related" class="related">\n    <h2 class="sec">While you\'re here <small>for Sony monitor owners</small></h2>\n    <div class="grid c3 readroom">{cards}</div>\n  </section>\n'

# ── the census ────────────────────────────────────────────────────────────
def landing():
    desc = "A survivor census of Sony BVM and PVM monitors, built from owners' serial numbers: how many of each model are accounted for and where your serial falls."
    body = """<body data-registry="landing">
<header class="site" data-page="registry"></header>

<main class="reg">
  <div class="pagehead">
    <div class="kicker">Census · Sony BVM + PVM · kept by owners</div>
    <h1 class="page">The Orlandu Registry</h1>
    <p class="lede" style="max-width:70ch">Nobody knows how many Sony broadcast monitors are left. Sony never published production figures, and the ones that survived left the studios one at a time. This is a serial-number census kept by the people who own them: add yours, and the site counts survivors per model and plots where each serial falls in the run. Serials are shown partly masked; the full number is used only to catch duplicates.</p>
    <p class="note keeper">Kept by <a href="about.html">Orlandu&rsquo;s Arcade</a>, a private Sony monitor collection in Orange County, California. The arcade&rsquo;s own <a href="monitors.html">four BVMs and PVMs</a> were the first four entries; everything since has come from other owners.</p>
  </div>

  <div class="ctas">
    <a class="btn" href="registry-submit.html">Add your monitor &rarr;</a>
    <a class="btn cy" href="#entries">Browse the entries</a>
  </div>

  <div class="stats" id="stats" aria-live="polite">
    <div><span class="n">&hellip;</span><span class="l">Monitors registered</span></div>
    <div><span class="n">&hellip;</span><span class="l">Models accounted for</span></div>
    <div><span class="n">&hellip;</span><span class="l">Owners</span></div>
    <div><span class="n">&hellip;</span><span class="l">Countries</span></div>
  </div>

  <section id="census">
    <h2 class="sec">Survivors by model <small>click a model for its serial-range chart</small></h2>
    <div class="census" id="census-out"><p class="note">Loading the census&hellip;</p></div>
  </section>

  <section id="records" hidden>
    <h2 class="sec">Records <small>the monitors, not the owners</small></h2>
    <div class="records" id="records-out"></div>
  </section>

  <section id="entries">
    <h2 class="sec">Latest entries <small>newest first</small></h2>
    <div class="entries" id="entries-out"></div>
    <p class="loadmore" id="entries-more" hidden><button type="button" class="btn cy" id="entries-more-btn">Show all entries</button></p>
    <p class="note" style="margin-top:1.2rem">Each card shows what the owner chose to share. Email addresses are never published and never shown to other owners; the full serial stays on the server. The whole catalog, with a page per model, is on the <a href="registry-models.html">models list</a>.</p>
  </section>

  <section id="how">
    <h2 class="sec">What gets published, what stays private</h2>
    <div class="pubpriv">
      <div class="card"><h3>Public, on the entry card</h3><ul><li>Model and the serial with its last two digits masked (20015xx)</li><li>The build date on the plate, and on a BVM the hours on the meter</li><li>Condition, in five steps, and a short note</li><li>Year, source and, if you give them, price paid and who sold it</li><li>Your handle (KLOV, forum, Instagram) and country or state, if you give them</li><li>One photo, if you add one</li></ul></div>
      <div class="card"><h3>Private, never shown</h3><ul><li>The full serial number, used only to reject a duplicate</li><li>Your email, kept so the arcade can follow up on an entry, and for nothing else</li><li>Anything you leave blank: every field but model, serial and email is optional</li></ul></div>
      <div class="card"><h3>House rules</h3><ul><li>One entry per monitor. If a monitor changes hands or an entry needs a fix, write through the <a href="about.html#write">contact form</a> with the masked serial.</li><li>Entries publish immediately and are reviewed after the fact. Junk gets deleted.</li><li>Say as much as you like: what you paid, who sold it, what it took to get it running. Price history per model is the next chart once enough entries carry one.</li><li>Sony LMD, AMS speakers and BKM cards are not in scope yet.</li></ul></div>
    </div>
  </section>

  <section id="qa">
    <h2 class="sec">Quick answers</h2>
    <div class="grid" style="grid-template-columns:1fr">
      <div class="card"><h3>Where is the serial number on a Sony PVM or BVM?</h3><p>On the rear panel plate, next to the model number. A BVM-D or BVM-A also shows it on the status screen; on a PVM the rear plate is the only place.</p></div>
      <div class="card"><h3>What if my model isn't in the list?</h3><p>Pick "Not listed" and type the badge exactly as printed. The catalog covers 96 PVM and BVM chassis and their regional variants; a model that isn't there gets added once a plate confirms it.</p></div>
      <div class="card"><h3>Why mask the serial?</h3><p>A full serial next to a photo is enough to clone a listing. Two masked digits keep the entry useful to the census and useless to a scammer.</p></div>
      <div class="card"><h3>Does the U, E or J at the end matter?</h3><p>Not for the count. The census groups a chassis with its regional variants (BVM-20E1U, 20E1E, 20E1J are one model); the suffix you pick or type is kept with the entry.</p></div>
    </div>
  </section>
""" + related("hub") + """</main>
"""
    return head("registry.html", "Sony BVM & PVM Serial Number Registry — Orlandu's Arcade", "Sony BVM & PVM Serial Number Registry", desc, "Census", crumbs=[("Registry", "registry.html")]) + body + FOOT

# ── the catalog list ──────────────────────────────────────────────────────
def static_models():
    """The catalog table in the raw HTML, so crawlers that don't run JS still find all 96 model pages.
    Same markup as models() in assets/registry.js, which re-renders it with the live counts."""
    conf = {"high": "Sony-dated", "medium": "Manual or brochure year", "low": "Collector estimate"}
    out = []
    for line in ("BVM", "PVM"):
        rows = [m for m in cat["models"] if m["line"] == line]
        out.append(f'<h2 class="sec" id="{line.lower()}">' + ("BVM · broadcast and master monitors" if line == "BVM" else "PVM · production monitors") + f" <small>{len(rows)} chassis</small></h2>"
            '<div class="tablewrap" tabindex="0"><table class="spec models"><thead><tr><th>Model</th><th>Size</th><th>Series</th><th>Era</th><th>Variants</th><th class="num">Registered</th></tr></thead><tbody>'
            + "".join(f'<tr><td><a href="registry-{m["slug"]}.html">{e(m["model"])}</a></td><td>{m["size_in"]}"</td><td>{e(m["series"])}</td><td><span class="conf {m["era_confidence"]}" title="{conf[m["era_confidence"]]}">{e(m["era"])}</span></td><td class="dim">{e(", ".join(v for v in m["variants"] if v != m["model"]))}</td><td class="num"><span class="dim">&hellip;</span></td></tr>' for m in rows)
            + "</tbody></table></div>")
    return "".join(out)

def models_page():
    desc = "Every Sony BVM and PVM chassis in the Orlandu Registry: 96 models with screen size, series, production era and regional variants, and how many are registered."
    body = """<body data-registry="models">
<header class="site" data-page="registry"></header>
<main class="reg">
  <div class="pagehead">
    <div class="kicker"><a href="registry.html" style="color:inherit">Registry</a> · every model</div>
    <h1 class="page">Every BVM and PVM</h1>
    <p class="lede" style="max-width:68ch">The 96 chassis the registry knows, with their regional variants folded in. The era is Sony's own date where a press release, dealer bulletin or brochure gives one, a manual's copyright year where that is all there is, and a collector estimate where nothing from Sony has turned up; the color on each era says which. A model with no entry still has its page, so yours can be the first.</p>
  </div>
  <div class="legend" style="margin:-.8rem 0 1.4rem"><span><i class="sq" style="background:#3f7d41"></i>Sony-dated</span><span><i class="sq" style="background:#ff8a00"></i>Manual or brochure year</span><span><i class="sq" style="background:#5a5a86"></i>Collector estimate</span></div>
  <div id="models-out">""" + static_models() + """</div>
  <p class="note">Missing a model that exists? Register it under "Not listed" with the badge as printed; it joins the catalog once a plate confirms it. Suffix key: U = USA, E = Europe, J = Japan, A = Australia/Asia, M = multistandard or M-region, QM = multistandard PAL/SECAM, MD = medical, SSM = security twin.</p>
</main>
"""
    return head("registry-models.html", "Sony BVM & PVM Model List & Production Eras — Orlandu's Arcade", "Every Sony BVM and PVM model, with production eras", desc, "Reference", crumbs=[("Registry", "registry.html"), ("Every model", "registry-models.html")]) + body + FOOT

# ── the form ──────────────────────────────────────────────────────────────
def submit_page():
    desc = "Add your Sony BVM or PVM to the Orlandu Registry: model, serial, hours, condition, where it came from, one photo. Two minutes, no account."
    body = """<body data-registry="submit">
<header class="site" data-page="registry"></header>

<main class="reg">
  <div class="pagehead">
    <div class="kicker"><a href="registry.html" style="color:inherit">Registry</a> · add a monitor</div>
    <h1 class="page">Register your monitor</h1>
    <p class="lede" style="max-width:66ch">Model, serial and an email are the only required fields; everything else makes the census better. The entry publishes as soon as you send it. No account, no password.</p>
  </div>

  <div class="rform">
    <form class="rfm" id="rf" novalidate>
      <h2 class="sec">The monitor</h2>
      <label class="wide">Model
        <select id="model" name="model" required><option value="">Loading the catalog&hellip;</option></select>
        <span class="help">Pick the chassis. The census groups a model with its regional variants; the exact badge goes in the next box.</span>
      </label>
      <label class="wide" id="variantwrap" hidden>Badge as printed
        <select id="variant" name="variant"></select>
        <span class="help">The model number on the rear plate, with its region letter. Kept with your entry and shown on the card.</span>
      </label>
      <label class="wide" id="otherwrap" hidden>Model, as printed
        <input type="text" id="model_other" name="model_other" maxlength="40" placeholder="PVM-1442QM">
      </label>
      <label>Serial number
        <input type="text" id="serial" name="serial" required inputmode="numeric" autocomplete="off" placeholder="2001534">
        <span class="help">Published as <b>20015xx</b>. The full number is kept privately to reject duplicates.</span>
      </label>
      <label>Built
        <input type="month" id="built" name="built" min="1975-01" max="2010-12" placeholder="optional">
        <span class="help">The date on the rear plate, month and year. With the serial it is what draws the production timeline. <span id="builthint"></span></span>
      </label>
      <label id="hourswrap">Hours on the meter
        <input type="number" id="hours" name="hours" min="0" max="300000" step="1" placeholder="optional">
        <span class="help">BVM-D and BVM-A show it on the status screen (use the operation time; CRT time can go in the notes); older BVMs on the controller.</span>
      </label>

      <fieldset>
        <legend>Condition</legend>
        <div class="conds">
          <label><input type="radio" name="cond" value="serviced">Working · recently serviced</label>
          <label><input type="radio" name="cond" value="working" checked>Working</label>
          <label><input type="radio" name="cond" value="attention">Working · needs attention</label>
          <label><input type="radio" name="cond" value="dead">Not working</label>
          <label><input type="radio" name="cond" value="parts">Parts / donor</label>
        </div>
      </fieldset>
      <label class="wide">Notes
        <textarea id="note" name="note" maxlength="400" placeholder="Optional. Cards fitted, tube condition, what it took to get it running, the story of where it came from. 400 characters."></textarea>
      </label>

      <h2 class="sec">Where it came from</h2>
      <label>Year acquired
        <input type="number" id="acq_year" name="acq_year" min="1975" max="2026" placeholder="optional">
      </label>
      <label>Source
        <select id="acq_src" name="acq_src">
          <option value="">Optional</option>
          <option>Online auction</option>
          <option>Private sale</option>
          <option>Local pickup</option>
          <option>Studio or broadcast surplus</option>
          <option>University or hospital surplus</option>
          <option>Other collector</option>
          <option>Imported from Japan</option>
          <option>Original owner</option>
          <option>Other</option>
        </select>
      </label>
      <label>Price paid
        <div class="row3"><input type="number" id="price" name="price" min="0" step="1" placeholder="optional"><select id="currency" name="currency" aria-label="Currency"><option>USD</option><option>EUR</option><option>GBP</option><option>JPY</option><option>CAD</option><option>AUD</option></select></div>
        <span class="help">Optional and published if given. Enough of these and each model gets a price-over-time chart.</span>
      </label>
      <label>Bought from
        <input type="text" id="seller" name="seller" maxlength="80" placeholder="optional — a shop, a seller, a studio">
        <span class="help">Optional and published if given.</span>
      </label>
      <label class="wide">Photo
        <input type="file" id="photo" name="photo" accept="image/jpeg,image/png,image/webp">
        <span class="help">Optional, one photo, JPEG, PNG or WebP. Resized in your browser before upload, which also strips the camera's location data. Keep the plate out of the shot if you'd rather not show the full serial.</span>
      </label>
      <div class="preview" id="preview"></div>

      <h2 class="sec">You</h2>
      <label>Handle
        <input type="text" id="handle" name="handle" maxlength="40" placeholder="KLOV / forum / Instagram name — optional">
      </label>
      <label>Country
        <select id="country" name="country">
          <option value="">Optional</option>
          <option value="US">United States</option><option value="CA">Canada</option><option value="GB">United Kingdom</option><option value="JP">Japan</option><option value="DE">Germany</option><option value="AU">Australia</option><option value="FR">France</option><option value="NL">Netherlands</option><option value="IT">Italy</option><option value="ES">Spain</option><option value="SE">Sweden</option><option value="NO">Norway</option><option value="DK">Denmark</option><option value="FI">Finland</option><option value="BE">Belgium</option><option value="CH">Switzerland</option><option value="AT">Austria</option><option value="IE">Ireland</option><option value="PT">Portugal</option><option value="PL">Poland</option><option value="CZ">Czechia</option><option value="HU">Hungary</option><option value="GR">Greece</option><option value="BR">Brazil</option><option value="MX">Mexico</option><option value="AR">Argentina</option><option value="CL">Chile</option><option value="NZ">New Zealand</option><option value="KR">South Korea</option><option value="TW">Taiwan</option><option value="HK">Hong Kong</option><option value="SG">Singapore</option><option value="TH">Thailand</option><option value="MY">Malaysia</option><option value="PH">Philippines</option><option value="ID">Indonesia</option><option value="IN">India</option><option value="ZA">South Africa</option><option value="IL">Israel</option><option value="TR">Turkey</option><option value="AE">United Arab Emirates</option><option value="CN">China</option>
        </select>
      </label>
      <label id="statewrap" hidden>State
        <select id="state" name="state"><option value="">Optional</option>
          <option>Alabama</option><option>Alaska</option><option>Arizona</option><option>Arkansas</option><option>California</option><option>Colorado</option><option>Connecticut</option><option>Delaware</option><option>Florida</option><option>Georgia</option><option>Hawaii</option><option>Idaho</option><option>Illinois</option><option>Indiana</option><option>Iowa</option><option>Kansas</option><option>Kentucky</option><option>Louisiana</option><option>Maine</option><option>Maryland</option><option>Massachusetts</option><option>Michigan</option><option>Minnesota</option><option>Mississippi</option><option>Missouri</option><option>Montana</option><option>Nebraska</option><option>Nevada</option><option>New Hampshire</option><option>New Jersey</option><option>New Mexico</option><option>New York</option><option>North Carolina</option><option>North Dakota</option><option>Ohio</option><option>Oklahoma</option><option>Oregon</option><option>Pennsylvania</option><option>Rhode Island</option><option>South Carolina</option><option>South Dakota</option><option>Tennessee</option><option>Texas</option><option>Utah</option><option>Vermont</option><option>Virginia</option><option>Washington</option><option>West Virginia</option><option>Wisconsin</option><option>Wyoming</option><option>District of Columbia</option>
        </select>
      </label>
      <label>Email
        <input type="email" id="email" name="email" required placeholder="you@example.com">
        <span class="help">Required, never published. Used only if the arcade needs to ask about the entry.</span>
      </label>
      <label class="hp" aria-hidden="true">Website<input type="text" name="site" tabindex="-1" autocomplete="off"></label>

      <div class="cstatus" id="rstatus" hidden></div>
      <div class="cactions">
        <button class="btn" type="submit">Add to the registry &rarr;</button>
        <span class="alt">Publishes immediately. The arcade reviews entries after the fact.</span>
      </div>
    </form>

    <aside class="aside">
      <div class="card">
        <h3>Your card will show</h3>
        <ul>
          <li><b>PVM-20L5</b> · 20-inch · L series</li>
          <li>Serial <b>20015xx</b></li>
          <li>Build date, hours, condition, your note</li>
          <li>Year, source, price and seller if you give them</li>
          <li>Your handle, your state or country</li>
          <li>Your photo</li>
        </ul>
        <h3>It will never show</h3>
        <ul>
          <li>The full serial</li>
          <li>Your email</li>
          <li>Anything you leave blank</li>
        </ul>
        <p style="font-size:.95rem;color:var(--dim);margin:0">Made a mistake? Write to the arcade from the <a href="about.html#write">contact form</a> with the masked serial and it gets fixed.</p>
      </div>
    </aside>
  </div>
""" + related("hub", exclude=("monitors.html",)) + """</main>
"""
    return head("registry-submit.html", "Register Your Sony BVM or PVM Monitor — Orlandu's Arcade", "Register your Sony BVM or PVM", desc, "Form", crumbs=[("Registry", "registry.html"), ("Add a monitor", "registry-submit.html")]) + body + FOOT

# ── one page per chassis ──────────────────────────────────────────────────
PROFILES = {"pvm-20l5": "pvm-20l5.html", "pvm-2950q": "pvm-2950q.html", "bvm-20e1u": "bvm-20e1u.html", "bvm-a14f5u": "bvm-a14f5u.html"}
# Which model pages Google may index (David, 10/26 SEO pass). A page earns indexing when it carries content no
# other page has: Sony's bulletin serial lists (sony_serials) or the arcade's own unit (PROFILES). The rest are
# noindex,follow and stay OUT of sitemap.xml — ~200 words of shared template each, mostly with no entries yet, on a
# young domain. To promote one (it has real entries now), add its slug to INDEX_EXTRA and rerun, then add its
# sitemap block.
INDEX_EXTRA = set()
def indexable(m):
    return bool(m.get("sony_serials")) or m["slug"] in PROFILES or m["slug"] in INDEX_EXTRA
NOINDEX = "noindex,follow"

CONF = {"high": "Sony press release, bulletin or brochure date", "medium": "manual copyright or brochure print year", "low": "collector estimate"}

MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

def sony_section(m):
    """Serial ceilings from Sony's technical bulletins, copied exactly as printed (David, 10/26: Rado's 20E1E lead).
    A ceiling is how far a badge's serial run had reached by the bulletin's date, never a production total."""
    rows = m.get("sony_serials")
    if not rows:
        return ""
    model = m["model"]
    sufs = sorted({k for r in rows for k in r["serials"]}, key=lambda k: "EUJA".find(k))
    badge = lambda k: model[:-1] + k if model.endswith("U") else model + k
    head = "".join(f"<th>{e(badge(k))}</th>" for k in sufs)
    def when(d):
        y, mo, da = d.split("-")
        return f"{MON3[int(mo) - 1]} {int(da)}, {y}"
    body = "".join(
        f'<tr><td><a href="{e(r["url"])}" rel="noopener">TB {e(r["doc"])}</a> · {when(r["date"])}<br><small>{e(r["title"])}</small></td>'
        + "".join(f"<td>{e(r['serials'][k]) if k in r['serials'] else '<span class=\"dim\">not listed</span>'}</td>" for k in sufs) + "</tr>"
        for r in rows)
    return f"""  <section id="sony">
    <h2 class="sec">What Sony's bulletins say</h2>
    <p>Sony's technical bulletins list the serial numbers each firmware update covers. The highest number listed for a badge is a ceiling: how far that serial run had reached by the bulletin's date, not a production total. European (E) and U.S. (U) sets are numbered separately; the 1998 bulletin, written for the Americas, shows the U sets starting at 2,000,001 before moving to the 2,100,000 block. The figures are copied exactly as Sony printed them, including the few that don't agree from one bulletin to the next.</p>
    <div class="tablewrap" tabindex="0"><table class="spec"><thead><tr><th>Bulletin</th>{head}</tr></thead><tbody>{body}</tbody></table></div>
    <p class="note">Scans of the bulletins are on ConsoleMods; the links open Sony's PDF.</p>
  </section>
"""

def model_page(m):
    slug, model, line = m["slug"], m["model"], m["line"]
    variants = [v for v in m["variants"] if v != model]
    series = e(m["series"]) + (" series" if line == "PVM" else " generation")
    title = f"Sony {model} Serial Number Registry — Orlandu's Arcade"
    desc = f"Every Sony {model} registered by its owner: survivor count, serial-number range, hours and condition. {m['size_in']}-inch {line}, {m['era']}. Add yours."
    links = []
    if slug in PROFILES:
        links.append(f'The arcade\'s own unit is on the <a href="{PROFILES[slug]}">{e(model)} profile</a>.')
    links.append('What the badge means is on the <a href="sony-model-numbers.html">decoder page</a>')
    links.append('and the registry\'s <a href="registry-models.html">model list</a> has every chassis.' if slug not in ("pvm-20l5",) else 'and whether to buy one is the <a href="pvm-20l5-buying-guide.html">buying guide</a>.')
    about = e(m["notes"]) if m.get("notes") else ""
    basis = e(m.get("era_basis", ""))
    ld = {"@type": "Thing", "@id": SITE + f"registry-{slug}.html#model", "name": f"Sony {model}", "description": m.get("notes", ""), "alternateName": variants}
    body = f"""<body data-registry="model" data-model="{slug}">
<header class="site" data-page="registry"></header>

<main class="reg">
  <div class="pagehead">
    <div class="kicker"><a href="registry.html" style="color:inherit">Registry</a> · {line} · {series}</div>
    <div class="modelhead">
      <div>
        <h1 class="page">{e(model)} <small>registry</small></h1>
        <div class="facts">
          <span><b>{m['size_in']}-inch</b> {line}</span>
          <span><b>{series}</b></span>
          <span class="conf-{m['era_confidence']}" title="{e(m.get('era_basis', ''))}"><b>{e(m['era'])}</b> · {CONF[m['era_confidence']]}</span>
          {f'<span><b>Variants</b> {e(" · ".join(variants))}</span>' if variants else ''}
        </div>
        <p class="lede" style="margin-bottom:.4rem;max-width:66ch"><span id="mlede">Loading the census&hellip;</span> {' '.join(links)}</p>
      </div>
      <div><a class="btn" href="registry-submit.html?m={slug}">Add your {e(model)} &rarr;</a></div>
    </div>
  </div>

  <div class="stats" id="stats" aria-live="polite">
    <div><span class="n">&hellip;</span><span class="l">Registered</span></div>
    <div><span class="n">&hellip;</span><span class="l">Working</span></div>
    <div><span class="n">&hellip;</span><span class="l">Median hours</span></div>
    <div><span class="n">&hellip;</span><span class="l">Serial range seen</span></div>
  </div>

  <section id="range">
    <h2 class="sec">Where the serials fall</h2>
    <div class="chartwrap" id="strip">
      <div class="ch"><h3>Serial-number strip</h3><small>one dot per registered unit · hover for the entry, build date and hours · the arcade's unit in orange</small></div>
      <div id="strip-svg"></div>
      <div class="legend"><span><i></i>Registered unit</span><span><i class="mine"></i>Orlandu's Arcade</span></div>
    </div>
    <div class="chartwrap" id="bands" hidden>
      <div class="ch"><h3>Units per thousand serials</h3><small>a gap is a run of numbers nobody has reported yet</small></div>
      <div id="bands-svg"></div>
    </div>
    <p class="note">The chart is drawn from the masked serials, so it shows nothing the cards don't. With a handful of entries it says little; with a few dozen it starts to show how long the run was and where the survivors cluster.</p>
  </section>

  <section id="entries">
    <h2 class="sec">The entries <small>newest first</small></h2>
    <div class="entries" id="entries-out"><p class="note">Loading&hellip;</p></div>
  </section>

{sony_section(m)}  <section id="about">
    <h2 class="sec">About this model</h2>
    <p>{('<b>Catalog notes:</b> ' + about + '. ') if about else ''}<b>Era:</b> {e(m['era'])}, {CONF[m['era_confidence']]}{(' (' + basis + ')') if basis else ''}. {"Sony never published production totals; the bulletin ceilings above are the nearest thing, and the registry is the count." if m.get("sony_serials") else "Sony never published production figures for any of these; the registry is the count."}</p>
  </section>
{related(line)}</main>
"""
    kw = {} if indexable(m) else {"robots": NOINDEX}
    return head(f"registry-{slug}.html", title, f"Sony {model} Serial Number Registry", desc, "Registry", extra_ld=ld, **kw, crumbs=[("Registry", "registry.html"), (model, f"registry-{slug}.html")]) + body + FOOT

written = 0
for fn, html in [("registry.html", landing()), ("registry-models.html", models_page()), ("registry-submit.html", submit_page())] + [(f"registry-{m['slug']}.html", model_page(m)) for m in cat["models"]]:
    p = root / fn
    if not p.exists() or p.read_text(encoding="utf-8") != html:
        p.write_text(html, encoding="utf-8"); written += 1
print(f"registry pages: {3 + len(cat['models'])} total, {written} written")
