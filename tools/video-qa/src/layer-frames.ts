/**
 * Frames layer — cheap still-frame rule checks with TypeSafe's Jev (typed yes/no
 * answers and boxes, ~0.1 s and ~$0.0001–0.0002 per frame).
 *
 * Samples frames (default 1 fps, plus the midpoint of every caption/callout/graphic
 * event) and asks, per frame, in ONE request:
 *   - vertical video only: is overlay text (captions, titles, labels) inside the
 *     top / bottom platform-UI zones? (default 14% / 26%, the Instagram Reels UI)
 *   - is a pasted picture/graphic covering a visible face? does caption text?
 *   - optional: is this the same person as a reference photo? (AI-clone likeness)
 * Runs of flagged frames become issues with evidence frames on disk. Like Gemini in
 * Layer 3, this layer points at WHERE to look; inspect before changing an edit.
 * Graceful skip without TYPESAFE_API_KEY.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { EditManifest, LayerResult, QaIssue, Severity } from "./types";
import { ffmpegBin, ffprobeJson, runCapture } from "./ffmpeg";
import { imageRef, jevAsk, jevKey, jevModel, JEV_PRICE_PER_TOKEN, type JevBox, type JevQuestion, type JevResult } from "./jev";
import { nearestEvent } from "./manifest/schema";

export interface FramesOptions {
  /** Regular sampling rate (frames per second). */
  fps?: number;
  /** Hard cap on frames sent (event midpoints included); thinned evenly above it. */
  maxFrames?: number;
  /** Long side of the frame sent to Jev, px (API limit 1568; tokens ≈ pixels / 385). */
  maxSide?: number;
  /** Platform-UI zones as fractions of the height; null disables the text check. Vertical video only. */
  safeZone?: { top: number; bottom: number } | null;
  faceCheck?: boolean;
  /** Reference photo for an identity-consistency check (AI clones). */
  likenessRef?: string;
  likenessThreshold?: number;
  concurrency?: number;
  /** p(yes) at or above which a yes/no counts. */
  threshold?: number;
  /** Stricter bar for "a graphic covers a face": faces inside screen recordings scored 0.56–0.69 on real
   *  reels, pasted pictures over the speaker 0.77+ on test composites (TEST 2, 2026-10-16). */
  faceCoverThreshold?: number;
  /** How far (fraction of height) a text box may reach into a zone before it counts — absorbs box jitter. */
  zoneTolerance?: number;
  /** Where sampled frames are written (evidence for the report). */
  evidenceDir: string;
  /** Injection point for offline tests and alternate backends. */
  ask?: (state: unknown, questions: Record<string, JevQuestion>, images: Record<string, string>) => Promise<JevResult>;
  log?: (msg: string) => void;
}

export const DEFAULT_FRAMES = {
  fps: 1,
  maxFrames: 90,
  maxSide: 1280,
  safeZone: { top: 0.14, bottom: 0.26 },
  faceCheck: true,
  likenessThreshold: 0.5,
  concurrency: 6,
  threshold: 0.5,
  faceCoverThreshold: 0.75,
  zoneTolerance: 0.02,
};

const EVENT_KINDS = ["caption", "callout", "graphic", "broll"] as const;

const thin = (xs: number[], n: number): number[] =>
  n <= 0 ? [] : xs.length <= n ? xs : n === 1 ? [xs[Math.floor(xs.length / 2)]] : Array.from({ length: n }, (_, i) => xs[Math.round((i * (xs.length - 1)) / (n - 1))]);

/** Overlay-event midpoints plus regular samples at bin centres, capped. An event midpoint always wins over a
 *  nearby regular sample (a short caption must get its own frame), and the cap thins regular samples first. */
export function sampleTimes(duration: number, fps: number, maxFrames: number, events: EditManifest["events"]): number[] {
  const step = 1 / fps;
  const end = duration - 0.05;
  const mids: number[] = [];
  for (const e of events) {
    if (!(EVENT_KINDS as readonly string[]).includes(e.kind)) continue;
    const mid = e.out.end != null ? (e.out.start + e.out.end) / 2 : e.out.start + 0.2;
    if (mid > 0 && mid < end) mids.push(Number(mid.toFixed(3)));
  }
  mids.sort((a, b) => a - b);
  const ev: number[] = [];
  for (const t of mids) if (!ev.length || t - ev[ev.length - 1] >= 0.15) ev.push(t);
  const reg: number[] = [];
  for (let t = step / 2; t < end; t += step) {
    const r = Number(t.toFixed(3));
    if (ev.every((x) => Math.abs(x - r) >= 0.3)) reg.push(r);
  }
  const evKept = thin(ev, maxFrames);
  return [...evKept, ...thin(reg, maxFrames - evKept.length)].sort((a, b) => a - b);
}

/** Output size for a frame: long side ≤ maxSide (≤ 1568), short side ≥ 280 (API minimum), even numbers.
 *  `padW`/`padH` > w/h when an extreme aspect ratio needs letterboxing to reach the minimum. */
export function frameSize(width: number, height: number, maxSide: number): { w: number; h: number; padW: number; padH: number } {
  let s = Math.min(1, Math.min(maxSide, 1568) / Math.max(width, height));
  if (Math.min(width, height) * s < 280) s = Math.min(280 / Math.min(width, height), 1568 / Math.max(width, height));
  const even = (v: number) => Math.max(2, 2 * Math.round(v / 2));
  const w = even(width * s), h = even(height * s);
  return { w, h, padW: Math.max(w, 280), padH: Math.max(h, 280) };
}

/** ffmpeg filter that scales to frameSize() and letterboxes when needed. */
export function frameFilter(f: { w: number; h: number; padW: number; padH: number }): string {
  return f.padW > f.w || f.padH > f.h ? `scale=${f.w}:${f.h},pad=${f.padW}:${f.padH}:(ow-iw)/2:(oh-ih)/2:black` : `scale=${f.w}:${f.h}`;
}

export function buildQuestions(o: { vertical: boolean; safeZone: { top: number; bottom: number } | null; faceCheck: boolean; likeness: boolean }): Record<string, JevQuestion> {
  const q: Record<string, JevQuestion> = {};
  if (o.vertical && o.safeZone) {
    const top = Math.round(o.safeZone.top * 100);
    const bottom = Math.round(o.safeZone.bottom * 100);
    q.overlay_text = { type: "noul", instructions: "Is there caption, title or label text added on top of the video in `frame`?" };
    q.text_unsafe = { type: "noul", instructions: `Is any caption, title or label text added on top of the video in the top ${top}% or the bottom ${bottom}% of \`frame\`?` };
    q.overlay_text_box = { type: "box", instructions: "the caption, title or label text added on top of the video in `frame`" };
  }
  if (o.faceCheck || o.likeness) q.face_visible = { type: "noul", instructions: "Is a person's face visible in `frame`?" };
  if (o.faceCheck) {
    q.face_covered = { type: "noul", instructions: "Does a pasted picture, screenshot, graphic or card cover part of a person's face in `frame`?" };
    q.caption_over_face = { type: "noul", instructions: "Does caption or title text cover part of a person's face in `frame`?" };
  }
  if (o.likeness) q.same_person = { type: "noul", instructions: "Is the person in `frame` the same person as the person in `reference`?" };
  return q;
}

export type FrameFlag = "text_in_unsafe_zone" | "face_covered" | "caption_over_face" | "identity_drift";

export interface FrameSample {
  t: number;
  file: string;
  answers: Record<string, number | JevBox>;
  flags: FrameFlag[];
  tokens: number;
  ms: number;
}

const p = (a: JevResult["answers"], k: string): number | undefined => (a[k]?.type === "noul" ? (a[k] as { noul: number }).noul : undefined);

/** Pure decision for one frame. Text needs both yes/no answers AND a box that reaches into a zone. */
export function judgeFrame(
  a: JevResult["answers"],
  o: { safeZone: { top: number; bottom: number } | null; likenessThreshold: number; threshold: number; faceCoverThreshold?: number; zoneTolerance?: number }
): FrameFlag[] {
  const yes = (k: string, at = o.threshold) => (p(a, k) ?? 0) >= at;
  const tol = o.zoneTolerance ?? 0;
  const flags: FrameFlag[] = [];
  const box = a.overlay_text_box?.type === "box" ? a.overlay_text_box.box : null;
  if (o.safeZone && yes("overlay_text") && yes("text_unsafe") && box && (box.top < o.safeZone.top - tol || box.bottom > 1 - o.safeZone.bottom + tol)) {
    flags.push("text_in_unsafe_zone");
  }
  if (yes("face_visible")) {
    if (yes("face_covered", o.faceCoverThreshold ?? o.threshold)) flags.push("face_covered");
    if (yes("caption_over_face")) flags.push("caption_over_face");
    const same = p(a, "same_person");
    if (same != null && same < o.likenessThreshold) flags.push("identity_drift");
  }
  return flags;
}

const CATEGORY: Record<FrameFlag, { severity: Severity; kinds: string[]; text: (zone: string) => string }> = {
  text_in_unsafe_zone: { severity: "MEDIUM", kinds: ["caption", "callout", "graphic"], text: (zone) => `overlay text inside the platform-UI zone (${zone}) — it will sit under the app's buttons/caption` },
  face_covered: { severity: "MEDIUM", kinds: ["graphic", "broll", "callout"], text: () => "a pasted picture/graphic covers part of a visible face" },
  caption_over_face: { severity: "LOW", kinds: ["caption", "callout"], text: () => "caption/title text overlaps a visible face" },
  identity_drift: { severity: "MEDIUM", kinds: [], text: () => "the face on screen does not match the likeness reference" },
};

async function pool<T, R>(items: T[], n: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

export async function runFramesLayer(manifest: EditManifest, opts: FramesOptions): Promise<LayerResult> {
  const log = opts.log ?? (() => {});
  const ask = opts.ask ?? ((state, questions, images) => jevAsk(state, questions, images));
  if (!opts.ask && !jevKey()) {
    log("[qa:frames] skipped — TYPESAFE_API_KEY not set");
    return { status: "skipped", reason: "TYPESAFE_API_KEY not set", issues: [] };
  }
  const o = { ...DEFAULT_FRAMES, ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)) } as Required<Omit<FramesOptions, "likenessRef" | "ask" | "log">> & FramesOptions;
  const probe = await ffprobeJson(manifest.video);
  if (!probe.streams.some((s) => s.codec_type === "video")) throw new Error("no video stream to sample");
  const duration = parseFloat(probe.format.duration ?? "0");
  mkdirSync(o.evidenceDir, { recursive: true });
  // Measure a decoded frame, not the stream header: ffmpeg applies rotation metadata on decode.
  const firstFile = join(o.evidenceDir, "probe-frame.jpg");
  await runCapture(ffmpegBin(), ["-nostdin", "-v", "error", "-y", "-ss", Math.min(0.5, duration / 2).toFixed(3), "-i", manifest.video, "-frames:v", "1", "-q:v", "5", firstFile]);
  const shown = (await ffprobeJson(firstFile)).streams[0];
  if (!shown?.width || !shown?.height) throw new Error("could not decode a frame to sample");
  const vertical = shown.height > shown.width;
  const safeZone = vertical ? o.safeZone : null;
  const questions = buildQuestions({ vertical, safeZone, faceCheck: o.faceCheck, likeness: Boolean(opts.likenessRef) });
  if (!Object.keys(questions).length) return { status: "skipped", reason: "no frame checks apply (horizontal video, face and likeness checks off)", issues: [] };
  const size = frameSize(shown.width, shown.height, o.maxSide);
  const { padW: w, padH: h } = size;
  let refFile: string | undefined;
  if (opts.likenessRef) {
    // Small or odd-shaped references are fitted like frames (280 px minimum), long side ≤ 768 to save tokens.
    refFile = join(o.evidenceDir, "likeness-reference.jpg");
    const refRaw = (await ffprobeJson(opts.likenessRef)).streams.find((s) => s.width && s.height);
    if (!refRaw?.width || !refRaw?.height) throw new Error(`could not read the likeness reference: ${opts.likenessRef}`);
    await runCapture(ffmpegBin(), ["-nostdin", "-v", "error", "-y", "-i", opts.likenessRef, "-vf", frameFilter(frameSize(refRaw.width, refRaw.height, 768)), "-frames:v", "1", "-q:v", "3", refFile]);
  }
  const times = sampleTimes(duration, o.fps, o.maxFrames, manifest.events);
  log(`[qa:frames] Jev ${jevModel()} checking ${times.length} frames at ${w}x${h}: ${Object.keys(questions).join(", ")}`);

  let failures = 0;
  const samples = (await pool(times, o.concurrency, async (t) => {
    const file = join(o.evidenceDir, `f${t.toFixed(3).padStart(8, "0")}.jpg`);
    await runCapture(ffmpegBin(), ["-nostdin", "-v", "error", "-y", "-ss", t.toFixed(3), "-i", manifest.video, "-frames:v", "1", "-vf", frameFilter(size), "-q:v", "3", file]);
    const fref = imageRef("frame");
    const images: Record<string, string> = { [fref]: file };
    const state: Record<string, string> = { frame: fref };
    if (refFile) {
      const rref = imageRef("reference");
      images[rref] = refFile;
      state.reference = rref;
    }
    try {
      const r = await ask(state, questions, images);
      const answers: FrameSample["answers"] = {};
      for (const [k, a] of Object.entries(r.answers)) answers[k] = a.type === "noul" ? Number(a.noul.toFixed(3)) : a.box;
      return { t, file, answers, flags: judgeFrame(r.answers, { safeZone, likenessThreshold: o.likenessThreshold, threshold: o.threshold, faceCoverThreshold: o.faceCoverThreshold, zoneTolerance: o.zoneTolerance }), tokens: r.inputTokens, ms: r.ms } as FrameSample;
    } catch (e) {
      failures++;
      if (failures <= 3) log(`[qa:frames] frame ${t.toFixed(2)}s failed: ${(e as Error).message.slice(0, 160)}`);
      return null;
    }
  })).filter((s): s is FrameSample => s !== null);

  if (!samples.length || failures > times.length * 0.2) {
    throw new Error(`${failures}/${times.length} frame checks failed`);
  }

  const zone = safeZone ? `top ${Math.round(safeZone.top * 100)}% / bottom ${Math.round(safeZone.bottom * 100)}%` : "";
  // Group by the real spacing (the cap can thin samples below the requested fps).
  const diffs = samples.slice(1).map((s, i) => s.t - samples[i].t).sort((a, b) => a - b);
  const spacing = Math.max(1 / o.fps, diffs.length ? diffs[Math.floor(diffs.length / 2)] : 0);
  const gap = spacing * 1.6;
  const issues: QaIssue[] = [];
  for (const flag of Object.keys(CATEGORY) as FrameFlag[]) {
    const hits = samples.filter((s) => s.flags.includes(flag));
    const runs: FrameSample[][] = [];
    for (const s of hits) {
      const last = runs[runs.length - 1];
      if (last && s.t - last[last.length - 1].t <= gap) last.push(s);
      else runs.push([s]);
    }
    runs.forEach((run, n) => {
      const c = CATEGORY[flag];
      const start = Math.max(0, run[0].t - 0.5 / o.fps);
      const end = Math.min(duration, run[run.length - 1].t + 0.5 / o.fps);
      const anchor = c.kinds.length ? nearestEvent(manifest.events, (start + end) / 2, 0.5, c.kinds as EditManifest["events"][number]["kind"][]) : null;
      const key = flag === "identity_drift" ? "same_person" : flag === "text_in_unsafe_zone" ? "text_unsafe" : flag;
      const ps = run.map((s) => s.answers[key]).filter((v): v is number => typeof v === "number");
      issues.push({
        id: `LF-${flag}-${String(n + 1).padStart(3, "0")}`,
        source: "frames",
        severity: c.severity,
        category: flag,
        eventId: anchor?.id ?? null,
        timeWindow: { start: Number(start.toFixed(2)), end: Number(end.toFixed(2)) },
        message: `${c.text(zone)} in ${run.length} sampled frame(s) ${run[0].t.toFixed(1)}–${run[run.length - 1].t.toFixed(1)}s (Jev p ${flag === "identity_drift" ? "same person " : ""}${ps.length ? (Math.min(...ps) === Math.max(...ps) ? Math.min(...ps).toFixed(2) : `${Math.min(...ps).toFixed(2)}–${Math.max(...ps).toFixed(2)}`) : "n/a"}). Evidence frames: ${run.slice(0, 3).map((s) => s.file.split("/").pop()).join(", ")}${run.length > 3 ? ", …" : ""}. Look before changing the edit.`,
        objective: flag !== "caption_over_face",
        confidence: ps.length ? Number((flag === "identity_drift" ? 1 - Math.min(...ps) : Math.max(...ps)).toFixed(2)) : undefined,
        evidence: { frames: run.map((s) => ({ t: s.t, file: s.file, ...s.answers })) },
      });
    });
  }

  const tokens = samples.reduce((a, s) => a + s.tokens, 0);
  const msSorted = samples.map((s) => s.ms).sort((a, b) => a - b);
  log(`[qa:frames] ${issues.length} issue(s) from ${samples.length} frames · ${tokens} tokens ≈ $${(tokens * JEV_PRICE_PER_TOKEN).toFixed(4)}`);
  // A frame that was never judged could hold the only defect: report partial coverage (degraded results are
  // not cached, so the next run retries) while keeping what the judged frames found.
  return {
    status: failures ? "degraded" : issues.some((i) => i.severity !== "LOW") ? "warn" : "pass",
    ...(failures ? { reason: `${failures}/${times.length} frame checks failed; coverage is partial` } : {}),
    issues,
    stats: {
      model: jevModel(),
      frames: samples.length,
      failedFrames: failures,
      frameSize: `${w}x${h}`,
      vertical,
      checks: Object.keys(questions),
      inputTokens: tokens,
      usd: Number((tokens * JEV_PRICE_PER_TOKEN).toFixed(5)),
      msP50: msSorted[Math.floor(msSorted.length / 2)],
      evidenceDir: o.evidenceDir,
      perFrame: samples.map((s) => ({ t: s.t, flags: s.flags, ...s.answers })),
    },
  };
}
