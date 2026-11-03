# TikTok-editor

Ruwe video erin, bewerkte TikTok eruit. Claude luistert naar wat je zegt en zet effecten
op je woorden: teksten en 3D-iconen die oppoppen, passende foto's, ondertitels met
kernwoorden, zooms en geluidseffecten. Eerst een storyboard, daarna renderen, aanpassen met één zin.

```
ruw.mp4 ──prepare──▶ cut.mp4 + words.json ──(Claude)──▶ storyboard.json
        ──assets──▶ iconen/foto's ──storyboard──▶ storyboard.html (akkoord?)
        ──render──▶ final.mp4
```

## Onderdelen

- `tt.py` – pipeline: `prepare`, `assets`, `person` (cutout, alleen voor `scene`-cutout/`title` behind), `storyboard` (tijdlijn & montage-instructieblad), `render`
- `studio/` – Remotion-project (React) dat de video tekent; `render.mjs` rendert een projectmap
- `studio/src/styles.ts` – stijlpresets `wesbuilt` (standaard, huisstijl), `grip`, `editorial`, `moody`, `pop`
- `studio/public/sfx/` – zelfgemaakte geluidseffecten: pop, whoosh, ding, click, boom
- `studio/public/fonts/` – Inter, Anton, Instrument Serif, DM Mono (allemaal OFL)
- `../.claude/skills/tiktok-editor/SKILL.md` – werkwijze en effectregels voor Claude
- `kennis/onderzoek.md` – onderzoek naar hoe top-creators editen (met bronnen)
- `kennis/lessen.md` – feedback van Wes, wordt na elke video aangevuld

## Installatie

```bash
cd tiktok-editor/studio && npm install
pip install faster-whisper            # spraak → woorden met tijden
pip install "rembg[cpu]"              # alleen voor tekst-achter-de-persoon
```

## storyboard.json

Tijden in seconden op de tijdlijn van `cut.mp4` (= tijden in `words.json`).

```json
{
  "title": "Van nul naar grip — dag 10",
  "style": "grip",
  "video": "cut.mp4",
  "captions": { "y": 1290, "size": 74, "highlight": ["grip", "pad"] },
  "beats": [
    { "type": "words", "start": 0, "end": 1.6, "y": 320, "sfx": "whoosh",
      "lines": [ { "text": "VAN NUL", "font": "sans", "size": 165, "at": 0 },
                 { "text": "NAAR GRIP", "font": "sans", "size": 165, "at": 0.72, "color": "#FFC93C" } ] },
    { "type": "pop",   "start": 5.5, "end": 6.4, "text": "Strong", "look": "sticker", "x": 700, "y": 400, "sfx": "pop" },
    { "type": "emoji", "start": 3.0, "end": 4.4, "name": "fire", "x": 790, "y": 470, "size": 270, "sfx": "pop" },
    { "type": "image", "start": 9.6, "end": 11.3, "query": "smartphone", "pick": 4, "label": "Geen afleiding", "sfx": "whoosh" }
  ],
  "zooms": [ { "start": 7.56, "end": 8.3, "to": 1.14, "ease": "punch" } ]
}
```

### Beat-types

| type | wat | belangrijkste velden |
|---|---|---|
| `words` | grote tekst over beeld, regels komen op hun eigen moment binnen | `lines[] {text, font, size, at, color}`, `y` |
| `pop` | tekst die oppopt | `text`, `look`: `sticker` / `big` (+ `sub`) / `outline` / `label` / `stamp` (+ `color`), `x`, `y`, `rotate`, `size` |
| `emoji` | 3D-icoon (Microsoft Fluent Emoji, MIT) | `name` (Engels, bv. "red heart"), `x`, `y`, `size` |
| `image` | foto-kaart (Openverse, CC0/publiek domein) | `query` + `pick`, of eigen `src`; `label`, `x`, `y`, `w`, `rotate` |
| `prompt` | kaartje dat zichzelf typt, daarna vinkje | `text`, `typeFrom`, `typeTo`, `doneAt`, `doneText` |
| `follow` | profielkaart "Volgen → Volgend" | `handle`, `sub`, `toggleAt` |
| `comment` | "Reageer X"-kop + reactie | `headline`, `comment` |
| `scene` | achtergrond vervangen: jij uitgeknipt (`mode: "cutout"`, eerst `tt.py person`) of in een kader (`"pip"`) vóór een beeld | `query`/`pick` of `src`, `scale`, `anchor`, `dim` |
| `cutaway` | beeld schermvullend (0,6–1,5 s), jij blijft hoorbaar | `query`/`pick` of `src`, `label` |
| `hook` | vaste hook-titel bovenin, `*woord*` = geel accent | `text`, `sub`, `y` |
| `chart` | geanimeerde staafjes/lijst bij getallen | `title`, `rows[] {label, value}`, `unit`, `highlight[]`, `mode` |
| `meter` | batterij/tank die live leegloopt of vol raakt | `kind` (`battery`/`tank`), `levels[] {at, value 0..1}`, `label` |
| `persona` | jij als kijker: close-up, scheef, label | `label` (standaard "jij") |
| `title` | titel, optioneel **achter** de persoon (`behind: true`, eerst `tt.py person`) | als `words` + `behind`, `background: "solid"` |

Elke beat kan `sfx` (`pop`, `whoosh`, `ding`, `click`, `boom`, `riser`, of een lijst zoals `["riser", "boom"]`) en `note` (uitleg in het storyboard) hebben.
Lettertypes: `sans` (Inter Black), `condensed` (Anton), `serif`, `italic`, `mono`.

## Veilige zones (1080×1920)

Boven y=230 zit de TikTok-zoekbalk, onder y=1400 de caption/gebruikersnaam en rechts van x=900
de knoppen. Effecten blijven daarbinnen; ondertitels staan standaard op y=1290.

## Licenties van beelden

`tt.py assets` schrijft de herkomst van elke foto naar `credits.json`. Alleen CC0 en
publiek domein worden gebruikt, dus naamsvermelding is niet verplicht.
