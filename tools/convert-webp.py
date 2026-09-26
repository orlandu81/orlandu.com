#!/usr/bin/env python3
"""One-time (2026-09-11) JPEG → WebP conversion for the site's photos.
Converts every media/**/*.jpg (except media/og/, which stays JPEG for social scrapers)
and assets/hero-bg.jpg to a .webp sibling under the SAME basename, rewrites every
reference in HTML/JS/CSS/sitemap/llms/tools to .webp (query strings like ?v=3 preserved),
then deletes the JPEGs. New photos added later should be saved as .webp directly
(Pillow: im.save(path, "WEBP", quality=82, method=6) — no exif= argument, ever).
"""
import re, pathlib, subprocess, sys
from PIL import Image
root = pathlib.Path(__file__).resolve().parent.parent
Q = 82
jpgs = [p for p in root.glob("media/**/*.jpg") if "media/og" not in p.as_posix()] + [root / "assets" / "hero-bg.jpg"]
before = after = 0
converted = []
for p in jpgs:
    out = p.with_suffix(".webp")
    im = Image.open(p)
    if im.mode not in ("RGB", "L"): im = im.convert("RGB")
    im.save(out, "WEBP", quality=Q, method=6)
    b, a = p.stat().st_size, out.stat().st_size
    before += b; after += a
    converted.append(p.relative_to(root).as_posix())
print(f"{len(converted)} converted: {before/1e6:.1f} MB → {after/1e6:.1f} MB ({after/before:.2f}×)")

names = set(converted)  # e.g. media/2026/foo.jpg
# rewrite references
targets = [p for p in root.glob("*.html")] + list((root / "assets").glob("*.js")) + list((root / "assets").glob("*.css")) + [root / "sitemap.xml", root / "llms.txt"] + list((root / "tools").glob("*.py"))
pat = re.compile(r'((?:https://www\.orlandu\.com/)?)((?:media/[A-Za-z0-9_\-./]+?|assets/hero-bg))\.jpg\b')
def sub(m):
    rel = m.group(2) + ".jpg"
    if rel in names: return m.group(1) + m.group(2) + ".webp"
    return m.group(0)
total = 0
for t in targets:
    if t.name == "convert-webp.py": continue
    s = t.read_text(encoding="utf-8")
    s2, n = pat.subn(sub, s)
    if n:
        t.write_text(s2, encoding="utf-8"); total += n
print(f"{total} references rewritten")
# code that BUILDS jpg names at runtime: gallery.html srcset + index.html filmstrip + style.css url()
fixes = {
    "gallery.html": [("replace(/\\.jpg$/, '')", "replace(/\\.webp$/, '')"), ("'-400.jpg 400w, ' + b + '-600.jpg 600w, '", "'-400.webp 400w, ' + b + '-600.webp 600w, '")],
    "index.html": [("replace(/\\.jpg$/,'')", "replace(/\\.webp$/,'')"), ("base + '.jpg\" srcset=\"' + base + '.jpg 1x, ' + base + '-2x.jpg 2x\"", "base + '.webp\" srcset=\"' + base + '.webp 1x, ' + base + '-2x.webp 2x\"")],
    "assets/style.css": [('url("hero-bg.jpg")', 'url("hero-bg.webp")')],
}
for f, reps in fixes.items():
    s = (root / f).read_text(encoding="utf-8")
    for a, b in reps:
        assert s.count(a) == 1, (f, a, s.count(a))
        s = s.replace(a, b)
    (root / f).write_text(s, encoding="utf-8")
print("runtime builders fixed")
# delete the JPEGs (git rm so the deletion is staged)
subprocess.run(["git", "rm", "-q", "--cached"] + converted, cwd=root, check=True)
for rel in converted: (root / rel).unlink()
print("jpegs removed")
