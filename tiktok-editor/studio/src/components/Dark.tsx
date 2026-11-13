// Stijl "Donker Bewijs" (Wes 2026-11-10): alle effecten donker (zwart, witte tekst, groen accent), bewegende typografie
// als hoofdzaak en 'bewijs'-beelden (zoekbalk, teller, notities). Vervangt kaartjes/labels/stempels/emoji bij Slimmer 2.0 en blauwdruk.
import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { fontCss } from "../styles";
import { enter, exit } from "../anim";

const G = "#A3B462";
const DARK = "rgba(16,16,16,0.94)";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const useT = () => { const frame = useCurrentFrame(); const { fps } = useVideoConfig(); return { frame, fps, t: frame / fps }; };

// C · zoekbalk die typt, met suggesties
export const SearchBar: React.FC<{ beat: any }> = ({ beat }) => {
  const { frame, fps, t } = useT();
  const p = enter(frame, beat.start, fps, 16) * exit(frame, beat.end, fps, 0.18);
  const from = beat.typeFrom ?? beat.start + 0.15, to = beat.typeTo ?? from + beat.text.length * 0.045;
  const n = Math.round(Math.max(0, Math.min(1, (t - from) / Math.max(0.01, to - from))) * beat.text.length);
  const cursor = Math.floor(t * 2.4) % 2 === 0;
  const sug: string[] = beat.suggestions ?? [];
  const y = beat.y ?? 250;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: y, opacity: p, transform: `translateY(${(1 - p) * -30}px)` }}>
      <div style={{ height: 118, borderRadius: 60, background: DARK, border: `3px solid ${G}`, display: "flex", alignItems: "center", gap: 26, padding: "0 40px", boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }}>
        <svg width="52" height="52" viewBox="0 0 24 24"><circle cx="10" cy="10" r="6.5" stroke={G} strokeWidth="2.6" fill="none" /><path d="M15 15l5.5 5.5" stroke={G} strokeWidth="2.8" strokeLinecap="round" /></svg>
        <div style={{ ...fontCss("sans"), fontSize: 50, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden" }}>
          {beat.text.slice(0, n)}<span style={{ color: G, opacity: cursor ? 1 : 0 }}>|</span>
        </div>
      </div>
      {sug.length && t >= to ? (
        <div style={{ marginTop: 14, borderRadius: 34, background: DARK, border: "1.5px solid rgba(255,255,255,0.12)", padding: "18px 40px", boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }}>
          {sug.map((s, i) => {
            const q = enter(frame, to + 0.08 + i * 0.09, fps, 14);
            return (
              <div key={i} style={{ ...fontCss("sans"), fontSize: 40, color: "rgba(255,255,255,0.78)", padding: "14px 0", display: "flex", alignItems: "center", gap: 22, opacity: q, transform: `translateY(${(1 - q) * 10}px)` }}>
                <svg width="30" height="30" viewBox="0 0 24 24"><circle cx="10" cy="10" r="6.5" stroke="rgba(255,255,255,0.45)" strokeWidth="2.4" fill="none" /><path d="M15 15l5.5 5.5" stroke="rgba(255,255,255,0.45)" strokeWidth="2.6" strokeLinecap="round" /></svg>
                <span><b style={{ color: "#fff" }}>{s.slice(0, beat.text.length)}</b>{s.slice(beat.text.length)}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

// B · groot kinetisch woord: slaat schermbreed in met bewegingswaas, beeld zakt even in helderheid (via dim in Main)
export const KineticWord: React.FC<{ beat: any }> = ({ beat }) => {
  const { frame, fps, t } = useT();
  const p = interpolate(t, [beat.start, beat.start + 0.22], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const out = exit(frame, beat.end, fps, 0.16);
  const size = beat.size ?? 300;
  const y = beat.y ?? 640;
  const word = (o: number, dy: number, blur: number, k: string) => (
    <div key={k} style={{ ...fontCss("condensed"), position: "absolute", left: 0, right: 0, top: y + dy, textAlign: "center", fontSize: size, lineHeight: 1, color: "#fff", opacity: o, filter: blur ? `blur(${blur}px)` : undefined, letterSpacing: "0.01em", whiteSpace: "nowrap", textTransform: "uppercase" }}>{beat.text}</div>
  );
  const sp = 1.6 - 0.6 * p;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out, transform: `scale(${sp})`, transformOrigin: `540px ${y + size / 2}px` }}>
      {p < 1 ? [word(0.25 * (1 - p), -90 * (1 - p), 10, "g1"), word(0.4 * (1 - p), -45 * (1 - p), 6, "g2")] : null}
      {word(Math.min(1, p * 1.4), 0, (1 - p) * 8, "w")}
      {beat.sub ? (
        <div style={{ ...fontCss("sans"), position: "absolute", left: 0, right: 0, top: y + size * 1.02, textAlign: "center", fontSize: beat.subSize ?? 60, fontWeight: 800, color: G, opacity: enter(frame, beat.start + 0.25, fps, 14), textTransform: "uppercase", letterSpacing: "0.02em" }}>{beat.sub}</div>
      ) : null}
    </div>
  );
};

// D · rollende teller (kilometerteller): elk cijfer rolt naar zijn plek
export const Counter: React.FC<{ beat: any }> = ({ beat }) => {
  const { frame, fps, t } = useT();
  const p = enter(frame, beat.start, fps, 16) * exit(frame, beat.end, fps, 0.18);
  const dur = beat.roll ?? 0.9;
  const prog = interpolate(t, [beat.start + 0.1, beat.start + 0.1 + dur], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const target = String(beat.value); // bv. "1,6" of "388"
  const size = beat.size ?? 230, cw = size * 0.62, ch = size * 1.18;
  const y = beat.y ?? 330;
  const digits = target.split("");
  const totalW = digits.reduce((s, c) => s + (/\d/.test(c) ? cw + 16 : size * 0.28), 0);
  let x = 540 - totalW / 2;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: p }}>
      {digits.map((c, i) => {
        const left = x;
        if (!/\d/.test(c)) { x += size * 0.28; return <div key={i} style={{ ...fontCss("condensed"), position: "absolute", left, top: y + ch * 0.12, fontSize: size, color: "#fff", lineHeight: 1 }}>{c}</div>; }
        x += cw + 16;
        const d = Number(c);
        const spins = 2 + i; // latere cijfers draaien langer (zoals een echte teller)
        const pos = (spins * 10 + d) * Math.min(1, prog * (1 + i * 0.12));
        const base = Math.floor(pos), frac = pos - base;
        const blur = prog < 1 ? Math.min(6, (1 - prog) * 10) : 0;
        return (
          <div key={i} style={{ position: "absolute", left, top: y, width: cw, height: ch, borderRadius: 22, background: DARK, border: `2.5px solid ${G}`, overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: -frac * ch, filter: blur ? `blur(${blur}px)` : undefined }}>
              {[0, 1].map((k) => (
                <div key={k} style={{ ...fontCss("condensed"), height: ch, fontSize: size, lineHeight: `${ch}px`, color: "#fff", textAlign: "center" }}>{(base + k) % 10}</div>
              ))}
            </div>
          </div>
        );
      })}
      {beat.unit ? <div style={{ ...fontCss("condensed"), position: "absolute", left: 0, right: 0, top: y + ch + 24, textAlign: "center", fontSize: size * 0.46, color: G, lineHeight: 1 }}>{beat.unit}</div> : null}
      {beat.sub ? <div style={{ ...fontCss("sans"), position: "absolute", left: 0, right: 0, top: y + ch + 24 + (beat.unit ? size * 0.5 : 0), textAlign: "center", fontSize: 50, fontWeight: 800, color: "#fff", textShadow: "0 4px 18px rgba(0,0,0,0.7)", opacity: enter(frame, beat.start + 0.1 + dur, fps, 14) }}>{beat.sub}</div> : null}
    </div>
  );
};

// H · notities-app (donker) met afvinkende items
export const NotesCard: React.FC<{ beat: any }> = ({ beat }) => {
  const { frame, fps, t } = useT();
  const p = enter(frame, beat.start, fps, 16) * exit(frame, beat.end, fps, 0.18);
  const items: { text: string; at: number }[] = beat.items ?? [];
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top: beat.y ?? 240, borderRadius: 40, background: "rgba(24,24,26,0.95)", border: "1.5px solid rgba(255,255,255,0.1)", padding: "40px 50px 34px", opacity: p, transform: `translateY(${(1 - p) * -30}px) scale(${0.97 + 0.03 * p})`, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
      <div style={{ ...fontCss("sans"), fontSize: 62, fontWeight: 800, color: "#fff" }}>{beat.title ?? "Notities"}</div>
      <div style={{ ...fontCss("sans"), fontSize: 32, color: "rgba(255,255,255,0.45)", marginTop: 4, marginBottom: 18 }}>{beat.subtitle ?? "vandaag"}</div>
      {items.map((it, i) => {
        const shown = t >= Math.min(it.at - 0.3, beat.start + 0.1 * i);
        const on = t >= it.at;
        const c = on ? enter(frame, it.at, fps, 10) : 0;
        if (!shown) return null;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 28, padding: "16px 0", borderTop: i ? "1px solid rgba(255,255,255,0.07)" : undefined }}>
            <div style={{ width: 58, height: 58, borderRadius: 58, border: `4px solid ${G}`, background: on ? G : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 + 0.18 * Math.sin(Math.min(1, c) * Math.PI)})` }}>
              <svg width="30" height="30" viewBox="0 0 24 24" style={{ opacity: c }}><path d="M4 12.5l5 5L20 6.5" stroke="#101010" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ ...fontCss("sans"), fontSize: 52, fontWeight: 700, color: on ? "rgba(255,255,255,0.5)" : "#fff", textDecoration: on ? "line-through" : "none", textDecorationColor: G }}>{it.text}</div>
          </div>
        );
      })}
    </div>
  );
};

// E · reality-tv bevriezing: rode cirkel die zichzelf tekent + onderschrift (het bevriezen/zwart-wit/inzoomen doet Main)
export const FreezeOverlay: React.FC<{ beat: any }> = ({ beat }) => {
  const { frame, fps, t } = useT();
  const out = exit(frame, beat.end, fps, 0.12);
  const draw = interpolate(t, [beat.start + 0.1, beat.start + 0.5], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const c = beat.circle ?? { x: 540, y: 700, rx: 290, ry: 340 };
  const L = 2 * Math.PI * Math.sqrt((c.rx ** 2 + c.ry ** 2) / 2);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
        <ellipse cx={c.x} cy={c.y} rx={c.rx} ry={c.ry} fill="none" stroke="#FF3B30" strokeWidth="13" strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - draw)} transform={`rotate(-8 ${c.x} ${c.y})`} />
      </svg>
      <div style={{ position: "absolute", left: 90, top: 260, display: "flex", gap: 14 }}>
        <div style={{ width: 22, height: 80, background: "#fff", borderRadius: 4 }} /><div style={{ width: 22, height: 80, background: "#fff", borderRadius: 4 }} />
      </div>
      {beat.caption ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: beat.captionY ?? 1450, display: "flex", justifyContent: "center", opacity: enter(frame, beat.start + 0.25, fps, 14) }}>
          <div style={{ ...fontCss("italic"), fontSize: 66, color: "#fff", background: "rgba(0,0,0,0.78)", padding: "14px 34px", borderRadius: 16 }}>{beat.caption}</div>
        </div>
      ) : null}
    </div>
  );
};

// F · kop boven de uitgezoomde kaart (het krimpen van de video doet Main)
export const ZoomCardTitle: React.FC<{ beat: any }> = ({ beat }) => {
  const { frame, fps } = useT();
  const p = enter(frame, beat.start + 0.15, fps, 16) * exit(frame, beat.end, fps, 0.15);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: beat.y ?? 215, textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>
      <div style={{ ...fontCss("condensed"), fontSize: beat.size ?? 150, color: "#fff", lineHeight: 1, textTransform: "uppercase" }}>{beat.title}</div>
      {beat.sub ? <div style={{ ...fontCss("italic"), fontSize: 72, color: G, marginTop: 10 }}>{beat.sub}</div> : null}
    </div>
  );
};

export const zoomCardScale = (beat: any, t: number) =>
  interpolate(t, [beat.start, beat.start + 0.35, beat.end - 0.25, beat.end], [1, beat.scale ?? 0.68, beat.scale ?? 0.68, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

// klein donker pilletje met tekst (bv. context onder een groot woord)
export const DarkPill: React.FC<{ beat: any }> = ({ beat }) => {
  const { frame, fps } = useT();
  const p = enter(frame, beat.start, fps, 14) * exit(frame, beat.end, fps, 0.15);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: beat.y ?? 600, display: "flex", justifyContent: "center", opacity: p, transform: `translateY(${(1 - p) * 14}px)` }}>
      <div style={{ ...fontCss("sans"), fontSize: beat.size ?? 48, fontWeight: 800, color: "#fff", background: DARK, border: `2px solid ${G}`, borderRadius: 999, padding: "14px 34px", whiteSpace: "nowrap", boxShadow: "0 16px 40px rgba(0,0,0,0.45)" }}>{beat.text}</div>
    </div>
  );
};
