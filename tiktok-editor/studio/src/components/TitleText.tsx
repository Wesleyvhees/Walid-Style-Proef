import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { TitleLine } from "../types";
import { fontCss, SAFE } from "../styles";
import { enter } from "../anim";

// Gestapelde titelregels die één voor één binnenkomen (blur -> scherp).
export const TitleText: React.FC<{
  lines: TitleLine[];
  start: number;
  y: number;
  align: "left" | "center";
  color: string;
  kicker?: string;
  timecode?: boolean;
  accent: string;
}> = ({ lines, start, y, align, color, kicker, timecode, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  // Alleen regels die al verschenen zijn; latere "vervangen" de vorige als
  // ze `at` hebben en er een harde scènewissel bedoeld is (zie replaceGroups).
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: 40,
        right: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        textAlign: align,
      }}
    >
      {kicker ? (
        <div
          style={{
            ...fontCss("mono"),
            fontSize: 30,
            color: accent,
            textTransform: "uppercase",
            marginBottom: 18,
            opacity: enter(frame, start, fps),
          }}
        >
          {kicker}
        </div>
      ) : null}
      {lines.map((l, i) => {
        const at = l.at ?? start;
        if (t < at - 0.01) return null;
        const p = enter(frame, at, fps, 16);
        const size = l.size ?? 220;
        return (
          <div
            key={i}
            style={{
              ...fontCss(l.font ?? "serif"),
              ...(l.tracking !== undefined ? { letterSpacing: `${l.tracking}em` } : {}),
              fontSize: size,
              lineHeight: l.font === "condensed" || l.font === "sans" ? 0.92 : 0.86,
              color: l.color ?? color,
              textTransform: l.uppercase ? "uppercase" : "none",
              whiteSpace: "nowrap",
              opacity: Math.min(1, p * 1.6),
              filter: `blur(${(1 - p) * 14}px)`,
              transform: `translateY(${(1 - p) * 40}px) scale(${0.96 + 0.04 * p})`,
              transformOrigin: align === "center" ? "50% 100%" : "0% 100%",
            }}
          >
            {l.text}
          </div>
        );
      })}
      {timecode ? (
        <div style={{ ...fontCss("mono"), fontSize: 30, color: accent, marginTop: 22, opacity: 0.85 }}>
          {tc(t)}
        </div>
      ) : null}
    </div>
  );
};

const tc = (t: number) => {
  const f = Math.floor((t % 1) * 30);
  const s = Math.floor(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `00:00:${p(s)}:${p(f)}`;
};

export const usedSafe = SAFE;
