#!/usr/bin/env python3
"""Set each sitemap.xml <lastmod> to the date the page's visible content last changed.

"Content" = the page's <main> (or <body>) with tags, ?v= stamps and whitespace normalized away,
so head-only edits (meta, JSON-LD) and asset re-stamps don't bump every date. gallery.html and
the home page also count assets/gallery-data.js, which they render from. An uncommitted change
counts as today. Needs full git history. RUN BEFORE EVERY PUSH:  python3 tools/update-lastmod.py
"""
import datetime, hashlib, pathlib, re, subprocess, sys
root = pathlib.Path(__file__).resolve().parent.parent
def git(*a): return subprocess.run(["git", *a], cwd=root, capture_output=True, text=True).stdout
if git("rev-parse", "--is-shallow-repository").strip() == "true":
    sys.exit("shallow clone: run  git fetch --unshallow  first, or the dates will be wrong")
EXTRA = {"gallery.html": ["assets/gallery-data.js"], "index.html": ["assets/gallery-data.js"]}
def norm(text, path):
    if path.endswith(".js"): return hashlib.sha1(text.encode()).hexdigest()
    m = re.search(r"<main\b.*?</main>", text, re.S) or re.search(r"<body\b.*?</body>", text, re.S)
    body = m.group(0) if m else text
    body = re.sub(r"\?v=[0-9a-z]+", "", body)
    body = re.sub(r"<[^>]+>", " ", body)
    return hashlib.sha1(re.sub(r"\s+", " ", body).strip().encode()).hexdigest()
def changed_on(path):
    """Date of the newest commit that changed the normalized content of path."""
    wt = (root / path).read_text(encoding="utf-8")
    head = git("show", f"HEAD:{path}")
    if head and norm(wt, path) != norm(head, path):
        return datetime.date.today().isoformat()
    commits = git("log", "--format=%H %cs", "--", path).split("\n")
    commits = [c.split() for c in commits if c]
    # Skip commits where the file was absent (the 9-26 empty-tree accident and its restore).
    hist = [(d, norm(t, path)) for h, d in commits if (t := git("show", f"{h}:{path}"))]
    for (d, cur), (_, prev) in zip(hist, hist[1:]):
        if cur != prev:
            return d
    return hist[-1][0] if hist else datetime.date.today().isoformat()
sm = (root / "sitemap.xml").read_text(encoding="utf-8")
out, n = [], 0
def fix(m):
    global n
    loc, old = m.group(2), m.group(4)
    page = loc or "index.html"
    date = max([changed_on(page)] + [changed_on(x) for x in EXTRA.get(page, [])])
    if date != old: n += 1
    return f"{m.group(1)}{date}{m.group(5)}"
sm2 = re.sub(r"(<loc>https://www\.orlandu\.com/([^<]*)</loc>\s*<lastmod>)((\d{4}-\d\d-\d\d))(</lastmod>)", fix, sm)
(root / "sitemap.xml").write_text(sm2, encoding="utf-8")
print(f"{n} lastmod dates changed")
