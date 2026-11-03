---
name: tiktok-editor
description: Bewerkt ruwe TikTok/Reels-video's automatisch op basis van wat er gezegd wordt - mislukte takes en stiltes eruit, teksten, 3D-iconen en foto's die oppoppen bij de woorden, ondertitels met kernwoorden, zooms en geluidseffecten. Eerst een storyboard ter goedkeuring, daarna renderen; aanpassen met één zin ("maak het moody", "grotere ondertitels", "minder effecten"). Gebruik bij "bewerk <video> met tiktok-editor", "edit mijn TikTok", "maak hier een TikTok van" of een video in de Drive-map "Tiktok Rauw".
---

# TikTok-editor

Systeem in `tiktok-editor/` (Python-pipeline `tt.py` + Remotion-renderer in `studio/`).
Lees `tiktok-editor/README.md` voor het volledige storyboard-formaat.

## Werkwijze

1. **Klaarzetten** (eenmalig per sessie):
   `cd tiktok-editor/studio && npm install` en `pip install faster-whisper rembg[cpu]` (rembg alleen nodig voor cutouts).
   Netwerk nodig: drive.google.com, drive.usercontent.google.com, huggingface.co, raw.githubusercontent.com, api.openverse.org.
2. **Video ophalen**: zoek met de Google Drive-connector (`search_files`, map "Tiktok Rauw"),
   download naar de scratchpad:
   `curl -L -o ruw.mp4 "https://drive.usercontent.google.com/download?id=<ID>&export=download&confirm=t"`
3. **Voorbereiden**: `python3 tt.py prepare ruw.mp4 <project> --mirror`
   (`--mirror` bij selfie-opnames: tekst op kleding wordt weer leesbaar). Haalt mislukte takes
   (herhaalde zinnen, laatste take blijft) en stiltes eruit, maakt `cut.mp4`, `words.json`, `transcript.txt`.
   Controleer `words.json` op samengeplakte woorden en splits ze zo nodig.
4. **Analyseren en storyboard schrijven**: lees `transcript.txt` + `words.json`, bepaal per zin wat
   de kijker moet voelen/onthouden en schrijf `<project>/storyboard.json` (regels hieronder).
   Geef elke beat een `note` met het waarom.
5. **Beelden ophalen**: `python3 tt.py assets <project>`. Bekijk bij elke foto de
   `assets/kandidaten/<zoekterm>/sheet.jpg` en zet `"pick": n` op de beste; draai `assets` opnieuw.
   Geen goede foto? Andere zoekterm (Engels werkt het best) of vervang door een emoji-beat.
6. **Controleren**: `node studio/render.mjs <project> --stills 1.2,5,9` en bekijk de stills
   (overlap met gezicht, leesbaarheid, safe zones).
7. **Storyboard tonen**: `python3 tt.py storyboard <project>` en publiceer `storyboard.html` als Artifact,
   zodat de gebruiker het op de telefoon kan bekijken. Vraag om akkoord of één zin feedback.
   (Wil de gebruiker meteen resultaat, render dan direct en stuur het storyboard mee.)
8. **Renderen**: `python3 tt.py render <project> --out "<project>/<titel> - bewerkt.mp4"`,
   controleer een contactsheet van de output, stuur het bestand met SendUserFile.
9. **Feedback in één zin** → pas `storyboard.json` aan → stills → opnieuw renderen.

## Effectregels (wat bij welke tekst past)

| In de tekst | Effect |
|---|---|
| Eerste 2 s (hook / titel / serie) | `words` met de kern in 2 regels, `label` met serie/dag, `whoosh` |
| Emotie of ding dat je kunt zien (liefde, vuur, geld, tijd, hersenen…) | `emoji` (Fluent 3D, Engelse naam zoals "red heart", "fire", "money bag", "brain", "rocket"), `pop` |
| Kernwoord | `pop` look `sticker` (max 2 woorden) en het woord in `captions.highlight` |
| Punchline / climax | `pop` look `big` + `boom` + punch-zoom 1.12–1.15 |
| Concreet onderwerp (telefoon, sportschool, geld, natuur) | `image` met zoekterm + kort `label` (2–3 woorden) |
| Les / conclusie / tip | `prompt`-kaartje dat typt, of `image` + `label`; `ding` bij afronding |
| Opsomming ("ten eerste…") | `pop` look `label` per punt, `click` |
| Call-to-action ("volg", "comment") | `follow`- of `comment`-kaart |
| Rustig stuk | langzame zoom (`ease: "in"`, 1.04–1.07) |

- Om de 1,5–3 s iets nieuws in beeld (kijktijd), maar nooit twee effecten tegelijk op dezelfde plek.
- Max één punch-zoom per 1,5 s; wissel punch en langzaam af.
- Alles boven y≈1000 of naast het gezicht; onder y=1400 en rechts van x=900 blijft leeg (TikTok-UI).
- Ondertitels standaard op y≈1290; pas aan als ze over de mond vallen.
- Tekst-achter-de-persoon (`title` met `behind: true`, vereist `tt.py person`) is optioneel:
  alleen gebruiken als de gebruiker erom vraagt of het echt iets toevoegt.
- Eigen stijl: niet de look van andermans video's kopiëren. Presets: `grip` (standaard), `editorial`, `moody`, `pop`.

## Eén-zin-feedback vertalen

| Zin | Wijziging |
|---|---|
| "maak het moody / donkerder" | `style: "moody"` |
| "rustiger / chiquer" | `style: "editorial"`, minder `pop`/`emoji` |
| "grotere ondertitels" | `captions.size` +20–30 |
| "strakker knippen" | `prepare` opnieuw met `--gap 0.2` |
| "minder effecten" | elke tweede emoji/pop eruit, geen `sfx` behalve `boom`/`ding` |
| "andere hook" | eerste `words`-beat herschrijven |
| "geen geluidjes" | alle `sfx` weg |
