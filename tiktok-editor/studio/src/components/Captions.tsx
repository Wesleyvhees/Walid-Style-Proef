import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { StylePreset, Word } from "../types";
import { fontCss, SAFE } from "../styles";
import { enter } from "../anim";

type Chunk = { words: Word[]; s: number; e: number };

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9à-ÿ]/g, "");
const clean = (w: string) => w.replace(/^[-–]+/, "").trim();

export const chunkWords = (words: Word[], maxChars: number): Chunk[] => {
  const out: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) out.push({ words: cur, s: cur[0].s, e: cur[cur.length - 1].e });
    cur = [];
  };
  words.forEach((w, i) => {
    const text = clean(w.w);
    if (!text) return;
    const len = cur.map((c) => clean(c.w)).join(" ").length;
    const prev = cur[cur.length - 1];
    if (cur.length && (len + 1 + text.length > maxChars || (prev && w.s - prev.e > 0.45))) flush();
    cur.push({ ...w, w: text });
    if (/[.!?,;:]$/.test(text)) flush();
    if (i === words.length - 1) flush();
  });
  // elke chunk blijft staan tot de volgende begint (max 0.6s na het laatste woord)
  return out.map((c, i) => ({
    ...c,
    e: Math.min(out[i + 1]?.s ?? c.e + 0.6, c.e + 0.6),
  }));
};

export const Captions: React.FC<{
  words: Word[];
  style: StylePreset;
  size?: number;
  y?: number;
  maxChars?: number;
  highlight?: string[];
}> = ({ words, style, size, y, maxChars, highlight }) => {
  const hl = React.useMemo(() => new Set((highlight ?? []).map(norm)), [highlight]);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const fs = size ?? style.captionSize;
  const chunks = React.useMemo(
    () => chunkWords(words, maxChars ?? (style.captionUpper ? 14 : 20)),
    [words, maxChars, style.captionUpper],
  );
  const chunk = chunks.find((c) => t >= c.s - 0.05 && t < c.e);
  if (!chunk) return null;
  const p = enter(frame, chunk.s - 0.05, fps, 22);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        width: SAFE.right - SAFE.left,
        top: y ?? 1170,
        display: "flex",
        justifyContent: "center",
        transform: `translateY(${(1 - p) * 14}px)`,
        opacity: Math.min(1, p * 1.4),
      }}
    >
      <div
        style={{
          ...fontCss(style.captionFont),
          fontSize: fs,
          lineHeight: 1.08,
          padding: style.captionBox ? `${fs * 0.08}px ${fs * 0.26}px ${fs * 0.12}px` : 0,
          background: style.captionBox ?? "transparent",
          borderRadius: 6,
          textAlign: "center",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          columnGap: "0.24em",
          textTransform: style.captionUpper ? "uppercase" : "none",
          textShadow: style.captionShadow ? "0 4px 24px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.5)" : "none",
        }}
      >
        {chunk.words.map((w, i) => {
          const spoken = t >= w.s - 0.02;
          const key = hl.has(norm(w.w));
          const kp = key && spoken ? enter(frame, w.s, fps, 10) : 0;
          return (
            <span
              key={i}
              style={{
                color: spoken ? (key ? style.accent : style.ink) : style.muted,
                display: "inline-block",
                transform: `scale(${1 + 0.08 * kp})`,
                // ruimte meeschalen zodat het grotere woord niet tegen de buren aan komt
                margin: key ? `0 ${(0.04 * w.w.length * kp).toFixed(3)}em` : 0,
              }}
            >
              {w.w}
            </span>
          );
        })}
      </div>
    </div>
  );
};
