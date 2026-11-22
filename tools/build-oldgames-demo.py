"""The drawn demonstration on why-old-games-look-wrong.html: an original pixel-art scene rendered as square pixels and through a
tube model (scan-line gaps, soft beam; the close-up adds an aperture grille). Writes the four oldgames-* images, the story thumb and
the OG card. Re-running overwrites them in place, so give the outputs NEW file names if the art changes (media is cached a year)."""
import sys, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, gaussian_filter1d
repo = sys.argv[1] if len(sys.argv) > 1 else '.'  # run from the repo root: python3 tools/build-oldgames-demo.py
W, H = 120, 90
P = {'.':(0,0,0),'s1':(92,148,252),'s2':(124,176,255),'s3':(164,204,255),'w':(252,252,252),'c':(216,232,255),'y':(252,224,96),'o':(248,152,56),
     'm1':(88,96,160),'m2':(120,128,192),'g1':(0,136,56),'g2':(56,184,72),'g3':(136,216,96),'b1':(152,80,24),'b2':(200,120,48),'b3':(88,40,8),
     'k':(16,16,24),'t1':(112,72,32),'l1':(0,104,40),'l2':(40,160,56),'st':(168,168,184),'sd':(112,112,136),'r':(216,40,40),'p':(248,184,136),'bl':(40,72,200),'sc':(96,232,255)}
img = np.zeros((H, W, 3), np.uint8)
def px(x, y, c):
    if 0 <= x < W and 0 <= y < H: img[y, x] = P[c]
for y in range(H):                                   # sky, three bands with checkerboard dither between them
    for x in range(W):
        if y < 20: c = 's1'
        elif y < 26: c = 's1' if (x + y) % 2 else 's2'
        elif y < 40: c = 's2'
        elif y < 46: c = 's2' if (x + y) % 2 else 's3'
        else: c = 's3'
        px(x, y, c)
for y in range(H):                                   # sun
    for x in range(W):
        d = (x-96)**2 + (y-16)**2
        if d <= 49: px(x, y, 'y')
        elif d <= 64 and (x + y) % 2: px(x, y, 'o')
def cloud(cx, cy):
    for dx, dy, r in ((0,0,5),(6,1,4),(-6,1,4),(3,-3,4)):
        for y in range(cy+dy-r, cy+dy+r+1):
            for x in range(cx+dx-r, cx+dx+r+1):
                if (x-cx-dx)**2 + (y-cy-dy)**2 <= r*r and y <= cy+3: px(x, y, 'w' if y < cy+2 else 'c')
cloud(24, 14); cloud(62, 24)
for x in range(W):                                   # mountains, lit side and dithered shade
    for mx, top, half in ((30, 34, 30), (78, 28, 36)):
        h = top + abs(x - mx) * (62 - top) // half
        for y in range(h, 62):
            if abs(x - mx) <= half: px(x, y, 'm2' if x < mx or (x + y) % 2 == 0 and x - mx < 6 else 'm1')
for mx, top in ((30, 34), (78, 28)):                 # snow caps
    for y in range(top, top + 5):
        for x in range(mx - (y - top), mx + (y - top) + 1): px(x, y, 'w')
for x in range(W):                                   # hills
    h = int(60 + 5*np.sin(x/9.0) + 3*np.sin(x/4.0 + 1))
    for y in range(h, 74): px(x, y, 'g3' if y == h else ('g2' if y < h + 4 or (x + y) % 2 else 'g1'))
for y in range(74, H):                               # brick ground
    for x in range(W):
        row = (y - 74) // 4; off = 4 if row % 2 else 0
        px(x, y, 'b3' if (y - 74) % 4 == 3 or (x + off) % 8 == 7 else ('b2' if (y - 74) % 4 == 0 else 'b1'))
for y in range(50, 74):                              # tree
    for x in range(12, 15): px(x, y, 't1')
for y in range(36, 58):
    for x in range(3, 25):
        if (x-13.5)**2/100 + (y-46)**2/110 <= 1: px(x, y, 'l2' if (x < 13 and y < 46) or (x + y) % 3 == 0 else 'l1')
for y in range(44, 74):                              # castle
    for x in range(82, 110): px(x, y, 'st' if (x + (y//3)*3) % 7 else 'sd')
for x in range(82, 110, 4):
    for y in range(40, 44): px(x, y, 'st'); px(x+1, y, 'st')
for y in range(60, 74):
    for x in range(93, 99):
        if y > 62 or 94 <= x <= 97: px(x, y, 'k')
for wx in (86, 104):
    for y in range(50, 55): px(wx, y, 'k'); px(wx+1, y, 'k')
for y in range(30, 40): px(96, y, 'sd')
for y in range(30, 35):
    for x in range(97, 97 + (35 - y)): px(x, y, 'r')
HERO = ["...y....","...D....",".SSSSSS.",".SCkkCS.",".SSSSSS.","..DDDD..",".SSSSSS.","DSSSSSSD","..SSSS..","..D..D..",".kk..kk."]
CODE = {'S':'st','D':'sd','C':'sc','k':'k','y':'y'}
def sprite(rows, ox, oy):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.': px(ox + i, oy + j, CODE[ch])
sprite(HERO, 50, 63)
FONT = {'P':["###","#.#","###","#..","#.."],'R':["##.","#.#","##.","#.#","#.#"],'E':["###","#..","##.","#..","###"],'S':["###","#..","###","..#","###"],
        'T':["###",".#.",".#.",".#.",".#."],'A':["###","#.#","###","#.#","#.#"],' ':["...","...","...","...","..."],'0':["###","#.#","#.#","#.#","###"],'3':["###","..#","###","..#","###"]}
def text(s, ox, oy, c):
    for n, ch in enumerate(s):
        for j, row in enumerate(FONT[ch]):
            for i, v in enumerate(row):
                if v == '#': px(ox + n*4 + i + 1, oy + j + 1, 'k'); 
        for j, row in enumerate(FONT[ch]):
            for i, v in enumerate(row):
                if v == '#': px(ox + n*4 + i, oy + j, c)
text("000300", 4, 3, 'w'); text("PRESS START", 38, 50, 'w')
def raw(src, s): return np.repeat(np.repeat(src, s, 0), s, 1)
def crt(src, s, grille=0):
    lin = (raw(src, s).astype(np.float32) / 255.0) ** 2.2
    lin = gaussian_filter1d(lin, sigma=s * 0.22, axis=1)                    # the beam is soft along the line
    h = lin.shape[0]; y = (np.arange(h) % s) - (s - 1) / 2.0
    lum = lin.mean(axis=2, keepdims=True)
    sig = s * (0.17 + 0.10 * np.sqrt(lum))                                  # brighter lines bloom a little wider
    lin = lin * np.exp(-(y[:, None, None] ** 2) / (2 * sig ** 2))
    if grille:
        x = np.arange(lin.shape[1]); m = np.zeros((1, lin.shape[1], 3), np.float32)
        for ch in range(3): m[0, :, ch] = 0.45 + 0.55 * np.clip(np.cos(2*np.pi*(x - ch*grille/3.0)/grille) * 1.6 + 0.2, 0, 1)
        lin = lin * m * 1.45
    lin = lin + 0.10 * gaussian_filter(lin, sigma=(s*0.9, s*0.9, 0))        # glow
    lin = np.clip(lin * 1.75, 0, 1)
    return (lin ** (1/2.2) * 255).astype(np.uint8)
S = 8
a, b = Image.fromarray(raw(img, S)), Image.fromarray(crt(img, S))
a.save(f'{repo}/media/2026/oldgames-demo-pixels.webp', 'WEBP', lossless=True, method=6)
b.save(f'{repo}/media/2026/oldgames-demo-tube.webp', 'WEBP', quality=90, method=6)
# close-up: the hero and the lettering at 24x, grille on
crop = img[46:76, 34:74]                                                    # 40 x 30 source pixels
ca, cb = Image.fromarray(raw(crop, 18)), Image.fromarray(crt(crop, 18, grille=6))
ca.save(f'{repo}/media/2026/oldgames-closeup-pixels.webp', 'WEBP', lossless=True, method=6)
cb.save(f'{repo}/media/2026/oldgames-closeup-tube.webp', 'WEBP', quality=90, method=6)
# story thumb + OG: left half pixels, right half tube
def split(w, h, y0):
    big_a, big_b = np.asarray(a), np.asarray(b); out = big_a.copy(); out[:, 480:] = big_b[:, 480:]
    out[:, 478:482] = (252, 224, 96)
    return Image.fromarray(out).crop((0, y0, 960, y0 + int(960*h/w))).resize((w, h), Image.LANCZOS)
t = split(1200, 514, 250)
t.save(f'{repo}/media/story-thumbs/story-why-old-games-look-wrong.webp', 'WEBP', quality=86, method=6)
t.resize((800, 343), Image.LANCZOS).save(f'{repo}/media/story-thumbs/story-why-old-games-look-wrong-800.webp', 'WEBP', quality=86, method=6)
o = split(1200, 630, 90)
logo = Image.open(f'{repo}/assets/logo-wordmark-v3.png').convert('RGBA'); lw = 250; logo = logo.resize((lw, int(logo.height*lw/logo.width)), Image.LANCZOS)
o = o.convert('RGB'); o.paste(logo, (36, 24), logo); o.save(f'{repo}/media/og/og-why-old-games-look-wrong.jpg', 'JPEG', quality=90)
