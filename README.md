# orlandu.com — Orlandu's Arcade

Static site for Orlandu's Arcade, hosted on GitHub Pages with the custom domain
`www.orlandu.com` (see `CNAME`). Maintained by Claude on David's behalf.

## Structure

- `index.html` — home (hero, section cards, "latest" feed)
- `games.html` — arcade cabinets, pinball, Nintendo signage, console library
- `monitors.html` — Sony pro monitor fleet roster + link to the magazine
- `gallery.html` — photo/video wall, driven by `assets/gallery-data.js`
- `projects.html` — bench queue / planned / completed
- `forsale.html` — current eBay listings
- `wanted.html` — the hunt list
- `about.html` — story + contact links
- `trinitron-fleet-vol1.html` — the self-contained Trinitron Fleet magazine
- `404.html` — game over screen
- `assets/` — `style.css` (house style), logos, favicons, `gallery-data.js`
- `media/` — gallery photos/videos, organized as `media/YYYY/filename`

## Maintenance notes (for Claude)

- **Adding media David sends:** compress images to ~1600px wide JPEG (quality ~82),
  drop into `media/YYYY/`, add an entry at the TOP of the `GALLERY` array in
  `assets/gallery-data.js` with a title/caption/category, and update the
  "Latest from the arcade" cards on `index.html` if noteworthy. Videos: keep under
  ~90MB (GitHub hard limit 100MB); H.264 MP4; consider a poster frame.
- **Placeholders:** links marked `data-placeholder` (eBay store, eBay listing,
  Instagram, KLOV profile) still need real URLs from David.
- **Style:** colors/fonts are CSS variables at the top of `assets/style.css`.
  Fire gradient + cyan = from the logo. Keep the Neon Grid look consistent with
  the Trinitron Fleet magazine.
- **Facts:** collection details come from David; confirm before adding claims.
- Deploy = push to `main`; Pages serves from the repo root (`.nojekyll` present).
