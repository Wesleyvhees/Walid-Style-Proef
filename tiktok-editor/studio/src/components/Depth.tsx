// "In en uit beeld" (Wes 2026-11-25: "effecten die het beeld uitgaan, het beeld inkomen, 3D").
// FlyIn: een woord, getal of plaatje komt uit de diepte op de camera af (bewegingswaas, schaduw), landt met een klap,
// of vliegt (mode "through") dwars door de lens uit beeld.
import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { fontCss } from "../styles";

const G = "#A3B462";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const rnd = (seed: number) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export const flyShake = (beats: any[], t: number): [number, number] => {
  for (const b of beats) {
    if (b.type !== "flyin" || b.mode === "through" || b.shake === false) continue;
    const land = b.start + (b.fly ?? 0.32);
    if (t >= land && t < land + 0.25) {
      const a = 16 * (1 - (t - land) / 0.25), k = Math.floor(t * 60);
      return [(rnd(k) - 0.5) * 2 * a, (rnd(k + 7) - 0.5) * 2 * a];
    }
  }
  return [0, 0];
};

export const FlyIn: React.FC<{ beat: any }> = ({ beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const fly = beat.fly ?? 0.32;
  const through = beat.mode === "through";
  const y = beat.y ?? 380;
  // diepte: 0 = ver weg, 1 = op zijn plek; bij "through" door naar 6 (langs de camera)
  const zIn = interpolate(t, [beat.start, beat.start + fly], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const zOut = through
    ? interpolate(t, [beat.end - 0.28, beat.end], [1, 6], { ...clamp, easing: Easing.in(Easing.cubic) })
    : 1;
  const z = zIn < 1 ? zIn : zOut;
  const scale = 0.06 + 0.94 * Math.min(1, z) + (z > 1 ? (z - 1) * 0.9 : 0);
  const op = (zIn <= 0 ? 0 : 1) * (through ? interpolate(t, [beat.end - 0.12, beat.end], [1, 0], clamp) : interpolate(t, [beat.end - 0.15, beat.end], [1, 0], clamp));
  const landed = t >= beat.start + fly;
  const squash = landed && !through ? 1 + 0.08 * Math.exp(-(t - beat.start - fly) * 18) * Math.cos((t - beat.start - fly) * 40) : 1;
  const rot = (1 - Math.min(1, z)) * (beat.spin ?? -18);
  const blur = !landed ? 6 * (1 - zIn) : z > 1 ? Math.min(14, (z - 1) * 6) : 0;
  const trail = !landed || z > 1;
  const content = beat.src ? (
    <Img src={staticFile(`p/${beat.src}`)} style={{ width: beat.w ?? 560, borderRadius: 26, border: `5px solid ${G}`, boxShadow: "0 40px 90px rgba(0,0,0,0.6)" }} />
  ) : (
    <div style={{ ...fontCss("condensed"), fontSize: beat.size ?? 210, lineHeight: 0.95, color: beat.color ?? "#fff", textTransform: "uppercase", whiteSpace: "nowrap",
      textShadow: "0 18px 40px rgba(0,0,0,0.75)", WebkitTextStroke: "3px rgba(0,0,0,0.35)" }}>
      {beat.text}
      {beat.sub ? <div style={{ ...fontCss("sans"), fontSize: (beat.size ?? 210) * 0.24, color: G, marginTop: 10, letterSpacing: "0.02em" }}>{beat.sub}</div> : null}
    </div>
  );
  const layer = (s: number, o: number, b: number, k: string) => (
    <div key={k} style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center", opacity: o,
      transform: `translateY(${(1 - Math.min(1, z)) * -60}px) scale(${s}) rotate(${rot}deg)`, transformOrigin: "50% 40%", filter: b ? `blur(${b}px)` : undefined }}>
      {content}
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: op, pointerEvents: "none" }}>
      {trail ? [0.55, 0.75].map((f, i) => layer(scale * f, 0.18 + i * 0.12, blur + 4, `t${i}`)) : null}
      {layer(scale * squash, 1, blur, "m")}
      {/* inslag: korte witte ring als het woord landt */}
      {landed && !through && t < beat.start + fly + 0.3 ? (
        <div style={{ position: "absolute", left: 540 - 300, top: y - 40, width: 600, height: (beat.size ?? 210) + 80, borderRadius: "50%",
          border: `6px solid rgba(255,255,255,${0.7 * (1 - (t - beat.start - fly) / 0.3)})`, transform: `scale(${0.7 + (t - beat.start - fly) * 2.2})` }} />
      ) : null}
    </div>
  );
};
