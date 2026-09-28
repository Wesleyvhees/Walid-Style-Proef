# Vertalingen Veloxity (EN / DE / FR)

`vertalingen.json` bevat alle vertalingen, klaar om in Shopify te zetten:

- **products**: titel, beschrijving, SEO-titel/-omschrijving en optiewaarden ("Aantal", "2 stuks – bespaar …") voor alle 7 producten
- **collections**: titel en beschrijving van de 5 collecties
- **pages**: Over ons, Veelgestelde vragen, Verzending & retour, Garantie, Herroepingsformulier en Contact
- **menu**: alle menu-items van het hoofdmenu en de footer
- **theme**: alle teksten van het Veloxity-thema (homepage, aankondigingsbalk, footer, 404, winkelwagen, productpagina, wachtwoordpagina)

Opnieuw genereren: `python3 build_vertalingen.py && python3 build_deel2.py`

## Aandachtspunten
- De placeholders [Adres], [e-mailadres], [nummer] en [Retouradres] staan ook in de vertalingen. Vervang ze overal.
- **Duitsland:** een **Impressum**-pagina is verplicht (naam, adres, contact, handelsregister, USt-IdNr.). Laat ook de Duitse Widerrufsbelehrung en AGB juridisch controleren.
- De betaalmethoden zijn per taal aangepast. De DE-teksten noemen iDEAL en Bancontact pas aan het eind van de lijst, omdat Duitse klanten vooral met creditcard, Klarna en PayPal betalen.
- Verzending staat nog alleen op NL en BE. Voeg in Shopify een verzendzone voor Duitsland toe voordat je daar verkoopt.
