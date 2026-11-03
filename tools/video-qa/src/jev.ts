/**
 * Minimal TypeSafe System One client ("Jev") for still-frame judgments — fetch-based,
 * no SDK dependency, like gemini.ts.
 *
 * Images are sent as multipart file parts, which the API only accepts with the
 * `TypeSafe-Danger-Zone-Images: true` header (TypeSafe labels images and Box questions
 * experimental: the request format, answers and limits can change between releases, so
 * the model is pinned). Box questions need jev-1.14 or later.
 *
 * Key: TYPESAFE_API_KEY. Model: VIDEO_QA_JEV_MODEL, default "jev-1.14.0".
 * Docs: https://docs.typesafe.ai/images.md, /primitives/box.md
 */
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
/** USD per input token (output is free) — docs.typesafe.ai/models, Oct 2026. */
export const JEV_PRICE_PER_TOKEN = 0.042 / 1e6;

export function jevKey(): string | null {
  return process.env.TYPESAFE_API_KEY || null;
}

export function jevModel(): string {
  return process.env.VIDEO_QA_JEV_MODEL || "jev-1.14.0";
}

export type JevQuestion =
  | { type: "noul"; instructions: string }
  | { type: "box"; instructions: string };

export interface JevBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type JevAnswer =
  | { type: "noul"; noul: number }
  | { type: "box"; box: JevBox; confidence: number };

export interface JevResult {
  answers: Record<string, JevAnswer>;
  inputTokens: number;
  ms: number;
  model: string;
}

/** Asset references are plain-text find-and-replace, so they must never occur by accident. */
export function imageRef(tag: string): string {
  return `${tag}-${randomUUID().slice(0, 13)}`;
}

const unit = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;

function validate(id: string, q: JevQuestion, a: unknown): JevAnswer {
  const bad = (why: string) => new Error(`Jev answer for "${id}" invalid: ${why}`);
  if (!a || typeof a !== "object") throw bad("missing");
  const x = a as Record<string, unknown>;
  if (x.type !== q.type) throw bad(`type ${String(x.type)} != ${q.type}`);
  if (q.type === "noul") {
    if (!unit(x.noul)) throw bad("noul not in [0,1]");
    return { type: "noul", noul: x.noul };
  }
  const b = x.box as Record<string, unknown> | undefined;
  if (!b || ![b.left, b.top, b.right, b.bottom].every(unit)) throw bad("box edges not in [0,1]");
  if (!((b.left as number) < (b.right as number)) || !((b.top as number) < (b.bottom as number))) throw bad("box edges out of order");
  if (!unit(x.confidence)) throw bad("confidence not in [0,1]");
  return { type: "box", box: { left: b.left as number, top: b.top as number, right: b.right as number, bottom: b.bottom as number }, confidence: x.confidence };
}

/**
 * One System One request. `images` maps each reference (as written in state or
 * instructions) to a JPEG/PNG file. Retries 429/5xx with backoff.
 */
export async function jevAsk(
  state: unknown,
  questions: Record<string, JevQuestion>,
  images: Record<string, string>,
  opts: { model?: string; timeoutMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<JevResult> {
  const key = jevKey();
  if (!key) throw new Error("TYPESAFE_API_KEY not set");
  const model = opts.model ?? jevModel();
  const doFetch = opts.fetchImpl ?? fetch;
  const refs = Object.keys(images);
  const assets = Object.fromEntries(refs.map((r, i) => [r, { type: "image", part: `img${i}` }]));
  const bodies = await Promise.all(refs.map((r) => readFile(images[r])));

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const form = new FormData();
    form.append("request", new Blob([JSON.stringify({ model, state, questions, assets })], { type: "application/json" }));
    refs.forEach((r, i) => {
      const png = images[r].toLowerCase().endsWith(".png");
      form.append(`img${i}`, new Blob([bodies[i]], { type: png ? "image/png" : "image/jpeg" }), `img${i}.${png ? "png" : "jpg"}`);
    });
    const t0 = performance.now();
    const res = await doFetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "TypeSafe-Danger-Zone-Images": "true" },
      body: form,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
    });
    const ms = Math.round(performance.now() - t0);
    const text = await res.text();
    if (res.status === 429 || res.status >= 500) {
      lastErr = new Error(`Jev HTTP ${res.status}: ${text.slice(0, 200)}`);
      const wait = Number(res.headers.get("retry-after")) * 1000 || 1000 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`Jev HTTP ${res.status}: ${text.slice(0, 300)}`);
    let data: { model?: string; answers?: Record<string, unknown>; usage?: { input_tokens?: number } };
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Jev returned non-JSON: ${text.slice(0, 200)}`);
    }
    if (!data.answers) throw new Error("Jev response has no answers");
    const answers: Record<string, JevAnswer> = {};
    for (const id of Object.keys(questions)) answers[id] = validate(id, questions[id], data.answers[id]);
    return { answers, inputTokens: data.usage?.input_tokens ?? 0, ms, model: data.model ?? model };
  }
  throw lastErr ?? new Error("Jev request failed");
}
