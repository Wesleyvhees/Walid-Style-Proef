// Nieuwe effect template: 17 effecten (geleerd uit Wes' voorbeeldvideo), in de Wes.Built-stijl.
// Elk effect tekent zijn eigen lagen (achtergrond, achter de persoon, uitsnede, ervoor), zodat de volgorde altijd klopt.
// v2 (2026-11-05, "upgrade de effecten"): meer diepte, echte zoomstrepen, uitbreken uit het kader, tekenanimaties.
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { FxBeat, Storyboard, StylePreset } from "../types";
import { fontCss } from "../styles";
import { enter } from "../anim";

type Props = { beat: FxBeat; sb: Storyboard; style: StylePreset; videoStyle: React.CSSProperties };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const shadow = "0 24px 60px rgba(0,0,0,0.45), 0 4px 14px rgba(0,0,0,0.3)";
const full: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
const accentOf = (s: StylePreset) => (s.accent === "#FFFFFF" ? "#FFFFFF" : s.accent);

// gezicht (x, y, b, h) op tijdstip t uit layout.json, of een redelijke standaard
export const faceAt = (sb: Storyboard, t: number): [number, number, number, number] => {
  const L = sb.layout;
  if (L?.faces?.length) {
    const i = Math.max(0, Math.min(L.faces.length - 1, Math.floor(t * L.fps)));
    for (let d = 0; d < 12; d++) {
      const f = L.faces[i - d] ?? L.faces[i + d];
      if (f) return f;
    }
  }
  return [300, 560, 480, 480];
};

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, fps, t: frame / fps };
};

const Video: React.FC<{ sb: Storyboard; style?: React.CSSProperties; src?: string }> = ({ sb, style, src }) => (
  <OffthreadVideo src={staticFile(`p/${src ?? sb.video}`)} muted style={style ?? full} />
);

const Person: React.FC<{ sb: Storyboard; style?: React.CSSProperties }> = ({ sb, style }) =>
  sb.person ? (
    <AbsoluteFill>
      <OffthreadVideo src={staticFile(`p/${sb.person}`)} transparent muted style={style ?? full} />
    </AbsoluteFill>
  ) : null;

// zachte schaduw op de grond onder de persoon (maakt een nieuwe achtergrond geloofwaardig)
const Contact: React.FC<{ y?: number; o?: number }> = ({ y = 1840, o = 0.45 }) => (
  <div style={{ position: "absolute", left: 140, right: 140, top: y - 70, height: 140, borderRadius: "50%", background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,${o}) 0%, rgba(0,0,0,0) 70%)` }} />
);

// deterministische "willekeur" (zelfde beeld bij elke render)
const rnd = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// 1. ORBIT: kaartjes draaien in een schuine baan om je hoofd, achter je langs (wazig) en voor je langs (scherp)
const Orbit: React.FC<Props> = ({ beat, sb, videoStyle }) => {
  const { t, frame, fps } = useT();
  const p = enter(frame, beat.start, fps, 16);
  const imgs = beat.images ?? [];
  const f = faceAt(sb, beat.start);
  const cx = f[0] + f[2] / 2;
  const cy = f[1] + f[3] * 0.55;
  const rx = (beat.rx ?? 470) * (0.4 + 0.6 * p);
  const ry = 150;
  const tilt = -0.18; // schuine baan
  const cards = imgs.map((src, i) => {
    const th = (t - beat.start) * (beat.speed ?? 1.5) + (i * 2 * Math.PI) / imgs.length + Math.PI / 2;
    const d = Math.sin(th);
    const ox = rx * Math.cos(th);
    const oy = ry * d;
    const s = (0.62 + 0.38 * (d + 1) / 2) * (0.5 + 0.5 * p);
    return { src, i, d, s, x: cx + ox, y: cy + oy + ox * tilt, rot: Math.cos(th) * -14 };
  });
  const w = 280;
  const h = 420;
  const card = (c: (typeof cards)[number]) => (
    <div
      key={c.i}
      style={{
        position: "absolute",
        left: c.x - (w * c.s) / 2,
        top: c.y - (h * c.s) / 2,
        width: w * c.s,
        height: h * c.s,
        borderRadius: 22 * c.s,
        overflow: "hidden",
        border: `${Math.max(3, 6 * c.s)}px solid #fff`,
        boxShadow: shadow,
        opacity: p,
        transform: `perspective(900px) rotateY(${c.rot}deg)`,
        filter: c.d < 0 ? `blur(${(-c.d * 4).toFixed(1)}px) brightness(0.7)` : "none",
      }}
    >
      <Img src={staticFile(`p/${c.src}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
  return (
    <AbsoluteFill>
      {cards.filter((c) => c.d < 0).sort((a, b) => a.d - b.d).map(card)}
      <Person sb={sb} style={videoStyle} />
      {cards.filter((c) => c.d >= 0).sort((a, b) => a.d - b.d).map(card)}
    </AbsoluteFill>
  );
};

// 2. COUCH WALL: wand vol screenshots achter je, kolommen schuiven in tegengestelde richting (parallax)
const CouchWall: React.FC<Props> = ({ beat, sb, style }) => {
  const { t, frame, fps } = useT();
  const imgs = beat.images ?? [];
  const tw = 340;
  const th = 560;
  const dt = t - beat.start;
  const tiles = [];
  for (let c = 0; c < 4; c++) {
    const dir = c % 2 ? 1 : -1;
    const drift = dt * 60 * dir;
    for (let r = -1; r < 5; r++) {
      const i = (r + 1) * 4 + c;
      const at = beat.start + rnd(i) * 0.4;
      const q = enter(frame, at, fps, 14);
      tiles.push(
        <div
          key={i}
          style={{
            position: "absolute",
            left: c * 290 - 90,
            top: r * 590 - 120 + drift + (c % 2) * 250,
            width: tw,
            height: th,
            borderRadius: 18,
            overflow: "hidden",
            border: "4px solid rgba(255,255,255,0.92)",
            boxShadow: shadow,
            transform: `rotate(${(rnd(i + 7) - 0.5) * 6}deg) perspective(800px) rotateY(${(1 - q) * 70}deg)`,
            opacity: q,
          }}
        >
          <Img src={staticFile(`p/${imgs[i % Math.max(1, imgs.length)]}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>,
      );
    }
  }
  return (
    <AbsoluteFill style={{ background: "#141310" }}>
      {imgs.length ? tiles : null}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(20,19,16,0.15) 25%, rgba(20,19,16,0.75) 100%)" }} />
      <Contact />
      <Person sb={sb} style={{ ...full, filter: `${style.filter} drop-shadow(0 0 2px rgba(255,255,255,0.6)) drop-shadow(0 30px 50px rgba(0,0,0,0.7))` }} />
    </AbsoluteFill>
  );
};

// 3. UI WORLD: jij in een app; de opdracht wordt getypt, verstuurd en beantwoord
const UiWorld: React.FC<Props> = ({ beat, sb, style }) => {
  const { t, frame, fps } = useT();
  const text = beat.text ?? "";
  const from = beat.start + 0.2;
  const typed = from + text.length * 0.04;
  const n = Math.round(interpolate(t, [from, typed], [0, text.length], clamp));
  const sent = t >= typed + 0.15;
  const sp = enter(frame, typed + 0.15, fps, 14);
  const rp = enter(frame, typed + 0.55, fps, 14);
  const p = enter(frame, beat.start, fps, 16);
  const acc = accentOf(style);
  const bubble: React.CSSProperties = { ...fontCss("sans"), fontWeight: 600, fontSize: 36, letterSpacing: "-0.02em", padding: "20px 26px", borderRadius: 26, maxWidth: 760 };
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#F7F4EF 0%,#E9E4DA 100%)" }}>
      <div style={{ position: "absolute", top: 90, left: 70, right: 70, display: "flex", alignItems: "center", gap: 14, ...fontCss("sans"), fontSize: 32, color: "#3a3832", opacity: p }}>
        <span style={{ width: 24, height: 24, borderRadius: 24, background: acc }} />
        {beat.title ?? "Studio"}
        <span style={{ marginLeft: "auto", ...fontCss("mono"), fontSize: 20, color: "#9a958b" }}>nieuw gesprek</span>
      </div>
      {sent ? (
        <div style={{ position: "absolute", top: 170, right: 70, ...bubble, background: "#141310", color: "#fff", opacity: sp, transform: `translateY(${(1 - sp) * 20}px)` }}>{text}</div>
      ) : null}
      {sent ? (
        <div style={{ position: "absolute", top: 290, left: 70, ...bubble, background: "#fff", color: "#1a1a1a", boxShadow: "0 10px 30px rgba(20,19,16,0.12)", opacity: rp, transform: `translateY(${(1 - rp) * 20}px)`, display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ width: 34, height: 34, borderRadius: 34, background: acc, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" stroke="#141310" strokeWidth="3.4" fill="none" strokeLinecap="round" /></svg>
          </span>
          {beat.label ?? "Klaar, je video staat klaar"}
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: sent ? 1500 : 200,
          padding: "26px 30px 20px",
          borderRadius: 30,
          background: "#fff",
          boxShadow: "0 18px 50px rgba(20,19,16,0.16)",
          opacity: p,
          transform: `translateY(${(1 - p) * -30}px)`,
        }}
      >
        <div style={{ ...fontCss("sans"), fontWeight: 500, fontSize: 40, letterSpacing: "-0.02em", color: sent ? "#aaa" : "#222", minHeight: 52 }}>
          {sent ? "Stel een vraag" : text.slice(0, n)}
          {!sent && Math.floor(t * 2.4) % 2 === 0 ? <span style={{ color: "#999" }}>|</span> : null}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <div style={{ ...fontCss("mono"), fontSize: 26, color: "#888" }}>+</div>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: n >= text.length && !sent ? acc : "#222", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="26" height="26" viewBox="0 0 24 24">
              <path d="M12 19V5M5 12l7-7 7 7" stroke="#fff" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      <Contact o={0.25} />
      <Person sb={sb} style={{ ...full, filter: `${style.filter} drop-shadow(0 20px 40px rgba(0,0,0,0.25))` }} />
    </AbsoluteFill>
  );
};

// 4. FRAME BREAK: de video krimpt tot een gekanteld kader; je hoofd en schouders steken er bovenuit
const FrameBreak: React.FC<Props> = ({ beat, sb, style }) => {
  const { t } = useT();
  const p = interpolate(t, [beat.start, beat.start + 0.35], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const f = faceAt(sb, beat.start);
  const sc = 1 - 0.24 * p;
  // bovenrand van het kader halverwege je gezicht: je hoofd breekt er bovenuit
  const top = Math.max(200, f[1] + f[3] * 0.45);
  const inset = { top, right: 150, bottom: 360, left: 150 };
  const ry = -9 * p;
  const acc = accentOf(style);
  return (
    <AbsoluteFill>
      <Video sb={sb} style={{ ...full, filter: `${style.filter} blur(26px) brightness(0.55) saturate(0.8)`, transform: "scale(1.15)" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 55%, ${acc}33 0%, rgba(0,0,0,0) 55%)` }} />
      <AbsoluteFill style={{ transform: `perspective(1600px) rotateY(${ry}deg) scale(${sc})`, transformOrigin: "50% 55%" }}>
        <AbsoluteFill style={{ clipPath: `inset(${inset.top * p}px ${inset.right * p}px ${inset.bottom * p}px ${inset.left * p}px round ${40 * p}px)` }}>
          <Video sb={sb} style={{ ...full, filter: style.filter }} />
        </AbsoluteFill>
        <div
          style={{
            position: "absolute",
            top: inset.top * p,
            left: inset.left * p,
            right: inset.right * p,
            bottom: inset.bottom * p,
            borderRadius: 40 * p,
            border: `${7 * p}px solid rgba(255,255,255,0.95)`,
            boxShadow: `0 40px 120px rgba(0,0,0,${0.6 * p})`,
          }}
        />
        {p > 0.35 ? (
          <AbsoluteFill style={{ clipPath: `inset(0px 0px ${(1920 - inset.top - 40) * p}px 0px)` }}>
            <Person sb={sb} style={{ ...full, filter: `${style.filter} drop-shadow(0 18px 30px rgba(0,0,0,0.5))` }} />
          </AbsoluteFill>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 6. PHONE MOCKUP: telefoon met statusbalk schuift in, een vinger tikt de knop aan
const Phone: React.FC<Props> = ({ beat, style }) => {
  const { t, frame, fps } = useT();
  const p = spring({ frame: frame - Math.round(beat.start * fps), fps, config: { damping: 14, mass: 0.6, stiffness: 120 } });
  const pa = beat.pressAt ?? beat.end;
  const pressed = t >= pa;
  const pr = interpolate(t, [pa, pa + 0.12, pa + 0.3], [1, 0.9, 1], clamp);
  const ripple = interpolate(t, [pa, pa + 0.5], [0, 1], clamp);
  const tap = interpolate(t, [pa - 0.5, pa], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const rows = beat.rows ?? [];
  const acc = accentOf(style);
  return (
    <div
      style={{
        position: "absolute",
        left: 650,
        top: 420,
        width: 400,
        height: 830,
        borderRadius: 66,
        background: "#0d0d0e",
        border: "10px solid #2c2c2e",
        boxShadow: `${shadow}, inset 0 0 0 2px #444`,
        transform: `perspective(1200px) translateX(${(1 - p) * 600}px) rotateY(${-14 + (1 - p) * -20}deg) rotate(-2deg)`,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 30px 0", ...fontCss("sans"), fontSize: 20, color: "#fff" }}>
        <span>9:41</span>
        <span style={{ width: 110, height: 30, borderRadius: 30, background: "#000" }} />
        <span style={{ width: 34, height: 16, borderRadius: 4, border: "2px solid #fff", position: "relative" }}>
          <span style={{ position: "absolute", inset: 2, right: 8, background: acc, borderRadius: 2 }} />
        </span>
      </div>
      <div style={{ padding: "28px 28px 0" }}>
        <div style={{ ...fontCss("mono"), fontSize: 20, color: acc, textTransform: "uppercase" }}>Wes.Built</div>
        <div style={{ ...fontCss("sans"), fontSize: 40, color: "#fff", marginTop: 6, lineHeight: 1.05 }}>{beat.title}</div>
        {rows.map((r, i) => {
          const q = enter(frame, beat.start + 0.25 + i * 0.12, fps, 16);
          const bar = interpolate(t, [beat.start + 0.35 + i * 0.12, beat.start + 0.9 + i * 0.12], [0, 0.45 + rnd(i) * 0.5], clamp);
          return (
            <div key={i} style={{ marginTop: 16, padding: "18px 20px", borderRadius: 20, background: "#1d1d20", opacity: q, transform: `translateY(${(1 - q) * 20}px)` }}>
              <div style={{ ...fontCss("mono"), fontSize: 26, color: "#ddd" }}>{r}</div>
              <div style={{ marginTop: 10, height: 8, borderRadius: 8, background: "#2c2c30" }}>
                <div style={{ width: `${bar * 100}%`, height: "100%", borderRadius: 8, background: acc }} />
              </div>
            </div>
          );
        })}
      </div>
      {beat.button ? (
        <div style={{ position: "absolute", left: 28, right: 28, bottom: 46 }}>
          <div style={{ ...fontCss("sans"), fontSize: 32, textAlign: "center", padding: "24px 0", borderRadius: 999, background: acc, color: "#141310", transform: `scale(${pr})` }}>
            {pressed ? `✓ ${beat.button}` : beat.button}
          </div>
          {ripple > 0 && ripple < 1 ? (
            <div style={{ position: "absolute", left: "50%", top: "50%", width: 40, height: 40, marginLeft: -20, marginTop: -20, borderRadius: 40, border: "4px solid #fff", opacity: 1 - ripple, transform: `scale(${1 + ripple * 7})` }} />
          ) : null}
          {tap > 0 && t < pa + 0.35 ? (
            <div style={{ position: "absolute", left: "50%", top: "50%", width: 70, height: 70, marginLeft: -35, marginTop: -35 + (1 - tap) * 260, borderRadius: 70, background: "rgba(255,255,255,0.35)", border: "3px solid rgba(255,255,255,0.8)", transform: `scale(${pressed ? 0.8 : 1})` }} />
          ) : null}
        </div>
      ) : null}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(125deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 35%)", pointerEvents: "none" }} />
    </div>
  );
};

// 8. HEADLINE WALL: gescheurde krantenknipsels poppen op, afwisselend licht/donker, met markeerstift
const SPOTS = [
  [270, 300, -6],
  [800, 400, 5],
  [300, 540, 3],
  [790, 640, -4],
  [260, 780, -3],
  [820, 860, 6],
];
const torn = (i: number) => {
  const pts: string[] = [];
  const n = 14;
  for (let k = 0; k <= n; k++) pts.push(`${(k / n) * 100}% ${rnd(i * 31 + k) * 6}%`);
  for (let k = n; k >= 0; k--) pts.push(`${(k / n) * 100}% ${94 + rnd(i * 17 + k) * 6}%`);
  return `polygon(${pts.join(",")})`;
};
const Headlines: React.FC<Props> = ({ beat, style }) => {
  const { t, frame, fps } = useT();
  const acc = accentOf(style);
  return (
    <AbsoluteFill>
      {(beat.items ?? []).map((it, i) => {
        const [x, y, r] = SPOTS[i % SPOTS.length];
        if (frame < Math.round(it.at * fps)) return null;
        const sp = spring({ frame: frame - Math.round(it.at * fps), fps, config: { damping: 11, mass: 0.45, stiffness: 220 } });
        const dark = i % 3 === 1;
        const drift = Math.sin((t - it.at) * 1.6 + i) * 6;
        const words = it.text.split(" ");
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y + drift,
              width: 460,
              transform: `translate(-50%,-50%) rotate(${r}deg) scale(${1.4 - 0.4 * sp})`,
              opacity: Math.min(1, sp * 2),
              filter: "drop-shadow(0 18px 26px rgba(0,0,0,0.4))",
            }}
          >
            <div style={{ clipPath: torn(i), background: dark ? "#141310" : "#F4EFE4", color: dark ? "#fff" : "#1a1a1a", padding: "30px 28px 34px" }}>
              <div style={{ ...fontCss("mono"), fontSize: 18, opacity: 0.6, textTransform: "uppercase", marginBottom: 6 }}>Wes.Built · nieuws</div>
              <div style={{ ...fontCss("serif"), fontSize: 58, lineHeight: 1.0 }}>
                {words.map((w, k) => (
                  <span key={k} style={k === words.length - 1 ? { background: `linear-gradient(180deg, transparent 55%, ${acc}AA 55%)` } : undefined}>
                    {w}{" "}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ position: "absolute", top: -14, left: "50%", width: 130, height: 34, marginLeft: -65, background: "rgba(242,214,75,0.82)", transform: `rotate(${(rnd(i) - 0.5) * 10}deg)` }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// 10. CHART GROW: lichtgevende lijn met vlak eronder, een stip die de lijn "trekt" en een teller
const LineChart: React.FC<Props> = ({ beat, style }) => {
  const { t, frame, fps } = useT();
  const v = beat.values ?? [];
  if (v.length < 2) return null;
  const mn = Math.min(...v);
  const mx = Math.max(...v);
  const top = beat.y ?? 760;
  const base = top + 300;
  const pts = v.map((val, i) => [80 + (i * 920) / (v.length - 1), top + 260 - (260 * (val - mn)) / Math.max(1e-6, mx - mn)]);
  const prog = interpolate(t, [beat.start + 0.1, beat.start + 1.1], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${d} L${pts[pts.length - 1][0]},${base} L${pts[0][0]},${base} Z`;
  // positie van de "kop" van de lijn
  const seg = prog * (pts.length - 1);
  const k = Math.min(pts.length - 2, Math.floor(seg));
  const fr = seg - k;
  const head = [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * fr, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * fr];
  const cur = v[k] + (v[k + 1] - v[k]) * fr;
  const last = pts[pts.length - 1];
  const lp = enter(frame, beat.start + 1.1, fps, 12);
  const pulse = (Math.sin((t - beat.start) * 8) + 1) / 2;
  const glow = accentOf(style);
  const id = `lc${Math.round(beat.start * 100)}`;
  return (
    <AbsoluteFill>
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={glow} stopOpacity="0.45" />
            <stop offset="100%" stopColor={glow} stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${id}c`}>
            <rect x="0" y="0" width={80 + 920 * prog + 2} height="1920" />
          </clipPath>
        </defs>
        {[0, 1, 2].map((g) => (
          <line key={g} x1="60" x2="1020" y1={top + g * 130} y2={top + g * 130} stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
        ))}
        <path d={area} fill={`url(#${id}g)`} clipPath={`url(#${id}c)`} />
        <g style={{ filter: `drop-shadow(0 0 14px ${glow})` }}>
          <path d={d} pathLength={1} stroke={glow} strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={1 - prog} />
          {pts.map((p, i) => (prog >= i / (pts.length - 1) - 0.001 ? <circle key={i} cx={p[0]} cy={p[1]} r="10" fill="#fff" stroke={glow} strokeWidth="5" /> : null))}
          {prog < 1 ? <circle cx={head[0]} cy={head[1]} r="16" fill="#fff" /> : <circle cx={last[0]} cy={last[1]} r={18 + pulse * 16} fill="none" stroke={glow} strokeWidth="4" opacity={1 - pulse * 0.7} />}
        </g>
      </svg>
      {prog > 0 && prog < 1 ? (
        <div style={{ position: "absolute", left: head[0] - 90, top: head[1] - 80, width: 180, textAlign: "center", ...fontCss("mono"), fontSize: 30, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>
          {cur.toFixed(1).replace(".", ",")}
        </div>
      ) : null}
      {beat.label ? (
        <div style={{ position: "absolute", left: Math.min(840, last[0]) - 160, top: last[1] - 130, width: 320, textAlign: "center", transform: `scale(${lp})`, ...fontCss("sans"), fontSize: 46, color: "#141310", background: glow, borderRadius: 999, padding: "10px 0", boxShadow: shadow }}>
          {beat.label}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// 11. PULL-BACK REVEAL: de video zoomt uit in een app-venster; vinkjes, voortgang en een muis die op Exporteren klikt
const PullBack: React.FC<Props> = ({ beat, sb, style }) => {
  const { t, frame, fps } = useT();
  const p = interpolate(t, [beat.start, beat.start + 0.6], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const L = (a: number, b: number) => a + (b - a) * p;
  const pane = { x: L(0, 440), y: L(0, 300), w: L(1080, 540), h: L(1920, 960) };
  const steps = beat.steps ?? [];
  const lastAt = steps.length ? steps[steps.length - 1].at : beat.end - 0.5;
  const pct = Math.round(interpolate(t, [beat.start + 0.5, lastAt + 0.2], [0, 100], clamp));
  const acc = accentOf(style);
  // muis: beweegt naar de knop en klikt
  const clickAt = lastAt + 0.35;
  const mx = interpolate(t, [beat.start + 0.6, clickAt], [700, 270], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const my = interpolate(t, [beat.start + 0.6, clickAt], [1500, 1102], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const clicked = t >= clickAt;
  const cp = enter(frame, clickAt, fps, 10);
  return (
    <AbsoluteFill style={{ background: "#E9E5DD" }}>
      <div style={{ position: "absolute", left: 50, right: 50, top: 190, bottom: 300, borderRadius: 32, background: "#fff", boxShadow: "0 30px 80px rgba(20,19,16,0.2)", opacity: p, transform: `scale(${1.1 - 0.1 * p})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "22px 26px", borderBottom: "1px solid #eee" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} style={{ width: 16, height: 16, borderRadius: 16, background: c }} />
          ))}
          <span style={{ marginLeft: "auto", ...fontCss("mono"), fontSize: 22, color: "#777" }}>{beat.title ?? "Studio"}</span>
        </div>
        <div style={{ position: "absolute", left: 30, top: 130, width: 340, padding: "22px", borderRadius: 20, background: "#F6F3EE", border: "1px solid #e6e1d8" }}>
          <div style={{ ...fontCss("mono"), fontSize: 20, color: "#777", textTransform: "uppercase", marginBottom: 10 }}>Bezig met · {pct}%</div>
          <div style={{ height: 8, borderRadius: 8, background: "#e3ded4", marginBottom: 8 }}>
            <div style={{ width: `${pct}%`, height: "100%", borderRadius: 8, background: acc }} />
          </div>
          {steps.map((s, i) => {
            const done = t >= s.at;
            const busy = !done && (i === 0 || t >= steps[i - 1].at);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, ...fontCss("sans"), fontWeight: 600, fontSize: 27, letterSpacing: "-0.01em", color: done ? "#1a1a1a" : busy ? "#555" : "#aaa" }}>
                <span style={{ width: 30, height: 30, borderRadius: 30, flex: "none", background: done ? acc : "transparent", border: done ? "none" : `3px solid ${busy ? acc : "#ccc"}`, borderTopColor: busy ? "transparent" : undefined, transform: busy ? `rotate(${(t * 720) % 360}deg)` : undefined, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {done ? (
                    <svg width="18" height="18" viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" stroke="#141310" strokeWidth="3.4" fill="none" strokeLinecap="round" /></svg>
                  ) : null}
                </span>
                {s.text}
              </div>
            );
          })}
          <div style={{ marginTop: 26, padding: "16px 0", borderRadius: 999, textAlign: "center", ...fontCss("sans"), fontSize: 28, background: clicked ? acc : "#141310", color: clicked ? "#141310" : "#fff", transform: `scale(${clicked ? 1 - 0.06 * Math.sin(Math.min(1, cp) * Math.PI) : 1})` }}>
            {clicked ? "✓ Geëxporteerd" : "Exporteren"}
          </div>
        </div>
        <div style={{ position: "absolute", left: 30, right: 30, bottom: 30, height: 80, borderRadius: 16, background: "#F1EEE8", overflow: "hidden" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ position: "absolute", top: 14, bottom: 14, left: `${2 + i * 19.5}%`, width: "18%", borderRadius: 8, background: i % 2 ? "#cfd8b0" : "#b9c38a" }} />
          ))}
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${pct}%`, width: 4, background: "#E63B2E" }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: pane.x, top: pane.y, width: pane.w, height: pane.h, borderRadius: 22 * p, overflow: "hidden", boxShadow: p > 0.05 ? shadow : "none" }}>
        <Video sb={sb} style={{ ...full, filter: style.filter }} />
      </div>
      {p >= 1 ? (
        <svg width="46" height="60" viewBox="0 0 24 32" style={{ position: "absolute", left: mx, top: my, filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.35))" }}>
          <path d="M2 2 L2 26 L8 20 L12 30 L16 28 L12 18 L20 18 Z" fill="#fff" stroke="#141310" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

// 12. GREEN SCREEN: jij in een studio voor een groot scherm met je clip ("LIVE"), lichtgloed op de vloer
const GreenScreen: React.FC<Props> = ({ beat, sb, style }) => {
  const { t, frame, fps } = useT();
  const p = enter(frame, beat.start, fps, 16);
  const acc = accentOf(style);
  const blink = Math.floor(t * 2) % 2 === 0;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 28%, #2f3530 0%, #111311 70%)" }}>
      <div style={{ position: "absolute", left: 160, right: 160, top: 110, height: 1180, borderRadius: "50%", background: `radial-gradient(ellipse at 50% 40%, ${acc}22 0%, rgba(0,0,0,0) 60%)` }} />
      <div style={{ position: "absolute", left: 290, top: 130, width: 500, height: 770, borderRadius: 30, overflow: "hidden", border: "5px solid rgba(255,255,255,0.9)", boxShadow: `0 0 80px ${acc}55, ${shadow}`, transform: `scale(${0.85 + 0.15 * p})`, opacity: p }}>
        <Video sb={sb} src={beat.src} style={{ ...full, filter: style.filter }} />
        <div style={{ position: "absolute", top: 18, left: 18, display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: "rgba(0,0,0,0.6)", ...fontCss("mono"), fontSize: 20, color: "#fff" }}>
          <span style={{ width: 12, height: 12, borderRadius: 12, background: blink ? "#E63B2E" : "#7a1d16" }} />
          LIVE
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 520, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)" }} />
      <Contact y={1880} o={0.6} />
      <AbsoluteFill style={{ transform: `scale(${0.8 + 0.02 * p})`, transformOrigin: "50% 100%" }}>
        <Person sb={sb} style={{ ...full, filter: `${style.filter} drop-shadow(0 0 3px rgba(255,255,255,0.35)) drop-shadow(0 20px 50px rgba(0,0,0,0.7))` }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 13. PAPER CUT: papieren uitsnede met plakband op een collage; knipletters die zachtjes wiebelen
const LETTER_BG = ["#ffffff", "#141310", "#E63B2E", "#2F5BD3", "#F2D64B"];
const LETTER_FONT = ["serif", "condensed", "mono", "sans"] as const;
const PaperCut: React.FC<Props> = ({ beat, sb, style }) => {
  const { t, frame, fps } = useT();
  const title = (beat.title ?? "").toUpperCase();
  const size = Math.min(130, 960 / Math.max(1, title.length));
  const pp = enter(frame, beat.start, fps, 14);
  const scribble = interpolate(t, [beat.start + 0.2, beat.start + 0.9], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: "#EFE9DD" }}>
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
        <filter id="paper">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="1080" height="1920" filter="url(#paper)" opacity="0.14" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => (
          <line key={k} x1="60" x2="520" y1={980 + k * 34} y2={980 + k * 34} stroke="#b9b1a2" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
        ))}
        <polygon points="560,110 1080,50 1080,780 640,720 600,420" fill="#F2D64B" />
        <polygon points="0,1240 420,1180 520,1920 0,1920" fill="#C9A36A" />
        <polyline points="120,420 220,300 300,440 380,290 460,450 540,300 620,440" stroke="#5B7BD5" strokeWidth="16" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - scribble} />
        <polyline points="760,880 820,820 880,900 940,830 1000,910" stroke="#5B7BD5" strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.7" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - scribble} />
        <g stroke="#E63B2E" strokeWidth="10" strokeLinecap="round" opacity={scribble}>
          <line x1="900" y1="1010" x2="960" y2="1070" />
          <line x1="960" y1="1010" x2="900" y2="1070" />
        </g>
      </svg>
      <AbsoluteFill style={{ transform: `scale(${0.86 + 0.04 * pp}) rotate(${(1 - pp) * -3 - 1.5}deg)`, transformOrigin: "40% 100%" }}>
        <Person
          sb={sb}
          style={{
            ...full,
            filter: `${style.filter} drop-shadow(7px 0 0 #fff) drop-shadow(-7px 0 0 #fff) drop-shadow(0 7px 0 #fff) drop-shadow(0 -7px 0 #fff) drop-shadow(0 24px 28px rgba(0,0,0,0.35))`,
          }}
        />
        <div style={{ position: "absolute", left: 300, top: 540, width: 150, height: 44, background: "rgba(242,214,75,0.85)", transform: "rotate(-24deg)" }} />
        <div style={{ position: "absolute", left: 700, top: 560, width: 150, height: 44, background: "rgba(242,214,75,0.85)", transform: "rotate(18deg)" }} />
      </AbsoluteFill>
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 10 }}>
        {title.split("").map((ch, i) => {
          const at = beat.start + 0.1 + i * 0.07;
          if (frame < Math.round(at * fps)) return null;
          const sp = spring({ frame: frame - Math.round(at * fps), fps, config: { damping: 10, mass: 0.4, stiffness: 260 } });
          const bg = LETTER_BG[Math.floor(rnd(i + 3) * LETTER_BG.length)];
          const dark = bg === "#141310" || bg === "#2F5BD3" || bg === "#E63B2E";
          const wob = Math.sin((t - at) * 3 + i) * 3;
          return (
            <div
              key={i}
              style={{
                ...fontCss(LETTER_FONT[i % LETTER_FONT.length]),
                fontSize: size,
                lineHeight: 1,
                width: size * 0.95,
                textAlign: "center",
                padding: "8px 0 12px",
                background: bg,
                color: dark ? "#fff" : "#141310",
                transform: `rotate(${(rnd(i) - 0.5) * 14 + wob}deg) translateY(${(rnd(i + 9) - 0.5) * 30}px) scale(${1.6 - 0.6 * sp})`,
                boxShadow: "0 8px 18px rgba(0,0,0,0.3)",
                textTransform: "uppercase",
              }}
            >
              {ch === " " ? " " : ch}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// 14. DOODLE BOIL: trillende lijn om je heen + krabbels die zichzelf tekenen (kroon, pijl, sterretje, hartje)
const Doodle: React.FC<Props> = ({ beat, sb, videoStyle }) => {
  const { t, frame, fps } = useT();
  const seed = Math.floor(frame / 3) % 40;
  const id = `boil${Math.round(beat.start * 100)}`;
  const f = faceAt(sb, beat.start);
  const draw = (at: number, dur = 0.35) => interpolate(t, [at, at + dur], [0, 1], clamp);
  const cx = f[0] + f[2] / 2;
  const headTop = f[1] - f[3] * 0.25;
  const ring = draw(beat.start, 0.25);
  return (
    <AbsoluteFill>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="18" result="big" />
          <feMorphology in="SourceAlpha" operator="dilate" radius="11" result="small" />
          <feComposite in="big" in2="small" operator="out" result="ring" />
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed={seed} result="n" />
          <feDisplacementMap in="ring" in2="n" scale="18" xChannelSelector="R" yChannelSelector="G" result="w" />
          <feFlood floodColor="#ffffff" />
          <feComposite in2="w" operator="in" />
        </filter>
        <filter id={`${id}s`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="1" seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      {sb.person ? (
        <AbsoluteFill style={{ filter: `url(#${id})`, opacity: ring }}>
          <OffthreadVideo src={staticFile(`p/${sb.person}`)} transparent muted style={videoStyle} />
        </AbsoluteFill>
      ) : null}
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, filter: `url(#${id}s)` }}>
        {/* kroon boven je hoofd */}
        <path d={`M${cx - 120},${headTop} L${cx - 90},${headTop - 120} L${cx - 30},${headTop - 40} L${cx},${headTop - 150} L${cx + 30},${headTop - 40} L${cx + 90},${headTop - 120} L${cx + 120},${headTop} Z`}
          fill="none" stroke="#F2D64B" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw(beat.start + 0.15, 0.4)} />
        {/* sterretje rechts */}
        <path d={`M${Math.min(960, f[0] + f[2] + 60)},${headTop - 30} m0,-60 l16,44 l44,16 l-44,16 l-16,44 l-16,-44 l-44,-16 l44,-16 Z`}
          fill="#F2D64B" stroke="#fff" strokeWidth="6" strokeLinejoin="round" opacity={draw(beat.start + 0.45, 0.15)} transform={`rotate(10 ${Math.min(960, f[0] + f[2] + 60)} ${headTop - 30})`} />
        {/* hartje links */}
        <path d={`M${Math.max(120, f[0] - 40)},${headTop + 160} c-40,-30 -60,-60 -40,-85 c18,-22 40,-14 40,6 c0,-20 22,-28 40,-6 c20,25 0,55 -40,85 Z`}
          fill="#F7A8C8" stroke="#fff" strokeWidth="6" strokeLinejoin="round" opacity={draw(beat.start + 0.6, 0.15)} />
        {/* pijl naar je toe */}
        <path d={`M${Math.max(90, f[0] - 150)},${f[1] + f[3] * 1.5} q60,-90 150,-60`}
          fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw(beat.start + 0.8, 0.3)} />
        <path d={`M${Math.max(90, f[0] - 150) + 150},${f[1] + f[3] * 1.5 - 60} l-40,-20 m40,20 l-26,34`}
          fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" opacity={draw(beat.start + 1.1, 0.1)} />
      </svg>
    </AbsoluteFill>
  );
};

// 15. VERTIGO: de achtergrond zoomt in terwijl jij juist iets kleiner wordt (dolly zoom), rand donkerder
const Vertigo: React.FC<Props> = ({ beat, sb, style }) => {
  const { t } = useT();
  const f = faceAt(sb, beat.start);
  const e = interpolate(t, [beat.start, beat.end], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const z = 1 + ((beat.to ?? 1.3) - 1) * e;
  const ps = 1 - 0.05 * e;
  const origin = `${f[0] + f[2] / 2}px ${f[1] + f[3] / 2}px`;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: origin }}>
        <Video sb={sb} src={sb.plate ?? sb.video} style={{ ...full, filter: `${style.filter} blur(${(e * 1.5).toFixed(1)}px)` }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,${0.5 * e}) 100%)` }} />
      <AbsoluteFill style={{ transform: `scale(${ps})`, transformOrigin: origin }}>
        <Person sb={sb} style={{ ...full, filter: style.filter }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 16. COVER STORY: tijdschriftcover: titel achter je hoofd, coverregels, nummer, streepjescode en schuine kop
const Cover: React.FC<Props> = ({ beat, sb, videoStyle, style }) => {
  const { t, frame, fps } = useT();
  const word = (beat.masthead ?? "").toUpperCase();
  const size = Math.min(340, 1700 / Math.max(1, word.length));
  const hl = beat.headline ?? "";
  const shown = Math.round(interpolate(t, [beat.start + 0.5, beat.start + 0.5 + hl.length * 0.035], [0, hl.length], clamp));
  const lp = enter(frame, beat.start + 0.3, fps, 16);
  const acc = accentOf(style);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.45) 100%)" }} />
      <div style={{ position: "absolute", top: 100, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {word.split("").map((ch, i) => {
          const q = interpolate(t, [beat.start + i * 0.05, beat.start + i * 0.05 + 0.35], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", height: size * 1.02 }}>
              <span style={{ display: "inline-block", ...fontCss("serif"), fontSize: size, lineHeight: 1, color: "#fff", transform: `translateY(${(1 - q) * 100}%)`, textShadow: "0 6px 30px rgba(0,0,0,0.35)" }}>{ch}</span>
            </span>
          );
        })}
      </div>
      <Person sb={sb} style={videoStyle} />
      <div style={{ position: "absolute", top: 70, left: 70, right: 70, display: "flex", justifyContent: "space-between", ...fontCss("mono"), fontSize: 22, color: "#fff", opacity: lp, textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>
        <span>NR 22 · NOV 2026</span>
        <span>WES.BUILT</span>
      </div>
      <div style={{ position: "absolute", top: 110 + size, left: 70, right: 70, height: 3, background: acc, transform: `scaleX(${lp})`, transformOrigin: "0 50%" }} />
      {(beat.coverLines ?? []).map((l, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: 140 + size + Math.floor(i / 2) * 50,
            ...(i % 2 ? { right: 70, textAlign: "right" as const } : { left: 70 }),
            ...fontCss("mono"),
            fontSize: 34,
            color: "#fff",
            textTransform: "uppercase",
            opacity: lp,
            transform: `translateX(${(1 - lp) * (i % 2 ? 40 : -40)}px)`,
            textShadow: "0 2px 10px rgba(0,0,0,0.7)",
          }}
        >
          {l}
        </div>
      ))}
      {hl ? (
        <div style={{ position: "absolute", left: 70, right: 300, top: 900, ...fontCss("italic"), fontSize: 80, lineHeight: 0.98, color: "#fff", textShadow: "0 4px 24px rgba(0,0,0,0.7)" }}>
          {hl.slice(0, shown)}
        </div>
      ) : null}
      <div style={{ position: "absolute", right: 80, top: 960, padding: "10px 12px 6px", background: "#fff", opacity: lp }}>
        <div style={{ display: "flex", gap: 3, height: 80, alignItems: "stretch" }}>
          {Array.from({ length: 22 }).map((_, k) => (
            <span key={k} style={{ width: rnd(k) > 0.5 ? 5 : 2, background: "#111" }} />
          ))}
        </div>
        <div style={{ ...fontCss("mono"), fontSize: 14, color: "#111", textAlign: "center", marginTop: 4 }}>8 712345 022</div>
      </div>
    </AbsoluteFill>
  );
};

// 17. GLASS TYPE: dikke 3D-glasletters boven/achter je hoofd, met lichtbreking (rood/blauw rand) en een glimlijn
const Glass: React.FC<Props> = ({ beat, sb, videoStyle }) => {
  const { t } = useT();
  const text = (beat.text ?? "").toUpperCase();
  const size = Math.min(330, 1650 / Math.max(1, text.length));
  const q = interpolate(t, [beat.start, beat.start + 0.4], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const sweep = interpolate(t, [beat.start + 0.15, beat.end], [-30, 140], clamp);
  const rot = Math.sin((t - beat.start) * 2) * 9;
  const f = faceAt(sb, beat.start);
  const top = Math.max(120, f[1] - size * 0.55);
  const word: React.CSSProperties = { ...fontCss("condensed"), fontSize: size, lineHeight: 1, whiteSpace: "nowrap", textAlign: "center" };
  const depth = Array.from({ length: 12 })
    .map((_, k) => `0 ${(k + 1) * 1.6}px 0 rgba(${200 - k * 9},${210 - k * 9},${220 - k * 9},0.16)`)
    .join(", ");
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top, left: 0, right: 0, perspective: 900, opacity: q, filter: `blur(${(1 - q) * 8}px)` }}>
        <div style={{ position: "relative", transform: `rotateX(16deg) rotateY(${rot}deg) translateY(${(1 - q) * 60}px)` }}>
          <div style={{ ...word, position: "absolute", inset: 0, color: "transparent", WebkitTextStroke: "3px rgba(255,80,80,0.55)", transform: "translateX(-4px)" }}>{text}</div>
          <div style={{ ...word, position: "absolute", inset: 0, color: "transparent", WebkitTextStroke: "3px rgba(80,160,255,0.55)", transform: "translateX(4px)" }}>{text}</div>
          <div
            style={{
              ...word,
              position: "relative",
              color: "rgba(255,255,255,0.16)",
              WebkitTextStroke: "4px rgba(255,255,255,0.92)",
              textShadow: `${depth}, 0 34px 60px rgba(0,0,0,0.4)`,
            }}
          >
            {text}
          </div>
          <div
            style={{
              ...word,
              position: "absolute",
              inset: 0,
              color: "transparent",
              backgroundImage: `linear-gradient(105deg, rgba(255,255,255,0) ${sweep - 14}%, rgba(255,255,255,0.95) ${sweep}%, rgba(255,255,255,0) ${sweep + 14}%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
            }}
          >
            {text}
          </div>
        </div>
      </div>
      <Person sb={sb} style={videoStyle} />
    </AbsoluteFill>
  );
};

const MAP: Partial<Record<FxBeat["type"], React.FC<Props>>> = {
  orbit: Orbit,
  couchwall: CouchWall,
  uiworld: UiWorld,
  framebreak: FrameBreak,
  phone: Phone,
  headlines: Headlines,
  linechart: LineChart,
  pullback: PullBack,
  greenscreen: GreenScreen,
  papercut: PaperCut,
  doodle: Doodle,
  vertigo: Vertigo,
  cover: Cover,
  glass: Glass,
};
export const FX_TYPES = Object.keys(MAP);

export const FxLayer: React.FC<Props> = (props) => {
  const C = MAP[props.beat.type];
  return C ? <C {...props} /> : null;
};

// 5 + 9. Camera-effecten op de basisvideo: digitale zoom (snel naar close-up) en zoom-through cut (overgang).
// trail > 0: Main.tsx tekent extra uitvergrote kopieën = zoomstrepen (radiale bewegingsonscherpte).
export const camFx = (sb: Storyboard, t: number) => {
  let scale = 1;
  let blur = 0;
  let trail = 0;
  let origin: string | undefined;
  for (const b of sb.beats as FxBeat[]) {
    if (b.type === "digitalzoom" && t >= b.start && t < b.end) {
      const p = interpolate(t, [b.start, b.start + 0.2], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
      scale *= 1 + ((b.to ?? 1.7) - 1) * p;
      const m = Math.sin(Math.PI * p);
      blur += 3 * m;
      trail = Math.max(trail, m);
      const f = faceAt(sb, b.start);
      origin = `${f[0] + f[2] / 2}px ${f[1] + f[3] / 2}px`;
    }
    if (b.type === "zoomcut") {
      const at = b.at ?? b.start + (b.end - b.start) / 2;
      if (t >= at - 0.22 && t < at) {
        const q = (t - (at - 0.22)) / 0.22;
        scale *= 1 + 1.1 * q * q;
        blur += 4 * q;
        trail = Math.max(trail, q);
        origin = "50% 45%";
      } else if (t >= at && t < at + 0.25) {
        const q = 1 - (t - at) / 0.25;
        scale *= 1 + 0.7 * q * q;
        blur += 4 * q;
        trail = Math.max(trail, q);
        origin = "50% 45%";
      }
    }
  }
  return { scale, blur, trail, origin };
};
