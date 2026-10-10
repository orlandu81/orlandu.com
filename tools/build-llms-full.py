#!/usr/bin/env python3
"""Build llms-full.txt (the whole site's readable text as Markdown, one file) and data/pages.json
(the same text per page, which api/mcp.js serves to AI agents). Run before every push, AFTER
build-search-index.py, from the repo root:

    python3 tools/build-llms-full.py

Page order follows llms.txt; sitemap pages that llms.txt doesn't list are appended. gallery.html is
client-rendered, so its entry is built from assets/gallery-data.js captions. Text only — no images,
no nav chrome, no injected UI. The site's prose stays © Orlandu's Arcade; this file just makes it
one fetch for an agent instead of forty-eight.
"""
import html, json, pathlib, re
from html.parser import HTMLParser

root = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://www.orlandu.com/"
SKIP_PAGES = {"404.html", "ebay-callback.html", "tesla-callback.html"}
SKIP_TAGS = {"script", "style", "noscript", "button", "form", "input", "select", "textarea", "svg", "template"}
SKIP_CLASSES = {"machnav", "rt", "sr-only", "sharerow", "btn", "skip", "explore"}
BLOCK = {"p", "div", "section", "article", "header", "footer", "aside", "figure", "figcaption", "ul", "ol", "li",
         "table", "thead", "tbody", "tr", "dl", "dt", "dd", "blockquote", "pre", "h1", "h2", "h3", "h4", "h5", "h6", "main", "nav"}


class MD(HTMLParser):
    """A small HTML→Markdown walker tuned to this site's markup."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.stack, self.skip = [], [], 0
        self.row, self.in_row, self.cell, self.in_cell = [], False, [], False
        self.table_rows, self.in_table = [], False
        self.list_stack, self.href = [], None
        self.pre = 0
        self.heading = 0

    def _cls(self, attrs):
        return set((dict(attrs).get("class") or "").split())

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if self.skip or tag in SKIP_TAGS or (self._cls(attrs) & SKIP_CLASSES) or a.get("hidden") is not None or a.get("aria-hidden") == "true":
            self.skip += 1; self.stack.append((tag, True)); return
        self.stack.append((tag, False))
        if tag == "br":
            self._emit("\n" if not (self.in_cell or self.heading) else " ")
        elif tag in ("h1", "h2", "h3", "h4"):
            self.heading += 1; self._emit("\n\n" + "#" * int(tag[1]) + " ")
        elif tag == "p":
            self._emit("\n\n")
        elif tag in ("ul", "ol"):
            self.list_stack.append(0 if tag == "ol" else None); self._emit("\n")
        elif tag == "li":
            if self.list_stack and self.list_stack[-1] is not None:
                self.list_stack[-1] += 1; self._emit(f"\n{self.list_stack[-1]}. ")
            else:
                self._emit("\n- ")
        elif tag == "dt":
            self._emit("\n- **")
        elif tag == "dd":
            self._emit(" ")
        elif tag == "figcaption":
            self._emit("\n\n*")
        elif tag == "blockquote":
            self._emit("\n\n> ")
        elif tag == "pre":
            self.pre += 1; self._emit("\n\n```\n")
        elif tag == "table":
            self.in_table, self.table_rows = True, []
        elif tag == "tr":
            self.in_row, self.row = True, []
        elif tag in ("td", "th"):
            self.in_cell, self.cell = True, []
        elif tag == "a":
            href = a.get("href") or ""
            self.href = href if href and not href.startswith(("#", "mailto:", "javascript:")) else None
        elif tag in ("strong", "b") and not self.in_cell:
            self._emit("**")
        elif tag in ("em", "i") and not self.in_cell:
            self._emit("*")
        elif tag == "img":
            alt = (a.get("alt") or "").strip()
            if alt and not self.in_cell:
                self._emit(f"\n\n[Photo: {alt}]\n\n")
        elif tag == "small":
            self._emit(" ")

    def handle_endtag(self, tag):
        if not self.stack:
            return
        t, skipped = self.stack.pop()
        if skipped:
            self.skip -= 1; return
        if tag in ("h1", "h2", "h3", "h4"):
            self.heading = max(0, self.heading - 1); self._emit("\n")
        elif tag in ("p", "figure", "blockquote"):
            self._emit("\n")
        elif tag in ("ul", "ol"):
            if self.list_stack: self.list_stack.pop()
            self._emit("\n")
        elif tag == "dt":
            self._emit("**:")
        elif tag == "figcaption":
            self._emit("*\n")
        elif tag == "pre":
            self.pre -= 1; self._emit("\n```\n")
        elif tag in ("td", "th"):
            self.row.append(re.sub(r"\s+", " ", "".join(self.cell)).strip()); self.in_cell = False
        elif tag == "tr":
            if self.row: self.table_rows.append(self.row)
            self.in_row = False
        elif tag == "table":
            self._emit("\n\n" + self._table() + "\n")
            self.in_table = False
        elif tag == "a":
            if self.href:
                url = self.href if self.href.startswith("http") else SITE + self.href.lstrip("/")
                self._emit(f" ({url})")
            self.href = None
        elif tag in ("strong", "b") and not self.in_cell:
            self._emit("**")
        elif tag in ("em", "i") and not self.in_cell:
            self._emit("*")

    def handle_data(self, data):
        if self.skip:
            return
        if self.in_cell:
            self.cell.append(data); return
        if self.in_table:
            return
        self._emit(data if self.pre else re.sub(r"\s+", " ", data))

    def _emit(self, s):
        if self.in_cell:
            self.cell.append(s)
        else:
            self.out.append(s)

    def _table(self):
        rows = [r for r in self.table_rows if any(c for c in r)]
        if not rows: return ""
        w = max(len(r) for r in rows)
        rows = [r + [""] * (w - len(r)) for r in rows]
        head, body = rows[0], rows[1:]
        esc = lambda c: c.replace("|", "\\|")
        lines = ["| " + " | ".join(esc(c) for c in head) + " |", "|" + "---|" * w]
        lines += ["| " + " | ".join(esc(c) for c in r) + " |" for r in body]
        return "\n".join(lines)

    def text(self):
        t = "".join(self.out)
        t = re.sub(r"[ \t]+\n", "\n", t)
        t = re.sub(r"\n{3,}", "\n\n", t)
        t = re.sub(r" {2,}", " ", t)
        return t.strip()


def page_text(src):
    m = re.search(r"<main\b.*?</main>", src, re.S) or re.search(r'<div class="doc"[^>]*>.*?</div>\s*<script', src, re.S) or re.search(r"<body\b.*?</body>", src, re.S)
    p = MD(); p.feed(m.group(0) if m else src); return p.text()


def meta(src, name):
    m = re.search(r'<meta name="%s" content="([^"]*)"' % name, src) or re.search(r'<meta property="%s" content="([^"]*)"' % name, src)
    return html.unescape(m.group(1)) if m else ""


def title_of(src):
    m = re.search(r"<title>(.*?)</title>", src, re.S)
    t = html.unescape(m.group(1).strip()) if m else ""
    return re.sub(r"\s+[—–-]\s+Orlandu.*$", "", t)


def gallery_text():
    js = (root / "assets/gallery-data.js").read_text(encoding="utf-8")
    def dec(v):
        v = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), v).replace('\\"', '"').replace("\\'", "'")
        return html.unescape(re.sub(r"<[^>]+>", "", v)).strip()
    out = []
    for c in re.findall(r"\{([^{}]*?)\}", js, re.S):
        t = re.search(r'title:\s*"((?:[^"\\]|\\.)*)"', c); cap = re.search(r'caption:\s*"((?:[^"\\]|\\.)*)"', c)
        if t:
            tt, cc = dec(t.group(1)), (dec(cap.group(1)) if cap else "")
            out.append(f"- **{tt}**" + (f": {cc}" if cc else ""))
    return "\n".join(out)


# page order: llms.txt first, then anything else in the sitemap
order = re.findall(r"\]\(https://www\.orlandu\.com/([^)]*)\)", (root / "llms.txt").read_text(encoding="utf-8"))
order = [("index.html" if u in ("", "/") else u.split("#")[0]) for u in order]
seen, pages = set(), []
for u in order:
    if u.endswith(".html") and u not in seen and (root / u).exists():
        seen.add(u); pages.append(u)
for loc in re.findall(r"<loc>https://www\.orlandu\.com/([^<]*)</loc>", (root / "sitemap.xml").read_text(encoding="utf-8")):
    u = loc or "index.html"
    if u.endswith(".html") and u not in seen and u not in SKIP_PAGES and (root / u).exists():
        seen.add(u); pages.append(u)

if "index.html" in pages:
    pages.remove("index.html")
pages.insert(0, "index.html")
if "mcp.html" in pages:  # the agent page goes last — the content leads
    pages.remove("mcp.html"); pages.append("mcp.html")

def build():
    records, chunks = [], []
    for u in pages:
        src = (root / u).read_text(encoding="utf-8")
        if 'name="robots" content="noindex' in src:
            continue
        url = SITE if u == "index.html" else SITE + u
        t, d = title_of(src), meta(src, "description")
        body = gallery_text() if u == "gallery.html" else page_text(src)
        if u == "gallery.html":
            body = "The gallery is lit, in-room photography of the machines and monitors. Captions:\n\n" + body
        records.append({"url": url, "slug": u[:-5] if u != "index.html" else "home", "title": t, "description": d, "text": body})
        chunks.append(f"\n\n---\n\n# {t}\n\nURL: {url}\n\n{d}\n\n{body}")

    header = (
        "# Orlandu's Arcade — full text\n\n"
        "> The complete readable text of https://www.orlandu.com in one file, for AI assistants and agents. "
        "A private arcade and working collection in Orange County, California: arcade cabinets, pinball, RGB-modded "
        "consoles, and a fleet of Sony professional broadcast monitors (PVM, BVM, LMD), each documented with its work log. "
        "Short index: https://www.orlandu.com/llms.txt · Open datasets (CC BY 4.0): https://www.orlandu.com/mcp.html#the-datasets · "
        "MCP server for agents: https://www.orlandu.com/api/mcp (details at https://www.orlandu.com/mcp.html). "
        "Text and photography © Orlandu's Arcade; quoting with attribution is welcome. Photos are not included here.\n"
    )
    (root / "llms-full.txt").write_text(header + "".join(chunks) + "\n", encoding="utf-8")
    (root / "data").mkdir(exist_ok=True)
    (root / "data/pages.json").write_text(json.dumps(records, ensure_ascii=False, indent=0), encoding="utf-8")
    return records

records = build()
words = sum(len(r["text"].split()) for r in records)
# keep the "about N words" figure on mcp.html and in llms.txt honest (rounded to the nearest thousand)
approx = f"about {round(words, -3):,} words"
for f in ("mcp.html", "llms.txt"):
    fp = root / f
    if fp.exists():
        t = fp.read_text(encoding="utf-8"); t2 = re.sub(r"about [\d,]+ words", approx, t)
        if t2 != t:
            fp.write_text(t2, encoding="utf-8"); print(f"{f}: word count → {approx}"); records = build()
print(f"llms-full.txt: {len(records)} pages, {words:,} words, {(root / 'llms-full.txt').stat().st_size // 1024} KB; data/pages.json written")
