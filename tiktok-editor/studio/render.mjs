// Render een project: node render.mjs <projectmap> [uit.mp4] [--stills 1.2,6,9] [--draft]
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n) => {
  const i = args.indexOf(n);
  if (i < 0) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const stills = flag("--stills");
const draft = args.includes("--draft") && args.splice(args.indexOf("--draft"), 1);
const project = path.resolve(args[0] ?? ".");
const out = path.resolve(args[1] ?? path.join(project, "final.mp4"));

const sb = JSON.parse(fs.readFileSync(path.join(project, "storyboard.json"), "utf8"));
if (!sb.words) sb.words = JSON.parse(fs.readFileSync(path.join(project, "words.json"), "utf8"));
if (!sb.duration) {
  sb.duration = Number(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(project, sb.video)])
      .toString()
      .trim(),
  );
}
if (sb.person && !fs.existsSync(path.join(project, sb.person))) {
  console.warn(`Let op: ${sb.person} ontbreekt, titels komen vóór de persoon. Draai eerst: tt.py person`);
  delete sb.person;
}

// Serie-template: stijl en toegestane effecten per serie (templates.json)
if (sb.template) {
  const T = JSON.parse(fs.readFileSync(path.join(here, "..", "templates.json"), "utf8"))[sb.template];
  if (!T) throw new Error(`Onbekende template: ${sb.template}`);
  sb.style = sb.style ?? T.style;
  if (T.style && sb.style !== T.style) console.warn(`Let op: template ${sb.template} hoort stijl ${T.style}, storyboard zegt ${sb.style}`);
  sb.captions = { ...(T.captions ?? {}), ...(sb.captions ?? {}) };
  if (T.jumpZoom !== undefined && sb.jumpZoom === undefined) sb.jumpZoom = T.jumpZoom;
  if (T.sfxVolume !== undefined && sb.sfxVolume === undefined) sb.sfxVolume = T.sfxVolume;
  if (T.hookHeleVideo !== undefined && sb.hookHeleVideo === undefined) sb.hookHeleVideo = T.hookHeleVideo;
  if (T.loop !== undefined && sb.loop === undefined) sb.loop = T.loop;
  if (T.cardLook && sb.cardLook === undefined) sb.cardLook = T.cardLook;
  // vaste hoogte voor hook + serienaam in elke video (Wes 2026-11-09, keuzemenu optie C: onder de TikTok-knoppen, vrij van je hoofd)
  sb.beats.forEach((b) => { if (b.type === "hook") b.y = T.hookY ?? 300; });
  // harde impact-woorden als vaste stijl van de serie (per woord uit te zetten met "hard": false)
  if (T.impactHard) sb.beats.forEach((b) => { if (b.type === "pop" && b.look === "impact" && b.hard === undefined) b.hard = true; });
  // lettertype en grootte van de impact-woorden per serie (Wes 2026-11-06: Barlow Condensed Black Italic, 90%)
  if (T.impactFont) sb.beats.forEach((b) => { if (b.type === "pop" && b.look === "impact" && !b.font) b.font = T.impactFont; });
  // ook de hook-titel bovenin in hetzelfde lettertype (Wes' keuze "lettertype voor de woorden bovenin")
  if (T.impactFont) sb.beats.forEach((b) => { if (b.type === "hook" && !b.font) b.font = T.impactFont; });
  if (T.impactScale) sb.beats.forEach((b) => { if (b.type === "pop" && b.look === "impact" && !b.scaled) { b.size = Math.round((b.size ?? 170) * T.impactScale); b.scaled = true; } });
  if (T.sfxOpZoom === false) {
    // geen geluidseffect op een moment met een (punch-)zoom; overige geluiden blijven
    const zoomAt = (sb.zooms ?? []).filter((z) => (z.ease ?? "in") === "punch").map((z) => z.start);
    let n = 0;
    sb.beats.forEach((b) => {
      if (b.sfx && zoomAt.some((z) => Math.abs(z - b.start) < 0.15)) { delete b.sfx; n++; }
    });
    if (n) console.log(`Template ${sb.template}: ${n} geluid(en) op een zoom weggelaten`);
  }
  if (T.toegestaan) {
    const weg = sb.beats.filter((b) => !T.toegestaan.includes(b.type) || (b.type === "pop" && T.popLooks && !T.popLooks.includes(b.look ?? "sticker")));
    weg.forEach((b) => console.warn(`Template ${sb.template}: ${b.type}${b.look ? "/" + b.look : ""} op ${b.start}s past niet bij deze serie, weggelaten`));
    sb.beats = sb.beats.filter((b) => !weg.includes(b));
  }
}

// Hook-titel de hele video in beeld: UIT (Wes 2026-11-06: "maak dit ongedaan"). Alleen als een storyboard of
// template expliciet hookHeleVideo: true zet. Main.tsx pint hem dan kleiner bovenin.
if (sb.hookHeleVideo === true) {
  const endAt = Math.min(sb.duration, ...sb.beats.filter((b) => ["volgstempel", "follow", "comment"].includes(b.type)).map((b) => b.start));
  for (const b of sb.beats) if (b.type === "hook" && b.start < 1 && endAt > b.end) { b.pinAt = b.end; b.end = endAt; }
}

// Geen rare leestekens in tekst in beeld (wens van Wes): … – — × = * “ ” en klemtoontekens als nadruk.
const cleanText = (t, keepStars = false) =>
  t
    .replace(/\.\.\.|…/g, "")
    .replace(/[–—]/g, "-")
    .replace(/×/g, "x")
    .replace(/[=“”„"«»]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(keepStars ? /(?!)/g : /\*/g, "")
    .replace(/\b(w|d|z|h)él\b/gi, (m) => m.replace(/é/, "e").replace(/É/, "E"))
    .replace(/\s{2,}/g, " ")
    .trim();
const TEXT_KEYS = ["text", "sub", "label", "doneText", "doneLabel", "headline", "comment", "kicker", "title", "masthead", "button"];
for (const b of sb.beats) {
  for (const k of TEXT_KEYS) if (typeof b[k] === "string") b[k] = cleanText(b[k], b.type === "hook" && k === "text");
  for (const l of b.lines ?? []) l.text = cleanText(l.text);
  for (const r of b.rows ?? []) if (r && typeof r === "object") r.label = cleanText(r.label);
  for (const it of b.items ?? []) it.text = cleanText(it.text);
  for (const it of b.steps ?? []) it.text = cleanText(it.text);
  if (b.rows && typeof b.rows[0] === "string") b.rows = b.rows.map((r) => cleanText(r));
  if (b.coverLines) b.coverLines = b.coverLines.map((r) => cleanText(r));
}

// Gezichtsposities voor automatische plaatsing (tt.py layout)
const layoutFile = path.join(project, "layout.json");
if (fs.existsSync(layoutFile)) {
  sb.layout = JSON.parse(fs.readFileSync(layoutFile, "utf8"));
}  // ondertitels standaard onder de kin ("auto", Wes 2026-11-05); een vast getal in het storyboard wint
// Ondertitels op één VASTE hoogte per video (Wes 2026-11-06: "nu verspringt de hoogte"): net onder je kin zoals die
// meestal staat (mediaan over de hele video). Een getal in het storyboard wint; "regel" = oude per-regel-plaatsing.
sb.captions = sb.captions ?? {};
if (typeof sb.captions.y !== "number" && sb.captions.y !== "regel") {
  const chins = (sb.layout?.faces ?? []).filter(Boolean).map((f) => f[1] + f[3] * 1.22).sort((a, b) => a - b);
  sb.captions.y = chins.length ? Math.max(900, Math.min(1470, Math.round(chins[Math.floor(chins.length / 2)] + 10))) : 1290;
  console.log(`Ondertitels vast op y ${sb.captions.y}`);
} else if (sb.captions.y === "regel") sb.captions.y = "auto";
// Kernwoorden kleuren: de woorden uit stickers/impact-woorden/labels automatisch ook in de ondertitels
const hlWords = new Set((sb.captions.highlight ?? []).map((w) => w.toLowerCase()));
for (const b of sb.beats) if (b.type === "pop" && typeof b.text === "string") for (const w of b.text.toLowerCase().split(/\s+/)) if (w.length > 2 && !/^\d/.test(w)) hlWords.add(w);
sb.captions.highlight = [...hlWords];

// Virtuele camera's: per shot schaal + verschuiving zodat het focuspunt (gezicht/borst) goed in beeld staat
if (sb.cams?.length) {
  const presets = { A: { scale: 1, focus: "full" }, B: { scale: 1.3, focus: "chest" }, C: { scale: 1.7, focus: "face" }, ...(sb.camPresets ?? {}) };
  const faces = sb.layout?.faces ?? [];
  const lfps = sb.layout?.fps ?? 4;
  const median = (arr) => { const a = [...arr].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : undefined; };
  sb.camShots = sb.cams.map((c) => {
    const pr = presets[c.cam] ?? presets.A;
    if (pr.scale <= 1.001) return { start: c.start, end: c.end, scale: 1, tx: 0, ty: 0 };
    const fs = faces.slice(Math.floor(c.start * lfps), Math.ceil(c.end * lfps) + 1).filter(Boolean);
    const fx = median(fs.map((f) => f[0] + f[2] / 2)) ?? 540;
    const fy = median(fs.map((f) => f[1] + f[3] / 2)) ?? 700;
    const fh = median(fs.map((f) => f[3])) ?? 300;
    // gezicht op een vaste schermgrootte: close-up ±600 px, medium ±420 px (nooit verder dan de preset)
    const wantFace = { face: 600, chest: 420, belly: 300 }[pr.focus ?? "face"] ?? 600;
    const s = Math.max(1.08, Math.min(pr.scale, wantFace / fh));
    // focuspunt in het bronbeeld en waar het op het scherm moet komen
    const focus = { face: [fx, fy, 760], chest: [fx, fy + fh * 1.1, 980], belly: [fx, fy + fh * 2.6, 1000], full: [540, 960, 960] }[pr.focus ?? "face"];
    let tx = 540 - s * focus[0];
    let ty = focus[2] - s * focus[1];
    tx = Math.min(0, Math.max(1080 - s * 1080, tx)); // nooit randen laten zien
    ty = Math.min(0, Math.max(1920 - s * 1920, ty));
    return { start: c.start, end: c.end, scale: s, tx: Math.round(tx), ty: Math.round(ty) };
  });
}

// Zooms op de beat: "beatZooms": {"every": 2, "to": 1.04} + beats.json (tt.py beats)
const bz = sb.beatZooms;
const beatsFile = path.join(project, "beats.json");
if (bz && fs.existsSync(beatsFile)) {
  const { beats } = JSON.parse(fs.readFileSync(beatsFile, "utf8"));
  sb.zooms = sb.zooms ?? [];
  const taken = sb.zooms.map((z) => z.start);
  beats
    .filter((_, i) => i % (bz.every ?? 2) === (bz.offset ?? 0))
    .filter((t) => t > (bz.from ?? 0) && t < (bz.until ?? 1e9) && !taken.some((z) => Math.abs(z - t) < 0.45))
    .forEach((t) => sb.zooms.push({ start: t, end: t + (bz.hold ?? 0.18), to: bz.to ?? 1.04, ease: "punch" }));
}

// Knippen zonder "springen": na een knip om en om 100% / 108% in beeld (zoals een cameraman die wisselt).
// Uit met "jumpZoom": false; niet bij virtuele camera's (die wisselen zelf al).
const cutsFile = path.join(project, "cuts.json");
const jz = sb.jumpZoom === undefined ? {} : sb.jumpZoom;
if (jz && !sb.cams?.length && fs.existsSync(cutsFile)) {
  const to = jz.to ?? 1.08;
  const minHold = jz.minHold ?? 0.8; // niet sneller wisselen dan dit
  const cuts = JSON.parse(fs.readFileSync(cutsFile, "utf8")).cuts.filter((c) => c > 0.2 && c < sb.duration - 0.3).sort((a, b) => a - b);
  const faces = sb.layout?.faces ?? [];
  const lfps = sb.layout?.fps ?? 4;
  const med = (arr) => { const a = [...arr].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : undefined; };
  sb.cutLevels = [];
  let segStart = 0, zoomed = false;
  for (const c of [...cuts, sb.duration]) {
    if (c < sb.duration && c - segStart < minHold) continue;
    if (zoomed) {
      // inzoomen rond het gezicht, zodat dat op dezelfde plek blijft
      const fs_ = faces.slice(Math.floor(segStart * lfps), Math.ceil(c * lfps) + 1).filter(Boolean);
      sb.cutLevels.push({ start: segStart, end: c, scale: to, ox: Math.round(med(fs_.map((f) => f[0] + f[2] / 2)) ?? 540), oy: Math.round(med(fs_.map((f) => f[1] + f[3] / 2)) ?? 806) });
    }
    zoomed = !zoomed;
    segStart = c;
  }
  // loop: het laatste stuk staat op 100%, net als het begin, zodat einde en begin naadloos op elkaar aansluiten
  if (sb.loop) sb.cutLevels = sb.cutLevels.filter((c) => c.end < sb.duration - 0.05);
  console.log(`Knippen: ${cuts.length} knippen, ${sb.cutLevels.length} stukken op ${Math.round(to * 100)}%`);
}

// Projectbestanden naar public/p (Remotion serveert alleen public/).
const pub = path.join(here, "public", "p");
fs.rmSync(pub, { recursive: true, force: true });
fs.mkdirSync(pub, { recursive: true });
const copy = (rel) => {
  const src = path.join(project, rel);
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(path.join(pub, rel)), { recursive: true });
  fs.cpSync(src, path.join(pub, rel), { recursive: true });
};
copy(sb.video);
if (sb.person) copy(sb.person);
if (sb.plate) copy(sb.plate);
for (const b of sb.beats) {
  if (b.type === "images") b.src.forEach(copy);
  if (Array.isArray(b.images)) b.images.forEach(copy);
  else if (typeof b.src === "string") copy(b.src);
}

const browserExecutable =
  process.env.REMOTION_BROWSER ??
  [
    "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell",
  ].find((p) => fs.existsSync(p));

console.log("Bundelen...");
const serveUrl = await bundle({ entryPoint: path.join(here, "src", "index.ts"), publicDir: path.join(here, "public") });
const composition = await selectComposition({ serveUrl, id: "Main", inputProps: sb, browserExecutable });

if (stills) {
  for (const s of stills.split(",")) {
    const f = Math.min(composition.durationInFrames - 1, Math.round(Number(s) * 30));
    const file = path.join(project, "stills", `still_${s}.png`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await renderStill({ composition, serveUrl, output: file, frame: f, inputProps: sb, browserExecutable });
    console.log("Still:", file);
  }
  process.exit(0);
}

const tmp = out.replace(/\.mp4$/, ".raw.mp4");
let last = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: tmp,
  inputProps: sb,
  browserExecutable,
  crf: draft ? 26 : 20, // 20 = visueel gelijk, half zo groot (prettig voor telefoon/TikTok)
  concurrency: Number(process.env.CONCURRENCY ?? 4),
  scale: draft ? 0.5 : 1,
  onProgress: ({ progress }) => {
    const p = Math.floor(progress * 10);
    if (p !== last) {
      last = p;
      console.log(`Renderen ${p * 10}%`);
    }
  },
});

// Geluid op TikTok-volume (-14 LUFS) en wat compressie.
execFileSync("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "error", "-i", tmp,
  "-c:v", "copy",
  "-af", "highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=5:release=120,loudnorm=I=-14:TP=-1.5:LRA=9",
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", out,
]);
fs.rmSync(tmp);
console.log("Klaar:", out);
