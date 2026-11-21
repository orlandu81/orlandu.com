#!/usr/bin/env python3
"""Write the gallery wall into gallery.html as plain HTML, between the gallery-static markers.

gallery.html draws its wall from assets/gallery-data.js in the browser, so the raw page was 55 words and no
<img>. This prints the same figures (same thumbs, srcset, alt and caption the script builds) into #wall so a
crawler that does not run the script still gets every photo next to its caption. The page script clears #wall
and redraws on load, so the two can never disagree on screen. Run after any gallery-data.js edit.
"""
import html, json, pathlib, re, subprocess

root = pathlib.Path(__file__).resolve().parent.parent
data = root / "assets" / "gallery-data.js"
js = data.read_text(encoding="utf-8") + "\n;process.stdout.write(JSON.stringify(GALLERY));"
items = json.loads(subprocess.run(["node", "-e", js.replace("const GALLERY", "var GALLERY")], capture_output=True, text=True, check=True).stdout)

SIZES = "(max-width:560px) calc(100vw - 38px), (max-width:900px) calc((100vw - 44px)/2), (max-width:1200px) calc((100vw - 50px)/3), 383px"
out, shown = [], 0
for g in items:
    title = g.get("title") or ""
    cap = "<b>" + title + "</b>" + ((" — " + g["caption"]) if g.get("caption") else "") + '<span class="cat">' + g["cat"] + "</span>"
    if g.get("type") == "video":
        poster = f' poster="{html.escape(g["poster"])}"' if g.get("poster") else ""
        media = f'<video controls preload="none"{poster}><source src="{html.escape(g["src"])}" type="video/mp4"></video>'
    else:
        t = g["src"].replace("media/2026/", "media/thumbs/")
        b = re.sub(r"\.webp$", "", re.sub(r"\?.*$", "", t))
        wh = f' width="{g["w"]}" height="{g["h"]}"' if g.get("w") and g.get("h") else ""
        media = (f'<img src="{t}" srcset="{b}-400.webp 400w, {b}-600.webp 600w, {t} 800w" sizes="{SIZES}" data-full="{g["src"]}" '
                 f'alt="{html.escape(html.unescape(title), quote=True)}" loading="{"eager" if shown < 6 else "lazy"}" decoding="async"{wh}>')
        shown += 1
    out.append(f'<figure class="shot">{media}<figcaption>{cap}</figcaption></figure>')

page = root / "gallery.html"
s = page.read_text(encoding="utf-8")
block = "<!-- gallery-static:start -->\n" + "\n".join(out) + "\n<!-- gallery-static:end -->"
if "<!-- gallery-static:start -->" in s:
    new = re.sub(r"<!-- gallery-static:start -->.*?<!-- gallery-static:end -->", lambda m: block, s, flags=re.S)
else:
    new = s.replace('<div class="masonry" id="wall"></div>', '<div class="masonry" id="wall">\n' + block + "\n</div>", 1)
    assert new != s, "no #wall to fill"
if new != s:
    page.write_text(new, encoding="utf-8")
print(f"gallery static: {len(out)} figures" + ("" if new != s else " (unchanged)"))
