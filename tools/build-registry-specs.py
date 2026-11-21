#!/usr/bin/env python3
"""Adds a structured `specs` object to every chassis in data/registry-models.json.

Two layers, kept apart so nobody mistakes one for the other:
  1. Fields PARSED from the model's own researched `notes` (TV lines, tube, CRT part, scan range, RGB path,
     phosphor, control, option slots). Nothing here is new research; it is the same claim in a table cell.
  2. PHYSICAL figures (aperture-grille pitch, dimensions, weight) from the PHYS table below. Each row names
     its source and a grade: "sony" = printed in a Sony brochure or manual, "wiki" = the community-kept
     ConsoleMods wiki infobox, "arcade" = Sony's figure as already published on the fleet page.
Run before build-registry-pages.py. Add a PHYS row only with the source in hand."""
import json, re, pathlib
p = pathlib.Path(__file__).resolve().parent.parent / "data" / "registry-models.json"
cat = json.loads(p.read_text(encoding="utf-8"))

def parse(n):
    s = {}
    t = re.search(r"(approx\. )?(\d{3,4}(?:–\d{3,4})?) TVL", n)
    if t: s["tvl"] = ("approx. " if t.group(1) else "") + t.group(2)
    if "mono" in n.lower(): s["color"] = "Monochrome"
    tu = re.search(r"(Super Fine Pitch Trinitron|Super HR Trinitron|HR Trinitron|Super Trinitron|Trinitron)", n)
    if tu: s["tube"] = tu.group(1)
    cp = re.search(r"\(([AMW]\d{2}[A-Z]{3}\d{2,3}X)\)", n)
    if cp: s["crt_part"] = cp.group(1)
    pm = re.search(r"(\d\.\d\d?) mm", n)
    if pm: s["pitch_mm"] = pm.group(1)
    if re.search(r"15[–/]45 kHz|multiformat", n): s["scan"] = "Multiformat, 15–45 kHz"
    elif "15 kHz" in n: s["scan"] = "15 kHz (standard definition)"
    if re.search(r"no RGB(?! audio)|composite \+ Y/C only|composite only|single S-Video/composite input", n): s["rgb"] = "No"
    elif re.search(r"needs BKM-(68X|129X)|RGB via BKM|RGB/YPbPr needs", n): s["rgb"] = "With an option card"
    elif "RGB" in n: s["rgb"] = "Built in"
    if "SMPTE-C" in n: s["phosphor"] = "SMPTE-C"
    elif "EBU" in n: s["phosphor"] = "EBU"
    elif "P-22" in n: s["phosphor"] = "P-22"
    if re.search(r"display unit|needs BKM-10R|needs controller|BKM-15R controller", n): s["control"] = "Separate control unit"
    elif "stand-alone" in n: s["control"] = "Built-in control panel"
    sl = re.search(r"(\d) (?:card|option) slots?", n)
    if sl: s["slots"] = sl.group(1)
    return s

BRO_54 = ("Sony PVM-1954Q/1354Q brochure", "sony")
MAN_M = ("Sony PVM-M series Operation Manual (1996)", "sony")
BRO_L2 = ("Sony PVM-L2 series brochure (2002)", "sony")
WIKI = ("ConsoleMods wiki infobox", "wiki")
FLEET = ("Sony's figures, as on the arcade's fleet page", "arcade")
# slug: (pitch_mm, "W × H × D mm", weight, (source, grade))
PHYS = {
    "pvm-1354q": ("0.25", None, "16.7 kg (36 lb 13 oz)", BRO_54),
    "pvm-1954q": ("0.4", "450 × 457.5 × 503", "30.0 kg (66 lb 2 oz)", BRO_54),
    "pvm-8045q": ("0.25", "217 × 217 × 352.5", "8.2 kg (18 lb), without batteries", ("Sony PVM-8045Q/8042Q/8040/5041Q brochure", "sony")),
    "pvm-14m2u": (None, "346 × 340 × 431", "16.7 kg (36 lb 13 oz)", MAN_M),
    "pvm-14m4u": (None, "346 × 340 × 431", "16.7 kg (36 lb 13 oz)", MAN_M),
    "pvm-20m2u": (None, "450 × 458 × 503", None, MAN_M),
    "pvm-20m4u": (None, "450 × 458 × 503", None, MAN_M),
    "pvm-20m2mdu": (None, "450 × 457.5 × 503", "30.0 kg", ("Sony PVM-20M2MD/14M2MD brochure", "sony")),
    "pvm-14m2mdu": (None, "346 × 340 × 430.5", None, ("Sony PVM-20M2MD/14M2MD brochure", "sony")),
    "pvm-20s1wu": (None, "450 × 458 × 503", "30.0 kg (66 lb 2 oz)", ("Sony PVM-20S1W brochure", "sony")),
    "pvm-20l2": (None, None, "32.6 kg (72 lb 12 oz)", BRO_L2),
    "pvm-14l2": (None, None, "18.0 kg (39 lb 11 oz)", BRO_L2),
    "pvm-9l2": (None, None, "8.0 kg (17 lb 10 oz)", BRO_L2),
    "pvm-9l3": (None, "217 × 218 × 373", "8.0 kg (17 lb 10 oz)", ("Sony PVM-9L3 brochure", "sony")),
    "pvm-20l1": ("0.4", None, None, ("Sony PVM-L1 series brochure (2003)", "sony")),
    "pvm-20l5": (None, None, "31 kg (68 lb)", FLEET),
    "pvm-2950q": (None, None, "52 kg (115 lb)", FLEET),
    "bvm-20e1u": (None, None, "37 kg (82 lb)", FLEET),
    "bvm-a14f5u": (None, None, "26 kg (57 lb)", FLEET),
    "pvm-20l4": ("0.31", "452 × 414 × 500", "31 kg (68 lb)", WIKI),
    "pvm-14l5": ("0.25", "346 × 280 × 424", "37 lb 8 oz", WIKI),
    "pvm-14n5u": ("0.25", "346 × 340 × 414", "33 lb 1 oz", WIKI),
    "pvm-1344q": (None, "346 × 340 × 412", "16.5 kg (36 lb 6 oz)", WIKI),
    "bvm-20f1u": (None, "444 × 399 × 570", "37 kg (81 lb 9 oz)", WIKI),
    "bvm-a20f1u": ("0.30", "444 × 414 × 570", "88 lb 3 oz", WIKI),
    "bvm-14f5u": (None, "482 × 280 × 580", "55 lb 1 oz", WIKI),
    "bvm-d24e1wu": ("0.25", "565.5 × 436.8 × 587.3", "112 lb 3 oz", WIKI),
    "bvm-d32e1wu": (None, "794 × 694 × 556.5", "206 lb 13 oz", WIKI),
}
n = 0
for m in cat["models"]:
    s = parse(m.get("notes", ""))
    ph = PHYS.get(m["slug"])
    if ph:
        pitch, dims, wt, (src, grade) = ph
        if pitch and "pitch_mm" not in s: s["pitch_mm"] = pitch
        if dims: s["dims_mm"] = dims
        if wt: s["weight"] = wt
        s["phys_source"] = src; s["phys_grade"] = grade
    m["specs"] = s; n += bool(s)
missing = set(PHYS) - {m["slug"] for m in cat["models"]}
assert not missing, missing
p.write_text(json.dumps(cat, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"registry specs: {n} of {len(cat['models'])} chassis carry a specs object; {len(PHYS)} with physical figures")
