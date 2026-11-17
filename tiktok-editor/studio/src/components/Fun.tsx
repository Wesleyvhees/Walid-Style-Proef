// Stijl "Spel & Verhaal" (Wes 2026-11-17: "nieuwe leuke effecten die de kijker aangrijpen en echt vermaken").
// Donker + groen accent zoals Donker Bewijs, maar speelser: laadbalk die pauzeert, verwachting-vs-werkelijkheid-grafiek,
// gewoonte-raster, gedachtewolk, brekend glas, oplopende woorden, alles-of-niets-schakelaar, arcade "continue?".
import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { fontCss } from "../styles";
import { enter, exit } from "../anim";

const G = "#A3B462";
const RED = "#E5484D";
const DARK = "rgba(16,16,16,0.94)";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const useT = () => { const frame = useCurrentFrame(); const { fps } = useVideoConfig(); return { frame, fps, t: frame / fps }; };
const rnd = (seed: number) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const card: React.CSSProperties = { background: DARK, border: `2.5px solid ${G}`, borderRadius: 34, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" };

// schudden van het hele beeld (gebruikt door Main): brekend glas en oplopende woorden
export const shakeAt = (beats: any[], t: number): [number, number] => {
  let amp = 0;
  for (const b of beats) {
    if (b.type === "crack" && t >= b.start && t < b.start + 0.35) amp = Math.max(amp, 22 * (1 - (t - b.start) / 0.35));
    if (b.type === "escalate" && b.shake !== false) {
      const last = (b.items ?? [])[b.items.length - 1];
      if (last && t >= last.at && t < b.end) amp = Math.max(amp, 14 * Math.max(0.25, 1 - (t - last.at) / 0.6));
    }
  }
  if (!amp) return [0, 0];
  const k = Math.floor(t * 60);
  return [(rnd(k) - 0.5) * 2 * amp, (rnd(k + 99) - 0.5) * 2 * amp];
};

// 1 · laadbalk "PROGRESSIE" die bij "overgeslagen" op pauze springt en daarna gewoon doorloopt
export const ProgressBar: React.FC<{ beat: any }> = ({ beat }) => {
  const { frame, fps, t } = useT();
  const p = enter(frame, beat.start, fps, 16) * exit(frame, beat.end, fps, 0.18);
  const pauseAt = beat.pauseAt ?? beat.start + 0.5, resumeAt = beat.resumeAt ?? pauseAt + 0.8;
  const a = beat.from ?? 0.38, b = beat.mid ?? 0.64, c = beat.to ?? 0.86;
  const v = t < pauseAt ? interpolate(t, [beat.start, pauseAt], [a, b], clamp)
    : t < resumeAt ? b
    : interpolate(t, [resumeAt, Math.min(beat.end - 0.1, resumeAt + 0.9)], [b, c], { ...clamp, easing: Easing.out(Easing.cubic) });
  const paused = t >= pauseAt && t < resumeAt;
  const flick = paused ? (Math.floor(t * 6) % 2 ? 0.55 : 1) : 1;
  const done = t >= resumeAt;
  const W = 860;
  return (
    <div style={{ position: "absolute", left: (1080 - W) / 2, width: W, top: beat.y ?? 230, padding: "26px 34px 30px", ...card, opacity: p, transform: `translateY(${(1 - p) * -30}px)` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ ...fontCss("mono"), fontSize: 46, color: "rgba(255,255,255,0.85)" }}>{beat.label ?? "PROGRESSIE"}</div>
        <div style={{ ...fontCss("condensed"), fontSize: 84, color: "#fff" }}>{Math.round(v * 100)}%</div>
      </div>
      <div style={{ marginTop: 14, height: 46, borderRadius: 23, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
        <div style={{ width: `${v * 100}%`, height: "100%", borderRadius: 23, background: paused ? "#8a8a8a" : G, opacity: flick,
          backgroundImage: paused ? undefined : "repeating-linear-gradient(-45deg, rgba(255,255,255,0.18) 0 16px, transparent 16px 32px)",
          backgroundPosition: `${t * 120}px 0` }} />
      </div>
      <div style={{ ...fontCss("sans"), marginTop: 16, height: 60, fontSize: 52, fontWeight: 800, color: paused ? "#d9d9d9" : G, display: "flex", alignItems: "center", gap: 16 }}>
        {t >= pauseAt ? (paused ? (
          <><span style={{ display: "inline-flex", gap: 8 }}><i style={{ width: 11, height: 38, background: "#d9d9d9", borderRadius: 3 }} /><i style={{ width: 11, height: 38, background: "#d9d9d9", borderRadius: 3 }} /></span>{beat.pauseText ?? "gepauzeerd"}</>
        ) : (
          <span style={{ transform: `scale(${0.8 + 0.2 * enter(frame, resumeAt, fps, 12)})`, display: "inline-block", transformOrigin: "left center" }}>✓ {beat.doneText ?? "loopt gewoon door"}</span>
        )) : null}
        {done ? null : null}
      </div>
    </div>
  );
};

// 2 · grafiek "verwachting vs werkelijkheid": rechte stippellijn tegen een rommelige lijn met dips die tóch omhoog gaat
export const ZigzagChart: React.FC<{ beat: any }> = ({ beat }) => {
  const { frame, fps, t } = useT();
  const p = enter(frame, beat.start, fps, 16) * exit(frame, beat.end, fps, 0.18);
  const W = 960, H = 600, x0 = 70, y0 = 520, x1 = 900, y1 = 80;
  const pts: [number, number][] = beat.points ?? [[0, 0], [0.12, 0.18], [0.2, 0.1], [0.3, 0.3], [0.38, 0.08], [0.47, 0.06], [0.56, 0.34], [0.66, 0.46], [0.73, 0.22], [0.8, 0.2], [0.9, 0.62], [1, 0.86]];
  const P = pts.map(([u, v]) => [x0 + u * (x1 - x0), y0 - v * (y0 - y1)] as [number, number]);
  let len = 0; const seg = P.slice(1).map((q, i) => { const d = Math.hypot(q[0] - P[i][0], q[1] - P[i][1]); len += d; return d; });
  const ideal = interpolate(t, [beat.start + 0.15, beat.start + 0.7], [0, 1], clamp);
  const realAt = beat.realAt ?? beat.start + 0.8, realDur = beat.realDur ?? 2.2;
  const real = interpolate(t, [realAt, realAt + realDur], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const d = "M" + P.map((q) => q.join(",")).join(" L");
  // eindpunt van de getekende lijn
  let rem = real * len, tip = P[0];
  for (let i = 0; i < seg.length; i++) { if (rem <= seg[i]) { const f = seg[i] ? rem / seg[i] : 0; tip = [P[i][0] + (P[i + 1][0] - P[i][0]) * f, P[i][1] + (P[i + 1][1] - P[i][1]) * f]; break; } rem -= seg[i]; tip = P[i + 1]; }
  // dips: verschijnen precies als de lijn dat punt bereikt (tenzij `at` gegeven)
  const cum = (i: number) => seg.slice(0, i).reduce((a2, b2) => a2 + b2, 0) / len;
  const dips: { at: number; i: number; text: string }[] = (beat.dips ?? [{ i: 5, text: "weken gemist" }, { i: 9, text: "niet consistent" }])
    .map((dp: any) => ({ ...dp, at: dp.at ?? realAt + realDur * cum(dp.i) }));
  return (
    <div style={{ position: "absolute", left: (1080 - W) / 2, top: beat.y ?? 150, width: W, height: H + 110, ...card, opacity: p, transform: `scale(${0.96 + 0.04 * p})` }}>
      <div style={{ ...fontCss("sans"), position: "absolute", left: 40, top: 24, fontSize: 60, fontWeight: 900, color: "#fff" }}>{beat.title ?? "Jouw progressie"}</div>
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 90 }}>
        <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="rgba(255,255,255,0.25)" strokeWidth={3} />
        <line x1={x0} y1={y0} x2={x0 + (x1 - x0) * ideal} y2={y0 - (y0 - y1) * ideal} stroke="rgba(255,255,255,0.55)" strokeWidth={6} strokeDasharray="18 14" strokeLinecap="round" />
        <path d={d} fill="none" stroke={G} strokeWidth={10} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={`${len}`} strokeDashoffset={len * (1 - real)} />
        {real > 0 ? <circle cx={tip[0]} cy={tip[1]} r={16} fill={G} /> : null}
        {dips.map((dp, k) => {
          const q = enter(frame, dp.at, fps, 12) * (t >= dp.at ? 1 : 0);
          const [dx, dy] = P[Math.min(dp.i, P.length - 1)];
          return q ? (
            <g key={k} opacity={q}>
              <circle cx={dx} cy={dy} r={14} fill={RED} />
              <text x={dx} y={dy + 62} textAnchor="middle" fill={RED} style={{ ...fontCss("sans"), fontSize: 44, fontWeight: 800 } as any}>{dp.text}</text>
            </g>
          ) : null;
        })}
      </svg>
      {real >= 1 && beat.endText !== "" ? (
        <div style={{ ...fontCss("sans"), position: "absolute", right: 40, top: 100, fontSize: 58, fontWeight: 900, color: G, opacity: enter(frame, realAt + realDur, fps, 12), transform: `scale(${0.8 + 0.2 * enter(frame, realAt + realDur, fps, 10)})`, transformOrigin: "right top" }}>{beat.endText ?? "en toch omhoog"} ↑</div>
      ) : (
        <>
          <div style={{ ...fontCss("mono"), position: "absolute", right: 40, top: 100, fontSize: 36, color: "rgba(255,255,255,0.65)", opacity: ideal }}>- - verwachting</div>
          <div style={{ ...fontCss("mono"), position: "absolute", right: 40, top: 146, fontSize: 36, color: G, opacity: real > 0 ? 1 : 0 }}>━ werkelijkheid</div>
        </>
      )}
    </div>
  );
};

// 3 · gewoonte-raster: 66 hokjes lopen vol, één dag wordt rood, de rest loopt gewoon door
export const HabitGrid: React.FC<{ beat: any }> = ({ beat }) => {
  const { frame, fps, t } = useT();
  const p = enter(frame, beat.start, fps, 16) * exit(frame, beat.end, fps, 0.18);
  const N = beat.days ?? 66, cols = 11, miss = beat.miss ?? 23;
  const fillAt = beat.fillAt ?? beat.start + 0.3, fillDur = beat.fillDur ?? 2.4;
  const n = Math.floor(interpolate(t, [fillAt, fillAt + fillDur], [0, N], clamp));
  const S = 64, gap = 12, W = cols * S + (cols - 1) * gap;
  const missOn = n > miss;
  return (
    <div style={{ position: "absolute", left: (1080 - (W + 80)) / 2, top: beat.y ?? 150, width: W + 80, padding: "30px 40px 34px", ...card, opacity: p, transform: `scale(${0.96 + 0.04 * p})` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22 }}>
        <div style={{ ...fontCss("sans"), fontSize: 46, fontWeight: 900, color: "#fff" }}>{beat.title ?? "Nieuwe gewoonte"}</div>
        <div style={{ ...fontCss("mono"), fontSize: 34, color: G }}>dag {Math.min(n, N)}/{N}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${S}px)`, gap }}>
        {Array.from({ length: N }).map((_, i) => {
          const on = i < n, isMiss = i === miss && on;
          const q = on ? enter(frame, fillAt + (i / N) * fillDur, fps, 14) : 0;
          return (
            <div key={i} style={{ width: S, height: S, borderRadius: 12, background: isMiss ? RED : on ? G : "rgba(255,255,255,0.08)", transform: `scale(${on ? 0.7 + 0.3 * q : 1})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", ...fontCss("sans"), fontSize: 44, fontWeight: 900 }}>
              {isMiss ? "✕" : null}
            </div>
          );
        })}
      </div>
      <div style={{ ...fontCss("sans"), marginTop: 22, height: 56, fontSize: 42, fontWeight: 800, color: missOn ? "#fff" : "transparent" }}>
        <span style={{ color: RED }}>1 dag gemist</span> = <span style={{ color: G }}>{beat.verdict ?? "maakt bijna niks uit"}</span>
      </div>
      {beat.source ? <div style={{ ...fontCss("mono"), fontSize: 24, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>{beat.source}</div> : null}
    </div>
  );
};

// 4 · gedachtewolk vanuit je slaap; bij `crackAt` wordt de tekst rood en trilt hij
export const ThoughtBubble: React.FC<{ beat: any }> = ({ beat }) => {
  const { frame, fps, t } = useT();
  const p = enter(frame, beat.start, fps, 14) * exit(frame, beat.end, fps, 0.16);
  const x = beat.x ?? 540, y = beat.y ?? 260, ax = beat.ax ?? 700, ay = beat.ay ?? 640;
  const bad = beat.crackAt != null && t >= beat.crackAt;
  const jit = bad ? (rnd(Math.floor(t * 40)) - 0.5) * 8 : 0;
  const wob = Math.sin(t * 3) * 1.5;
  const w = beat.w ?? 640;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: p }}>
      {[0.28, 0.55, 0.8].map((f, i) => {
        const q = enter(frame, beat.start + i * 0.06, fps, 12);
        const cx = ax + (x - ax) * f, cy = ay + (y + 120 - ay) * f, r = 14 + i * 9;
        return <div key={i} style={{ position: "absolute", left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: "50%", background: "#f4f4f4", transform: `scale(${q})`, boxShadow: "0 8px 20px rgba(0,0,0,0.35)" }} />;
      })}
      <div style={{ position: "absolute", left: x - w / 2 + jit, top: y, width: w, padding: "34px 40px", borderRadius: 120, background: "#f4f4f4", textAlign: "center",
        transform: `scale(${0.6 + 0.4 * enter(frame, beat.start + 0.15, fps, 11)}) rotate(${wob}deg)`, boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }}>
        <div style={{ ...fontCss("sans"), fontSize: beat.size ?? 70, fontWeight: 900, lineHeight: 1.05, color: bad ? RED : "#151515" }}>{beat.text}</div>
      </div>
    </div>
  );
};

// 5 · brekend glas: witte flits + barsten die vanuit één punt uitwaaieren (Main schudt het beeld)
export const GlassCrack: React.FC<{ beat: any }> = ({ beat }) => {
  const { frame, fps, t } = useT();
  const out = exit(frame, beat.end, fps, 0.2);
  const cx = beat.x ?? 540, cy = beat.y ?? 700;
  const grow = interpolate(t, [beat.start, beat.start + 0.14], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const flash = interpolate(t, [beat.start, beat.start + 0.1], [0.75, 0], clamp);
  const lines: string[] = [];
  for (let i = 0; i < 13; i++) {
    let a = (i / 13) * Math.PI * 2 + rnd(i) * 0.4, x = cx, y = cy, d = `M${cx},${cy}`;
    const L = 700 + rnd(i + 20) * 700;
    for (let s = 1; s <= 6; s++) { a += (rnd(i * 7 + s) - 0.5) * 0.5; x += Math.cos(a) * L / 6; y += Math.sin(a) * L / 6; d += ` L${x.toFixed(0)},${y.toFixed(0)}`; }
    lines.push(d);
  }
  const rings = [90, 190].map((r, k) => {
    let d = ""; for (let i = 0; i <= 13; i++) { const a = (i / 13) * Math.PI * 2; const rr = r * (0.8 + rnd(i + k * 31) * 0.4); d += `${i ? "L" : "M"}${(cx + Math.cos(a) * rr).toFixed(0)},${(cy + Math.sin(a) * rr).toFixed(0)} `; }
    return d;
  });
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out, pointerEvents: "none" }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {[...lines, ...rings].map((d, i) => (
          <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={i < lines.length ? 3.2 : 2.2} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - grow} style={{ filter: "drop-shadow(0 0 3px rgba(0,0,0,0.8))" }} />
        ))}
      </svg>
      <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash }} />
    </div>
  );
};

// 6 · oplopende woorden: elk volgend woord groter, vorige schuiven omhoog en vervagen; het laatste trilt (Main schudt mee)
export const Escalate: React.FC<{ beat: any }> = ({ beat }) => {
  const { frame, fps, t } = useT();
  const out = exit(frame, beat.end, fps, 0.16);
  const items: { text: string; at: number }[] = beat.items ?? [];
  const sizes = beat.sizes ?? [110, 170, 250];
  const y = beat.y ?? 330;
  const cur = items.reduce((k, it, i) => (t >= it.at ? i : k), -1);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      {items.map((it, i) => {
        if (t < it.at) return null;
        const q = interpolate(t, [it.at, it.at + 0.14], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
        const age = cur - i;
        const size = sizes[Math.min(i, sizes.length - 1)];
        const last = i === items.length - 1;
        return (
          <div key={i} style={{ ...fontCss("condensed"), position: "absolute", left: 0, right: 0, top: y - age * (beat.step ?? 120), textAlign: "center", fontSize: size, lineHeight: 1,
            color: last ? RED : "#fff", opacity: age === 0 ? 1 : 0.32, transform: `scale(${(1.6 - 0.6 * q) * (age ? 0.85 : 1)})`, textTransform: "uppercase",
            textShadow: "0 6px 24px rgba(0,0,0,0.7)", WebkitTextStroke: "2px rgba(0,0,0,0.4)" }}>{it.text}</div>
        );
      })}
    </div>
  );
};

// 7 · alles-of-niets-schakelaar: klapt heen en weer (klik), daarna een rode streep erdoor
export const AllOrNothing: React.FC<{ beat: any }> = ({ beat }) => {
  const { frame, fps, t } = useT();
  const p = enter(frame, beat.start, fps, 14) * exit(frame, beat.end, fps, 0.16);
  const flips: number[] = beat.flips ?? [beat.start + 0.25, beat.start + 0.55, beat.start + 0.85];
  const k = flips.filter((f) => t >= f).length;
  const lastF = flips[k - 1] ?? beat.start;
  const s = interpolate(t, [lastF, lastF + 0.12], [k % 2 ? 0 : 1, k % 2 ? 1 : 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const pos = k === 0 ? 0 : s;
  const W = 760, H = 190, knob = 170;
  const xAt = beat.xAt ?? (flips[flips.length - 1] ?? beat.start) + 0.35;
  const xs = interpolate(t, [xAt, xAt + 0.18], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: (1080 - W) / 2, top: beat.y ?? 250, width: W, opacity: p, transform: `scale(${0.9 + 0.1 * p})` }}>
      <div style={{ display: "flex", justifyContent: "space-between", ...fontCss("condensed"), fontSize: 92, color: "#fff", padding: "0 24px", marginBottom: 14, textShadow: "0 6px 20px rgba(0,0,0,0.7)" }}>
        <span style={{ color: pos < 0.5 ? G : "rgba(255,255,255,0.45)" }}>ALLES</span>
        <span style={{ color: pos >= 0.5 ? RED : "rgba(255,255,255,0.45)" }}>NIETS</span>
      </div>
      <div style={{ position: "relative", width: W, height: H, borderRadius: H / 2, background: DARK, border: `3px solid ${pos < 0.5 ? G : RED}`, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ position: "absolute", top: (H - knob) / 2 - 3, left: 10 + pos * (W - knob - 26), width: knob, height: knob, borderRadius: "50%", background: pos < 0.5 ? G : RED, boxShadow: "0 10px 26px rgba(0,0,0,0.5)" }} />
        {xs > 0 ? <div style={{ position: "absolute", left: -30, top: H / 2 - 9, width: (W + 60) * xs, height: 18, background: RED, borderRadius: 9, transform: "rotate(-8deg)", transformOrigin: "left center", boxShadow: "0 4px 14px rgba(0,0,0,0.6)" }} /> : null}
      </div>
      {beat.sub && t >= xAt ? <div style={{ ...fontCss("sans"), position: "absolute", left: 0, right: 0, top: -96, textAlign: "center", fontSize: 52, fontWeight: 900, color: "#fff", textShadow: "0 4px 18px rgba(0,0,0,0.8)", opacity: enter(frame, xAt, fps, 12) }}>{beat.sub}</div> : null}
    </div>
  );
};

// 8 · arcade-scherm: GAME OVER → CONTINUE? 3 2 → JA (groene flits). Beeld eronder donkerder met scanlines
export const ContinueScreen: React.FC<{ beat: any }> = ({ beat }) => {
  const { frame, fps, t } = useT();
  const p = interpolate(t, [beat.start, beat.start + 0.08], [0, 1], clamp) * exit(frame, beat.end, fps, 0.14);
  const contAt = beat.continueAt ?? beat.start + 0.45, pressAt = beat.pressAt ?? beat.end - 0.45;
  const phase = t < contAt ? 0 : t < pressAt ? 1 : 2;
  const blink = Math.floor(t * 5) % 2 === 0;
  const count = Math.max(1, 3 - Math.floor(((t - contAt) / Math.max(0.1, pressAt - contAt)) * 3));
  const flash = phase === 2 ? interpolate(t, [pressAt, pressAt + 0.25], [0.45, 0], clamp) : 0;
  const mono = { ...fontCss("mono"), letterSpacing: "0.12em", textAlign: "center" as const, textShadow: "0 0 18px currentColor" };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: p }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0 3px, transparent 3px 7px)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: beat.y ?? 300 }}>
        {phase === 0 ? <div style={{ ...mono, fontSize: 120, color: RED, opacity: blink ? 1 : 0.35 }}>GAME OVER</div> : null}
        {phase === 1 ? (
          <>
            <div style={{ ...mono, fontSize: 104, color: "#fff" }}>CONTINUE?</div>
            <div style={{ ...mono, fontSize: 190, color: "#FFD23F", marginTop: 10 }}>{count}</div>
          </>
        ) : null}
        {phase === 2 ? (
          <>
            <div style={{ ...mono, fontSize: 104, color: "#fff" }}>CONTINUE?</div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 30 }}>
              <div style={{ ...mono, fontSize: 96, color: "#0b0b0b", background: G, padding: "14px 60px", borderRadius: 18, transform: `scale(${1.25 - 0.25 * enter(frame, pressAt, fps, 10)})`, textShadow: "none" }}>▶ {beat.yes ?? "JA"}</div>
            </div>
            {beat.sub ? <div style={{ ...mono, fontSize: 46, color: G, marginTop: 34 }}>{beat.sub}</div> : null}
          </>
        ) : null}
      </div>
      <div style={{ position: "absolute", inset: 0, background: G, opacity: flash }} />
    </div>
  );
};
