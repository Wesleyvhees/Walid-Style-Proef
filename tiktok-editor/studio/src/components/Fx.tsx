// Nieuwe effect template: 17 effecten (geleerd uit Wes' voorbeeldvideo), in de Wes.Built-stijl.
// Elk effect tekent zijn eigen lagen (achtergrond, achter de persoon, uitsnede, ervoor), zodat de volgorde altijd klopt.
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { FxBeat, Storyboard, StylePreset } from "../types";
import { fontCss } from "../styles";
import { enter } from "../anim";

type Props = { beat: FxBeat; sb: Storyboard; style: StylePreset; videoStyle: React.CSSProperties };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const shadow = "0 24px 60px rgba(0,0,0,0.45), 0 4px 14px rgba(0,0,0,0.3)";
const full: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };

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

// deterministische "willekeur" (zelfde beeld bij elke render)
const rnd = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// 1. ORBIT: kaartjes draaien om je heen, achter en voor je langs
const Orbit: React.FC<Props> = ({ beat, sb, videoStyle }) => {
  const { t, frame, fps } = useT();
  const p = enter(frame, beat.start, fps, 14);
  const imgs = beat.images ?? [];
  const f = faceAt(sb, beat.start);
  const cx = f[0] + f[2] / 2;
  const cy = f[1] + f[3] * 0.62;
  const rx = beat.rx ?? 440;
  const ry = 130;
  const w = 260;
  const h = 390;
  const cards = imgs.map((src, i) => {
    const th = (t - beat.start) * (beat.speed ?? 1.7) + (i * 2 * Math.PI) / imgs.length - Math.PI / 2;
    const d = Math.sin(th);
    const s = (0.7 + 0.3 * (d + 1) / 2) * (0.6 + 0.4 * p);
    return { src, i, d, s, x: cx + rx * Math.cos(th) * p, y: cy + ry * d };
  });
  const card = (c: (typeof cards)[number]) => (
    <Img
      key={c.i}
      src={staticFile(`p/${c.src}`)}
      style={{
        position: "absolute",
        left: c.x - (w * c.s) / 2,
        top: c.y - (h * c.s) / 2,
        width: w * c.s,
        height: h * c.s,
        objectFit: "cover",
        borderRadius: 18,
        border: "5px solid #fff",
        boxShadow: shadow,
        opacity: p,
        filter: c.d < 0 ? "brightness(0.75)" : "none",
      }}
    />
  );
  return (
    <AbsoluteFill>
      {cards.filter((c) => c.d < 0).map(card)}
      <Person sb={sb} style={videoStyle} />
      {cards.filter((c) => c.d >= 0).map(card)}
    </AbsoluteFill>
  );
};

// 2. COUCH WALL: de muur achter je wordt een wand vol screenshots
const CouchWall: React.FC<Props> = ({ beat, sb, style }) => {
  const { t, frame, fps } = useT();
  const imgs = beat.images ?? [];
  const tw = 372;
  const th = 600;
  const drift = (t - beat.start) * 28;
  const tiles = [];
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 3; c++) {
      const i = r * 3 + c;
      const q = enter(frame, beat.start + rnd(i) * 0.35, fps, 16);
      tiles.push(
        <Img
          key={i}
          src={staticFile(`p/${imgs[i % Math.max(1, imgs.length)]}`)}
          style={{
            position: "absolute",
            left: c * 360 - 6 + (r % 2) * 40 - 20,
            top: r * 420 - 160 - drift + (c % 2) * 60,
            width: tw,
            height: th,
            objectFit: "cover",
            borderRadius: 16,
            border: "4px solid rgba(255,255,255,0.9)",
            transform: `rotate(${(rnd(i + 7) - 0.5) * 8}deg) scale(${0.85 + 0.15 * q})`,
            opacity: q,
            boxShadow: shadow,
          }}
        />,
      );
    }
  return (
    <AbsoluteFill style={{ background: "#141310" }}>
      {imgs.length ? tiles : null}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)" }} />
      <Person sb={sb} style={{ ...full, filter: `${style.filter} drop-shadow(0 30px 50px rgba(0,0,0,0.6))` }} />
    </AbsoluteFill>
  );
};

// 3. UI WORLD: jij in een app-scherm waarin een opdracht wordt getypt
const UiWorld: React.FC<Props> = ({ beat, sb, style }) => {
  const { t, frame, fps } = useT();
  const text = beat.text ?? "";
  const from = beat.start + 0.25;
  const n = Math.round(interpolate(t, [from, from + text.length * 0.045], [0, text.length], clamp));
  const p = enter(frame, beat.start, fps, 16);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#F6F3EE 0%,#ECE8E0 100%)" }}>
      <div style={{ position: "absolute", top: 100, left: 0, right: 0, textAlign: "center", ...fontCss("sans"), fontSize: 34, color: "#3a3832", opacity: p }}>
        <span style={{ display: "inline-block", width: 22, height: 22, borderRadius: 22, background: style.accent, marginRight: 14, verticalAlign: "middle" }} />
        {beat.title ?? "Studio"}
      </div>
      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 190,
          padding: "30px 34px 22px",
          borderRadius: 30,
          background: "#fff",
          boxShadow: "0 18px 50px rgba(20,19,16,0.16)",
          opacity: p,
          transform: `translateY(${(1 - p) * -30}px)`,
        }}
      >
        <div style={{ ...fontCss("sans"), fontWeight: 500, fontSize: 40, letterSpacing: "-0.02em", color: "#222", minHeight: 52 }}>
          {text.slice(0, n)}
          {Math.floor(t * 2.4) % 2 === 0 ? <span style={{ color: "#999" }}>|</span> : null}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
          <div style={{ ...fontCss("mono"), fontSize: 26, color: "#888" }}>+</div>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: n >= text.length ? style.accent : "#222", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="26" height="26" viewBox="0 0 24 24">
              <path d="M12 19V5M5 12l7-7 7 7" stroke="#fff" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      <Person sb={sb} style={{ ...full, filter: `${style.filter} drop-shadow(0 20px 40px rgba(0,0,0,0.25))` }} />
    </AbsoluteFill>
  );
};

// 4. FRAME BREAK: de video krimpt tot een kader en jij breekt eruit
const FrameBreak: React.FC<Props> = ({ beat, sb, style }) => {
  const { t } = useT();
  const p = interpolate(t, [beat.start, beat.start + 0.3], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const sc = 1 - 0.27 * p;
  const inset = { top: 300, right: 190, bottom: 330, left: 190 };
  return (
    <AbsoluteFill>
      <Video sb={sb} style={{ ...full, filter: `${style.filter} blur(30px) brightness(0.32)`, transform: "scale(1.15)" }} />
      <AbsoluteFill style={{ transform: `scale(${sc})`, transformOrigin: "50% 52%" }}>
        <AbsoluteFill style={{ clipPath: `inset(${inset.top * p}px ${inset.right * p}px ${inset.bottom * p}px ${inset.left * p}px round ${44 * p}px)` }}>
          <Video sb={sb} style={{ ...full, filter: style.filter }} />
        </AbsoluteFill>
        <div
          style={{
            position: "absolute",
            top: inset.top * p,
            left: inset.left * p,
            right: inset.right * p,
            bottom: inset.bottom * p,
            borderRadius: 44 * p,
            border: `${6 * p}px solid rgba(255,255,255,0.95)`,
            boxShadow: `0 40px 120px rgba(0,0,0,${0.6 * p})`,
          }}
        />
        {p > 0.5 ? <Person sb={sb} style={{ ...full, filter: style.filter }} /> : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 6. PHONE MOCKUP: telefoon met app schuift naast je in beeld, knop wordt ingedrukt
const Phone: React.FC<Props> = ({ beat, style }) => {
  const { t, frame, fps } = useT();
  const p = spring({ frame: frame - Math.round(beat.start * fps), fps, config: { damping: 14, mass: 0.6, stiffness: 120 } });
  const pressed = beat.pressAt !== undefined && t >= beat.pressAt;
  const pr = beat.pressAt !== undefined ? interpolate(t, [beat.pressAt, beat.pressAt + 0.12, beat.pressAt + 0.3], [1, 0.9, 1], clamp) : 1;
  const ripple = beat.pressAt !== undefined ? interpolate(t, [beat.pressAt, beat.pressAt + 0.5], [0, 1], clamp) : 0;
  const rows = beat.rows ?? [];
  return (
    <div
      style={{
        position: "absolute",
        left: 660,
        top: 430,
        width: 400,
        height: 820,
        borderRadius: 64,
        background: "#0d0d0e",
        border: "10px solid #2a2a2c",
        boxShadow: shadow,
        transform: `translateX(${(1 - p) * 560}px) rotate(${(1 - p) * 8 - 3}deg)`,
        overflow: "hidden",
      }}
    >
      <div style={{ width: 120, height: 30, borderRadius: 30, background: "#000", margin: "16px auto 0" }} />
      <div style={{ padding: "34px 30px 0" }}>
        <div style={{ ...fontCss("mono"), fontSize: 20, color: style.accent, textTransform: "uppercase" }}>Wes.Built</div>
        <div style={{ ...fontCss("sans"), fontSize: 40, color: "#fff", marginTop: 6, lineHeight: 1.05 }}>{beat.title}</div>
        {rows.map((r, i) => {
          const q = enter(frame, beat.start + 0.25 + i * 0.12, fps, 16);
          return (
            <div key={i} style={{ marginTop: 18, padding: "20px 22px", borderRadius: 20, background: "#1d1d20", ...fontCss("mono"), fontSize: 26, color: "#ddd", opacity: q, transform: `translateY(${(1 - q) * 20}px)` }}>
              {r}
            </div>
          );
        })}
      </div>
      {beat.button ? (
        <div style={{ position: "absolute", left: 30, right: 30, bottom: 50 }}>
          <div
            style={{
              ...fontCss("sans"),
              fontSize: 32,
              textAlign: "center",
              padding: "24px 0",
              borderRadius: 999,
              background: style.accent,
              color: "#141310",
              transform: `scale(${pr})`,
            }}
          >
            {pressed ? `✓ ${beat.button}` : beat.button}
          </div>
          {ripple > 0 && ripple < 1 ? (
            <div style={{ position: "absolute", left: "50%", top: "50%", width: 40, height: 40, marginLeft: -20, marginTop: -20, borderRadius: 40, border: "4px solid #fff", opacity: 1 - ripple, transform: `scale(${1 + ripple * 6})` }} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

// 8. HEADLINE WALL: papieren koppen poppen een voor een om je heen op
const SPOTS = [
  [250, 300, -6],
  [810, 380, 5],
  [300, 520, 3],
  [800, 600, -4],
  [260, 760, -3],
  [820, 820, 6],
];
const Headlines: React.FC<Props> = ({ beat }) => {
  const { frame, fps } = useT();
  return (
    <AbsoluteFill>
      {(beat.items ?? []).map((it, i) => {
        const [x, y, r] = SPOTS[i % SPOTS.length];
        const sp = spring({ frame: frame - Math.round(it.at * fps), fps, config: { damping: 11, mass: 0.45, stiffness: 220 } });
        if (frame < Math.round(it.at * fps)) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 440,
              transform: `translate(-50%,-50%) rotate(${r}deg) scale(${1.35 - 0.35 * sp})`,
              opacity: Math.min(1, sp * 2),
              background: "#F4EFE4",
              color: "#1a1a1a",
              padding: "22px 26px 24px",
              boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
              ...fontCss("serif"),
              fontSize: 56,
              lineHeight: 1.02,
            }}
          >
            <div style={{ position: "absolute", top: -16, left: "50%", width: 120, height: 32, marginLeft: -60, background: "rgba(242,214,75,0.8)", transform: "rotate(-3deg)" }} />
            {it.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// 10. CHART GROW: lichtgevende lijn tekent zich over het beeld
const LineChart: React.FC<Props> = ({ beat, style }) => {
  const { t, frame, fps } = useT();
  const v = beat.values ?? [];
  if (v.length < 2) return null;
  const mn = Math.min(...v);
  const mx = Math.max(...v);
  const top = beat.y ?? 760;
  const pts = v.map((val, i) => [80 + (i * 920) / (v.length - 1), top + 260 - (260 * (val - mn)) / Math.max(1e-6, mx - mn)]);
  const prog = interpolate(t, [beat.start + 0.1, beat.start + 1.1], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const lp = enter(frame, beat.start + 1.1, fps, 12);
  const pulse = (Math.sin((t - beat.start) * 8) + 1) / 2;
  const glow = style.accent === "#FFFFFF" ? "#fff" : style.accent;
  return (
    <AbsoluteFill>
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, filter: `drop-shadow(0 0 14px ${glow})` }}>
        <line x1="60" x2="1020" y1={top + 260} y2={top + 260} stroke="rgba(255,255,255,0.35)" strokeWidth="3" strokeDasharray="6 12" />
        <path d={d} pathLength={1} stroke={glow} strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={1 - prog} />
        {pts.map((p, i) => (prog >= i / (pts.length - 1) - 0.001 ? <circle key={i} cx={p[0]} cy={p[1]} r="11" fill="#fff" stroke={glow} strokeWidth="5" /> : null))}
        {prog >= 1 ? <circle cx={last[0]} cy={last[1]} r={18 + pulse * 16} fill="none" stroke={glow} strokeWidth="4" opacity={1 - pulse * 0.7} /> : null}
      </svg>
      {beat.label ? (
        <div
          style={{
            position: "absolute",
            left: Math.min(860, last[0]) - 150,
            top: last[1] - 120,
            width: 300,
            textAlign: "center",
            transform: `scale(${lp})`,
            ...fontCss("sans"),
            fontSize: 46,
            color: "#141310",
            background: glow,
            borderRadius: 999,
            padding: "10px 0",
          }}
        >
          {beat.label}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// 11. PULL-BACK REVEAL: de video blijkt in een app-venster te zitten, met voortgang
const PullBack: React.FC<Props> = ({ beat, sb, style }) => {
  const { t } = useT();
  const p = interpolate(t, [beat.start, beat.start + 0.55], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const L = (a: number, b: number) => a + (b - a) * p;
  const pane = { x: L(0, 440), y: L(0, 300), w: L(1080, 540), h: L(1920, 960) };
  const steps = beat.steps ?? [];
  const playhead = interpolate(t, [beat.start + 0.5, beat.end], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: "#E9E5DD" }}>
      <div style={{ position: "absolute", left: 50, right: 50, top: 190, bottom: 300, borderRadius: 32, background: "#fff", boxShadow: "0 30px 80px rgba(20,19,16,0.2)", opacity: p, transform: `scale(${1.1 - 0.1 * p})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "22px 26px", borderBottom: "1px solid #eee" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} style={{ width: 16, height: 16, borderRadius: 16, background: c }} />
          ))}
          <span style={{ marginLeft: "auto", ...fontCss("mono"), fontSize: 22, color: "#777" }}>{beat.title ?? "Studio"}</span>
        </div>
        <div style={{ position: "absolute", left: 30, top: 130, width: 330, padding: "22px 22px", borderRadius: 20, background: "#F6F3EE", border: "1px solid #e6e1d8" }}>
          <div style={{ ...fontCss("mono"), fontSize: 20, color: "#777", textTransform: "uppercase", marginBottom: 12 }}>Bezig met</div>
          {steps.map((s, i) => {
            const done = t >= s.at;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, ...fontCss("sans"), fontWeight: 600, fontSize: 27, letterSpacing: "-0.01em", color: done ? "#1a1a1a" : "#aaa" }}>
                <span style={{ width: 30, height: 30, borderRadius: 30, flex: "none", background: done ? style.accent : "transparent", border: done ? "none" : "3px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {done ? (
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path d="M4 12.5l5 5L20 6.5" stroke="#141310" strokeWidth="3.4" fill="none" strokeLinecap="round" />
                    </svg>
                  ) : null}
                </span>
                {s.text}
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 30, right: 30, bottom: 30, height: 80, borderRadius: 16, background: "#F1EEE8", overflow: "hidden" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ position: "absolute", top: 14, bottom: 14, left: `${2 + i * 19.5}%`, width: "18%", borderRadius: 8, background: i % 2 ? "#cfd8b0" : "#b9c38a" }} />
          ))}
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${playhead * 100}%`, width: 4, background: "#E63B2E" }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: pane.x, top: pane.y, width: pane.w, height: pane.h, borderRadius: 22 * p, overflow: "hidden", boxShadow: p > 0.05 ? shadow : "none" }}>
        <Video sb={sb} style={{ ...full, filter: style.filter }} />
      </div>
    </AbsoluteFill>
  );
};

// 12. GREEN SCREEN: jij uitgeknipt voor een donker vlak, de clip als scherm erboven
const GreenScreen: React.FC<Props> = ({ beat, sb, style }) => {
  const { frame, fps } = useT();
  const p = enter(frame, beat.start, fps, 16);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 30%, #2a2f2b 0%, #121412 70%)" }}>
      <div style={{ position: "absolute", left: 300, top: 150, width: 480, height: 740, borderRadius: 30, overflow: "hidden", border: "5px solid rgba(255,255,255,0.9)", boxShadow: shadow, transform: `scale(${0.85 + 0.15 * p})`, opacity: p }}>
        <Video sb={sb} src={beat.src} style={{ ...full, filter: style.filter }} />
      </div>
      <AbsoluteFill style={{ transform: "scale(0.82)", transformOrigin: "50% 100%" }}>
        <Person sb={sb} style={{ ...full, filter: `${style.filter} drop-shadow(0 20px 50px rgba(0,0,0,0.7))` }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 13. PAPER CUT: jij als papieren uitsnede op een collage met knipletters
const LETTER_BG = ["#ffffff", "#141310", "#E63B2E", "#2F5BD3", "#F2D64B"];
const LETTER_FONT = ["serif", "condensed", "mono", "sans"] as const;
const PaperCut: React.FC<Props> = ({ beat, sb, style }) => {
  const { frame, fps } = useT();
  const title = (beat.title ?? "").toUpperCase();
  const size = Math.min(130, 960 / Math.max(1, title.length));
  return (
    <AbsoluteFill style={{ background: "#EFE9DD" }}>
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
        <filter id="paper">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="1080" height="1920" filter="url(#paper)" opacity="0.12" />
        <polygon points="560,120 1080,60 1080,760 640,700 600,420" fill="#F2D64B" />
        <polygon points="0,1240 420,1180 520,1920 0,1920" fill="#C9A36A" />
        <polyline points="120,420 220,300 300,440 380,290 460,450 540,300 620,440" stroke="#5B7BD5" strokeWidth="16" fill="none" strokeLinecap="round" opacity="0.75" />
        <polyline points="760,880 820,820 880,900 940,830 1000,910" stroke="#5B7BD5" strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.7" />
        <g stroke="#E63B2E" strokeWidth="10" strokeLinecap="round">
          <line x1="900" y1="1010" x2="960" y2="1070" />
          <line x1="960" y1="1010" x2="900" y2="1070" />
        </g>
      </svg>
      <AbsoluteFill style={{ transform: "scale(0.9)", transformOrigin: "40% 100%" }}>
        <Person
          sb={sb}
          style={{
            ...full,
            filter: `${style.filter} drop-shadow(6px 0 0 #fff) drop-shadow(-6px 0 0 #fff) drop-shadow(0 6px 0 #fff) drop-shadow(0 -6px 0 #fff) drop-shadow(0 22px 26px rgba(0,0,0,0.35))`,
          }}
        />
      </AbsoluteFill>
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 10 }}>
        {title.split("").map((ch, i) => {
          const at = beat.start + 0.1 + i * 0.07;
          const sp = spring({ frame: frame - Math.round(at * fps), fps, config: { damping: 10, mass: 0.4, stiffness: 260 } });
          if (frame < Math.round(at * fps)) return null;
          const bg = LETTER_BG[Math.floor(rnd(i + 3) * LETTER_BG.length)];
          const dark = bg === "#141310" || bg === "#2F5BD3" || bg === "#E63B2E";
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
                transform: `rotate(${(rnd(i) - 0.5) * 14}deg) translateY(${(rnd(i + 9) - 0.5) * 30}px) scale(${1.6 - 0.6 * sp})`,
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

// 14. DOODLE BOIL: getekende lijn om je heen die "kookt", plus krabbels
const Doodle: React.FC<Props> = ({ beat, sb, videoStyle }) => {
  const { frame, fps } = useT();
  const seed = Math.floor(frame / 3) % 40;
  const id = `boil${Math.round(beat.start * 100)}`;
  const f = faceAt(sb, beat.start);
  const stickers = [
    { x: Math.max(120, f[0] - 60), y: Math.max(260, f[1] - 40), kind: "heart", at: beat.start + 0.25, c: "#F7A8C8" },
    { x: Math.min(960, f[0] + f[2] + 60), y: Math.max(240, f[1] - 70), kind: "spark", at: beat.start + 0.1, c: "#F2D64B" },
  ];
  return (
    <AbsoluteFill>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="17" result="big" />
          <feMorphology in="SourceAlpha" operator="dilate" radius="11" result="small" />
          <feComposite in="big" in2="small" operator="out" result="ring" />
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed={seed} result="n" />
          <feDisplacementMap in="ring" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G" result="w" />
          <feFlood floodColor="#ffffff" />
          <feComposite in2="w" operator="in" />
        </filter>
        <filter id={`${id}s`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="1" seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      {sb.person ? (
        <AbsoluteFill style={{ filter: `url(#${id})` }}>
          <OffthreadVideo src={staticFile(`p/${sb.person}`)} transparent muted style={videoStyle} />
        </AbsoluteFill>
      ) : null}
      {stickers.map((s, i) => {
        const q = enter(frame, s.at, fps, 10);
        if (frame < Math.round(s.at * fps)) return null;
        return (
          <svg key={i} width="170" height="170" viewBox="0 0 100 100" style={{ position: "absolute", left: s.x - 85, top: s.y - 85, transform: `scale(${q}) rotate(${(i ? 1 : -1) * 10}deg)`, filter: `url(#${id}s)` }}>
            {s.kind === "heart" ? (
              <path d="M50 82 C20 62 10 45 18 30 C26 16 44 18 50 32 C56 18 74 16 82 30 C90 45 80 62 50 82 Z" fill={s.c} stroke="#fff" strokeWidth="5" strokeLinejoin="round" />
            ) : (
              <path d="M50 8 L58 42 L92 50 L58 58 L50 92 L42 58 L8 50 L42 42 Z" fill={s.c} stroke="#fff" strokeWidth="5" strokeLinejoin="round" />
            )}
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};

// 15. VERTIGO: de achtergrond zoomt, jij blijft even groot (dolly zoom)
const Vertigo: React.FC<Props> = ({ beat, sb, style }) => {
  const { t } = useT();
  const f = faceAt(sb, beat.start);
  const z = interpolate(t, [beat.start, beat.end], [1, beat.to ?? 1.25], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const origin = `${f[0] + f[2] / 2}px ${f[1] + f[3] / 2}px`;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: origin }}>
        <Video sb={sb} src={sb.plate ?? sb.video} style={{ ...full, filter: style.filter }} />
      </AbsoluteFill>
      <Person sb={sb} style={{ ...full, filter: style.filter }} />
    </AbsoluteFill>
  );
};

// 16. COVER STORY: tijdschriftcover, grote titel ACHTER je hoofd
const Cover: React.FC<Props> = ({ beat, sb, videoStyle }) => {
  const { t, frame, fps } = useT();
  const word = (beat.masthead ?? "").toUpperCase();
  const size = Math.min(330, 1700 / Math.max(1, word.length));
  const hl = beat.headline ?? "";
  const shown = Math.round(interpolate(t, [beat.start + 0.5, beat.start + 0.5 + hl.length * 0.035], [0, hl.length], clamp));
  const lp = enter(frame, beat.start + 0.3, fps, 16);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 110, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
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
      <div style={{ position: "absolute", top: 120 + size, left: 70, right: 70, height: 2, background: "rgba(255,255,255,0.8)", transform: `scaleX(${lp})` }} />
      {(beat.coverLines ?? []).map((l, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: 150 + size + i * 44,
            ...(i % 2 ? { right: 70, textAlign: "right" as const } : { left: 70 }),
            ...fontCss("mono"),
            fontSize: 34,
            color: "#fff",
            textTransform: "uppercase",
            opacity: lp,
            textShadow: "0 2px 10px rgba(0,0,0,0.7)",
          }}
        >
          {l}
        </div>
      ))}
      {hl ? (
        <div style={{ position: "absolute", left: 70, right: 70, top: 920, ...fontCss("italic"), fontSize: 76, lineHeight: 1, color: "#fff", textShadow: "0 4px 24px rgba(0,0,0,0.7)" }}>
          {hl.slice(0, shown)}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// 17. GLASS TYPE: 3D-letters van glas achter je
const Glass: React.FC<Props> = ({ beat, sb, videoStyle }) => {
  const { t } = useT();
  const text = (beat.text ?? "").toUpperCase();
  const size = Math.min(320, 1600 / Math.max(1, text.length));
  const q = interpolate(t, [beat.start, beat.start + 0.4], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const sweep = interpolate(t, [beat.start + 0.2, beat.end], [-40, 140], clamp);
  const rot = Math.sin((t - beat.start) * 2) * 8;
  const word: React.CSSProperties = { ...fontCss("condensed"), fontSize: size, lineHeight: 1, whiteSpace: "nowrap", textAlign: "center" };
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 230, left: 0, right: 0, perspective: 900, opacity: q, filter: `blur(${(1 - q) * 8}px)` }}>
        <div style={{ position: "relative", transform: `rotateX(14deg) rotateY(${rot}deg) translateY(${(1 - q) * 60}px)` }}>
          <div
            style={{
              ...word,
              color: "rgba(255,255,255,0.12)",
              WebkitTextStroke: "3px rgba(255,255,255,0.85)",
              textShadow:
                "0 3px 0 rgba(255,255,255,0.22), 0 6px 0 rgba(210,220,230,0.18), 0 9px 0 rgba(170,180,190,0.15), 0 12px 0 rgba(130,140,150,0.12), 0 30px 50px rgba(0,0,0,0.35)",
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
              backgroundImage: `linear-gradient(105deg, rgba(255,255,255,0) ${sweep - 15}%, rgba(255,255,255,0.85) ${sweep}%, rgba(255,255,255,0) ${sweep + 15}%)`,
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

// 5 + 9. Camera-effecten op de basisvideo: digitale zoom (snel naar close-up met bewegingsonscherpte)
// en zoom-through cut (overgang: in- en uitzoomen met vervaging rond een knip).
export const camFx = (sb: Storyboard, t: number) => {
  let scale = 1;
  let blur = 0;
  let origin: string | undefined;
  for (const b of sb.beats as FxBeat[]) {
    if (b.type === "digitalzoom" && t >= b.start && t < b.end) {
      const p = interpolate(t, [b.start, b.start + 0.18], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
      scale *= 1 + ((b.to ?? 1.7) - 1) * p;
      blur += 10 * Math.sin(Math.PI * p);
      const f = faceAt(sb, b.start);
      origin = `${f[0] + f[2] / 2}px ${f[1] + f[3] / 2}px`;
    }
    if (b.type === "zoomcut") {
      const at = b.at ?? b.start + (b.end - b.start) / 2;
      if (t >= at - 0.2 && t < at) {
        const q = (t - (at - 0.2)) / 0.2;
        scale *= 1 + 0.9 * q * q;
        blur += 16 * q;
        origin = "50% 45%";
      } else if (t >= at && t < at + 0.22) {
        const q = 1 - (t - at) / 0.22;
        scale *= 1 + 0.6 * q * q;
        blur += 16 * q;
        origin = "50% 45%";
      }
    }
  }
  return { scale, blur, origin };
};
