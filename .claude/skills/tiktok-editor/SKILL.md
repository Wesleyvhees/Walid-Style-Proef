---
name: tiktok-editor
description: Bewerkt ruwe TikTok/Reels-video's automatisch op basis van wat er gezegd wordt - mislukte takes en stiltes eruit, teksten, 3D-iconen en foto's die oppoppen bij de woorden, ondertitels met kernwoorden, zooms en geluidseffecten. Eerst een storyboard ter goedkeuring, daarna renderen; aanpassen met één zin ("maak het moody", "grotere ondertitels", "minder effecten"). Gebruik bij "bewerk <video> met tiktok-editor", "edit mijn TikTok", "maak hier een TikTok van" of een video in de Drive-map "Tiktok Rauw".
---

# TikTok-editor

Systeem in `tiktok-editor/` (Python-pipeline `tt.py` + Remotion-renderer in `studio/`).
Lees `tiktok-editor/README.md` voor het volledige storyboard-formaat.

## Werkwijze zonder toestemming (sinds 2026-11-05)

Wes: "je hoeft me geen toestemming meer te vragen". Voer de stappen direct uit en meld kort wat je doet. Vaste keuzemomenten
blijven: (1) tekst ter controle, (2) vragenlijst vóór het storyboard (mag in één AskUserQuestion samen met de tekstcheck),
(3) fotokeuze als er foto's zijn. Daarna storyboard → eigen controle met stills (niet naar Wes) → renderen → zelfcontrole → video + SEO-pakket sturen,
zonder tussendoor te vragen. Alleen vragen bij echte twijfel of iets onomkeerbaars.

## Leren (altijd, bij elke video)

- **Vóór het bewerken** lees je `tiktok-editor/kennis/lessen.md` (feedback van Wes, nieuwste eerst) en
  `tiktok-editor/kennis/onderzoek.md` (onderzoek naar top-creators). Lessen gaan vóór algemene regels hieronder.
- **Na elke feedback** van Wes: voeg bovenaan `lessen.md` een regel toe
  (`datum · video · wat Wes zei → nieuwe regel`), pas zo nodig deze skill of de code aan, commit en push.
- **Onderzoek bijhouden**: elke 5 video's, of als Wes erom vraagt, opnieuw zoeken (WebSearch) naar hoe
  top-creators nu editen (nieuwe trends, wat uitgekauwd raakt). Werk `onderzoek.md` bij met bronnen en
  vertaal nieuwe inzichten naar concrete regels of code. Vermeld wat er veranderd is.
- Probeer per video minstens één ding beter te doen dan de vorige keer en noem dat bij de oplevering.

## Werkwijze

1. **Klaarzetten** (eenmalig per sessie):
   `cd tiktok-editor/studio && npm install` en `pip install faster-whisper rembg[cpu]` (rembg alleen nodig voor cutouts).
   Netwerk nodig: drive.google.com, drive.usercontent.google.com, huggingface.co, raw.githubusercontent.com, api.openverse.org.
2. **Video ophalen**: zoek met de Google Drive-connector (`search_files`, map "Tiktok Rauw"),
   download naar de scratchpad:
   `curl -L -o ruw.mp4 "https://drive.usercontent.google.com/download?id=<ID>&export=download&confirm=t"`
3. **Voorbereiden**: `python3 tt.py prepare ruw.mp4 <project>` (niet spiegelen, tenzij de gebruiker erom vraagt)
   Haalt mislukte takes
   (herhaalde zinnen, laatste take blijft) en elke pauze > 0,08 s eruit (op basis van het geluid zelf), maakt `cut.mp4`, `words.json`, `transcript.txt`, `cuts.json`.
   Gebeurt automatisch in `prepare`:
   - **Schone stem**: gerommel en ruis eruit (±8 dB), scherpe s-klanken zachter, iets meer helderheid, milde compressor (`VOICE_AF` in tt.py;
     uit met `--no-voice`). Knippen gebeurt op het onbewerkte geluid, transcriberen op de schone stem. Eindvolume -14 LUFS zet `render`.
   - **Zachte knippen**: het geluid loopt bij elke knip 24 ms in elkaar over (geen klik, geen gaatje); beeld knipt op exacte frames.
     `render` zoomt na een knip om en om naar 108% rond het gezicht (`cuts.json`), zodat een jump cut voelt als een camerawissel.
     Niet sneller dan elke 0,8 s; niet bij virtuele camera's. Uit: `"jumpZoom": false`, anders: `"jumpZoom": {"to": 1.05, "minHold": 1.2}`.
   - **Woordtijden strak op de stem**: begin/eind van een woord schuift naar waar het geluid echt begint/stopt en grenzen tussen woorden naar
     het zachtste punt (niet bij muziek). Achteraf opnieuw: `tt.py retime <project>`. Ondertitels: max **3 woorden** per keer (`captions.maxWords`).
   Vereist: `pip install "opencv-python-headless==4.10.0.84"` (OpenCV 5 heeft geen gezichtsdetectie meer).
   Controleer `words.json` op samengeplakte woorden en spraakfouten; verbeter met `tt.py fixwords <project> "juiste zin"`.
   **Muziek eronder** (prepare meldt "Muziek gedetecteerd"): controleer de lengte na het knippen. Bij poses/body checks: vraag of pauzes
   blijven (`--keep-pauses`). Daarna `tt.py beats <project>` en `"beatZooms": {"every": 2, "to": 1.04}` in storyboard.json voor zooms op de maat;
   leg ook pops/stempels op beat-tijden uit `beats.json`.
   **Lengte-check**: is er na het knippen minder dan 60% over, stop en kijk waarom vóór je verder gaat.
   **Kookvideo / laten zien** (veel stukken zonder praten): `prepare --keep-pauses`, daarna `tt.py speedup <project>` (korte pauzes eruit,
   stiltes > 1,5 s 3× versneld met zacht geluid, woordtijden mee omgerekend). Controleer daarna door `cut.mp4` opnieuw te transcriberen en te vergelijken.
   **Meerdere takes** (bv. video 1–8 = één zin per take): `prepare` per take, daarna `tt.py combine <project> <take1> … <takeN>`.
4. **Keuzes voorleggen** (zie hieronder) en daarna **storyboard schrijven**: lees `transcript.txt` + `words.json`, bepaal per zin wat
   de kijker moet voelen/onthouden en schrijf `<project>/storyboard.json` (regels hieronder).
   Geef elke beat een `note` met het waarom.
5. **Beelden ophalen**: `python3 tt.py assets <project>`. **Elke video andere plaatjes**: `assets` slaat beelden over die al in een andere video zaten
   (register `tiktok-editor/kennis/gebruikte-beelden.json`, wordt na elke render bijgewerkt) en waarschuwt bij ⚠. Los elke ⚠ op
   (andere `pick`, andere zoekterm of ander icoon). Ook iconen: kies bij voorkeur iconen die nog niet in het register staan. Bekijk bij elke foto de
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

## Series en templates (eerst bepalen!)

Wes heeft drie TikTok-series, elk met een eigen vaste template (`tiktok-editor/templates.json`).
Zet in `storyboard.json` altijd `"template": "<naam>"`; `render.mjs` zet dan de stijl en **laat effecten weg die niet bij de serie passen** (met waarschuwing).
Vraag bij een nieuwe video als eerste keuze bij welke serie hij hoort (of leid het af uit de tekst en laat het bevestigen).

| Template | Serie | Wat wel | Wat niet |
|---|---|---|---|
| `nulnaargrip` ✅ goedgekeurd, vast | **Van nul naar grip** (motivatie, dag X) — bouw elke aflevering exact als `voorbeelden/nulnaargrip-dag11/storyboard.json` (**harde look**: bijna zwart-wit, contrast, donkere rand, korrel; harde impact-woorden boven het hoofd met boem) (opbouw in `templates.json` → `vast`) | Witte ondertitels, `pop` look **`impact`** (groot wit woord slaat neer, witte lijn, holle echo), hook = pakkende uitspraak met pill "Van nul naar grip dag X", `label`, zooms, whoosh (niet op zooms) | Geen geluid op zooms, geen kleur, geen 3D-iconen, foto's, achtergronden, meters, grafieken, stempels of stickers |
| `slimmer20` ✅ goedgekeurd | **Slimmer eten, drinken en trainen 2.0** (uitleg) — bouw elke aflevering als `voorbeelden/slimmer20-dag22/storyboard.json` (opbouw in `templates.json` → `vast`) | Hook = pakkende uitspraak met pill "Slimmer 2.0 dag X", MYTHE/FEIT-stempel, labels + 3D-iconen per punt, grafiek bij getallen, typend tip-kaartje, `checklist` bij een opsomming (komt terug bij de afsluiter), 1 cutaway, groene stickers, volg-stempel | — |
| `nieuweeffecten` | **Nieuwe effect template** (17 effecten uit Wes' voorbeeldvideo, 2026-11-05) — referentie `voorbeelden/nieuweeffecten-demo/storyboard.json` | `orbit`, `couchwall`, `uiworld`, `framebreak`, `digitalzoom`, `phone`, `checklist`, `headlines`, `zoomcut`, `linechart`, `pullback`, `greenscreen`, `papercut`, `doodle`, `vertigo`, `cover`, `glass` + teller (`pop` look `counter`, "03/17"). Elk 1 tot 2 s. Effecten met uitsnede: eerst `tt.py person` (vertigo maakt ook `plate.mp4`) | Geen jump-zoom (eigen camerabewegingen) |
| `blauwdruk75` | **De 75 kilo blauwdruk** (tips om geleidelijk af te vallen) | Layout van de cardio-video (goedgekeurd), plus per tip een `pop` look `label` "Tip 1", "Tip 2" … bij het begin van elke tip | — |
| `los` | Losse video (bv. "Mijn shape na de vakantie") | Vrije keuze binnen de vaste indeling | — |

- **Template aanpassen ≠ video opnieuw maken**: past Wes iets aan in een template, werk dan `templates.json`, deze skill en `lessen.md` bij en push,
  maar render bestaande video's **niet** opnieuw. Het geldt vanaf de volgende video van die serie (tenzij Wes vraagt om opnieuw te renderen).
- Indeling tot nu toe: "Van nul naar grip dag 10" = `nulnaargrip`; "Cardio maakt je niet strak" = `blauwdruk75`; "Mijn shape na de vakantie" = `los`.
- `impact`-woorden: standaard net boven de ondertitels; valt dat over het gezicht (bv. in de auto), dan boven het hoofd (y ±430) en de hook eerder laten eindigen.

## Vragenlijst vóór elke bewerking (verplicht)

Wes wil bij **elke** video eerst een uitgebreide vragenlijst met opties en voorbeelden, en pas daarna bewerken.
Het **bewerkingsmenu** met alle opties, codes en voorbeeldbeelden: https://claude.ai/artifact/3en4hgpLa7NrA616RPaHkK
(codes S, D, H, T, B, G, C, K, A, O, E). Stuur die link altijd mee bij de eerste vraag, en zeg dat hij ook direct codes mag noemen
(bv. "S3 D2 H1 T2+T4 B4 G1 K2 A1 O1 E1") of "jij kiest".

Werkwijze:
1. Eerst `prepare` (knippen + transcript), zodat de vragen over de echte inhoud gaan. Lees de tekst; check de lengte.
1b. **Tekst ter controle (verplicht, vóór de vragenlijst):** typ de volledige tekst uit, per zin met tijdstip
   (`[0:05] …`). Verbeter eerst zelf duidelijke spraakfouten; zet elk aangepast woord **vet** met erachter wat de
   spraakherkenning hoorde (bv. **craving** (gehoord: kreeving)). Vraag Wes de tekst goed te keuren of te verbeteren.
   Pas na zijn akkoord: `tt.py fixwords` met de goedgekeurde tekst en daarna de vragenlijst.
1c. **Effectvoorstel (verplicht, Wes 2026-11-05):** bekijk zelf welke effecten bij de soort video (praten, kookvideo,
   body check, buiten/binnen, statief of uit de hand) en bij de tekst passen, uit alle templates incl. de **Nieuwe effect template**
   (N1–N17). Leg per zin een voorstel voor (tijdstip → effect → waarom), met 2–3 alternatieven waar het twijfel is, en overleg met Wes
   vóór het storyboard. Let op: vertigo alleen bij statief; effecten met uitsnede kosten ±2 s per frame rekentijd (noem de verwachte duur).
   **Altijd via het keuzemenu, bij elke nieuwe video (Wes, 2026-11-05)** — dit vervangt de losse AskUserQuestion-rondes voor effecten: zet het voorstel in
   `<project>/voorstel.json` (formaat: zie `voorbeelden/keuzemenu-voorstel.json`; `groepen` = keuzes voor de hele video zoals hook,
   geluid, einde; `momenten` = per zin met `still` en `opties` {id, code, label, uitleg, advies}), draai `tt.py keuzemenu <project>`
   en publiceer `keuzemenu.html` op de vaste link **https://claude.ai/artifact/HLNEnybLz1nj9jvo4sjYPm** (Artifact publish met `url`,
   eerst `action: read`; capability `db` blijft staan). `project` uniek per video. Wes klikt aan, tikt Versturen en zegt "keuzes klaar";
   lees dan `ArtifactData get` collection `keuzes`, doc_id = project (veld `sel` per blok, `notes`, `tekst` = samenvatting) en bouw
   het storyboard daarop. Voorbeeldbeelden per code staan in `kennis/menu/thumbs/` (bijwerken met `kennis/menu/make_thumbs.py`).
2. **Ronde 1** (AskUserQuestion, 4 vragen, telkens 3–4 opties met `description` en waar nuttig `preview` met tijdstip + effect;
   aanbevolen optie eerst met "(Aanbevolen)"):
   - **Serie/template** (S1 Van nul naar grip, S2 Slimmer 2.0, S3 75 kilo blauwdruk, S4 los). Aanbevelen op basis van de tekst.
   - **Doel** (D1 kijktijd, D2 reacties, D3 volgers, D4 vertrouwen/uitleg).
   - **Hook**: 3 concrete hook-teksten uit déze video die een vreemde in 1 s snapt (zie "Hook in de eerste seconde"): H1 mythe + stempel,
     H3 vraag/uitspraak aan de kijker, H4 eerlijke titel; serie + dag altijd klein in de pill. Met de echte tekst in label/preview.
   - **Knippen** (K1–K5), met de gemeten lengtes (bv. "15,7 s → 12,2 s").
3. **Ronde 2** (alleen opties die binnen de gekozen template mogen; multiSelect waar logisch):
   - **Pop-tekst** (T1–T7) met per optie de concrete woorden uit de video (bv. "T4: '3 of 4' + 'keer per week' op 31,0 s").
   - **Beelden** (B1–B5) met 2–3 concrete beeldideeën per moment (bij S1: overslaan, niet toegestaan).
   - **Getallen/camera** (G1–G3, C1–C4) als de tekst getallen, een vergelijking of muziek heeft.
   - **Geluid** (A1–A3) en **Einde** (E1–E4).
4. **Ronde 3** (als er foto's zijn): stuur per moment het kandidatenoverzicht (A/B/C/D) en laat kiezen.
5. Storyboard schrijven op basis van de keuzes → zelf stills controleren (plaatsing, overlap met gezicht, ondertitels op één regel) → renderen.
   **Geen montageblad/montage-overzicht meer naar Wes** (2026-11-05: het keuzemenu vervangt het); alleen als Wes erom vraagt of bij een
   heel nieuw effect dat hij nog niet gezien heeft. In het antwoord bij de video: korte tabel tijd → wat je ziet.
6. Na de render: stuur de video met meteen het **postklaar pakket, SEO-geoptimaliseerd** (Wes, 2026-11-05), om te kopiëren:
   - **Trefwoorden eerst bepalen**: 1 **hoofdtrefwoord** (waar de video over gaat, zoals mensen het zoeken, bv. "motivatie om te sporten"),
     3–4 **secundaire** trefwoorden en 3–4 **long-tail** zoekvragen ("hoe blijf je gemotiveerd om te sporten").
     Nederlands, zoals mensen het in TikTok-zoeken typen; liefst woorden die Wes ook uitspreekt (ondertitels tellen mee).
   - **Beschrijving**: hoofdtrefwoord in de **eerste zin** (die zie je in zoekresultaten), secundaire trefwoorden natuurlijk in de
     volgende 2–3 zinnen, serie + dag, en een vraag aan de kijker (reacties). Emoji spaarzaam. Geen merknamen tenzij Wes ze noemt.
   - **Verborgen woorden**: alle trefwoorden als één regel met komma's (hoofd + secundair + long-tail + varianten/meervoud),
     voor het zoekwoordenveld of onderaan de beschrijving onder een paar lege regels.
   - **Hashtags**: 3–5 relevante (hoofdtrefwoord als hashtag, serie-hashtag, #wesbuilt); geen #fyp/#viral.
   - **Claude zorgt dat het hoofdtrefwoord in de video zit** (Wes: "daar moet jij voor zorgen"), niet Wes:
     bepaal de trefwoorden al **vóór de vragenlijst** (na de tekstcheck) en verwerk het hoofdtrefwoord in de tekst in beeld:
     in de hook of het pilletje eronder (bv. pill "Motivatie om te sporten · dag 11"), en waar het past als impact-woord/sticker.
     Hook-opties in de vragenlijst bevatten het hoofdtrefwoord. Schrijft Claude het script, dan staat het hoofdtrefwoord letterlijk
     in de eerste of tweede zin.
   Daarna weer een vraag met opties wat beter kan.
- Antwoordt Wes met eigen tekst in plaats van een optie: lees het goed, volg wat hij echt bedoelt, en vraag door bij twijfel (met voorbeelden).
- Nieuwe effecten gebouwd? Voeg ze toe aan het bewerkingsmenu (nieuwe code + voorbeeldbeeld) en publiceer het opnieuw op dezelfde link.

## Wes.Built-montageregels (altijd toepassen)

Rol: compromisloze video-editor en retentiespecialist voor **Wes.Built**. Doel: kijker tot de laatste seconde vasthouden.

1. **Dead air eruit**: elke stilte, aarzeling en adempauze weg (`prepare`, standaard `--gap 0.08`). Tight, constante beweging.
2. **Micro-zoom om de 3–5 s** (100% → 110%, `ease: "punch"` of `"in"`, `to: 1.10`) en extra op cruciale momenten als visuele reset.
3. **Kinetic typography**: per zin 1–2 kernwoorden die groot oppoppen (`pop`, wit met groene accenten = preset `wesbuilt`),
   pop-in met lichte schaalvergroting op het moment dat het woord wordt uitgesproken. Nooit lappen tekst.
4. **Context-aware B-roll**: wat gezegd wordt direct koppelen aan een visueel element dat 1–2 s in beeld schiet
   en weer wegklapt (`image`, `emoji`, app-scherm zoals MacroFactor als eigen screenshot in de projectmap, grafiek, gym/wandel-beeld).
5. **Audio FX**: `whoosh` bij bewegingen en tekstwisselingen, subtiele `pop` bij keywords, `boom` op de punchline,
   `ding` bij een afronding; harde cuts zonder klik (crossfades van 24 ms zitten in `prepare`).

**Oplevering bij een tekst of video-idee** (zonder video): geen voorleesscript, maar een
**Tijdlijn & Montage-Instructieblad** als tabel met kolommen
`Tijdstip | Cuts & Pacing | Tekst-overlays (Keywords) | B-roll & Visuele Effecten | Audio FX`.
Bij een echte video: hetzelfde blad als storyboard, daarna renderen met dit systeem.

## Wes.Built-methode (afgeleid van analyse van Jesse's video's, verbeterd)

Jesse (fitness-uitleg, 40–55 s, talking head aan tafel) wisselt **elke 1,4–2,3 s** van beeld. Dat tempo nemen we over,
maar strakker uitgevoerd. Per video wisselen deze lagen elkaar af, nooit twee keer dezelfde na elkaar:

| Laag | Wanneer | Hoe (beter dan Jesse) |
|---|---|---|
| `hook` (vaste titel bovenin) | 0–6/8 s: de mythe of vraag, 2 regels, zonder "…", accentwoord tussen `*sterretjes*` (opmaak, verschijnt niet); `sub` = belofte ("wat het is + wat je moet nemen") | Strak getypeerd met geel accentwoord en een pill-ondertitel in plaats van platte tekst over het gezicht |
| `pop` look `stamp` | Op het moment dat de mythe genoemd/ontkracht wordt: "MYTHE" (#FF3B30) / "FEIT" (#34C759) | Stempel met inslag + `boom` |
| `scene` mode `cutout` | Analogieën en plekken ("zie je lichaam als een **tank**", "in de **gym**", "je **maag**") → jij uitgeknipt vóór dat beeld, 1,5–3 s | Schone AI-cutout met witte rand en schaduw + bewegende achtergrond (Ken Burns), i.p.v. ruwe uitsnede of rechthoek |
| `scene` mode `pip` | Schermen, producten, websites, app (MacroFactor), schema's → jij in afgerond kader ervoor | Kader met witte rand, schaduw, binnen de veilige zone |
| `cutaway` | Concreet ding of actie ("weegschaal", "cardio", "maaltijden skippen") 0,6–1,2 s schermvullend, evt. met `label` | Ken Burns + snelle in-zoom, eigen clips/rechtenvrije foto's i.p.v. stock met watermerk |
| `image` | Voorbeeld/ding erbij terwijl jij in beeld blijft | Fotokaart die oppopt en weer wegklapt |
| `chart` | Zodra er getallen vallen (gewicht per dag, grammen, %) | Geanimeerde staafjes die optellen, uitschieter in geel, i.p.v. een statisch zwart lijstje |
| `meter` | Een analogie die terugkomt (batterij, tank, meter): steeds hetzelfde graphic met nieuw niveau op de woorden ("vol", "leeg", "aanvullen") | Live animatie groen→geel→rood met %, i.p.v. losse plaatjes (Jesse video 4) |
| `persona` | Jij stelt de vraag van de kijker ("maar wat dan?", "ja maar…") | Automatische close-up + scheef + label "jij:"; max 1–2× per video |
| `image` boven het hoofd | Formaat zonder achtergrondwissels: kaart (x 540, y ±230, w ±440) die elke 1–3 s wisselt | Nooit over ogen/mond |
| `emoji` / `pop` | Emotie en kernwoorden tussen de grote wissels door | Zie effectregels |
| Ondertitels | Altijd, 1–3 woorden per keer | Groter dan bij Jesse, kernwoorden geel (`captions.highlight`), altijd leesbaar |

Overgangen zijn **hard** (achtergrond/cutaway schiet in één frame in en uit, geen overvloeier): voorkeur van de gebruiker.
Effectdichtheid: **elke ~1,2 s iets nieuws** (bevestigd door de gebruiker bij dag 10).
Fotobronnen (alleen vrij te gebruiken zonder naamsvermelding: CC0 / publiek domein): **Wikimedia Commons** + **Openverse** (streng:
alleen echte foto's, geen tekeningen/prenten/oude scans/AI, niets ongepasts, groot), om en om 9 kandidaten per zoekterm. Pixabay komt erbij
zodra Wes `PIXABAY_KEY` heeft toegevoegd (de gewone sleutel op pixabay.com/api/docs/ bij Parameters → key; "full API access" is niet nodig).
Leveren beide banken niets bruikbaars (Commons 429 / Openverse 500 komt vaak voor), bied dan een 3D-icoon als alternatief aan.

Volgorde-ritme (herhalen): talking head + pop → scene/cutaway → talking head + emoji → image/chart → …
Een `scene` cutout vereist `tt.py person` (ISNet, ±1,8 s per frame; alleen frames van die beats).

### Hook in de eerste seconde (verplicht, uit de kijkcijfers)

**Aangepast na de grote analyse (2026-11-06, Wes' toppers):**
- De hook-titel staat alleen in het begin (zoals voorheen), **niet** de hele video (Wes 2026-11-06: teruggedraaid).
  Waar het om draait is **hoe de hook geschreven is** (zie "Hooks schrijven" hieronder).
- **Eerste 2 seconden rustig:** alleen de hook-titel en hooguit één beweging (punch-zoom of digital zoom). Geen iconen, meters of
  kaarten vóór 2 s.
- **Lengte 12 tot 20 s:** zet in het keuzemenu altijd een groep "Lengte" (zo laten · stem 10% sneller met `tt.py tempo` ·
  mijn voorstel welke zin eruit kan). Bij een script van Claude: max ±50 woorden.

Uit `kennis/kijkcijfers.md`: bij elke video haken de meeste kijkers af op 0:01–0:02, en ±95% zijn vreemden via "Voor jou".
- **Hooktekst bovenin vanaf frame 1** = een concrete, prikkelende uitspraak die een vreemde in 1 s snapt
  ("Stop met je elke dag wegen", "Cardio maakt je niet strak"). **Nooit de serienaam als hook**: serie + dag staan klein in de
  `sub`-pill ("Slimmer 2.0 dag 22", "Van nul naar grip dag 10").
- **Eerste woord op 0,0 s** (prepare knipt de stilte ervoor weg) en **meteen beweging**: in de eerste 0,5 s een punch-zoom of
  pop/stempel.
- **Sterkste zin eerst**: staat de pakkendste zin later in de video, stel voor om die naar voren te knippen (als koude opening).
- **Kort**: mik op 12–20 s; stel bij een langere video voor wat eruit kan.
- In de vragenlijst: alle hook-opties zijn zulke uitspraken (H1 mythe + stempel, H3 vraag/uitspraak aan de kijker, H4 eerlijke titel);
  H2 (serietitel als hook) alleen als Wes erom vraagt.
- Stuurt Wes kijkcijfers: zet ze in `kennis/kijkcijfers.md`, koppel het afhaakmoment aan het storyboard, en werk de conclusies bij.

### Hooks schrijven (uit Wes' eigen toppers vs. flops, analyse 2026-11-06)

Toppers begonnen zo (likes): "Een kleine eye-opener: **30 minuten lopen per dag**…" (97) · "**Dit eet ik elke ochtend** voor een
sixpack" (57) · "Mensen vinden het vreemd dat ik 's ochtends **een Monster** drink, maar als Henk tien koffie drinkt…" (45) ·
"**De grootste fout** die je maakt is vanaf dag 1 alles 100% goed willen doen" (40) · "Als je na 8 uur nog wat eet word je zeker
dik. **Hey jo, tuurlijk niet.**" (36). Zwakker: "Waarom een enkel meetmoment niet het hele verhaal vertelt" · "Je hoeft niet perfect te
zijn" · "Heb jij in de middag continu trek naar snelle snacks en een gigantische energiedip?" (4,4 s lang).
Regels:
1. **Eerste zin max ±8 woorden / 2 seconden.** Het kernwoord of getal valt in de eerste 3 woorden.
2. **Concreet boven abstract:** een getal, eten, een tijdstip, een persoon (Henk) of jij zelf ("Dit eet ik…"); geen
   "meetmoment", "energiebalans", "perfect".
3. Gebruik één van de bewezen vormen: **getal-verrassing** (30 min lopen → 6 kilo vet) · **ik-bewijs** (dit eet ik / dit doe ik) ·
   **grootste fout** · **mythe als feit, dan omdraaien** ("…word je dik. Tuurlijk niet.") · **herkenbare tegenstelling**
   (Monster vs. tien koffie).
4. **Spanning in zin 1, antwoord pas daarna**: verklap de oplossing niet in de hook.
5. Bij elk script: 3 hook-varianten in deze vormen voorstellen; in het keuzemenu de hook-groep met die varianten.

### Hoekstapeling: pijn → meer pijn → oplossing (Wes, 2026-11-06) + de 3-secondenoorlog

Structuur voor elk script (±15–20 s, ±45 woorden):
| Tijd | Hoek | Doel | Voorbeeld (slaap) |
|---|---|---|---|
| 0–2 s | **Pijnhoek** | kijker herkent zich, concreet, ≤8 woorden | "Slecht slapen maakt je dikker." |
| 2–6 s | **Nog pijnlijkere hoek** (draai) | het is erger dan hij dacht | "En nee, niet door wat je eet. Je hersenen schreeuwen om suiker." |
| 6–10 s | **Bewijs/getal** (re-hook) | geloofwaardig, alleen echte cijfers | "Na één korte nacht eet je meer, blijkt uit onderzoek." |
| 10–15 s | **Oplossingshoek** | één simpele actie | "7 tot 8 uur. Scherm een uur eerder uit." |
| 15–18 s | **Open lus + CTA** | reden om te volgen/reageren | "Morgen: hoe ik in 10 minuten slaap. Volg voor dag 11." |
Re-hook-zinnetjes: "En het gekke is…", "Maar dat is niet eens het ergste", "Let op wat er gebeurt als…", "Wacht, het wordt beter".

**Checklist eerste 3 seconden** (online onderzoek 2026-11-06; cijfers in bronnen lopen uiteen, de richting is consistent):
1. Hook binnen 1 à 1,5 s, geen intro.
2. **Drie lagen stapelen** die hetzelfde zeggen: gesproken zin + tekst in beeld + beweging (zoom, gebaar, iets vasthouden).
3. Waarde/belofte meteen duidelijk (TikTok-advies: je propositie in de eerste 3 s).
4. Nieuwsgierigheid of patroononderbreking (open lus, mythe, verrassend getal).
5. Hoofdtrefwoord in de eerste gesproken zin, in de tekst in beeld én in de beschrijving (SEO: TikTok leest alle drie).

**Vasthouden en amuseren:** elke 2–4 s iets nieuws in beeld of geluid (visuele onderbreking op elke re-hook: zoom, sticker
met kernwoord, overgang); een beetje humor of herkenbare tegenstelling (zoals "Henk met zijn tien koffie"); kort houden
(completion en herbekijken tellen zwaar; shares en saves wegen zwaarder dan likes); eindigen met een open lus of loop naar het begin.
In het keuzemenu: markeer elke hoek/re-hook als moment en bied per moment een visuele onderbreking aan.

### Schrijfstijl (bij script/idee-aanvragen, en voor hook-teksten)

0. **SEO**: kies eerst het hoofdtrefwoord (zoals mensen het in TikTok zoeken) en zet het letterlijk in de eerste of tweede zin.

1. **Hook (0–3 s):** val een bekende overtuiging aan, in de jij-vorm. "Hoe kan het nou dat…", "Ben je nou echt nog steeds…", "Als jij maar … doet, dan…". Geen intro, geen "hoi".
2. **Herkenning (3–8 s):** het gevoel/probleem van de kijker ("de weegschaal schiet omhoog").
3. **Uitleg via één analogie** (tank, spons, batterij) — die analogie krijgt een `scene`.
4. **Wetenschap in één zin**, simpel gehouden; vakterm mag als `pop`.
5. **Praktisch advies met een getal** ("20–40 gram halverwege je training") → `pop` look `big` met `sub` ("30 g" + "snelle koolhydraten") of `chart`.
6. **Open lus kort houden**: beloof het antwoord en geef het vóór ±8 s (Jesse wacht 16 s; dat is te lang).
7. **CTA met een knipoog** die terugkoppelt aan het onderwerp ("je kijkt toch dagelijks naar mijn video's, dus…") → `follow`-kaart.
8. **Vaste afsluiter**: een eigen herkenbare slotzin voor Wes.Built (voorstellen als keuze).
9. Sponsor: eerlijk benoemen ("ja, ik word gesponsord") + code als `pop` look `label`.

## Tekst in beeld

- **Geen rare leestekens**: geen … – — × = * of aanhalingstekens, geen klemtoontekens als nadruk (wél). Nadruk = groen/sticker.
  `render.mjs` filtert ze ook automatisch; schrijf ze dus al niet in het storyboard. (`*woord*` in een hook is alleen opmaak.)
- Ondertitels zonder komma's en punten; ? en ! blijven.
- Getallen en bereiken voluit: "3 of 4", "20 tot 30 gram".

## Effectregels (wat bij welke tekst past)

| In de tekst | Effect |
|---|---|
| Eerste 2 s (hook / titel / serie) | `words` met de kern in 2 regels, `label` met serie/dag, `whoosh` |
| Emotie of ding dat je kunt zien (liefde, vuur, geld, tijd, hersenen…) | `emoji` (Fluent 3D, Engelse naam zoals "red heart", "fire", "money bag", "brain", "rocket"), `pop` |
| Kernwoord | `pop` look `sticker` (max 2 woorden) en het woord in `captions.highlight` |
| Punchline / climax | `pop` look `big` + `"sfx": "boom"` + punch-zoom 1.12–1.15. **Geen `riser`**: klinkt als een pieptoon (Wes, dag 11); alleen als Wes erom vraagt |
| Concreet onderwerp (telefoon, sportschool, geld, natuur) | `image` met zoekterm + kort `label` (2–3 woorden) |
| Les / conclusie / tip | `prompt`-kaartje dat typt, of `image` + `label`; `ding` bij afronding |
| Opsomming ("ten eerste…") | `pop` look `label` per punt, `click` |
| Call-to-action ("volg", "comment") | **`volgstempel`** (echte Wes.Built-profielkaart, `studio/public/merk/volgstempel.png`, voorkeur boven `follow`) of `comment`-kaart |
| Rustig stuk | langzame zoom (`ease: "in"`, 1.04–1.07) |

- Om de 1,5–3 s iets nieuws in beeld (kijktijd), maar nooit twee effecten tegelijk op dezelfde plek.
- Max één punch-zoom per 1,5 s; wissel punch en langzaam af.
- Alles boven y≈1000 of naast het gezicht; onder y=1400 en rechts van x=900 blijft leeg (TikTok-UI).
- **Vaste indeling** (wens van Wes): alle tekst **exact gecentreerd op x 540**, altijd met donkere letterrand (leesbaar op elke achtergrond).
  - Bovenaan: hook-titel (y ±215, `size` ±86).
  - Onderaan: stickers, stempels en grote woorden **net boven de ondertitels** (standaard in de code: y 1120, `big` y 1040; geef in het storyboard dus géén `x`/`y` mee tenzij nodig).
  - Ondertitels: **altijd net onder je kin** (automatisch, per regel stil).
  - Iconen, fotokaarten en meters mogen opzij of bovenin, nooit over het gezicht.
  - Wijk alleen af als de standaardplek iets belangrijks bedekt; kies dan de dichtstbijzijnde vrije plek en meld dat.
- Ondertitels: **altijd net onder de kin** (Wes, 2026-11-05: "een nieuwe regel: ondertiteling altijd onder mijn kin"; vervangt de oude vaste y 1290).
  Standaard in de code (`captions.y` leeg of `"auto"`, via `layout.json`); zonder gezicht in beeld y 1290. Stickers, stempels en kaarten niet
  over het gezicht of de ondertitels: bij een hoog gezicht net boven de ondertitels, bij een laag gezicht boven het hoofd.
  `captions.y: "auto"` (net onder de kin, via `layout.json`) bestaat als optie, alleen gebruiken als Wes erom vraagt.
- Tekst-achter-de-persoon (`title` met `behind: true`, vereist `tt.py person`) is optioneel:
  alleen gebruiken als de gebruiker erom vraagt of het echt iets toevoegt.
- Eigen stijl: niet de look van andermans video's kopiëren. Presets: **`wesbuilt` (standaard, huisstijl: wit met legergroen #A3B462 van de Wes.Built-website)**, `grip` (geel, niet meer gebruiken tenzij gevraagd), `editorial`, `moody`, `pop`.

## Eén-zin-feedback vertalen

| Zin | Wijziging |
|---|---|
| "maak het moody / donkerder" | `style: "moody"` |
| "rustiger / chiquer" | `style: "editorial"`, minder `pop`/`emoji` |
| "grotere ondertitels" | `captions.size` +20–30 |
| "strakker knippen" | `prepare` opnieuw met `--gap 0.04` (losser: `--gap 0.2`) |
| "minder inzoomen bij de knippen" | `"jumpZoom": {"to": 1.05}`; helemaal uit: `"jumpZoom": false` |
| "langere ondertitels" | `captions.maxWords` 4 |
| "minder effecten" | elke tweede emoji/pop eruit, geen `sfx` behalve `boom`/`ding` |
| "andere hook" | eerste `words`-beat herschrijven |
| "geen geluidjes" | alle `sfx` weg |
| "geluiden zachter/harder" | `"sfxVolume": 0.7` (of 1.3) in storyboard of template; standaard staat al ±30% zachter (dag 22) |
