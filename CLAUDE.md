# orlandu.com — working notes for Claude

> **BEFORE YOU PUSH ANYTHING — ASK DAVID FIRST.** Every push stores a full ~100 MB copy of the site on Vercel and
> the Hobby Deployment Storage allowance is the binding limit. When an edit is ready, do not push it. Ask, as a
> multiple-choice question: **"Push now, or hold it for the next batch?"** Only push on "now". This applies to
> one-line and docs-only commits too, unless his request already said "push now". If he says hold, leave the
> commit local and say plainly at the end of the session what is held (a held commit lives only in that clone).

Static site for Orlandu's Arcade: a garage arcade + game room, ~10 machines, 13 Sony professional monitors,
~25 consoles. Owner: David (GitHub `orlandu81`). No build step — plain HTML/CSS/JS served from the repo root, plus
Vercel functions under `api/`. This file is organized by topic, not by date; rewritten 2026-10-30 from the
round-by-round notes (the old text is in git history if a detail is ever missing).

## 1. Deploying

### Before every push, run these, in this order

```
python3 tools/build-registry-pages.py # FIRST, only if data/registry-models.json or the builder changed (writes 99 pages)
python3 tools/build-timeline.py      # only if a timeline thumb/year changed; it rewrites timeline.html
python3 tools/build-llms-full.py     # llms-full.txt + data/pages.json (what the MCP server reads); refreshes the word count on mcp.html/llms.txt
python3 tools/build-search-index.py  # assets/search-index.js is generated
python3 tools/build-datasets.py      # data/*.json|csv + data/search-index.json (after the index)
python3 tools/build-feed.py          # feed.xml + feed.json; run after any Latest-ledger or Stories edit
python3 tools/stamp-assets.py        # ?v=<hash> on every style.css / site.js / gallery-data.js / registry / connect-plan reference
python3 tools/update-lastmod.py      # sitemap <lastmod> = the Pacific day each page's <main> content last changed
python3 tools/build-static-footer.py # after any footer/NAV change in site.js, and after build-registry-pages
node tools/test-mcp.mjs              # contract checks on api/mcp.js — must print "0 failed"
node tools/eval-search.mjs           # 271-query battery vs both search paths; top-1 ≥ 90 %, top-3 ≥ 97 %
```

- Generators that write pages (registry builder, timeline, the magazine `build_page.py` scripts) emit bare asset
  references and an empty `<footer class="site">` shell, so **stamp and re-render the footer AFTER generating**.
- `stamp-assets.py` exists because `assets/*.css|js` are served stale-while-revalidate for a week.
- `update-lastmod.py` and `build-feed.py` need full history (`git fetch --unshallow` on a shallow clone). Both date
  commits by their **Pacific** day, so an evening push from the UTC laptop VM no longer stamps tomorrow.
  update-lastmod ignores head-only edits on purpose. It reads every sitemap `<loc>` that has a `<lastmod>` as UTF-8, so
  `media/pvm-20l5-checklist.pdf` is in the sitemap WITHOUT a lastmod, deliberately.
- **The footer is pre-rendered into every page's shell** so crawlers that don't run JS see the full link set. site.js
  overwrites it at runtime with the identical string; never hand-edit the static copy (the tool asserts they match).
- Then verify locally with Playwright (no console errors, no horizontal overflow at 390 and 1280).

### How a push actually happens

The container can clone and fetch but **cannot push** (the proxy blocks authenticated pushes). Push from David's
laptop VM through the device shell:
1. Clone fresh into a unique `/tmp/orl-<ts>` (the VM's `$HOME` sits on a shared `/sessions` disk that fills up; old
   clones in `/tmp` may belong to dead sessions and can't be removed). `--depth 20` is fine for a push.
2. Bring the work across: either make the commits there, or `git bundle create x.bundle <origin-sha>..main` in the
   container, `SendUserFile` it, `device_commit_files` it into the connected folder (full Windows path
   `C:\Users\david\OneDrive\Kempner Docs LAST BACKUP 5.24.2025\Desktop\orlandu.com\_pending-deploy\…`; `~/mnt/…` paths are
   rejected), then `git fetch <bundle> main:incoming && git merge --ff-only incoming`.
3. Token: `github-token.txt` in the connected folder is a note with the token in prose —
   `grep -o 'gh[pousr]_[A-Za-z0-9_]\{20,\}' github-token.txt | head -1`. Push to
   `https://x-access-token:$T@github.com/orlandu81/orlandu.com.git HEAD:main`. Never echo the token.
4. Move the bundle to `_to_delete/` (the device shell cannot `rm` in mounted folders). Don't chain that `mv` with `&&`
   after a step that can fail, or the bundle is filed away unpushed.
5. Verify: GitHub commit-status API ("Deployment has completed", ~40–50 s), then the live page in the browser pane
   (`get_page_text`). The container's curl and the device shell can't reach `www` (403 / blocked); WebFetch caches
   15 min per URL, so add a throwaway query.
6. Commit as `git -c user.name=orlandu81 -c user.email=orlandusarcade@gmail.com` — David is the author on this repo.

### One push per session

Every push stores the whole output for the retention period (set to the shortest; Vercel still keeps the last
10 + 20 production deployments, ~2 GB floor). ~170 pushes in a week once took Deployment Storage to 75 % and later
past the 10 GB allowance (it has since purged; see the project memory on hosting limits). So: **batch a session's
work, verify locally, ask, push once.** A second push needs a reason (he asked for it live, or the first was broken).
Never push "to see it on the live site". A sale that must come off For Sale is a "now"; a caption tweak is a "hold".

### A rejected push means another session is live — merge, never force

David runs several Claude sessions against this repo; one once held 17 unpushed commits. **Never `--force` or
`--force-with-lease`.** On `! [rejected]`: fetch, read `git log --oneline HEAD..FETCH_HEAD`, merge if clean and say what
came in. **If it conflicts, throw away your version, not theirs** (`merge --abort`, `reset --hard FETCH_HEAD`, redo
your edit on their file) — hand-resolving risks reverting their work invisibly. Then re-check your content against
the merged file: a stale edit can be wrong, not just conflicting (an item you're editing may already have sold).

## 2. Hosting and verification

- **Vercel**, auto-deploys `main`. History: GitHub Pages → Netlify → Vercel. GitHub Pages was disabled 2026-10-20;
  `netlify.toml` and `CNAME` were deleted 2026-10-30 on David's say-so. The old Netlify project may still answer at
  `sensational-cocada-4cbd01.netlify.app` — not evidence of anything. Check DNS with
  `https://dns.google/resolve?name=www.orlandu.com&type=CNAME&cd=0` (apex A 216.198.79.1, www → `*.vercel-dns-017.com`,
  nameservers GoDaddy) — never infer the host from repo files.
- `vercel.json` is the only hosting config: security headers, caching, CORS on `/data/*` + llms/feed files, and
  redirects (`/index.html → /`, `/library.html → /consoles.html`, the old AMS-100 PDF → `-rev2`).
- **Internal links to the home page are `/`, never `index.html`** (a redirecting URL in every nav cost a GSC
  "Page with redirect" notice).
- **Vercel Web Analytics self-traffic opt-out:** any page with `?noanalytics=1` sets
  `localStorage["orlandu-noanalytics"]="1"` and that browser is never counted (`=0` re-enables). Open the first page
  in a new browser-pane profile that way.
- **A Vercel function only sees a new or changed environment variable after the NEXT deployment.** Env vars:
  `RESEND_API_KEY`, `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` (Secret type — write-only in the UI; fixed and verified
  2026-10-30), `DATABASE_URL` + the Neon set, `BLOB_READ_WRITE_TOKEN`, optional `REGISTRY_ADMIN_SECRET`.
- **Never delete** the root verification files `7984e193fb220a08e3d0a7abd9711dcd.txt` (IndexNow key) and
  `BingSiteAuth.xml`, or the MCP-registry TXT record at the orlandu.com apex in GoDaddy.
- gallery.html renders client-side — verify it through `assets/gallery-data.js`. Certificates: SSL Labs, not
  `openssl` from here (it returns the proxy's cert).
- IndexNow: GET `https://api.indexnow.org/indexnow?url=<urlencoded>&key=7984e193fb220a08e3d0a7abd9711dcd` (empty 200 =
  success; WebFetch reports it as unparseable binary). Google ignores IndexNow.

## 3. Media

- Photos are **WebP**: full size `media/2026/` (longest side ≤ 1600, q82), thumbs `media/thumbs/` 800 wide, saved with
  Pillow `save(p, "WEBP", quality=82, method=6)`, never with `exif=`. `media/og/` stays JPEG for social scrapers.
  Siblings `-400/-600/-800/-2x` keep their convention. HEIC needs `pillow-heif` and `ImageOps.exif_transpose`.
- **Never replace a media file in place.** `/media/*` and assets images/fonts are `max-age=31536000, immutable`; a browser
  that has a file keeps it a year. A changed image gets a NEW filename (`-v2`) and the old file is deleted; an `-800`
  sibling carries the same version as its 1200. CSS/JS are stamped by `stamp-assets.py`. JSON-LD image URLs stay
  unversioned.
- **Strip location metadata.** iPhone originals carry GPS. Pillow drops EXIF unless asked and ffmpeg drops QuickTime
  location tags, so never commit a camera original into `media/`. Re-audit EXIF after any bulk add.
- **Video is three encodes per clip:** `<clip>.av1.mp4`, `<clip>.hevc.mp4` (`hvc1` tag), then the H.264 `<clip>.mp4` last,
  each `<source>` with a `codecs` type read from the file. `tools/encode-video.sh media/video/<clip>.mp4` makes both
  siblings and prints SSIM (keep ≥ 0.97) and the source lines. **H.264 stays canonical**: VideoObject `contentUrl`,
  sitemap `video:content_loc`. gallery.html adds the siblings from the entry's `av1`/`hevc` fields. A new video needs a
  VideoObject (duration from ffprobe; `uploadDate` = the ship date).
- **Fonts are self-hosted** in `assets/fonts/` (Orbitron 600/800, Rajdhani 400/500/600, Barlow Condensed 400/500,
  Press Start 2P). Never add a Google Fonts link; copy an existing `<head>` (two font preloads + the nav-logo preload).
  Exceptions: `trinitron-fleet-vol1.html` declares a wider weight set inline, and `404.html` uses absolute `/assets/` paths.
  style.css defines metric-matched `"… Fallback"` faces second in each stack — page-level `font-family` declarations keep
  them. Mobile CLS from font swap measured 0 on the buying guide in PageSpeed (10-30) after the 10-23 retune;
  `font-display:optional` remains David's call if it ever comes back.
- **First-screen images:** not `loading="lazy"`; the top one carries `fetchpriority="high"` with a matching
  `<link rel="preload" as="image">`. Change both when that photo changes; never preload a below-the-fold image.
  gallery.html and the home filmstrip make their first six eager in JS.
- Branding files: nav logo `assets/logo-wordmark-nav.webp`, hero wordmark `logo-wordmark-hero-v2.webp`, mascots
  `mascot-foot.webp` / `mascot-about.webp`. The original PNGs stay as masters and JSON-LD `logo` URLs only.
- **Thumbs:** story and step thumbs are 1200×514 (21:9) with an 800×343 sibling and the same `srcset`/`sizes` as their
  neighbors; the featured story keeps the plain 1200. Story thumbs are cut from the story's OWN media (navigational
  chrome, an allowed exception to one-photo-one-home); not in the sitemap. The Collection menu tiles are
  `step-<slug>-320/-640.webp` from site.js's `COLLECTION` map — the JS string can't carry `?v=`, so a re-cut RENAMES the
  slug. Home Step-inside `sizes` is `(max-width:700px) calc(73vw - 38px), …`. Timeline tiles are 84×84 cut by
  `build-timeline.py` — rerun after a re-cut.
- **Never crop a subject out to make a layout align.** Cabinet and monitor photos keep their controls, badges and the
  AMS-100 on top; align with `object-fit:contain` plates (`background:transparent`) and verify numerically that each
  scaled image fits its box. Recropping a SOURCE photo when David asks is different: frame a symmetrical object
  symmetrically (cabinet edge to cabinet edge) — one-sided crops read as crooked. Use `.masonry` for mixed orientations.
- A gallery recrop changes the entry's `w`/`h` in `gallery-data.js` — update them with the filename. Nothing wider than
  ~2.2:1 goes in the home filmstrip (index.html filters by `w`/`h` before fetching).
- David's edited photos arrive as lowercase `.heic`; uppercase `.HEIC` beside them are unedited originals.
- `device_stage_files` refuses files newly created in the OneDrive folder ("hardlinked"). Convert on the laptop instead,
  or push the image under a new unreferenced slug first and fetch it in the container.
- **Watermarks:** For Sale photos (`© orlandu.com` bottom-right, 4.2 % of the short edge) and the PC-10 board,
  topper and VS.-card tiles (section 9). Nothing else on the site is watermarked, and nothing else should be.
- **Never hard-code the marquee's animation duration** — site.js sets it from a 75 px/s target.

## 4. Page conventions

- **Titles** front-load the searchable term and spell out the page, 58–65 characters, ending "— Orlandu's Arcade"
  ("Sony BVM-20E1U: Specs, BKM Cards & Work Log — Orlandu's Arcade"). `og:title`/`twitter:title` keep the short form;
  twitter tags mirror og. The site search shows the H1, so a long title costs nothing there.
- Head: `<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">`,
  descriptions ≤ ~158, canonical + og:url, one H1, `rel=alternate` to feed.xml and the llms files. Copy an existing
  page's head for a new page.
- **Quick answers:** guides/profiles that need them end with `h2.sec` "Quick answers" + a single-column `.grid` of
  `.card`s (h3 question, p answer). Facts only from the site, no prices, and deliberately NO FAQPage schema (about.html's
  FAQ is the one FAQPage, and editing an answer there means editing its JSON-LD too).
- **JSON-LD:** every page has one `@graph` (WebSite + Organization + Person + page node + BreadcrumbList). **No `Product`
  anywhere, not even nested** — use `Thing` for "this page is about X"; forsale.html has no Product/Offer/ItemList and
  must not get them back. **No `datePublished`** (no-date rule). Every `ImageObject` carries `creator` (Organization
  "Orlandu's Arcade"), `copyrightNotice` "© Orlandu's Arcade", `creditText` "Orlandu's Arcade", and `license` +
  `acquireLicensePage` → `about.html#photo-use`. In any node Google validates (Dataset, etc.) write creator/publisher as
  inline typed objects, never an `@id`-only reference. No PostalAddress/LocalBusiness markup (private residence).
- **Profiles** (machine, monitor, console pages): `main.profile`, a page-scoped accent `<style>` overriding only
  `main .kicker`, the `h1.page` gradient, `h2.sec` and `.card .sub`, taken from the machine's own art; `nav.machnav`
  prev/next looping in the hub's order (center cell → the hub). A new profile = hub-card link + sitemap block + llms.txt
  line + timeline href + re-link both chain neighbors + an OG card `media/og/og-<slug>.jpg`.
- **Work logs** (`ul.worklog`) come from `vault.html` on David's device, not from asking him; skip trivial repairs.
- **Grids:** `.grid.c2`/`.c3` are auto-fill, so the column count follows the viewport. A block with a FIXED number of
  items pins its columns (`repeat(N,minmax(0,1fr))` with breakpoints). A photoless card can't share a row with photo
  cards. Page-scoped grid classes need `.grid.x{}` specificity to beat style.css.
- **Section ids:** `#wall` is taken by style.css (columns:3). The sitewide search input is `id="q"`; the magazine filter
  is `id="mq"` (carry that into any magazine `build_page.py` regeneration).
- **Accessibility:** scrolling `.tablewrap`s and `pre.chain` carry `tabindex="0"`; blank corner `<th>`s get an `.sr-only`
  label; full-bleed bands outside `<main>` carry `role="region"` + `aria-label`; `button.btn` needs
  `background:transparent`. Run axe with reduced motion — color-contrast hits mid scroll-reveal are false positives.
- **Lighthouse:** PageSpeed's web UI works from the browser pane (pagespeed.web.dev is approved); if it stalls, `npx
  lighthouse` in the container against a local server with `CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux64/chrome`.
- **Lightbox** (site.js) clones `figcaption` innerHTML — markup inside a caption needs a `#lightbox` style; with no
  `<figure>` it falls back to `alt`.
- site.js's scroll-reveal threshold must stay 0 (0.05 hid a tall section on mobile).
- Section links + Share: every `main h2` gets an id from its text (renaming a heading changes it); pages with `div.rt` get
  reading progress and a resume pill (`orl-read:<path>` in localStorage).

## 5. Content and privacy rules David has set

- **Location is "Orange County, California" — never the city.** A PRIVACY rule: the arcade is in his home and the site
  is a public inventory of valuable machines. No city, neighborhood, landmark, ZIP, school, local business, or photo
  with a house number or street sign — in copy, meta, JSON-LD, alt text, llms.txt, site.js, commit messages or the
  GitHub repo description. "Southern California" in prose is fine; "an Orange County production".
- **No which-room mapping.** Never state which room a specific machine is in (no room column, no "in the game room" in
  alt text, sitemap image titles or info cards; keep sitemap image titles in sync with the alt text they mirror).
  STILL PRESENT, pending David's call: games.html's "The garage arcade — uprights" / "The game room" headings and
  `#gameroom`, the about.html two-room description, an index card, signal-chain's "Garage arcade" headings, and
  captions on photos that literally show the garage. Ask before flattening those — they are voice, not a map.
- **No full inventory:** one card per model on consoles.html, no unit counts ("×2", "the pair"), no condition values,
  serials or prices of his own items.
- **Every photo must be his own** (the footer claims "Photography © Orlandu's Arcade"). If provenance is unclear, ask;
  if a third-party photo is found, pull it (entry, sitemap line, files).
- **Serials:** check every new photo (sale photos especially — the lightbox shows the 1600 master at 1:1) for serials,
  barcodes and former-owner asset tags. On the PC-10 boards the serial is DESTROYED (overwritten with synthetic paper,
  then softened), not just blurred. David chose to leave the Captain Skyhawk and Baseball Stars sale photos as they are.
- US spelling ("color", "gray", "center"). No date stamps in page copy ("August 2026"); the feed is the one place dates
  exist. Don't imply a current count from a photo of a past state.
- One photo, one editorial home; the gallery may draw from anywhere. **The gallery is a curated showcase** of his lit,
  composed photography — bench shots stay on their story/project page. The home filmstrip is built from the gallery,
  so a gallery entry is also a front-page entry.
- **Never publish a fault on a machine he has sold**; say only that it moved on. **Never editorialize a flaw from a photo**
  — a flaw HE discloses can go in For Sale copy.
- **Declined — don't propose again:** sourcing/channel content (where or how he buys; "Japan pipeline"); failures/regrets
  editorial; composite-video screenshots on his monitors (RGB only); grayscale/faded memoriam photos; a per-owner
  registry leaderboard; The Catalog (generated PDF book); AVIF (measured ~15 %, stopped); forum/Reddit/HN/outreach
  posting (organic traffic only); FAQPage on guide pages; Article dates; a PC-10 "missing titles" checklist (the wall's
  52 is the complete library — don't cite fandom lists against it); attract-mode clips on profiles ("maybe", don't
  re-pitch); the big-blue-side-art reshoot.
- Don't over-quote trivia (most cabinets are Japanese — say it once). Big Blue runs a **Darksoft CPS-2 multi in a
  Jasen's Customs case**, not a Marvel vs. Capcom board.
- **Japan language:** channel-flavored copy is out; plain unit provenance ("sourced from Japan") stays.

## 6. Collection pages

- **games.html** is the "Coin-Op Games" page — every piece of media on it must be coin-op. Cards sort by YEAR, oldest
  first, within `#uprights`, `#pinball`, `#gameroom` (the year is in `.sub` "Maker · YYYY"); every card links its
  profile. The **In memoriam** section (full color, `figure.shot`, "<b>Name</b> — one line") is the ONLY memoriam on the
  site; don't clone it elsewhere without asking.
- **consoles.html** sorts by the PLATFORM's original release within each maker (a revision sorts at its family's debut;
  the visible `sub` year is the revision's own — deliberately out of order). One card per model; the two New 3DS XLs
  get separate cards. Years are North American releases where the vault has a Japan year (SNES 1991, Turbo Express
  1990, New 3DS XL Black 2015, PC Engine Duo-R 1993). Six consoles have profiles (nes-top-loader, nintendo-64, gba-sp,
  genesis-cdx, pc-engine-duo-r, ps2-slim); the others stay card-only by his choice. The PS2 Slim is NOT modded.
  `consoles.html#mods` lists only consoles whose signal path the site states.
- **monitors.html:** photo cards, `object-fit:contain` plates (`aspect-ratio:7/6`), the four LMD models folded into one
  wide card on the rack photo. **The fleet is THIRTEEN units across EIGHT models** (LMD-9050 ×2); a count change is
  swept across index, monitors, stories, signal-chain, pvm-vs-bvm and Trinitron Fleet Vol. 1 (its `UNITS` array, stats
  and no-JS mirror). Magazine fleet weight 381 lb. `#specs` is condensed from the magazine's `DATA` (change both); its
  Compare mode reads the table itself; `#scale` SVGs are generated by `tools/build-fleet-scale.py` between
  `fleet-scale` markers (edit MODELS there, never the SVG). Weights and dimensions are Sony's figures.
  Monitor profiles: pvm-2950q, pvm-20l5, bvm-20e1u, bvm-a14f5u, lmd-wall (body copy = the magazine's COPY object).
  Name **SavonPat** on the A14F5U service; the 20L5's slot holds a **BKM-129X** (second analog input, component or RGB
  with loop-through — not SCART/VGA); 20L5 sync range 15–45 kHz.
- **playchoice-10.html:** 52 board tiles (title-only captions, alphabetical ignoring "The") + 10 conversions (each a
  short story about its own game) + anatomy. Toppers stay on signage.html; never pair topper and cart tiles. The page's
  slugs are `pc10-cart-*` / `pc10-conv-*` (toppers own `pc10-<slug>`).
- **signage.html:** topper wall (21, alphabetical; Double Dragon double-wide) and VS. instruction cards (18); the three
  lit signs as showcase entries. A topper is a sticker on a metal stand; the VS. cards were made for the Red Tent, the
  toppers were not (he only displays them there). Say "topper", not "insert" or "marquee".
- **wanted.html** hunt list as David tiered it. **Name clashes:** a name on the wanted list, the Orlandu 50, the VS. card
  wall or the topper wall is usually a DIFFERENT object from a For Sale board of the same name — read every grep hit
  before deleting on a name match.
- **Timeline** (`timeline.html`) is generated by `tools/build-timeline.py` from (name, RELEASE year, thumb, href)
  lists — release years only, never acquisition dates; a tuple with `None` thumb + a label gets a lettered tile.
- Facts David settled (don't re-raise): TNA is 2017 with the Classic Edition package he installed; the Superbrite has
  three F25T12 tubes; both N64s and both NES units are RGB-modded (NESRGB); the Duo-R has RGB + region mods; the
  TurboGrafx-16 gets RGB from an external EDFX AV Adapter (not modded); one switcher per room; the Mini Cute is fully
  original; LMD-9020 SD only, LMD-9030 HD over component, both 640×480; LMD-940W HDMI + SDI, no analog component;
  BVM-A14F5U has the BKM-68X clone + BKM-62HS, no BKM-61D; BVM-20E1U has four option slots with only a BKM-21D fitted
  (BKM-24N and BKM-20D on the shelf), is controlled by the rack-width BKM-10R and can't be adjusted without it, reads
  44,708 hours, and its plate reads October 1998 (confirmed 10/31; the vault's June 2007 was wrong — registry entry 3
  carries 1998-10 via a FIXUP);
  the AMS-3 is in storage and its pots are fixed; Ghostbusters' Spike 1 board is a spare.

## 7. For Sale and sold items

- **forsale.html is present tense.** A card comes OUT the moment the item sells — no SOLD badge, no sold archive.
  Card copy is short: what it is, why this example, the one caveat. `.sub` names the kind ("PlayChoice-10 topper").
  Badge `On eBay · $PRICE`. Re-read eBay before quoting a price; prices move. Never publish what he paid, order numbers,
  sellers or receipts. When a documented unit is listed, link its history on the site (never put site links in the
  eBay listing — eBay prohibits them).
- **The sweep when something sells:** the card → the named FOR SALE marquee segment in index.html (a `data-itm` span) →
  sitemap `<image:image>` line + delete both `sale-*` sizes (delete is the default; don't ask) → re-cut
  `step-forsale` if it was cut from that item (don't ask which board) → gallery entry + files if any → counts and
  copy on neighboring cards → generators. The first card owns the head preload/fetchpriority.
- **`api/ebay.js`** (the safety net, not the sweep): `GET /api/ebay?ids=…` checks each `/itm/` id via eBay's Browse
  API (client-credentials token, edge cache 30 min); `live:false` hides the card and the marquee `data-itm` span; the
  "More on eBay" line reads live feedback into `data-fb-pct`/`data-fb-score`. **New sale cards must keep the `/itm/`
  link and, if named in the marquee, a `data-itm` span.** Keys are David's eBay developer app (the Tidbyt keyset);
  a 401 `invalid_client` means the Vercel values don't match it.
- **Memoriam bar is high:** a departure usually gets a clause in existing prose (monitors.html's `p.note`), not a section.
  If one earns a games.html memoriam entry, its photos become `alumni-<slug>` via `git mv`.
  `media/2026/alumni-ams-100.webp` (+ thumb) and the Double Dragon board photos are deliberately kept unreferenced.
- **When something sells, its gallery entry comes out too** (the filmstrip would put it on the front page).

## 8. Generated content, search and the AI channel

- **Site search:** the header dialog over `assets/search-index.js` and the MCP `search_orlandu` share ONE ranking —
  `search()` in `api/mcp.js` and the `/* search-score:start … end */` block in `assets/site.js`. Change both or neither;
  `eval-search.mjs` lifts the site.js block verbatim. Rules: hyphens/periods/apostrophes dropped; filler words ignored;
  plural, -ing, -ate forms and the `ALIAS` map (n64, snes, pc10, tna, scanline…); run-together tokens; one-letter typo
  retry. Index weights `w`: profiles/guides/tools/hubs 10, other pages 6, glossary 5, cards 4, FAQ 3, photos 2, the
  generated registry model pages −10 (a model number finds its profile first). `tt` carries a `<title>` that differs
  from the H1. Body capped at 6,000 characters. `HINTS` in build-search-index.py adds search-only words per page — add
  one only if it moves a battery query. Magazine/monograph bodies are headings-only.
- **Glossary tooltips:** `assets/glossary-data.js` from `glossary.html` via `tools/build-glossary.py`; first occurrence per
  page on pages with a reading time (not the glossary, monograph or magazines).
- **Feed:** `tools/build-feed.py` → `feed.xml` (RSS) + `feed.json`, ≤ 30 items from the Latest ledger and the Stories
  grid; dates = the Pacific day the page (or the ledger card's heading) entered git. Registry entries have their own
  feed at `/api/registry?feed=rss`.
- **llms.txt** (hand-kept index — add new pages), **llms-full.txt** + `data/pages.json` (generated; skip the registry model
  pages). **Datasets** under `data/` (CC BY 4.0 — the prose and photos stay ©; say so wherever a dataset is mentioned):
  sony-monitor-specs, playchoice-10-library, console-video-out, bkm-cards (built from bkm-cards.html's five tables),
  connect.json (hand-authored), registry-models.json; each owning page carries a Dataset node.
- **`api/mcp.js`** — read-only MCP server (Streamable HTTP, stateless, no deps), nine tools: search_orlandu,
  read_orlandu_page, list_orlandu_pages, sony_monitor_specs, playchoice_10_library, console_video_out, bkm_cards,
  plan_connection, registry_census. mcp.html and llms.txt state the tool and dataset counts — update them with a new
  tool. Published in the MCP Registry as `com.orlandu/arcade` from `server.json` (DNS-verified; key
  `mcp-registry-key.pem` in the connected folder, never in the repo; publish from the browser pane with WebCrypto —
  `/v0/auth/dns` then `/v0/publish`; bump `version` to republish; one listing per URL). Wikidata: Sony AMS-100 is
  Q141689973 (AMS-100 only). Never add prompt-injection text for assistants.
- **will-it-connect.html** rules live in `data/connect.json` (logic `assets/connect-plan.js`, shared with the MCP tool)
  AND an inline copy in the page's `var DATA` — after editing the JSON, paste it back (`json.dumps`,
  `ensure_ascii=False`). "Works as-is" only when neither side needs anything; mod/adapter verdicts rank level with it.
- **through-the-mask.html** models each tube from Sony's figures in its `M` array (20L5 pitch marked `est`); it is a model,
  not a photo. `?a=&b=` preselects.
- **bkm-10r.html** follows Sony's BVM-14E5/14F5 Operation Manual (rev. 1, pp. 22–59); shared sub-lists are functions so
  the tree stays one copy.
- **sony-model-numbers.html:** the H1 carries no specific model numbers (it stole the BKM queries); the A suffix is
  omitted; the G-tube pitch is "undocumented" by David's ruling; the 20L5 worked example stays suffix-neutral.
- **bkm-cards.html:** Sony documents are the authority; community claims are marked; BNC counts are Sony's figures.

## 9. The Orlandu Registry (Sony BVM + PVM serial census)

- **Rules (David's):** BVM + PVM only; serials shown with the last two digits masked, full serial stored privately for
  duplicates; auto-publish with an email alert + signed delete link; optional photo, handle, country/state; email
  required, never shown. **Other owners' prices and sellers are welcome; David's own entries carry neither.** Records
  strip shows monitors, never owners. Only BVMs have hours (PVM cards/pages/forms hide them). Build year vs catalog era
  is a NUDGE (hint + one warning + an alert-mail flag), never a gate — except a build year after 2010 is refused
  (`BUILT_MAX`). An OWNER-CONFIRMED plate outside an era WIDENS the era (edit `era`, name the plate in `era_basis`,
  keep the confidence tag — it rises only on a Sony document). The registry keeps its researched eras even where the
  fleet table / decoder say otherwise (his call).
- **Files:** `data/registry-models.json` is the catalog — 96 chassis with regional variants folded under each (the form's
  "Badge as printed" keeps the exact variant as public `model_as_entered`; counts group by chassis); `era`,
  `era_confidence`, `era_basis`, `sources`; 24 `unconfirmed` names kept out of the dropdown; `sony_serials` on six
  chassis, copied exactly as printed from Sony bulletins (a ceiling is how far a run had reached, never a production
  total). Research with per-model URLs: `Claude outputs/registry/registry-catalog-research.json` in the connected folder.
  `tools/build-registry-pages.py` GENERATES registry.html,
  registry-models.html, registry-submit.html (`form.rfm`, never `.cform` — site.js hijacks those for the contact relay)
  and 96 `registry-<slug>.html` — edit the builder, never the pages. `assets/registry.js` / `registry.css` (one `card()`
  renderer; `live()` paints from localStorage then refreshes — paint functions must stay idempotent). `api/registry.js`
  (GET summary / `?model=` / `?entries=1&page=N` / `?export=json|csv` / `?feed=rss`; `R.CACHE` = s-maxage 60 +
  stale-while-revalidate one week; `?fresh=<ts>` bypasses the edge), `api/registry-submit.js` (honeypot `site`,
  per-IP-hour + daily caps, 409 on duplicates, Blob upload, Resend alert), `api/registry-admin.js` (HMAC-signed
  soft delete), shared code in `lib/registry.js` (outside `api/`). The chart floors serials to the hundred. The repo's
  only dependencies (`package.json`: `@neondatabase/serverless`, `@vercel/blob`; `node_modules/` gitignored) are used
  inside the functions only — there is still no build step.
- **Data fixes ship as code:** `FIXUP_FIELDS` / FIXUPS in lib/registry.js (photo_url and, since 10/31, built included; `from: null` means the field was empty) — David does not run SQL
  or click through admin consoles himself. Photo swaps go into Blob under a NEW name via the Blob dashboard page.
- **Indexing:** 13 model pages are indexable — six with `sony_serials`, the arcade's own (`PROFILES`), and
  `INDEX_EXTRA` (BVM-D14H1U, PVM-1354Q, PVM-14M2U, PVM-8041Q, promoted 10-30 at two entries each). The rest are
  `noindex,follow` and out of the sitemap. To promote a page with real entries: add its slug to `INDEX_EXTRA`, rerun,
  add its sitemap block, then request indexing.
- Home: `a.regband` under the hero + a Step Inside card with `[data-reg]` counts repainted by `regCounts()` in site.js;
  monitors.html cards end "N in the registry →" (`[data-regmodel]`). Entry cards carry permalinks
  (`registry-<slug>.html#e<id>`), Copy link, and Save as image (1080×1080 canvas PNG). Photos get a 320-px `-t.jpg`
  thumb. "While you're here" rows are stripped from the search index. Registry stays 9th in the nav.
- Testing without Neon: PGlite harness described in the Project doc `claude/registry-2026-10-23.md`.
- Open, not promised: price-over-time chart, "update my entry" flow, LMD/AMS/BKM scope, CSV past ~100 entries.

## 10. Dark backdrops on the PC-10, topper and VS. card walls

Every tile on playchoice-10.html and signage.html (#toppers, #cards) is a cut-out on the Spinning Tops backdrop
(radial glow (46,46,62) → (19,19,34), soft shadow, edge = `.shot` panel #131322). David: "this only works if it looks
consistent" — a new board, topper or card gets the same treatment.
- Boards 1600×480 (thumb 800×240, the 10:3 plate), built from the published redacted files; **heavy diagonal
  watermark on every board** plus the corner mark (`<slug>-dk2.webp`; Ninja Gaiden III keeps its `-dk`).
- Toppers 1600×804 (Double Dragon 2400×819), cards 1600×1600, cut from the HEIC camera originals in `_originals/`,
  never from published crops; edges picked by eye at zoom, perspective-squared; a **light diagonal** "© orlandu.com"
  (0.20 alpha, scaled 1.5× toppers / 2× cards, panel pixels only) plus the corner mark. Small PCH1-01-ROM boards need
  keystone correction. Match a new topper's exposure to the wall with one linear gain.
- Build scripts and edge picks: `_pending-deploy\dark-backdrops-2026-10-25.zip` + `dark-backdrops-wm.py` in the connected
  folder, and the Project doc `claude/dark-backdrop-walls.md`. The og-signage-v2 cover was not watermarked.

## 11. Other features and references

- **Review nine (2026-10-30), the presentation pass — items 2–10 shipped, 1 (poster Step Inside cards) declined.**
  The CSS lives in one block at the end of style.css ("Review nine"). Hooks: a hub card that opens with a photo uses
  `<figure class="pf">` (no inline margin/radius styles — games, consoles; For Sale cards are `.card.sale` with the same
  `figure.pf` on a 4:3 contain plate, and the eBay store card is `.card.saleband` under the grid). Every `main.profile`
  page wraps `figure.pshot` + `.specs` in `<div class="prail">` (sticky); only donkey-kong also carries its two shots
  in `.pmore` — pages with several photo sets keep them inline with their text. Small labels (badges, chips, spec
  labels, ticker, footer labels, regband, machnav, TOC) are Barlow Condensed; Orbitron keeps H1/H2/card titles/nav/
  buttons; headings `text-wrap:balance`. Nav fits one row from 761 px (compact sizes ≤1100). Footer = four literal
  columns in site.js (Collection · Reading · Tools & reference · The arcade; `build-static-footer.py` no longer maps
  NAV). about.html intro is `.aboutintro` (text left; mascot + room-spin video right); monitors.html's magazine promo
  is `a.card.linked.magband`. Reading Room cards on the home page carry their story thumbs.
- **Contact form:** `api/contact.js` relays through Resend from `onboarding@resend.dev` to orlandusarcade@gmail.com;
  forms `form.cform` on about.html#write and wanted.html#have-one ("I have one →" links prefill the subject); honeypot
  `site`; photos ≤ 3 MB after an in-browser downscale; the mailto stays as the fallback.
- **Gallery:** tags + `TAG_LABELS`, deep links `gallery.html#tag=<slug>`; Attract Mode slideshow (`#play`). Home Latest
  ledger holds NINE text cards (deliberately no thumbnails); a new page earns a Latest card and the oldest drops.
  Step Inside holds twelve cards plus the registry card.
- **The AMS-100 monograph:** web edition is canonical; no images by the author's ruling; §4.5.2 / EXT-02 removed fully and
  never reintroduced; all rights reserved with the citation block; `.mbody` text children carry the 74ch measure (never
  the section); `.tag` must not be nowrap. The PDF `media/ams-100-monograph-rev2.pdf` is typeset FROM the web edition
  (pandoc → xelatex, DejaVu Serif, his rights metadata copied across); the old PDF 301s to it. Rebuild scripts: Project
  doc `claude/ams-100-pdf-build.md`; publish under a new filename and repoint the two links.
- **Vault:** `vault.html` on David's device (not in the repo), ~1,283 items, JSON between `/*VAULT_DATA_START*/` and
  `/*VAULT_DATA_END*/` prefixed `items = [`. Useful fields: `upgrades`, `conditionNotes`, `notes`, `lastServiced`,
  `originality`. Facts he has corrected on the site win over the vault.
- Planning artifacts: Attract Mode (photo plan) https://claude.ai/code/artifact/c4999444-8cc3-49fd-8f52-bf996c268710 ·
  The Bench Book (work-log intake, mostly superseded by the vault)
  https://claude.ai/code/artifact/0f218037-5cbf-469f-a9c1-8832f67ef0a4
