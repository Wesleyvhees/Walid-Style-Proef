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
const TEXT_KEYS = ["text", "sub", "label", "doneText", "doneLabel", "headline", "comment", "kicker", "title"];
for (const b of sb.beats) {
  for (const k of TEXT_KEYS) if (typeof b[k] === "string") b[k] = cleanText(b[k], b.type === "hook" && k === "text");
  for (const l of b.lines ?? []) l.text = cleanText(l.text);
  for (const r of b.rows ?? []) r.label = cleanText(r.label);
}

// Gezichtsposities voor automatische plaatsing (tt.py layout)
const layoutFile = path.join(project, "layout.json");
if (fs.existsSync(layoutFile)) {
  sb.layout = JSON.parse(fs.readFileSync(layoutFile, "utf8"));
  sb.captions = sb.captions ?? {};
  if (sb.captions.y === undefined) sb.captions.y = "auto"; // standaard: ondertitels op de beste plek
}
if (sb.captions?.y === "auto" && !sb.layout) console.warn("Let op: captions.y = auto maar layout.json ontbreekt (draai tt.py layout)");

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
for (const b of sb.beats) {
  if (b.type === "images") b.src.forEach(copy);
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
