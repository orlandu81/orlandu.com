# orlandu.com — working notes for Claude

> **BEFORE YOU PUSH ANYTHING — ASK DAVID FIRST.** Every push stores a full ~100 MB copy of the site on Vercel. When an
> edit is ready, do not push it. Ask, as a multiple-choice question: **"Push now, or hold it for the next batch?"** Only
> push on "now". This applies to one-line and docs-only commits too, unless his request already said "push now". If he
> says hold, leave the commit local, save a bundle in `_pending-deploy\`, and say plainly what is held.

Static site for Orlandu's Arcade: a garage arcade + game room, ~10 machines, 13 Sony professional monitors,
~25 consoles. Owner: David (GitHub `orlandu81`). No build step — plain HTML/CSS/JS served from the repo root, plus
Vercel functions under `api/`. Organized by topic, not by date. Rewritten 2026-11-27 (73 KB → about half); the
round-by-round text it replaced is in git history, and the long recipes live in the Project docs named below
(`claude/<name>.md` in the claude.ai Project "Orlandu.com").

## 1. Deploying

### Before every push, run these, in this order

```
python3 tools/build-registry-specs.py # only if a model's notes or the PHYS table changed (writes `specs` into the catalog)
python3 tools/build-registry-pages.py # only if data/registry-models.json or the builder changed (writes 99 pages)
python3 tools/build-timeline.py      # only if a timeline thumb/year/date changed; rewrites timeline.html
python3 tools/build-machine-select.py # only if a machine profile's spec tiles/accent, a roster card or a portrait changed (games.html select block)
python3 tools/build-gallery-static.py # after any assets/gallery-data.js edit (plain-HTML wall inside gallery.html)
python3 tools/build-archive.py       # after any Stories or Latest-ledger edit (home reading-room rotation pool)
python3 tools/build-llms-full.py     # llms-full.txt + data/pages.json; refreshes the word count on mcp.html/llms.txt
python3 tools/build-search-index.py  # assets/search-index.js
python3 tools/build-datasets.py      # data/*.json|csv + data/search-index.json (after the index)
python3 tools/build-feed.py          # feed.xml + feed.json; after any Latest-ledger or Stories edit
python3 tools/stamp-assets.py        # ?v=<hash> on every style.css / site.js / gallery-data.js / registry / connect-plan reference
python3 tools/update-lastmod.py      # sitemap <lastmod> = the Pacific day each page's <main> last changed
python3 tools/build-static-footer.py # after any footer/NAV change in site.js, and after build-registry-pages
node tools/test-mcp.mjs              # must print "0 failed"
node tools/eval-search.mjs           # 958 queries, both search paths; top-1 ≥ 90 %, top-3 ≥ 97 % — read BOTH `ALL` lines
```

- Generators that write pages (registry builder, timeline, the magazine `build_page.py` scripts) emit bare asset
  references and an empty `<footer class="site">`, so **stamp and re-render the footer AFTER generating**. The footer
  is pre-rendered into every page for crawlers; site.js overwrites it with the identical string. Never hand-edit it.
- `update-lastmod.py` and `build-feed.py` need full history (`git fetch --unshallow`). Both date by the Pacific day.
  update-lastmod ignores head-only edits. `media/pvm-20l5-checklist.pdf` is in the sitemap WITHOUT a lastmod on purpose.
- Then check locally with Playwright: no console errors, no sideways scroll at **320, 360, 390 and 1280**. Write
  auto-fill minimums as `minmax(min(Npx,100%),1fr)`.

### How a push happens (since 2026-11-14)

Attach the repo with push access (`add_repo`, access `push`), clone in the CONTAINER, commit and push `main` from
there. Commit as `git -c user.name=orlandu81 -c user.email=orlandusarcade@gmail.com -c commit.gpgsign=false` — David is
the author on this repo; if a hook asks to re-author to an Anthropic address, don't, and tell him once. A new
`claude/…` branch pushes; tag pushes and branch deletes are refused. If `main` is refused, push a `claude/…` branch
and merge by pull request. The device shell on his laptop can clone and fetch but **not push**.
Fallback that always works: `git bundle create` in /tmp, copy it into `_pending-deploy\` in the connected folder,
and give him a paste-into-PowerShell block (Git for Windows is installed). Afterwards move the bundle to `_to_delete\`.
Verify a push with the GitHub commit-status API ("Deployment has completed", ~45 s), then the live page in the
browser pane. The container and the device shell cannot reach `www.orlandu.com`; WebFetch caches 15 min per URL.

### One push per session; a rejected push means another session is live

Batch a session's work, verify locally, ask, push once. A second push needs a reason (he asked for it live, or the
first was broken). A sale that must come off For Sale is a "now"; a caption tweak is a "hold".
David runs several Claude sessions against this repo. **Never `--force` or `--force-with-lease`.** On `! [rejected]`:
fetch, read `git log --oneline HEAD..FETCH_HEAD`, merge if clean and say what came in. If it conflicts, throw away
YOUR version (`merge --abort`, `reset --hard FETCH_HEAD`, redo your edit on their file), then re-read your content
against the merged file — a stale edit can be wrong, not just conflicting.

## 2. Hosting and verification

- **Vercel**, auto-deploys `main`. `vercel.json` is the only hosting config: security headers, caching, CORS on
  `/data/*` + llms/feed files, redirects (`/index.html → /`, `/library.html → /consoles.html`,
  `/signal-chain.html → /connect-console-to-pvm.html`, old AMS-100 PDFs → `-rev3`). DNS is GoDaddy; check with
  `https://dns.google/resolve?name=www.orlandu.com&type=CNAME&cd=0`, never infer the host from repo files.
- **Internal links to the home page are `/`, never `index.html`.**
- Analytics self-traffic opt-out: `?noanalytics=1` on any page sets `localStorage["orlandu-noanalytics"]="1"`. Open the
  first page in a new browser-pane profile that way.
- A Vercel function sees a new or changed environment variable only after the NEXT deployment. Env vars:
  `RESEND_API_KEY`, `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` (write-only in the UI), `DATABASE_URL` + the Neon set,
  `BLOB_READ_WRITE_TOKEN`, optional `REGISTRY_ADMIN_SECRET`.
- **Never delete** `7984e193fb220a08e3d0a7abd9711dcd.txt` (IndexNow key), `BingSiteAuth.xml`, or the MCP-registry TXT
  record at the apex. `ebay-callback.html` and `tesla-callback.html` are noindex utility pages, not part of the site.
- IndexNow: GET `https://api.indexnow.org/indexnow?url=<urlencoded>&key=7984e193fb220a08e3d0a7abd9711dcd` from a
  www.orlandu.com page in the browser pane (`fetch(..., {mode:'no-cors'})`). Google ignores IndexNow; use Search
  Console's Request Indexing (recipe and quota in the project notes on SEO).
- PageSpeed runs from the browser pane (pagespeed.web.dev). A local Lighthouse run is indicative only: it reported
  CLS 0.16 on the home page where the live page measures 0 (11-27: live mobile 96 / 100 / 100 / 100).

## 3. Media

- Photos are **WebP**: full size `media/2026/` (longest side ≤ 1600, q82), thumbs `media/thumbs/` 800 wide plus
  `-400` / `-600` siblings, saved with Pillow `save(p, "WEBP", quality=82, method=6)`, never with `exif=`.
  `media/og/` stays JPEG. HEIC needs `pillow-heif` and `ImageOps.exif_transpose`.
- **Never replace a media file in place.** `/media/*` and asset images/fonts are `immutable` for a year. A changed image
  gets a NEW filename (`-v2`) and the old file is deleted. CSS/JS are stamped by `stamp-assets.py`.
- **Strip location metadata.** iPhone originals carry GPS; never commit a camera original into `media/`.
- **Video is three encodes per clip:** `.av1.mp4`, `.hevc.mp4` (`hvc1`), then the H.264 `.mp4` last, each `<source>`
  with a `codecs` type. `tools/encode-video.sh media/video/<clip>.mp4` makes the siblings and prints SSIM (keep ≥ 0.97).
  H.264 stays canonical (VideoObject `contentUrl`, sitemap `video:content_loc`). Playwright's Chromium cannot decode
  H.264 or AV1 here — check playback in the browser pane.
- **Fonts are self-hosted** in `assets/fonts/` (Orbitron, Rajdhani, Barlow Condensed, Press Start 2P) with
  metric-matched `"… Fallback"` faces. Never add a Google Fonts link; copy an existing `<head>`.
- **First-screen images:** not lazy; the top one has `fetchpriority="high"` and a matching `<link rel="preload"
  as="image">` (with `imagesrcset`/`imagesizes` when the image has a `srcset`). Change both together.
- **`srcset` + `sizes` are MEASURED from the rendered slot**, not guessed. Wall and profile thumbs carry
  `-400/-600/800`. Home Step-inside tiles carry `-320/-640/-800/1200` with
  `sizes="(max-width:700px) calc(50vw - 26px), (max-width:1060px) calc(50vw - 29px), 400px"` (re-measured 11-27; the
  old `73vw` value was wrong). A new Step tile owes all four sizes.
- **Thumbs:** story and step thumbs are 1200×514 with an 800×343 sibling, cut from the page's OWN media. The Collection
  menu tiles are `step-<slug>-320/-640.webp` from site.js's `COLLECTION` map — the JS string can't carry `?v=`, so a
  re-cut RENAMES the slug. Timeline tiles are 84×84 cut by `build-timeline.py`. The Signage step tile is the
  Superbrite sign (`step-signage-v2`), not cards.
- **A story card photo shows a GAME on a screen** when one exists (David rejected a three-LMD photo for that reason).
- **Never crop a subject out to make a layout align.** Use `object-fit:contain` plates; frame a symmetrical object
  symmetrically. A gallery recrop changes the entry's `w`/`h` in `gallery-data.js`. Nothing wider than ~2.2:1 goes in
  the home filmstrip.
- David's edited photos arrive as lowercase `.heic`; uppercase `.HEIC` beside them are unedited originals. A fresh
  OneDrive file that the device shell can't open can usually be staged (`device_stage_files` hydrates it).
- **Watermarks:** For Sale photos (`© orlandu.com`, bottom-right) and the PC-10 board, topper and VS.-card tiles
  (section 10). Nothing else. Listing copies for eBay / KLOV are made WITHOUT the site mark.
- **Logo files:** nav `assets/logo-wordmark-nav-v3.webp`, hero `logo-wordmark-hero-v4.webp`, JSON-LD
  `logo-wordmark-v3.png` — the cut-out wordmark with its bottom pixel row cleared (the source PNG carried a gray line
  there). **OG cards:** 1200×630 JPEG, wordmark bottom-left. On 11-27 the 29 cards built before the logo fix were
  repaired (the gray line under ARCADE was baked into them) and renamed one version up; `og-signage-v4` was rebuilt
  from the cut cards. Ten cards (big-blue, donkey-kong, ghostbusters, indiana-jones, mario-bros, orlandu-100,
  orlandu-50-games, rick-and-morty, tna, vs-unisystem) carry no wordmark by design. Build a new card with the v3
  PNG, and rename on any change (scrapers cache by URL).
- **Home hero** is DRAWN in style.css (Trinitron grille, vignette, SMPTE bar strip, horizon line through the vertical
  center of the wordmark at 40 %, stars, scanline sweep). Extras in index.html: a PVM readout once per session, a round
  DEGAUSS button (4.6 s, 5 s cooldown), INSERT COIN → PRESS START to a random coin-op profile. The nav carries a 2 px
  accent line per word in its hub color (Collection white), 40 % at rest. **Declined, don't re-propose:** a photo
  backdrop, nav-word tints, a solid current-page highlight, a nav gradient, VHS tracking, a game running behind the
  logo, machine silhouettes, a CRT power-on, moving the horizon to the floor, a random INPUT readout.
- **Loops on signage.html:** `sign-kaybee-loop-v2` and `sign-racetrack-loop-v2` (12.0 s, 1280×416; light bleed removed
  11-27). A rebuild of the racetrack loop from the 4K original was made and measured the same night (fiber detail
  +7 %, black face equal, no visible difference at 3×) and NOT shipped — don't redo it. David finds the Kay·Bee
  loop fine as it is. Recipes: `claude/racetrack-light-bleed-2026-11-27.md` and the project notes on each loop.
- Never hard-code the marquee's animation duration (site.js sets it from 75 px/s). Marquee CSS targets `.strip>span`
  (direct child only); the FOR SALE items are nested `data-itm` spans.

## 4. Page conventions

- **Titles** front-load the searchable term, 58–65 characters, ending "— Orlandu's Arcade". `og:title` /
  `twitter:title` keep the short form. Titles outside that range on ~35 pages are his call; don't trim unasked.
- Head: `robots` `index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1`, description ≤ ~158,
  canonical + og:url, one H1, `rel=alternate` to feed.xml and the llms files. Copy an existing head.
- **Quick answers:** `h2.sec` "Quick answers" + a single-column `.grid` of `.card`s (h3 question, p answer). Facts only
  from the site, no prices, NO FAQPage schema (about.html's FAQ is the one FAQPage; edit its JSON-LD with it).
- **JSON-LD:** one `@graph` per page (WebSite + Organization + Person + page node + BreadcrumbList). **No `Product`
  anywhere** (use `Thing`); forsale.html has no Product/Offer/ItemList. **No `datePublished`.** Every `ImageObject`
  carries `creator`, `copyrightNotice`, `creditText`, `license` + `acquireLicensePage` → `about.html#photo-use`.
  In nodes Google validates (Dataset) write creator/publisher inline. No PostalAddress/LocalBusiness.
- **Profiles** (machine, monitor, console): `main.profile`, a page-scoped accent `<style>`, `div.prail` (sticky
  `figure.pshot` + `.specs`), `nav.machnav` prev/next in the hub's order. A new profile = hub-card link + sitemap block
  + llms.txt line + timeline href + re-link both neighbors + an OG card.
- **Work logs** (`ul.worklog`) come from `vault.html` on David's device, not from asking him; skip trivial repairs.
- **Grids.** `.grid.c2`/`.c3` are auto-fill. A block with a FIXED number of cards adds `n2`/`n3`/`n4`/`n5` so no row
  ends with a hole — change the class when the count changes. **Cascade trap:** the "Review eleven" block near the end
  of style.css restates `.grid.c2`/`.c3`, so any EARLIER rule of equal specificity that sets columns on such a grid is
  dead. It switched off the `n*` rules (11-20 → 11-27) and the phone two-across Step-inside rule (same dates; phones
  showed twelve full-width tiles). Put a column rule AFTER that block or give it more specificity
  (`.grid.c2.steps`). A photoless card can't share a row with photo cards.
- `#contact` on about.html is five cards across from 1000 px; its h3s wrap (`overflow-wrap:anywhere`, and the email
  has a `<wbr>` before the @) — the address used to be cut off at 1280.
- **Section ids:** `#wall` is taken by style.css. The sitewide search input is `id="q"`; the magazine filter is
  `id="mq"`. Every `main h2` gets a runtime id from its text (so `consoles.html#sega` works; renaming a heading
  changes it). `a[href="#search"]` opens the search dialog.
- **Accessibility:** scrolling `.tablewrap`s and `pre.chain` carry `tabindex="0"`; blank corner `<th>`s get an
  `.sr-only` label; full-bleed bands outside `<main>` carry `role="region"` + `aria-label`; a button's `aria-label`
  must contain its visible text. Run axe with reduced motion. Known and left (moderate): heading order on bkm-10r and
  the games select block, `.regband` and the magazine back-pill outside a landmark, nine BKM-10R two-legend keys.
- **Callouts:** two back-to-back thoughts share one `div.note`; sources and caveats are `p.note.fine`.
- **Lightbox** clones `figcaption` innerHTML (markup in a caption needs a `#lightbox` style). Scroll-reveal threshold
  stays 0. Pages with `div.rt` get reading progress and a resume pill.
- Small labels are Barlow Condensed; Orbitron keeps H1/H2/card titles/nav/buttons. The nav fits one row from 761 px —
  re-measure the header at every 10 px after adding a nav word. Footer = four literal columns in site.js.

## 5. Content and privacy rules David has set

- **Location is "Orange County, California" — never the city.** A PRIVACY rule (the arcade is in his home). No city,
  neighborhood, landmark, ZIP, school, local business, house number or street sign — in copy, meta, JSON-LD, alt text,
  llms.txt, site.js, commit messages or the GitHub description. "Southern California" is fine.
- **No which-room mapping** for a specific machine. Still present, pending his call (voice, not a map — ask before
  flattening): games.html's two-room lede and PVM note, about.html's two-room description, an index card, the "Garage
  arcade" lane headings in connect-console-to-pvm.html#chain, captions on photos that literally show the garage.
- **No full inventory:** one card per model on consoles.html, no unit counts, no condition values, serials or prices
  of his own items. Video games stay off the site (a game he puts up for trade is his call, not a reopening).
- **Every photo must be his own.** Exceptions he approved, credited: iFixRetro's X'Eye bench photos; Switch 2
  screenshots on the Ocarina story ("Game imagery © Nintendo", no photo-use license). **Nintendo Power and strategy
  guide scans are research only — never publish a page scan or a crop of one**; cite by volume and page.
- **Serials:** check every new photo (the lightbox shows the 1600 master) for serials, barcodes and asset tags. On the
  PC-10 boards the serial is DESTROYED, not blurred. AMS rear photos are redacted. He chose to leave the Captain
  Skyhawk and Baseball Stars sale photos as they are. Registry owner photos: section 9.
- US spelling. No date stamps in page copy; the feed is the one place dates exist. Don't imply a current count from a
  photo of a past state. An "arcade" is a place — never call a machine or cabinet an "arcade".
- One photo, one editorial home; the gallery may draw from anywhere and is a curated showcase (bench shots stay on
  their story). A gallery entry is also a home-filmstrip entry. The gallery wall order is a deliberate subject spread.
- **Never publish a fault on a machine he has sold. Never editorialize a flaw from a photo.** Captions on object walls
  are title-only; a caption that narrates what the photo shows gets removed.
- **Site identity (11/21):** "a pretty collection and learn conceptually how things work" — NOT a how-to / fix-it
  site. Don't pitch repair how-tos.
- **Declined — don't propose again:** sourcing/channel content; failures/regrets editorial; composite-video
  screenshots on his monitors (RGB only); grayscale memoriam photos; a per-owner registry leaderboard; The Catalog
  (PDF book); AVIF (measured ~15 %); forum/Reddit/HN/outreach posting (organic only; a one-time editor tip to RetroRGB
  was his own exception); FAQPage on guides; Article dates; a PC-10 "missing titles" checklist (52 is the complete
  library); attract-mode clips on profiles; the big-blue-side-art reshoot; poster-style Step cards; home as a front
  page; a VS. board wall and a BKM card wall; restoration strips, "what feeds it" rows, a random-page link; stories
  "How a Trinitron Makes a Picture" and a degauss explainer; scheduled reminders about photos.
- Big Blue runs a **Darksoft CPS-2 multi in a Jasen's Customs case**, not a Marvel vs. Capcom board. Plain unit
  provenance ("sourced from Japan") stays; channel-flavored copy is out.

## 6. Collection pages

- **games.html** ("Coin-Op Games"; every piece of media must be coin-op) opens on the **machine select screen**: ten
  static `.spanel` panels plus a roster of 240 px tiles, grouped Uprights / Pinball / Candy & cocktail, year order.
  The block between `select:start/end` is GENERATED by `tools/build-machine-select.py` (roster, copy and portraits in
  the tool; spec tiles and accent read from each profile). The name is sized from its own column (`9.5cqi` fits
  GHOSTBUSTERS); check every panel at every width after a change. **In memoriam** there is the only memoriam on the
  site; don't clone it (the PlayChoice story's reuse of three of its photos was a one-off approval).
- **Console photos are cut-outs on the dark backdrop** (`consoles-<slug>-dk`, 4:3, object at 80 %), acrylic stands
  redrawn as glass; used on consoles.html, the six profiles, jvc-xeye and timeline tiles. Recipe:
  `claude/big-two-build-2026-11-10.md`. consoles.html sorts by the PLATFORM's original release within each maker;
  years are North American releases. Six consoles have profiles (nes-top-loader, nintendo-64, gba-sp, genesis-cdx,
  pc-engine-duo-r, ps2-slim); the rest stay card-only by his choice. Each profile has an "At launch" section whose
  every fact names its source; launch prices stay OUT of Quick answers.
- **monitors.html:** the four tube cards and the LMD card are cut-outs on the dark backdrop (`monitors-<slug>-dk`),
  also used on the five monitor profiles, the buying guide, timeline, gallery/filmstrip and his registry entries.
  Recipe: `claude/monitors-dark-backdrop-2026-11-20.md`. Old `pvm-2950q` / `pvm-20l5` / `bvm-20e1u-lit` /
  `bvm-a14f5u-lit` files are kept unreferenced for cached registry answers — delete after 12/1. **The fleet is
  THIRTEEN units across EIGHT models**; a count change is swept across index, monitors, stories,
  connect-console-to-pvm, pvm-vs-bvm and Trinitron Fleet Vol. 1. `#specs` is condensed from the magazine's `DATA`
  (change both); `#scale` SVGs come from `tools/build-fleet-scale.py`. Weights and dimensions are Sony's figures.
- **playchoice-10.html:** 52 board tiles (title-only, alphabetical ignoring "The") + 10 conversions + anatomy. Slugs
  `pc10-cart-*` / `pc10-conv-*`; toppers own `pc10-<slug>` and stay on signage.html.
- **signage.html:** topper wall (21, alphabetical, Double Dragon double-wide), VS. instruction cards (18), three lit
  signs. A topper is a sticker on a metal stand; the VS. cards were made for the Red Tent, the toppers were not. Say
  "topper", not "insert" or "marquee".
- **wanted.html:** the hunt list as he tiered it, plus `#bvm` (a BVM-D20F1U or BVM-A20F1U; copy from the registry
  catalog only). "What it looks like" links must open on a page that SHOWS the object. **Name clashes:** a name on
  the wanted list, the Orlandu 50, a wall or For Sale is often a DIFFERENT object — read every grep hit.
- **Timeline** is generated by `tools/build-timeline.py`: release years only, never acquisition dates. `RELEASED`
  holds each console's on-sale date, source and grade ("period" or "reference"); upgrade a reference row only with the
  period document in hand. His New 3DS XL SNES Edition is the U.S. Super NES Edition (2017).
- **guide-shelf.html:** 22 covers (title-only) + `#how-they-arrived`, cited by Nintendo Power volume.
- **Machine paperwork** sits above the Work log on donkey-kong, red-tent, ghostbusters and indiana-jones (cut-outs on
  the backdrop, no invented body copy). Recipe: `claude/machine-paperwork-2026-11-23.md`.
- **Counts on the home page** are swept when a wall changes; the Stories step card says "More than twenty long reads"
  on purpose (an exact count went stale at thirteen).
- **Facts David settled (don't re-raise):** TNA is 2017 with the Classic Edition package he installed; he runs the
  latest code on every pin; the DK cabinet also plays DK Jr. and DK 3; the Superbrite has three F25T12 tubes; both
  N64s and both NES units are RGB-modded (NESRGB); the Duo-R has RGB + region mods; the TurboGrafx-16 is stock and
  reaches RGB through an EDFX AV Adapter; the PS2 Slim is not modded; one switcher per room; the Mini Cute is fully
  original; LMD-9020 SD only, LMD-9030 HD over component, both 640×480; LMD-940W HDMI + SDI; BVM-A14F5U has the
  BKM-68X clone + BKM-62HS; the 20L5's slot holds a BKM-129X (second analog input, not SCART/VGA), sync 15–45 kHz
  (its grille pitch is 0.31 mm per Sony's preliminary spec sheet — that change to through-the-mask ships with the
  held How Big story); BVM-20E1U has four slots with only a BKM-21D fitted, is controlled by the BKM-10R, reads
  44,708 hours, plate October 1998, fully serviced by **SavonPat** in 2026 (story `bvm-20e1u-service.html`; Sony's
  30,000-hour rating was cut from it — don't put it back); the AMS-3 is in storage with its pots fixed; Ghostbusters'
  Spike 1 board is a spare; the PlayChoice library is 52; he finished A Link to the Past about fifty times.

## 7. For Sale and sold items

- **forsale.html is present tense.** A card comes OUT the moment the item sells — no SOLD badge, no archive. Copy is
  short: what it is, why this example, the one caveat. Badge `On eBay · $PRICE` (re-read eBay before quoting) or
  `For trade` (link "Offer a trade →" to `about.html?subject=…#write`, no `/itm/`). Never publish what he paid,
  sellers or receipts. Never put site links in an eBay listing.
- **The sweep when something sells:** the card → the FOR SALE marquee segment in index.html (`data-itm` span) →
  sitemap `<image:image>` line + delete both `sale-*` sizes → re-cut `step-forsale` if it was cut from that item →
  gallery entry + files → counts and copy on neighbors → generators. The first card owns the head preload.
- **Layout (11-27):** page-scoped CSS on `.grid.c2.sales` — fixed columns (1 / 2 from 701 px / 3 from 1141 px), dense
  flow; a `wide` card spans two and sits BEFORE the single card that shares its row. Count columns when a card is
  added or leaves. Marquee photos are full-frame rectangles with square corners. Kit:
  `_pending-deploy\for-trade-2026-11-27.zip`.
- **`api/ebay.js`** is the safety net: `GET /api/ebay?ids=…` checks each `/itm/` id (edge cache 30 min);
  `live:false` hides the card and the marquee span. New sale cards keep the `/itm/` link and a `data-itm` span.
  A 401 `invalid_client` means the Vercel key values don't match his eBay app.
- **Memoriam bar is high:** a departure usually gets a clause in existing prose. `alumni-ams-100.webp` and the Double
  Dragon board photos are kept unreferenced on purpose.

## 8. Generated content, search and the AI channel

- **Site search:** the header dialog and the MCP `search_orlandu` share ONE ranking — `search()` in `api/mcp.js` and
  the `/* search-score:start … end */` block in `assets/site.js`. Change both or neither. Index weights: profiles /
  guides / tools / hubs 10, other pages 6, glossary 5, cards 4, FAQ 3, photos 2, registry model pages −10, Wanted cards
  that link a registry page −14, playchoice-10-ranked −16, playchoice-10-story −4, nes-number-ones −10 (so a wall or
  profile wins its own query). `HINTS` adds search-only words per page — add one only if it moves a battery query.
- **Glossary tooltips** come from `glossary.html` via `tools/build-glossary.py` (first occurrence per page).
- **Feed:** `feed.xml` + `feed.json` from the Latest ledger and every `a.card.linked` on stories.html.
- **llms.txt** is hand-kept (add new pages); llms-full.txt + `data/pages.json` are generated. **Datasets** under
  `data/` are CC BY 4.0 (prose and photos stay ©); each owning page carries a Dataset node.
- **`api/mcp.js`** — read-only MCP server, nine tools; mcp.html and llms.txt state the counts. Published in the MCP
  Registry as `com.orlandu/arcade` (key `mcp-registry-key.pem` in the connected folder, never in the repo).
  Wikidata: Sony AMS-100 is Q141689973. Never add prompt-injection text for assistants.
- **will-it-connect.html:** rules in `data/connect.json` AND an inline `var DATA` copy — paste the JSON back after
  editing. **through-the-mask.html** models each tube from Sony's figures. **bkm-10r.html** follows Sony's
  BVM-14E5/14F5 Operation Manual. **sony-model-numbers.html:** no specific model numbers in the H1; G-tube pitch is
  "undocumented" by his ruling. **bkm-cards.html:** Sony documents are the authority; community claims are marked.

## 9. The Orlandu Registry (Sony BVM + PVM serial census)

- **Rules (David's):** BVM + PVM only; serials shown with the last two digits masked; auto-publish with an email alert
  + signed delete link; optional photo, handle, country/state. Other owners' prices and sellers are welcome; his own
  entries carry neither. Records strips show monitors, never owners; he CUT Priciest, Where they came from, Farthest
  from the factory and Lowest/Highest serial — don't bring them back. Only BVMs have hours. A build year outside the
  catalog era is a nudge, never a gate (after 2010 is refused); an owner-confirmed plate WIDENS the era. The registry
  keeps its researched eras even where the fleet table says otherwise (his call).
- **Files:** `data/registry-models.json` is the catalog (96 chassis). `tools/build-registry-pages.py` GENERATES
  registry.html, registry-models.html, registry-submit.html (`form.rfm`, never `.cform`) and 96 model pages — edit the
  builder, never the pages. `api/registry.js`, `api/registry-submit.js`, `api/registry-admin.js`, shared
  `lib/registry.js`; `assets/registry.js` paints from localStorage then refreshes (paint functions stay idempotent).
  Model pages carry a Specifications table from `tools/build-registry-specs.py` (add a PHYS row only with the source
  in hand; wiki figures are labeled community).
- **Data fixes ship as code:** FIXUPS in lib/registry.js (`photo_url`, `built`, `cond`, `hours`, serial prefix swaps)
  — David does not run SQL or click through admin consoles. A blurred photo goes into Blob under a NEW name.
- **Owner photos** are checked for readable serials when an entry arrives. Full sweep 11-27: 36 entries, 28 owner
  photos, nothing readable; entries 18, 19, 30, 31 and 32 are blurred copies and entry 35's owner masked his own.
- **Indexing:** 13 model pages are indexable (six with Sony serial ceilings, his own, and `INDEX_EXTRA`); the rest are
  `noindex,follow`. To promote: add the slug to `INDEX_EXTRA`, rerun, add the sitemap block, request indexing.
- Home: `a.regband` + a Step card with live counts; monitors.html cards end "N in the registry →".
- Testing without Neon: PGlite harness in `claude/registry-2026-10-23.md`.

## 10. The three object walls

"This only works if it looks consistent" (David) — a new tile gets its own wall's treatment.
- **PC-10 boards (playchoice-10.html): cut-outs on the dark backdrop** — radial (46,46,62) → (19,19,34), soft shadow,
  1600×480, heavy diagonal watermark + corner mark (`<slug>-dk2.webp`). Kit: `_pending-deploy\dark-backdrops-2026-10-25.zip`
  + `dark-backdrops-wm.py`; doc `claude/dark-backdrop-walls.md`.
- **Toppers (signage.html#toppers): each fills its tile** since 11-27 — `pc10-<slug>-cut.webp`, 1600×804 (Double
  Dragon 2400×819), alpha outside the panel, thumbs 800/600/400. Cut from the HEIC originals, every side traced and
  checked on a zoomed band; the bottom edge is the sticker's edge, never the metal stand's lip; 56 px corner radius;
  light diagonal mark at 0.20 + 34 px corner mark. Kit: `_pending-deploy\topper-cut-2026-11-27.zip`; doc
  `claude/topper-wall-recut-2026-11-27.md` (per-topper notes).
- **VS. instruction cards (signage.html#cards): each fills its tile** since 11-27 (he called the For Sale Excitebike
  cut "perfection") — `vscard-<slug>-cut.webp`, edges traced on the card and straightened in one resample, corners
  masked to the card's own shape, camera tone untouched, diagonal mark + 42 px corner mark. Kit:
  `_pending-deploy\vs-card-cut-2026-11-27.zip`; doc `claude/vs-card-wall-recut-2026-11-27.md` (per-card notes).
- Spinning tops (60 tiles, 1200 px by design) and the guide shelf have their own docs
  (`claude/spinning-top-wall.md`; project notes on the guide shelf).

## 11. Stories, home page and other features

- **stories.html** is grouped: featured card, `#monitors`, `#arcade`, `#consoles`, `#whole`, `#offbeat`, with a
  `.chips` jump row. A new story goes FIRST in its section; the featured slot and three rolling New badges move with
  it. A new story also owes: story thumb + OG card, home Latest card (nine text cards; the oldest drops) + marquee
  line, sitemap block, llms.txt line, search weight/hints check, links from related pages, `build-archive.py`, and —
  as soon as it is live — IndexNow + Google Request Indexing. David posts story links on KLOV himself and likes a
  short text plus a screenshot of the top of the story.
- **Live stories and their fixed points:** `playchoice-10-ranked.html` (FEATURED; scoring: 30 points for #1 down to 1,
  bi-monthly charts count twice; the table and SVG are hand-written from the dataset in
  `claude/nintendo-power-nes-charts-2026-11-26.md` — a matching change means re-scoring); `playchoice-10-story.html`
  (single-monitor PlayChoice existed as a cabinet AND a kit); `why-old-games-look-wrong.html` (a DRAWN demo from
  `tools/build-oldgames-demo.py`; the robot is original — never a known character; no composite claims);
  `reading-a-sony-plate.html` (480 px photos at native size; most J-suffix monitors carry no plate date);
  `how-to-read-a-playfield.html`; `mario-before-super.html`; `ocarina-of-time-switch-2.html`; `jvc-xeye.html`;
  `connect-console-to-pvm.html` (holds the merged Signal Chain as `#chain`); Trinitron Fleet Vol. 1 (kept, not merged).
- **HELD, not on main (bundles in `_pending-deploy\`, both re-cut on 11-27 against that night's main):**
  "How Big Is Too Big?" (`how-big-is-too-big.html`, the 10-minute cut David has not read; his 11/21 ruling was "recut
  to 10 mins, then keep holding it") and "Only Ten Games Ever Topped Nintendo Power's NES Chart"
  (`nes-number-ones.html`; title is Claude's). Release = fetch the bundle, merge, rerun the pre-push list, ask.
  Tabled story ideas (not declined): `claude/story-ideas-2026-11-20.md`.
- **Home page:** registry band under the hero; ticker; filmstrip (from the gallery); Step Inside = twelve cards, two
  across on phones (thumb + title only), three across from 1061 px; the reading room rotates three older stories a
  week from the `archive-pool` markers; Latest ledger = lead card + eight.
- **Search-engine leave-alone lists** and what is owed on the next monthly pass (the 10th) live in the project notes
  on SEO and `claude/seo-check-2026-11-27.md`. Owed 12/10: a "What is a PVM? What is a BVM?" section on pvm-vs-bvm,
  the playfield-story link on ghostbusters, repointing two signal-chain links (pvm-vs-bvm, nes-top-loader).
- **Contact form:** `api/contact.js` relays through Resend to orlandusarcade@gmail.com; `form.cform` on
  about.html#write and wanted.html#have-one; honeypot `site`; the mailto stays as the fallback.
- **Gallery:** tags + `TAG_LABELS`, deep links `gallery.html#tag=<slug>`, Attract Mode slideshow (`#play`).
- **The AMS-100 monograph:** the web edition is canonical; no images; §4.5.2 / EXT-02 removed and never reintroduced;
  all rights reserved. The PDF `media/ams-100-monograph-rev3.pdf` is typeset FROM the web edition
  (`claude/ams-100-pdf-build.md`); publish a rebuild under a new filename. Appendix E cites Sony's AMS-3 manual.
- **Vault:** `vault.html` on David's device (not in the repo), ~1,283 items; facts he has corrected on the site win.
  `C:\Users\david\Vault Photos` holds documentation shots by item id. Searched 11-27 for larger originals of the 35
  published photos under 1,400 px: none is the same shot. It does hold sharp, separate photos of Big Blue's marquee
  and control panel (`ARC\ORL-ARC-1`), offered to David as replacements for the two 520 px photos — his call.
- **Sweep baseline:** `_qa\baseline-2026-11-20-*.zip` in the connected folder (65 pages × 390/768/1280/1920). Every
  page is ~25 px shorter than those shots since the footer lost a link, so compare regions, not page heights.
