---
name: talking-head-editing
description: "Editing-stijl voor korte talking-head video's (TikTok, Reels, Shorts) in de stijl van de '75 KG BLAUWDRUK'-serie: jump-cuts zonder pauzes, wisselende punch-in zooms, 2-3 woord-ondertitels in hoofdletters met een roze box achter het gesproken woord, een serie-titel bovenin als hook, en een 'volg voor dag X'-afsluiter. Gebruik deze skill wanneer de gebruiker vraagt om een video te editen, monteren, knippen of ondertitelen in 'deze stijl', 'Walid-stijl', 'talking head', 'praatvideo', 'TikTok-edit', 'captions met highlight', 'jump cuts', 'dag X serie', of wanneer een script of opname voor een korte praatvideo moet worden omgezet naar een montageplan. Ook voor het schrijven van scripts die in dit format passen."
metadata:
  version: 1.0.0
  bron: "Analyse van een 32s TikTok (1080x1920, DE 75 KG BLAUWDRUK | DAG 6), oktober 2026"
---

# Talking-head editing-stijl

Je bent editor van korte praatvideo's in één vaste, herkenbare stijl. Elke video is een aflevering uit een genummerde serie: één persoon praat recht in de camera, alles wat niet gesproken wordt is eruit geknipt, en de ondertitels dragen de video ook zonder geluid.

Gebruik deze skill om (a) een montageplan of script te maken, (b) uit te leggen hoe je dit in CapCut/Premiere bouwt, of (c) de montage zelf te maken met de scripts in `scripts/`.

---

## 1. Analyse van de referentievideo

| Kenmerk | Gemeten / gezien |
|---|---|
| Formaat | 1080x1920 (9:16), 32,5 s |
| Opname | Selfie-camera, handheld, binnen, avond. Zittend op bank, effen grijsgroene muur. Warm, laag licht, geen ring light. Pet + zwarte hoodie: herkenbare 'outfit' per serie |
| Cuts | ~22 jump-cuts in 32 s → **gemiddeld 1 cut per 1,4 s** (spreiding 0,4-2,5 s) |
| Pauzes | Geen enkele stilte > 0,12 s. Ademhalingen en "ehh" zijn allemaal weggeknipt |
| Framing per cut | Wisselt: normaal ↔ ingezoomd (punch-in ~110-120%) en soms licht verschoven/gekanteld. Maskeert de jump-cut en houdt het beeld in beweging |
| Kleur | Geen zichtbare grading; natuurlijk telefoonbeeld |
| Audio | Alleen stem, genormaliseerd naar ~-14 LUFS. Geen duidelijke muziek of geluidseffecten |
| Lengte | 30-35 s, ±75 gesproken woorden |

### Tekstlagen

**Titel (hook), bovenin, 0 tot ~3,9 s**
- `DE 75 KG BLAUWDRUK | DAG 6 |` + nieuwe regel `SCHRAP GEEN KOOLHYDRATEN 🍞🥔`
- Opbouw: **[serienaam] | DAG [n] | [stelling van vandaag] [1-2 emoji]**
- Wit, condensed bold sans (Bebas Neue / Anton-achtig), HOOFDLETTERS, zachte zwarte schaduw, geen box
- Gecentreerd op ~15-22% van de hoogte (boven het hoofd, onder de TikTok-UI)
- Verdwijnt bij de eerste cut na ~4 s

**Ondertitels, gecentreerd op ~72% van de hoogte (borsthoogte)**
- **2-3 woorden per keer**, max. ~20 tekens, HOOFDLETTERS, zelfde condensed font, wit met schaduw
- **Het woord dat nu gesproken wordt krijgt een box** in roze-rood **#F82952** met afgeronde hoeken; de tekst blijft wit
- Box springt per woord door (karaoke-effect) met een korte fade (~40 ms)
- Leestekens blijven staan aan het einde van een zin (`HERSTEL.`, `WERKEN.`)
- Lange samengestelde woorden mogen alleen staan (`TRAININGSINTENSITEIT IN`)

### Gebaren en energie
Geen B-roll, geen inzetbeelden: de beweging komt van de spreker zelf. Wijzen naar de camera bij "jij", tikken op het hoofd bij "brein", biceps tonen bij "spieren", vingers tellen bij de afsluiter. Elke cut begint midden in een zin, met hoge energie.

---

## 2. Scriptstructuur (≈30 s)

| Tijd | Blok | Voorbeeld uit de referentie |
|---|---|---|
| 0-4 s | **Hook-vraag naar de kijker** (+ titel in beeld) | "Voel jij je ook slap, prikkelbaar en futloos als jij gezond gaat eten?" |
| 4-8 s | **Directe instructie** | "Stop dan direct met het schrappen van je koolhydraten als jij je fysiek wilt verbeteren." |
| 8-13 s | **Persoonlijke ervaring** (geloofwaardigheid) | "Zelf heb ik ook keto geprobeerd. Dat snelle resultaat in het begin is puur vocht." |
| 13-25 s | **Uitleg: waarom** (1 mechanisme, simpel) | "Koolhydraten zijn de primaire brandstof voor je brein en je spieren tijdens krachttraining. Zonder stort je intensiteit in." |
| 25-30 s | **Herformulering als advies** | "Vermijd ze niet, maar laat ze juist voor je werken: gebruik ze als brandstof voor een beter herstel." |
| 30-32 s | **CTA voor de serie** | "Volg voor dag 7" (met vingers tellen) |

Schrijfregels: tweede persoon ("jij/je"), korte zinnen, spreektaal, één onderwerp per aflevering, de titelstelling moet de hookvraag beantwoorden.

> Gaat een video over voeding of gezondheid: schrijf geen medische claims. Houd het bij eigen ervaring en algemene uitleg (zie ook de EU-regels in `marketing-psychology`).

---

## 3. Opnemen
1. Telefoon op ooghoogte of iets eronder, 1080x1920, 30 fps is genoeg (de referentie is 120 fps maar dat zie je niet).
2. Dezelfde plek en outfit voor elke aflevering → herkenbaarheid.
3. Spreek het script in korte stukken; herhaal een zin gewoon opnieuw als hij fout gaat. De slechte take wordt eruit geknipt.
4. Laat een kleine pauze tussen zinnen: dan vindt de automatische stilte-detectie de cuts makkelijk.

---

## 4. Monteren in CapCut (handmatig)
1. **Knippen:** zet de clip op de tijdlijn → *Edit → Remove silences/Auto cut* (of handmatig: elke pauze, ademhaling, fout en "ehh" eruit). Doel: geen gaten > 0,1 s.
2. **Punch-ins:** selecteer elk tweede fragment → *Basic → Scale 112-118%*, positie iets omhoog zodat het gezicht centraal blijft. Af en toe een fragment licht kantelen (1-3°) voor variatie.
3. **Ondertitels:** *Text → Auto captions* → kies een template met **woord-highlight** (bijv. 'Highlight'/'Karaoke'). Stel in:
   - Font: condensed bold (Bebas Neue, Anton, "The Bold Font")
   - HOOFDLETTERS, wit, schaduw aan, outline uit
   - Highlight-stijl: **achtergrondbox**, kleur **#F82952**, afgeronde hoeken
   - Max. 3 woorden per regel; positie Y ≈ -30% (onder het gezicht, boven de onderste UI)
   - Corrigeer spelfouten en zet leestekens alleen aan zinseinde
4. **Titel:** tekstlaag `[SERIE] | DAG [n] |` / `[STELLING] [emoji]`, zelfde font, iets groter dan de captions, bovenin, van 0 s tot de eerste cut rond 4 s.
5. **Audio:** *Enhance voice* aan, *Normalize loudness* aan. Geen muziek (of hooguit zeer zacht, -25 dB onder de stem).
6. **Export:** 1080p, 30 fps, bitrate 'Aanbevolen'.

---

## 5. Automatisch monteren met de scripts

Vereist: `ffmpeg`, Python 3. Font: installeer **Bebas Neue** (Google Fonts) op het systeem; anders valt libass terug op een breder font en lopen titels over meer regels.

```bash
SK=.claude/skills/talking-head-editing/scripts

# 1. Stiltes eruit + afwisselend 100% / 112% zoom
python3 $SK/jumpcut.py raw.mp4 edit.mp4            # opties: --noise -32 --min-silence 0.2 --zoom 1.15 --face-y 0.35

# 2. Woord-timestamps van de GEKNIPTE video maken (op een machine met internet, eenmalig model downloaden)
pip install faster-whisper
python3 - <<'EOF'
import json
from faster_whisper import WhisperModel
segs, _ = WhisperModel("small").transcribe("edit.mp4", language="nl", word_timestamps=True)
json.dump([{"word": w.word, "start": w.start, "end": w.end} for s in segs for w in s.words],
          open("words.json", "w"), ensure_ascii=False)
EOF
#    (alternatief: exporteer een .srt uit CapCut en gebruik --srt captions.srt)

# 3. Ondertitels + titel als .ass
python3 $SK/captions_ass.py --words words.json -o subs.ass \
  --title "DE 75 KG BLAUWDRUK | DAG 7 |\NSCHRAP GEEN KOOLHYDRATEN"

# 4. Inbranden
ffmpeg -i edit.mp4 -vf "ass=subs.ass" -c:v libx264 -crf 18 -c:a aac -af loudnorm=I=-14 final.mp4
```

Controleer daarna altijd met een paar stilstaande beelden (`ffmpeg -ss 2 -i final.mp4 -frames:v 1 check.png`): staat de box achter het juiste woord, valt de tekst niet weg achter de TikTok-UI (rechts en onderaan), en wordt er geen woord afgekapt bij een cut. Bekende beperking: libass tekent de highlight-box met rechte hoeken; voor afgeronde hoeken gebruik je CapCut.

---

## 6. Checklist voor publiceren
- [ ] Hook-vraag in de eerste 2 s, titel met DAG-nummer zichtbaar t/m ~4 s
- [ ] Geen pauze > 0,1 s; gemiddeld een cut per 1-2 s
- [ ] Elk tweede fragment ingezoomd
- [ ] Captions max. 3 woorden, actief woord in #F82952-box, nergens onder de UI
- [ ] Eén onderwerp, één mechanisme, advies in de vorm "doe X juist zo"
- [ ] Afsluiter "Volg voor dag [n+1]"
- [ ] 30-35 s, stem rond -14 LUFS
