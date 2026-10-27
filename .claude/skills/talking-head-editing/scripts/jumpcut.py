#!/usr/bin/env python3
"""Knip stiltes weg en wissel elke cut tussen normale framing en een punch-in.

Dit is de basis van de 'talking head'-stijl: geen ademhalingen of pauzes,
een cut elke 1-2,5 seconde, en om de cut minder hard te laten voelen schaalt
elk tweede fragment 100% <-> ~112% (licht verschoven naar het gezicht).

Gebruik:
  python3 jumpcut.py raw.mp4 edit.mp4
  python3 jumpcut.py raw.mp4 edit.mp4 --noise -32 --min-silence 0.2 --zoom 1.15
Vereist: ffmpeg/ffprobe in PATH.
"""
import argparse
import re
import subprocess


def detect_silences(path, noise_db, min_silence):
    res = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", path, "-af", f"silencedetect=n={noise_db}dB:d={min_silence}", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", res.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", res.stderr)]
    return list(zip(starts, ends + [None] * (len(starts) - len(ends))))


def duration(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], text=True
    )
    return float(out)


def keep_segments(silences, total, pad, min_len):
    segs, cur = [], 0.0
    for s, e in silences:
        e = total if e is None else e
        if s - cur > 0:
            segs.append((max(cur - pad, 0), min(s + pad, total)))
        cur = e
    if total - cur > 0:
        segs.append((max(cur - pad, 0), total))
    return [(a, b) for a, b in segs if b - a >= min_len]


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("input")
    p.add_argument("output")
    p.add_argument("--noise", type=float, default=-35, help="stiltedrempel in dB")
    p.add_argument("--min-silence", type=float, default=0.25, help="kortere pauzes blijven staan")
    p.add_argument("--pad", type=float, default=0.05, help="marge rond spraak zodat woorden niet afgekapt worden")
    p.add_argument("--min-len", type=float, default=0.3)
    p.add_argument("--zoom", type=float, default=1.12, help="schaal van de punch-in fragmenten")
    p.add_argument("--face-y", type=float, default=0.35, help="verticale focus van de zoom (0=boven, 1=onder)")
    args = p.parse_args()

    total = duration(args.input)
    segs = keep_segments(detect_silences(args.input, args.noise, args.min_silence), total, args.pad, args.min_len)
    if not segs:
        raise SystemExit("Geen spraak gevonden; verlaag --noise.")

    parts = []
    for i, (a, b) in enumerate(segs):
        v = f"[0:v]trim={a:.3f}:{b:.3f},setpts=PTS-STARTPTS"
        if i % 2:
            z = args.zoom
            v += (f",scale=iw*{z}:ih*{z},crop=iw/{z}:ih/{z}:(iw-iw/{z})/2:(ih-ih/{z})*{args.face_y}")
        parts.append(f"{v},scale=1080:1920,setsar=1,fps=30[v{i}];")
        parts.append(f"[0:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,"
                     f"afade=t=out:st={max(b - a - 0.01, 0):.3f}:d=0.01[a{i}];")
    concat = "".join(f"[v{i}][a{i}]" for i in range(len(segs)))
    graph = "".join(parts) + f"{concat}concat=n={len(segs)}:v=1:a=1[v][a]"

    subprocess.run(
        ["ffmpeg", "-hide_banner", "-y", "-i", args.input, "-filter_complex", graph, "-map", "[v]", "-map", "[a]",
         "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "aac", "-b:a", "192k", args.output],
        check=True,
    )
    kept = sum(b - a for a, b in segs)
    print(f"{len(segs)} fragmenten, {total:.1f}s -> {kept:.1f}s ({len(segs) - 1} cuts)")


if __name__ == "__main__":
    main()
