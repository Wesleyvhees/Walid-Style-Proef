import React from "react";
import { AbsoluteFill, Audio, interpolate, Easing, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Beat, Storyboard, StylePreset, TitleBeat, WordsBeat, Zoom } from "./types";
import { PRESETS } from "./styles";
import { loadFonts } from "./fonts";
import { Captions } from "./components/Captions";
import { TitleText } from "./components/TitleText";
import { CommentCard, FloatingImages, FollowCard, PromptCard } from "./components/Cards";
import { EmojiPop, PhotoPop, PopText } from "./components/Pops";
import { ChartCard, CutawayLayer, HookTitle, SceneLayer } from "./components/Scenes";

loadFonts();

const zoomAt = (zooms: Zoom[], t: number) => {
  let z = 1;
  for (const zm of zooms) {
    const to = zm.to ?? 1.08;
    if (t < zm.start || t > zm.end + 0.25) continue;
    if (zm.ease === "punch") {
      const a = interpolate(t, [zm.start, zm.start + 0.16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
      const b = interpolate(t, [zm.end, zm.end + 0.2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
      z += (to - 1) * a * b;
    } else {
      const a = interpolate(t, [zm.start, zm.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
      const b = interpolate(t, [zm.end, zm.end + 0.25], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
      z += (to - 1) * a * b;
    }
  }
  return z;
};

const active = (b: Beat, t: number) => t >= b.start && t < b.end;

const Grain: React.FC<{ amount: number }> = ({ amount }) => {
  const frame = useCurrentFrame();
  if (!amount) return null;
  return (
    <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, opacity: amount, mixBlendMode: "overlay" }}>
      <filter id="g">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 50} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#g)" />
    </svg>
  );
};

const Title: React.FC<{ beat: TitleBeat | WordsBeat; s: StylePreset }> = ({ beat, s }) => (
  <TitleText
    lines={beat.lines}
    start={beat.start}
    y={beat.y ?? 250}
    align={beat.align ?? "center"}
    color={s.titleColor}
    accent={s.accent}
    kicker={beat.type === "title" ? beat.kicker : undefined}
    timecode={beat.type === "title" ? beat.timecode : undefined}
  />
);

export const Main: React.FC<Storyboard> = (sb) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const s: StylePreset = { ...(PRESETS[sb.style] ?? PRESETS.grip), ...(sb.overrides ?? {}) };
  const now = sb.beats.filter((b) => active(b, t));
  const titleBeats = now.filter((b): b is TitleBeat => b.type === "title");
  const behind = titleBeats.filter((b) => b.behind && sb.person);
  const front = [
    ...titleBeats.filter((b) => !(b.behind && sb.person)),
    ...now.filter((b): b is WordsBeat => b.type === "words"),
  ];
  const solid = behind.some((b) => b.background === "solid");
  const z = zoomAt(sb.zooms ?? [], t);
  const videoStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    filter: s.filter,
    transform: `scale(${z})`,
    transformOrigin: "50% 42%",
  };
  const cap = sb.captions ?? {};
  const capStyle: StylePreset = cap.style ? { ...s, ...(PRESETS[cap.style] ?? {}) } : s;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <OffthreadVideo src={staticFile(`p/${sb.video}`)} style={videoStyle} />
      {solid ? <AbsoluteFill style={{ background: s.bg }} /> : null}
      {behind.map((b, i) => (
        <Title key={`b${i}`} beat={b} s={s} />
      ))}
      {behind.length ? (
        <AbsoluteFill>
          <OffthreadVideo src={staticFile(`p/${sb.person}`)} transparent muted style={videoStyle} />
        </AbsoluteFill>
      ) : null}
      {now.map((b, i) =>
        b.type === "scene" ? <SceneLayer key={`sc${i}`} beat={b} video={sb.video} person={sb.person} filter={s.filter} /> : null,
      )}
      {now.map((b, i) => (b.type === "cutaway" ? <CutawayLayer key={`ca${i}`} beat={b} style={s} /> : null))}
      {s.vignette ? (
        <AbsoluteFill
          style={{ background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,${s.vignette}) 100%)` }}
        />
      ) : null}
      <Grain amount={s.grain} />
      {front.map((b, i) => (
        <Title key={`f${i}`} beat={b} s={s} />
      ))}
      {now.map((b, i) => {
        if (b.type === "prompt") return <PromptCard key={`c${i}`} beat={b} style={s} />;
        if (b.type === "follow") return <FollowCard key={`c${i}`} beat={b} style={s} />;
        if (b.type === "comment") return <CommentCard key={`c${i}`} beat={b} style={s} />;
        if (b.type === "images") return <FloatingImages key={`c${i}`} beat={b} />;
        if (b.type === "pop") return <PopText key={`c${i}`} beat={b} style={s} />;
        if (b.type === "emoji") return <EmojiPop key={`c${i}`} beat={b} />;
        if (b.type === "image") return <PhotoPop key={`c${i}`} beat={b} style={s} />;
        if (b.type === "chart") return <ChartCard key={`c${i}`} beat={b} style={s} />;
        return null;
      })}
      {now.map((b, i) => (b.type === "hook" ? <HookTitle key={`h${i}`} beat={b} style={s} /> : null))}
      {cap.enabled !== false ? (
        <Captions words={sb.words} style={capStyle} size={cap.size} y={cap.y} maxChars={cap.maxChars} highlight={cap.highlight} />
      ) : null}
      {sb.beats
        .filter((b) => b.sfx)
        .map((b, i) => (
          <Sequence key={`s${i}`} from={Math.max(0, Math.round(b.start * fps))} durationInFrames={45} layout="none">
            <Audio src={staticFile(`sfx/${b.sfx}.wav`)} volume={0.45} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};
