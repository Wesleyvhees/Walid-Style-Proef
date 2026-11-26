import { interpolate, spring } from "remotion";

export const FPS = 30;

// 0 -> 1 vanaf `atSec`, met een zachte veer.
export const enter = (frame: number, atSec: number, fps = FPS, damping = 18) =>
  spring({ frame: frame - Math.round(atSec * fps), fps, config: { damping, mass: 0.6, stiffness: 140 } });

// 1 -> 0 vlak voor `endSec`.
export const exit = (frame: number, endSec: number, fps = FPS, dur = 0.18) =>
  interpolate(frame / fps, [endSec - dur, endSec], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
