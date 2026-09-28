# Shopify-installatie: stap voor stap

Dit pakket bevat:
- `producten-import.csv`: 7 producten, klaar om te importeren. Het LED-masker staat als concept (fase 2).
- `paginas/*.html`: Over ons, Veelgestelde vragen, Verzending & retour, Garantie, Contact en het herroepingsformulier.

Vervang overal **Veloxity**, **[Adres]**, **[e-mailadres]**, **[nummer]** en **[Retouradres]** door je eigen gegevens. Zoek in de bestanden op `[` om ze allemaal te vinden.

---

## Stap 1: account & basis (±30 min)
1. Maak een account aan op shopify.com en kies het **Basic**-plan (proefperiode).
2. **Instellingen → Winkeldetails:** vul je winkelnaam, e-mailadres, **KvK-nummer, btw-id en adres** in. In NL ben je verplicht deze gegevens te tonen.
3. **Instellingen → Markten:** zet Nederland als hoofdmarkt en voeg België toe. Valuta: EUR.
4. **Instellingen → Talen:** Nederlands als standaardtaal.
5. **Instellingen → Belastingen en heffingen:** zet de btw aan en vink aan dat **prijzen inclusief btw** zijn. Verkoop je boven de EU-drempel van €10.000 per jaar aan consumenten buiten NL, regel dan OSS (overleg met je boekhouder).

## Stap 2: betalingen (±15 min)
1. **Instellingen → Betalingen:** activeer Shopify Payments of Mollie.
2. Zet aan: **iDEAL, Bancontact**, creditcard, Klarna en PayPal.

## Stap 3: verzending (±10 min)
1. **Instellingen → Verzending en levering:** maak een zone "NL + BE" aan met **gratis verzending** (de verzendkosten zitten al in de inkoopprijs).
2. Als je dropshipt, koppel je de leverancier-app (bijvoorbeeld CJ Dropshipping) en controleer je de levertijd per land.

## Stap 4: producten importeren (±10 min)
1. **Producten → Importeren**, kies `producten-import.csv`. Vink **niet** "bestaande producten overschrijven" aan.
2. Controleer na de import per product:
   - Voeg **foto's en video** toe (van de samples of van de leverancier, met toestemming). Er staan nog geen afbeeldingen in de CSV.
   - Controleer de **kostprijs per artikel** (inkoop). Die is al ingevuld, zodat Shopify je marge laat zien.
   - Controleer de **voorraad**. Die staat op "doorgaan met verkopen als de voorraad op is". Dat is gebruikelijk bij dropshipping, maar controleer of je leverancier voorraad heeft.
3. Het **LED-masker** staat als concept en is dus nog niet zichtbaar. Zet het pas live in fase 2.

## Stap 5: collecties (±10 min)
Maak onder **Producten → Collecties** automatische collecties aan op producttype:

| Collectie | Voorwaarde |
|---|---|
| Knie & gewrichten | Producttype = Knie & gewrichten |
| Nek & schouders | Producttype = Nek & schouders |
| Ogen & ontspanning | Producttype = Ogen & ontspanning |
| Comfortsets | Producttype = Comfortsets |
| Accessoires | Producttype = Accessoires |

## Stap 6: pagina's & navigatie (±20 min)
1. **Online winkel → Pagina's:** maak voor elk bestand in `paginas/` een pagina aan. Schakel over naar de HTML-weergave (`<>`) en plak de inhoud. Gebruik als URL-handles `over-ons`, `veelgestelde-vragen`, `verzending-retour`, `garantie`, `contact` en `herroepingsformulier`.
2. **Instellingen → Beleid:** laat Shopify het **privacybeleid, de algemene voorwaarden en het retourbeleid** genereren en pas ze aan. Laat dit bij voorkeur controleren, of gebruik de algemene voorwaarden van Thuiswinkel of een jurist.
3. **Online winkel → Navigatie:**
   - Hoofdmenu: Knie & gewrichten · Nek & schouders · Ogen & ontspanning · Comfortsets · Veelgestelde vragen · Contact
   - Footer: Over ons · Verzending & retour · Garantie · Herroepingsformulier · Privacybeleid · Algemene voorwaarden

## Stap 7: thema (±1–2 uur)
1. Gebruik het gratis **Dawn**-thema (snel en betrouwbaar).
2. Kleuren: warm en rustig, bijvoorbeeld crème als achtergrond, donkerbruin of antraciet voor tekst en een warm terracotta of oranje voor de knoppen.
3. Bouw de homepage op volgens `winkelstructuur-en-upsell-flow.md` §2: hero-video, vertrouwenssignalen, "kies jouw comfortzone", comfortsets, reviews en de veelgestelde vragen.
4. Productpagina: zet de **2-pack standaard aan** (via de bundel-app, zie stap 8) en voeg een blok toe met de levertijd.

## Stap 8: apps & upsells (±1 uur)

| App | Instelling |
|---|---|
| **Kaching Bundles** | Knie-massager: 1 / 2 / 3 stuks, met de 2-pack standaard aan en het label "Meest gekozen" |
| **Frequently Bought Together** of **UpCart** | Op de productpagina van de knie: nekmassager met korting naar **€44,95** (normaal €59,95), plus de XL-verlengband voor €9,95 |
| **ReConvert** of **AfterSell** | Na betaling, met 1 klik: oogmassager voor **€34,95** |
| **Judge.me** | Reviews, en na 10 dagen automatisch een reviewverzoek met 10% korting |
| **Klaviyo** | De flows uit §5 van het winkelplan: verlaten winkelwagen, onboarding, review en cross-sell |

> **Aangepast ten opzichte van het winkelplan:** de upsell "2 jaar extra garantie (€7,95)" is vervangen door de **XL-verlengband (€9,95, bijdrage ~€5,33)**. In NL heeft de consument al wettelijke garantie (conformiteit). Een betaalde "extra" garantie die grotendeels die wettelijke rechten dekt, kan als misleidend worden gezien.

## Stap 9: tracking (±30 min)
1. Installeer de app **Facebook & Instagram (Meta)**: koppel de Pixel en de Conversions API met de datadeling op "Maximaal".
2. Installeer de **TikTok**-app voor de TikTok Pixel.
3. Installeer **Google & YouTube** voor Google Analytics 4.
4. Zet een cookiebanner aan via de ingebouwde Shopify Customer Privacy-instellingen. Dat is verplicht in de EU.

## Stap 10: testen vóór livegang
- [ ] Plaats een testbestelling met de testmodus aan en controleer de upsells, de korting en de bevestigingsmail.
- [ ] Controleer de mobiele weergave van de homepage, de productpagina en de checkout.
- [ ] Controleer dat alle [placeholders] zijn vervangen.
- [ ] Controleer dat er nergens medische claims staan ("geneest", "artrose", "pijnvrij").
- [ ] Controleer dat de KvK- en btw-gegevens zichtbaar zijn in de footer of op de contactpagina.
- [ ] Haal het wachtwoord van de winkel af: **Online winkel → Voorkeuren**.
