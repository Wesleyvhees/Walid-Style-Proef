---
name: tiktok-editor
description: Bewerkt ruwe TikTok/Reels-video's automatisch op basis van wat er gezegd wordt - mislukte takes en stiltes eruit, teksten, 3D-iconen en foto's die oppoppen bij de woorden, ondertitels met kernwoorden, zooms en geluidseffecten. Eerst een storyboard ter goedkeuring, daarna renderen; aanpassen met één zin ("maak het moody", "grotere ondertitels", "minder effecten"). Gebruik bij "bewerk <video> met tiktok-editor", "edit mijn TikTok", "maak hier een TikTok van" of een video in de Drive-map "Tiktok Rauw".
---

# TikTok-editor

Systeem in `tiktok-editor/` (Python-pipeline `tt.py` + Remotion-renderer in `studio/`).
Lees `tiktok-editor/README.md` voor het volledige storyboard-formaat.

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
   (herhaalde zinnen, laatste take blijft) en elke pauze > 0,08 s eruit (op basis van het geluid zelf), maakt `cut.mp4`, `words.json`, `transcript.txt`.
   Controleer `words.json` op samengeplakte woorden en spraakfouten; verbeter met `tt.py fixwords <project> "juiste zin"`.
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

## Keuzes voorleggen (verplicht, vóór het bewerken)

De gebruiker wil **eerst kiezen, dan pas bewerken**. Na stap 3 (prepare) en een eerste analyse van de tekst,
en vóór storyboard.json definitief is, assets/cutouts worden gemaakt of er gerenderd wordt:

1. Leg de keuzes voor met **AskUserQuestion** (max 4 vragen per keer, elk 2–4 opties, aanbevolen optie eerst
   met "(Aanbevolen)"). Gebruik `preview` om per optie te laten zien wat er gebeurt (tijdstip + effect).
2. Standaard vragen (kies de 3–4 die voor deze video het meest uitmaken):
   - **Stijl**: `wesbuilt` (huisstijl, groen accent) / `moody` (donker, grote ondertitels) / `editorial` (rustig, chic) / `pop` (fel).
   - **Hook**: 2–3 concrete hook-teksten voor de eerste 3 s (bv. serietitel, prikkelende vraag, mythe + stempel).
   - **Achtergronden/B-roll**: per belangrijk moment 2–3 beeldideeën (bv. bij "love": publiek dat juicht / zonsopkomst / jij in kader voor sportschool),
     of de mate: veel scene-wissels (Jesse-tempo, elke 1,5 s) / gemiddeld (elke 3 s) / weinig (alleen kernmomenten).
   - **Effecten & geluid**: vol (pops, emoji, sfx) / gemiddeld / minimaal (alleen ondertitels + zooms).
   - **Tempo per type video** (zie onderzoek.md): uitleg/mythe = elke 1,2–2 s / motivatie = 2–3 s / rustig, serieus = 3–6 s.
   - **Hook-varianten**: bied aan om 3 versies met een andere hook te renderen voor een A/B-test.
   - **Knippen**: extra strak (`--gap 0.04`) / strak (`0.08`, standaard) / natuurlijk (`0.2`).
   - **Einde/CTA**: volg-kaart / vraag om reactie / niets.
3. Bij fotokeuzes: toon het overzicht (`assets/kandidaten/<zoekterm>/sheet.jpg`) met SendUserFile en laat
   de gebruiker het nummer kiezen (of kies zelf als de gebruiker dat zegt).
4. Pas na de antwoorden: storyboard.json schrijven → assets → stills → montageblad (Artifact) → renderen.
5. Na de render: vraag opnieuw met opties wat er beter kan (bv. "andere achtergrond bij X", "minder effecten", "andere hook", "zo laten").

## Wes.Built-montageregels (altijd toepassen)

Rol: compromisloze video-editor en retentiespecialist voor **Wes.Built**. Doel: kijker tot de laatste seconde vasthouden.

1. **Dead air eruit**: elke stilte, aarzeling en adempauze weg (`prepare`, standaard `--gap 0.08`). Tight, constante beweging.
2. **Micro-zoom om de 3–5 s** (100% → 110%, `ease: "punch"` of `"in"`, `to: 1.10`) en extra op cruciale momenten als visuele reset.
3. **Kinetic typography**: per zin 1–2 kernwoorden die groot oppoppen (`pop`, wit met groene accenten = preset `wesbuilt`),
   pop-in met lichte schaalvergroting op het moment dat het woord wordt uitgesproken. Nooit lappen tekst.
4. **Context-aware B-roll**: wat gezegd wordt direct koppelen aan een visueel element dat 1–2 s in beeld schiet
   en weer wegklapt (`image`, `emoji`, app-scherm zoals MacroFactor als eigen screenshot in de projectmap, grafiek, gym/wandel-beeld).
5. **Audio FX**: `whoosh` bij bewegingen en tekstwisselingen, subtiele `pop` bij keywords, `boom` op de punchline,
   `ding` bij een afronding; harde cuts zonder ruis (korte fades zitten in `prepare`).

**Oplevering bij een tekst of video-idee** (zonder video): geen voorleesscript, maar een
**Tijdlijn & Montage-Instructieblad** als tabel met kolommen
`Tijdstip | Cuts & Pacing | Tekst-overlays (Keywords) | B-roll & Visuele Effecten | Audio FX`.
Bij een echte video: hetzelfde blad als storyboard, daarna renderen met dit systeem.

## Wes.Built-methode (afgeleid van analyse van Jesse's video's, verbeterd)

Jesse (fitness-uitleg, 40–55 s, talking head aan tafel) wisselt **elke 1,4–2,3 s** van beeld. Dat tempo nemen we over,
maar strakker uitgevoerd. Per video wisselen deze lagen elkaar af, nooit twee keer dezelfde na elkaar:

| Laag | Wanneer | Hoe (beter dan Jesse) |
|---|---|---|
| `hook` (vaste titel bovenin) | 0–6/8 s: de mythe of vraag, 2 regels, eindigt op "…", accentwoord tussen `*sterretjes*`; `sub` = belofte ("wat het is + wat je moet nemen") | Strak getypeerd met geel accentwoord en een pill-ondertitel in plaats van platte tekst over het gezicht |
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
| Ondertitels | Altijd, 1–4 woorden per keer | Groter dan bij Jesse, kernwoorden geel (`captions.highlight`), altijd leesbaar |

Overgangen zijn **hard** (achtergrond/cutaway schiet in één frame in en uit, geen overvloeier): voorkeur van de gebruiker.
Effectdichtheid: **elke ~1,2 s iets nieuws** (bevestigd door de gebruiker bij dag 10).
Fotobronnen: Openverse; ligt die eruit, gebruik eerdere kandidaten uit andere projecten of vraag de gebruiker om eigen beelden.

Volgorde-ritme (herhalen): talking head + pop → scene/cutaway → talking head + emoji → image/chart → …
Een `scene` cutout vereist `tt.py person` (ISNet, ±1,8 s per frame; alleen frames van die beats).

### Schrijfstijl (bij script/idee-aanvragen, en voor hook-teksten)

1. **Hook (0–3 s):** val een bekende overtuiging aan, in de jij-vorm. "Hoe kan het nou dat…", "Ben je nou echt nog steeds…", "Als jij maar … doet, dan…". Geen intro, geen "hoi".
2. **Herkenning (3–8 s):** het gevoel/probleem van de kijker ("de weegschaal schiet omhoog").
3. **Uitleg via één analogie** (tank, spons, batterij) — die analogie krijgt een `scene`.
4. **Wetenschap in één zin**, simpel gehouden; vakterm mag als `pop`.
5. **Praktisch advies met een getal** ("20–40 gram halverwege je training") → `pop` look `big` met `sub` ("30 g" + "snelle koolhydraten") of `chart`.
6. **Open lus kort houden**: beloof het antwoord en geef het vóór ±8 s (Jesse wacht 16 s; dat is te lang).
7. **CTA met een knipoog** die terugkoppelt aan het onderwerp ("je kijkt toch dagelijks naar mijn video's, dus…") → `follow`-kaart.
8. **Vaste afsluiter**: een eigen herkenbare slotzin voor Wes.Built (voorstellen als keuze).
9. Sponsor: eerlijk benoemen ("ja, ik word gesponsord") + code als `pop` look `label`.

## Effectregels (wat bij welke tekst past)

| In de tekst | Effect |
|---|---|
| Eerste 2 s (hook / titel / serie) | `words` met de kern in 2 regels, `label` met serie/dag, `whoosh` |
| Emotie of ding dat je kunt zien (liefde, vuur, geld, tijd, hersenen…) | `emoji` (Fluent 3D, Engelse naam zoals "red heart", "fire", "money bag", "brain", "rocket"), `pop` |
| Kernwoord | `pop` look `sticker` (max 2 woorden) en het woord in `captions.highlight` |
| Punchline / climax | `pop` look `big` + `"sfx": ["riser", "boom"]` (riser piekt op het woord) + punch-zoom 1.12–1.15 |
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
- Eigen stijl: niet de look van andermans video's kopiëren. Presets: **`wesbuilt` (standaard, huisstijl: wit met legergroen #A3B462 van de Wes.Built-website)**, `grip` (geel, niet meer gebruiken tenzij gevraagd), `editorial`, `moody`, `pop`.

## Eén-zin-feedback vertalen

| Zin | Wijziging |
|---|---|
| "maak het moody / donkerder" | `style: "moody"` |
| "rustiger / chiquer" | `style: "editorial"`, minder `pop`/`emoji` |
| "grotere ondertitels" | `captions.size` +20–30 |
| "strakker knippen" | `prepare` opnieuw met `--gap 0.04` (losser: `--gap 0.2`) |
| "minder effecten" | elke tweede emoji/pop eruit, geen `sfx` behalve `boom`/`ding` |
| "andere hook" | eerste `words`-beat herschrijven |
| "geen geluidjes" | alle `sfx` weg |
