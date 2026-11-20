// "Uit je vingertop" (Wes 2026-11-18): Wes wijst schuin omhoog, er gloeit een puntje op zijn vingertop
// en daaruit klapt een donkere kaart in 3D open (perspectief, kanteling, zwevend). Regels komen op hun eigen moment binnen.
import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { fontCss } from "../styles";
import { enter, exit } from "../anim";

const G = "#A3B462";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const FingerCard: React.FC<{ beat: any }> = ({ beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const out = exit(frame, beat.end, fps, 0.2);
  const fx = beat.x ?? 870, fy = beat.y ?? 690; // vingertop
  const W = beat.w ?? 700, H = beat.h ?? 380;
  const cx = beat.cardX ?? 540, cy = beat.cardY ?? 230; // linkerbovenhoek-centrum van de kaart (midden boven)
  const glow = interpolate(t, [beat.start, beat.start + 0.12, beat.start + 0.4], [0, 1, 0.55], clamp);
  const open = interpolate(t, [beat.start + 0.1, beat.start + 0.55], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.3)) });
  const fly = interpolate(t, [beat.start + 0.1, beat.start + 0.5], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const float = Math.sin((t - beat.start) * 2.2) * 6;
  // kaart vliegt van de vingertop naar zijn plek en klapt open in 3D
  const left = cx - W / 2, top = cy;
  const ox = fx - (left + W / 2), oy = fy - (top + H / 2);
  const tx = ox * (1 - fly), ty = oy * (1 - fly) + float;
  const rx = interpolate(open, [0, 1], [70, 8]), ry = interpolate(open, [0, 1], [-50, -14]);
  const lines: { text: string; at?: number; size?: number; color?: string; font?: string }[] = beat.lines ?? [];
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out, perspective: 1300, perspectiveOrigin: `${fx}px ${fy}px` }}>
      {/* gloeiend puntje op de vingertop + lichtspoor naar de kaart */}
      <div style={{ position: "absolute", left: fx - 40, top: fy - 40, width: 80, height: 80, borderRadius: "50%", opacity: glow,
        background: `radial-gradient(circle, rgba(255,255,255,0.95) 0%, ${G} 35%, rgba(163,180,98,0) 70%)`, filter: "blur(1px)" }} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.55 * glow * fly }}>
        <line x1={fx} y1={fy} x2={left + W / 2 + tx} y2={top + H + ty} stroke={G} strokeWidth={4} strokeDasharray="6 10" strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", left, top, width: W, height: H, transformStyle: "preserve-3d",
        transform: `translate(${tx}px, ${ty}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${0.15 + 0.85 * open})`,
        transformOrigin: "50% 100%" }}>
        {/* dikte van de kaart (3D-rand) */}
        {[10, 7, 4].map((d, i) => (
          <div key={i} style={{ position: "absolute", inset: 0, borderRadius: 36, background: "#0b0b0b", transform: `translateZ(${-d}px)`, border: `2px solid rgba(163,180,98,${0.25 + i * 0.1})` }} />
        ))}
        <div style={{ position: "absolute", inset: 0, borderRadius: 36, background: "linear-gradient(155deg, rgba(34,34,36,0.98), rgba(14,14,14,0.98))",
          border: `3px solid ${G}`, boxShadow: "0 40px 80px rgba(0,0,0,0.55)", padding: "34px 44px", overflow: "hidden" }}>
          {/* lichtschittering die over de kaart schuift */}
          <div style={{ position: "absolute", top: -60, bottom: -60, width: 120, left: interpolate(t, [beat.start + 0.4, beat.start + 1.1], [-200, W + 200], clamp),
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)", transform: "rotate(18deg)" }} />
          {beat.kicker ? <div style={{ ...fontCss("mono"), fontSize: 30, color: G, marginBottom: 10 }}>{beat.kicker}</div> : null}
          {lines.map((l, i) => {
            const at = l.at ?? beat.start + 0.45 + i * 0.25;
            const q = t >= at ? enter(frame, at, fps, 14) : 0;
            return (
              <div key={i} style={{ ...fontCss((l.font as any) ?? "sans"), fontSize: l.size ?? 56, fontWeight: 900, lineHeight: 1.08, color: l.color ?? "#fff",
                opacity: q, transform: `translateY(${(1 - q) * 16}px)`, marginTop: i ? 8 : 0, whiteSpace: "nowrap" }}>{l.text}</div>
            );
          })}
          {beat.source ? <div style={{ ...fontCss("mono"), position: "absolute", left: 44, bottom: 24, fontSize: 22, color: "rgba(255,255,255,0.45)" }}>{beat.source}</div> : null}
        </div>
      </div>
    </div>
  );
};
