#!/usr/bin/env python3
"""Regenerate assets/search-index.js — the client-side site search index.

Run from the repo root before every deploy (Claude does this as part of the push):
    python3 tools/build-search-index.py

What goes in: every page with site chrome (title, kicker, lede, h2/h3 headings, body
text), the glossary terms (deep-linked), gallery captions (linked to their #tag= view
when the entry has tags), For Sale and Wanted cards, and the FAQ questions.
What stays out: the magazine and the monograph BODY text (headings only — they are
enormous), nav/footer chrome, JSON-LD, the two Tesla/eBay callback pages, 404.
The index is built from published pages only, so it cannot say anything the site
does not already say."""
import re, html, json, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
EXCLUDE = {"404.html", "ebay-callback.html", "tesla-callback.html"}
HEADINGS_ONLY = {"ams-100-monograph.html", "trinitron-fleet-vol1.html", "orlandu-100.html", "orlandu-50-games.html"}
KIND = {
    "index.html": "Home", "games.html": "Coin-Op", "monitors.html": "Monitors", "consoles.html": "Consoles",
    "signage.html": "Signage", "guide-shelf.html": "Guides", "gallery.html": "Gallery", "stories.html": "Stories",
    "projects.html": "Projects", "forsale.html": "For Sale", "wanted.html": "Wanted", "about.html": "About",
    "glossary.html": "Glossary", "trinitron-fleet-vol1.html": "Magazine", "ams-100-monograph.html": "Monograph",
    "orlandu-100.html": "Magazine", "orlandu-50-games.html": "Magazine",
}

def text(s):
    s = re.sub(r"<(script|style|noscript)[^>]*>.*?</\1>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()

def cards(h):
    """Yield the inner HTML of every <a class="card…"> / <div class="card…">, matching nested tags."""
    for m in re.finditer(r'<(a|div) class="card[^"]*"[^>]*>', h):
        tag, i, depth = m.group(1), m.end(), 1
        for t in re.finditer(r"<(/?)" + tag + r"\b[^>]*>", h[i:]):
            depth += -1 if t.group(1) else 1
            if depth == 0:
                yield h[i:i + t.start()]
                break

def strip_small(h):
    return text(re.sub(r"<small>.*?</small>", "", h, flags=re.S))

entries = []
for p in sorted(root.glob("*.html")):
    if p.name in EXCLUDE:
        continue
    src = p.read_text(encoding="utf-8")
    title = text(re.search(r"<title>(.*?)</title>", src, re.S).group(1))
    title = re.sub(r"\s+[—–-]\s+Orlandu.*$", "", title)
    m = re.search(r"<main[^>]*>(.*)</main>", src, re.S)
    body_html = m.group(1) if m else src
    kick = re.search(r'class="kicker"[^>]*>(.*?)</', body_html, re.S)
    kicker = text(kick.group(1)) if kick else ""
    kind = KIND.get(p.name) or ("Machine" if re.search(r'class="kicker"[^>]*>\s*Machine Profile', body_html) else kicker or "Page")
    h1 = re.search(r"<h1[^>]*>(.*?)</h1>", body_html, re.S)
    h1t = text(h1.group(1)) if h1 else title
    lede = re.search(r'<p class="lede"[^>]*>(.*?)</p>', body_html, re.S)
    lede_t = text(lede.group(1)) if lede else ""
    heads = [strip_small(h) for h in re.findall(r"<h[23][^>]*>(.*?)</h[23]>", body_html, re.S)]
    heads = [h for h in heads if h and len(h) < 120]
    if p.name in HEADINGS_ONLY:
        body = " ".join(heads)
    else:
        body = text(body_html)
        body = re.sub(r"\bSkip to content\b", "", body)
    url = "/" if p.name == "index.html" else p.name
    entries.append({"u": url, "t": h1t, "k": kind, "s": lede_t[:180], "h": " ".join(heads)[:1200], "b": body[:6000], "w": 10 if kind in ("Machine", "Monitors", "Coin-Op") else 0})

    # cards with their own heading become their own hits on the hub pages
    CARD_KIND = {"forsale.html": "For Sale", "wanted.html": "Wanted", "projects.html": "Project", "consoles.html": "Console", "signage.html": "Signage"}
    if p.name in CARD_KIND:
        for c in cards(body_html):
            h3 = re.search(r"<h3[^>]*>(.*?)</h3>", c, re.S)
            if not h3:
                continue
            ct = text(h3.group(1))
            if not ct or ct.lower().startswith("more on"):
                continue
            entries.append({"u": p.name, "t": ct, "k": CARD_KIND[p.name], "s": text(c)[:180], "h": "", "b": text(c)[:600], "w": 4})

    if p.name == "about.html":
        faq = re.search(r'<section id="faq">(.*?)</section>', src, re.S)
        if faq:
            for q, a in re.findall(r"<h3[^>]*>(.*?)</h3>\s*<p>(.*?)</p>", faq.group(1), re.S):
                entries.append({"u": "about.html#faq", "t": text(q), "k": "FAQ", "s": text(a)[:180], "h": "", "b": text(a)[:600], "w": 3})

# glossary terms
gl = (root / "glossary.html").read_text(encoding="utf-8")
for m in re.finditer(r'<dt id="([^"]+)">(.*?)</dt>\s*<dd>(.*?)</dd>', gl, re.S):
    slug, term, d = m.group(1), text(m.group(2)), text(m.group(3))
    entries.append({"u": "glossary.html#" + slug, "t": term, "k": "Glossary", "s": d[:180], "h": "", "b": d[:600], "w": 5})

# gallery captions
gd = (root / "assets" / "gallery-data.js").read_text(encoding="utf-8")
for m in re.finditer(r"\{[^{}]*?title:\s*\"([^\"]*)\"[^{}]*?\}", gd, re.S):
    blob = m.group(0)
    title = m.group(1)
    cap = re.search(r"caption:\s*\"([^\"]*)\"", blob)
    cat = re.search(r"cat:\s*\"([^\"]*)\"", blob)
    tags = re.search(r"tags:\s*\[([^\]]*)\]", blob)
    tag = re.findall(r"\"([^\"]+)\"", tags.group(1))[0] if tags and re.findall(r"\"([^\"]+)\"", tags.group(1)) else None
    u = "gallery.html#tag=" + tag if tag else ("gallery.html#" + cat.group(1) if cat else "gallery.html")
    unesc = lambda x: re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), x.replace("\\'", "'"))
    capt = text(unesc(cap.group(1))) if cap else ""
    entries.append({"u": u, "t": text(title), "k": "Photo", "s": capt[:180], "h": "", "b": capt, "w": 2})

js = "// Generated by tools/build-search-index.py — do not edit by hand. Rebuild before every deploy.\nconst SEARCH_INDEX = " + json.dumps(entries, ensure_ascii=False, separators=(",", ":")) + ";\n"
(root / "assets" / "search-index.js").write_text(js, encoding="utf-8")
print(f"{len(entries)} entries, {len(js)//1024} KB → assets/search-index.js")
