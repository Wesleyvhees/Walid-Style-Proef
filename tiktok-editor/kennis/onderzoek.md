# Onderzoek: hoe top-creators effecten en bewerkingen gebruiken

Laatst bijgewerkt: 3 november 2026. Bronnen staan onderaan. Let op: veel online "breakdowns" komen van
tool-verkopers en freelancers; cijfers daaruit zijn niet onafhankelijk getoetst. Eigen analyses van
video's (Jesse, zie onder) wegen zwaarder dan blogclaims.

## 1. Drie stijlen die het meest worden nagedaan

| Creator | Tempo | Ondertitels | Effecten | Wanneer gebruiken |
|---|---|---|---|---|
| **Alex Hormozi** | Jump cuts elke 1–3 s, punch-zooms | Woord-voor-woord, geel kernwoord, donkere/contrastrijke look | Oorspronkelijk emoji, SFX, animaties, B-roll. De 2026-variant ("Hormozi 2.0") houdt captions, cuts en zooms maar laat emoji, flitsende kleuren en SFX vallen | Directe, zakelijke tips met autoriteit |
| **Ali Abdaal** | Gematigd, rustig | Handgeschreven/zachte stijl | Desaturatie/zwart-wit met kleuraccent, rustige muziek | Reflectie, persoonlijke verhalen |
| **Leila Hormozi** | Langzaam: 3–8 s per shot | Strak en minimaal | Weinig | Serieuze boodschap, vertrouwen |
| **Jesse (eigen analyse, 3 video's)** | Beeldwissel elke 1,4–2,3 s | Klein, 1–3 woorden, geen nadruk | Achtergrond vervangen door beeld bij analogie, cutaways, memes, data-schermen, sponsorpagina | Fitness-uitleg / mythe ontkrachten |

**Les:** er is niet één goede stijl. Tempo moet passen bij het type video. Uitleg/mythe = snel (Jesse/Hormozi),
motivatie/verhaal = gemiddeld, serieuze of kwetsbare boodschap = rustig (Leila/Ali).

## 2. Retentie-principes die overal terugkomen

1. **De eerste 3 seconden beslissen.** Hook met een open lus, visuele schok of een tegendraadse uitspraak.
   Blogs noemen 50–70% kijkers na 3 s als richtwaarde (niet officieel van TikTok, wel consistent).
2. **Nieuwe informatie, niet alleen snelle cuts.** Mario Joos (voorheen retentie-strateeg bij MrBeast):
   het gaat om het tempo waarin je *nieuwe* informatie brengt, niet om de knipsnelheid.
   → Elk effect moet iets toevoegen (een beeld bij een analogie, een getal als grafiek), niet alleen versieren.
3. **Pattern interrupts** elke 2–5 s (zoom, hoekwissel, graphic pop). Te veel prikkels werkt averechts:
   vidIQ ziet "retentie-editing" op YouTube vermoeiend worden; Hormozi zelf schroeft emoji en SFX terug.
4. **Elke seconde moet zijn bestaan verdienen** (MrBeast-handboek): agressief knippen, geen dode lucht.
5. **B-roll 1–3 s** per cutaway; meer dan dat haalt het tempo eruit, te veel overweldigt.
6. **Ondertitels zijn verplicht** in 2026 (veel kijkers zonder geluid); woord-voor-woord met kernwoord-accent is standaard.
7. **Loop-einde**: laat het einde aansluiten op het begin (zelfde beeld/zin), dan kijken mensen een tweede keer.
8. **Test hooks**: dezelfde video met 3 verschillende hooks, vergelijk de retentiegrafiek in TikTok-analytics.

## 3. Geluid (sound design)

- **Whoosh** hoort bij beweging: laat hem net vóór de wissel starten zodat hij óp de beweging landt (systeem: 0,1 s eerder).
- **Riser** bouwt spanning op; de **piek moet precies op de onthulling/punchline** vallen (systeem: riser start 0,86 s eerder).
- **Riser → impact (boem)** samen geeft de zwaarste punchline (`"sfx": ["riser", "boom"]`).
- **Ding** bij een graphic die verschijnt of een afronding; **pop** subtiel bij kernwoorden.
- Geluid moet bij de actie passen; niet elk woord een geluidje (vermoeidheid).

## 4. Achtergrond vervangen (green screen-formaat)

- Het "beeld achter de spreker"-formaat is de standaard geworden voor uitleg- en commentaarvideo's: de telefoon wordt een presentatiescherm.
- Werkt het best bij analogieën, plekken, schermen/screenshots en producten.

## 6. Jesse, video 4: "De grootste fout die jij na je training maakt…" (63 s, eigen analyse)

Ander formaat dan zijn eerste drie: **één camera, geen achtergrondwissels**. Het tempo komt uit overlays.

- **Beeldkaarten direct boven zijn hoofd** (midden boven, ±40% breed), die elke 1–3 s wisselen: shake, collage,
  eten, grafiek, anatomie, poeder. Grote scènewissels maar elke ~4 s; de kaarten doen het werk.
- **Terugkerend motief:** de analogie "glycogeen = batterij" komt steeds terug als batterij-plaatje
  (vol → geel → rood). Dat bindt de uitleg aan elkaar. Bij hem zijn dat losse stilstaande plaatjes.
- **Kijker-stem:** "Maar wat dan, Jesse?" speelt hij zelf als de kijker, met de camera vlak voor zijn gezicht
  (groothoek, scheef). Grappige pattern interrupt die de vraag van de kijker hardop stelt.
- **Hook:** "Ik hou niet van gatekeepen, dus ik ga een van de grootste mythes ontrafelen…" + open lus
  "Maar wat als ik jou vertel dat…". Titel in pixel/mono-letter in zwarte balkjes, 0–12 s.
  Zwak punt: het antwoord komt pas na ±16 s (lang uitstel).
- **Getallen** ("30 gram", "20–30 gram") worden alleen als productfoto getoond, niet als getal.
- **Vaste afsluiter:** woordgrap die het onderwerp aan volgen koppelt ("over opnemen gesproken… volgen")
  en altijd dezelfde slotzin ("Jij bent niet waar" / "jo prima"). Herkenbaar handtekening-einde.
- **Zwakke punten:** kaarten bedekken soms zijn gezicht; ondertitels klein zonder nadruk; stilstaande plaatjes.

**Wat het systeem beter doet:**
| Jesse | Wes.Built |
|---|---|
| Batterij als losse plaatjes | `meter`-graphic die **live** leegloopt en vol raakt op de woorden (groen → geel → rood, met %) |
| Getal alleen als foto | `pop` look `big` met `sub`: "30 g" + label "snelle koolhydraten" + riser/boom |
| Kijker-stem door camera te verplaatsen | `persona`: automatische close-up (134%), scheef, iets andere kleur + label "jij:" |
| Kaarten soms over het gezicht | `image`-kaarten altijd boven het hoofd (y ±230–520), nooit over ogen/mond |
| Antwoord pas na 16 s | Open lus binnen 2 s sluiten met een tussenbelofte; antwoord vóór ±8 s |

## 5. Wat dit betekent voor Wes.Built (vertaald naar regels in SKILL.md)

- Kies het tempo per video-type (vraag het als keuze): uitleg = elke 1,2–2 s iets nieuws, motivatie = 2–3 s, rustig = 3–6 s.
- Elk effect moet nieuwe info of emotie toevoegen; geen emoji die alleen het gesproken woord herhaalt als er al veel gebeurt.
- Punchline: `["riser", "boom"]` + punch-zoom. Whooshes op wissels, max één geluid per 1 s.
- Overweeg een loop-einde en bied 3 hook-varianten aan (voor A/B-test).

## Bronnen

- Choppity – stijlen Alex Hormozi / Ali Abdaal / Leila Hormozi: https://www.choppity.com/tools/recreate-video-editing-style/alex-hormozi/ , https://www.choppity.com/tools/recreate-video-editing-style/ali-abdaal/ , https://www.choppity.com/tools/recreate-video-editing-style/leila-hormozi/
- Riverside – Hormozi-stijl: https://riverside.com/blog/hormozi-style-videos
- Joyspace – Hormozi-stijl in 2026: https://joyspace.ai/hormozi-editing-style-2026-analysis
- Joyspace – pattern interrupts: https://joyspace.ai/pattern-interrupt-reset-attention-span
- Dev.to – hook engineering eerste 3 s: https://dev.to/bulkdl/hook-engineering-the-science-of-the-first-3-seconds-in-short-form-video-2026-2jp9
- Blitzcut – watch time via editing: https://blitzcutai.com/blog/increase-tiktok-watch-time-editing
- Passionfruit – uitgelekt MrBeast-handboek: https://passionfru.it/newsletter/archive/a-leaked-handbook-on-youtubes-biggest-star
- Fortune – MrBeast-handboek: https://fortune.com/2024/09/26/youtube-mrbeast-jimmy-donaldson-leaked-business-handbook-advice/
- Vidpros – Mario Joos over retentie-editing: https://vidpros.com/retention-editing-what-you-can-learn-from-mario-joos/
- vidIQ – "Retention Editing is DEAD": https://rosetta.to/u/vidiq/retention-editing-is-dead
- Epidemic Sound – risers: https://www.epidemicsound.com/fr/sound-effects/categories/designed/riser/
- Filmora – whoosh-timing: https://filmora.wondershare.com/audio-editing-tips/whoosh-sound-effect.html
- Fish Audio – SFX voor short-form: https://fish.audio/blog/using-sound-effects-for-short-form-content
- Splice – B-roll voor TikTok: https://spliceapp.com/blog/runway-b-roll-editing-for-tiktok-beginners/
- PostEverywhere – TikTok green screen: https://posteverywhere.ai/social-media-terms/tiktok-green-screen
- The Social Cat – video loops: https://thesocialcat.com/glossary/video-loop-short-form-content
- Opus – editing-esthetiek 2026: https://www.opus.pro/blog/editing-aesthetics-dominating-short-form-2026


## 2026-11-06 · De 3-secondenoorlog en hoekstapeling (online onderzoek)
- Kijker beslist in ±0,5–1,5 s; hook binnen 1–1,5 s. TikTok's eigen creative-advies: propositie in de eerste 3 s.
- Tekst in beeld + fysieke beweging in de eerste 2 s geeft volgens een (vendor)bron tot ±50% betere 3-secondenretentie dan een statische opening.
- Doel: ±65%+ kijkers nog aanwezig op 3 s (bronnen lopen uiteen; check de retentiecurve in TikTok Studio).
- Aandacht dwaalt na ±2–4 s zonder verandering → re-hook/visuele onderbreking elke paar seconden (extrapolatie, geen vaste regel).
- Open lussen (nieuwsgierigheid) zijn de betrouwbaarste hooks; twee intrige-elementen in één zin stapelen.
- Ranking: kijktijd, completion, herbekijken, shares en saves (zwaarder dan likes), reacties, volgen.
- SEO: TikTok leest beschrijving, tekst in beeld, gesproken woord en hashtags → hetzelfde trefwoord natuurlijk in alle drie, vroeg in de video; geen keyword-stuffing.
Bronnen: insights.ttsvibes.com/?p=533 · opus.pro/blog/tiktok-length-format-retention-data · dev.to/bulkdl/hook-engineering-the-science-of-the-first-3-seconds-in-short-form-video-2026-2jp9 · teleprompter.com/blog/tiktok-3-second-rule · nestscale.com/?p=47200 · adamconnell.me/improve-video-retention-social-media · openclip.app/guides/hook-optimization-guide · seosherpa.com/tiktok-search-engine · socialpilot.co/blog/tiktok-seo · capcut.com/create/tiktok-caption-keywords-discoverability · darkroomagency.com/observatory/tiktok-algorithm-guide-2026 · socialchamp.com/blog/tiktok-algorithm


## 2026-11-10 · Video "hooks" (Kallaway, @kallaway.marketing, 82 s, Engels) — door Wes gestuurd
- Klassiek verhaal (conflict → opbouw → climax → afloop → oplossing) werkt niet op social: mensen scrollen weg vóór de opbouw goed wordt.
- **Modern story arc**: begint op 70/100. Hook (eerste ±5 s) geeft razendsnel context. Binnen 5–10 s piek naar 90: contrast-moment,
  tegendraadse uitspraak of schokkend getal ("dopamine"). Daarna ontlading → nieuwe piek, steeds opnieuw haken tot het einde;
  geen climax in het midden maar gestapelde pieken.
- Montage: frame 1 = bewijs-screenshot (retentiegrafiek met dip) + titel met rode kernwoorden; split-screen (graphic bovenin op zwart,
  spreker onderin in afgerond kader) afgewisseld met volledig gezicht om de 2–4 s; lijngrafiek die zichzelf tekent met een tijdsbalk;
  rode labels die zich opstapelen (Contrast Moment / Contrarian Take / Shocking Stat); titels vet + schuin schreeflettertype;
  ondertitel 1 woord tegelijk; CTA "Comment LAUNCH" (reageer-woord → link in DM); eindkaart TikTok-logo + zoekbalk.
- Toegepast: zie lessen.md 2026-11-10 en SKILL.md "Pieken stapelen".

## 2026-11-10 · Nieuwe effecten (Wes: "deze effecten zijn ruk, ik wil totaal wat anders")
Bronnen (zoekresultaten; de pagina's zelf waren hier niet bereikbaar): teleprompter.com TikTok trends 2026, newengen.com feb-2026
TikTok trends (reality-tv-montage: frankenbiting, agressieve face zoom-ins, spannende muziek, cliffhanger-freezes), goldmine-blog
(beat-sync is standaard geworden, geen onderscheid meer), lightreel.ai (knippen moet de informatie volgen, niet elke adem),
fontmirror.com en pixflow.net (kinetische typografie is hoofdzaak, kernwoord-kleur is standaard, rustiger tempo), offshoreclipping.com
(kleine animaties, voortgangsbalken), joyspace.ai (Hormozi-stijl 2026: zachte overgangen i.p.v. harde pops, echte B-roll i.p.v.
stock-emoji's), recapio/Hormozi-tutorials (uitzoom-overgangen, lichtstreep over tekst), opus.pro (brainrot-stack, video-essay-stijl).
Voorstellen (keuzemenu nieuwfx): A tekst achter je hoofd, B groot kinetisch woord, C zoekbalk die typt, D rollende teller,
E reality-tv bevriezing, F uitzoomen naar kaart, G lichtstreep-titel, H notities-app, I voortgangsbalk, J snelheidssprong.
