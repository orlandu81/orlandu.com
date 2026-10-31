# orlandu.com — working notes for Claude

> **BEFORE YOU PUSH ANYTHING — ASK DAVID FIRST.** Every push stores a full ~96 MB copy of
> the site on Vercel and the Hobby storage allowance is nearly used up. When an edit is
> ready, do not push it. Ask, as a multiple-choice question: **"Push now, or hold it for
> the next batch?"** Only push on "now". If he says hold, leave the commit local and say
> so plainly at the end of the session. Do this every time, including one-line changes,
> unless he already said "push now" in the request. Full rule under "Deploying" below.

Static site for Orlandu's Arcade: a garage arcade + game room, ~10 machines,
13 Sony professional monitors, ~25 consoles. Owner: David (GitHub `orlandu81`).

No build step. Plain HTML/CSS/JS served from the repo root.

## Deploying — read this first

### Before every push, run these, in this order (2026-09-27; list grown since)

```
python3 tools/build-timeline.py      # only if a timeline thumb/year changed; it rewrites timeline.html
python3 tools/build-llms-full.py     # llms-full.txt + data/pages.json (what the MCP server reads); also refreshes the word count on mcp.html/llms.txt
python3 tools/build-search-index.py  # assets/search-index.js is generated
python3 tools/build-datasets.py      # data/*.json|csv from the fleet table, the PC-10 wall, the console table; data/search-index.json (after the index)
python3 tools/build-feed.py          # feed.xml + feed.json from the Latest ledger and the Stories grid (dates from git); run after any ledger/story edit
python3 tools/stamp-assets.py        # ?v=<hash> on every style.css / site.js / gallery-data.js reference
python3 tools/update-lastmod.py      # sitemap <lastmod> = the day each page's <main> content last changed
python3 tools/build-static-footer.py # only if the footer block or NAV in site.js changed; re-renders the static footer copy
node tools/test-mcp.mjs              # 200+ contract checks on api/mcp.js (transport, every tool, bad input) — must print "0 failed"
node tools/eval-search.mjs           # search quality: 218 queries vs both search paths; top-1 should stay ≥ 90 %, top-3 ≥ 97 %
```

`python3 tools/build-registry-pages.py` goes FIRST in that list whenever `data/registry-models.json` or the
builder itself changed (it writes registry.html, registry-models.html, registry-submit.html and the 96
registry-<model>.html pages with bare asset refs AND an empty `<footer class="site">` shell; run `stamp-assets.py` and
`build-static-footer.py` after it, or the 99 pages ship without the crawler footer — caught 10/25). See "The Orlandu Registry" below.

**The footer is pre-rendered into every page's `<footer class="site">` shell (2026-10-09)** so crawlers
that don't run JavaScript (Bing's secondary crawl, GPTBot/ClaudeBot/PerplexityBot) see the full
internal-link set in raw HTML. site.js still overwrites it at runtime with the identical string.
Don't hand-edit the static copy — change site.js and run the tool; it asserts the two match.
`stamp-assets.py` exists because `assets/*.css|js` are served stale-while-revalidate for a week:
without it a returning visitor gets new HTML with an old stylesheet or script. Any generator that
writes a page (the timeline tool, the magazine `build_page.py` scripts) emits bare references, so
stamp AFTER generating. `update-lastmod.py` needs full history (`git fetch --unshallow`) — run it
in a full clone, not the depth-20 deploy clone. It ignores head-only edits and re-stamps on purpose.
Both it and `build-feed.py` date commits by their **Pacific** day (2026-10-30), so an evening push
from the UTC laptop VM no longer stamps tomorrow — no more hand-reverting dates after a run.

**Titles (2026-10-09):** `<title>` front-loads the searchable term and spells out what the page
holds — "Sony BVM-20E1U: Specs, BKM Cards & Work Log — Orlandu's Arcade", "Nintendo 64 RGB Mod: Signal
Path & Work Log — …" — at 58–65 characters. `og:title` stays the short form. The site search shows
the H1, not the title, so a long title costs nothing there. A new profile page follows the same shape.

**Quick answers (2026-10-09/10):** the pvm-20l5-buying-guide, pvm-vs-bvm, crt-field-guide, mini-cute,
vs-unisystem and connect-console-to-pvm pages end with an `h2.sec` "Quick answers" + a single-column
`.grid` of `.card`s (h3 question, p answer) — plain content, deliberately NO FAQPage schema (Google
stopped showing FAQ rich results for non-government sites in 2023). Answers come from the page's own
facts, no prices (David dropped the 20L5 price Q&A). pvm-vs-bvm.html also carries an 8-row
`table.spec#pvmbvm` side-by-side. `connect-console-to-pvm.html` (How-To, in the story chain between
pvm-vs-bvm and crt-field-guide) carries two claims David confirmed 10/10 that are not elsewhere on the
site: 75 Ω termination on the last/only monitor on a loop-through line, and setting the input to RGB on
a monitor whose BNCs take RGB or component (the 20L5). Its thumb/OG are cut from the BVM pair photo
(chrome exception; the page has no media of its own). `media/pvm-20l5-checklist.pdf` is in the sitemap
WITHOUT a `<lastmod>` on purpose — `tools/update-lastmod.py` reads every loc with a lastmod as UTF-8 text
and would choke on the PDF.

**Fonts:** `style.css` defines metric-matched `"… Fallback"` faces (Arial/Liberation/Roboto scaled
with `size-adjust` + ascent/descent overrides) second in each font stack, so text doesn't reflow
when the web font arrives. Page-level `font-family` declarations must keep the fallback in the
stack too. Matched means average width, not every line: a long H1 or lede can still break onto one line
more or fewer when the font swaps, which is the mobile CLS PageSpeed reports on some long reads (buying
guide 0.198 live, 10-23). Rajdhani 400 and Orbitron 800 were retuned against the site's own H1/lede/h2
strings on 10-23 (size-adjust ×1.024 / ×1.008, overrides ÷ the same), which cut swaps that move in-view
content from 60 to 41 of 250 page×phone-width cases. The only complete fix is `font-display:optional` on
the display faces — David's call, since a first visit on a slow phone would then show the fallback. **First-screen images:** the first photos on a page are NOT `loading="lazy"` and the
top one carries `fetchpriority="high"`; gallery.html and the home filmstrip make their first six
eager in JS. Keep that when adding a new page.

### ⚠️ ONE PUSH PER SESSION — Deployment Storage is a real meter (2026-09-02)

Vercel warned David at 75% of the Hobby **Deployment Storage** allowance (10 GB-months).
Every push creates a deployment, and Vercel keeps that deployment's full output — this
whole repo, ~96 MB, mostly `media/` — for the retention period. The site is not big;
the problem was ~170 pushes in a week. So, standing rule, David's instruction:

- **Batch a session's edits into ONE commit and ONE push.** Do not push a fix, then a
  follow-up, then a typo. Stage everything, verify locally, push once at the end.
- A second push in a session needs a reason (David asked for it live, or the first one
  was broken). Never push to "see it on the live site" — verify locally with Playwright.
- The old note that Vercel "can't run out like Netlify" was wrong; it checked the
  deploy-rate limit and missed this one. Deploys-per-day is still 100 — irrelevant now.
- The project's Deployment Retention Policy is being set to the shortest option
  (Settings → Security). Vercel always keeps the last 10 deployments + last 20
  production ones, so ~2 GB stored is the floor even at zero-length retention.
- If storage climbs again: re-encode `media/` to WebP (measured 0.69× on a sample),
  or split `media/` into its own Vercel project so an HTML push deploys ~1 MB.

**This container cannot push to GitHub.** The egress proxy blocks authenticated
pushes ("builtin injection failed"). Fetches and clones work fine; only pushes fail.

Every deploy goes through David's laptop over the device bridge:

1. Commit in the container clone.
2. `git bundle create /tmp/x.bundle <last-pushed-sha>..main` — an *incremental*
   bundle. A full-history bundle is ~62 MB and too big to send.
3. `SendUserFile` the bundle, then `device_commit_files` it into the connected
   folder (`C:\Users\david\OneDrive\Kempner Docs LAST BACKUP 5.24.2025\Desktop\orlandu.com`).
   `~/mnt/...` paths are rejected — use the full Windows path.
4. On the device, in `$HOME/site-repo` (**if the VM restarted, there is no clone; and `$HOME` sits on a shared `/sessions`
   disk that has filled up (10/26) — clone with `--depth 20` into `/tmp/site-repo` instead, and don't chain the final `mv`
   of the bundle with `&&` after a step that can fail, or the bundle is filed away unpushed**):
   `git fetch <bundle> main:incoming && git merge --ff-only incoming`
5. Push with the token: the file `github-token.txt` in the connected folder is a
   *note* with the token embedded in prose, so extract it —
   `grep -o 'gh[pousr]_[A-Za-z0-9_]\{20,\}' github-token.txt | head -1` — and push to
   `https://x-access-token:$T@github.com/orlandu81/orlandu.com.git`. Never echo the token.
6. Move the bundle to `_to_delete/` (device_bash cannot `rm` in mounted folders).
7. Back in the container, `git fetch origin main` so `origin/main` stops looking stale.

### A rejected push means another session is live — merge, never force

David runs more than one Claude chat against this repo. Twice now a second session
has been mid-task on the same files (2026-08-26, 2026-08-27), and on 2026-08-27 it
had **17 unpushed commits** — the AMS-100 monograph, the PVM-20L5 guide, the whole
structured-data and sitemap pass. A force-push at that moment would have destroyed
all of it.

So: `! [rejected]` is not an error to get past. It is the signal that someone else's
work is on `origin` and yours is not the only version.

**Never `git push --force` or `--force-with-lease` to this repo.** There is no
situation in this workflow that calls for it. If you think there is, stop and ask David.

When a push is rejected:

1. `git fetch <remote> main` and **read `git log --oneline HEAD..FETCH_HEAD`** before
   touching anything. Find out what they did.
2. If it merges cleanly, merge and push. Say what came in when you report back.
3. **If it conflicts, throw away your version, not theirs.** `git merge --abort`,
   `git reset --hard FETCH_HEAD`, then redo your edit against their current file.
   Resolving a conflict by hand risks reverting their work invisibly; redoing a small
   edit on top of the newer file cannot. This is what happened with the Magical Chase
   removal — the second session had rewritten `forsale.html` with JSON-LD `Product`
   nodes that a stale conflict resolution would have silently mangled.
4. Re-check your assumptions against the merged file. The first Magical Chase attempt
   swapped the marquee to name the Sony AMS-100 — which the other session had already
   removed as sold. A stale edit is not just a merge problem; the *content* goes wrong too.

Prefer small, quickly-deployed commits over batching a session's work into one push —
a narrow diff is a narrow collision.

## Hosting — Vercel, verified

The live host is **Vercel**. Hosting went GitHub Pages -> Netlify -> Vercel; both
earlier hosts left files behind, so don't infer the host from the repo contents.

As of 2026-08-25, confirmed against `dns.google/resolve`:

    orlandu.com.        A      216.198.79.1                            (Vercel apex)
    www.orlandu.com.    CNAME  4587a4c2f57710d8.vercel-dns-017.com.    (Vercel)
    orlandu.com.        NS     ns13/ns14.domaincontrol.com.            (GoDaddy — nameservers never moved)

Netlify's apex IP is `75.2.60.5` and its targets end in `.netlify.app`. Neither
appears in orlandu.com's DNS. If you think the site is on Netlify, re-run the
lookups below before acting — do not go by `netlify.toml` or by an old note.

    https://dns.google/resolve?name=orlandu.com&type=A&cd=0
    https://dns.google/resolve?name=www.orlandu.com&type=CNAME&cd=0

`vercel.json` is the only hosting config — security headers, `/media/*` caching, and the
`/index.html` -> `/` redirect. `netlify.toml` and the GitHub Pages `CNAME` file were deleted
2026-10-30 on David's say-so (both inert since the move to Vercel). The old Netlify project may
still answer at `sensational-cocada-4cbd01.netlify.app`; that is not evidence orlandu.com points there.

Vercel auto-deploys `main`; allow ~40s before verifying.

**GitHub Pages was DISABLED on the repo 2026-10-20** (it had been building a copy of the site on
every push that DNS never pointed at, and emailing David when a build failed).

**Vercel Web Analytics self-traffic opt-out (2026-10-22, site.js):** Hobby has no IP exclusion, so
every visit from David or from a Claude browser pane counted. Opening any page with
`?noanalytics=1` once sets `localStorage["orlandu-noanalytics"]="1"` and that browser is never
counted again (`?noanalytics=0` re-enables; the param is stripped from the URL). When the
browser pane loads the site in a new profile, open the first page with `?noanalytics=1`.

## Verifying

- `curl` to orlandu.com from this container fails (403 CONNECT tunnel) — use **WebFetch**.
- WebFetch caches 15 min per URL; append a throwaway query param to bust it.
- `gallery.html` renders client-side, so WebFetch sees the empty state.
  Verify the gallery by fetching `assets/gallery-data.js` directly.
- Certificate checks: SSL Labs via WebFetch. `openssl s_client` from here returns the
  proxy's own cert, not the site's. A page loading is not proof the cert is valid.
- DNS: `https://dns.google/resolve?name=<host>&type=<type>&cd=0`.
- **Search-engine verification files at the root, never delete:** `7984e193fb220a08e3d0a7abd9711dcd.txt` (IndexNow key) and `BingSiteAuth.xml` (Bing Webmaster Tools, added 2026-10-09; the site is registered there as https://www.orlandu.com under David's Google sign-in).

## Media

- Full size: `media/2026/`, longest side ≤1600px, q82. Thumbs: `media/thumbs/`, **800px wide**.
- HEIC needs `pillow-heif`; always run `ImageOps.exif_transpose` or photos land rotated.
- **Never replace a media file in place.** `/media/*` is CDN-cached; an in-place swap
  pins stale bytes in browsers that already loaded the page. This has bitten twice —
  once truncating a video at 5s, once serving 17 unedited photos for an hour.
  Rename the file, or append `?v=N` to every reference.
  **Since 2026-09-02 this is enforced by the headers, not just the CDN:** `vercel.json`
  serves `/media/*` and every image/font under `/assets/` as
  `max-age=31536000, immutable`, so a browser that has a file keeps it for a year.
  CSS and JS under `/assets/` get a 5-minute browser TTL instead (they are referenced
  without `?v=`), so an edit to `style.css`/`site.js` lands within minutes and needs no
  cache-busting.
- **Video is three encodes per clip (2026-10-20).** Every `<video>` carries three `<source>`s in
  this order: `<clip>.av1.mp4` (SVT-AV1, 8-bit yuv420p), `<clip>.hevc.mp4` (x265, `hvc1` tag so
  Safari recognizes it), then the original H.264 `<clip>.mp4` last. Each `<source>` has a
  `type='video/mp4; codecs="…"'` read from the actual file so a browser skips what it can't decode
  without downloading it. `tools/encode-video.sh media/video/<clip>.mp4` makes both siblings,
  prints size + SSIM against the H.264 (keep SSIM ≥ 0.97; AV1 crf 40–50 and HEVC crf 30 were
  transparent on the four clips at 1:1), and prints the three `<source>` lines. The H.264 file stays
  canonical: it is the `contentUrl` in every VideoObject, the `video:content_loc` in sitemap.xml,
  and the only file older browsers see — never change those to the AV1. The gallery builder in
  `gallery.html` adds the two siblings itself from the entry's `src`, with the codecs types in the
  entry's `av1` / `hevc` fields (`assets/gallery-data.js`). New names, never in place: `/media/*` is
  immutable-cached. HEVC playback was not verified here (Linux Chromium has no HEVC decoder);
  Safari is expected to take it, and falls to H.264 if not.
- **Fonts are self-hosted** in `assets/fonts/` (latin woff2 from `@fontsource`), declared at
  the top of `style.css` with exactly the weights the old Google Fonts link served
  (Orbitron 600/800, Rajdhani 400/500/600, Barlow Condensed 400/500, Press Start 2P).
  Nothing loads from googleapis/gstatic any more — do not add the `<link>` back on a new
  page; copy the `<head>` of an existing one (two font preloads + the nav-logo preload).
  `trinitron-fleet-vol1.html` and `404.html` are the two exceptions: the magazine declares
  a wider weight set inline, and 404 uses absolute `/assets/` paths.
- **Per-page image priority:** each machine/story/guide page preloads its above-the-fold
  photo (`<link rel="preload" as="image" … fetchpriority="high">` in `<head>`, matching
  `fetchpriority="high"` on the `<img>`). When that photo changes, change both. Only the
  first visible photo gets this — preloading a below-the-fold image makes the page slower.
- The nav logo is `assets/logo-wordmark-nav.webp` (335×132, lossless), the footer mascot
  `assets/mascot-foot.webp`, the About-page mascot `assets/mascot-about.webp`, the home hero
  wordmark `assets/logo-wordmark-hero-v2.webp` (lossy q95 + lossless alpha from `logo-wordmark.png`, 83 KB; the lossless one was 253 KB and the heaviest file on the home page — 2026-09-27). The original PNGs stay in the repo for JSON-LD
  `logo` URLs and as masters; don't wire them back into a page.
- **The Collection menu** (desktop nav, `assets/site.js` `COLLECTION` map) shows the seven
  collection pages as tiles. Its thumbnails are `step-<slug>-320.webp` + `-640.webp`, cut
  from the 1200 step thumb, and load only when the menu first opens (`data-srcset`). When a
  step thumb changes, regenerate both and RENAME the slug (e.g. `step-signage-v2`) — the JS
  string cannot carry a `?v=`. The home "Step inside" grid mirrors the nav: twelve cards,
  nav order, four rows of three (2026-09-27).
- **Home "Step inside" `sizes`** is `(max-width:700px) calc(73vw - 38px), …` — on phones the cards
  are two across with a 16:10 cover crop, so the slot needs ~1.46× its width; "100vw" made
  phones fetch the 1200s. **Timeline** cards are 84×84: `tools/build-timeline.py` cuts a 252px
  square into `media/timeline/` from each thumb (keeping its `?v`), so rerun it after a re-cut.
- **An 800px sibling carries the same `?v=N` as its 1200** — a bumped 1200 with a bare
  `-800` left the sold EarthBound guide in some browsers' caches (fixed 2026-09-27).
- Story and step thumbs carry an `-800.jpg` sibling and a `srcset`; a new 1200×514 thumb
  needs its 800×343 sibling (LANCZOS, JPEG q90 progressive) and the same `srcset`/`sizes`
  as its neighbors. The featured story card keeps the plain 1200 (it renders full width).
- Don't force `aspect-ratio` + `object-fit:cover` on cabinet photos; it crops subjects
  out of frame. Use `.masonry` (columns) for mixed orientations.
- David sends edited photos as lowercase `.heic`; leftover uppercase `.HEIC` in the
  same folder are the unedited originals. Compare numerically before assuming.
- **⭐ `device_stage_files` refuses files newly created in the OneDrive folder** —
  *"file is hardlinked (nlink > 1)"* — even though the laptop's own shell reports
  `nlink=1`. It is OneDrive semantics, and `cp`/`cat` copies inherit it, so a fresh
  intake photo cannot be pulled into the container that way. Files that have sat there
  for a while stage fine. **The workaround that works: do the conversion ON THE LAPTOP
  and let the image travel through `origin`.** `pip install pillow-heif
  --break-system-packages` works there (ImageMagick has a HEIC delegate too), write the
  finished JPEGs straight into `$HOME/site-repo/media/...`, commit and push from the
  laptop, then `git fetch` in the container to look at the result. **Push the image
  under a NEW slug first, unreferenced**, so nothing goes live until the frame has been
  seen and the copy checked against it — `vs-dk-high-scores-v2.jpg` was done this way
  (`a51e4af` image, then the references).

## Content rules David has set

- **Location is "Orange County, California" — never the specific city. This is a
  PRIVACY rule, not a style preference** (David, 2026-08-27): the arcade is in his home,
  and the site is a public inventory of valuable machines. Do not narrow the location by
  any route — not a city, neighborhood, nearby landmark, cross street, ZIP, school,
  named local business, or a photo that shows a house number or street sign. The site was
  swept from the old city name on 2026-08-27 (commit below). This
  covers body copy, meta/OG/Twitter descriptions, the JSON-LD `description` on every
  page, the footer in `assets/site.js`, `llms.txt`, the `assets/style.css` header
  comment, and the Trinitron Fleet colophon. Do not reintroduce the city name anywhere,
  including in new pages, alt text or commit messages. "Southern California" in prose is
  fine.
- **No WHICH-ROOM mapping either. Never state which room a specific machine lives in**
  (David, 2026-08-28: *"the privacy point extends through the whole site"*). A public,
  itemized map of where each valuable thing sits is the actionable intelligence, so the
  monitors roster lost its **Room column** (commit 8a852a5), the machine pages lost
  "running on free play in the garage arcade" from all five meta/OG/Twitter/JSON-LD
  descriptions, and "in the garage arcade" / "in the game room" came out of alt text,
  sitemap `<image:title>`s and the per-machine info cards. "The cabinet row" / "the row"
  replaced "the garage row" in prose. **Keep the sitemap image titles in sync with the
  alt text they mirror** — they are duplicated in two places each.
  STILL PRESENT, pending David's call on how far to go: games.html's section headings
  ("The garage arcade — uprights", "The game room"), its `#gameroom` anchor and lede,
  the about.html two-room description, the index.html card, signal-chain.html's
  "Garage arcade" headings, and gallery captions/titles for photos that literally show
  a garage or the game room. Ask before flattening those — they are the site's voice,
  not an inventory map.
- **Strip location metadata from every media file.** His iPhone HEIC/MOV originals carry
  GPS. The normal pipeline already removes it — Pillow does not copy EXIF unless asked,
  and ffmpeg drops the QuickTime location tags on re-encode — so never commit an original
  camera file straight into `media/`, and never add `exif=` when saving. Audited
  2026-08-27: 282 images and both videos in the repo carry zero GPS and zero camera or
  owner EXIF. Re-check after any bulk media add.
- US spelling. No "centre", no "grey".
- Don't repeat a photo across editorial pages — each shot gets one home. The gallery
  is the exception: it's the curated index and may draw from anywhere.
- Don't over-quote a machine's trivia. Most of his cabinets are Japanese; saying so
  once is plenty.
- **Machine cards are ordered by YEAR, oldest first**, within their
  section — games.html `#uprights`, `#pinball` and `#gameroom` (David, 2026-08-28). The year
  is already printed in each card's `<div class="sub">Maker · YYYY</div>`, so a new
  card slots in by that number rather than at the end. Same ascending convention as
  the PlayChoice-10 topper wall. When you reorder, re-read the card copy: "rounds out
  the lineup" stopped being true when Mario Bros. moved out of last place.
- **consoles.html cards sort by the PLATFORM'S ORIGINAL RELEASE, oldest first, within
  each maker section — NOT by the revision's own year** (David, 2026-09-01: the NES Top
  Loader sorts at 1985 because the NES does, ahead of the Game Boy). A revision or
  portable sorts at its platform family's debut (Nomad/CDX/X'Eye → Genesis; GBA SP →
  GBA 2001, which puts it before the GameCube); same-family units tie-break by model
  year. The `sub` still shows the revision's own year, so the visible years are
  deliberately out of ascending order — do not "fix" the order to match them.
- **consoles.html: ONE CARD PER MODEL. No unit counts, no room locations.**
  (David, 2026-08-28, commit e918055.) He owns duplicates of several machines; the
  page lists the model once and never says "×2", "one in each room", "the pair", or
  which room anything is in. **The room labels were a privacy leak** — the arcade is
  in his home and the site is a public inventory of valuable hardware, so treat
  "which room" like any other location detail (see the location rule above).
  The `sub` line is `YYYY` plus condition/status only — `Modded`, `Restored`,
  `Out for service`, `JP`. The exception he asked for: **the two New 3DS XLs get
  separate cards** (Black 2014, SNES Edition 2016) because the units differ.
  Console years come from the vault where it records one; where it does not, use the
  North American release year of that specific model.
- Big Blue runs a **Darksoft CPS-2 multi in a Jasen's Customs case** — not a
  Marvel vs. Capcom board.
- Machine profiles carry a **Work log** (`ul.worklog`). Source entries from
  `vault.html` on David's device, not by asking him. Skip trivial repairs.
- No date stamps like "August 2026" in page copy.
- **Never publish a fault on a machine David has sold.** Condition notes are for what he still
  owns. The AMS-3 that left had a specific defect; it was written up, and he asked for it removed
  (2026-08-26). Say only that a unit moved on.
- **⭐ NEVER CROP HIS MONITOR PHOTOS TO MAKE A LAYOUT LINE UP.** David, 2026-08-31, on a
  roster rebuilt with uniform 4:3 `object-fit:cover` thumbs: *"I don't like how you cropped
  out all the good features of each CRT — don't crop them more than they were cropped last
  time."* The control panels, keypads, the AMS-100 riding on top, the SONY badge — that is
  the *subject*, not background to trim. This is the same rule as the existing
  cabinet-photo one, and it now has a worked example: an aligned grid is not worth a crop.
  **Align with `object-fit:contain` instead** — a uniform plate the whole photo sits inside,
  `background:transparent` so the card's own gradient mats it. monitors.html's roster is
  `aspect-ratio:7/6` (the geometric mean of the four photos' ratios, so the matting is even),
  two columns, nothing cropped, rows perfectly aligned. **Recropping the source photo is a
  different thing and he asks for it** — `pvm-2950q.jpg` was recut from the
  `IMG_3926.jpg` master at `(282,12)-(2640,1790)` → 1600×1206 / thumb 800×603, `?v=7`: the
  old frame clipped 113px off the top of the cabinet and carried a slice of a neighbouring
  monitor down each side. The limits on that photo are the **Trinitron badge** (master
  x≈385) on the left and the **button column** (master x 2533–2634) on the right. A tighter
  crop into the left cheek was tried and rejected — **cropping one side and not the other
  reads as crooked**: *"You cut too much off of the left side, now it looks uneven."* Frame
  a symmetrical object symmetrically; cabinet edge to cabinet edge is the answer. **Verify a "no-crop" layout
  numerically** — measure each rendered box against `naturalWidth/Height` and assert the
  scaled image fits inside it; do not eyeball it.
- **A card without a photo cannot share a grid row with one that has a photo.** In an
  aligned grid the photoless card stretches to match, so it reads as an empty box. That was
  the other half of the monitors.html mess: four LMD models had no photograph, and the page
  worked around it with `.masonry` plus a `.cthumb{aspect-ratio:auto}` override, so no two
  cards lined up. The four LMD models now fold into **one full-width `.card.wide`** on the
  rack photo, naming all four models with their counts — David chose that over shooting
  three new photos, and **nothing was dropped from the roster**. He asked for that one photo
  to be **cropped on top** (ceiling, shelf and a wall disc above the monitors):
  `lmd-rack.jpg` is now `(0,105)-(1500,640)` of the old master → 1500×535, thumb 800×285,
  all refs at `?v=3` — **including the gallery's**, which shares the file.
- **`.grid.c2` and `.grid.c3` are `auto-fill minmax()`, so the column count follows the
  viewport, not the class name.** At desktop `c2` is three columns and `c3` is four. A
  section with two or four items in a `c2` therefore leaves holes on the right — that was
  the other half of the monitors.html mess ("Beyond video", the AMS photo pair). When a
  block has a **fixed** number of items, pin the columns explicitly
  (`grid-template-columns:repeat(N,minmax(0,1fr))` with breakpoints) rather than letting
  auto-fill orphan the last row. Specificity note: a page-scoped `.fleetgrid{}` loses to
  `.grid.c2` in style.css — write `.grid.fleetgrid{}` or drop the `c2` class.
- **Nothing wider than ~2.2:1 belongs in the home filmstrip.** At 170px tall a 3.9:1 sign renders
  as a 660px slab. index.html drops anything over 2.2:1 BEFORE building the strip, from the
  `w`/`h` in `gallery-data.js` (so the file is never fetched and the track never jumps), and
  still measures each image on load as a backstop — panoramas stay in the gallery masonry,
  which handles them fine. **A recrop changes a gallery entry's `w`/`h`: update them with the
  `?v=`** (lmd-rack and minicute-side carried stale pre-recrop sizes until 2026-10-23). Don't "fix" a wide
  photo with object-fit:cover; it cuts the ends off signs.
- Gallery audit 2026-08-26 (43 -> 39): removed the Mini Cute shipping crate, the Red Tent
  teardown, the BVM-20E1U crosshatch and the AMS-100 bench lineup — all process/bench shots that
  live on their own story or project page. Kept but FLAGGED as the weakest entries: the four
  fleet portraits with dark screens and window reflections (bvm-20e1u, bvm-a14f5u, pvm-2950q,
  pvm-20l5) and big-blue-side-art. Screens-on reshoots would lift all five.
- **⭐ WHEN SOMETHING SELLS, ITS GALLERY ENTRY COMES OUT TOO** (David, 2026-08-31: *"i see the
  D9 monitor photo in the gallery scrolling across the main page. Is this an error?"* → *"pull
  it"*). The older rule said a good shot could stay in the gallery after the machine left; that
  was wrong in practice, because **the home filmstrip is built from gallery entries, so keeping
  one puts a departed machine on the front page** — under a present-tense title, in that case
  "BVM-D9H5J, reporting for duty". The gallery and the filmstrip read as *what is here*.
  So: remove the `gallery-data.js` entry, its `sitemap.xml` `<image:image>` line, and both
  image files. **The exception is the `games.html` memoriam**, which works precisely because it
  is labeled as machines that passed through. Sold-machine photos live there or nowhere.
- **⭐ EVERY PHOTO ON THE SITE MUST BE HIS OWN.** The footer claims *"Photography ©
  Orlandu's Arcade"*, so a third-party shot in the gallery makes that line false and
  publishes someone else's work under his name. **`tna-toppers.jpg` ("Annihilation,
  accessorized") was removed on 2026-08-31** — David: *"I realize now that is not my photo,
  it is someone elses."* Entry, sitemap line and both image files deleted; gallery 47 → 46.
  **If a photo's provenance is ever unclear, ask before publishing it**, and if one is
  identified later, pull it the same way — it is a rights question, not a curation one.
  (Note: the file stays in git history, and history cannot be rewritten here — this repo
  forbids force-pushing. It is off the site and off the CDN, which is what matters.)
- **The gallery is a curated showcase, not an archive.** Bench and workbench snapshots stay on
  their editorial or project page and do NOT get a gallery entry. David pulled all seven AMS-3
  images/clips from it (2026-08-26): "they aren't that professional." The bar is his lit,
  composed machine photography. Note the home filmstrip draws from gallery images, so a
  gallery entry also puts a photo on the front page.
- **Never hard-code the marquee's animation duration.** A fixed duration means a fixed
  time per loop, so the ticker accelerates every time a segment is added to the copy —
  it had crept to ~196 px/s on desktop before David caught it (2026-08-26). `site.js`
  measures `.strip span` and sets `animation-duration` from a 75 px/s target. The value
  in `style.css` is a fallback only. Same class of fix as the filmstrip's rAF scroller.
- Don't imply a current count from a photo of a past state — say "on arrival" or "since moved on".

### Content David has declined (2026-08-28)

- **No sourcing/channel content.** David: "financial pathways are not something I'm
  interested in sharing with the public. They need to figure that out on their own and
  not use my channels." No Japan-pipeline story, no content about where or how he
  sources; the monitors.html Beyond Video teaser card for it was removed the same day.
- **No failures/regrets editorial** — same ruling. The site does not publish his misses.
- **No composite-video screenshots on his monitors**: "composite is just gross. I would
  never put a picture that ugly on my monitors." Any comparison piece uses RGB material.
- **No RSS feed** — declined.
- **The fleet count is THIRTEEN units across EIGHT models** — the BVM-D9H5J sold
  2026-08-31 and came off the roster; LMD-9050 is ×2. Swept across index, monitors,
  stories, signal-chain, pvm-vs-bvm, and Trinitron Fleet Vol. 1 (fleet stats now
  380 lb / ≈960 W / 1080 sq in, the `UNITS` array, and the no-JS static mirror).
- **Machine pages carry a prev/next chain** (`nav.machnav`, styled in style.css)
  mirroring games.html order: uprights → pinball → game room, looping. Adding or
  removing a machine page means re-linking its two neighbors.

### Approved 2026-08-28: machine accents + story thumbnails + Japan language

- **Every machine page carries an accent palette keyed to its own art**, as a page-scoped
  `<style>` block ("Machine accent") overriding ONLY `main .kicker`, the `h1.page`
  gradient, `h2.sec`, and `.card .sub` — links stay cyan, everything else is house style.
  Palettes (X = kicker/h2/sub; L/M/D = h1 gradient): donkey-kong cab blue
  #86b8ff/#cfe4ff/#5b9dff/#1e4f9e · mario-bros pipe green #6fdc8c/#baf5c4/#3ecf5e/#137a2e ·
  vs-unisystem VS. red #ff8f7a/#ffb4a8/#f0503c/#96180c · big-blue Capcom azure
  #6fc4ff/#bfe6ff/#3fa9ff/#0b5bd0 · indiana-jones adventure gold #eec06a/#ffe2a0/#e8a03c/#9c5210 ·
  ghostbusters ecto purple #c09aff/#e2ccff/#a86bff/#5a1fae · tna reactor yellow
  #e3f04a/#f8ffb0/#d8e83a/#7a9e15 · rick-and-morty portal green #a8f26b/#e2ff9e/#7ee94a/#2f9e2f ·
  red-tent tent red #ff8a8a/#ffb0b0/#e83838/#7e0e0e · mini-cute candy pink
  #ff9ed0/#ffd0e8/#ff7ac0/#b02878. A new machine page gets a palette from its own art.
- **Story cards on stories.html carry a photo thumbnail**: `media/story-thumbs/story-<slug>.jpg`,
  1200×514 (21:9), q82, cropped from the story's OWN media, no wordmark. This is a documented
  exception to one-photo-one-home — the thumb is navigational chrome, like an OG image.
  The featured card shows the same file at 3:1 via `object-fit` (`.cthumb` rules in style.css).
  **A new story needs a new crop**, and the story-thumbs are NOT in sitemap.xml (chrome, not content).
  The PVM-20L5 thumb is cropped from the flagged weak `pvm-20l5.jpg` — regenerate it when the
  screens-on reshoot lands. index.html's "Step inside" cards carry the
  same treatment via `media/step-thumbs/step-<slug>.jpg` (approved from a mockup the same day);
  the "Latest" news grid deliberately stays TEXT — a thumb-per-news-item is a forever
  maintenance tax and the page already opens with two photo bands. `step-forsale.jpg` was
  re-cut from `sale-psvr2.jpg` on 2026-08-31 when the D9H5J sold (crop y 260–774, above the
  watermark); it was previously SMB on the D9.
- **Japan language (David delegated the call):** channel-flavored copy is out — about.html's
  "sourcing lines that reach all the way to auction houses in Japan" clause was removed. Plain
  unit provenance stays ("sourced from Japan" on the monitors AMS-100 card). The monograph is
  untouched — it has its own rulings.

## Listing documented hardware — the provenance link (David approved 2026-09-01)

When a piece of hardware that the site already documents gets listed on `forsale.html`, its
card links that item's own history on the site — the roster entry, its Trinitron Fleet
feature, its story or project page. Example shape (the BVM-D9H5J would have carried):
"This exact unit is documented in Trinitron Fleet Vol. 1 — its full feature, photos and
service history →". Documented provenance is the one thing no other seller in this hobby
offers, and it is why two identical units sell for different money. This is an ON-SITE
practice only — never put orlandu.com links or mentions in the eBay listing itself; eBay's
links policy prohibits external links AND plain-text site mentions (checked 2026-09-01).
When the item sells, the provenance link comes out with the card in the normal sweep.

## Sold items

Settled with David on 2026-08-26 when the AMS-100 sold. The rule is **the sales page is present
tense; the collection page carries the memory — and most departures don't earn a memory at all.**

- **`forsale.html` — the card comes OUT the moment it sells.** No SOLD badge, no "recently
  sold" archive section. The eBay buttons point at a seller *search*, not an `/itm/` link, so
  a SOLD card walks a live buyer into a search that no longer contains the thing they clicked
  for. A wall of SOLD badges is also sales-floor scarcity theater and off-voice here — the
  page's lede ("years of seller history") and the eBay store link already carry the track
  record. And it ages badly: six months of badges and the page is mostly things nobody can buy.
- **The bar for an "In memoriam" entry is high, and the AMS-100 is the worked example of
  failing it.** A section was built for it on `monitors.html` and David had it taken straight
  back out (`0df6c08` -> reverted). Before building one, the item should be *singular* — a
  machine with a history here — not one interchangeable unit out of a set of five. A catalog
  listing photo is also the wrong register next to his lit, in-room photography. **When in
  doubt, a departure gets a clause in existing prose, not a section.** `monitors.html` carries
  exactly that: a one-line `p.note` under the roster table naming the departed BVM-14F5U.
- **The one real memoriam section is on `games.html`** — cabinets, pins and signage, sixteen
  shots, "machines that passed through on their way to someone else's story". Shape:
  `<section id="memoriam">` -> `<h2 class="sec">In memoriam <small>...</small></h2>` -> a
  `div.grid c3` of `figure.shot`, captions as `<b>Name</b> &mdash; one short line`. **They stay
  FULL COLOR** — grayscale/fade has been proposed twice and declined twice. Don't clone this
  section onto another page without asking him first; that's the mistake that got reverted.
- **If something does earn an entry, photos are `alumni-<slug>.jpg`** in both `media/thumbs/`
  and `media/2026/`, and you **`git mv` the `sale-*` files** rather than copying — a rename is
  a new URL, so the CDN-cache rule above is satisfied and no orphan is left behind.
- **Keep it a memorial, not a ledger.** Sixteen cabinets over years reads as history; a section
  that accumulates every departure reads as inventory churn.

**The sweep when something sells:** remove the `forsale.html` card -> check the **FOR SALE
marquee segment in `index.html`**, which names items individually, so a named item must be
swapped out -> drop the photo's `<image:image>` line from `sitemap.xml` and delete the
`sale-*` files -> **remove the item's gallery entry, its sitemap image line and its media
files** (a gallery entry is also a front-page filmstrip entry) -> grep for counts that
included the sold unit -> grep for anything else
linking at the listing, **including the copy on neighbouring cards** (the AC-D9H card said
"pairs naturally with the D9H5J above"). Same discipline as the dangling-photo sweep: a
removal is not done until the copy around it is checked.

**`forsale.html` carries NO `Product` / `Offer` / `ItemList` JSON-LD (David, 2026-09-27).** It was
removed after Search Console flagged Merchant listings (missing `hasMerchantReturnPolicy`,
`shippingDetails`) and Product snippets (missing `aggregateRating`, `review`) warnings. The
buying happens on eBay, there are no product reviews to mark up, and fabricated ones break
Google's rules. The page keeps its WebSite/Organization/Person/CollectionPage/BreadcrumbList nodes.
**Do not add product markup back** when a new card is listed.

**No `Product` type anywhere on the site, not even nested (2026-10-05).** Google validates every
`Product` node it finds, including ones inside an Article's `about`, and flags any without
`offers`/`review`/`aggregateRating` as a critical Product-snippets error. `ams-100-monograph.html`
listed the AMS-100, BKAM boards and AMS-3 as `about` Products; they are now `"@type": "Thing"`.
Use `Thing` for "this page is about X".

**Every `ImageObject` carries five rights fields (2026-09-25, `creditText` added 2026-10-05):**
`creator` (Organization "Orlandu's Arcade"), `copyrightNotice` "© Orlandu's Arcade",
`creditText` "Orlandu's Arcade", and `license` + `acquireLicensePage` → `about.html#photo-use`.
Search Console reports a missing `creditText` under Image Metadata. Copy all five onto any new
ImageObject (page `primaryImageOfPage`, the Organization logo).

`media/2026/alumni-ams-100.jpg` and its thumb are currently **unreferenced** — the old listing
photo, kept in case the AMS-100 monograph wants it. Not an oversight.

**Watermarks: For Sale photos, plus the PC-10 board tiles** (David's scoped exception, heavy diagonal on every board — see "Dark backdrops" below). The photos on `forsale.html` carry a
`© orlandu.com` mark, bottom-right, at 4.2% of the short edge (white 80% over a soft dark
shadow). **Nothing else on the site is watermarked and nothing else should be** — the
editorial and gallery photography is the reason people stay, and a mark across it costs
more than it protects. Regenerate a mark with the same recipe if a new sale photo is added.
The scope is deliberate, not partial work.

**The BVM-D9H5J sold on 2026-08-31.** Its for-sale card, JSON-LD `Product`, index marquee
mention, index "Latest" card, monitors.html roster card and its whole Trinitron Fleet Vol. 1
feature came out; `media/{2026,thumbs}/sale-bvm-d9h5j.jpg`, `media/{2026,thumbs}/bvm-d9h5j.jpg`
and `media/fleet/b4133f839b.webp` were deleted (the sale copy was a deliberate watermarked
duplicate, so `git mv` was wrong here). **`d9-smb.jpg` went too, in a follow-up** — see the
gallery rule below. The departure is now recorded exactly once, as a clause in the
monitors.html `p.note`; there is no memoriam entry and no "recently sold" section (see the
sales-page rule above).

**Overwriting a file in `media/` needs `?v=N` on its `<img>` refs** — `vercel.json` gives
`/media/*` `s-maxage=86400`, so the CDN serves the old bytes for a day otherwise. Leave
JSON-LD `image` URLs unversioned.

## The AMS-100 PDF (rebuilt 2026-10-30)

`media/ams-100-monograph-rev2.pdf` is typeset FROM the web edition (`ams-100-monograph.html`), so the two can no
longer diverge: §4.5.2 / EXT-02 is gone from both (David's "fully" ruling) and the spelling is American. Same look as
David's compile9 (pandoc → xelatex, DejaVu Serif, 1in margins, TOC to depth 3; the one Japanese run set in Noto Serif
CJK JP), his XMP/docinfo rights metadata copied across. The old `ams-100-monograph.pdf` was deleted and 301s to the new
file (`vercel.json`). To rebuild after a page edit: the script pair is in the Project doc
`claude/ams-100-pdf-build.md`; publish under a NEW filename (media is immutable-cached) and repoint the two links.

## The vault

`vault.html` lives on David's device (not in this repo) — 1,283 inventory items.
JSON sits between `/*VAULT_DATA_START*/` and `/*VAULT_DATA_END*/`, prefixed `items = [`:

    blob = re.sub(r'^items\s*=\s*', '', m.group(1).strip()).rstrip().rstrip(';')
    data = json.loads(blob)

Useful fields: `upgrades` (list of `{desc, cost, date}`), `conditionNotes`, `notes`,
`lastServiced`, `originality`.

## Planning artifacts

- **Attract Mode** — photo audit, placement plan, 34-shot intake tracker:
  https://claude.ai/code/artifact/c4999444-8cc3-49fd-8f52-bf996c268710
- **The Bench Book** — work-log intake (mostly superseded by the vault):
  https://claude.ai/code/artifact/0f218037-5cbf-469f-a9c1-8832f67ef0a4

## Round-five features (2026-09-11) — what they are and what they obligate

Shipped together from the fifth review (memory: `orlandu-2026-09-11-review5`):

- **Site search** — the magnifier in the header (and the button on 404) opens a dialog over
  `assets/search-index.js`. **That file is GENERATED: run `python3 tools/build-search-index.py`
  from the repo root before every push** so new pages, cards, glossary terms and gallery
  captions are searchable. It indexes published pages only. Magazine/monograph bodies are
  headings-only by design.
- **Glossary tooltips** — `assets/glossary-data.js` is generated from `glossary.html` by
  `python3 tools/build-glossary.py`; rerun it when a term is added or a definition changes.
  Tooltips run on pages with a reading time (`div.rt`), skipping the glossary, the monograph
  and the two Orlandu 100/50 issues. First occurrence per page only; aliases and the
  too-generic SKIP list live in the script.
- **Section links + Share** — `site.js` gives every `main h2` an id from its text and a hover
  "#" that copies the deep link; story/guide pages (`.rt`) and machine profiles (`main.profile`)
  get a Share button under the lede (native share sheet, copy-link fallback). Existing ids are
  kept, so hand-written anchors still work; renaming a heading changes its generated id.
- **Reading progress + resume** — pages with `div.rt` get the thin bar under the header and a
  "Pick up where you left off" pill on a return visit past a third; state is per-browser
  localStorage (`orl-read:<path>`). The magazine has no site chrome and gets neither.
- **Lightbox zoom** — wheel/drag, pinch/double-tap, and a 1:1 button; swipe-to-navigate only
  fires at fit size. Zoom shows the 1600px master at native pixels, so **check a new sale photo
  for legible serials/asset tags before it goes up** (the privacy note already says so).
- **Attract Mode slideshow** — gallery only (`<body data-slideshow>`): the ▶ Play chip runs the
  current set; `gallery.html#play`, `#pinball&play` and `#tag=tna&play` start it on load.
  Fullscreen where allowed, 5 s per photo, tap or space pauses, cursor hides after 2 s.
- **Fleet spec table** (`monitors.html#specs`) is condensed from the magazine's `DATA` object —
  the magazine remains the long-form source; when a spec changes there, change it here too.
  Sort is client-side (`data-sort`, `data-v`). **Units column mirrors the fleet count sweep.**
- **Console mod table** (`consoles.html#mods`) lists only consoles whose signal path the site
  states; handhelds and the bench unit stay off. David confirmed 2026-09-11: BOTH NES units carry
  an NESRGB, and the Duo-R has an RGB mod plus the region mod.
- **Structured data** — `VideoObject` nodes on about, signage (×2), projects and
  ams-3-vs-ams-100 (durations from ffprobe; `uploadDate` is the ship date), and a `FAQPage` on
  about.html built from the eight confirmed answers. **Editing an FAQ answer means editing the
  JSON-LD copy too.** A new video needs a VideoObject.

Still to come from that review, in this order, one per session: monitor model pages,
the WebP `<picture>` pass, the collection timeline (mockup first), the contact form
(Vercel function + Resend — David's choice).

## Round-five, part two (2026-09-11) — the four big ones

- **PHOTOS ARE WEBP NOW.** `tools/convert-webp.py` converted every `media/**/*.jpg` (except
  `media/og/`, which stays JPEG for social scrapers) and `assets/hero-bg.jpg` to `.webp` under
  the same basename, rewrote 961 references, and deleted the JPEGs (91.5 → 63.2 MB). **New photos
  are saved as .webp directly** — Pillow `im.save(p, "WEBP", quality=82, method=6)`, never with
  `exif=`. The gallery srcset builder, the home filmstrip builder and `style.css` now build
  `.webp` names; the `-400/-600/-800/-2x` sibling convention is unchanged. Thumb/full/strip/OG
  rules in the Media section still apply — only the extension changed. Don't run the converter
  again; it is kept for the record.
- **Monitor profile pages** — `pvm-2950q.html`, `pvm-20l5.html`, `bvm-20e1u.html`,
  `bvm-a14f5u.html`, `lmd-wall.html` (the four LMD models share one page, like the magazine).
  Same chrome as machine profiles (`main.profile`, accent `<style>`, `nav.machnav` looping in
  roster order, center cell → monitors.html). Body copy is the magazine's COPY object verbatim;
  the inputs list is condensed from its DATA table; work logs from the vault (David 2026-09-11:
  **name SavonPat on the A14F5U service**; **the 20L5's slot holds a BKM-129X** — magazine copy
  and both spec tables corrected). Each page links its Vol. 1 feature, `gallery.html#tag=<slug>`
  (tags + TAG_LABELS added to the four monitor gallery entries), and the 20L5 links its buying
  guide. Roster cards and the spec-table model names now link the profiles. OG cards
  `media/og/og-<slug>.jpg` cut from the hero photo + wordmark. **A new monitor page means
  re-linking its two chain neighbors, a sitemap block, an llms.txt line, and a timeline entry.**
- **Timeline** — `timeline.html` is GENERATED by `tools/build-timeline.py` from three lists of
  (name, RELEASE year, thumb, href). **Release years only, never acquisition dates.** Years come
  from the cards; when a card's year or thumb changes, edit the list and rerun. Linked from the
  footer Explore row and an index Latest card; in sitemap + llms.txt.
- **Contact form** — `api/contact.js` (Vercel Node function, no dependencies) relays to
  orlandusarcade@gmail.com through Resend's REST API from `onboarding@resend.dev`; needs
  `RESEND_API_KEY` in the Vercel project env (David added it 2026-09-11, Secret). Free tier
  delivers only to the account's own verified address, which is the point. Forms
  (`form.cform`) live on about.html#write and wanted.html#have-one; the 24 "I have one →" links
  are now `<a href="#have-one" data-item="…">` and prefill the subject; the mailto stays beside
  the Send button as the permanent fallback. Honeypot field `site`; photos ≤3 MB after an
  in-browser downscale; the function answers 503 `not-configured` if the key is missing and the
  page says so. `vercel.json` needs no change — `/api/*` is served by the function automatically.
- The home Latest grid dropped its two oldest cards (IJ cold-boot chase, Trinitron Fleet Vol. 1)
  for the monitor-pages and timeline cards; still 9.

## Console profile pages + the Oct 2 audit (2026-10-02)

- **Six console profiles** — `nes-top-loader.html`, `nintendo-64.html`, `gba-sp.html`, `genesis-cdx.html`,
  `pc-engine-duo-r.html`, `ps2-slim.html`. David chose these six because each has real work to describe (a mod,
  a repair or a signal path); **the other consoles stay card-only — don't build a page that would be mostly
  generic platform history.** Same chrome as the monitor profiles (`main.profile`, page-scoped accent `<style>`,
  `nav.machnav` looping in consoles.html order, center cell → consoles.html), OG cards `media/og/og-<slug>.jpg`
  (the whole 4:3 photo on its own white ground, wordmark bottom-left). Their consoles.html cards carry
  "The full profile →"; the timeline links them. A new console page = card link + sitemap block + llms line +
  timeline href + re-link the two chain neighbors.
- **The PS2 Slim is NOT modded** (David): the MemCard Pro 2 / FMCB / OPL setup needs no change to the console.
  Its card sub is just "2004".
- **Console years are North American release years** where the Vault had a Japan year (David, 10/2): SNES 1991,
  Turbo Express 1990, New 3DS XL Black 2015. The PC Engine Duo-R is **1993** (its own release; 1991 was the Duo).
- **Timeline cards without a photo** use a lettered tile (`.tph`): a CONSOLES tuple gets `None` for the thumb and
  a fifth element, the short label. Added that way: NES Front Loader 1985, Genesis Model 1 1989, TurboGrafx-16
  1989, JVC X'Eye 1994.
- **Facts David settled in the audit** (don't re-raise): TNA is 2017 and its CE upgrades are the *Classic*
  Edition package he installed himself; the Superbrite has three F25T12 tubes; both N64s are RGB-modded; one
  switcher per room; the Mini Cute is "fully original"; LMD-9020 is SD only, the LMD-9030 takes HD over analog
  component, both are 640×480 panels; the LMD-940W has no analog component input (HDMI + SDI); BVM-A14F5U has
  the BKM-68X clone and the BKM-62HS installed, **no BKM-61D** (one slot open); BVM-20E1U has only the BKM-21D
  installed (three slots open), owns a BKM-24N and a BKM-20D on the shelf, and was built June 2007; the AMS-3 is
  in storage; Ghostbusters' Spike 1 board is a spare, not fitted.
- **`button.btn` needs `background:transparent`** — a `<button>` picks up the browser's light-gray fill otherwise
  (the contact-form Send buttons were unreadable until 10/2). Body-text links carry a thin underline
  (style.css `main p a:not(.btn)` …); `.sr-only` exists for invisible headings that keep heading order intact.
- **Oct 4 accessibility pass** (axe-core 4.13, every page at 390 and 1280, motion reduced): the magazine pages'
  filter box is `id="mq"` — **never `id="q"`, which is the sitewide search dialog's input** (site.js). If a magazine
  `build_page.py` regenerates orlandu-100 / orlandu-50-games, carry `mq` into it. Scrolling `.tablewrap`s (monograph,
  consoles) and the monograph's `pre.chain` carry `tabindex="0"` so a keyboard can scroll them on a phone — give a
  new scrolling table the same. Blank corner `<th>`s get an `.sr-only` label. The home hero, marquee and filmstrip
  sit outside `<main>` on purpose (full bleed), so each carries `role="region"` + `aria-label`. trinitron-fleet's
  `div.doc` is `role="main"`. **axe's color-contrast results are false positives unless the scroll-reveal has
  finished** — run it with `reduced_motion='reduce'`; with that, the site has zero contrast failures. Known and
  left alone: the trinitron "← orlandu.com" pill sits outside a landmark; tesla-callback.html (noindex) has one
  low-contrast line.

## The AI channel (2026-10-10)

David asked for "AI-to-AI marketing" that stays organic. What exists: `llms.txt` (index), `llms-full.txt` (every page as
Markdown, ~73k words, generated), `data/` (three CC BY 4.0 datasets as JSON+CSV, generated; each owning page carries a
schema.org `Dataset` node and a one-line download note), `api/mcp.js` (a read-only MCP server, Streamable HTTP,
stateless, no dependencies — six tools over `data/pages.json`, `data/search-index.json` and the datasets; test it with
`node` and mock req/res, see the 10-10 session notes) and `mcp.html` (the human page: what it is, how to connect it, the
datasets, the rules; footer "For AI agents", home Latest card, llms.txt "For agents" block, sitemap). `vercel.json`
serves `/data/*` and the llms files with CORS. The datasets are CC BY; the prose and photos stay © — keep that line
wherever a dataset is mentioned. The BKM card reference is NOT in the server until David has corrected the draft
(Project doc `claude/bkm-card-reference-draft.md`). David also approved a Wikidata item for the AMS-100 only, citing the
monograph — not yet created; it needs his Wikidata login in the browser pane. No prompt-injection text for assistants,
ever — that is the kind of "AI marketing" that gets a site demoted.

**Search ranking (2026-10-20) — one set of rules in TWO places: `search()` in `api/mcp.js` and the
`/* search-score:start … end */` block in `assets/site.js`. Change both or neither.** `tools/eval-search.mjs`
lifts the site.js block out verbatim and runs `tools/search-battery.json` (218 real-world queries with their
intended page) against both; `tools/test-mcp.mjs` is the server's contract test. Both are in the pre-push list.
The rules: hyphens, periods and apostrophes are dropped before comparing (so "pvm 20l5" = "pvm-20l5" = "PVM20L5",
"players guide" finds "Player's Guide", "cps2" finds "CPS-2"); filler words (what/is/how/to/for…) are ignored;
a token also counts in its singular ("toppers"), verb stem ("buying"→"buy") and abbreviation form (n64, snes, nes,
gba, ps2, pce, tg16, pc10, smb, dk, tna, ij, cps1/2 — the `ALIAS` map); a run-together token ("donkeykong", "15khz")
can match a title/heading with its spaces removed; a token that matches nothing anywhere is retried as a one-letter
typo of any title/heading word ("playchoise", "trinatron"). Slug words score (gba-sp.html answers "gba sp"), so do
the kind label ("glossary", "console") and the lede. The index carries `w` rank weights set by the builder:
profiles, stories and guides (main.profile or a reading time) and the Coin-Op/Monitors hubs 10, other pages 6,
glossary 5, cards 4, FAQ 3, photos 2 — a model number must find its profile page before the gallery photo of it.
Pages whose `<title>` differs from the H1 carry it as `tt`, scored a notch below the H1 (the H1 of pvm-vs-bvm is
editorial; the `<title>` says "PVM vs. BVM"). The dialog still displays the H1. MCP weights: H1 20 / `tt` 15 /
slug 10 / kind 6 / heading 5 / lede 3 / body ≤3 / multi-word phrase +10 / exact title +8; the header keeps its
40-24-16 title scheme (exact 32) plus the same extras. Measured 2026-10-20 on the battery: MCP top-1 77→93 %,
top-3 89→99 %; header 67→93 % and 83→98 %, zero top-3 regressions on the MCP side. Known leftovers: "ebay"/"buy"
rank For Sale second; "bkm-10r" answers the 20E1U profile (which uses one) above bkm-cards. `bkm_cards` no longer
returns a row whose Fits says "not <query>" (the BKM-10R for "BVM-A"); `read_orlandu_page` now rejects a missing
`page` instead of silently returning the home page, and resolves `….html#section` / `….html?x` URLs.
`build-search-index.py` also decodes `\uXXXX` in gallery titles — "Kay\u00b7Bee" had been showing raw in the dialog.
**2026-10-23:** the battery grew to 271 (53 queries for sony-model-numbers, through-the-mask, will-it-connect,
bkm-10r and their overlap with the older guides). The tool pages (kicker "Tool · …") now rank 10 like the guides,
the `ALIAS` map also expands scanline(s)→"scan line", controller→"control unit", comparison→"compare",
naming→"model number", and a token ending in "-ate" also tries its root ("simulate" finds "simulator",
"calibrate" finds "calibration"). New-page queries 68→79 % top-1 on MCP, 64→77 % header; the original 218 held
(MCP 93/99, header 92/98). The body cap stays at 6,000 characters — 12,000 bought one hit, cost a regression and
30 KB. Misses left are content, not ranking: the decoder never says "stand for" or "BKM-15R" in its first 6,000
characters, and will-it-connect never says "planner".

**MCP Registry listing (2026-10-10): `com.orlandu/arcade` is PUBLISHED** in the official registry
(registry.modelcontextprotocol.io), version 1.0.0, from `server.json` at the repo root. The namespace is
DNS-verified: a TXT record at the orlandu.com apex (`v=MCPv1; k=ed25519; p=…`, next to the Google
verification TXT in GoDaddy) — never delete it. The matching private key is `mcp-registry-key.pem` in
David's connected orlandu.com folder (next to github-token.txt; NOT in the repo). The registry API host is
blocked from this container and from the device shell, so publishing is done from the BROWSER PANE on an
orlandu.com page: import the key with WebCrypto (`pkcs8`, Ed25519), sign the current RFC3339 timestamp
(±15 s window), POST `/v0/auth/dns` {domain, timestamp, signed_timestamp(hex)} → registry_token, then
POST `/v0/publish` with `Authorization: Bearer` and the server.json body; `/v0/validate` checks the JSON
first with no auth. To republish: bump `version` in server.json (never "latest"), repeat. Only ONE
listing per remote URL is allowed, so don't create a second name for the same server.

**BKM card reference (2026-10-10): `bkm-cards.html` SHIPPED.** Five `table.spec` tables (ids fam1, fam2, fam3, fam4, ctrl; the
row header holds the model plus Sony's name in a `<small>`), sources as `ol.src` with `id="src-N"` and `<sup>` links; the
Sony documents are the only authority — community claims (ConsoleMods, shmups) are marked as such and the "no VCR mode on
BVM-A" sync claim was left OUT because David hasn't tested it. Facts David settled 10/10: the 20E1U has FOUR option slots
(plus the fixed RGB block); his controller on it is the rack-width BKM-10R; BNC counts are printed as Sony's figure, not
counted. `tools/build-datasets.py` builds `data/bkm-cards.{json,csv}` from the five tables (34 rows) and `api/mcp.js` has a
`bkm_cards` tool (filter matches model, fits and family). The MCP server is now SEVEN tools; mcp.html says so.

## Review seven (2026-10-22) — compare mode, the fleet to scale, the model-number page

Shipped from the seventh review (the presentation research round; Project doc `claude/review-7-presentation-2026-10-22.md`
has the ten ideas and David's rulings — 9, 10 and a random-page link are DECLINED; 1, 5, 7, 8 are TABLED with the
photo-dependent work; 6 waits for his BKM card photos).

- **`monitors.html#specs` has a Compare mode.** Two `<select>`s plus clicking table rows (not the model link) pick two
  models; `#cmpout` renders a row per column with the differing rows lit and an "only the differences" toggle. The
  script reads the fleet table itself, so the data still lives in one place — add a column to the table and the
  compare panel follows. `Units` is deliberately skipped. Default pair BVM-20E1U vs PVM-20L5.
- **The fleet table gained a `Dimensions` column** (W × H × D mm, `data-v` = width) and `data/sony-monitor-specs`
  gained the `dimensions` field (`tools/build-datasets.py` asserts 14 header cells now). Dimensions are Sony's
  figures without projecting parts: PVM-2950Q 687×538×529 · PVM-20L5 452×414×500 · BVM-20E1U 444×414×570 ·
  BVM-A14F5U 482×280×571 (482 is the 19-inch rack frame; the bezel body is ≈346) · LMD-9020/9030/9050
  216×230×160 (one Sony manual covers all three, 2-593-389-11; 9020/9030 are on their stands) · LMD-940W
  222×166×70 (dealer copy of Sony's sheet — the one figure not yet read from a Sony document).
- **`monitors.html#scale` — "The fleet, to scale":** two SVG elevations (front with an NES for size and a one-meter
  bar; side) generated by **`tools/build-fleet-scale.py`** between `<!-- fleet-scale:start/end -->` markers. A
  dimension or weight change means editing the MODELS list in that tool and rerunning it; don't hand-edit the SVG.
- **Weights are Sony's now (David, 10/22: "Use Sony's figures"):** PVM-20L5 68 lb (31 kg), BVM-20E1U 82 lb (37 kg),
  BVM-A14F5U 57 lb (26 kg) — the ≈ came off those three on the fleet table, the three profiles, pvm-vs-bvm's table,
  the buying guide's stat and Trinitron Fleet Vol. 1 (DATA + static mirrors). **The magazine fleet-weight stat is
  381 lb** (static `#fleetnum` matches `buildFleetStats`); the "380 lb" line in the declined-content section above is
  superseded. LMD weights were already Sony's and keep their ≈.
- **`sony-model-numbers.html` — "Sony Model Numbers Decoded"** (Reference, 12 min, `main.reading.smn`, OG cut from
  `pvm-2950q.webp`'s SONY badge + buttons). Built from the decoder draft with David's answers: the 20E1U cannot be
  adjusted without its BKM-10R (stated as the consequence of the "1"); the A suffix is OMITTED; the G tube is an
  OPEN QUESTION column; the 1354Q is not mentioned; the LMD digits are a PATTERN cited to Sony's 90x0 manual for the
  differences; AEP left as printed; MD row kept; four-digit BVMs one line. **His 20L5 plate is unverified — the worked
  example doesn't claim a suffix; if he reports "PVM-20L5U", add it there.** Lineage strips (`.fam/.rail/.gen/.pill`)
  wrap to the reading column; lit pills link the profiles. The H1 deliberately carries NO specific model numbers — a
  first draft with "PVM-20L5, BVM-D9H5U and BKM-129X" in the H1 stole the BKM-card queries and dropped search top-1
  from 93 to 89 %; with the plain H1 the battery is 92 / 99 (MCP) and 92 / 98 (header). Hooks done: sitemap, llms.txt,
  footer Reading row (site.js + static footer), home Latest (added this + a "compare / to scale" card; dropped the
  Captain Skyhawk and Orlandu 100 cards, still 9), bkm-cards lede link, pvm-vs-bvm "decoded here" link. Not in the
  story chain (reference page, like bkm-cards). No dataset node — a `sony-model-codes` dataset is a future option.

## Review eight (2026-10-22) — the four tools and the eBay function

David asked for five ideas that "blow me away" after review seven read as "just ok"; he took four to build and
asked for Catalog mock pages first (the fifth). Rulings and the mock are in Project doc `claude/review-8-2026-10-22.md`.

- **`through-the-mask.html` — the tube simulator** (`main.hub`, WebGL). Each monitor is modeled from Sony's figures in
  the page's `M` array: viewable w/h mm, TVL, grille pitch (0.25 E/F from the manual; 2950Q 0.78 from its brochure;
  **20L5 has no Sony pitch — 0.25 class, marked `est`**), damper wires; LCDs by pixel grid with nearest-neighbor 240p.
  Scan lines at h/240, horizontal spot from TVL, eye blur from the distance slider (1 arcmin). It is a model, not a
  photo, and the page says so. `?a=MODEL&b=MODEL` preselects; monitors.html's compare mode links here with the pair.
  OG card is a render of the simulation itself. The tabled macro photo series is its ground truth if it ever happens.
- **`will-it-connect.html` — the connection planner.** Rules in **`data/connect.json`** (hand-authored, CC BY; signals,
  chains, 8 monitors' inputs with `ok / card / converter` states and the card name, 17 consoles' outputs with
  `ok / mod / adapter / region`); logic in **`assets/connect-plan.js`** (UMD, one copy for the page and the server). Verdict order:
  works > needs a card > needs a converter; within that, RGB 15 kHz first. A 480p/HD console on an SD-only monitor
  falls back to 480i. **The MCP server has an eighth tool, `plan_connection`** — test-mcp is 222 checks, mcp.html says
  eight tools and five datasets, the fleet-table row says fourteen columns. Consoles outside the collection are
  described from published outputs and marked by `here: null`; adding one is a JSON entry. No cable brand names.
  **Verdicts (10/23):** "Works as-is" only when neither side needs anything. A console output marked `mod` or
  `adapter` gives "Works with an RGB mod" / "Works with an RGB adapter" ("a console mod" / "an adapter" on a non-RGB
  signal), ranked level with as-is so RGB still wins. The TurboGrafx-16 gets RGB from an external adapter, the EDFX
  AV Adapter (David, 10/23; named as gear, not a cable) — it is not modded. **will-it-connect.html carries an inline
  copy of connect.json in `var DATA`; after editing the JSON, paste it back (json.dumps, ensure_ascii=False).**
- **`bkm-10r.html` — Operate a BKM-10R.** Panel, functions and the whole menu tree from Sony's E/F operation manual
  (archive.org OCR, read in full). Shift-Off labels UNDERSCAN / H DELAY / V DELAY were garbled in the scan and are
  placed from the REMOTE function list; the page says so. Keypad is DIRECT mode; CH 91–95 draw Sony's test patterns;
  PHASE/CHROMA knobs are dead on RGB, as the manual says. The bvm-20e1u.html Control cell now links it.
  **Menu tree corrected 10/23 (David: "you pick")** to Sony's *BVM-14E5/14F5 Operation Manual*, 1st ed. rev. 1, pp. 22–59
  (archive.org `sony_BVM-14F5_14E5_Operation_Manual`; the readable copy of the same menu system — the E/F service manual's
  section 1 OCR is unreadable). Labels are Sony's (REMOTE 2 / REMOTE 2 CONFIG / REMOTE 1 CONFIG, H PHASE, VITS BLK), the
  PRESET/CH SET (100), STD/COL1/COL2/CH SET (200) and probe (220 → 241) levels are restored, EXTEND MENU, YC SEP,
  REMOTE MODE, the 342 pin-function list and all 35 ALIGNMENT items are in; EDH and FACTORY SET were not Sony's and are
  gone. Shared sub-lists are built by small functions (`cp101`, `ct201`, `pin`…) so the tree stays one copy. A node may
  carry both `v` and `items` (an address or file entry that leads to the next list) and an `h` heading. The menu engine
  remembers the parent selection (`S.selStack`). The BKM-10R's 424 × 44 × 157 mm / 1.4 kg / 5 V DC is verified in Sony's
  BVM-G series + BKM-10R operation manual (archive.org `manual_BKM10R_OM_SONY_EN`, Specifications).
- **`api/ebay.js` — the self-cleaning For Sale.** `GET /api/ebay?ids=…` checks each `/itm/` id through the Browse API
  with a client-credentials app token; `live:false` (404 at eBay, OUT_OF_STOCK, or past itemEndDate) hides the card on
  forsale.html and removes the named `data-itm` span from the index marquee; the "More on eBay" feedback line reads
  live `seller.feedbackPercentage` / `feedbackScore` into `data-fb-pct` / `data-fb-score`. **Needs `EBAY_CLIENT_ID` and
  `EBAY_CLIENT_SECRET` in the Vercel env (David's existing eBay developer app, the one the Tidbyt uses); until then
  it answers 503 and the page shows every card as written.** Both were added 10/22. **A Vercel serverless function
  only sees a new or changed environment variable after the NEXT DEPLOYMENT** — adding the keys did nothing until a
  push followed; the same holds for RESEND_API_KEY or any future key. Edge cache 30 min. This is a safety net, not the sweep:
  a sold card still comes out of the HTML in the normal sold sweep. **New sale cards must keep the `/itm/` link and,
  if named in the marquee, a `data-itm` span.**
- Home Latest: the three tools are the first three cards; PlayChoice-10 wall, monitor pages and timeline cards dropped
  (still 9). Footer Reading row and llms.txt carry all three; sitemap blocks added; OG cards cut from
  bvm-sonic-knuckles (connect) and bvm-20e1u-lit (10R).

## The Orlandu Registry (2026-10-23) — the Sony BVM + PVM serial census

David's feature to give collectors a reason to visit: owners register a monitor (model, serial, hours, condition,
acquisition, optional photo), the site counts survivors per model and draws a serial-range chart per model.
Decisions (all his): BVM + PVM only at launch; serials shown with the last two digits masked (20015xx), the full
serial stored privately for duplicate detection; auto-publish with an email alert per entry and a delete link in
it; one optional photo; optional handle + country/state, email required and never shown; **prices and seller
names from other owners are WELCOME** (Price paid + Bought from fields, published if given) — his own entries
carry neither; five condition states; honeypot + rate limit, no Turnstile; "Registry" is a 9th top-level nav item.

**What it is made of**
- `data/registry-models.json` — the catalog: 96 chassis (66 PVM, 30 BVM), ~250 model strings with U/E/J/A/M/QM/MD/SSM
  variants folded under the parent, `era` + `era_confidence` (high = Sony press release/bulletin/brochure date,
  medium = manual copyright or brochure print year, low = collector estimate) + `era_basis` + `sources`. 24
  unconfirmed names are listed in `unconfirmed` and are NOT in the dropdown. **The registry carries these researched
  dates with their tags even where the fleet table / decoder page say otherwise** (BVM-A 2006–c.2009 vs the site's
  2003–2008; PVM-2950Q c.1996–1999 (low) vs 1991–1996; BVM-20E1U c.1996–2001 vs 1995–2002) — David's call 10/23;
  the older pages were left alone. Research with per-model URLs: `Claude outputs/registry/registry-catalog-research.json`
  in his connected folder.
- `tools/build-registry-pages.py` — GENERATES every registry page from the catalog: `registry.html` (census),
  `registry-models.html` (catalog table), `registry-submit.html` (form, `form.rfm` — NOT `.cform`, because site.js
  hijacks every form.cform for the contact relay) and `registry-<slug>.html` × 96. Edit the builder, never the pages.
  Model pages carry the static facts and fetch counts/chart/entries from the API. Head/JSON-LD is in the builder.
- `assets/registry.js` + `assets/registry.css` — the page scripts (body `data-registry` = landing | models | submit |
  model + `data-model`) and styles. The entry card renders in one place (`card()`); photos are an inline 112×76
  thumb (`.ethumb`, opens in the lightbox), not a card header, so cards with and without photos share a row.
  The chart's band width adapts to the serial spread (100 … 500,000). The browser resizes photos to 1600 px JPEG
  before upload (re-encoding strips EXIF/GPS).
- Fields: model (catalog slug or "other" + typed badge), serial, **built** (the plate date, YYYY-MM or YYYY — added after
  David read his plates; with the serial it is the production timeline), hours, cond, note, acq_year, acq_src, price +
  currency, seller, handle, country, state (US only), email (private). David's plates corrected two catalog eras:
  PVM-2950Q to c.1996–2000 (`era_basis` says "a plate in the registry reads June 2000"). The BVM-20E1U's vault date of
  June 2007 is DOUBTED by David (10/23: "seems 8 years too late") — its registry entry has no build date and the catalog era
  stays c.1996–2001 until he reads the plate again; the entry's hours are 44,708 (read 10/23, supersedes the vault's ~40,000).
- **Regional variants (David, 10/25):** the model dropdown reads "BVM-20E1 U/E/J/A" (suffix swaps) or "PVM-1954Q / 2054QM"
  (twins written out) — `optionLabel()` in registry.js; picking a chassis reveals "Badge as printed" (`#variantwrap`), the
  exact variant list with the catalog badge preselected. The server keeps it as `model_as_entered` (public; shown on the
  card's sub line when it differs from the chassis name) — counts, pages and charts still group by chassis.
- **Records strip (David, 10/25) — monitors, never owners.** The summary API carries `records` (most-registered model,
  biggest tube, LOWEST hours — fewest is the ideal, David 10/25 — oldest and newest plate, countries), each pointing at ONE entry; registry.html renders
  them as `.records .rec` tiles linking `registry-<slug>.html#e<id>` (cards carry `id="e<id>"`, `:target` lights one).
  David weighed a per-owner leaderboard and chose this instead: a public ranking of who owns the most is the same
  "actionable intelligence" his no-full-inventory rule exists to avoid, and auto-published entries would make it
  easy to pad. Don't build per-handle totals without asking him again.
- **Only BVMs have an hours meter (David, 10/25):** a PVM card shows no Hours cell at all (a BVM card shows it, dash when
  blank); PVM model pages replace the "Median hours" tile with the build-date span seen on their plates; the form hides
  the Hours field when a PVM is picked (`#hourswrap`).
- **Build year vs catalog era is a NUDGE, never a gate (David, 10/25, on Dan's "limit years per model"):** the form shows the
  catalog era under Built once a model is picked (`#builthint`), warns once when the year is more than a year outside it
  ("press Send again and it goes in as written"), and the alert mail carries a "⚠ Build date outside the catalog era" line
  (`R.eraOutlier` in lib/registry.js). Plates have corrected the catalog twice already; a hard limit would refuse exactly
  the entries the catalog should learn from. The "year acquired" field is deliberately not checked.
  **One hard stop (David, 10/26): a build year after 2010 is refused** (`BUILT_MAX` in lib/registry.js, `max="2010-12"` on
  the input, a client message about phones auto-filling today's date). No BVM/PVM CRT postdates the catalog's 2009; entry 17
  arrived as 2026-10 from a month picker. This is impossibility, not an era judgment — the era check stays a nudge.
  **Standing rule (David, 10/25): an OWNER-CONFIRMED plate outside a catalog era WIDENS the era** (never narrows it) —
  edit `era` in the catalog, name the plate in `era_basis`, keep the confidence tag (it rises only on a Sony document),
  rerun the builder. An unconfirmed plate only flags the alert mail. First applied to the PVM-2950Q: Dan's plate reads
  Aug 1995 → c.1995–2000. The fleet table / magazine / profile still say 1991–1996 for it — David left those alone again. Second case (10/26): Dan's PVM-2030 plate is March 1991 (entry 15, was entered as Oct 1989) → 1986–c.1991.
- **Sony serial ceilings (10/26, from Rado's BVM-20E1E lead):** six catalog entries (BVM-20E1U, 20F1U, 14E1U, 14E5U, 14F1U,
  14F5U) carry `sony_serials` — the E and U serial lists from Sony technical bulletins 1998-289 (Dec 14, 1998, Americas, U ranges),
  1999-274R (Dec 25, 2000, fw 1.34) and 2001-236 (Jul 30, 2001, fw 1.40), COPIED EXACTLY AS PRINTED (scans on ConsoleMods, linked).
  The builder renders them as `#sony` "What Sony's bulletins say" on those model pages. A ceiling is how far a badge's serial run had
  reached by that date, NEVER a production total: the 20E1E's 2,000,505 is the European run only; U sets are a separate sequence
  (2,000,001… then the 2,100,000 block, to 2,100,464 by Jul 2001). Sony's own lists disagree in places (2,100,126 printed for three
  models in 1999-274R; the 14E1U ceiling falls from 2,100,025 to 2,100,016) — keep them as printed, the page says so. The values were
  read from the PDFs' text layer twice; the scans themselves sit behind a Cloudflare human check and were not viewed directly.
  The 20E1's era is now 1996–c.2001, confidence high, on those bulletins. More bulletins (20G1, D series) can be added the same way.
- `api/registry.js` (GET: summary / `?model=slug` / `?entries=1&page=N`, edge-cached 60 s),
  `api/registry-submit.js` (POST, honeypot `site`, validation in `lib/registry.js`, rate limit = entries per hashed IP
  per hour counted in the table itself — `REGISTRY_RATE_PER_HOUR`, default 12 — plus 150/day from everyone,
  duplicate = 409 on the live unique index, Blob upload, insert, Resend alert), `api/registry-admin.js` (GET confirm
  page → POST soft-delete, link signed with HMAC of the id; key = `REGISTRY_ADMIN_SECRET` or, unset, derived from
  `DATABASE_URL`). Shared code in `lib/registry.js` (outside `api/` so Vercel doesn't build it as a function).
  **The chart gets each serial floored to its hundred** — exactly what the mask shows, nothing more; the full serial
  and the email never leave the server. Schema is created on first submit (`ensureSchema`); reads before that
  answer the empty state.
- **First dependencies in the repo:** `package.json` with `@neondatabase/serverless` and `@vercel/blob`, and a
  `.gitignore` for `node_modules/`. No build script, so Vercel still serves the root as static — verify on the first
  deploy. The two SDKs are used only inside the functions.
- Env vars (Vercel project): `DATABASE_URL` (written by Storage → Create → Neon, free plan, connected to the project),
  `BLOB_READ_WRITE_TOKEN` (Storage → Create → Blob), `RESEND_API_KEY` (already there). **A function only sees a new
  env var after the NEXT deployment.** Alerts go from `onboarding@resend.dev` to orlandusarcade@gmail.com — the
  free tier delivers only to the account's own address, which is all this needs.
- Hooks: nav item (site.js NAV, after Wanted; the footer Pages row follows NAV), home Latest card (first, badge
  New; still 9), monitors.html `p.note` under the roster heading, llms.txt two lines, sitemap blocks for all 99 pages,
  `media/og/og-registry.jpg` (cut from the BVM pair photo + wordmark). `build-llms-full.py` SKIPS the 96 model pages
  (`REGISTRY_MODEL`); `build-search-index.py` gives them kind "Registry" and weight 4 so a model number still finds
  the profile page first. No MCP tool yet; `data/registry-models.json` is served with CORS like the other datasets.
- **Indexing (David, 10/26 SEO pass): 13 of the 96 model pages are indexable** — the six with Sony bulletin serial
  lists (`sony_serials`), the arcade's own PVM-20L5, PVM-2950Q and BVM-A14F5U (`PROFILES`; the 20E1U is in both), and
  (10/30, `INDEX_EXTRA`) BVM-D14H1U, PVM-1354Q, PVM-14M2U, PVM-8041Q once each had two owner entries. The other 83 are `noindex,follow` and are NOT in sitemap.xml: ~200 words of shared template each, mostly with no
  entries, were 62% of the sitemap on a domain Google still indexes slowly. `indexable()` in the builder decides; to
  promote a page that has gathered real entries, add its slug to `INDEX_EXTRA`, rerun, and add its sitemap block.
  `registry-models.html` now carries the whole catalog table in its raw HTML (`static_models()`, same markup as
  `models()` in registry.js, which re-renders it with live counts), so the 96 pages are reachable without JS. The four
  monitor profiles link their registry page next to the gallery link. Titles are "Sony <model> Serial Number Registry".
- Testing without Neon: `node test-registry.mjs` and `devserver.mjs` in the session notes run the real handlers on
  PGlite with neon()/Blob/Resend stubbed (29 checks + a Playwright run through the real form). Re-create them from
  the Project doc `claude/registry-2026-10-23.md` if needed.
- Seeding: David's four from the vault (only the BVM-20E1U serial was on file; he is reading the other three plates),
  Dan's fleet by form. **Never publish David's prices or sellers**; other owners' are fine by his rule.
- Open: a price-over-time chart per model once entries carry prices (promised in the house rules), an MCP tool over
  the registry, an "update my entry" flow (today: contact form with the masked serial), LMD/AMS/BKM scope.

**No-wait loading (2026-10-26, David: "it takes 2 seconds to load the entries… make it so there is no delay").**
Measured live: the summary call took ~0.9 s warm (eight Neon queries one after another) and ~2 s after an idle spell
(cold function + Neon compute waking), and the old `stale-while-revalidate=600` let the edge copy lapse after ten
quiet minutes. Three fixes, keep all three:
- `api/registry.js` sends the summary's eight queries together (`Promise.all`; the biggest-tube record comes from one
  `DISTINCT ON (model_slug)` query instead of a follow-up) — one round trip of wait.
- `R.CACHE` in `lib/registry.js` = `public, s-maxage=60, stale-while-revalidate=604800` on every public read: the edge
  answers instantly with the copy it holds and refetches behind the scenes for up to a week of quiet. Vercel strips
  s-maxage/SWR before the browser, which sees `public` + ETag.
- `assets/registry.js` `live(url, paint)`: paints from the last answer kept in `localStorage["orlandu-registry:<url>"]`
  at once, fetches with `cache: "no-cache"`, repaints only if the answer differs; a failed refresh never wipes a good
  copy. After a successful submit, `sessionStorage["orlandu-registry-fresh"]` makes that tab add `?fresh=<ts>` (edge
  bypass) so the new entry shows. Paint functions (`paintLanding`, `paintModel`, `paintModels`) must stay idempotent.
  A `<link rel=preload as=fetch>` was tried and dropped: it can't carry `cache: "no-cache"`, so it double-fetched.

**The registry traffic pass (2026-10-28, `1bbed9b`).** Facebook became the #1 referrer and registry.html the most-visited
page (227 of 446 visitors in 30 days, 63% on phones), so the site now treats the registry as a front door:
- **Home:** `a.regband` under the hero and a Step Inside card after The Monitor Fleet (`media/step-thumbs/step-registry.webp`,
  cut from the BVM pair photo like og-registry). Both carry `[data-reg="entries|owners|countries|models"]` spans with the
  day's numbers baked in; `regCounts()` in site.js repaints them from `/api/registry`, sharing registry.js's
  `localStorage["orlandu-registry:/api/registry"]` copy. The grid is 13 cards now (auto-fill, so a one-card last row on desktop).
- **After a submit** (`showDone()` in registry.js): the form hides (`.rfm[hidden]`), the owner's card renders from the
  response + the posted fields, with "Share this entry" (navigator.share) or "Copy a link to this entry" (no share sheet),
  the model-page link and "Add another monitor". The card's own small Copy button is hidden inside `.done`.
- **Every entry card** ends in `.elink`: "Entry #N" → `registry-<slug>.html#e<id>` (`linkFor`/`absLink`) and a `button.copy[data-copy]`;
  one delegated document click handler copies (clipboard API, execCommand fallback) and flips the label to "Copied".
- **"While you're here"** (`related()` in the builder, `RELATED`/`RELATED_FOR`): six cards on the hub, five on the submit
  page, four per model page by line (BVM → bkm-cards, bkm-10r, pvm-vs-bvm, decoder; PVM → 20L5 buying guide,
  connect-console, pvm-vs-bvm, decoder). `build-search-index.py` strips `<section id="related">` so the row never
  ranks a registry page for another page's words — the eval battery is unchanged from before the row.
- **og:title** on the registry pages says what the page is ("Sony BVM & PVM Serial Number Registry", "Sony <model> Serial
  Number Registry", "Register your Sony BVM or PVM"); `.keeper` under the hub lede names who keeps it and links About + the fleet.
- Not done, by choice: Registry stays 9th in the nav; a CSV export of the entries waits until the list is past ~100.

**Round two of the registry traffic pass (2026-10-28, `1d06811`).** David: "any other improvements… on the whole site."
- **The registry in the AI channel:** `registry_census` is the ninth MCP tool (api/mcp.js). It fetches the site's own
  `/api/registry` (summary, or `?model=<slug>` after resolving a badge/variant against `data/registry-models.json`) and
  returns masked data with license/credit/export fields; API failures come back as `isError`, never a crash.
  `callTool`/`handle` are async now and batches run through `Promise.all`. `GET /api/registry?export=json|csv` is the
  dataset (every live entry, masked, `entry_url` added, CC BY 4.0, cached like the other reads); `?feed=rss` is the
  50 newest entries as RSS. registry.html carries a Dataset node, the download links and a how-to-cite line (builder);
  mcp.html has the tool and a sixth dataset row; llms.txt the lines. `test-mcp.mjs` stubs `globalThis.fetch` for the tool.
- **Site feed:** `tools/build-feed.py` → `feed.xml` (RSS 2.0) + `feed.json` (JSON Feed 1.1), 30 items max, from the
  home Latest ledger and the Stories grid. Dates: a story/new page = the day its file entered git; a ledger card about an
  old page = the day the card's heading entered index.html (`git log -S`). This is the one place the site carries dates
  — publish dates, not stamps in the copy. Every head has `rel=alternate` to feed.xml (registry pages also to
  `/api/registry?feed=rss`; the builder writes both); footer "RSS" link; vercel.json caches `feed.*` with the llms files.
- **Striking-distance pass:** Quick answers on spinning-tops (5, before `</main>`), nes-top-loader, gba-sp and ghostbusters
  (4 each, inside the profile section before the closing note), every fact from the page itself; titles front-loaded
  ("Foreverspin Metal Spinning Tops: 35 Metals, Weighed", "NES Top Loader (NES-101)…", "Game Boy Advance SP, Cobalt,
  with an IPS Screen Mod", "Ghostbusters Premium Pinball (Stern, 2016)…"). pvm-vs-bvm's meta description now answers
  the query in its first clause, and its weight row reads Sony's 68 / 82 / 57 lb (the 10-22 ruling had missed that table).
  These five join the leave-alone list for the 11/10 pass.
- **Fleet page + About:** the four monitor cards on monitors.html end in "N in the registry →" (`[data-regmodel]`,
  painted by `regCounts()` from the summary's `counts`); about.html FAQ + FAQPage JSON-LD gained "Can I add it to the registry?".
- **Outbound links (62 unique, checked 10-28):** 51 OK, 0 dead, 0 hijacked; 11 sit behind Cloudflare/bot walls (KLOV,
  arcade-projects member page, ipdb ×3, pinside ×2, manualowl, sony.com PDF) and can't be verified from here — the
  domains are alive. Extraction recipe: hrefs matching `https?://` minus orlandu.com/web.archive/ebay-itm/instagram.

**Round three (2026-10-28, `02a3e78` + `8dc5275`).** David picked save-as-image, a mobile Lighthouse run and the photo sweep.
- **Save as image:** `cardImage(e, cat)` in registry.js draws a 1080×1080 PNG (canvas: wordmark, model, series line,
  masked serial, meta grid, photo cover-cropped via `crossOrigin=anonymous` — the Blob store answers CORS —, note ≤ 3 lines,
  owner line, ORLANDU.COM/REGISTRY + entry #). `button.cardimg[data-id]` on every card (`ENTRIES` Map keeps the data) and
  a primary button in the done panel; `saveCardImage()` hands the file to `navigator.share` when `canShare({files})`,
  else downloads `orlandu-registry-<model>-<serial>.png`. Fonts are awaited with `document.fonts.load` first.
- **Photo sweep (all 22 owner photos, 10/28):** entries 18 and 19 (Chili's BVM-D14H1E fronts) showed the serial on the
  front-panel label; replacement files with the last two digits blurred are `…-e18-blur.jpg` / `…-e19-blur.jpg` in Blob
  (made in the dashboard page: fetch → canvas downscale-blur of the box → File → the dashboard's upload input), and the
  `photo_url` swaps ship as FIXUPS (`FIXUP_FIELDS` now includes `photo_url`). The submit help text names the status
  screen and the BVM-D front label as places the serial shows.
- **Card thumbnails:** `shrink()` also makes a 320-px JPEG (`photo_thumb`); the function stores it as `<full name>-t.jpg`
  with `addRandomSuffix:false`, so `thumbOf(photo_url)` in registry.js derives it (media/2026 photos → media/thumbs);
  `onerror` falls back to the full file. The 22 existing photos got their `-t.jpg` in one dashboard upload (22 files at
  once works). Live: the hub's card photos went from 1.02 MB to 81 KB. Local Lighthouse (mobile, mock server, no
  compression) on the hub: 90/100/96/100, CLS 0, TBT 60 ms; the only real finding was the thumbnails. PageSpeed's web
  UI stalled and the anonymous PSI API is quota-exhausted — `npx lighthouse` in the container against a local mock
  server with Playwright's Chromium (`CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux64/chrome`) is the fallback.

## Dark backdrops on the PC-10, topper and VS. card walls (2026-10-25)

Every tile on `playchoice-10.html` (52 boards + 10 conversions) and `signage.html` (#toppers, #cards) is now
a cut-out on the Spinning Tops backdrop: a radial glow (46,46,62) → (19,19,34) with a soft drop shadow. The
edge colour is the `.shot` panel colour (#131322), so the photo has no visible frame. Files are
`<old-slug>-dk.webp`; the old files were deleted (CDN immutability rule). David's standard: "this only works
if it looks consistent."
- Boards: 1600×480 (thumb 800×240, exactly the 10:3 plate), built from the published redacted files, so the
  serial redactions and the corner "© orlandu.com" mark carry over (the mark is redrawn on the backdrop).
- **Heavy diagonal watermark on all 62 boards (2026-10-26, David: "use the same more intense watermark used on
  Ninja Gaiden 3 … on all of my playchoice cart pics").** Until then the boards carried the light diagonal
  "© orlandu.com" tile and only Ninja Gaiden III had the heavy one. The other 61 were boosted in place on the
  `-dk` tiles (the light pattern was fitted per board, then raised to the heavy pattern's opacity on the same
  grid, board pixels only), so the cut-outs, keystone fixes and serial redactions are untouched. Files are
  `<slug>-dk2.webp`; the `-dk` files were deleted. Ninja Gaiden III keeps its `-dk` file. A new board gets the
  heavy diagonal plus the corner mark.
- **Light diagonal watermark on all 21 toppers and 18 VS. cards (2026-10-26, David: "put a faint water mark on the
  toppers and VS instruction cards too").** The boards' pattern ("© orlandu.com", DejaVu Sans Bold, -17.75°,
  185 px period, 103 px rows, -35 px stagger at 26 px type) scaled 1.5× on toppers and 2× on cards so it reads the
  same size on screen as on the boards, white at 0.20 alpha (the old light "B" level), panel pixels only (mask
  rebuilt from the compose geometry), plus the corner "© orlandu.com" mark (32 px toppers, 42 px cards). Files are
  `<slug>-dk2.webp`; the `-dk` files were deleted. Builder: `wm.py` (Project doc `claude/dark-backdrop-walls.md`).
- Toppers: 1600×804 (Double Dragon 2400×819); cards: 1600×1600. Both cut from the HEIC camera originals in
  `_originals/`, NOT from the published crops (those clip the outer border on several, e.g. Metroid's yellow
  rim). Each edge was picked by eye at zoom, then perspective-squared: toppers 1.99:1, cards 1:1 except Sky
  Kid and T.K.O. Boxing, which keep their own shape. The Top Gun card's curl was flattened.
- The 13 small PCH1-01-ROM boards were shot with keystone (connector base not parallel to the board top) and
  are homography-corrected; David caught that one.
- 2026-10-26: Double Dribble and Kung Fu toppers added (wall = twenty-one; copyright range now starts at Kung Fu's
  1984) and Gauntlet REPLACED by a nicer copy (`pc10-gauntlet-v2-dk`, old file deleted). Shot standing on the AMS
  rack against the wall, not on the red shelf: four edges fit by RANSAC, the BOTTOM edge is the sticker's lower
  edge (the metal stand's grey lip below it is excluded, matching the older tiles), corner alpha r=0.05h (the
  sticker's own corner is ~0.07h; 0.04h let wall show). One scalar linear exposure gain (0.854) for all three
  (same light), solved so new Gauntlet's p95 L = the old Gauntlet tile's 207; whites were already in the wall's
  range, so no WB change. Masters: `_originals/2026-10-26 gauntlet double dribble kung fu toppers/`.
- A new board, topper or card needs the same treatment to match. The build scripts, edge picks and full
  notes are in `_pending-deploy\dark-backdrops-2026-10-25.zip` in the connected folder and the Project doc
  `claude/dark-backdrop-walls.md`.
