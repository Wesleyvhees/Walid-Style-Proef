# Veloxity

Veloxity sells cordless comfort products for the home: a knee massager with warmth and red light, a shiatsu neck massager, an eye massager, and sets of them. Customers are mostly 45+ in the Netherlands, Belgium and Germany. The store runs on Shopify's Horizon theme, and this system is extracted from its theme settings (`shopify/thema/`), page copy (`shopify/paginas/`) and the store plan (`winkelstructuur-en-upsell-flow.md`).

The promise in one line: **15 minuten warmte. Elke dag.** Everything in the system should feel like that line: warm, calm, and simple enough to use on the sofa.

## Content fundamentals

**Voice: warm, rustig, volwassen.** Talk to one person, with *je* (never *u*, never slang). Short sentences. Describe what the product does and how it feels, not what it cures.

- Do: "Gun je knieën elke dag 15 minuten warmte en rust."
- Do: "Doe het om, kies je stand en ontspan 15 minuten."
- Don't: "Verlicht kniepijn en artrose." Veloxity makes **no medical claims**. Every product page ends with the line "Dit is een comfort- en ontspanningsproduct, geen medisch hulpmiddel."

**Honest pricing.** No struck-through "was" prices (EU Omnibus rules). Show the real saving of a bundle against buying separately: "2 stuks – bespaar €29,95". Label choices by who they are for: *Meest gekozen*, *Beste deal*.

**Trust, stated plainly.** Three facts recur everywhere and are written the same way each time:

| Fact | Copy |
| --- | --- |
| Delivery | Levering in 2–5 werkdagen |
| Guarantee | 30 dagen comfortgarantie |
| Payment | Veilig betalen met iDEAL & Bancontact |

Prices are Dutch format with a comma and euro sign in front: `€79,95`. Time ranges use an en dash: `2–5`. The store is published in NL, with EN, DE and FR translations.

## Visual foundations

**Colour.** A cream page (`surface`), dark brown text (`ink`) and one accent, `terracotta`, used only for the primary action, the sale badge and the hero eyebrow. Sections alternate between `surface`, `surface-sand` and `surface-raised` (white) to create rhythm without borders or shadows. One section per page may go dark with `surface-inverse` + `ink-inverse`: the homepage uses it for "Probeer het zonder risico".

- One `terracotta` button per view. The second action is a secondary (outlined `ink`) button or a text link.
- Never put `terracotta` text on `surface-inverse` (2.7:1).
- `line` is a hairline for fields and panels, not a divider between sections.

**Type.** Lora SemiBold (`--font-heading`) for headings h1–h4; Inter (`--font-body`) for everything else, with Inter Medium for h5/h6 and the announcement bar. Headings are sentence case and tight (leading 1–1.1). Body text is 16px with loose leading (1.6). Only the hero eyebrow is uppercase.

**Shape.** Soft and round. Buttons are always pills (`radius-button`), badges are full pills (`radius-pill`), images and cards use `radius-card` (12px), inputs `radius-input` (8px). No shadows anywhere in the theme; separation comes from surface colour. Cards have no border and no padding: the image carries the card.

**Space.** Section padding steps down as sections get quieter: `space-120` hero, `space-96` story, `space-80` guarantee, `space-64` product lists, `space-28` USP band. Product grids use `space-16` columns and `space-32` rows (4 columns desktop, 2 on mobile). Page width is Horizon's *narrow*.

**Layout.** Content in hero-style sections is centered in a narrow column. Product-list headers put the h3 left and an "Alles bekijken" link right, on one baseline. The header is sticky with a centered logo, menu left and search right.

**Motion.** None. Page transitions and card hover effects are off in the theme. Keep it that way: the brand is about rest.

## Iconography

The theme uses Horizon's default line icons (`icon_stroke: default`) for search, cart and account. Trust points in the USP band use a plain check mark "✓" before bold text; no other icon set is in use. No emoji in copy.

## Logo

No logo file exists in the repository yet. Until there is one, set the name "Veloxity" in Lora SemiBold at `logo-height` (36px desktop, `logo-height-mobile` 28px), in `ink`, centered in the header.

## Not synced

- **Line-height presets** (`display-tight` 1, `display-normal` 1.1, `display-loose` 1.2, `body-loose` 1.6) are Horizon's defaults, read from the preset names in `settings_data.json`, not from literal values in the repository.
- **Fonts** are Google Fonts (Lora, Inter) served by Shopify's font library; no font files are in the repository, so none are bundled here.
- **`ink-muted`** is added by this system; the theme has no muted text colour.
- **Hero overlay** `#12121266` is defined but switched off, so it is left out.
- **Components** are hand-written static renditions of the Horizon sections the store configures (buttons, badges, inputs, variant picker, product card, announcement bar, USP band, hero). The theme's Liquid templates are not in the repository, so there is no component library to build from. Cart drawer, popover and header are described above but have no card yet.
