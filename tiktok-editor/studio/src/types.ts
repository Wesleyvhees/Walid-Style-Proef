// Storyboard-formaat. Alle tijden in seconden op de tijdlijn van cut.mp4.

export type Word = { w: string; s: number; e: number };

export type FontKind = "serif" | "italic" | "sans" | "condensed" | "mono";

export type TitleLine = {
  text: string;
  font?: FontKind;
  size?: number; // px
  at?: number; // moment waarop de regel verschijnt
  color?: string;
  tracking?: number; // letter-spacing in em
  uppercase?: boolean;
};

export type TitleBeat = {
  type: "title";
  start: number;
  end: number;
  lines: TitleLine[];
  behind?: boolean; // tekst achter de persoon (cutout)
  background?: "video" | "solid"; // solid = effen kleurvlak achter de persoon
  y?: number; // bovenkant van het titelblok
  align?: "left" | "center";
  timecode?: boolean;
  kicker?: string; // klein mono-label boven de titel
};

export type PromptBeat = {
  type: "prompt";
  start: number;
  end: number;
  label?: string; // klein label linksboven, bv. "AAN JEZELF"
  text: string; // getypte tekst
  typeFrom?: number;
  typeTo?: number;
  doneAt?: number; // vanaf hier: vinkje + doneText
  doneLabel?: string;
  doneText?: string;
  y?: number;
};

export type FollowBeat = {
  type: "follow";
  start: number;
  end: number;
  handle: string;
  sub?: string;
  toggleAt?: number;
  y?: number;
};

export type CommentBeat = {
  type: "comment";
  start: number;
  end: number;
  headline: string;
  comment: string;
  user?: string;
  y?: number;
};

export type WordsBeat = {
  type: "words"; // grote losse woorden over de video (niet achter de persoon)
  start: number;
  end: number;
  lines: TitleLine[];
  y?: number;
  align?: "left" | "center";
};

export type ImagesBeat = {
  type: "images"; // zwevende afbeeldingen/screenshots
  start: number;
  end: number;
  src: string[]; // paden binnen de projectmap
};

export type Sfx = "pop" | "whoosh" | "ding" | "click" | "boom" | "riser";

export type PopBeat = {
  type: "pop"; // tekst die oppopt bij een woord
  start: number;
  end: number;
  text: string;
  look?: "sticker" | "outline" | "big" | "label" | "stamp" | "impact";
  color?: string; // voor stamp: bv. "#FF3B30" (mythe) of "#34C759" (feit)
  sub?: string; // kleine regel onder een "big"-tekst, bv. "snelle koolhydraten" onder "30 g"
  x?: number; // midden, px (standaard midden van het beeld)
  y?: number;
  rotate?: number;
  size?: number;
};

export type EmojiBeat = {
  type: "emoji"; // 3D-icoon dat oppopt (Microsoft Fluent Emoji)
  start: number;
  end: number;
  name: string; // bv. "flexed biceps", "rocket", "brain"
  src?: string; // ingevuld door tt.py assets
  x?: number;
  y?: number;
  size?: number;
  rotate?: number;
};

export type ImageBeat = {
  type: "image"; // foto die oppopt als kaart
  start: number;
  end: number;
  query?: string; // zoekterm, tt.py assets zoekt een rechtenvrije foto
  src?: string; // of zelf een bestand in de projectmap
  pick?: number;
  label?: string;
  x?: number;
  y?: number;
  w?: number;
  rotate?: number;
};

export type SceneBeat = {
  type: "scene"; // achtergrond vervangen door een beeld dat past bij wat je zegt
  start: number;
  end: number;
  query?: string; // zoekterm voor het achtergrondbeeld (of src)
  src?: string;
  pick?: number;
  mode?: "cutout" | "pip"; // cutout = jij uitgeknipt voor het beeld (vereist tt.py person), pip = jij in een afgerond kader
  scale?: number; // grootte van jou (1 = origineel), standaard 0.8 (cutout) / 0.46 (pip)
  anchor?: "bottom" | "center" | "left" | "right";
  dim?: number; // achtergrond donkerder maken 0..1
};

export type CutawayBeat = {
  type: "cutaway"; // beeld schermvullend (0.6–1.5 s), jij blijft hoorbaar
  start: number;
  end: number;
  query?: string;
  src?: string;
  pick?: number;
  label?: string;
};

export type HookBeat = {
  type: "hook"; // vaste titel bovenin (de mythe/vraag) met kleine ondertitel
  start: number;
  end: number;
  text: string;
  sub?: string;
  y?: number;
  size?: number;
};

export type ChartBeat = {
  type: "chart"; // geanimeerde data: lijst of staafjes
  start: number;
  end: number;
  title?: string;
  rows: { label: string; value: number; unit?: string; text?: string }[]; // text = vrije waarde i.p.v. getal
  unit?: string;
  decimals?: number;
  highlight?: number[]; // indexen van rijen in accentkleur
  mode?: "bars" | "list";
  note?: string;
};

export type MeterBeat = {
  type: "meter"; // terugkerende analogie als live graphic: batterij/tank die leegloopt of vol raakt
  start: number;
  end: number;
  kind?: "battery" | "tank";
  levels: { at: number; value: number }[]; // value 0..1 op tijdstip `at`
  label?: string;
  x?: number;
  y?: number;
  size?: number;
};

export type PersonaBeat = {
  type: "persona"; // jij speelt de kijker ("Maar wat dan, Jesse?"): close-up, scheef, label
  start: number;
  end: number;
  label?: string; // bv. "jij"
};

export type Beat = (TitleBeat | PromptBeat | FollowBeat | CommentBeat | WordsBeat | ImagesBeat | PopBeat | EmojiBeat | ImageBeat | SceneBeat | CutawayBeat | HookBeat | ChartBeat | MeterBeat | PersonaBeat) & {
  sfx?: Sfx | Sfx[]; // bv. ["riser", "boom"] op een punchline
  note?: string;
};

export type Zoom = { start: number; end: number; to?: number; ease?: "in" | "punch" };

export type Storyboard = {
  title?: string;
  style: string; // naam van een preset in styles.ts
  duration: number;
  video: string; // bv. "cut.mp4"
  person?: string; // bv. "person.webm" (cutout met alpha)
  words: Word[];
  captions?: {
    enabled?: boolean;
    size?: number;
    y?: number | "auto"; // "auto" = net onder de kin (vereist tt.py layout)
    maxChars?: number;
    style?: string;
    highlight?: string[]; // kernwoorden in accentkleur
  };
  beats: Beat[];
  zooms?: Zoom[];
  overrides?: Partial<StylePreset>;
  layout?: { fps: number; faces: ([number, number, number, number] | null)[] }; // uit layout.json
  // Virtuele camera's (multicam uit één opname): per shot een uitsnede, berekend in render.mjs
  cams?: { start: number; end: number; cam: string; note?: string }[];
  camPresets?: Record<string, { scale: number; focus?: "face" | "chest" | "full" | "belly" }>;
  camShots?: { start: number; end: number; scale: number; tx: number; ty: number }[];
};

export type StylePreset = {
  bg: string; // kleur van effen vlakken / kaart-accent
  ink: string; // hoofd-tekstkleur
  muted: string; // nog niet uitgesproken woorden
  accent: string;
  card: string; // achtergrond van kaartjes
  cardInk: string;
  filter: string; // CSS-filter op de video (kleurcorrectie)
  vignette: number; // 0..1
  grain: number; // 0..1
  captionFont: FontKind;
  captionSize: number;
  captionUpper: boolean;
  captionBox: string | null; // achtergrond achter ondertitel, null = geen
  captionShadow: boolean;
  titleColor: string;
};
