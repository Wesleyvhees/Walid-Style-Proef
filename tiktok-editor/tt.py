#!/usr/bin/env python3
"""TikTok-editor pipeline.

  python3 tt.py prepare    <ruw.mp4> <projectmap> [--mirror] [--lang nl]
      -> norm + takes/stiltes eruit -> cut.mp4, words.json, transcript.txt, takes.json
  (Claude schrijft <projectmap>/storyboard.json, zie README.md)
  python3 tt.py combine    <project> <take1> <take2> ...  -> meerdere takes tot één video
  python3 tt.py fixwords   <project> "juiste tekst"      -> spraakherkenningsfouten verbeteren
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
def load_audio(video):
    import numpy as np
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def transcribe(audio, lang, model="medium", vad=True):
    from faster_whisper import WhisperModel
    m = WhisperModel(model, device="cpu", compute_type="int8")
    segs, _ = m.transcribe(audio, language=lang, word_timestamps=True, beam_size=5, vad_filter=vad,
                           condition_on_previous_text=False)
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


def speech_mask(audio, sr=16000, hop=0.01):
    """Per 10 ms: is hier spraak? Op basis van het geluidsniveau t.o.v. de ruisvloer."""
    import numpy as np
    n = int(sr * hop)
    frames = audio[: len(audio) // n * n].reshape(-1, n)
    db = 20 * np.log10(np.sqrt((frames ** 2).mean(axis=1)) + 1e-9)
    floor = np.percentile(db, 10)
    peak = np.percentile(db, 95)
    thr = max(floor + 10, peak - 32)  # duidelijk boven de ruis = spraak
    soft = floor + 7  # zachte klanken (s, f, uitademing van een woord)
    m = db > thr
    # hysterese: spraak loopt door zolang het nog boven 'soft' zit (max 0.08 s), zo blijven woordeinden heel
    ext = int(0.08 / hop)
    out = m.copy()
    for direction in (1, -1):
        run = 0
        idx = range(len(m)) if direction == 1 else range(len(m) - 1, -1, -1)
        for i in idx:
            if m[i]:
                run = ext
            elif run > 0 and db[i] > soft:
                out[i] = True
                run -= 1
            else:
                run = 0
    return out, hop


def has_music(audio):
    """Muziek onder de video: het geluid zakt (bijna) nooit weg naar de ruisvloer."""
    import numpy as np
    n = 160
    f = audio[: len(audio) // n * n].reshape(-1, n)
    db = 20 * np.log10(np.sqrt((f ** 2).mean(axis=1)) + 1e-9)
    loud = np.percentile(db, 95)
    return float(np.percentile(db, 10)) > loud - 14  # stiltes liggen bij spraak normaal >20 dB lager


def keep_ranges(words, audio, total, lead=0.03, tail=0.05, max_gap=0.08, word_pad=0.25):
    """Houd alleen stukken waar echt gesproken wordt, en alleen rond herkende woorden
    (dus geen gemompel, kuchjes of mislukte takes). Pauzes > max_gap gaan eruit."""
    import numpy as np
    mask, hop = speech_mask(audio)
    near = np.zeros_like(mask)
    for w in words:  # alleen geluid in de buurt van een woord telt
        near[max(0, int((w["s"] - word_pad) / hop)): int((w["e"] + word_pad) / hop) + 1] = True
    m = mask & near
    # Woordtijden van Whisper zijn ruim; vertrouw op het geluid. Alleen een woord dat
    # helemaal geen hoorbaar geluid heeft (heel zacht) houden we toch (middenstuk).
    for w in words:
        a_, b_ = int(w["s"] / hop), int(w["e"] / hop) + 1
        if not m[a_:b_].any():
            d = b_ - a_
            m[a_ + d // 5: b_ - d // 5] = True
    ranges, i, N = [], 0, len(m)
    while i < N:
        if m[i]:
            j = i
            while j < N and m[j]:
                j += 1
            ranges.append([i * hop, j * hop])
            i = j
        else:
            i += 1
    ranges = [[r[0], r[1]] for r in ranges if r[1] - r[0] >= 0.06]
    out = []
    for a, b in ranges:
        a, b = max(0.0, a - lead), min(total, b + tail)
        if out and a - out[-1][1] < max_gap:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    # op frames afronden, zodat beeld en geluid synchroon blijven
    snap = lambda t: round(round(t * FPS) / FPS, 4)
    out = [[snap(a), snap(b)] for a, b in out]
    return [r for r in out if r[1] > r[0]]


def remap_time(t, ranges):
    """Tijd in het origineel -> tijd in cut.mp4 (in een geknipt stuk: naar de dichtstbijzijnde rand)."""
    off = 0.0
    for a, b in ranges:
        if t < a:
            return off
        if t <= b:
            return off + t - a
        off += b - a
    return off


def remap(words, ranges):
    out = []
    for w in words:
        s, e = remap_time(w["s"], ranges), remap_time(w["e"], ranges)
        if e - s >= 0.02:
            out.append({"w": w["w"], "s": round(s, 3), "e": round(e, 3)})
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
    audio = load_audio(norm)
    music = has_music(audio)
    if music:
        print("Muziek gedetecteerd: knippen op woorden i.p.v. geluidsniveau, spraakherkenning zonder VAD")
    segs = transcribe(audio, a.lang, model=a.model, vad=not music)
    kept, dropped = drop_bad_takes(segs)
    words = [w for s in kept for w in s["words"]]
    if a.keep_pauses or not words:
        ranges = [[0.0, round(total, 3)]]  # alles houden (bv. poses bij een body check)
    elif music:
        # op woordtijden knippen; muziek maakt het geluidsniveau onbruikbaar
        ranges = []
        for w in words:
            s0, e0 = max(0.0, w["s"] - 0.08), min(total, w["e"] + 0.12)
            if ranges and s0 - ranges[-1][1] < max(a.gap, 0.25):
                ranges[-1][1] = max(ranges[-1][1], e0)
            else:
                ranges.append([s0, e0])
        ranges = [[round(round(x * FPS) / FPS, 4), round(round(y * FPS) / FPS, 4)] for x, y in ranges]
    else:
        ranges = keep_ranges(words, audio, total, max_gap=a.gap)
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
    try:
        cmd_layout(argparse.Namespace(project=a.project))  # gezicht volgen voor ondertitel-plaatsing
    except Exception as e:
        print("Gezicht volgen mislukt (ondertitels op vaste plek):", e)
    if dropped:
        print("\nEruit geknipt (mislukte takes):")
        for d in dropped:
            print(f"  - {d['text']}")
    os.remove(norm)


# --------------------------------------------------------------------- layout
def cmd_layout(a):
    """Waar staat het gezicht? -> layout.json (4x per seconde), voor automatische plaatsing van ondertitels."""
    import cv2
    import numpy as np
    video = os.path.join(a.project, "cut.mp4")
    fps = 4
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-vf", f"fps={fps},scale=540:960,format=gray",
                          "-f", "rawvideo", "-"], check=True, capture_output=True).stdout
    frames = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 960, 540)
    front = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    prof = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml")
    faces = []
    for g in frames:
        g = cv2.equalizeHist(g)
        boxes = list(front.detectMultiScale(g, 1.1, 5, minSize=(60, 60)))
        if not boxes:
            boxes = list(prof.detectMultiScale(g, 1.1, 4, minSize=(60, 60))) + \
                    [(540 - x - w, y, w, h) for x, y, w, h in prof.detectMultiScale(cv2.flip(g, 1), 1.1, 4, minSize=(60, 60))]
        # alleen geloofwaardige gezichten: middelpunt in de bovenste 60%, niet breder dan 60% van het beeld
        boxes = [b for b in boxes if (b[1] + b[3] / 2) < 960 * 0.6 and b[2] < 540 * 0.6]
        faces.append([int(v * 2) for v in max(boxes, key=lambda b: b[2] * b[3])] if boxes else None)
    # uitschieters weg: een "gezicht" waarvan de kin >260 px afwijkt van de mediaan is vrijwel zeker iets anders
    chins = [f[1] + f[3] for f in faces if f]
    if chins:
        med = float(np.median(chins))
        faces = [f if f and abs(f[1] + f[3] - med) < 260 else None for f in faces]
    # gaten opvullen met de dichtstbijzijnde detectie, daarna mediaan over 5 frames tegen springen
    idx = [i for i, f in enumerate(faces) if f]
    if idx:
        faces = [faces[min(idx, key=lambda j: abs(j - i))] for i in range(len(faces))]
        arr = np.array(faces, dtype=float)
        sm = np.array([np.median(arr[max(0, i - 2): i + 3], axis=0) for i in range(len(arr))])
        faces = [[int(v) for v in r] for r in sm]
    json.dump({"fps": fps, "faces": faces}, open(os.path.join(a.project, "layout.json"), "w"))
    found = len(idx)
    print(f"Gezicht gevonden in {found} van {len(frames)} frames"
          + (f"; kin gemiddeld op y={int(np.mean([f[1] + f[3] for f in faces]))}" if found else ""))


# ---------------------------------------------------------------------- beats
def cmd_beats(a):
    """Beat van de muziek vinden -> beats.json (tijden in s) voor zooms/pops op de maat."""
    import numpy as np
    audio = load_audio(os.path.join(a.project, "cut.mp4"))
    sr, hop = 16000, 160
    f = audio[: len(audio) // hop * hop].reshape(-1, hop)
    env = np.sqrt((f ** 2).mean(axis=1))
    on = np.maximum(0, np.diff(env, prepend=env[0]))  # alleen stijgingen = aanslagen
    on = np.convolve(on, np.hanning(5), "same")
    on = (on - on.mean()) / (on.std() + 1e-9)
    ac = np.correlate(on, on, "full")[len(on) - 1:]
    lo, hi = int(0.33 * 100), int(1.0 * 100)  # 60–180 BPM
    period = lo + int(np.argmax(ac[lo:hi]))
    phase = int(np.argmax([on[p::period].sum() for p in range(period)]))
    beats = []
    for t in range(phase, len(on), period):  # rond elke verwachte beat de echte piek zoeken
        w0, w1 = max(0, t - 4), min(len(on), t + 5)
        beats.append(round((w0 + int(np.argmax(on[w0:w1]))) / 100, 3))
    bpm = round(6000 / period, 1)
    json.dump({"bpm": bpm, "beats": beats}, open(os.path.join(a.project, "beats.json"), "w"), indent=1)
    print(f"{bpm} BPM, {len(beats)} beats: {beats[:12]}...")


# -------------------------------------------------------------------- combine
def cmd_combine(a):
    """Meerdere voorbereide takes (projectmappen met cut.mp4 + words.json) achter elkaar tot één project."""
    os.makedirs(a.project, exist_ok=True)
    words, offset, lst = [], 0.0, os.path.join(a.project, "concat.txt")
    with open(lst, "w") as fh:
        for src in a.takes:
            cut = os.path.abspath(os.path.join(src, "cut.mp4"))
            fh.write(f"file '{cut}'\n")
            for w in json.load(open(os.path.join(src, "words.json"))):
                words.append({"w": w["w"], "s": round(w["s"] + offset, 3), "e": round(w["e"] + offset, 3)})
            offset += duration(cut)
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst,
         "-c:v", "libx264", "-crf", "14", "-preset", "fast", "-r", str(FPS), "-c:a", "aac", "-b:a", "256k",
         os.path.join(a.project, "cut.mp4")])
    json.dump(words, open(os.path.join(a.project, "words.json"), "w"), ensure_ascii=False, indent=0)
    cmd_layout(argparse.Namespace(project=a.project))
    print(f"Klaar: {len(a.takes)} takes, {offset:.1f}s")


def cmd_fixwords(a):
    """Verbeter de tekst van words.json met een correcte zin (tijden blijven, verschillen worden verdeeld)."""
    path = os.path.join(a.project, "words.json")
    words = json.load(open(path))
    good = a.text.split()
    sm = difflib.SequenceMatcher(None, [norm_text(w["w"])[0] if norm_text(w["w"]) else "" for w in words],
                                 [norm_text(g)[0] if norm_text(g) else "" for g in good], autojunk=False)
    out = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            out += [{"w": good[j1 + k], "s": words[i1 + k]["s"], "e": words[i1 + k]["e"]} for k in range(i2 - i1)]
        elif j2 > j1:
            if i2 > i1:
                s0, e0 = words[i1]["s"], words[i2 - 1]["e"]
            else:  # ingevoegd woord: klein stukje rond de vorige/volgende
                s0 = out[-1]["e"] if out else (words[i1]["s"] if i1 < len(words) else 0)
                e0 = words[i1]["s"] if i1 < len(words) else s0 + 0.3
                if e0 <= s0:
                    e0 = s0 + 0.2
            step = (e0 - s0) / (j2 - j1)
            out += [{"w": good[j], "s": round(s0 + step * (j - j1), 3), "e": round(s0 + step * (j - j1 + 1), 3)} for j in range(j1, j2)]
    json.dump(out, open(path, "w"), ensure_ascii=False, indent=0)
    print(" ".join(f"{w['w']}@{w['s']}" for w in out))


# ------------------------------------------------------------ gebruikte beelden
REGISTER = os.path.join(HERE, "kennis", "gebruikte-beelden.json")


def file_hash(path):
    import hashlib
    return hashlib.sha1(open(path, "rb").read()).hexdigest()[:16]


def load_register():
    return json.load(open(REGISTER)) if os.path.exists(REGISTER) else {"beelden": {}, "iconen": {}}


def used_elsewhere(reg, path, title):
    """Naam van een andere video waarin dit beeld al zat, of None."""
    if not os.path.exists(path):
        return None
    hit = reg["beelden"].get(file_hash(path))
    others = [v for v in (hit or {}).get("videos", []) if v != title]
    return others[0] if others else None


def register_project(project):
    """Na een render: alle beelden en iconen van deze video in het register zetten."""
    sb = json.load(open(os.path.join(project, "storyboard.json")))
    title = sb.get("title", os.path.basename(project))
    reg = load_register()
    for b in sb["beats"]:
        src = b.get("src") if isinstance(b.get("src"), str) else None
        if src and b.get("type") in ("image", "scene", "cutaway") and os.path.exists(os.path.join(project, src)):
            h = file_hash(os.path.join(project, src))
            e = reg["beelden"].setdefault(h, {"omschrijving": b.get("query") or os.path.basename(src), "videos": []})
            if title not in e["videos"]:
                e["videos"].append(title)
        if b.get("type") == "emoji" and b.get("name"):
            v = reg["iconen"].setdefault(b["name"], [])
            if title not in v:
                v.append(title)
    os.makedirs(os.path.dirname(REGISTER), exist_ok=True)
    json.dump(reg, open(REGISTER, "w"), ensure_ascii=False, indent=1)


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
    results = []
    for attempt in range(4):  # Openverse is soms traag: opnieuw proberen
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                results = json.load(r).get("results", [])
            break
        except Exception as e:
            print(f"  Openverse: poging {attempt + 1} mislukt ({e})", flush=True)
            import time
            time.sleep(2 ** attempt * 2)
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
    if found:  # alleen onthouden als er iets gevonden is (anders volgende keer opnieuw zoeken)
        json.dump(found, open(os.path.join(folder, "credits.json"), "w"), ensure_ascii=False, indent=1)
    return found


def cmd_assets(a):
    path = os.path.join(a.project, "storyboard.json")
    sb = json.load(open(path))
    adir = os.path.join(a.project, "assets")
    os.makedirs(adir, exist_ok=True)
    credits = {}
    reg = load_register()
    title = sb.get("title", os.path.basename(a.project))
    names = [b["name"] for b in sb["beats"] if b.get("type") == "emoji" and b.get("name")]
    for n in sorted(set(x for x in names if names.count(x) > 1)):
        print(f"  ⚠ icoon '{n}' komt {names.count(n)}× voor in deze video: wissel af")
    for b in sb["beats"]:
        src = b.get("src") if isinstance(b.get("src"), str) else None
        if src and not b.get("query") and b.get("type") in ("image", "scene", "cutaway"):
            other = used_elsewhere(reg, os.path.join(a.project, src), title)
            if other:
                print(f"  ⚠ {src} zat al in '{other}': gebruik een ander beeld")
    for b in sb["beats"]:
        if b.get("type") == "emoji" and b.get("name"):
            rel = f"assets/emoji_{slug(b['name'])}.png"
            if not os.path.exists(os.path.join(a.project, rel)):
                ok = fetch_emoji(b["name"], os.path.join(a.project, rel))
                print(("✓ " if ok else "✗ niet gevonden: ") + b["name"])
                if not ok:
                    continue
            b["src"] = rel
        if b.get("type") in ("image", "scene", "cutaway") and b.get("query"):
            folder = os.path.join(adir, "kandidaten", slug(b["query"]))
            cj = os.path.join(folder, "credits.json")
            found = json.load(open(cj)) if os.path.exists(cj) else photo_candidates(b["query"], folder)
            if not found:
                print("✗ geen foto: " + b["query"])
                continue
            if "pick" in b:
                pick = min(int(b["pick"]), len(found) - 1)
            else:  # eerste kandidaat die nog in geen enkele andere video zat
                pick = next((i for i in range(len(found))
                             if not used_elsewhere(reg, os.path.join(folder, f"{i}.jpg"), title)), 0)
            rel = f"assets/kandidaten/{slug(b['query'])}/{pick}.jpg"
            other = used_elsewhere(reg, os.path.join(a.project, rel), title)
            if other:
                print(f"  ⚠ deze foto zat al in '{other}': kies een andere (pick) of zoekterm")
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
    return [(b["start"] - pad, b["end"] + pad) for b in sb["beats"]
            if (b.get("type") == "title" and b.get("behind")) or (b.get("type") == "scene" and b.get("mode") == "cutout")]


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
    "scene": lambda b: ("Jij uitgeknipt voor" if b.get("mode") == "cutout" else "Jij in kader voor") + f" beeld: {b.get('query') or b.get('src')}",
    "cutaway": lambda b: f"Cutaway schermvullend: {b.get('query') or b.get('src')}" + (f" — “{b['label']}”" if b.get("label") else ""),
    "hook": lambda b: f"Hook-titel: “{b.get('text')}”" + (f" ({b['sub']})" if b.get("sub") else ""),
    "chart": lambda b: f"Data-kaart: {b.get('title', '')} ({len(b.get('rows', []))} rijen)",
    "image": lambda b: f"Foto popt op: {b.get('query') or b.get('src')}" + (f" — “{b['label']}”" if b.get("label") else ""),
}


TEXT_TYPES = ("pop", "words", "hook", "title")
VISUAL_TYPES = ("scene", "cutaway", "image", "emoji", "chart", "images", "prompt", "follow", "comment")
SFX_NL = {"pop": "pop", "whoosh": "whoosh", "ding": "ding", "click": "klik", "boom": "boem", "riser": "riser"}


def sentences(words):
    out, cur = [], []
    for w in words:
        cur.append(w)
        if re.search(r"[.!?]$", w["w"]) or (len(cur) >= 9 and re.search(r",$", w["w"])):
            out.append(cur); cur = []
    if cur:
        out.append(cur)
    return out


def beat_text(b):
    if b["type"] in ("words", "title"):
        return " / ".join(l["text"] for l in b.get("lines", []))
    if b["type"] == "hook":
        return b["text"].replace("*", "") + (f" ({b['sub']})" if b.get("sub") else "")
    return b.get("text", "")


def cmd_storyboard(a):
    """Tijdlijn & Montage-Instructieblad: per zin wat er gebeurt, met preview."""
    sb = json.load(open(os.path.join(a.project, "storyboard.json")))
    words = sb.get("words") or json.load(open(os.path.join(a.project, "words.json")))
    total = duration(os.path.join(a.project, sb.get("video", "cut.mp4")))
    beats = sorted(sb["beats"], key=lambda b: b["start"])
    sents = sentences(words)
    bounds = [(s[0]["s"], (sents[i + 1][0]["s"] if i + 1 < len(sents) else total)) for i, s in enumerate(sents)]
    # preview: midden van de zin, of het eerste visuele effect erin
    times = []
    for (s0, s1) in bounds:
        vis = [b for b in beats if s0 <= b["start"] < s1 and b["type"] in VISUAL_TYPES + TEXT_TYPES]
        t = vis[0]["start"] + min(0.5, (vis[0]["end"] - vis[0]["start"]) * 0.5) if vis else (s0 + s1) / 2
        times.append(round(min(t, total - 0.05), 2))
    shutil.rmtree(os.path.join(a.project, "stills"), ignore_errors=True)
    run(["node", os.path.join(STUDIO, "render.mjs"), a.project, "--stills", ",".join(map(str, times))], cwd=STUDIO)
    hl = {re.sub(r"[^a-z0-9à-ÿ]", "", h.lower()) for h in sb.get("captions", {}).get("highlight", [])}
    zooms = sb.get("zooms", [])
    rows = []
    for (s0, s1), sent, t in zip(bounds, sents, times):
        png = os.path.join(a.project, "stills", f"still_{t}.png")
        jpg = png.replace(".png", ".jpg")
        run(["ffmpeg", "-y", "-v", "error", "-i", png, "-vf", "scale=300:-1", "-q:v", "4", jpg])
        img = base64.b64encode(open(jpg, "rb").read()).decode()
        inb = [b for b in beats if s0 <= b["start"] < s1]
        said = " ".join(
            f"<mark>{html.escape(w['w'])}</mark>" if re.sub(r"[^a-z0-9à-ÿ]", "", w["w"].lower()) in hl else html.escape(w["w"])
            for w in sent)
        cuts = [f"{z['start']:.1f}s {'punch-zoom' if z.get('ease') == 'punch' else 'langzame zoom'} → {int(round(z.get('to', 1.08) * 100))}%"
                for z in zooms if s0 <= z["start"] < s1]
        if s0 == bounds[0][0]:
            cuts.insert(0, "Hard begin, geen intro")
        texts = [f"{b['start']:.1f}s {html.escape(beat_text(b))} <small>({b.get('look', b['type'])})</small>"
                 for b in inb if b["type"] in TEXT_TYPES]
        vis = [f"{b['start']:.1f}–{b['end']:.1f}s {html.escape(DESCRIBE.get(b['type'], lambda _: b['type'])(b))}"
               for b in inb if b["type"] in VISUAL_TYPES]
        sfx = [f"{b['start']:.1f}s " + " + ".join(SFX_NL.get(x, x) for x in (b["sfx"] if isinstance(b["sfx"], list) else [b["sfx"]]))
               for b in inb if b.get("sfx")]
        notes = [html.escape(b["note"]) for b in inb if b.get("note")]
        cell = lambda xs: "<br>".join(xs) if xs else '<span class="dim">—</span>'
        rows.append(f"""<tr>
<td class="tc"><img src="data:image/jpeg;base64,{img}" alt=""><b>{s0:05.2f}</b><span class="dim">→ {s1:05.2f}</span></td>
<td><p class="said">{said}</p>{('<p class="why">' + ' · '.join(notes) + '</p>') if notes else ''}</td>
<td>{cell(cuts)}</td><td>{cell(texts)}</td><td>{cell(vis)}</td><td>{cell(sfx)}</td></tr>""")
    n_vis = sum(1 for b in beats if b["type"] in VISUAL_TYPES + TEXT_TYPES)
    page = f"""<title>Montageblad {html.escape(sb.get('title', ''))}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link href="https://fonts.googleapis.com/css2?family=DM+Mono&family=Inter:wght@400;600;900&display=swap" rel="stylesheet">
<style>
:root{{--bg:#111112;--panel:#1C1C1E;--ink:#FFFFFF;--muted:#A1A1A6;--accent:#FFC93C;--line:rgba(255,255,255,.12);color-scheme:dark}}
@media (prefers-color-scheme: light){{:root:not([data-theme="dark"]){{--bg:#FAFAF7;--panel:#F0EFEA;--ink:#111112;--muted:#5E5E63;--accent:#9A6E00;--line:rgba(0,0,0,.1);color-scheme:light}}}}
:root[data-theme="light"]{{--bg:#FAFAF7;--panel:#F0EFEA;--ink:#111112;--muted:#5E5E63;--accent:#9A6E00;--line:rgba(0,0,0,.1);color-scheme:light}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 Inter,system-ui,sans-serif;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}}
main{{max-width:1200px;margin:0 auto;padding-block:28px 64px}}
h1{{text-wrap:balance}}td.tc{{font-variant-numeric:tabular-nums}}
.k{{font-family:'DM Mono',monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}}
h1{{font-weight:900;letter-spacing:-.04em;font-size:clamp(32px,7vw,56px);line-height:1;margin:.25em 0 .35em}}
.sum{{display:flex;flex-wrap:wrap;gap:6px 18px;margin-bottom:22px}}
table{{width:100%;border-collapse:collapse}}th{{text-align:left;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:400;padding:8px 10px;border-bottom:1px solid var(--line)}}
td{{vertical-align:top;padding:14px 10px;border-bottom:1px solid var(--line);font-size:14px}}
td.tc{{width:110px;font-family:'DM Mono',monospace;font-size:12px}}td.tc img{{width:96px;border-radius:8px;display:block;margin-bottom:6px}}td.tc b{{display:block;color:var(--accent);font-weight:400}}
.said{{font-weight:600;font-size:16px;margin:0}}mark{{background:none;color:var(--accent)}}.why{{color:var(--muted);font-size:13px;margin:.4em 0 0}}
small,.dim{{color:var(--muted)}}
.next{{margin-top:28px;padding:18px;border-radius:14px;background:var(--panel)}}
@media (max-width:820px){{thead{{display:none}}tr{{display:grid;grid-template-columns:110px 1fr;border-bottom:1px solid var(--line);padding:12px 0}}td{{border:0;padding:4px 8px}}td.tc{{grid-row:span 5}}
td:nth-child(3)::before{{content:"Cuts & pacing";}}td:nth-child(4)::before{{content:"Tekst-overlays";}}td:nth-child(5)::before{{content:"B-roll & visueel";}}td:nth-child(6)::before{{content:"Audio FX";}}
td:nth-child(n+3)::before{{display:block;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}}}}
</style><main>
<div class="k">Tijdlijn &amp; montage-instructieblad · nog niet gerenderd</div>
<h1>{html.escape(sb.get('title', 'Video'))}</h1>
<div class="sum k"><span>Stijl: {html.escape(sb.get('style', 'grip'))}</span><span>Lengte: {total:.1f}s</span>
<span>{n_vis} effecten · gem. elke {total / max(1, n_vis):.1f}s iets nieuws</span><span>{len(zooms)} zooms</span></div>
<table><thead><tr><th>Tijdstip</th><th>Wat je zegt</th><th>Cuts &amp; pacing</th><th>Tekst-overlays (keywords)</th><th>B-roll &amp; visuele effecten</th><th>Audio FX</th></tr></thead>
<tbody>{''.join(rows)}</tbody></table>
<div class="next"><div class="k">Aanpassen?</div><p>Zeg het in één zin, bijvoorbeeld: “maak het moody”, “strakker knippen”, “grotere ondertitels”, “meer achtergronden” of “andere hook”.</p></div>
</main>"""
    out = os.path.join(a.project, "storyboard.html")
    open(out, "w").write(page)
    print("Klaar:", out)


def cmd_render(a):
    out = a.out or os.path.join(a.project, "final.mp4")
    extra = ["--draft"] if a.draft else []
    run(["node", os.path.join(STUDIO, "render.mjs"), os.path.abspath(a.project), os.path.abspath(out), *extra], cwd=STUDIO)
    if not a.draft:
        register_project(a.project)
        print("Beelden en iconen geregistreerd in kennis/gebruikte-beelden.json")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("prepare"); c.add_argument("input"); c.add_argument("project")
    c.add_argument("--mirror", action="store_true", help="beeld spiegelen (standaard uit; alleen op verzoek)")
    c.add_argument("--gap", type=float, default=0.08, help="pauzes langer dan dit (s) worden geknipt; kleiner = strakker")
    c.add_argument("--keep-pauses", action="store_true", help="niets wegknippen (poses, muziekmomenten)")
    c.add_argument("--model", default="medium", help="Whisper-model: medium (standaard, nauwkeurig) of small (sneller)")
    c.add_argument("--lang", default="nl"); c.set_defaults(fn=cmd_prepare)
    c = sub.add_parser("layout", help="gezicht volgen voor automatische plaatsing"); c.add_argument("project"); c.set_defaults(fn=cmd_layout)
    c = sub.add_parser("beats", help="beat van de muziek vinden"); c.add_argument("project"); c.set_defaults(fn=cmd_beats)
    c = sub.add_parser("combine", help="takes achter elkaar tot één project")
    c.add_argument("project"); c.add_argument("takes", nargs="+"); c.set_defaults(fn=cmd_combine)
    c = sub.add_parser("fixwords", help="tekst van words.json verbeteren")
    c.add_argument("project"); c.add_argument("text"); c.set_defaults(fn=cmd_fixwords)
    c = sub.add_parser("assets"); c.add_argument("project"); c.set_defaults(fn=cmd_assets)
    c = sub.add_parser("person"); c.add_argument("project")
    c.add_argument("--model", default="isnet-general-use", help="isnet-general-use (standaard), birefnet-general-lite (beste, traag), u2net_human_seg (snel)"); c.set_defaults(fn=cmd_person)
    c = sub.add_parser("storyboard"); c.add_argument("project"); c.set_defaults(fn=cmd_storyboard)
    c = sub.add_parser("render"); c.add_argument("project"); c.add_argument("--out")
    c.add_argument("--draft", action="store_true"); c.set_defaults(fn=cmd_render)
    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
