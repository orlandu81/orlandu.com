# orlandu.com — working notes for Claude

Static site for Orlandu's Arcade: a garage arcade + game room, ~10 machines,
15 Sony professional monitors, ~25 consoles. Owner: David (GitHub `orlandu81`).

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
swapped out -> grep for counts that included the sold unit -> grep for anything else linking at
the listing. Same discipline as the dangling-photo sweep: a removal is not done until the copy
around it is checked.

`media/2026/alumni-ams-100.jpg` and its thumb are currently **unreferenced** — the old listing
photo, kept in case the AMS-100 monograph wants it. Not an oversight.

**Watermarks: For Sale photos only.** The six photos on `forsale.html` carry a
`© orlandu.com` mark, bottom-right, at 4.2% of the short edge (white 80% over a soft dark
shadow). **Nothing else on the site is watermarked and nothing else should be** — the
editorial and gallery photography is the reason people stay, and a mark across it costs
more than it protects. Regenerate a mark with the same recipe if a new sale photo is added.
The scope is deliberate, not partial work.

**`sale-bvm-d9h5j.jpg` is a deliberate duplicate of `d9-smb.jpg`** — the D9H5J shot is also a
gallery image, so the watermarked copy got its own filename and `d9-smb.jpg` stays clean for
the gallery. **When the D9H5J sells, delete `media/{2026,thumbs}/sale-bvm-d9h5j.jpg`** (both
sizes) along with the card; `d9-smb.jpg` and its gallery entry stay. This is the one place
`git mv` is wrong — the source file is still in use elsewhere.

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
