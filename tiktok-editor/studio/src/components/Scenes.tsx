import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { ChartBeat, CutawayBeat, HookBeat, SceneBeat, StylePreset } from "../types";
import { fontCss, SAFE, skin } from "../styles";
import { fxSkin, useFxLook, GREEN } from "../fxlook";
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
  const t = frame / fps;
  const outP = t < beat.end ? 1 : 0; // harde cut, geen overvloeier
  const mode = beat.mode === "cutout" && person ? "cutout" : "pip";
  const target = beat.scale ?? (mode === "cutout" ? 0.8 : 0.46);
  const sc = 1 + (target - 1) * inP;
  const anchor = beat.anchor ?? (mode === "cutout" ? "bottom" : "center");
  const origin = { bottom: "50% 100%", center: "50% 55%", left: "8% 100%", right: "92% 100%" }[anchor];
  return (
    <AbsoluteFill style={{ opacity: outP }}>
      <AbsoluteFill>
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
  const out = frame / fps < beat.end ? 1 : 0; // harde cut
  return (
    <AbsoluteFill style={{ opacity: out, transform: `scale(${1.08 - 0.08 * p})` }}>
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
  const groups: { text: string; block: boolean }[] = [];
  {
    let cur: string[] | null = null;
    for (const w of words) {
      if (cur) {
        cur.push(w.replace(/\]$/, ""));
        if (w.endsWith("]")) { groups.push({ text: cur.join(" "), block: true }); cur = null; }
      } else if (w.startsWith("[")) {
        if (w.endsWith("]")) groups.push({ text: w.slice(1, -1), block: true });
        else cur = [w.slice(1)];
      } else groups.push({ text: w, block: false });
    }
    if (cur) groups.push({ text: cur.join(" "), block: true });
  }
  const pv = useFxLook("pil");
  const pilSkin: React.CSSProperties =
    pv === 5
      ? { background: "transparent", color: GREEN, borderTop: `2px solid ${GREEN}`, borderBottom: `2px solid ${GREEN}`, borderRadius: 0, padding: "0.3em 0.2em" }
      : fxSkin(pv, style);
  return (
    <div
      style={{
        position: "absolute",
        top: beat.y ?? 250,
        left: 60, // gecentreerd op het midden van het beeld (bovenin zitten geen TikTok-knoppen)
        right: 60,
        textAlign: "center",
        opacity: out,
        transform: `translateY(${(1 - out) * -20}px)`,
      }}
    >
      <div style={{ ...fontCss((beat as any).font ?? "sans"), fontSize: beat.size ?? 80, lineHeight: 1.04, color: "#fff", textShadow: "0 6px 28px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.6)", WebkitTextStroke: `${Math.round((beat.size ?? 80) * 0.09)}px rgba(0,0,0,0.55)`, paintOrder: "stroke fill" }}>
        {groups.map((g, i) => {
          const p = enter(frame, beat.start + i * 0.06, fps, 14);
          const hot = /\*[^*]+\*/.test(g.text);
          // [woorden] = kernwoorden in een groen blok (Wes 2026-11-10, analyse 'hooks': 'No Longer Works' in een blok)
          const blk: React.CSSProperties = g.block
            ? { background: GREEN, color: "#0B0B0B", padding: "0.02em 0.18em 0.06em", borderRadius: 10, WebkitTextStroke: "0px transparent", textShadow: "none", boxShadow: "0 10px 26px rgba(0,0,0,0.45)" }
            : {};
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                marginRight: "0.22em",
                opacity: p,
                transform: `translateY(${(1 - p) * 24}px)`,
                color: hot ? style.accent : "#fff",
                ...blk,
              }}
            >
              {g.text.replace(/\*/g, "")}
            </span>
          );
        })}
      </div>
      {beat.sub ? (
        <div
          style={{
            ...fontCss("mono"),
            display: "inline-block",
            marginTop: 22,
            // altijd één regel: lange serietitels krimpen tot ze passen (Wes 2026-11-09, volledige serietitel)
            fontSize: Math.round(Math.min((beat.size ?? 80) * 0.42, 880 / (String(beat.sub).length * 0.66 + 1.6))),
            whiteSpace: "nowrap",
            color: style.cardInk,
            ...pilSkin,
            padding: "0.35em 0.8em",
            borderRadius: 999,
            fontWeight: 700,
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
            <div style={{ ...fontCss("sans"), fontWeight: 700, fontSize: 36, width: beat.mode === "list" ? undefined : 110, flex: beat.mode === "list" ? 1 : undefined, color: "rgba(255,255,255,0.7)", letterSpacing: "-0.01em" }}>{r.label}</div>
            {beat.mode !== "list" ? (
              <div style={{ flex: 1, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ width: `${w * 100 * count}%`, height: "100%", borderRadius: 10, background: hot ? style.accent : "rgba(255,255,255,0.85)" }} />
              </div>
            ) : null}
            <div style={{ ...fontCss("sans"), fontSize: 44, width: 230, textAlign: "right", color: hot ? style.accent : "#fff" }}>
              {r.text ?? v.toFixed(dec).replace(".", ",")}
              {beat.unit && !r.text ? <span style={{ fontSize: 28, opacity: 0.7 }}> {r.unit ?? beat.unit}</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Batterij/tank die live meebeweegt met de uitleg (kleur groen → geel → rood).
export const MeterGraphic: React.FC<{ beat: import("../types").MeterBeat; style: StylePreset }> = ({ beat, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = enter(frame, beat.start, fps, 14) * exit(frame, beat.end, fps, 0.12);
  const lv = [...beat.levels].sort((a, b) => a.at - b.at);
  let v = lv[0]?.value ?? 1;
  for (let i = 0; i < lv.length; i++) {
    const cur = lv[i];
    const prev = lv[i - 1];
    if (t >= cur.at) v = cur.value;
    else if (prev && t > prev.at) {
      // vloeiend naar het volgende niveau in 0.5 s vóór `at`
      v = interpolate(t, [Math.max(prev.at, cur.at - 0.5), cur.at], [prev.value, cur.value], { ...clamp, easing: Easing.inOut(Easing.cubic) });
      break;
    } else break;
  }
  const color = v > 0.6 ? "#34C759" : v > 0.3 ? "#FFCC00" : "#FF3B30";
  if (beat.look && beat.look !== "classic") return <MeterPro beat={beat} v={v} p={p} t={t} />;
  const size = beat.size ?? 380;
  const w = size;
  const h = size * 0.5;
  const segs = 5;
  const filled = v * segs;
  const kind = beat.kind ?? "battery";
  return (
    <div
      style={{
        position: "absolute",
        left: (beat.x ?? 540) - w / 2 - 30,
        top: beat.y ?? 250,
        padding: 26,
        borderRadius: 30,
        background: "rgba(255,255,255,0.96)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
        transform: `scale(${0.8 + 0.2 * p})`,
        opacity: p,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
      }}
    >
      {kind === "battery" ? (
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: w, height: h, border: `${size * 0.035}px solid #111`, borderRadius: size * 0.07, padding: size * 0.025, display: "flex", gap: size * 0.02 }}>
            {Array.from({ length: segs }).map((_, i) => {
              const f = Math.max(0, Math.min(1, filled - i));
              return (
                <div key={i} style={{ flex: 1, borderRadius: size * 0.025, background: "rgba(0,0,0,0.07)", overflow: "hidden", display: "flex" }}>
                  <div style={{ width: `${f * 100}%`, background: color }} />
                </div>
              );
            })}
          </div>
          <div style={{ width: size * 0.05, height: h * 0.4, background: "#111", borderRadius: `0 ${size * 0.02}px ${size * 0.02}px 0` }} />
        </div>
      ) : (
        <svg width={w} height={w * 0.62} viewBox="0 0 200 124">
          <path d="M20 110 A80 80 0 0 1 180 110" stroke="rgba(0,0,0,0.12)" strokeWidth="18" fill="none" strokeLinecap="round" />
          <path d="M20 110 A80 80 0 0 1 180 110" stroke={color} strokeWidth="18" fill="none" strokeLinecap="round" pathLength={100} strokeDasharray={`${v * 100} 100`} />
          <line x1="100" y1="110" x2={100 + 70 * Math.cos(Math.PI * (1 - v))} y2={110 - 70 * Math.sin(Math.PI * (1 - v))} stroke="#111" strokeWidth="6" strokeLinecap="round" />
          <circle cx="100" cy="110" r="10" fill="#111" />
          <text x="14" y="122" fontSize="16" fontFamily="InterVar" fontWeight="900">E</text>
          <text x="176" y="122" fontSize="16" fontFamily="InterVar" fontWeight="900">F</text>
        </svg>
      )}
      <div style={{ ...fontCss("mono"), fontSize: 26, color: "#111", textTransform: "uppercase", display: "flex", gap: 14 }}>
        {beat.label ? <span>{beat.label}</span> : null}
        <span style={{ color: style.accent === "#FFFFFF" ? "#111" : "#111", fontWeight: 700 }}>{Math.round(v * 100)}%</span>
      </div>
    </div>
  );
};

// "Kijker-stem": jij speelt de kijker. Close-up, iets scheef en een label.
export const personaTransform = (beats: import("../types").Beat[], t: number) => {
  const b = beats.find((x) => x.type === "persona" && t >= x.start && t < x.end);
  return b ? { scale: 1.34, rotate: -3, filter: " saturate(0.75) contrast(1.1)" } : null;
};

export const PersonaLabel: React.FC<{ beat: import("../types").PersonaBeat; style: StylePreset }> = ({ beat, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, beat.start, fps, 12);
  return (
    <div
      style={{
        position: "absolute",
        top: 260,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          ...fontCss("sans"),
          fontSize: 96,
          color: style.cardInk,
          ...skin(style),
          padding: "14px 44px 20px",
          borderRadius: 999,
          transform: `rotate(-4deg) scale(${p})`,
          boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
        }}
      >
        {beat.label ?? "jij"}:
      </div>
    </div>
  );
};

// Professionele batterijen (Wes, blauwdruk dag 10: "het icoontje is niet professioneel genoeg"): 3 looks.
const meterColor = (v: number) => (v > 0.6 ? "#A3D45A" : v > 0.3 ? "#F2B33D" : "#F0533D");
const MeterPro: React.FC<{ beat: import("../types").MeterBeat; v: number; p: number; t: number }> = ({ beat, v, p, t }) => {
  const c = meterColor(v);
  const pct = Math.round(v * 100);
  const lv = [...beat.levels].sort((a, b) => a.at - b.at);
  const next = lv.find((l) => l.at > t);
  const prev = [...lv].reverse().find((l) => l.at <= t);
  const charging = !!(next && prev && next.value > prev.value && next.at - t < 0.6);
  const cx = beat.x ?? 540;
  const top = beat.y ?? 300;
  const bolt = (size: number, fill: string) => (
    <svg width={size} height={size} viewBox="0 0 24 24"><path d="M13 2 L4 14 H11 L10 22 L20 9 H13 Z" fill={fill} /></svg>
  );
  const wrap: React.CSSProperties = { position: "absolute", left: cx, top, transform: `translate(-50%,0) scale(${0.85 + 0.15 * p})`, opacity: p };
  if (beat.look === "glas") {
    // A: donker glazen kaartje, liggende batterij met glanzende vulling, groot percentage
    return (
      <div style={{ ...wrap, display: "flex", alignItems: "center", gap: 28, padding: "26px 34px", borderRadius: 34, background: "rgba(16,16,18,0.62)", border: "1px solid rgba(255,255,255,0.16)", boxShadow: `0 30px 70px rgba(0,0,0,0.45), 0 0 60px ${c}33`, backdropFilter: "blur(18px)" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ position: "relative", width: 230, height: 110, borderRadius: 28, border: "5px solid rgba(255,255,255,0.9)", padding: 7 }}>
            <div style={{ height: "100%", width: `${Math.max(6, pct)}%`, borderRadius: 18, background: `linear-gradient(180deg, ${c} 0%, ${c}CC 100%)`, boxShadow: `0 0 24px ${c}AA` }} />
            <div style={{ position: "absolute", left: 7, right: 7, top: 7, height: "34%", borderRadius: "18px 18px 40px 40px", background: "linear-gradient(180deg, rgba(255,255,255,0.45), rgba(255,255,255,0))" }} />
            {charging ? <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>{bolt(58, "#fff")}</div> : null}
          </div>
          <div style={{ width: 12, height: 40, marginLeft: 6, borderRadius: "0 8px 8px 0", background: "rgba(255,255,255,0.9)" }} />
        </div>
        <div>
          <div style={{ ...fontCss("condensed"), fontSize: 118, lineHeight: 0.9, color: "#fff" }}>{pct}<span style={{ fontSize: 60, color: c }}>%</span></div>
          {beat.label ? <div style={{ ...fontCss("mono"), fontSize: 24, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", marginTop: 6 }}>{beat.label}</div> : null}
        </div>
      </div>
    );
  }
  if (beat.look === "ios") {
    // B: grote, strakke batterij zoals op je telefoon, percentage in de batterij
    return (
      <div style={{ ...wrap, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.45))" }}>
          <div style={{ position: "relative", width: 420, height: 190, borderRadius: 52, background: "rgba(255,255,255,0.28)", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: c }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, ...fontCss("sans"), fontSize: 112, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.35)" }}>
              {charging ? bolt(80, "#fff") : null}
              {pct}
            </div>
          </div>
          <div style={{ width: 18, height: 64, marginLeft: 8, borderRadius: "0 14px 14px 0", background: "rgba(255,255,255,0.45)" }} />
        </div>
        {beat.label ? <div style={{ ...fontCss("sans"), fontSize: 40, color: "#fff", padding: "8px 22px", borderRadius: 999, background: "rgba(0,0,0,0.5)" }}>{beat.label}</div> : null}
      </div>
    );
  }
  // C: ring zoals een smartwatch, met verloop en batterijtje in het midden
  const R = 120;
  const L = 2 * Math.PI * R;
  return (
    <div style={{ ...wrap, width: 340, height: 340, borderRadius: 340, background: "radial-gradient(circle, rgba(20,20,22,0.85) 0%, rgba(20,20,22,0.7) 70%)", boxShadow: `0 30px 70px rgba(0,0,0,0.45), 0 0 70px ${c}33`, display: "grid", placeItems: "center" }}>
      <svg width="340" height="340" viewBox="0 0 340 340" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="mring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <circle cx="170" cy="170" r={R} stroke="rgba(255,255,255,0.12)" strokeWidth="26" fill="none" />
        <circle cx="170" cy="170" r={R} stroke="url(#mring)" strokeWidth="26" fill="none" strokeLinecap="round" strokeDasharray={`${L * v} ${L}`} transform="rotate(-90 170 170)" style={{ filter: `drop-shadow(0 0 10px ${c})` }} />
      </svg>
      <div style={{ textAlign: "center", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 2 }}>
          {charging ? bolt(40, c) : (
            <svg width="46" height="24" viewBox="0 0 46 24"><rect x="1.5" y="1.5" width="38" height="21" rx="5" stroke="#fff" strokeWidth="3" fill="none" /><rect x="5" y="5" width={Math.max(2, 31 * v)} height="14" rx="2.5" fill={c} /><rect x="41" y="8" width="4" height="8" rx="2" fill="#fff" /></svg>
          )}
        </div>
        <div style={{ ...fontCss("condensed"), fontSize: 100, lineHeight: 0.95, color: "#fff" }}>{pct}<span style={{ fontSize: 48, color: c }}>%</span></div>
        {beat.label ? <div style={{ ...fontCss("mono"), fontSize: 20, color: "rgba(255,255,255,0.75)", textTransform: "uppercase" }}>{beat.label}</div> : null}
      </div>
    </div>
  );
};
