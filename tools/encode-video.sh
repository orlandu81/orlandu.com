#!/bin/bash
# encode-video.sh — make the AV1 and HEVC siblings of an H.264 clip for orlandu.com.
#
#   tools/encode-video.sh media/video/<clip>.mp4 [av1_crf] [hevc_crf]
#
# Writes <clip>.av1.mp4 and <clip>.hevc.mp4 NEXT TO the source (new filenames — /media/* is
# immutable-cached, never overwrite), prints size, SSIM against the H.264 source, frame count
# and duration for each, and the exact <source> lines to paste into the <video> element.
# The H.264 file stays as the last <source>, the VideoObject contentUrl and the sitemap
# video:content_loc — those never change.
#
# Defaults were tuned 2026-10-20 (SSIM ≥ 0.97 on every clip): AV1 crf 40 / preset 6,
# HEVC crf 30 / preset medium. Fiber-optic sparkle (the sign loops) tolerates higher crf than
# the room/bench clips; check the SSIM line and lower the crf if it dips under 0.97.
# Audio is copied when the source has a track, dropped when it doesn't. yuv420p 8-bit on
# purpose — 10-bit AV1 is smaller but loses hardware decode on older phones.
set -euo pipefail
src=${1:?usage: encode-video.sh media/video/clip.mp4 [av1_crf] [hevc_crf]}
av1crf=${2:-40}; hevccrf=${3:-30}
base=${src%.mp4}
if ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$src" | grep -q audio; then A=(-c:a copy); else A=(-an); fi

ffmpeg -v error -y -i "$src" -map 0 -c:v libsvtav1 -preset 6 -crf "$av1crf" -pix_fmt yuv420p \
  -svtav1-params tune=0:keyint=150 "${A[@]}" -movflags +faststart "$base.av1.mp4"
ffmpeg -v error -y -i "$src" -map 0 -c:v libx265 -preset medium -crf "$hevccrf" -pix_fmt yuv420p -tag:v hvc1 \
  -x265-params log-level=error:keyint=150 "${A[@]}" -movflags +faststart "$base.hevc.mp4"

report () {
  local f=$1
  local ssim nf dur
  ssim=$(ffmpeg -v info -i "$f" -i "$src" -lavfi "[0:v][1:v]ssim" -f null - 2>&1 | grep -o "All:[0-9.]*" | cut -d: -f2)
  nf=$(ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=nb_read_frames -of csv=p=0 "$f")
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  printf '%-40s %9s bytes  SSIM %s  frames %s  dur %s\n' "$f" "$(stat -c%s "$f")" "$ssim" "$nf" "$dur"
}
echo; report "$src"; report "$base.av1.mp4"; report "$base.hevc.mp4"

# codecs= strings for the <source type> attributes, derived from the streams.
# AV1: av01.P.LLT.DD → profile, level (2 digits) + tier, bit depth.
# HEVC: hvc1.P.F.LNN.B0 → general_profile_idc, compatibility flags, tier+level, constraints.
# ffprobe doesn't expose the AV1 level cleanly, so take it from MP4Box-style parsing of the
# av1C box when available; fall back to the level the encoder chose for this size/fps.
python3 - "$base.av1.mp4" "$base.hevc.mp4" <<'PY'
import sys, struct
def boxes(data, start=0, end=None):
    end = len(data) if end is None else end
    p = start
    while p + 8 <= end:
        size, typ = struct.unpack('>I4s', data[p:p+8]); hdr = 8
        if size == 1: size = struct.unpack('>Q', data[p+8:p+16])[0]; hdr = 16
        if size == 0: size = end - p
        yield typ, p + hdr, p + size
        p += size
def find(data, path, start=0, end=None):
    typ = path[0].encode()
    for t, b, e in boxes(data, start, end):
        if t == typ:
            if len(path) == 1: return b, e
            # skip full-box / sample-entry headers where needed
            if t in (b'stsd',): b += 8
            if t in (b'av01', b'hvc1', b'hev1'): b += 78
            r = find(data, path[1:], b, e)
            if r: return r
    return None
av1, hevc = sys.argv[1], sys.argv[2]
d = open(av1,'rb').read()
r = find(d, ['moov','trak','mdia','minf','stbl','stsd','av01','av1C'])
if r:
    b,_ = r; by = d[b:b+4]
    prof = (by[1] >> 5) & 7; level = by[1] & 31; tier = (by[2] >> 7) & 1
    hb = (by[2] >> 6) & 1; tw = (by[2] >> 5) & 1
    depth = 12 if (hb and tw) else 10 if hb else 8
    print(f"AV1  codecs=\"av01.{prof}.{level:02d}{'H' if tier else 'M'}.{depth:02d}\"")
d = open(hevc,'rb').read()
r = find(d, ['moov','trak','mdia','minf','stbl','stsd','hvc1','hvcC'])
if r:
    b,_ = r; by = d[b:b+23]
    prof = by[1] & 31; tier = (by[1] >> 5) & 1
    compat = struct.unpack('>I', by[2:6])[0]
    # compatibility flags are reversed-bit order in the codecs string
    rev = int('{:032b}'.format(compat)[::-1], 2)
    level = by[12]
    const = by[6:12].rstrip(b'\x00')
    cs = '.'.join(f'{c:02X}' for c in const) or 'B0'
    print(f"HEVC codecs=\"hvc1.{prof}.{rev:X}.{'H' if tier else 'L'}{level}.{cs}\"")
PY
cat <<EOF

Paste order inside <video …> (keep every existing attribute on the <video> tag, drop its src=):
  <source src="$base.av1.mp4"  type='video/mp4; codecs="…"'>
  <source src="$base.hevc.mp4" type='video/mp4; codecs="…"'>
  <source src="$src" type="video/mp4">
EOF
