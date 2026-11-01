# Jawoord – trouwwebsite-platform (prototype)

Statische, eigen versie van een trouwwebsite-dienst, gebouwd als verbeterde variant van bestaande Nederlandse trouwsite-bouwers.

- `index.html` – verkooppagina: functies, werkwijze, vergelijking, prijzen (toggle op aantal gasten), FAQ.
- `demo.html` – voorbeeld-trouwsite zoals gasten die zien: aftelklok, programma per dag-/avondgast (`?gast=avond`), route, RSVP met dieetwensen en liedjesverzoek, cadeaulijst met anoniem reserveren en geldpotten, foto-upload, FAQ.
- `style.css`, `app.js` – gedeelde stijl (licht/donker thema) en scripts.

Open `index.html` direct in de browser; er is geen build-stap. In de demo worden RSVP en reserveringen alleen in de eigen browser bewaard (localStorage).

## Verbeteringen ten opzichte van gangbare trouwsite-bouwers
1. Eenmalige prijs in plaats van abonnement, geen advertenties.
2. Programma per type gast via persoonlijke link.
3. RSVP met plus-ones, dieetwensen en liedjesverzoek in één formulier.
4. Cadeaulijst én geldpotten met voortgangsbalk; anoniem reserveren.
5. Foto's delen zonder app via QR-code.
6. Donkere modus, volledig mobielvriendelijk, toegankelijk (focusstijlen, aria-labels).
