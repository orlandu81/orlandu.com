#!/usr/bin/env python3
"""Pre-render the site footer into every page's <footer class="site"> shell.

site.js still injects the footer at runtime (and overwrites this markup with an identical
string), so nothing changes for a browser. The static copy exists for crawlers that do not
run JavaScript — Bing's secondary crawl, the AI search bots (GPTBot, ClaudeBot, PerplexityBot)
and feed/link tools — so every page carries its full set of internal links in raw HTML.

Idempotent: it replaces whatever is between <footer class="site"> and </footer>, so run it
after ANY edit to the footer block or the NAV array in assets/site.js. 404.html is skipped
on purpose (noindex, and it uses absolute /assets paths).

    python3 tools/build-static-footer.py        # from the repo root
"""
import re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
js = (root / "assets" / "site.js").read_text(encoding="utf-8")

nav_src = re.search(r"const NAV = \[(.*?)\];", js, re.S).group(1)
NAV = re.findall(r'\["([^"]+)",\s*"([^"]+)"\]', nav_src)
assert NAV and NAV[0] == ("/", "Home"), NAV

footer_js = re.search(r"footer\.innerHTML =\s*(.*?);\n  \}", js, re.S).group(1)
assert footer_js.count("NAV.slice(1)") == 1, "footer builder changed shape — update this tool"
parts = re.findall(r"'((?:[^'\\]|\\.)*)'", footer_js)
static = "".join(parts)
# The .map() template pieces ('<a href="' + href + '">' + label + '</a>') come through as one
# empty anchor; drop it and splice the real nav links in its place.
assert static.count('<a href=""></a>') == 1
nav_links = "".join(f'<a href="{h}">{l}</a>' for h, l in NAV[1:])
static = static.replace('<a href=""></a>', nav_links)
assert "<div><span>Pages</span>" + nav_links in static
assert "San Clemente" not in static

pat = re.compile(r'<footer class="site">.*?</footer>', re.S)
changed = 0
for p in sorted(root.glob("*.html")):
    if p.name == "404.html":
        continue
    s = p.read_text(encoding="utf-8")
    if not pat.search(s):
        continue
    new = pat.sub(lambda m: f'<footer class="site">{static}</footer>', s, count=1)
    if new != s:
        p.write_text(new, encoding="utf-8"); changed += 1
print(f"static footer: {changed} pages updated, {len(NAV) - 1} nav links")
