/**
 * Frames layer (Jev still-frame checks) — offline. The Jev client is injected, so no
 * network or API key is involved; a real tiny MP4 exercises frame extraction.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildQuestions, frameFilter, frameSize, judgeFrame, runFramesLayer, sampleTimes } from "../layer-frames";
import { ffprobeJson } from "../ffmpeg";
import { aggregate } from "../report";
import { runQa } from "../index";
import { ffmpegBin, runCapture } from "../ffmpeg";
import type { JevResult } from "../jev";
import type { EditManifest, LayerResult } from "../types";

const pass = (): LayerResult => ({ status: "pass", issues: [] });
const noul = (v: number) => ({ type: "noul" as const, noul: v });
const box = (top: number, bottom: number) => ({ type: "box" as const, box: { left: 0.2, right: 0.8, top, bottom }, confidence: 0.8 });
const zone = { top: 0.14, bottom: 0.26 };

let dir = "";
let video = "";
before(async () => {
  dir = await mkdtemp(join(tmpdir(), "vqa-frames-"));
  video = join(dir, "vertical.mp4");
  await runCapture(ffmpegBin(), ["-nostdin", "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=d=4:s=320x568:r=30", "-pix_fmt", "yuv420p", video]);
});
after(async () => { if (dir) await rm(dir, { recursive: true, force: true }); });

describe("frames layer — sampling and sizing", () => {
  it("samples bin centres plus overlay-event midpoints, de-duplicated and capped", () => {
    const events: EditManifest["events"] = [
      { id: "caption:0", kind: "caption", out: { start: 1.1, end: 1.5 } }, // mid 1.3 → kept
      { id: "caption:1", kind: "caption", out: { start: 2.4, end: 2.6 } }, // mid 2.5 → same as a bin centre, dropped
      { id: "cut:1", kind: "cut", out: { start: 3.0 } }, // cuts are not sampled
    ];
    assert.deepEqual(sampleTimes(4, 1, 90, events), [0.5, 1.3, 2.5, 3.5]);
    const capped = sampleTimes(100, 1, 10, []);
    assert.equal(capped.length, 10);
    assert.equal(capped[0], 0.5);
    assert.equal(capped[9], 99.5);
  });
  it("gives a short caption its own frame and thins regular samples first under the cap", () => {
    const short: EditManifest["events"] = [{ id: "caption:s", kind: "caption", out: { start: 0.6, end: 0.8 } }];
    const t = sampleTimes(4, 1, 90, short);
    assert.ok(t.includes(0.7), "the caption midpoint is sampled");
    assert.ok(!t.includes(0.5), "the nearby regular sample yields to it");
    const many: EditManifest["events"] = Array.from({ length: 6 }, (_, i) => ({ id: `caption:${i}`, kind: "caption" as const, out: { start: 10 * i + 1, end: 10 * i + 1.2 } }));
    const capped = sampleTimes(60, 1, 8, many);
    assert.equal(capped.length, 8);
    for (const e of many) assert.ok(capped.includes(Number(((e.out.start + e.out.end!) / 2).toFixed(3))), "every event midpoint survives the cap");
  });
  it("fits frames inside the API limits", () => {
    assert.deepEqual(frameSize(1080, 1920, 1280), { w: 720, h: 1280, padW: 720, padH: 1280 });
    assert.deepEqual(frameSize(1920, 1080, 1280), { w: 1280, h: 720, padW: 1280, padH: 720 });
    assert.deepEqual(frameSize(3840, 2160, 9999), { w: 1568, h: 882, padW: 1568, padH: 882 });
    const tiny = frameSize(200, 356, 1280);
    assert.ok(Math.min(tiny.w, tiny.h) >= 280);
    const banner = frameSize(4000, 500, 1280); // 8:1 cannot reach 280 px by scaling without breaking 1568
    assert.ok(banner.padW <= 1568 && banner.padH >= 280 && banner.padH > banner.h);
    assert.match(frameFilter(banner), /pad=/);
    assert.doesNotMatch(frameFilter(frameSize(1080, 1920, 1280)), /pad=/);
  });
  it("asks the text-zone questions only for vertical video", () => {
    assert.ok("text_unsafe" in buildQuestions({ vertical: true, safeZone: zone, faceCheck: true, likeness: false }));
    assert.ok(!("text_unsafe" in buildQuestions({ vertical: false, safeZone: zone, faceCheck: true, likeness: false })));
    const likenessOnly = buildQuestions({ vertical: false, safeZone: null, faceCheck: false, likeness: true });
    assert.ok("same_person" in likenessOnly);
    assert.ok("face_visible" in likenessOnly, "--no-face-check must not switch off identity drift");
    assert.ok(!("face_covered" in likenessOnly));
  });
});

describe("frames layer — per-frame decision", () => {
  const o = { safeZone: zone, likenessThreshold: 0.5, threshold: 0.5, faceCoverThreshold: 0.75, zoneTolerance: 0.02 };
  it("needs overlay text, a yes on the zone question AND a box that reaches into a zone", () => {
    const unsafe = { overlay_text: noul(0.9), text_unsafe: noul(0.9), overlay_text_box: box(0.05, 0.12) };
    assert.deepEqual(judgeFrame(unsafe, o), ["text_in_unsafe_zone"]);
    assert.deepEqual(judgeFrame({ ...unsafe, overlay_text_box: box(0.4, 0.5) }, o), [], "box in the safe band overrules the yes/no");
    assert.deepEqual(judgeFrame({ ...unsafe, text_unsafe: noul(0.2) }, o), [], "yes/no says safe");
    assert.deepEqual(judgeFrame({ ...unsafe, overlay_text: noul(0.1) }, o), [], "no overlay text at all");
    assert.deepEqual(judgeFrame({ ...unsafe, overlay_text_box: box(0.6, 0.8) }, o), ["text_in_unsafe_zone"], "bottom zone starts at 74%");
    assert.deepEqual(judgeFrame({ ...unsafe, overlay_text_box: box(0.6, 0.755) }, o), [], "grazing the line within the 2% tolerance");
    assert.deepEqual(judgeFrame({ ...unsafe, overlay_text_box: box(0.125, 0.3) }, o), [], "top edge within tolerance");
  });
  it("judges faces only when a face is visible", () => {
    const covered = { face_visible: noul(0.95), face_covered: noul(0.9), caption_over_face: noul(0.1) };
    assert.deepEqual(judgeFrame(covered, o), ["face_covered"]);
    assert.deepEqual(judgeFrame({ ...covered, face_visible: noul(0.1) }, o), [], "full-screen takeover: no face to cover");
    assert.deepEqual(judgeFrame({ ...covered, face_covered: noul(0.65) }, o), [], "faces inside screen recordings score below the stricter bar");
    assert.deepEqual(judgeFrame({ face_visible: noul(0.9), same_person: noul(0.2) }, o), ["identity_drift"]);
    assert.deepEqual(judgeFrame({ face_visible: noul(0.9), same_person: noul(0.8) }, o), []);
  });
});

describe("frames layer — run", () => {
  it("skips cleanly without TYPESAFE_API_KEY", async () => {
    const saved = process.env.TYPESAFE_API_KEY;
    delete process.env.TYPESAFE_API_KEY;
    try {
      const r = await runFramesLayer({ version: 1, lane: "generic", video, events: [] }, { evidenceDir: join(dir, "ev0") });
      assert.equal(r.status, "skipped");
      assert.match(r.reason ?? "", /TYPESAFE_API_KEY/);
    } finally {
      if (saved) process.env.TYPESAFE_API_KEY = saved;
    }
  });

  it("groups consecutive flagged frames into one anchored issue with evidence", async () => {
    const asked: number[] = [];
    const ask = async (_s: unknown, q: Record<string, unknown>, images: Record<string, string>): Promise<JevResult> => {
      const file = Object.values(images)[0];
      assert.ok(existsSync(file), "frame was extracted before asking");
      const t = Number(file.match(/f(\d+\.\d+)\.jpg$/)![1]);
      asked.push(t);
      assert.ok("text_unsafe" in q, "vertical fixture gets the zone questions");
      const bad = t > 1 && t < 3; // frames at 1.5 and 2.5 s violate
      return {
        answers: {
          overlay_text: noul(0.9), text_unsafe: noul(bad ? 0.9 : 0.1), overlay_text_box: bad ? box(0.02, 0.1) : box(0.4, 0.5),
          face_visible: noul(0.1), face_covered: noul(0.1), caption_over_face: noul(0.1),
        },
        inputTokens: 1000, ms: 80, model: "fake",
      };
    };
    const m: EditManifest = { version: 1, lane: "generic", video, events: [{ id: "caption:7", kind: "caption", out: { start: 1.9, end: 2.2 } }] };
    const r = await runFramesLayer(m, { evidenceDir: join(dir, "ev1"), ask });
    assert.equal(r.status, "warn");
    assert.equal(r.issues.length, 1);
    const [issue] = r.issues;
    assert.equal(issue.category, "text_in_unsafe_zone");
    assert.equal(issue.source, "frames");
    assert.equal(issue.severity, "MEDIUM");
    assert.equal(issue.eventId, "caption:7");
    assert.deepEqual((issue.evidence!.frames as { t: number }[]).map((f) => f.t), [1.5, 2.05, 2.5]);
    assert.equal(r.stats!.frames, asked.length);
  });

  it("keeps findings but reports partial coverage when a few frames fail", async () => {
    let n = 0;
    const ask = async (): Promise<JevResult> => {
      if (n++ === 0) throw new Error("HTTP 503");
      return { answers: { overlay_text: noul(0.1), text_unsafe: noul(0.1), overlay_text_box: box(0.4, 0.5), face_visible: noul(0.9), face_covered: noul(0.9), caption_over_face: noul(0.1) }, inputTokens: 10, ms: 5, model: "fake" };
    };
    const r = await runFramesLayer({ version: 1, lane: "generic", video, events: [] }, { evidenceDir: join(dir, "ev3"), ask, concurrency: 1, fps: 2 });
    assert.equal(r.status, "degraded");
    assert.match(r.reason ?? "", /1\/\d+ frame checks failed/);
    assert.ok(r.issues.some((i) => i.category === "face_covered"), "what the judged frames found is still reported");
  });

  it("fits a small likeness reference to the API minimum", async () => {
    const ref = join(dir, "small-ref.jpg");
    await runCapture(ffmpegBin(), ["-nostdin", "-v", "error", "-y", "-f", "lavfi", "-i", "color=c=gray:s=200x200", "-frames:v", "1", ref]);
    const sizes: number[][] = [];
    const ask = async (_s: unknown, q: Record<string, unknown>, images: Record<string, string>): Promise<JevResult> => {
      for (const f of Object.values(images)) {
        const st = (await ffprobeJson(f)).streams[0];
        sizes.push([st.width!, st.height!]);
      }
      assert.ok("same_person" in q && "face_visible" in q);
      return { answers: { face_visible: noul(0.9), same_person: noul(0.1) }, inputTokens: 10, ms: 5, model: "fake" };
    };
    const r = await runFramesLayer({ version: 1, lane: "generic", video, events: [] }, { evidenceDir: join(dir, "ev4"), ask, likenessRef: ref, safeZone: null, faceCheck: false });
    assert.ok(sizes.length > 0 && sizes.every(([w, h]) => Math.min(w, h) >= 280), `every image sent is at least 280 px: ${JSON.stringify(sizes)}`);
    assert.ok(r.issues.some((i) => i.category === "identity_drift"));
  });

  it("degrades instead of passing when most frame checks fail", async () => {
    const ask = async (): Promise<JevResult> => { throw new Error("HTTP 400"); };
    await assert.rejects(runFramesLayer({ version: 1, lane: "generic", video, events: [] }, { evidenceDir: join(dir, "ev2"), ask }), /frame checks failed/);
  });
});

describe("frames layer — report and runQa", () => {
  const base = { video: "v", videoSha256: "s", iteration: 1, technical: pass(), transcript: pass(), semantic: pass() };
  const issue = { id: "LF-face_covered-001", source: "frames" as const, severity: "MEDIUM" as const, category: "face_covered", eventId: null, timeWindow: { start: 1, end: 2 }, message: "m", objective: true };
  it("an unrun or skipped frames layer is not part of coverage", () => {
    assert.equal(aggregate(base).verdict, "PASS");
    assert.equal(aggregate({ ...base, frames: { status: "skipped", reason: "no key", issues: [] } }).verdict, "PASS");
    assert.deepEqual(aggregate(base).coverage.completed, ["technical", "transcript", "semantic"]);
  });
  it("counts once it runs, warns when degraded, fails when required but missing", () => {
    assert.deepEqual(aggregate({ ...base, frames: pass() }).coverage.completed, ["technical", "transcript", "semantic", "frames"]);
    assert.equal(aggregate({ ...base, frames: { status: "warn", issues: [issue] } }).verdict, "PASS_WITH_WARNINGS");
    assert.equal(aggregate({ ...base, frames: { status: "degraded", reason: "x", issues: [] } }).verdict, "PASS_WITH_WARNINGS");
    assert.equal(aggregate({ ...base, frames: { status: "skipped", reason: "no key", issues: [] }, requiredLayers: ["technical", "frames"] }).verdict, "FAIL");
  });
  it("runQa runs the layer only when asked", async () => {
    let calls = 0;
    const runners = {
      technical: async () => ({ ...pass(), stats: { duration: 4 } }),
      transcript: async () => pass(),
      semantic: async () => pass(),
      frames: async () => { calls++; return { status: "warn" as const, issues: [issue] }; },
    };
    const m: EditManifest = { version: 1, lane: "generic", video, events: [] };
    const off = await runQa({ manifest: m, outDir: join(dir, "r1"), noCache: true, autoInspect: 0, log: () => {}, runners });
    assert.equal(calls, 0);
    assert.equal(off.report.layers.frames, undefined);
    const on = await runQa({ manifest: m, outDir: join(dir, "r2"), noCache: true, autoInspect: 0, log: () => {}, runners, frames: {} });
    assert.equal(calls, 1);
    assert.equal(on.report.verdict, "PASS_WITH_WARNINGS");
    assert.equal(on.report.issues[0].category, "face_covered");
  });
  it("reuses cached frame findings only while their evidence frames exist", async () => {
    const previous = process.env.VIDEO_QA_CACHE_DIR;
    process.env.VIDEO_QA_CACHE_DIR = join(dir, "cache");
    try {
      let calls = 0;
      const runners = {
        technical: async () => ({ ...pass(), stats: { duration: 4 } }),
        transcript: async () => pass(),
        semantic: async () => pass(),
        frames: async (_m: EditManifest, o: { evidenceDir: string }) => {
          calls++;
          mkdirSync(o.evidenceDir, { recursive: true });
          writeFileSync(join(o.evidenceDir, "probe-frame.jpg"), "x");
          return { status: "warn" as const, issues: [{ ...issue, evidence: { frames: [{ file: join(o.evidenceDir, "f1.jpg") }] } }] };
        },
      };
      const m: EditManifest = { version: 1, lane: "generic", video, events: [] };
      const base = { manifest: m, outDir: join(dir, "r3"), autoInspect: 0, log: () => {}, runners, frames: {} };
      await runQa(base);
      await runQa(base);
      assert.equal(calls, 1, "second run is a cache hit");
      rmSync(join(dir, "r3", "frames"), { recursive: true, force: true });
      await runQa(base);
      assert.equal(calls, 2, "evidence deleted → recomputed, not a dangling cache hit");
      await runQa({ ...base, outDir: join(dir, "r4") });
      assert.equal(calls, 3, "a different output directory does not reuse another directory's evidence");
    } finally {
      if (previous) process.env.VIDEO_QA_CACHE_DIR = previous; else delete process.env.VIDEO_QA_CACHE_DIR;
    }
  });
});
