#!/usr/bin/env python3
"""Maak TikTok-ondertitels in de 'talking head'-stijl als .ass-bestand.

Stijl: 2-3 woorden per regel, HOOFDLETTERS, wit condensed bold font met
zachte schaduw, het woord dat op dat moment wordt uitgesproken krijgt een
roze/rode box (#F82952). Optioneel een titelbalk bovenin voor de eerste
seconden (serie-titel + onderwerp).

Invoer (een van beide):
  --words words.json   lijst van {"word": str, "start": float, "end": float}
                       (bijv. uit faster-whisper met word_timestamps=True)
  --srt captions.srt   gewone SRT; de tijd per regel wordt evenredig over
                       de woorden verdeeld (minder precies)

Gebruik:
  python3 captions_ass.py --words words.json -o subs.ass \
      --title "DE 75 KG BLAUWDRUK | DAG 6 |\\NSCHRAP GEEN KOOLHYDRATEN"
  ffmpeg -i edit.mp4 -vf "ass=subs.ass" -c:a copy final.mp4
"""
import argparse
import json
import re

HIGHLIGHT = "&H005229F8"  # ASS is &HAABBGGRR -> #F82952
WHITE = "&H00FFFFFF"
SHADOW = "&H80000000"
INVISIBLE = "&HFF000000"

HEADER = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Word,{font},{size},{white},{white},{shadow},{shadow},-1,0,0,0,100,100,1,0,1,0,3,2,60,60,{marginv},1
Style: Box,{font},{size},{invisible},{invisible},{hl},{invisible},-1,0,0,0,100,100,1,0,3,10,0,2,60,60,{marginv},1
Style: Title,{font},{tsize},{white},{white},{shadow},{shadow},-1,0,0,0,100,100,1,0,1,0,3,8,60,60,280,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def ts(t):
    t = max(t, 0)
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def load_words(args):
    if args.words:
        with open(args.words, encoding="utf-8") as f:
            data = json.load(f)
        return [
            {"word": w["word"].strip(), "start": float(w["start"]), "end": float(w["end"])}
            for w in data
            if w["word"].strip()
        ]
    words = []
    with open(args.srt, encoding="utf-8") as f:
        blocks = re.split(r"\n\s*\n", f.read().strip())
    for block in blocks:
        lines = block.strip().splitlines()
        timing = next((l for l in lines if "-->" in l), None)
        if not timing:
            continue
        a, b = [x.strip().replace(",", ".") for x in timing.split("-->")]
        start, end = (sum(float(p) * 60 ** i for i, p in enumerate(reversed(x.split(":")))) for x in (a, b))
        text = " ".join(lines[lines.index(timing) + 1:])
        parts = text.split()
        step = (end - start) / max(len(parts), 1)
        for i, p in enumerate(parts):
            words.append({"word": p, "start": start + i * step, "end": start + (i + 1) * step})
    return words


def group_words(words, max_words, max_chars, max_gap):
    groups, cur = [], []
    for w in words:
        too_long = len(" ".join(x["word"] for x in cur + [w])) > max_chars
        gap = cur and w["start"] - cur[-1]["end"] > max_gap
        ends_sentence = cur and re.search(r"[.!?]$", cur[-1]["word"])
        if cur and (len(cur) >= max_words or too_long or gap or ends_sentence):
            groups.append(cur)
            cur = []
        cur.append(w)
    if cur:
        groups.append(cur)
    return groups


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--words")
    src.add_argument("--srt")
    p.add_argument("-o", "--out", required=True)
    p.add_argument("--font", default="Bebas Neue")
    p.add_argument("--size", type=int, default=78)
    p.add_argument("--marginv", type=int, default=500, help="afstand van onderkant (500 = ~74%% hoogte)")
    p.add_argument("--max-words", type=int, default=3)
    p.add_argument("--max-chars", type=int, default=24)
    p.add_argument("--max-gap", type=float, default=0.6)
    p.add_argument("--title", help="titeltekst bovenin; \\N voor nieuwe regel")
    p.add_argument("--title-size", type=int, default=86)
    p.add_argument("--title-seconds", type=float, default=3.9)
    args = p.parse_args()

    words = load_words(args)
    groups = group_words(words, args.max_words, args.max_chars, args.max_gap)

    out = [HEADER.format(font=args.font, size=args.size, tsize=args.title_size, white=WHITE,
                         shadow=SHADOW, hl=HIGHLIGHT, invisible=INVISIBLE, marginv=args.marginv)]
    if args.title:
        out.append(f"Dialogue: 2,{ts(0)},{ts(args.title_seconds)},Title,,0,0,0,,{args.title.upper()}\n")

    for gi, g in enumerate(groups):
        # Regel blijft staan tot de volgende regel begint (geen flikkering tussen regels).
        g_end = groups[gi + 1][0]["start"] if gi + 1 < len(groups) else g[-1]["end"] + 0.3
        texts = [w["word"].upper() for w in g]
        out.append(f"Dialogue: 1,{ts(g[0]['start'])},{ts(g_end)},Word,,0,0,0,,{' '.join(texts)}\n")
        for i, w in enumerate(g):
            w_end = g[i + 1]["start"] if i + 1 < len(g) else g_end
            # Box-laag: alleen het actieve woord krijgt een zichtbare box.
            parts = [
                ("{\\3a&H00&}" if j == i else "{\\3a&HFF&}") + t
                for j, t in enumerate(texts)
            ]
            out.append(f"Dialogue: 0,{ts(w['start'])},{ts(w_end)},Box,,0,0,0,,{{\\fad(40,40)}}{' '.join(parts)}\n")

    with open(args.out, "w", encoding="utf-8") as f:
        f.writelines(out)
    print(f"{len(words)} woorden, {len(groups)} regels -> {args.out}")


if __name__ == "__main__":
    main()
