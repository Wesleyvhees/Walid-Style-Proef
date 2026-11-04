import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { CommentBeat, FollowBeat, ImagesBeat, PromptBeat, StylePreset } from "../types";
import { fontCss, SAFE } from "../styles";
import { enter, exit } from "../anim";

const cardShadow = "0 24px 60px rgba(0,0,0,0.35), 0 4px 14px rgba(0,0,0,0.25)";

const useIn = (start: number, end: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, start, fps, 16) * exit(frame, end, fps);
  return { frame, fps, t: frame / fps, p };
};

const Check: React.FC<{ bg: string; fg: string; size?: number }> = ({ bg, fg, size = 64 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size,
      background: bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24">
      <path d="M4 12.5l5 5L20 6.5" stroke={fg} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

// Promptvak dat zichzelf typt, en daarna "klaar" met een vinkje.
export const PromptCard: React.FC<{ beat: PromptBeat; style: StylePreset }> = ({ beat, style }) => {
  const { t, p, frame, fps } = useIn(beat.start, beat.end);
  const from = beat.typeFrom ?? beat.start + 0.2;
  const to = beat.typeTo ?? from + beat.text.length * 0.045;
  const n = Math.round(Math.max(0, Math.min(1, (t - from) / Math.max(0.01, to - from))) * beat.text.length);
  const done = beat.doneAt !== undefined && t >= beat.doneAt;
  const dp = beat.doneAt !== undefined ? enter(frame, beat.doneAt, fps, 14) : 0;
  const cursor = !done && Math.floor(t * 2.2) % 2 === 0;
  return (
    <div
      style={{
        position: "absolute",
        top: beat.y ?? SAFE.top,
        left: 50,
        right: 50,
        padding: "26px 30px 30px",
        borderRadius: 26,
        background: style.card,
        color: style.cardInk,
        boxShadow: cardShadow,
        opacity: p,
        transform: `translateY(${(1 - p) * -40}px) scale(${0.97 + 0.03 * p})`,
        display: "flex",
        alignItems: "center",
        gap: 24,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...fontCss("mono"), fontSize: 22, opacity: 0.6, textTransform: "uppercase", marginBottom: 8 }}>
          {done ? `• ${beat.doneLabel ?? "klaar"}` : beat.label ?? "Aan jezelf"}
        </div>
        <div
          style={{
            ...(done ? fontCss("italic") : fontCss("sans")),
            ...(done ? { fontSize: 64 } : { fontSize: 44, fontWeight: 500, letterSpacing: "-0.02em" }),
            lineHeight: 1.1,
          }}
        >
          {done ? beat.doneText ?? beat.text : beat.text.slice(0, n)}
          {cursor ? <span style={{ opacity: 0.7 }}>|</span> : null}
        </div>
      </div>
      {done ? (
        <div style={{ transform: `scale(${dp})` }}>
          <Check bg={style.bg} fg={style.card} />
        </div>
      ) : (
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 60,
            background: style.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: n > 0 ? 1 : 0.35,
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24">
            <path d="M12 19V5M5 12l7-7 7 7" stroke={style.card} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  );
};

// Profielkaart met "Volgen" -> "Volgend".
export const FollowCard: React.FC<{ beat: FollowBeat; style: StylePreset }> = ({ beat, style }) => {
  const { t, p } = useIn(beat.start, beat.end);
  const on = beat.toggleAt !== undefined && t >= beat.toggleAt;
  const initial = beat.handle.replace(/^@/, "").slice(0, 1).toUpperCase();
  return (
    <div
      style={{
        position: "absolute",
        top: beat.y ?? 1020,
        left: 90,
        width: 720,
        padding: "20px 22px",
        borderRadius: 999,
        background: style.card,
        color: style.cardInk,
        boxShadow: cardShadow,
        display: "flex",
        alignItems: "center",
        gap: 20,
        opacity: p,
        transform: `translateY(${(1 - p) * 40}px)`,
      }}
    >
      <div
        style={{
          width: 74,
          height: 74,
          borderRadius: 74,
          background: style.bg,
          color: style.card,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...fontCss("serif"),
          fontSize: 46,
        }}
      >
        {initial}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ ...fontCss("sans"), fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em" }}>{beat.handle}</div>
        {beat.sub ? <div style={{ ...fontCss("mono"), fontSize: 21, opacity: 0.6, marginTop: 4 }}>{beat.sub}</div> : null}
      </div>
      <div
        style={{
          ...fontCss("sans"),
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          padding: "16px 28px",
          borderRadius: 999,
          background: on ? "transparent" : style.bg,
          color: on ? style.cardInk : style.card,
          border: `2px solid ${on ? "rgba(0,0,0,0.18)" : style.bg}`,
        }}
      >
        {on ? "✓ Volgend" : "Volgen"}
      </div>
    </div>
  );
};

// "Reageer 'X'"-kop met een reactie-bubbel.
export const CommentCard: React.FC<{ beat: CommentBeat; style: StylePreset }> = ({ beat, style }) => {
  const { p, frame, fps } = useIn(beat.start, beat.end);
  const bp = enter(frame, beat.start + 0.45, fps, 14);
  return (
    <div style={{ position: "absolute", top: beat.y ?? SAFE.top, left: 120, right: 120, opacity: p }}>
      <div
        style={{
          ...fontCss("sans"),
          fontSize: 50,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.12,
          color: "#fff",
          background: "rgba(0,0,0,0.0)",
          textShadow: "0 3px 18px rgba(0,0,0,0.6)",
          textAlign: "center",
          transform: `translateY(${(1 - p) * -24}px)`,
        }}
      >
        {beat.headline}
      </div>
      <div
        style={{
          marginTop: 22,
          padding: "18px 24px",
          borderRadius: 22,
          background: style.card,
          color: style.cardInk,
          boxShadow: cardShadow,
          display: "flex",
          alignItems: "center",
          gap: 16,
          opacity: bp,
          transform: `scale(${0.9 + 0.1 * bp})`,
        }}
      >
        <div style={{ width: 48, height: 48, borderRadius: 48, background: style.bg }} />
        <div>
          <div style={{ ...fontCss("mono"), fontSize: 19, opacity: 0.55 }}>{beat.user ?? "jij"}</div>
          <div style={{ ...fontCss("sans"), fontSize: 34, fontWeight: 700, letterSpacing: "-0.01em" }}>{beat.comment}</div>
        </div>
      </div>
    </div>
  );
};

// Zwevende screenshots / beelden die binnen komen drijven.
export const FloatingImages: React.FC<{ beat: ImagesBeat }> = ({ beat }) => {
  const { frame, fps, p } = useIn(beat.start, beat.end);
  const spots = [
    { x: 60, y: 260, r: -6, w: 300 },
    { x: 400, y: 200, r: 4, w: 280 },
    { x: 640, y: 330, r: -3, w: 260 },
    { x: 200, y: 560, r: 5, w: 260 },
  ];
  return (
    <>
      {beat.src.slice(0, 4).map((s, i) => {
        const sp = spots[i];
        const q = enter(frame, beat.start + i * 0.12, fps, 14) * p;
        const bob = Math.sin((frame / fps) * 1.6 + i) * 8;
        return (
          <Img
            key={s}
            src={staticFile(`p/${s}`)}
            style={{
              position: "absolute",
              left: sp.x,
              top: sp.y + bob + (1 - q) * 80,
              width: sp.w,
              borderRadius: 14,
              boxShadow: cardShadow,
              transform: `rotate(${sp.r}deg) scale(${0.85 + 0.15 * q})`,
              opacity: q,
            }}
          />
        );
      })}
    </>
  );
};
