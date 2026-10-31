#!/usr/bin/env python3
"""Build feed.xml (RSS 2.0) and feed.json (JSON Feed 1.1) — "what's new on orlandu.com" (2026-10-28).

Items come from the home page's "Latest from the arcade" ledger and the Stories grid; each item's date is the
day its linked page first entered git (the publish date), falling back to the sitemap's <lastmod>. The site shows
no date stamps on its pages by David's rule — the feed is the one place a date is needed, and it is the page's
own publish date, not a stamp in the copy. New registry entries have their own live feed at
/api/registry?feed=rss (built by the function, not here). Run before every push, after any ledger or story edit:
    python3 tools/build-feed.py
"""
import html, json, pathlib, re, subprocess, sys
from datetime import datetime, timezone
from email.utils import format_datetime

root = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://www.orlandu.com/"
def git(*a): return subprocess.run(["git", *a], cwd=root, capture_output=True, text=True).stdout
if git("rev-parse", "--is-shallow-repository").strip() == "true":
    sys.exit("shallow clone: run  git fetch --unshallow  first, or the feed dates will be wrong")

def text(h):
    h = re.sub(r"<[^>]+>", "", h)
    return re.sub(r"\s+", " ", html.unescape(h)).strip()

lastmod = dict(re.findall(r"<loc>https://www\.orlandu\.com/([^<]*)</loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})</lastmod>", (root / "sitemap.xml").read_text(encoding="utf-8")))
def pt_day(epoch):
    """A commit time as its Pacific calendar day (an evening PT push is that day, not the next UTC date)."""
    from zoneinfo import ZoneInfo
    return datetime.fromtimestamp(int(epoch.strip()), ZoneInfo("America/Los_Angeles")).date().isoformat()

def first_commit_day(page):
    out = git("log", "--diff-filter=A", "--format=%ct", "--", page).strip().split("\n")
    d = pt_day(out[-1]) if out and out[-1].strip() else ""
    return d or lastmod.get(page) or lastmod.get("")

def ledger_day(title):
    needle = html.escape(title, quote=False).split(" &mdash; ")[0][:40]
    out = git("log", "-S" + needle, "--format=%ct", "--", "index.html").strip().split("\n")
    return pt_day(out[-1]) if out and out[-1].strip() else ""

items = []  # (href, title, summary, kind)
idx = (root / "index.html").read_text(encoding="utf-8")
ledger = re.search(r'<div class="ledger">(.*?)</div>\s*</section>', idx, re.S).group(1)
for m in re.finditer(r'<div class="card">\s*<span class="badge[^"]*">(.*?)</span>\s*<h3>(.*?)</h3>\s*<p>(.*?)</p>', ledger, re.S):
    badge, h3, p = m.groups()
    link = re.search(r'href="([^"]+)"', p)
    items.append((link.group(1) if link else "", text(h3), text(p), text(badge)))
sto = (root / "stories.html").read_text(encoding="utf-8")
for m in re.finditer(r'<a class="card linked[^"]*" href="([^"]+)">(.*?)</a>', sto, re.S):
    href, body = m.groups()
    h3 = re.search(r"<h3>(.*?)</h3>", body, re.S); p = re.search(r"<p>(.*?)</p>", body, re.S)
    if not h3: continue
    items.append((href, text(h3.group(1)), text(p.group(1)) if p else "", "Story"))

seen, out = set(), []
for href, title, summary, kind in items:
    page = href.split("#")[0]
    if not page or not page.endswith(".html") or not (root / page).exists(): continue
    key = page
    if key in seen: continue
    seen.add(key)
    # A ledger card about an old page (a topper arriving on signage.html) is dated by the day its card entered
    # index.html; a story or a new page by the day the page itself entered git.
    date = ledger_day(title) if kind != "Story" else first_commit_day(page)
    out.append({"id": SITE + href, "url": SITE + href, "title": title, "summary": summary, "kind": kind, "date": date or first_commit_day(page)})
out.sort(key=lambda i: i["date"], reverse=True)
out = out[:30]

now = datetime.now(timezone.utc)
def rfc(d): return format_datetime(datetime.strptime(d, "%Y-%m-%d").replace(hour=17, tzinfo=timezone.utc))
rss = ['<?xml version="1.0" encoding="UTF-8"?>', '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">', "<channel>",
       "<title>Orlandu's Arcade — what's new</title>", f"<link>{SITE}</link>",
       "<description>New pages, stories, tools and arrivals at Orlandu's Arcade — a private arcade and Sony professional monitor collection in Orange County, California. New registry entries have their own feed at https://www.orlandu.com/api/registry?feed=rss</description>",
       "<language>en-us</language>", f'<atom:link href="{SITE}feed.xml" rel="self" type="application/rss+xml"/>',
       f"<lastBuildDate>{format_datetime(now)}</lastBuildDate>", f"<image><url>{SITE}assets/favicon-192.png</url><title>Orlandu's Arcade</title><link>{SITE}</link></image>"]
for i in out:
    rss.append(f"<item><title>{html.escape(i['title'])}</title><link>{html.escape(i['url'])}</link><guid isPermaLink=\"true\">{html.escape(i['url'])}</guid><pubDate>{rfc(i['date'])}</pubDate><category>{html.escape(i['kind'])}</category><description>{html.escape(i['summary'])}</description></item>")
rss += ["</channel>", "</rss>", ""]
jf = {"version": "https://jsonfeed.org/version/1.1", "title": "Orlandu's Arcade — what's new", "home_page_url": SITE, "feed_url": SITE + "feed.json",
      "description": "New pages, stories, tools and arrivals at Orlandu's Arcade. New registry entries: https://www.orlandu.com/api/registry?feed=rss",
      "icon": SITE + "assets/favicon-192.png", "language": "en-US",
      "items": [{"id": i["id"], "url": i["url"], "title": i["title"], "summary": i["summary"], "tags": [i["kind"]], "date_published": i["date"] + "T17:00:00Z"} for i in out]}
(root / "feed.xml").write_text("\n".join(rss), encoding="utf-8")
(root / "feed.json").write_text(json.dumps(jf, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"feed: {len(out)} items, newest {out[0]['date']} ({out[0]['title']}), oldest {out[-1]['date']}")
