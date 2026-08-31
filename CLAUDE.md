# orlandu.com — working notes for Claude

Static site for Orlandu's Arcade: a garage arcade + game room, ~10 machines,
13 Sony professional monitors, ~25 consoles. Owner: David (GitHub `orlandu81`).

No build step. Plain HTML/CSS/JS served from the repo root.

## Deploying — read this first

**This container cannot push to GitHub.** The egress proxy blocks authenticated
pushes ("builtin injection failed"). Fetches and clones work fine; only pushes fail.

Every deploy goes through David's laptop over the device bridge:

1. Commit in the container clone.
2. `git bundle create /tmp/x.bundle <last-pushed-sha>..main` — an *incremental*
   bundle. A full-history bundle is ~62 MB and too big to send.
3. `SendUserFile` the bundle, then `device_commit_files` it into the connected
   folder (`C:\Users\david\OneDrive\Kempner Docs LAST BACKUP 5.24.2025\Desktop\orlandu.com`).
   `~/mnt/...` paths are rejected — use the full Windows path.
4. On the device, in `$HOME/site-repo`:
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

`netlify.toml` is **retained deliberately** as a rollback path, not dead config.
It is inert while DNS points at Vercel. `vercel.json` is the file actually in
force — security headers, `/media/*` caching, and the `/index.html` -> `/` redirect.
Do not delete either one without David saying so.

The old Netlify project still exists and still serves a copy at
`sensational-cocada-4cbd01.netlify.app`. That hostname resolving is not evidence
that orlandu.com points there. David is deleting the project; until he does,
expect it to keep answering.

Vercel auto-deploys `main`; allow ~40s before verifying.

## Verifying

- `curl` to orlandu.com from this container fails (403 CONNECT tunnel) — use **WebFetch**.
- WebFetch caches 15 min per URL; append a throwaway query param to bust it.
- `gallery.html` renders client-side, so WebFetch sees the empty state.
  Verify the gallery by fetching `assets/gallery-data.js` directly.
- Certificate checks: SSL Labs via WebFetch. `openssl s_client` from here returns the
  proxy's own cert, not the site's. A page loading is not proof the cert is valid.
- DNS: `https://dns.google/resolve?name=<host>&type=<type>&cd=0`.

## Media

- Full size: `media/2026/`, longest side ≤1600px, q82. Thumbs: `media/thumbs/`, **800px wide**.
- HEIC needs `pillow-heif`; always run `ImageOps.exif_transpose` or photos land rotated.
- **Never replace a media file in place.** `/media/*` is CDN-cached; an in-place swap
  pins stale bytes in browsers that already loaded the page. This has bitten twice —
  once truncating a video at 5s, once serving 17 unedited photos for an hour.
  Rename the file, or append `?v=N` to every reference.
- Don't force `aspect-ratio` + `object-fit:cover` on cabinet photos; it crops subjects
  out of frame. Use `.masonry` (columns) for mixed orientations.
- David sends edited photos as lowercase `.heic`; leftover uppercase `.HEIC` in the
  same folder are the unedited originals. Compare numerically before assuming.

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
- **Machine and console cards are ordered by YEAR, oldest first**, within their
  section — games.html `#uprights`, `#pinball` and `#gameroom`, and each maker
  section on consoles.html (David, 2026-08-28). The year
  is already printed in each card's `<div class="sub">Maker · YYYY</div>`, so a new
  card slots in by that number rather than at the end. Same ascending convention as
  the PlayChoice-10 topper wall. When you reorder, re-read the card copy: "rounds out
  the lineup" stopped being true when Mario Bros. moved out of last place.
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
  `IMG_3926.jpg` master at `(375,12)-(2642,1790)` → 1600×1255 / thumb 800×627, `?v=6`: the
  old frame clipped 113px off the top of the cabinet and carried a slice of a neighbouring
  monitor down each side. The limits on that photo are the **Trinitron badge** (master
  x≈385) on the left and the **button column** (master x 2533–2634) on the right; crop past
  either and you are back to removing features. **Verify a "no-crop" layout
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
  as a 660px slab. index.html now measures each strip image on load and hides anything over
  2.2:1 — panoramas stay in the gallery masonry, which handles them fine. Don't "fix" a wide
  photo with object-fit:cover; it cuts the ends off signs.
- Gallery audit 2026-08-26 (43 -> 39): removed the Mini Cute shipping crate, the Red Tent
  teardown, the BVM-20E1U crosshatch and the AMS-100 bench lineup — all process/bench shots that
  live on their own story or project page. Kept but FLAGGED as the weakest entries: the four
  fleet portraits with dark screens and window reflections (bvm-20e1u, bvm-a14f5u, pvm-2950q,
  pvm-20l5) and big-blue-side-art. Screens-on reshoots would lift all five.
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

**The sweep when something sells:** remove the `forsale.html` card -> remove its JSON-LD
`Product` node **and rebuild the `ItemList` from the parsed JSON** -> check the **FOR SALE
marquee segment in `index.html`**, which names items individually, so a named item must be
swapped out -> drop the photo's `<image:image>` line from `sitemap.xml` and delete the
`sale-*` files -> grep for counts that included the sold unit -> grep for anything else
linking at the listing, **including the copy on neighbouring cards** (the AC-D9H card said
"pairs naturally with the D9H5J above"). Same discipline as the dangling-photo sweep: a
removal is not done until the copy around it is checked.

**Do NOT renumber the `#productN` @ids by string replacement.** That was tried when the
D9H5J sold and it silently left the `ItemList` pointing at `#product1` twice with the PSVR2
unreferenced — the page rendered perfectly and the JSON still parsed, so nothing caught it
until the next sale. Parse the `ld+json` block, drop the node, re-`@id` the products in
order, rebuild `itemListElement` and `numberOfItems` from that list, and assert every
referenced `@id` resolves to exactly one node in the graph. Re-serializing normalizes a few
`\uXXXX` escapes to literal characters; that is fine, the file is UTF-8.

`media/2026/alumni-ams-100.jpg` and its thumb are currently **unreferenced** — the old listing
photo, kept in case the AMS-100 monograph wants it. Not an oversight.

**Watermarks: For Sale photos only.** The photos on `forsale.html` carry a
`© orlandu.com` mark, bottom-right, at 4.2% of the short edge (white 80% over a soft dark
shadow). **Nothing else on the site is watermarked and nothing else should be** — the
editorial and gallery photography is the reason people stay, and a mark across it costs
more than it protects. Regenerate a mark with the same recipe if a new sale photo is added.
The scope is deliberate, not partial work.

**The BVM-D9H5J sold on 2026-08-31.** Its for-sale card, JSON-LD `Product`, index marquee
mention, index "Latest" card, monitors.html roster card and its whole Trinitron Fleet Vol. 1
feature came out; `media/{2026,thumbs}/sale-bvm-d9h5j.jpg`, `media/{2026,thumbs}/bvm-d9h5j.jpg`
and `media/fleet/b4133f839b.webp` were deleted (the sale copy was a deliberate watermarked
duplicate, so `git mv` was wrong here). **`d9-smb.jpg` and its gallery entry stay** — only the
"looking for a new home" clause came off the caption. The departure is recorded exactly once,
as a clause in the monitors.html `p.note`; there is no memoriam entry and no "recently sold"
section (see the sales-page rule above).

**Overwriting a file in `media/` needs `?v=N` on its `<img>` refs** — `vercel.json` gives
`/media/*` `s-maxage=86400`, so the CDN serves the old bytes for a day otherwise. Leave
JSON-LD `image` URLs unversioned.

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
