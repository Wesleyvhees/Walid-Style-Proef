#!/usr/bin/env python3
"""TikTok-editor: stiltes knippen, transcriberen en effecten/overlays renderen.

Workflow (3 stappen):
  1. python3 editor.py cut        input.mp4  werkmap/
       -> werkmap/cut.mp4 (9:16, 1080x1920, stiltes eruit) + werkmap/segments.json
  2. python3 editor.py transcribe werkmap/cut.mp4
       -> werkmap/words.json (woorden met tijden) + werkmap/transcript.txt
  3. (Claude schrijft werkmap/plan.json op basis van transcript.txt)
     python3 editor.py render     werkmap/cut.mp4 werkmap/plan.json output.mp4 [--guides]

Zie README.md voor het formaat van plan.json.
"""
import argparse
import json
import os
import re
import subprocess
import sys

W, H = 1080, 1920
FPS = 30

# TikTok safe zone (1080x1920). Onderaan zit de caption/muziekbalk en jouw
# ondertiteling, rechts de knoppen, bovenaan de tabs "Volgend / Voor jou".
SAFE_TOP = 260
SAFE_BOTTOM = 1920 - 520     # alles onder y=1400 blijft vrij voor ondertitels/caption
SAFE_LEFT = 70
SAFE_RIGHT = 1080 - 170      # rechterkolom met like/comment/share-knoppen

FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf",
    "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf",
    "/usr/share/fonts/opentype/inter/Inter-Bold.otf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def font_path():
    here = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")
    for f in sorted(os.listdir(here)) if os.path.isdir(here) else []:
        if f.lower().endswith((".ttf", ".otf")):
            return os.path.join(here, f)
    for f in FONT_CANDIDATES:
        if os.path.exists(f):
            return f
    sys.exit("Geen bruikbaar lettertype gevonden; zet een .ttf/.otf in tiktok-editor/fonts/")


def run(cmd, **kw):
    print("+", " ".join(cmd[:6]), "..." if len(cmd) > 6 else "", flush=True)
    return subprocess.run(cmd, check=True, **kw)


def probe_duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        check=True, capture_output=True, text=True).stdout
    return float(out.strip())


# --------------------------------------------------------------------------- cut
def detect_silences(path, noise_db, min_silence):
    res = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-vn",
         "-af", f"silencedetect=noise={noise_db}dB:d={min_silence}", "-f", "null", "-"],
        capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", res.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", res.stderr)]
    return starts, ends


def keep_segments(duration, starts, ends, pad, min_keep):
    """Zet stiltes om naar te bewaren stukken, met wat lucht (pad) rond spraak."""
    if len(ends) < len(starts):          # stilte loopt door tot het einde
        ends.append(duration)
    segs, cursor = [], 0.0
    for s, e in zip(starts, ends):
        s, e = max(0.0, s), min(duration, e)
        seg_end = min(duration, s + pad)
        if seg_end - cursor >= min_keep:
            segs.append([round(cursor, 3), round(seg_end, 3)])
        cursor = max(cursor, e - pad)
    if duration - cursor >= min_keep:
        segs.append([round(cursor, 3), round(duration, 3)])
    # samenvoegen van overlappende stukken
    merged = []
    for s, e in segs:
        if merged and s <= merged[-1][1] + 0.02:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    return merged


def cmd_cut(a):
    os.makedirs(a.workdir, exist_ok=True)
    dur = probe_duration(a.input)
    starts, ends = detect_silences(a.input, a.noise, a.min_silence)
    segs = keep_segments(dur, starts, ends, a.pad, 0.15)
    kept = sum(e - s for s, e in segs)
    print(f"Origineel {dur:.1f}s -> {kept:.1f}s ({len(segs)} stukken, {dur - kept:.1f}s stilte eruit)")

    # trim/atrim per stuk + concat; korte audio-fades tegen klikjes bij de knip.
    parts, labels = [], []
    vfit = (f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
            f"fps={FPS},setsar=1")
    for i, (s, e) in enumerate(segs):
        d = e - s
        f = min(0.02, d / 4)
        parts.append(f"[0:v]trim={s}:{e},setpts=PTS-STARTPTS,{vfit}[v{i}];")
        parts.append(f"[0:a]atrim={s}:{e},asetpts=PTS-STARTPTS,"
                     f"afade=t=in:d={f},afade=t=out:st={d - f:.3f}:d={f}[a{i}];")
        labels.append(f"[v{i}][a{i}]")
    parts.append("".join(labels) + f"concat=n={len(segs)}:v=1:a=1[v][a]")
    script = os.path.join(a.workdir, "cut_filter.txt")
    with open(script, "w") as fh:
        fh.write("\n".join(parts))
    out = os.path.join(a.workdir, "cut.mp4")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", a.input,
         "-filter_complex_script", script, "-map", "[v]", "-map", "[a]",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
         "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out])
    with open(os.path.join(a.workdir, "segments.json"), "w") as fh:
        json.dump({"source": a.input, "duration": dur, "kept": segs}, fh, indent=1)
    print("Klaar:", out)


# -------------------------------------------------------------------- transcribe
def cmd_transcribe(a):
    from faster_whisper import WhisperModel
    model = WhisperModel(a.model, device="cpu", compute_type="int8")
    segments, info = model.transcribe(a.input, language=a.language, word_timestamps=True,
                                      vad_filter=False, beam_size=5)
    words, lines = [], []
    for seg in segments:
        lines.append(f"[{seg.start:6.2f} - {seg.end:6.2f}] {seg.text.strip()}")
        for w in seg.words or []:
            words.append({"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)})
    wd = os.path.dirname(os.path.abspath(a.input))
    with open(os.path.join(wd, "words.json"), "w") as fh:
        json.dump(words, fh, ensure_ascii=False, indent=0)
    with open(os.path.join(wd, "transcript.txt"), "w") as fh:
        fh.write("\n".join(lines) + "\n")
    print("\n".join(lines))


# ------------------------------------------------------------------------ render
def clean_text(t):
    # Het lettertype heeft geen emoji's; die voeg je zelf in TikTok toe.
    return re.sub(r"[\U0001F000-\U0001FFFF\u2600-\u27BF\uFE0F]", "", t).strip()


def zoom_expr(plan):
    terms = []
    for z in plan.get("zooms", []):
        s, e, amt = z["start"], z["end"], z.get("amount", 0.12)
        style = z.get("style", "punch")
        if style == "slow":     # langzaam inzoomen over de hele periode
            terms.append(f"{amt}*((t-{s})/{max(e - s, 0.01)})*between(t,{s},{e})")
        else:                   # snelle punch-in met korte ease (0.12s)
            terms.append(f"{amt}*min(1,(t-{s})/0.12)*between(t,{s},{e})")
    for sh in plan.get("shakes", []):
        terms.append(f"0.06*between(t,{sh['time']},{sh['time'] + sh.get('dur', 0.3)})")
    return "1+" + ("+".join(terms) if terms else "0")


def shake_expr(plan, axis):
    terms = []
    for sh in plan.get("shakes", []):
        t0, d, amp = sh["time"], sh.get("dur", 0.3), sh.get("amp", 18)
        f = 47 if axis == "x" else 61
        terms.append(f"{amp}*sin((t-{t0})*{f})*(1-(t-{t0})/{d})*between(t,{t0},{t0 + d})")
    return "+".join(terms) if terms else "0"


def text_filters(plan, workdir, font):
    filters = []
    items = []
    if plan.get("hook"):
        h = dict(plan["hook"]); h.setdefault("style", "hook"); items.append(h)
    items += plan.get("overlays", [])
    for i, it in enumerate(items):
        style = it.get("style", "pop")
        lines = wrap(clean_text(it["text"]), 16 if style == "hook" else 20)
        txt = os.path.join(workdir, f"text_{i}.txt")
        with open(txt, "w") as fh:
            fh.write("\n".join(lines))
        s, e = it["start"], it["end"]
        size = it.get("size", 84 if style == "hook" else 96)
        y = it.get("y", SAFE_TOP + 40 if style == "hook" else 520)
        color = it.get("color", "white")
        box = it.get("box", "black@0.55" if style == "hook" else "")
        # pop-in: lettergrootte veert in 0.15s van 70% naar 100%
        fs = f"{size}*min(1,0.7+2*(t-{s}))"
        f = (f"drawtext=fontfile='{font}':textfile='{txt}':fontsize='{fs}':fontcolor={color}"
             f":line_spacing=10:borderw=6:bordercolor=black@0.9"
             f":x=max({SAFE_LEFT}\\,min(({SAFE_LEFT}+{SAFE_RIGHT}-text_w)/2\\,{SAFE_RIGHT}-text_w))"
             f":y={y}:enable='between(t,{s},{e})'")
        if box:
            f += f":box=1:boxcolor={box}:boxborderw=24"
        filters.append(f)
    return filters


def wrap(text, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > width:
            lines.append(cur); cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    return lines


def cmd_render(a):
    with open(a.plan) as fh:
        plan = json.load(fh)
    workdir = os.path.dirname(os.path.abspath(a.plan))
    font = font_path()
    z = zoom_expr(plan)
    sx, sy = shake_expr(plan, "x"), shake_expr(plan, "y")
    vf = [
        f"scale=w='2*trunc({W}*({z})/2)':h='2*trunc({H}*({z})/2)':eval=frame",
        f"crop={W}:{H}:x='clip((iw-{W})/2+({sx}),0,iw-{W})':y='clip((ih-{H})/2+({sy}),0,ih-{H})'",
        "setsar=1",
    ]
    for fl in plan.get("flashes", []):
        t0, d = fl["time"], fl.get("dur", 0.08)
        vf.append(f"drawbox=x=0:y=0:w=iw:h=ih:color=white@{fl.get('opacity', 0.55)}:t=fill"
                  f":enable='between(t,{t0},{t0 + d})'")
    if plan.get("grade", True):   # licht 'pop' kleurtje
        vf.append("eq=contrast=1.06:saturation=1.12,unsharp=5:5:0.4")
    vf += text_filters(plan, workdir, font)
    if a.guides:   # alleen voor controle: laat de vrij te houden zones zien
        vf.append(f"drawbox=x=0:y={SAFE_BOTTOM}:w=iw:h=ih-{SAFE_BOTTOM}:color=red@0.25:t=fill")
        vf.append(f"drawbox=x={SAFE_RIGHT}:y=0:w=iw-{SAFE_RIGHT}:h=ih:color=red@0.25:t=fill")
        vf.append(f"drawbox=x=0:y=0:w=iw:h={SAFE_TOP - 60}:color=red@0.25:t=fill")
    af = "highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=5:release=120,loudnorm=I=-14:TP=-1.5:LRA=9"
    script = os.path.join(workdir, "render_filter.txt")
    with open(script, "w") as fh:
        fh.write(f"[0:v]{','.join(vf)}[v];[0:a]{af}[a]")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", a.input,
         "-filter_complex_script", script, "-map", "[v]", "-map", "[a]",
         "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
         "-r", str(FPS), "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
         "-movflags", "+faststart", a.output])
    print("Klaar:", a.output)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("cut", help="stiltes eruit + naar 1080x1920")
    c.add_argument("input"); c.add_argument("workdir")
    c.add_argument("--noise", type=float, default=-35, help="stiltedrempel in dB (standaard -35)")
    c.add_argument("--min-silence", type=float, default=0.35, help="min. stilte in s om te knippen")
    c.add_argument("--pad", type=float, default=0.08, help="lucht rond spraak in s")
    c.set_defaults(fn=cmd_cut)
    t = sub.add_parser("transcribe", help="woorden met tijden (Whisper)")
    t.add_argument("input"); t.add_argument("--model", default="small")
    t.add_argument("--language", default="nl")
    t.set_defaults(fn=cmd_transcribe)
    r = sub.add_parser("render", help="effecten + overlay renderen")
    r.add_argument("input"); r.add_argument("plan"); r.add_argument("output")
    r.add_argument("--guides", action="store_true", help="toon safe zones (alleen voor controle)")
    r.set_defaults(fn=cmd_render)
    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
