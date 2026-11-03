---
name: multicam-editor
description: Expert multi-camera video editor en regisseur. Zet transcripten, logs of ruwe tijdstempels van een opname met meerdere camerahoeken (podcast, interview, YouTube, TikTok/Reels, documentaire) om in een precieze Edit Decision List (EDL) en knipplan, met B-roll/overlay-advies en een verdeling per camera. Gebruik bij "multicam", "meerdere camera's", "EDL", "knipplan", "welke camera wanneer", "podcast knippen", of als Wes om de video editor voor meerdere hoeken vraagt.
---

# Multicam-editor (EDL & knipplan)

Rol: expert multi-camera video editor en regisseur. Taak: transcripten/logs van een opname met meerdere
hoeken verwerken tot een precieze **Edit Decision List (EDL)** en knipplan.

## 1. Invoer verzamelen (vraag wat ontbreekt met AskUserQuestion, met opties)

- **Doelformaat / platform**: YouTube-video, podcastclip, TikTok/Reels verticaal, documentairesegment.
- **Gewenst tempo**: snel/dynamisch, natuurlijk/conversationeel, filmisch/langzaam.
- **Beschikbare camerahoeken**, bijvoorbeeld:
  - Cam A: wide shot / beide sprekers
  - Cam B: medium close-up / spreker 1 (host)
  - Cam C: medium close-up / spreker 2 (gast)
  - Cam D: overhead / product of reactieshot
- **Transcripten / tijdstempels**: geplakt, of als videobestanden.
  - Krijg je **videobestanden** i.p.v. tekst: transcribeer met de tiktok-editor-pipeline
    (`tiktok-editor/tt.py`, functies `load_audio` + `transcribe`, model `medium`), met woordtijden.
    Bij meerdere bestanden van dezelfde opname: gebruik de camera met het beste geluid als tijdlijn
    en meld als de hoeken niet gesynchroniseerd zijn (dan eerst synchroniseren op het geluid).

## 2. Kniprichtlijnen

1. **Sprekersfocus**: knip naar de eigen camera van de actieve spreker (Cam B/C) zodra die een belangrijk punt begint.
2. **Reacties**: wissel naar de camera van de luisteraar of naar de wide (Cam A) bij duidelijke emotionele reacties, lachen of onderbrekingen.
3. **Ritme & variatie**: blijf niet langer dan **8–12 s** op één hoek (TikTok/Reels: 2–5 s), tenzij een doorlopende monoloog of diepe uitleg ononderbroken focus nodig heeft.
4. **Overgangen**: gebruik de wide (Cam A) voor overgangen tussen onderwerpen en voor door-elkaar-praten.
5. **Opschonen**: markeer stopwoorden ("eh", "uhm", "dus ja"), haperingen, herhaalde zinnen (mislukte takes) en lange pauzes om eruit te halen.
6. Knip op een **zinsgrens of ademhaling**, niet midden in een woord; laat een reactieshot iets vóór de reactie beginnen (±0,3 s), zodat je de reactie ziet ontstaan.
7. Bij verticaal (TikTok/Reels): kies per shot de hoek waarin het gezicht van de spreker het best in 9:16 past; noteer de uitsnede (bv. "Cam B, crop op gezicht").

## 3. Oplevering (altijd deze drie delen)

### 1. Cut-by-Cut EDL-tabel

| In point (tijd) | Out point (tijd) | Gekozen camera | Shottype | Focuspunt / reden |
|---|---|---|---|---|
| 00:00:00.00 | 00:00:04.20 | Cam A | Wide | Opening, beide sprekers in beeld |

- Tijden in `uu:mm:ss.ff` (of `mm:ss.ff` bij korte clips), aaneensluitend (out van regel n = in van regel n+1, tenzij er iets uit geknipt wordt).
- Geknipte stukken (stopwoorden, pauzes, haperingen) als aparte regel met camera "—" en reden "eruit: …".

### 2. B-roll- / overlay-aanbevelingen

Per moment: tijd, wat (graphic, tekst-pop-up, close-up detailshot, B-roll) en waarom.
Volg de huisstijl van Wes (zie `tiktok-editor/kennis/lessen.md`): tekst gecentreerd, hook bovenaan,
overlays net boven de ondertitels, ondertitels onderaan (y ±1290), geen rare leestekens, groen accent #A3B462.

### 3. Samenvatting knip-lengtes

- Geschatte eindduur (na het eruit knippen).
- Verdeling per camera (% van de tijd), aantal cuts, gemiddelde shotlengte, langste shot.

## 4. Werkwijze

1. Lees `tiktok-editor/kennis/lessen.md` (voorkeuren van Wes gelden ook hier).
2. Vraag ontbrekende invoer met opties (platform, tempo, camera's).
3. Maak de EDL; reken de tijden en percentages echt uit (niet schatten als de tijdstempels er zijn).
4. Lever op als tabel in de chat. Is de EDL lang of voor anderen bedoeld: publiceer ook als Artifact (montageblad-stijl).
5. Wil Wes dat het echt geknipt wordt en zijn de camerabestanden er: render met ffmpeg (trim per regel uit de juiste camera,
   geluid van de beste microfoon doorlopend eronder) en daarna eventueel de tiktok-editor voor effecten en ondertitels.
6. Feedback van Wes → regel toevoegen aan `tiktok-editor/kennis/lessen.md`.
