import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { EmojiBeat, ImageBeat, PopBeat, StylePreset } from "../types";
import { fontCss } from "../styles";
import { exit } from "../anim";

// Veer met overshoot: 0 -> ~1.1 -> 1. Voelt als "oppoppen".
const pop = (frame: number, at: number, fps: number, damping = 9) =>
  spring({ frame: frame - Math.round(at * fps), fps, config: { damping, mass: 0.5, stiffness: 180 } });

const shadow = "0 18px 40px rgba(0,0,0,0.35), 0 3px 10px rgba(0,0,0,0.3)";

export const PopText: React.FC<{ beat: PopBeat; style: StylePreset }> = ({ beat, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, beat.start, fps);
  const out = exit(frame, beat.end, fps, 0.15);
  const look = beat.look ?? "sticker";
  const x = beat.x ?? 540;
  const y = beat.y ?? 420;
  const rot = beat.rotate ?? (look === "sticker" ? -4 : 0);
  const base: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    transform: `translate(-50%,-50%) rotate(${rot * p}deg) scale(${p * out})`,
    whiteSpace: "nowrap",
  };
  if (look === "big") {
    return (
      <div
        style={{
          ...base,
          ...fontCss("condensed"),
          fontSize: beat.size ?? 230,
          lineHeight: 0.9,
          color: style.ink,
          textTransform: "uppercase",
          textShadow: "0 10px 40px rgba(0,0,0,0.55)",
        }}
      >
        {beat.text}
      </div>
    );
  }
  if (look === "outline") {
    // witte tekst met een accent-streep die erdoor veegt
    const sweep = interpolate(frame / fps, [beat.start + 0.12, beat.start + 0.4], [0, 100], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <div style={{ ...base, ...fontCss("sans"), fontSize: beat.size ?? 110, color: style.ink, textShadow: "0 6px 26px rgba(0,0,0,0.6)" }}>
        <span style={{ position: "relative", zIndex: 1 }}>{beat.text}</span>
        <div
          style={{
            position: "absolute",
            left: "-3%",
            bottom: "10%",
            height: "28%",
            width: `${sweep * 1.06}%`,
            background: style.accent,
            zIndex: 0,
            borderRadius: 6,
          }}
        />
      </div>
    );
  }
  if (look === "label") {
    return (
      <div
        style={{
          ...base,
          ...fontCss("mono"),
          fontSize: beat.size ?? 34,
          textTransform: "uppercase",
          color: style.cardInk,
          background: style.card,
          padding: "14px 22px",
          borderRadius: 999,
          boxShadow: shadow,
        }}
      >
        <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 14, background: style.accent, marginRight: 14 }} />
        {beat.text}
      </div>
    );
  }
  if (look === "stamp") {
    // stempel: MYTHE / FEIT, slaat neer met overshoot
    const c = beat.color ?? "#FF3B30";
    const sp = spring({ frame: frame - Math.round(beat.start * fps), fps, config: { damping: 10, mass: 0.4, stiffness: 260 } });
    return (
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `translate(-50%,-50%) rotate(${rot || -8}deg) scale(${(2.2 - 1.2 * sp) * out})`,
          opacity: Math.min(1, sp * 2) * out,
          ...fontCss("condensed"),
          fontSize: beat.size ?? 150,
          lineHeight: 1,
          color: c,
          border: `10px solid ${c}`,
          borderRadius: 18,
          padding: "6px 34px 12px",
          textTransform: "uppercase",
          background: "rgba(255,255,255,0.92)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
          whiteSpace: "nowrap",
        }}
      >
        {beat.text}
      </div>
    );
  }
  // sticker
  return (
    <div
      style={{
        ...base,
        ...fontCss("sans"),
        fontSize: beat.size ?? 96,
        lineHeight: 1,
        color: style.cardInk === "#FFFFFF" ? "#111" : style.cardInk,
        background: style.accent,
        padding: "18px 30px 22px",
        borderRadius: 22,
        boxShadow: shadow,
        textTransform: "uppercase",
      }}
    >
      {beat.text}
    </div>
  );
};

export const EmojiPop: React.FC<{ beat: EmojiBeat }> = ({ beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!beat.src) return null;
  const p = pop(frame, beat.start, fps, 8);
  const out = exit(frame, beat.end, fps, 0.15);
  const t = frame / fps - beat.start;
  const size = beat.size ?? 280;
  const bob = Math.sin(t * 3.2) * 10;
  const wobble = Math.sin(t * 2.4) * 4;
  return (
    <Img
      src={staticFile(`p/${beat.src}`)}
      style={{
        position: "absolute",
        left: (beat.x ?? 780) - size / 2,
        top: (beat.y ?? 520) - size / 2 + bob,
        width: size,
        height: size,
        transform: `rotate(${(beat.rotate ?? 8) * (1 - p) * 3 + wobble}deg) scale(${p * out})`,
        filter: "drop-shadow(0 22px 30px rgba(0,0,0,0.4))",
      }}
    />
  );
};

export const PhotoPop: React.FC<{ beat: ImageBeat; style: StylePreset }> = ({ beat, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!beat.src) return null;
  const p = pop(frame, beat.start, fps, 11);
  const out = exit(frame, beat.end, fps, 0.18);
  const t = frame / fps - beat.start;
  const w = beat.w ?? 560;
  const rot = beat.rotate ?? -5;
  return (
    <div
      style={{
        position: "absolute",
        left: (beat.x ?? 470) - w / 2,
        top: (beat.y ?? 300) + (1 - p) * 140 + Math.sin(t * 1.8) * 6,
        width: w,
        padding: 14,
        paddingBottom: beat.label ? 0 : 14,
        background: "#fff",
        borderRadius: 18,
        boxShadow: shadow,
        transform: `rotate(${rot + (1 - p) * -10}deg) scale(${(0.7 + 0.3 * p) * out})`,
        opacity: Math.min(1, p * 2) * out,
      }}
    >
      <Img src={staticFile(`p/${beat.src}`)} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 8, display: "block" }} />
      {beat.label ? (
        <div style={{ ...fontCss("sans"), fontSize: 38, color: "#111", padding: "14px 6px 18px", letterSpacing: "-0.02em" }}>
          {beat.label}
          <span style={{ color: style.accent === "#FFFFFF" ? "#111" : style.accent }}>.</span>
        </div>
      ) : null}
    </div>
  );
};
