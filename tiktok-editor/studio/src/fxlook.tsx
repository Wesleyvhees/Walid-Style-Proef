import React, { useContext } from "react";
import type { StylePreset } from "./types";
import { skin } from "./styles";

// Varianten van de effecten (Wes 2026-11-09: "5 opties per effect", donkerder, beeld zelf niet aanpassen).
// Per effect een nummer 1–5 via storyboard/template "fxLook": { pil, tip, label, checklist, foto, icoon }.
export const FxLookCtx = React.createContext<Record<string, number>>({});
export const useFxLook = (k: string) => useContext(FxLookCtx)[k] ?? 1;

export const GREEN = "#A3B462";
const glowShadow = "0 0 22px rgba(163,180,98,0.35), 0 18px 40px rgba(0,0,0,0.45)";

// 1 = huidig, 2 = zwart met groene rand + gloed, 3 = zwart glas, 4 = groen gevuld
export const fxSkin = (v: number, style: StylePreset): React.CSSProperties => {
  if (v === 2) return { background: "#0A0A0A", color: "#FFFFFF", border: `2px solid ${GREEN}`, boxShadow: glowShadow };
  if (v === 3)
    return {
      background: "rgba(14,14,14,0.55)",
      color: "#FFFFFF",
      border: "1.5px solid rgba(255,255,255,0.2)",
      backdropFilter: "blur(18px) saturate(1.3)",
      WebkitBackdropFilter: "blur(18px)",
      boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
    };
  if (v === 4) return { background: GREEN, color: "#0B0B0B", border: "none" };
  return skin(style);
};
export const isDarkFx = (v: number, style: StylePreset) => (v === 2 || v === 3 || v === 5 ? true : v === 4 ? false : style.cardInk === "#FFFFFF");
