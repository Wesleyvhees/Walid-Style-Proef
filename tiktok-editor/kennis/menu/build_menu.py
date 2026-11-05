# Bouwt het bewerkingsmenu (Artifact) uit stills van eerdere projecten. Paden S/OUT aanpassen per sessie.
import base64, subprocess, html, os
S="/tmp/claude-0/-home-user-Walid-Style-Proef/388aed99-c647-56db-a8d8-2f724b621cca/scratchpad/projects"
OUT="/tmp/claude-0/-home-user-Walid-Style-Proef/388aed99-c647-56db-a8d8-2f724b621cca/scratchpad/menu"
def img(rel):
    if not rel: return None
    src=f"{S}/{rel}"; dst=f"{OUT}/{rel.replace('/','_')}.jpg"
    subprocess.run(["ffmpeg","-y","-v","error","-i",src,"-vf","scale=270:-1","-q:v","5",dst],check=True)
    return "data:image/jpeg;base64,"+base64.b64encode(open(dst,"rb").read()).decode()

SECTIONS=[
 ("S","Serie en template","Bepaalt de hele stijl. Kies er altijd één.",[
  ("S1","Van nul naar grip","Motivatie, dag X. Harde look: bijna zwart-wit, veel contrast, harde impact-woorden met boem. Geen kleur, geen plaatjes.","Dag 11: 'Je hoeft niet perfect te zijn'","dag11/stills/still_7.14.png"),
  ("S2","Slimmer eten, drinken en trainen 2.0","Uitleg: MYTHE/FEIT, labels, grafiek, tip-kaartje, checklist, foto's, groen accent.","Dag 22: weegschaal","dag22/stills/still_17.66.png"),
  ("S3","75 kilo blauwdruk","Tips om geleidelijk af te vallen. Layout van de cardio-video, met Tip 1, Tip 2.","'Cardio maakt je niet strak'","cardio/stills/still_2.8.png"),
  ("S4","Losse video","Geen serie. Vrije keuze binnen de vaste indeling.","'Mijn shape na de vakantie'","v9/stills/still_0.6.png"),
 ]),
 ("N","Nieuwe effect template","17 effecten uit je voorbeeldvideo, in je eigen stijl. Met teller '03/17' als open lus.",[
  ("N1","Orbit","Kaartjes met je eigen video's draaien om je heen, voor en achter je langs.","Proefvideo","effecttest/menu/fx1.png"),
  ("N2","Couch wall","De muur achter je wordt een wand vol screenshots.","Proefvideo","effecttest/menu/fx2.png"),
  ("N3","UI world","Jij in een app-scherm waarin een opdracht wordt getypt.","Proefvideo","effecttest/menu/fx3.png"),
  ("N4","Frame break","Je video krimpt tot een kader en jij steekt eruit.","Proefvideo","effecttest/menu/fx4.png"),
  ("N5","Digital zoom","Snel naar een close-up met bewegingsonscherpte, als een tweede camera.","Proefvideo","effecttest/menu/fx5.png"),
  ("N6","Chart grow","Lichtgevende lijngrafiek tekent zich over het beeld.","Proefvideo","effecttest/menu/fx6.png"),
  ("N7","Checklist","Vinkjes springen aan op je woorden.","Proefvideo","effecttest/menu/fx7.png"),
  ("N8","Headline wall","Papieren koppen poppen een voor een om je heen op.","Proefvideo","effecttest/menu/fx8.png"),
  ("N9","Zoom-through cut","Overgang: het beeld zoomt met vervaging door naar het volgende stuk.","Proefvideo","effecttest/menu/fx9.png"),
  ("N10","Phone mockup","Telefoon met app schuift in beeld, knop wordt ingedrukt.","Proefvideo","effecttest/menu/fx10.png"),
  ("N11","Vertigo","De achtergrond zoomt, jij blijft even groot.","Proefvideo","effecttest/menu/fx11.png"),
  ("N12","Doodle boil","Getekende lijn om je heen die trilt, plus krabbels.","Proefvideo","effecttest/menu/fx12.png"),
  ("N13","Paper cut","Jij als papieren uitsnede op een collage met knipletters.","Proefvideo","effecttest/menu/fx13.png"),
  ("N14","Glass type","3D-letters van glas achter je.","Proefvideo","effecttest/menu/fx14.png"),
  ("N15","Green screen","Jij voor een donker vlak, je clip als scherm erboven.","Proefvideo","effecttest/menu/fx15.png"),
  ("N16","Cover story","Tijdschriftcover met een grote titel achter je hoofd.","Proefvideo","effecttest/menu/fx16.png"),
  ("N17","Pull-back reveal","Je video blijkt in een app-venster te zitten, met voortgang.","Proefvideo","effecttest/menu/fx17.png"),
 ]),
 ("D","Doel van de video","Wat moet de kijker doen of voelen? Dit stuurt het einde en het tempo.",[
  ("D1","Blijven kijken","Maximale kijktijd: snelle wissels, open lus in de hook, punchline aan het eind.","Uitleg- en mythevideo's",None),
  ("D2","Reacties krijgen","Eindigt met een vraag of 'Comment SCHEMA'. Reacties helpen het bereik.","'Comment SCHEMA en ik stuur je…'",None),
  ("D3","Volgers erbij","Eindigt met de volg-kaart en een reden om te volgen.","'Volg voor dag 11'",None),
  ("D4","Vertrouwen en uitleg","Rustiger, meer getallen en bewijs, minder geluidjes.","Coaching en resultaten",None),
 ]),
 ("H","Hook, de eerste seconde","Groot bovenaan vanaf het eerste beeld: een uitspraak die een vreemde in 1 seconde snapt, met het hoofdtrefwoord. Serie en dag klein in het pilletje.",[
  ("H1","Mythe + stempel","Valt een overtuiging aan, met een rood MYTHE-stempel en een boem.","'Cardio maakt je niet strak' + MYTHE","cardio/stills/still_2.8.png"),
  ("H2","Serietitel + dag","Alleen op verzoek: uit je kijkcijfers blijkt dat een serienaam vreemden niet pakt.","'Van nul naar grip' + 'Dag 10'","dag10grip/stills/still_1.0.png"),
  ("H5","Eerste zin als hook","Je eerste zin groot bovenin, het pilletje eronder. Standaard sinds dag 11.","'Je hoeft niet perfect te zijn'","dag11/stills/still_0.96.png"),
  ("H3","Vraag aan de kijker","Herkenning: de kijker denkt 'dat ben ik'.","'Zweet jij je kapot op de hometrainer?'","cardio/stills/still_0.8.png"),
  ("H4","Eerlijke titel","Persoonlijk en open, past bij een body check of update.","'Mijn shape na de vakantie' + 'body check'","v9/stills/still_0.6.png"),
 ]),
 ("T","Tekst die oppopt","Kernwoorden op het moment dat je ze zegt. Staat gecentreerd, net boven de ondertitels.",[
  ("T8","Hard impact-woord","Slaat snel neer, trilt na en geeft een schok in beeld, met een diepe boem. Vast bij Van nul naar grip.","TRAINING, MAALTIJD, GRIP","dag11/stills/still_4.87.png"),
  ("T1","Impact-woord","Groot wit woord slaat neer, witte lijn en holle echo. Zonder kleur (motivatie).","STRONG, UNSTOPPABLE","dag10grip/stills/still_5.3.png"),
  ("T2","Sticker","Kernwoord op een groen vlak, iets scheef.","KRACHTTRAINING","cardio/stills/still_12.8.png"),
  ("T3","Stempel","Rood of groen stempel dat neerslaat, bij mythe/feit of een punchline.","MYTHE, FLUFFY","v9/stills/still_6.0.png"),
  ("T4","Groot getal + label","Het advies als getal, met uitleg eronder.","'3 of 4' + 'keer krachttraining per week'","cardio/stills/still_31.6.png"),
  ("T5","Streep onder woord","Wit woord met een groene streep die eronder veegt.","Definitie","cardio/stills/still_21.9.png"),
  ("T6","Label","Klein label voor een tip, stap of opbouw.","'Tip 1', 'Zonder kracht'","menu/stills/still_11.0.png"),
  ("T7","Typend kaartje","Kaartje dat zichzelf typt en afvinkt. Goed voor een tip of les.","'Weeg je elke ochtend' → 'Kijk naar het weekgemiddelde'","menu/stills/still_3.2.png"),
 ]),
 ("B","Beelden bij wat je zegt","Visuele uitleg die 1 à 2 seconden in beeld schiet. Nooit over je gezicht.",[
  ("B1","3D-icoon","Klein 3D-plaatje bij een emotie of ding.","Fiets bij 'hometrainer'","cardio/stills/still_1.9.png"),
  ("B2","Fotokaart","Foto als kaartje boven je hoofd, met een label.","Halterschijven + 'De basis'","cardio/stills/still_7.6.png"),
  ("B3","Cutaway","Foto schermvullend, jij blijft hoorbaar.","Sportschool + 'Consistent'","cardio/stills/still_16.6.png"),
  ("B4","Uitgeknipt voor achtergrond","Jij uitgeknipt voor een beeld dat past bij je vergelijking.","Bergtop bij 'strong'","dag10v4/stills/still_5.4.png"),
  ("B5","Kader voor beeld","Jij in een afgerond kader voor een beeld of scherm (bv. MacroFactor).","Telefoon bij 'afleiden'","dag10v4/stills/still_8.9.png"),
 ]),
 ("G","Getallen en vergelijkingen","Maakt uitleg zichtbaar.",[
  ("G1","Batterij-meter","Loopt live leeg of vol op je woorden.","Glycogeen 100% → 18%","test/stills/still_1.0.png"),
  ("G2","Tank-meter","Wijzer die oploopt.","Uithouding 35% → 90%","cardio/stills/still_10.5.png"),
  ("G3","Grafiek","Staafjes die optellen, uitschieter in groen.","Gewicht per dag","dag22/stills/still_10.3.png"),
  ("G4","Checklist","Lijstje waarvan de vinkjes aanspringen op je woorden. Komt terug bij de afsluiter.","Omtrekken, spiegel, kleding","dag22/stills/still_20.69.png"),
  ("G5","Typend tip-kaartje","Kaartje typt de fout en springt met een vinkje naar het betere advies.","'Weeg je elke ochtend' > 'Kijk naar de trend'","dag22/stills/still_16.0.png"),
 ]),
 ("C","Camera en beweging","Zorgt voor beweging zonder dat je opnieuw hoeft te filmen.",[
  ("C1","Zooms op kernwoorden","Korte punch-zoom op belangrijke woorden, langzame zoom op rustige stukken.","Standaard aan",None),
  ("C2","Zooms op de beat","Kleine zooms op de maat van je muziek.","Bij video's met muziek",None),
  ("C3","Virtuele multicam","Wide, medium en close-up uit één opname, wissels op de beat.","'Mijn shape na de vakantie' multicam","v9multi/stills/still_7.3.png"),
  ("C5","Om en om inzoomen na een knip","Na elke knip 100% of 108% rond je gezicht, zodat een knip voelt als een camerawissel. Standaard aan.","Alle video's",None),
  ("C4","Kijker-stem","Close-up, scheef, met label 'jij:' als je de vraag van de kijker stelt.","'Maar wat dan?'","test/stills/still_5.0.png"),
 ]),
 ("K","Knippen","Hoe strak de stiltes eruit gaan.",[
  ("K1","Extra strak","Elke pauze boven 0,04 s eruit. Heel snel.","Snelle tips",None),
  ("K2","Strak (standaard)","Pauzes boven 0,08 s eruit.","Meeste video's",None),
  ("K3","Natuurlijk","Pauzes boven 0,2 s eruit. Rustiger.","Persoonlijke verhalen",None),
  ("K4","Poses en muziek houden","Niets wegknippen tussen je zinnen.","Body check",None),
  ("K5","Takes samenvoegen","Losse takes (één zin per video) achter elkaar tot één video.","Video 1 t/m 8 = cardio",None),
 ]),
 ("A","Geluid","Geluidseffecten op de beelden en woorden.",[
  ("A1","Vol","Whoosh bij wissels, pop bij kernwoorden, boem op stempels en de punchline, ding bij vinkjes. Iets zachter sinds dag 22, geen pieptoon (riser).","Uitleg-video's",None),
  ("A2","Alleen de grote momenten","Whoosh bij wissels en boem op de punchline.","Motivatie",None),
  ("A3","Geen geluidjes","Alleen je stem (en je eigen muziek).","Serieuze boodschap",None),
 ]),
 ("O","Ondertitels","Altijd gecentreerd met een donkere letterrand.",[
  ("O1","Standaard","Op vaste hoogte, kernwoorden in de kleur van de template (groen of wit).","Alle series",None),
  ("O2","Groot","Ongeveer 30% groter, voor kijkers zonder geluid.","Als je weinig effecten wilt",None),
  ("O3","Geen","Geen ondertitels (bijvoorbeeld als je ze zelf in TikTok toevoegt).","",None),
 ]),
 ("E","Einde","Wat de kijker als laatste ziet.",[
  ("E5","Volg-stempel","Je echte TikTok-profielkaart slaat neer als stempel, met 2 s eindbeeld. Voorkeur.","@wes.built","dag22/stills/still_27.28.png"),
  ("E1","Volg-kaart","Profielkaart @wes.built die naar 'Volgend' springt.","'Volg mij'","v9/stills/still_10.2.png"),
  ("E2","Reactie-kaart","Vraagt om een reactie met een codewoord.","'Comment SCHEMA'",None),
  ("E3","Groot advies","Eindigt op het advies als groot getal.","'3 of 4 keer per week'","cardio/stills/still_31.6.png"),
  ("E4","Niets","Eindigt op je laatste zin.","",None),
 ]),
]
cards=[]
for code,title,intro,items in SECTIONS:
    rows=[]
    for c,name,desc,ex,pic in items:
        im=img(pic)
        thumb=f'<img src="{im}" alt="Voorbeeld {html.escape(name)}" loading="lazy">' if im else f'<div class="noimg" aria-hidden="true">{c}</div>'
        rows.append(f'''<article class="opt">{thumb}<div class="txt"><span class="code">{c}</span><h3>{html.escape(name)}</h3><p>{html.escape(desc)}</p>{f'<p class="ex">{html.escape(ex)}</p>' if ex else ''}</div></article>''')
    cards.append(f'''<section id="{code.lower()}"><div class="sh"><span class="big">{code}</span><div><h2>{html.escape(title)}</h2><p>{html.escape(intro)}</p></div></div><div class="grid">{''.join(rows)}</div></section>''')
nav="".join(f'<a href="#{c.lower()}">{c} · {html.escape(t)}</a>' for c,t,_,_ in SECTIONS)
page=f'''<title>Wes.Built bewerkingsmenu</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=Archivo:wght@400;600&family=IBM+Plex+Mono:wght@400;600&display=swap">
<style>
/* Layout: menukaart van een sportzaal: secties met een grote lettercode, opties als kaartjes met een 9:16-voorbeeld. Huisstijl Wes.Built (donker, legergroen). */
:root{{--bg:#141310;--panel:#1d1b17;--ink:#ece8e0;--muted:#a39d91;--line:#35322b;--accent:#a3b462;--accent-ink:#141310;
--f-display:"Big Shoulders Display","Arial Narrow",Impact,sans-serif;--f-body:"Archivo",system-ui,sans-serif;--f-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;color-scheme:dark}}
@media (prefers-color-scheme: light){{:root:not([data-theme="dark"]){{--bg:#e7e4de;--panel:#f4f2ee;--ink:#16140f;--muted:#5e5a51;--line:#c5c0b5;--accent:#4b5320;--accent-ink:#ffffff;color-scheme:light}}}}
:root[data-theme="light"]{{--bg:#e7e4de;--panel:#f4f2ee;--ink:#16140f;--muted:#5e5a51;--line:#c5c0b5;--accent:#4b5320;--accent-ink:#ffffff;color-scheme:light}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 var(--f-body);padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}}
main{{max-width:1100px;margin:0 auto;padding-block:28px 72px}}
.k{{font-family:var(--f-mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}}
h1{{font-family:var(--f-display);font-weight:900;text-transform:uppercase;font-size:clamp(44px,11vw,96px);line-height:.9;margin:.15em 0 .25em;text-wrap:balance}}
h1 em{{font-style:normal;color:var(--accent)}}
.lead{{max-width:62ch;color:var(--muted)}}
.how{{margin:22px 0 8px;padding:16px 18px;border:1px solid var(--line);border-radius:14px;background:var(--panel);display:grid;gap:6px}}
.how code{{font-family:var(--f-mono);background:var(--bg);padding:2px 7px;border-radius:6px;border:1px solid var(--line)}}
nav{{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 8px}}
nav a{{font-family:var(--f-mono);font-size:12px;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;color:var(--ink);border:1px solid var(--line);border-radius:999px;padding:6px 11px}}
nav a:hover,nav a:focus-visible{{border-color:var(--accent);color:var(--accent);outline:none}}
section{{padding-top:36px}}
.sh{{display:flex;gap:16px;align-items:flex-end;border-bottom:2px solid var(--ink);padding-bottom:10px;margin-bottom:16px}}
.sh .big{{font-family:var(--f-display);font-weight:900;font-size:72px;line-height:.8;color:var(--accent)}}
.sh h2{{font-family:var(--f-display);font-weight:900;text-transform:uppercase;font-size:clamp(28px,5vw,40px);line-height:.95;margin:0;text-wrap:balance}}
.sh p{{margin:4px 0 0;color:var(--muted);font-size:15px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}}
.opt{{display:grid;grid-template-columns:96px 1fr;gap:12px;align-items:start;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:10px;min-width:0}}
.opt img,.noimg{{width:96px;aspect-ratio:9/16;max-width:100%;border-radius:9px;object-fit:cover;display:block;background:var(--bg)}}
.noimg{{display:grid;place-items:center;font-family:var(--f-display);font-weight:900;font-size:34px;color:var(--line);border:1px dashed var(--line)}}
.txt{{min-width:0}}
.code{{display:inline-block;font-family:var(--f-mono);font-weight:600;font-size:13px;background:var(--accent);color:var(--accent-ink);border-radius:6px;padding:1px 8px}}
.opt h3{{margin:6px 0 4px;font-family:var(--f-display);font-weight:800;text-transform:uppercase;font-size:22px;line-height:1}}
.opt p{{margin:0;font-size:14px;color:var(--muted)}}
.opt p.ex{{margin-top:6px;font-family:var(--f-mono);font-size:12px;color:var(--ink)}}
.opt p.ex::before{{content:"Voorbeeld: ";color:var(--muted)}}
footer{{margin-top:44px;padding:18px;border-radius:14px;border:1px solid var(--accent)}}
</style>
<main>
<div class="k">Wes.Built · TikTok-editor</div>
<h1>Bewerkings<em>menu</em></h1>
<p class="lead">Alle opties die je kunt kiezen als ik je video bewerk, met een voorbeeld uit je eigen video's. Elke optie heeft een code. Bij een nieuwe video krijg je eerst een vragenlijst; je kunt ook direct codes noemen.</p>
<div class="how"><div class="k">Zo kies je</div><div>Noem per groep een code, bijvoorbeeld <code>S3 D2 H1 T2+T4 B4 G1 K2 A1 O1 E1</code>. Meerdere opties in één groep mag met een plus.</div><div>Geen idee? Zeg <code>jij kiest</code>, dan stel ik een combinatie voor die bij de serie past.</div></div>
<nav aria-label="Groepen">{nav}</nav>
{''.join(cards)}
<footer><div class="k">Vaste regels (gelden altijd)</div><p>Tekst gecentreerd · hook bovenaan vanaf het eerste beeld · pop-tekst net boven de ondertitels (of boven je hoofd) · ondertitels onderaan, max 3 woorden · donkere letterrand · geen rare leestekens · stiltes eruit · nooit gespiegeld · elke video andere plaatjes.</p>
<p><b>Altijd automatisch:</b> schone stem (ruis eruit, s-klanken zachter) · zachte knippen zonder klik · ondertitels strak op je stem · eerst de tekst ter controle · foto's uit vrije beeldbanken (Wikimedia Commons, Openverse, Pixabay zodra de sleutel werkt) · na de video een SEO-pakket met beschrijving, trefwoorden, verborgen woorden en hashtags.</p></footer>
</main>'''
open(f"{OUT}/bewerkingsmenu.html","w").write(page)
print("ok", os.path.getsize(f"{OUT}/bewerkingsmenu.html"))
