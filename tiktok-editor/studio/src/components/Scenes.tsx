import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { ChartBeat, CutawayBeat, HookBeat, SceneBeat, StylePreset } from "../types";
import { fontCss, SAFE } from "../styles";
import { enter, exit } from "../anim";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Langzame Ken Burns-beweging zodat een stilstaand beeld leeft.
const KenBurns: React.FC<{ src: string; start: number; end: number; from?: number; to?: number; dim?: number }> = ({
  src,
  start,
  end,
  from = 1.12,
  to = 1.02,
  dim = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const z = interpolate(t, [start, end], [from, to], { ...clamp, easing: Easing.out(Easing.quad) });
  const dx = interpolate(t, [start, end], [-12, 12], clamp);
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#000" }}>
      <Img
        src={staticFile(`p/${src}`)}
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${z}) translateX(${dx}px)` }}
      />
      {dim ? <AbsoluteFill style={{ background: `rgba(0,0,0,${dim})` }} /> : null}
    </AbsoluteFill>
  );
};

// Achtergrond vervangen: jij uitgeknipt (cutout) of in een kader (pip) voor een passend beeld.
export const SceneLayer: React.FC<{
  beat: SceneBeat;
  video: string;
  person?: string;
  filter: string;
}> = ({ beat, video, person, filter }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!beat.src) return null;
  const inP = enter(frame, beat.start, fps, 20);
  const outP = exit(frame, beat.end, fps, 0.12);
  const mode = beat.mode === "cutout" && person ? "cutout" : "pip";
  const target = beat.scale ?? (mode === "cutout" ? 0.8 : 0.46);
  const sc = 1 + (target - 1) * inP;
  const anchor = beat.anchor ?? (mode === "cutout" ? "bottom" : "center");
  const origin = { bottom: "50% 100%", center: "50% 55%", left: "8% 100%", right: "92% 100%" }[anchor];
  return (
    <AbsoluteFill style={{ opacity: outP }}>
      <AbsoluteFill style={{ opacity: Math.min(1, inP * 1.5) }}>
        <KenBurns src={beat.src} start={beat.start} end={beat.end} dim={beat.dim ?? 0.12} />
      </AbsoluteFill>
      {mode === "cutout" ? (
        <AbsoluteFill style={{ transform: `scale(${sc})`, transformOrigin: origin }}>
          <OffthreadVideo
            src={staticFile(`p/${person}`)}
            transparent
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: `${filter} drop-shadow(0 0 3px rgba(255,255,255,0.9)) drop-shadow(0 26px 40px rgba(0,0,0,0.55))`,
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ transform: `scale(${sc})`, transformOrigin: origin }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 60 / Math.max(0.3, sc),
              overflow: "hidden",
              border: `${6 / Math.max(0.3, sc)}px solid rgba(255,255,255,0.95)`,
              boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
            }}
          >
            <OffthreadVideo src={staticFile(`p/${video}`)} muted style={{ width: "100%", height: "100%", objectFit: "cover", filter }} />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// Schermvullend beeld als korte cutaway.
export const CutawayLayer: React.FC<{ beat: CutawayBeat; style: StylePreset }> = ({ beat, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!beat.src) return null;
  const p = enter(frame, beat.start, fps, 22);
  const out = exit(frame, beat.end, fps, 0.08);
  return (
    <AbsoluteFill style={{ opacity: out, transform: `scale(${1.08 - 0.08 * p})`, filter: `blur(${(1 - p) * 10}px)` }}>
      <KenBurns src={beat.src} start={beat.start} end={beat.end} from={1.06} to={1.14} dim={0.05} />
      {beat.label ? (
        <div
          style={{
            position: "absolute",
            top: 300,
            left: 0,
            right: 0,
            textAlign: "center",
            ...fontCss("sans"),
            fontSize: 92,
            color: "#fff",
            textShadow: "0 6px 30px rgba(0,0,0,0.7)",
            transform: `scale(${0.8 + 0.2 * p})`,
          }}
        >
          {beat.label}
          <span style={{ color: style.accent }}>.</span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// Vaste hook-titel bovenin: de mythe/vraag + kleine ondertitel.
export const HookTitle: React.FC<{ beat: HookBeat; style: StylePreset }> = ({ beat, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = beat.text.split(" ");
  const out = exit(frame, beat.end, fps, 0.2);
  return (
    <div
      style={{
        position: "absolute",
        top: beat.y ?? 250,
        left: SAFE.left,
        right: 1080 - SAFE.right + 10,
        textAlign: "center",
        opacity: out,
        transform: `translateY(${(1 - out) * -20}px)`,
      }}
    >
      <div style={{ ...fontCss("sans"), fontSize: 80, lineHeight: 1.04, color: "#fff", textShadow: "0 6px 28px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.5)" }}>
        {words.map((w, i) => {
          const p = enter(frame, beat.start + i * 0.06, fps, 14);
          const hot = /\*[^*]+\*/.test(w);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                marginRight: "0.22em",
                opacity: p,
                transform: `translateY(${(1 - p) * 24}px)`,
                color: hot ? style.accent : "#fff",
              }}
            >
              {w.replace(/\*/g, "")}
            </span>
          );
        })}
      </div>
      {beat.sub ? (
        <div
          style={{
            ...fontCss("mono"),
            display: "inline-block",
            marginTop: 18,
            fontSize: 30,
            color: style.cardInk,
            background: style.card,
            padding: "10px 20px",
            borderRadius: 999,
            opacity: enter(frame, beat.start + 0.35, fps),
            textTransform: "uppercase",
          }}
        >
          {beat.sub}
        </div>
      ) : null}
    </div>
  );
};

// Geanimeerde data: rijen komen één voor één binnen, getallen tellen op.
export const ChartCard: React.FC<{ beat: ChartBeat; style: StylePreset }> = ({ beat, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = enter(frame, beat.start, fps, 18) * exit(frame, beat.end, fps, 0.15);
  const n = beat.rows.length;
  const span = Math.min(1.2, (beat.end - beat.start) * 0.55);
  const vals = beat.rows.map((r) => r.value);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const dec = beat.decimals ?? 1;
  const hl = new Set(beat.highlight ?? []);
  return (
    <div
      style={{
        position: "absolute",
        top: 240,
        left: 60,
        right: 60,
        padding: "36px 40px 40px",
        borderRadius: 34,
        background: "rgba(17,17,18,0.92)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
        border: "1px solid rgba(255,255,255,0.08)",
        opacity: p,
        transform: `translateY(${(1 - p) * 60}px) scale(${0.96 + 0.04 * p})`,
      }}
    >
      {beat.title ? (
        <div style={{ ...fontCss("mono"), fontSize: 28, color: style.accent, textTransform: "uppercase", marginBottom: 24 }}>{beat.title}</div>
      ) : null}
      {beat.rows.map((r, i) => {
        const at = beat.start + 0.15 + (i / Math.max(1, n)) * span;
        const q = enter(frame, at, fps, 16);
        const count = interpolate(t, [at, at + 0.35], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        const v = r.value * count;
        const hot = hl.has(i);
        const w = beat.mode === "list" ? 0 : 0.25 + (0.75 * (r.value - min)) / Math.max(1e-6, max - min);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, marginTop: i ? 16 : 0, opacity: q, transform: `translateX(${(1 - q) * -30}px)` }}>
            <div style={{ ...fontCss("sans"), fontWeight: 700, fontSize: 36, width: 110, color: "rgba(255,255,255,0.7)", letterSpacing: "-0.01em" }}>{r.label}</div>
            {beat.mode !== "list" ? (
              <div style={{ flex: 1, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ width: `${w * 100 * count}%`, height: "100%", borderRadius: 10, background: hot ? style.accent : "rgba(255,255,255,0.85)" }} />
              </div>
            ) : (
              <div style={{ flex: 1 }} />
            )}
            <div style={{ ...fontCss("sans"), fontSize: 44, width: 230, textAlign: "right", color: hot ? style.accent : "#fff" }}>
              {v.toFixed(dec).replace(".", ",")}
              {beat.unit ? <span style={{ fontSize: 28, opacity: 0.7 }}> {beat.unit}</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};
