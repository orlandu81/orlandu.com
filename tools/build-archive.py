#!/usr/bin/env python3
"""Home page reading room: write the pool of older stories it rotates through.

The three cards in index.html's `.grid.readroom` are the no-script default. The inline script there swaps in three
stories from ARCHIVE, a different three each week. ARCHIVE is generated here from stories.html: every story card
that does not carry a New badge (the featured card, the timeline and the magazines' "Off the beat" row are skipped).
Run after any Stories edit; it rewrites the block between the archive-pool markers in index.html.
"""
import html, json, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
sto = (root / "stories.html").read_text(encoding="utf-8")
body = sto[:sto.index('<section id="offbeat">')]
idx_html = (root / "index.html").read_text(encoding="utf-8")
ledger = set(re.findall(r'href="([^"#]+)', re.search(r'<div class="ledger">(.*?)</div>\s*</section>', idx_html, re.S).group(1)))
pool = []
mon_end = body.index('<section id="arcade">')
for m in re.finditer(r'<a class="card linked" href="([^"]+)">(.*?)</a>', body, re.S):
    href, c = m.groups()
    if 'badge new' in c or href == "timeline.html" or href in ledger: continue  # not one the Latest ledger already shows
    src = re.search(r'srcset="(\S+) 800w, (\S+) 1200w"', c)
    kick = re.search(r'<span class="badge [^"]*">(.*?)</span>', c).group(1)
    h3 = re.search(r"<h3>(.*?)</h3>", c, re.S).group(1)
    p = re.search(r"<p>(.*?)</p>", c, re.S).group(1)
    sec = "m" if m.start() < mon_end else "o"
    pool.append({"sec": sec, "u": href, "s": src.group(1), "l": src.group(2), "k": html.unescape(kick), "t": html.unescape(h3), "p": html.unescape(p)})
# Interleave the monitor stories with the rest so a week's three are not all Sony pieces while the others last.
M = [x for x in pool if x["sec"] == "m"]; O = [x for x in pool if x["sec"] != "m"]
for x in pool: del x["sec"]
pool = []
while M or O:
    if O: pool.append(O.pop(0))
    if M: pool.append(M.pop(0))
assert len(pool) >= 6, len(pool)
idx = root / "index.html"; s = idx.read_text(encoding="utf-8")
a, b = "/* archive-pool:start */", "/* archive-pool:end */"
i, j = s.index(a) + len(a), s.index(b)
new = "\nvar ARCHIVE=" + json.dumps(pool, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + ";\n"
if s[i:j] != new: idx.write_text(s[:i] + new + s[j:], encoding="utf-8")
print(f"archive pool: {len(pool)} stories")
