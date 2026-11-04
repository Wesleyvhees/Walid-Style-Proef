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
  // standaardplek: gecentreerd, net boven de ondertitels (y 1290); grote tekst iets hoger zodat het label past
  const y = beat.y ?? (look === "big" || look === "impact" ? 1040 : 1120);
  const rot = beat.rotate ?? (look === "sticker" ? -4 : 0);
  const base: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    transform: `translate(-50%,-50%) rotate(${rot * p}deg) scale(${p * out})`,
    whiteSpace: "nowrap",
  };
  if (look === "impact") {
    // Motivatie-stijl zonder kleur: woord slaat neer (groot -> normaal), witte lijn tekent eronder,
    // en een holle echo van het woord dijt uit en vervaagt.
    const t = frame / fps - beat.start;
    const slam = interpolate(t, [0, 0.14], [1.55, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (v) => 1 - Math.pow(1 - v, 3) });
    const vis = t >= 0 ? 1 : 0;
    const line = interpolate(t, [0.1, 0.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const echo = interpolate(t, [0.05, 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const size = beat.size ?? 170;
    const word: React.CSSProperties = {
      ...fontCss("condensed"),
      fontSize: size,
      lineHeight: 0.9,
      textTransform: /\d/.test(beat.text) ? "none" : "uppercase",
      whiteSpace: "nowrap",
    };
    return (
      <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${out})`, opacity: vis * out }}>
        {/* holle echo */}
        <div
          style={{
            ...word,
            position: "absolute",
            inset: 0,
            color: "transparent",
            WebkitTextStroke: `${Math.max(2, Math.round(size * 0.018))}px rgba(255,255,255,${0.7 * (1 - echo)})`,
            transform: `scale(${1 + 0.35 * echo})`,
            textAlign: "center",
          }}
        >
          {beat.text}
        </div>
        <div
          style={{
            ...word,
            position: "relative",
            color: "#FFFFFF",
            transform: `scale(${slam})`,
            textShadow: "0 10px 40px rgba(0,0,0,0.55)",
            WebkitTextStroke: `${Math.round(size * 0.05)}px rgba(0,0,0,0.6)`,
            paintOrder: "stroke fill",
            textAlign: "center",
          }}
        >
          {beat.text}
        </div>
        <div style={{ height: Math.max(6, size * 0.045), marginTop: size * 0.06, background: "#FFFFFF", width: `${line * 100}%`, marginLeft: `${(1 - line) * 50}%`, borderRadius: 4, boxShadow: "0 2px 10px rgba(0,0,0,0.5)" }} />
        {beat.sub ? (
          <div style={{ ...fontCss("mono"), marginTop: 14, fontSize: Math.max(30, Math.round(size * 0.18)), color: "#FFFFFF", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.16em", opacity: line, textShadow: "0 2px 10px rgba(0,0,0,0.7)" }}>
            {beat.sub}
          </div>
        ) : null}
      </div>
    );
  }
  if (look === "big") {
    return (
      <div style={{ ...base, textAlign: "center" }}>
        <div
          style={{
            ...fontCss("condensed"),
            fontSize: beat.size ?? 230,
            lineHeight: 0.9,
            color: style.ink,
            textTransform: /\d/.test(beat.text) ? "none" : "uppercase", // "30 g" blijft "30 g"
            textShadow: "0 10px 40px rgba(0,0,0,0.55)",
          }}
        >
          {beat.text}
        </div>
        {beat.sub ? (
          <div
            style={{
              ...fontCss("mono"),
              display: "inline-block",
              marginTop: 14,
              fontSize: Math.max(34, Math.round((beat.size ?? 230) * 0.17)),
              color: style.cardInk,
              background: style.accent,
              padding: "0.3em 0.7em",
              borderRadius: 999,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            {beat.sub}
          </div>
        ) : null}
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
