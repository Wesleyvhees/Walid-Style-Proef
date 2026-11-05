import React from "react";
import { AbsoluteFill, Audio, interpolate, Easing, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Beat, Storyboard, StylePreset, TitleBeat, WordsBeat, Zoom } from "./types";
import { PRESETS } from "./styles";
import { loadFonts } from "./fonts";
import { Captions } from "./components/Captions";
import { TitleText } from "./components/TitleText";
import { ChecklistCard, CommentCard, FloatingImages, FollowCard, PromptCard } from "./components/Cards";
import { EmojiPop, PhotoPop, PopText, VolgStempel } from "./components/Pops";
import { ChartCard, CutawayLayer, HookTitle, MeterGraphic, PersonaLabel, personaTransform, SceneLayer } from "./components/Scenes";

loadFonts();

const SFX_LEAD: Record<string, number> = { whoosh: 0.1, riser: 0.86 };
// Volume per geluid (Wes, dag 22: "geluidseffecten mogen iets zachter" -> alles ±30% zachter dan eerst).
// Per video of template nog zachter/harder met "sfxVolume" (vermenigvuldiger, standaard 1).
const SFX_VOL: Record<string, number> = { riser: 0.25, boom: 0.38, click: 0.28 };
const SFX_DEFAULT = 0.32;

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
  const s: StylePreset = { ...(PRESETS[sb.style] ?? PRESETS.wesbuilt), ...(sb.overrides ?? {}) };
  const now = sb.beats.filter((b) => active(b, t));
  const titleBeats = now.filter((b): b is TitleBeat => b.type === "title");
  const behind = titleBeats.filter((b) => b.behind && sb.person);
  const front = [
    ...titleBeats.filter((b) => !(b.behind && sb.person)),
    ...now.filter((b): b is WordsBeat => b.type === "words"),
  ];
  const solid = behind.some((b) => b.background === "solid");
  const z = zoomAt(sb.zooms ?? [], t);
  const pers = personaTransform(sb.beats, t);
  const lv = (sb.cutLevels ?? []).find((c) => t >= c.start && t < c.end);
  // schok in beeld bij een harde impact: beeld schiet 3 frames omlaag en veert terug (geen zoom, dus geen invloed op geluid)
  const hit = sb.beats.find((b) => b.type === "pop" && (b as any).hard && t >= b.start && t < b.start + 0.2);
  const jolt = hit ? Math.sin(((t - hit.start) / 0.2) * Math.PI) * 14 * (1 - (t - hit.start) / 0.2) : 0;
  const videoStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    filter: s.filter + (pers?.filter ?? ""),
    transform: `translateY(${jolt}px) scale(${z * (pers?.scale ?? 1) * (lv?.scale ?? 1) * (jolt ? 1.02 : 1)}) rotate(${pers?.rotate ?? 0}deg)`,
    transformOrigin: lv ? `${lv.ox}px ${lv.oy}px` : "50% 42%",
  };
  const cap = sb.captions ?? {};
  const capStyle: StylePreset = cap.style ? { ...s, ...(PRESETS[cap.style] ?? {}) } : s;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* virtuele camera: vaste uitsnede per shot (multicam uit één opname) */}
      {(() => {
        const shot = (sb.camShots ?? []).find((c) => t >= c.start && t < c.end);
        return (
          <AbsoluteFill
            style={shot ? { transform: `translate(${shot.tx}px, ${shot.ty}px) scale(${shot.scale})`, transformOrigin: "0 0" } : undefined}
          >
            <OffthreadVideo src={staticFile(`p/${sb.video}`)} style={videoStyle} />
          </AbsoluteFill>
        );
      })()}
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
        if (b.type === "meter") return <MeterGraphic key={`c${i}`} beat={b} style={s} />;
        if (b.type === "persona") return <PersonaLabel key={`c${i}`} beat={b} style={s} />;
        if (b.type === "volgstempel") return <VolgStempel key={`c${i}`} beat={b} />;
        if (b.type === "checklist") return <ChecklistCard key={`c${i}`} beat={b} style={s} />;
        return null;
      })}
      {now.map((b, i) => (b.type === "hook" ? <HookTitle key={`h${i}`} beat={b} style={s} /> : null))}
      {cap.enabled !== false && !now.some((b) => b.type === "follow" || b.type === "chart" || b.type === "volgstempel") ? (
        <Captions words={sb.words} style={capStyle} size={cap.size} y={cap.y} maxChars={cap.maxChars} maxWords={cap.maxWords} highlight={cap.highlight} layout={sb.layout} />
      ) : null}
      {sb.beats
        .flatMap((b) => [
          ...(b.sfx ? (Array.isArray(b.sfx) ? b.sfx : [b.sfx]).map((fx) => ({ fx, start: b.start })) : []),
          // checklist: een geluid per vinkje (alleen vinkjes die tijdens de beat aanspringen)
          ...(b.type === "checklist" && b.itemSfx !== "none"
            ? b.items.filter((it) => it.at > b.start + 0.05).map((it) => ({ fx: (b.itemSfx ?? "ding") as string, start: it.at }))
            : []),
        ])
        .map(({ fx, start }, i) => (
          // whoosh iets vóór de beweging; riser piekt precies op het moment zelf
          <Sequence
            key={`s${i}`}
            from={Math.max(0, Math.round((start - (SFX_LEAD[fx] ?? 0)) * fps))}
            durationInFrames={45}
            layout="none"
          >
            <Audio src={staticFile(`sfx/${fx}.wav`)} volume={(SFX_VOL[fx] ?? SFX_DEFAULT) * (sb.sfxVolume ?? 1)} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};
