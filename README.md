# orlandu.com — Orlandu's Arcade

**Live site: https://www.orlandu.com**

Orlandu's Arcade is a private arcade and working collection in Orange County, California:
arcade cabinets, pinball machines, RGB-modded retro consoles, and a fleet of Sony
professional broadcast monitors (PVM, BVM, LMD), all documented machine by machine —
profiles, work logs, buying guides, a glossary, and the Sony AMS-100 monograph.

## How it's built

- Plain HTML, CSS and JavaScript — no build step, no framework. Served from the repo root.
- Hosted on **Vercel**, which auto-deploys `main`. `vercel.json` holds the headers and redirects.
- Shared header, footer, nav, site search and lightbox come from `assets/site.js`;
  the house style is `assets/style.css`.
- `tools/` holds the pre-push generators (search index, asset stamps, sitemap lastmod,
  timeline, glossary data). `CLAUDE.md` is the maintainer's working notes.
- `sitemap.xml`, `robots.txt` and `llms.txt` describe the site to crawlers.

## Rights

Photography © Orlandu's Arcade. Game logos and characters are the property of their
respective owners. Reuse of photos: see https://www.orlandu.com/about.html#photo-use
