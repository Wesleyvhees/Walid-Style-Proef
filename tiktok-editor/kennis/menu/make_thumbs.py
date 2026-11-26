# Kleine voorbeeldbeelden per effectcode (voor het keuzemenu): kennis/menu/thumbs/<CODE>.jpg
import os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
S = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/-home-user-Walid-Style-Proef/388aed99-c647-56db-a8d8-2f724b621cca/scratchpad/projects"
src = open(os.path.join(HERE, "build_menu.py")).read()
out = os.path.join(HERE, "thumbs"); os.makedirs(out, exist_ok=True)
n = 0
for code, pic in re.findall(r'\("([A-Z]\d+)","[^"]*","[^"]*","[^"]*","([^"]+)"\)', src):
    p = os.path.join(S, pic)
    if os.path.exists(p):
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", p, "-vf", "scale=180:-2", "-q:v", "6", os.path.join(out, f"{code}.jpg")], check=True)
        n += 1
print(n, "thumbs")
