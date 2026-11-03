# TikTok-editor

Bewerkt ruwe TikTok-video's van Google Drive: stiltes eruit, effecten die op
de gesproken tekst vallen, een hook-overlay bovenin, en de onderkant vrij voor
de ondertiteling die je zelf in TikTok toevoegt.

## Benodigd

- `ffmpeg` (staat in de cloudomgeving)
- `pip install faster-whisper` (spraak → tekst met woordtijden)
- Netwerktoegang tot `drive.usercontent.google.com` (video downloaden) en
  `huggingface.co` (Whisper-model). Instellen bij de omgeving → Network access.

## Werkwijze (voor Claude)

1. **Video ophalen**: zoek de video met de Google Drive-connector (`search_files`,
   titel bevat bv. "grip") en download hem naar de scratchpad:
   `curl -L -o in.mp4 "https://drive.usercontent.google.com/download?id=<ID>&export=download&confirm=t"`
   (lukt dat niet omdat het bestand privé is: vraag de gebruiker de video op
   "iedereen met de link" te zetten).
2. **Stiltes knippen**: `python3 editor.py cut in.mp4 werk/`
   - te agressief? `--noise -40 --min-silence 0.5`; te los? `--noise -30 --min-silence 0.25`
3. **Transcriberen**: `python3 editor.py transcribe werk/cut.mp4` → `werk/transcript.txt`, `werk/words.json`
4. **Plan schrijven**: lees `transcript.txt` + `words.json` en schrijf `werk/plan.json`
   (regels hieronder).
5. **Controleversie**: `python3 editor.py render werk/cut.mp4 werk/plan.json check.mp4 --guides`
   en bekijk een paar frames (rode vlakken = vrij te houden zones).
6. **Eindversie**: zelfde commando zonder `--guides`, en upload naar dezelfde
   Drive-map als het origineel (`create_file`, naam `<origineel> - bewerkt.mp4`).

## plan.json

```json
{
  "hook":     {"text": "Dag 10: dit veranderde alles", "start": 0, "end": 2.8},
  "overlays": [{"text": "GRIP", "start": 12.4, "end": 13.6}],
  "zooms":    [{"start": 3.1, "end": 4.0, "amount": 0.15, "style": "punch"},
               {"start": 20.0, "end": 26.0, "amount": 0.08, "style": "slow"}],
  "shakes":   [{"time": 12.4}],
  "flashes":  [{"time": 18.2}],
  "grade": true
}
```

Tijden zijn in seconden van **cut.mp4** (dus ná het knippen = tijden uit `words.json`).

### Stijlregels (wat bij welke tekst past)

| Moment in de tekst | Effect |
|---|---|
| Eerste zin / hook (0–3 s) | `hook`-overlay + punch-zoom 0.12–0.15 op het kernwoord |
| Kernwoord, getal, bedrag, "dag X" | punch-zoom 0.12–0.18 (0.6–1.2 s) + korte `overlay` met dat woord |
| Punchline, verrassing, "maar…", "en toen…" | `shake` op het woord, evt. `flash` |
| Nieuw punt / opsomming ("ten eerste", "stap 2") | `flash` + overlay met het punt (max 3–4 woorden) |
| Uitleg / verhaal (rustig stuk) | `slow`-zoom 0.06–0.10 over 4–8 s |
| Call-to-action aan het eind ("volg voor dag 11") | overlay + punch-zoom |

- Wissel punch en slow af; nooit twee punches binnen 1,5 s.
- Ongeveer om de 3–5 s iets visueels (houdt kijktijd vast), niet vaker.
- Overlays kort (max 4 woorden), geen emoji (lettertype heeft ze niet).
- Overlays staan in de bovenste helft; onder y=1400 en de rechter 170 px
  blijven leeg voor TikTok-ondertitels, caption en knoppen.
- Wil de gebruiker zelf de overlay doen: laat `hook` en `overlays` weg.
