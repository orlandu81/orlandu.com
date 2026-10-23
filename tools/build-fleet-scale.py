#!/usr/bin/env python3
"""Regenerate the two to-scale SVG elevations on monitors.html#scale (between the fleet-scale markers).
Dimensions are Sony's published W x H x D in mm, without projecting parts; weights match the fleet table.
Run from the repo root after a dimension or weight changes: python3 tools/build-fleet-scale.py
"""
import re, math, pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
MODELS = [
 dict(m='PVM-2950Q', w=687,h=538,d=529,lb=115,diag=27,asp=(4,3),kind='crt'),
 dict(m='PVM-20L5', w=452,h=414,d=500,lb=68,diag=19,asp=(4,3),kind='crt'),
 dict(m='BVM-20E1U', w=444,h=414,d=570,lb=82,diag=19,asp=(4,3),kind='crt'),
 dict(m='BVM-A14F5U', w=482,h=280,d=571,lb=57,diag=13,asp=(4,3),kind='crt',body=346),
 dict(m='LMD-9020', w=216,h=230,d=160,lb=6.6,diag=8.4,asp=(4,3),kind='lcd'),
 dict(m='LMD-9030', w=216,h=230,d=160,lb=6.8,diag=8.4,asp=(4,3),kind='lcd'),
 dict(m='LMD-9050', w=216,h=230,d=160,lb=7.1,diag=8.4,asp=(4,3),kind='lcd'),
 dict(m='LMD-940W', w=222,h=166,d=70,lb=4.4,diag=9,asp=(5,3),kind='lcd'),
]
def screen(d):
    diag = d['diag']*25.4; a,b = d['asp']; k = diag/math.hypot(a,b); return a*k, b*k
def f(v): return ('%.1f' % v).rstrip('0').rstrip('.')
def front_svg():
    gap=60; x=40; H=770; floor=600; parts=[]; labels=[]
    for d in MODELS:
        w,h=d['w'],d['h']; y=floor-h; sw,sh=screen(d)
        if d['kind']=='crt':
            bw=d.get('body',w); bx=x+(w-bw)/2
            if bw!=w: parts.append(f'<rect x="{f(x)}" y="{f(y)}" width="{w}" height="{h}" rx="6" class="frame"/>')
            parts.append(f'<rect x="{f(bx)}" y="{f(y)}" width="{bw}" height="{h}" rx="10" class="body"/>')
            sx=bx+(bw-sw)/2; sy=y+(h-sh)*0.42
            parts.append(f'<rect x="{f(sx)}" y="{f(sy)}" width="{f(sw)}" height="{f(sh)}" rx="18" class="glass"/>')
            parts.append(f'<rect x="{f(sx+8)}" y="{f(sy+8)}" width="{f(sw-16)}" height="{f(sh-16)}" rx="14" class="phos"/>')
            parts.append(f'<rect x="{f(bx+18)}" y="{f(y+h-34)}" width="{bw-36}" height="14" rx="3" class="strip"/>')
        else:
            if d['m']=='LMD-940W':
                parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" class="body"/>'); sx=x+(w-sw)/2; sy=y+(h-sh)*0.35
            else:
                ph=206; parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{ph}" rx="8" class="body"/>')
                parts.append(f'<path d="M{f(x+w/2-70)} {floor} h140 l-30 -{h-ph} h-80z" class="stand"/>'); sx=x+(w-sw)/2; sy=y+(ph-sh)*0.35
            parts.append(f'<rect x="{f(sx)}" y="{f(sy)}" width="{f(sw)}" height="{f(sh)}" rx="4" class="glass"/>')
            parts.append(f'<rect x="{f(sx+4)}" y="{f(sy+4)}" width="{f(sw-8)}" height="{f(sh-8)}" rx="2" class="phos"/>')
        labels.append(f'<text x="{f(x+w/2)}" y="{floor+44}" class="lm">{d["m"]}</text><text x="{f(x+w/2)}" y="{floor+80}" class="ld">{d["w"]} × {d["h"]} mm · {f(d["lb"])} lb</text>')
        x+=w+gap
    nw,nh=255,89; y=floor-nh
    parts.append(f'<rect x="{x}" y="{y}" width="{nw}" height="{nh}" rx="4" class="ref"/><rect x="{x}" y="{f(y+nh*0.55)}" width="{nw}" height="3" class="refline"/>')
    labels.append(f'<text x="{f(x+nw/2)}" y="{floor+44}" class="lm ref">NES</text><text x="{f(x+nw/2)}" y="{floor+80}" class="ld">255 × 89 mm · for scale</text>')
    x+=nw+40
    parts.append(f'<path d="M40 {H-30} h1000" class="bar"/><path d="M40 {H-42} v24 M1040 {H-42} v24" class="bar"/>'); labels.append(f'<text x="1070" y="{H-20}" class="ld" style="text-anchor:start">one meter</text>')
    return f'<svg viewBox="0 0 {x} {H}" class="scale" role="img" aria-label="The eight Sony monitor models drawn to scale from the front, with an NES for size"><defs><linearGradient id="phos" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#17243a"/><stop offset=".5" stop-color="#0f1a2c"/><stop offset="1" stop-color="#1a1430"/></linearGradient></defs><line x1="0" y1="{floor}" x2="{x}" y2="{floor}" class="floor"/>{"".join(parts)}{"".join(labels)}</svg>'
def side_svg():
    gap=70; x=40; H=720; floor=600; parts=[]; labels=[]
    for d in MODELS:
        dep,h=d['d'],d['h']; y=floor-h
        if d['kind']=='crt':
            bez=min(90,dep*0.18); back_h=h*0.62; by=floor-back_h-(h-back_h)*0.35
            parts.append(f'<path d="M{x} {y} h{f(bez)} L{x+dep} {f(by)} v{f(back_h)} L{f(x+bez)} {floor} H{x} z" class="body"/>')
            parts.append(f'<rect x="{x}" y="{f(y+(h-screen(d)[1])*0.42)}" width="6" height="{f(screen(d)[1])}" class="glass"/>')
        else:
            if d['m']=='LMD-940W': parts.append(f'<rect x="{x}" y="{y}" width="{dep}" height="{h}" rx="6" class="body"/>')
            else:
                ph=206; parts.append(f'<rect x="{x}" y="{y}" width="136" height="{ph}" rx="6" class="body"/>')
                parts.append(f'<path d="M{x+20} {floor} h{dep-20} l-40 -{h-ph} h-30z" class="stand"/>')
            parts.append(f'<rect x="{x}" y="{y+10}" width="5" height="{f(h*0.6)}" class="glass"/>')
        labels.append(f'<text x="{f(x+dep/2)}" y="{floor+44}" class="lm">{d["m"]}</text><text x="{f(x+dep/2)}" y="{floor+80}" class="ld">{dep} mm deep</text>')
        x+=max(dep,140)+gap
    return f'<svg viewBox="0 0 {x} {H}" class="scale" role="img" aria-label="The eight Sony monitor models drawn to scale from the side"><line x1="0" y1="{floor}" x2="{x}" y2="{floor}" class="floor"/>{"".join(parts)}{"".join(labels)}</svg>'


p = root / 'monitors.html'
s = p.read_text(encoding='utf-8')
new = '<!-- fleet-scale:start -->\n    ' + front_svg() + '\n    ' + side_svg() + '\n    <!-- fleet-scale:end -->'
s2, n = re.subn(r'<!-- fleet-scale:start -->.*?<!-- fleet-scale:end -->', lambda m: new, s, flags=re.S)
if n != 1: sys.exit('fleet-scale markers not found exactly once')
p.write_text(s2, encoding='utf-8'); print('monitors.html: fleet-scale SVGs regenerated')
