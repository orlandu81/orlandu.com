#!/usr/bin/env python3
"""Build the open datasets under data/ from the pages that publish them, plus the JSON twin of the
search index that api/mcp.js reads. Run before every push, AFTER build-search-index.py:

    python3 tools/build-datasets.py

Datasets (CC BY 4.0, credit "Orlandu's Arcade"; the photos they link to stay © Orlandu's Arcade):
  data/sony-monitor-specs.{json,csv}     — monitors.html#specs, the fleet spec table
  data/playchoice-10-library.{json,csv}  — playchoice-10.html#carts, the 52 boards on the wall
  data/console-video-out.{json,csv}      — consoles.html#mods, how each console reaches the glass
  data/search-index.json                 — assets/search-index.js as JSON (not a dataset; for the MCP server)
The page that owns each table carries a schema.org Dataset node pointing at these files.
"""
import csv, html, io, json, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://www.orlandu.com/"
LICENSE = "https://creativecommons.org/licenses/by/4.0/"
CREDIT = "Orlandu's Arcade (https://www.orlandu.com)"
(root / "data").mkdir(exist_ok=True)

def text(h):
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", h))).strip()

def table_rows(src, table_id):
    t = re.search(r'<table[^>]*id="%s"[^>]*>.*?</table>' % table_id, src, re.S).group(0)
    head = [text(c) for c in re.findall(r"<th[^>]*>(.*?)</th>", re.search(r"<thead>.*?</thead>", t, re.S).group(0), re.S)]
    rows = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", re.search(r"<tbody>.*?</tbody>", t, re.S).group(0), re.S):
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.S)
        rows.append(cells)
    return head, rows

def write(name, meta, rows, fields):
    (root / f"data/{name}.json").write_text(json.dumps({**meta, "license": LICENSE, "credit": CREDIT, "rows": rows}, ensure_ascii=False, indent=1), encoding="utf-8")
    buf = io.StringIO(); w = csv.DictWriter(buf, fieldnames=fields, lineterminator="\n"); w.writeheader()
    for r in rows: w.writerow({k: r.get(k, "") for k in fields})
    (root / f"data/{name}.csv").write_text(buf.getvalue(), encoding="utf-8")
    print(f"data/{name}: {len(rows)} rows")

# ── Sony monitor specs ──
src = (root / "monitors.html").read_text(encoding="utf-8")
head, rows = table_rows(src, "fleettable")
keys = ["model", "family", "display", "size", "resolution", "formats", "hd", "rgb_component", "sd_sdi", "hd_sdi_3g", "option_slots", "weight", "era", "units", "profile_url"]
assert len(head) == 13, head
out = []
for cells in rows:
    first = cells[0]
    model = text(re.search(r"<a[^>]*>(.*?)</a>", first, re.S).group(1))
    fam = text(re.search(r'<span class="fam">(.*?)</span>', first, re.S).group(1))
    href = re.search(r'href="([^"]+)"', first).group(1)
    vals = [model, fam] + [text(c) for c in cells[1:]] + [SITE + href]
    out.append(dict(zip(keys, vals)))
write("sony-monitor-specs", {
    "dataset": "Sony professional monitors at Orlandu's Arcade — specifications",
    "description": "Display type, size, resolution, formats, inputs, option slots, weight and era for every Sony PVM, BVM and LMD model in the collection, as published on the fleet page.",
    "source": SITE + "monitors.html#specs", "columns": {k: h for k, h in zip(keys[2:14], head[1:])}}, out, keys)

# ── PlayChoice-10 library (the 52 original boards on the wall) ──
src = (root / "playchoice-10.html").read_text(encoding="utf-8")
sec = re.search(r'<section id="carts">.*?</section>', src, re.S).group(0)
lib = []
for fig in re.findall(r"<figure[^>]*>.*?</figure>", sec, re.S):
    title = text(re.search(r"<figcaption>(.*?)</figcaption>", fig, re.S).group(1))
    full = re.search(r'data-full="([^"?]+)', fig); thumb = re.search(r'src="([^"?]+)', fig)
    lib.append({"title": title, "board_photo": SITE + full.group(1) if full else "", "thumbnail": SITE + thumb.group(1) if thumb else ""})
assert len(lib) == 52, len(lib)
write("playchoice-10-library", {
    "dataset": "The PlayChoice-10 library — every original game board, photographed",
    "description": "The 52 games Nintendo released for the PlayChoice-10 arcade system, each with a photograph of its original game board from the cart wall at Orlandu's Arcade. Conversions and custom builds are not included.",
    "source": SITE + "playchoice-10.html#carts"}, lib, ["title", "board_photo", "thumbnail"])

# ── Console video out ──
src = (root / "consoles.html").read_text(encoding="utf-8")
head, rows = table_rows(src, "modtable")
ckeys = ["console", "work_done", "video_out", "into_the_chain"]
crows = [dict(zip(ckeys, [text(c) for c in cells])) for cells in rows]
write("console-video-out", {
    "dataset": "How each console at Orlandu's Arcade reaches a Sony professional monitor",
    "description": "For each console whose signal path the site states: the modification (if any), the video output it uses, and the chain from console to monitor.",
    "source": SITE + "consoles.html#mods", "columns": dict(zip(ckeys, head))}, crows, ckeys)

# ── Search index as JSON (for api/mcp.js) ──
js = (root / "assets/search-index.js").read_text(encoding="utf-8")
m = re.search(r"const SEARCH_INDEX = (\[.*\]);?\s*$", js, re.S)
idx = json.loads(m.group(1))
(root / "data/search-index.json").write_text(json.dumps(idx, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"data/search-index.json: {len(idx)} entries")
