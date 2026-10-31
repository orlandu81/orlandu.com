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
# Review nine (2026-10-30): the footer no longer maps NAV; its four columns are literal strings.
assert "NAV.slice(1)" not in footer_js, "footer builder maps NAV again — update this tool"
parts = re.findall(r"'((?:[^'\\]|\\.)*)'", footer_js)
static = "".join(parts).replace("\\'", "'")
for col in ("Collection", "Reading", "Tools &amp; reference", "The arcade"):
    assert f"<div><span>{col}</span>" in static, col
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
