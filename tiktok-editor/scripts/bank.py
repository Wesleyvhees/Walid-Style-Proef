import json, re, sys
HEAD = {
"slimmer20": "# Scripts Slimmer eten, drinken en trainen 2.0 (klaar om op te nemen)\n",
"blauwdruk75": "# Scripts De 75 kilo blauwdruk (klaar om op te nemen)\n",
}
INTRO = """
Herschreven 2026-11-09 volgens de vaste regels (SKILL.md "Korte scripts: 3 seconden oorlog" + "Waarheid gaat vóór kort"):
15–20 s (±40–55 woorden, Wes: "75 kilo blauwdruk en slimmer eten ongeveer 15 tot 20 seconden"), eerste zin max 6 woorden met
de uitkomst of een getal, zinnen max 8 woorden, dubbele hook (In beeld ≠ gesproken), actie vanaf frame 1, antwoord zo laat
mogelijk, een boodschap, loop (laatste + eerste zin = één zin), "een" nooit "één", niets absoluuts dat niet klopt.
Het "waarom" en de bron gaan naar de beschrijving. Status: klaar → opgenomen → geplaatst.
"""
def render(serie, items):
    out = [HEAD[serie], INTRO]
    for it in items:
        out.append(f"\n## Dag {it['dag']} · {it['titel']} · {it.get('status', 'klaar')}\nTrefwoord: {it['kw']}\n```\n" + "\n".join(it['tekst']) + "\n```\n")
        out.append(f"In beeld: \"{it['beeld']}\"  \nFrame 1: {it['frame']}  \nLoop: \"{it['loop']}\"  \nFeiten: {it['feiten']}\n")
        if it.get('extra'): out.append(it['extra'] + "\n")
    return "".join(out)
def check(items):
    for it in items:
        words = sum(len(l.split()) for l in it['tekst'])
        sents = [s.strip() for l in it['tekst'] for s in re.split(r'(?<=[.?!])\s+', l) if s.strip()]
        long = [s for s in sents if len(s.split()) > 8]
        first = len(sents[0].split())
        flag = ("één" in " ".join(it['tekst'])) or ("Eén" in " ".join(it['tekst']))
        print(f"dag {it['dag']}: {words} w, eerste {first}, >8: {long}, één:{flag}")
if __name__ == "__main__":
    serie, src, dst = sys.argv[1:4]
    items = json.load(open(src))
    check(items)
    open(dst, "w").write(render(serie, items))
