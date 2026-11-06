import type { FontKind, StylePreset } from "./types";

// Stijlpresets. "Maak het moody" = style: "moody", enz.
export const PRESETS: Record<string, StylePreset> = {
  // Serie "Van nul naar grip" (motivatie): geen kleur, alles wit/zwart, duidelijk en krachtig.
  nulnaargrip: {
    bg: "#111111",
    ink: "#FFFFFF",
    muted: "rgba(255,255,255,0.55)",
    accent: "#FFFFFF",
    card: "#FFFFFF",
    cardInk: "#111111",
    // harde look (Wes, dag 11): bijna zwart-wit, veel contrast, donkere rand, filmkorrel
    filter: "grayscale(0.85) contrast(1.22) brightness(0.98)",
    vignette: 0.55,
    grain: 0.06,
    captionFont: "sans",
    captionSize: 78,
    captionUpper: false,
    captionBox: null,
    captionShadow: true,
    titleColor: "#FFFFFF",
    captionAccent: "#C3D27E", // een klein beetje kleur in de ondertitels (Wes 2026-11-06), verder zwart-wit
  },
  // Huisstijl Wes.Built (kleuren van de Wes.Built Coaching-website): wit met legergroen accent.
  wesbuilt: {
    bg: "#141310",
    ink: "#FFFFFF",
    muted: "rgba(255,255,255,0.5)",
    accent: "#A3B462",
    card: "#ECE8E0",
    cardInk: "#141310",
    filter: "contrast(1.08) saturate(1.06) brightness(1.02)",
    vignette: 0.28,
    grain: 0.02,
    captionFont: "sans",
    captionSize: 74,
    captionUpper: false,
    captionBox: null,
    captionShadow: true,
    titleColor: "#FFFFFF",
  },
  // Standaard: strak, energiek, goed leesbaar. Zwart/wit met warm geel accent.
  grip: {
    bg: "#111112",
    ink: "#FFFFFF",
    muted: "rgba(255,255,255,0.5)",
    accent: "#FFC93C",
    card: "#FFFFFF",
    cardInk: "#111112",
    filter: "contrast(1.08) saturate(1.1) brightness(1.02)",
    vignette: 0.28,
    grain: 0.02,
    captionFont: "sans",
    captionSize: 74,
    captionUpper: false,
    captionBox: null,
    captionShadow: true,
    titleColor: "#FFFFFF",
  },
  // Rustiger en "duurder": gebroken wit, antraciet, oranje accent, schreefletter.
  editorial: {
    bg: "#1A1A1A",
    ink: "#F6F1E7",
    muted: "rgba(246,241,231,0.45)",
    accent: "#FF7A3D",
    card: "#F6F1E7",
    cardInk: "#1A1A1A",
    filter: "sepia(0.1) saturate(0.95) contrast(1.06) brightness(1.03)",
    vignette: 0.35,
    grain: 0.05,
    captionFont: "serif",
    captionSize: 72,
    captionUpper: false,
    captionBox: "rgba(26,26,26,0.82)",
    captionShadow: false,
    titleColor: "#F6F1E7",
  },
  // Donker en zwaar, grote ondertitels.
  moody: {
    bg: "#0D0F0E",
    ink: "#EFE9DC",
    muted: "rgba(239,233,220,0.35)",
    accent: "#E2B563",
    card: "#16191A",
    cardInk: "#EFE9DC",
    filter: "brightness(0.8) contrast(1.2) saturate(0.68) sepia(0.06)",
    vignette: 0.7,
    grain: 0.08,
    captionFont: "condensed",
    captionSize: 118,
    captionUpper: true,
    captionBox: null,
    captionShadow: true,
    titleColor: "#EFE9DC",
  },
  // Fel en speels.
  pop: {
    bg: "#1B1BFF",
    ink: "#FFFFFF",
    muted: "rgba(255,255,255,0.55)",
    accent: "#B6FF3B",
    card: "#FFFFFF",
    cardInk: "#1B1BFF",
    filter: "contrast(1.06) saturate(1.2)",
    vignette: 0.15,
    grain: 0,
    captionFont: "sans",
    captionSize: 80,
    captionUpper: true,
    captionBox: null,
    captionShadow: true,
    titleColor: "#FFFFFF",
  },
};

export const FONT_FAMILY: Record<FontKind, string> = {
  serif: "InstrumentSerif",
  italic: "InstrumentSerifItalic",
  sans: "InterVar",
  condensed: "Anton",
  barlow: "BarlowCondensedBlackItalic",
  mono: "DMMono",
};

export const fontCss = (kind: FontKind): React.CSSProperties => {
  switch (kind) {
    case "sans":
      return { fontFamily: FONT_FAMILY.sans, fontWeight: 900, letterSpacing: "-0.045em" };
    case "condensed":
      return { fontFamily: FONT_FAMILY.condensed, fontWeight: 400, letterSpacing: "-0.01em" };
    case "barlow":
      return { fontFamily: FONT_FAMILY.barlow, fontWeight: 900, fontStyle: "normal", letterSpacing: "0em" };
    case "italic":
      return { fontFamily: FONT_FAMILY.italic, fontStyle: "normal", letterSpacing: "-0.02em" };
    case "mono":
      return { fontFamily: FONT_FAMILY.mono, letterSpacing: "0.08em" };
    default:
      return { fontFamily: FONT_FAMILY.serif, letterSpacing: "-0.03em" };
  }
};

// Veilige zones van TikTok (1080x1920).
export const SAFE = { top: 230, bottom: 1400, left: 70, right: 900 };
