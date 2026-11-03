#!/usr/bin/env python3
"""TikTok-editor pipeline.

  python3 tt.py prepare    <ruw.mp4> <projectmap> [--mirror] [--lang nl]
      -> norm + takes/stiltes eruit -> cut.mp4, words.json, transcript.txt, takes.json
  (Claude schrijft <projectmap>/storyboard.json, zie README.md)
  python3 tt.py assets     <projectmap>      -> 3D-iconen + rechtenvrije foto's uit storyboard.json ophalen
  python3 tt.py person     <projectmap>      -> person.webm (optioneel: cutout voor tekst-achter-persoon)
  python3 tt.py storyboard <projectmap>      -> storyboard.html (preview per beat, ter goedkeuring)
  python3 tt.py render     <projectmap> [--draft]  -> final.mp4
"""
import argparse
import base64
import difflib
import glob
import html
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
STUDIO = os.path.join(HERE, "studio")
W, H, FPS = 1080, 1920, 30


def run(cmd, **kw):
    print("+", " ".join(str(c) for c in cmd[:5]), "...", flush=True)
    return subprocess.run(cmd, check=True, **kw)


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         check=True, capture_output=True, text=True).stdout
    return float(out.strip())


# ----------------------------------------------------------------- transcribe
def transcribe(video, lang, model="small"):
    import numpy as np
    from faster_whisper import WhisperModel
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    audio = np.frombuffer(raw, dtype=np.float32)
    m = WhisperModel(model, device="cpu", compute_type="int8")
    segs, _ = m.transcribe(audio, language=lang, word_timestamps=True, beam_size=5, vad_filter=True)
    out = []
    for s in segs:
        words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)} for w in (s.words or [])]
        if words:
            out.append({"text": s.text.strip(), "s": words[0]["s"], "e": words[-1]["e"], "words": words})
    return out


def norm_text(t):
    return re.sub(r"[^a-z0-9à-ÿ ]", "", t.lower()).split()


def drop_bad_takes(segments, window=30.0):
    """Een zin die later (binnen `window` s) opnieuw wordt ingezet is een mislukte take: houd de laatste."""
    drop = set()
    for i, a in enumerate(segments):
        ta = norm_text(a["text"])
        if len(ta) < 2:
            continue
        for b in segments[i + 1:]:
            if b["s"] - a["e"] > window:
                break
            tb = norm_text(b["text"])
            head = min(4, len(ta), len(tb))
            same_start = head >= 2 and ta[:head] == tb[:head]
            similar = difflib.SequenceMatcher(None, " ".join(ta), " ".join(tb[: len(ta) + 3])).ratio() > 0.72
            if same_start or similar:
                drop.add(i)
                break
    return [s for i, s in enumerate(segments) if i not in drop], [segments[i] for i in sorted(drop)]


def keep_ranges(words, total, lead=0.12, tail=0.18, max_gap=0.35):
    ranges = []
    for w in words:
        s, e = max(0.0, w["s"] - lead), min(total, w["e"] + tail)
        if ranges and s - ranges[-1][1] < max_gap:
            ranges[-1][1] = max(ranges[-1][1], e)
        else:
            ranges.append([s, e])
    return [[round(a, 3), round(b, 3)] for a, b in ranges]


def remap(words, ranges):
    out, offset = [], 0.0
    for a, b in ranges:
        for w in words:
            if w["s"] >= a - 1e-3 and w["e"] <= b + 1e-3:
                out.append({"w": w["w"], "s": round(w["s"] - a + offset, 3), "e": round(w["e"] - a + offset, 3)})
        offset += b - a
    return out


def cmd_prepare(a):
    os.makedirs(a.project, exist_ok=True)
    norm = os.path.join(a.project, "norm.mp4")
    vf = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},setsar=1"
    if a.mirror:
        vf = "hflip," + vf
    run(["ffmpeg", "-y", "-v", "error", "-i", a.input, "-vf", vf, "-c:v", "libx264", "-crf", "14", "-preset", "fast",
         "-c:a", "aac", "-b:a", "256k", "-ar", "48000", norm])
    total = duration(norm)
    print("Transcriberen...")
    segs = transcribe(norm, a.lang)
    kept, dropped = drop_bad_takes(segs)
    words = [w for s in kept for w in s["words"]]
    ranges = keep_ranges(words, total, max_gap=a.gap)
    cut_len = sum(b - a_ for a_, b in ranges)
    print(f"Origineel {total:.1f}s -> {cut_len:.1f}s; {len(dropped)} mislukte take(s) en {len(ranges)} stukken")

    parts, labels = [], []
    for i, (s, e) in enumerate(ranges):
        d = e - s
        f = min(0.03, d / 4)
        parts.append(f"[0:v]trim={s}:{e},setpts=PTS-STARTPTS[v{i}];")
        parts.append(f"[0:a]atrim={s}:{e},asetpts=PTS-STARTPTS,afade=t=in:d={f},afade=t=out:st={d - f:.3f}:d={f}[a{i}];")
        labels.append(f"[v{i}][a{i}]")
    parts.append("".join(labels) + f"concat=n={len(ranges)}:v=1:a=1[v][a]")
    script = os.path.join(a.project, "cut_filter.txt")
    open(script, "w").write("\n".join(parts))
    run(["ffmpeg", "-y", "-v", "error", "-i", norm, "-filter_complex_script", script, "-map", "[v]", "-map", "[a]",
         "-c:v", "libx264", "-crf", "14", "-preset", "fast", "-r", str(FPS), "-c:a", "aac", "-b:a", "256k",
         os.path.join(a.project, "cut.mp4")])

    cw = remap(words, ranges)
    json.dump(cw, open(os.path.join(a.project, "words.json"), "w"), ensure_ascii=False, indent=0)
    json.dump({"source": os.path.abspath(a.input), "ranges": ranges,
               "dropped": [{"text": d["text"], "s": d["s"], "e": d["e"]} for d in dropped]},
              open(os.path.join(a.project, "takes.json"), "w"), ensure_ascii=False, indent=1)
    # transcript met tijden op de cut-tijdlijn, per zin
    lines, cur = [], []
    for w in cw:
        cur.append(w)
        if re.search(r"[.!?]$", w["w"]):
            lines.append(cur); cur = []
    if cur:
        lines.append(cur)
    txt = "\n".join(f"[{l[0]['s']:6.2f} - {l[-1]['e']:6.2f}] " + " ".join(x["w"] for x in l) for l in lines)
    open(os.path.join(a.project, "transcript.txt"), "w").write(txt + "\n")
    print(txt)
    if dropped:
        print("\nEruit geknipt (mislukte takes):")
        for d in dropped:
            print(f"  - {d['text']}")
    os.remove(norm)


# --------------------------------------------------------------------- assets
FLUENT = "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets"


def slug(t):
    return re.sub(r"[^a-z0-9]+", "_", t.lower()).strip("_")


def fetch(url, dest):
    import urllib.request
    req = urllib.request.Request(url, headers={"User-Agent": "tiktok-editor/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r, open(dest, "wb") as fh:
        fh.write(r.read())


def fetch_emoji(name, dest):
    from urllib.parse import quote
    folder = name.strip()[0].upper() + name.strip()[1:].lower()
    base = slug(name)
    for path in (f"{folder}/3D/{base}_3d.png", f"{folder}/Default/3D/{base}_3d_default.png"):
        try:
            fetch(f"{FLUENT}/{quote(path)}", dest)
            return True
        except Exception:
            pass
    return False


def photo_candidates(query, folder, n=6):
    """Rechtenvrije foto's (CC0 / publiek domein) via Openverse -> folder/0.jpg.. + sheet.jpg."""
    import urllib.request
    from urllib.parse import urlencode
    os.makedirs(folder, exist_ok=True)
    q = urlencode({"q": query, "license": "cc0,pdm", "page_size": 20, "mature": "false"})
    req = urllib.request.Request(f"https://api.openverse.org/v1/images/?{q}", headers={"User-Agent": "tiktok-editor/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        results = json.load(r).get("results", [])
    results = [x for x in results if (x.get("width") or 0) >= 900 and (x.get("height") or 0) >= 600]
    found = []
    for res in results:
        if len(found) >= n:
            break
        dest = os.path.join(folder, f"{len(found)}.jpg")
        try:
            fetch(res["url"], dest + ".tmp")
            run(["ffmpeg", "-y", "-v", "error", "-i", dest + ".tmp", "-vf", "scale='min(1200,iw)':-2", "-q:v", "3", dest])
            os.remove(dest + ".tmp")
            found.append({"title": res.get("title"), "creator": res.get("creator"), "license": res.get("license"),
                          "source": res.get("foreign_landing_url")})
        except Exception:
            if os.path.exists(dest + ".tmp"):
                os.remove(dest + ".tmp")
    if found:
        ins = sum((["-i", os.path.join(folder, f"{i}.jpg")] for i in range(len(found))), [])
        scaled = "".join(f"[{i}]scale=360:270:force_original_aspect_ratio=increase,crop=360:270,"
                         f"drawtext=text='{i}':x=12:y=8:fontsize=40:fontcolor=white:borderw=3[s{i}];" for i in range(len(found)))
        run(["ffmpeg", "-y", "-v", "error", *ins, "-filter_complex",
             scaled + "".join(f"[s{i}]" for i in range(len(found))) + f"xstack=inputs={len(found)}:layout="
             + "|".join(f"{(i % 3) * 360}_{(i // 3) * 270}" for i in range(len(found))) + ":fill=black" if len(found) > 1
             else scaled + "[s0]null", "-frames:v", "1", os.path.join(folder, "sheet.jpg")])
    json.dump(found, open(os.path.join(folder, "credits.json"), "w"), ensure_ascii=False, indent=1)
    return found


def cmd_assets(a):
    path = os.path.join(a.project, "storyboard.json")
    sb = json.load(open(path))
    adir = os.path.join(a.project, "assets")
    os.makedirs(adir, exist_ok=True)
    credits = {}
    for b in sb["beats"]:
        if b.get("type") == "emoji" and b.get("name"):
            rel = f"assets/emoji_{slug(b['name'])}.png"
            if not os.path.exists(os.path.join(a.project, rel)):
                ok = fetch_emoji(b["name"], os.path.join(a.project, rel))
                print(("✓ " if ok else "✗ niet gevonden: ") + b["name"])
                if not ok:
                    continue
            b["src"] = rel
        if b.get("type") == "image" and b.get("query"):
            folder = os.path.join(adir, "kandidaten", slug(b["query"]))
            cj = os.path.join(folder, "credits.json")
            found = json.load(open(cj)) if os.path.exists(cj) else photo_candidates(b["query"], folder)
            if not found:
                print("✗ geen foto: " + b["query"])
                continue
            pick = min(int(b.get("pick", 0)), len(found) - 1)
            rel = f"assets/kandidaten/{slug(b['query'])}/{pick}.jpg"
            b["src"] = rel
            credits[rel] = found[pick]
            print(f"✓ {b['query']}: keuze {pick} van {len(found)} (overzicht: {os.path.join(folder, 'sheet.jpg')})")
    json.dump(sb, open(path, "w"), ensure_ascii=False, indent=1)
    if credits:
        cpath = os.path.join(a.project, "credits.json")
        old = json.load(open(cpath)) if os.path.exists(cpath) else {}
        old.update(credits)
        json.dump(old, open(cpath, "w"), ensure_ascii=False, indent=1)


# --------------------------------------------------------------------- person
def behind_ranges(sb, pad=0.2):
    return [(b["start"] - pad, b["end"] + pad) for b in sb["beats"] if b.get("type") == "title" and b.get("behind")]


def cmd_person(a):
    import numpy as np
    from PIL import Image, ImageFilter
    from rembg import new_session, remove
    sb = json.load(open(os.path.join(a.project, "storyboard.json")))
    video = os.path.join(a.project, sb.get("video", "cut.mp4"))
    rngs = behind_ranges(sb)
    n_frames = int(round(duration(video) * FPS))
    need = [i for i in range(n_frames) if any(s <= i / FPS <= e for s, e in rngs)]
    print(f"Persoon uitknippen in {len(need)} van {n_frames} frames...")
    mdir = os.path.join(a.project, "masks")
    shutil.rmtree(mdir, ignore_errors=True)
    os.makedirs(mdir)
    fdir = os.path.join(a.project, "frames_tmp")
    shutil.rmtree(fdir, ignore_errors=True)
    os.makedirs(fdir)
    run(["ffmpeg", "-v", "error", "-i", video, "-vf", "scale=540:960", os.path.join(fdir, "%05d.png")])
    session = new_session(a.model)
    black = Image.new("L", (540, 960), 0)
    prev = None
    needset = set(need)
    for i in range(n_frames):
        out = os.path.join(mdir, f"{i:05d}.png")
        src = os.path.join(fdir, f"{i + 1:05d}.png")
        if i in needset and os.path.exists(src):
            m = np.asarray(remove(Image.open(src).convert("RGB"), session=session, only_mask=True), dtype=np.float32)
            if prev is not None and (i - 1) in needset:
                m = 0.65 * m + 0.35 * prev  # rustiger randen tussen frames
            prev = m
            img = Image.fromarray(np.clip(m, 0, 255).astype("uint8")).filter(ImageFilter.GaussianBlur(0.8))
            img.save(out)
            if len(need) > 20 and need.index(i) % 30 == 0:
                print(f"  {need.index(i)}/{len(need)}", flush=True)
        else:
            prev = None
            black.save(out)
    shutil.rmtree(fdir)
    out = os.path.join(a.project, "person.webm")
    run(["ffmpeg", "-y", "-v", "error", "-i", video, "-framerate", str(FPS), "-i", os.path.join(mdir, "%05d.png"),
         "-filter_complex", f"[1:v]scale={W}:{H}:flags=bicubic,format=gray[m];[0:v][m]alphamerge,format=yuva420p[v]",
         "-map", "[v]", "-an", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-auto-alt-ref", "0",
         "-b:v", "0", "-crf", "28", "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1", out])
    sb["person"] = "person.webm"
    json.dump(sb, open(os.path.join(a.project, "storyboard.json"), "w"), ensure_ascii=False, indent=1)
    print("Klaar:", out)


# ----------------------------------------------------------------- storyboard
DESCRIBE = {
    "title": lambda b: ("Titel " + ("achter de persoon" if b.get("behind") else "over beeld")
                        + (", effen achtergrond" if b.get("background") == "solid" else "")),
    "words": lambda b: "Grote woorden over beeld",
    "prompt": lambda b: f"Typend kaartje: “{b.get('text')}”" + (f" → ✓ {b.get('doneText')}" if b.get("doneAt") else ""),
    "follow": lambda b: f"Volg-kaart {b.get('handle')}",
    "comment": lambda b: f"Reactie-kaart: {b.get('headline')}",
    "images": lambda b: f"{len(b.get('src', []))} zwevende beelden",
    "pop": lambda b: f"Tekst popt op: “{b.get('text')}” ({b.get('look', 'sticker')})",
    "emoji": lambda b: f"3D-icoon popt op: {b.get('name')}",
    "image": lambda b: f"Foto popt op: {b.get('query') or b.get('src')}" + (f" — “{b['label']}”" if b.get("label") else ""),
}


def cmd_storyboard(a):
    sb = json.load(open(os.path.join(a.project, "storyboard.json")))
    words = sb.get("words") or json.load(open(os.path.join(a.project, "words.json")))
    total = duration(os.path.join(a.project, sb.get("video", "cut.mp4")))
    beats = sorted(sb["beats"], key=lambda b: b["start"])
    # één preview per beat (iets na het begin, als alles in beeld staat)
    times = [round(min(b["end"] - 0.05, b["start"] + min(1.0, (b["end"] - b["start"]) * 0.6)), 2) for b in beats]
    shutil.rmtree(os.path.join(a.project, "stills"), ignore_errors=True)
    run(["node", os.path.join(STUDIO, "render.mjs"), a.project, "--stills", ",".join(map(str, times))], cwd=STUDIO)
    rows = []
    for b, t in zip(beats, times):
        png = os.path.join(a.project, "stills", f"still_{t}.png")
        jpg = png.replace(".png", ".jpg")
        run(["ffmpeg", "-y", "-v", "error", "-i", png, "-vf", "scale=360:-1", "-q:v", "4", jpg])
        img = base64.b64encode(open(jpg, "rb").read()).decode()
        said = " ".join(w["w"] for w in words if b["start"] - 0.05 <= w["s"] < b["end"])
        lines = " / ".join(l["text"] for l in b.get("lines", []))
        rows.append(f"""
<article class="beat">
  <img src="data:image/jpeg;base64,{img}" alt="Preview {b['start']:.1f}s">
  <div class="meta">
    <div class="tc">{b['start']:05.2f} → {b['end']:05.2f} · {html.escape(b['type'].upper())}</div>
    <p class="quote">“{html.escape(said) or '—'}”</p>
    <ul>
      <li><b>Beeld</b> {html.escape(DESCRIBE.get(b['type'], lambda _: b['type'])(b))}</li>
      {f'<li><b>Tekst</b> {html.escape(lines)}</li>' if lines else ''}
      {f'<li><b>Waarom</b> {html.escape(b["note"])}</li>' if b.get("note") else ''}
    </ul>
  </div>
</article>""")
    zooms = ", ".join(f"{z['start']:.1f}s {z.get('ease', 'in')}" for z in sb.get("zooms", [])) or "geen"
    cap = sb.get("captions", {})
    page = f"""<!doctype html><html lang="nl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Storyboard {html.escape(sb.get('title', ''))}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono&family=Inter:wght@400;600;900&display=swap" rel="stylesheet">
<style>
:root{{--bg:#111112;--panel:#1C1C1E;--ink:#FFFFFF;--muted:#A1A1A6;--accent:#FFC93C;--line:rgba(255,255,255,.12)}}
@media (prefers-color-scheme: light){{:root:not([data-theme="dark"]){{--bg:#FAFAF7;--panel:#F0EFEA;--ink:#111112;--muted:#5E5E63;--accent:#B88400;--line:rgba(0,0,0,.1)}}}}
:root[data-theme="dark"]{{--bg:#111112;--panel:#1C1C1E;--ink:#FFFFFF;--muted:#A1A1A6;--accent:#FFC93C;--line:rgba(255,255,255,.12)}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 Inter,system-ui,sans-serif}}
main{{max-width:820px;margin:0 auto;padding:28px 16px 64px}}
.k{{font-family:'DM Mono',monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}}
h1{{font-family:Inter,sans-serif;font-weight:900;letter-spacing:-.04em;font-size:clamp(36px,8vw,64px);line-height:.98;margin:.2em 0 .3em}}
.sum{{display:flex;flex-wrap:wrap;gap:8px 18px;margin-bottom:28px}}
.beat{{display:grid;grid-template-columns:120px 1fr;gap:16px;padding:16px 0;border-top:1px solid var(--line)}}
.beat img{{width:120px;border-radius:10px;display:block}}
.tc{{font-family:'DM Mono',monospace;font-size:12px;color:var(--muted);letter-spacing:.06em}}
.quote{{font-size:20px;font-weight:600;line-height:1.25;margin:.3em 0 .5em}}.quote::before{{content:"";display:inline-block;width:10px;height:10px;border-radius:10px;background:var(--accent);margin-right:10px}}
ul{{list-style:none;padding:0;margin:0;font-size:14px;color:var(--muted)}}li{{margin:.2em 0}}li b{{color:var(--ink);font-weight:600;margin-right:.4em}}
.next{{margin-top:32px;padding:18px;border-radius:14px;background:var(--panel)}}
@media (min-width:640px){{.beat{{grid-template-columns:180px 1fr}}.beat img{{width:180px}}}}
</style></head><body><main>
<div class="k">Storyboard · nog niet gerenderd</div>
<h1>{html.escape(sb.get('title', 'Video'))}</h1>
<div class="sum k"><span>Stijl: {html.escape(sb.get('style', 'aesthetic'))}</span><span>Lengte: {total:.1f}s</span>
<span>Ondertitels: {'aan' if cap.get('enabled', True) else 'uit'}</span><span>Kernwoorden: {html.escape(', '.join(cap.get('highlight', [])) or '—')}</span><span>Zooms: {html.escape(zooms)}</span></div>
{''.join(rows)}
<div class="next"><div class="k">Aanpassen?</div><p>Zeg het in één zin, bijvoorbeeld: “maak het moody”, “strakker knippen”, “grotere ondertitels” of “andere hook”.</p></div>
</main></body></html>"""
    out = os.path.join(a.project, "storyboard.html")
    open(out, "w").write(page)
    print("Klaar:", out)


def cmd_render(a):
    out = a.out or os.path.join(a.project, "final.mp4")
    extra = ["--draft"] if a.draft else []
    run(["node", os.path.join(STUDIO, "render.mjs"), os.path.abspath(a.project), os.path.abspath(out), *extra], cwd=STUDIO)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("prepare"); c.add_argument("input"); c.add_argument("project")
    c.add_argument("--mirror", action="store_true", help="spiegel selfie-beeld (tekst op shirt weer leesbaar)")
    c.add_argument("--gap", type=float, default=0.35, help="pauzes langer dan dit (s) worden geknipt; kleiner = strakker")
    c.add_argument("--lang", default="nl"); c.set_defaults(fn=cmd_prepare)
    c = sub.add_parser("assets"); c.add_argument("project"); c.set_defaults(fn=cmd_assets)
    c = sub.add_parser("person"); c.add_argument("project")
    c.add_argument("--model", default="u2net_human_seg"); c.set_defaults(fn=cmd_person)
    c = sub.add_parser("storyboard"); c.add_argument("project"); c.set_defaults(fn=cmd_storyboard)
    c = sub.add_parser("render"); c.add_argument("project"); c.add_argument("--out")
    c.add_argument("--draft", action="store_true"); c.set_defaults(fn=cmd_render)
    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
