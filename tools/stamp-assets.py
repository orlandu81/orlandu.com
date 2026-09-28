#!/usr/bin/env python3
"""Stamp every page's CSS/JS reference with a short content hash (?v=xxxxxxxx).

assets/*.css and *.js are served with stale-while-revalidate for a week, so without a
version a returning visitor can get a new page with an old stylesheet or script. The hash
changes only when the file does. RUN BEFORE EVERY PUSH (after build-search-index.py):
    python3 tools/stamp-assets.py
"""
import hashlib, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
pat = re.compile(r'((?:src|href)="assets/([\w.-]+\.(?:css|js)))(?:\?v=[0-9a-f]+)?"')
hashes, changed = {}, 0
def h(name):
    if name not in hashes:
        hashes[name] = hashlib.sha256((root / "assets" / name).read_bytes()).hexdigest()[:8]
    return hashes[name]
for page in sorted(root.glob("*.html")):
    s = page.read_text(encoding="utf-8")
    t = pat.sub(lambda m: f'{m.group(1)}?v={h(m.group(2))}"', s)
    if t != s:
        page.write_text(t, encoding="utf-8"); changed += 1
print(f"{changed} pages stamped; " + ", ".join(f"{k}={v}" for k, v in sorted(hashes.items())))
