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

- US spelling. No "centre", no "grey".
- Don't repeat a photo across editorial pages — each shot gets one home. The gallery
  is the exception: it's the curated index and may draw from anywhere.
- Don't over-quote a machine's trivia. Most of his cabinets are Japanese; saying so
  once is plenty.
- Big Blue runs a **Darksoft CPS-2 multi in a Jasen's Customs case** — not a
  Marvel vs. Capcom board.
- Machine profiles carry a **Work log** (`ul.worklog`). Source entries from
  `vault.html` on David's device, not by asking him. Skip trivial repairs.
- No date stamps like "August 2026" in page copy.

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
