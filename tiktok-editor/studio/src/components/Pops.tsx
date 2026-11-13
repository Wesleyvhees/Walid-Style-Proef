import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { EmojiBeat, ImageBeat, PopBeat, StylePreset, VolgStempelBeat } from "../types";
import { fontCss, skin } from "../styles";
import { fxSkin, useFxLook, GREEN } from "../fxlook";
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
  const lv = useFxLook("label");
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
    const hard = !!beat.hard;
    const slam = interpolate(t, [0, hard ? 0.09 : 0.14], [hard ? 1.9 : 1.55, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (v) => 1 - Math.pow(1 - v, 3) });
    // korte natrilling van het woord na de inslag (alleen bij hard)
    const jit = hard && t > 0.09 && t < 0.24 ? Math.sin(t * 160) * 7 * (1 - (t - 0.09) / 0.15) : 0;
    const vis = t >= 0 ? 1 : 0;
    const line = interpolate(t, [0.1, 0.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const echo = interpolate(t, [0.05, 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const size = beat.size ?? 170;
    const word: React.CSSProperties = {
      ...fontCss(beat.font ?? "condensed"),
      fontSize: size,
      lineHeight: 0.9,
      textTransform: /\d/.test(beat.text) ? "none" : "uppercase",
      whiteSpace: "nowrap",
    };
    return (
      <div style={{ position: "absolute", left: x, top: y, transform: `translate(calc(-50% + ${jit}px),-50%) scale(${out})`, opacity: vis * out }}>
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
  if (look === "counter") {
    // teller + naam, bv. "03/17" boven "Frame break": open lus, de kijker wil de rest zien
    const pad = (v?: number) => String(v ?? 0).padStart(2, "0");
    return (
      <div style={{ ...base, textAlign: "center" }}>
        <div style={{ ...fontCss("mono"), fontSize: 30, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.7)", marginBottom: 4 }}>
          {pad(beat.n)}/{pad(beat.of)}
        </div>
        <div style={{ ...fontCss("sans"), fontSize: beat.size ?? 92, lineHeight: 1, color: style.accent, WebkitTextStroke: "8px rgba(0,0,0,0.55)", paintOrder: "stroke fill", textShadow: "0 8px 30px rgba(0,0,0,0.5)" }}>
          {beat.text}
        </div>
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
          fontSize: beat.size ?? 46,
          fontWeight: 700,
          textTransform: "uppercase",
          color: style.cardInk,
          ...(lv === 5
            ? { background: "#0B0B0B", color: "#FFFFFF", borderRadius: 6, borderBottom: `7px solid ${GREEN}`, padding: "16px 28px 12px", boxShadow: shadow }
            : { ...fxSkin(lv, style), padding: "18px 30px", borderRadius: 999, boxShadow: lv === 2 ? undefined : shadow, ...(lv === 2 ? { boxShadow: fxSkin(2, style).boxShadow } : {}) }),
        }}
      >
        {lv === 5 ? null : (
          <span style={{ display: "inline-block", width: 18, height: 18, borderRadius: 18, background: lv === 4 ? "#0B0B0B" : style.accent, marginRight: 14 }} />
        )}
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
  const iv = useFxLook("icoon");
  if (iv >= 2 && iv <= 3) {
    // icoon in een zwarte cirkel met groene rand (2) of in een glazen tegel (3)
    const box = size * 1.18;
    return (
      <div
        style={{
          position: "absolute",
          left: (beat.x ?? 780) - box / 2,
          top: (beat.y ?? 520) - box / 2 + bob,
          width: box,
          height: box,
          borderRadius: iv === 2 ? box : box * 0.26,
          ...(iv === 2
            ? { background: "#0A0A0A", border: `3px solid ${GREEN}`, boxShadow: "0 0 26px rgba(163,180,98,0.4), 0 20px 40px rgba(0,0,0,0.45)" }
            : { background: "rgba(14,14,14,0.5)", border: "1.5px solid rgba(255,255,255,0.22)", backdropFilter: "blur(16px)", boxShadow: "0 20px 40px rgba(0,0,0,0.35)" }),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `rotate(${(beat.rotate ?? 8) * (1 - p) * 3 + wobble * 0.5}deg) scale(${p * out})`,
        }}
      >
        <Img src={staticFile(`p/${beat.src}`)} style={{ width: size * 0.78, height: size * 0.78 }} />
      </div>
    );
  }
  if (iv === 5) {
    // zwevend icoon met losse schaduw op de 'grond'
    const lift = 18 + Math.sin(t * 2.6) * 16;
    return (
      <>
        <div
          style={{
            position: "absolute",
            left: (beat.x ?? 780) - size * 0.32,
            top: (beat.y ?? 520) + size * 0.52,
            width: size * 0.64,
            height: size * 0.12,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.55)",
            filter: "blur(10px)",
            transform: `scale(${(1.15 - lift / 120) * p * out})`,
          }}
        />
        <Img
          src={staticFile(`p/${beat.src}`)}
          style={{
            position: "absolute",
            left: (beat.x ?? 780) - size / 2,
            top: (beat.y ?? 520) - size / 2 - lift,
            width: size,
            height: size,
            transform: `rotate(${wobble}deg) scale(${p * out})`,
          }}
        />
      </>
    );
  }
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
        filter: iv === 4 ? `drop-shadow(0 0 22px rgba(163,180,98,0.85)) drop-shadow(0 18px 26px rgba(0,0,0,0.4))` : "drop-shadow(0 22px 30px rgba(0,0,0,0.4))",
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
  const fv = useFxLook("foto");
  // 1 wit polaroid, 2 zwarte rand, 3 groene rand met gloed, 4 randloos met schaduw, 5 zwart polaroid met dikke onderrand
  const frameCss: React.CSSProperties =
    fv === 2
      ? { padding: 10, background: "#0A0A0A", borderRadius: 24, border: "1.5px solid rgba(255,255,255,0.12)", boxShadow: shadow }
      : fv === 3
      ? { padding: 0, background: "#0A0A0A", borderRadius: 22, border: `4px solid ${GREEN}`, boxShadow: "0 0 30px rgba(163,180,98,0.45), 0 18px 40px rgba(0,0,0,0.4)", overflow: "hidden" }
      : fv === 4
      ? { padding: 0, background: "transparent", borderRadius: 26, boxShadow: "0 26px 50px rgba(0,0,0,0.55)", overflow: "hidden" }
      : fv === 5
      ? { padding: 12, paddingBottom: 64, background: "#0B0B0B", borderRadius: 10, boxShadow: shadow }
      : { padding: 14, paddingBottom: beat.label ? 0 : 14, background: "#fff", borderRadius: 18, boxShadow: shadow };
  const zoom = fv >= 2 ? 1 + 0.06 * Math.min(1, t / Math.max(0.5, beat.end - beat.start)) : 1;
  return (
    <div
      style={{
        position: "absolute",
        left: (beat.x ?? 470) - w / 2,
        top: (beat.y ?? 300) + (1 - p) * 140 + Math.sin(t * 1.8) * 6,
        width: w,
        ...frameCss,
        transform: `rotate(${(fv === 4 || fv === 3 ? rot * 0.5 : rot) + (1 - p) * -10}deg) scale(${(0.7 + 0.3 * p) * out})`,
        opacity: Math.min(1, p * 2) * out,
      }}
    >
      <div style={{ width: "100%", aspectRatio: "4 / 3", overflow: "hidden", borderRadius: fv === 3 || fv === 4 ? 0 : fv === 2 ? 16 : 8 }}>
        <Img src={staticFile(`p/${beat.src}`)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transform: `scale(${zoom})` }} />
      </div>
      {fv === 5 ? <div style={{ position: "absolute", left: 22, bottom: 20, width: 46, height: 6, borderRadius: 6, background: GREEN }} /> : null}
      {beat.label ? (
        <div style={{ ...fontCss("sans"), fontSize: 38, color: "#111", padding: "14px 6px 18px", letterSpacing: "-0.02em" }}>
          {beat.label}
          <span style={{ color: style.accent === "#FFFFFF" ? "#111" : style.accent }}>.</span>
        </div>
      ) : null}
    </div>
  );
};

// Volg-stempel: de echte Wes.Built-profielkaart slaat neer als een stempel.
export const VolgStempel: React.FC<{ beat: VolgStempelBeat }> = ({ beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({ frame: frame - Math.round(beat.start * fps), fps, config: { damping: 11, mass: 0.45, stiffness: 240 } });
  const out = exit(frame, beat.end, fps, 0.15);
  const w = beat.width ?? 900;
  return (
    <Img
      src={staticFile("merk/volgstempel.png")}
      style={{
        position: "absolute",
        left: ((beat as any).x ?? 540) - w / 2,
        top: (beat.y ?? 980) - (w * 0.56) / 2,
        width: w,
        transform: `rotate(${(beat.rotate ?? -3) * sp}deg) scale(${(2.0 - 1.0 * sp) * out})`,
        opacity: Math.min(1, sp * 2) * out,
        filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.55))",
      }}
    />
  );
};

// Labels die zich opstapelen (Wes 2026-11-10, analyse 'hooks'): elk punt komt als blok onder het vorige.
export const StackLabels: React.FC<{ beat: any; style: StylePreset }> = ({ beat, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const lv = useFxLook("label");
  const out = exit(frame, beat.end, fps, 0.15);
  const items: { text: string; at: number }[] = beat.items ?? [];
  return (
    <div style={{ position: "absolute", left: beat.x ?? 70, top: beat.y ?? 380, display: "flex", flexDirection: "column", alignItems: beat.align === "center" ? "center" : "flex-start", gap: 16, opacity: out, ...(beat.align === "center" ? { right: beat.x ?? 70 } : {}) }}>
      {items.map((it, i) => {
        if (t < it.at - 0.02) return null;
        const p = pop(frame, it.at, fps, 11);
        return (
          <div
            key={i}
            style={{
              ...fontCss("mono"),
              fontSize: beat.size ?? 44,
              fontWeight: 700,
              textTransform: "uppercase",
              padding: "14px 26px",
              borderRadius: 14,
              ...fxSkin(lv === 5 ? 2 : lv, style),
              opacity: Math.min(1, p * 1.5),
              transform: `translateX(${(1 - p) * -60}px) scale(${0.9 + 0.1 * p})`,
              filter: p < 0.6 ? `blur(${(0.6 - p) * 8}px)` : undefined,
            }}
          >
            {it.text}
          </div>
        );
      })}
    </div>
  );
};
