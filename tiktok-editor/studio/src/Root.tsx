import React from "react";
import { Composition } from "remotion";
import { Main } from "./Main";
import type { Storyboard } from "./types";

const empty: Storyboard = { style: "wesbuilt", duration: 3, video: "cut.mp4", words: [], beats: [] };

export const Root: React.FC = () => (
  <Composition
    id="Main"
    component={Main as unknown as React.FC<Record<string, unknown>>}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={90}
    defaultProps={empty as unknown as Record<string, unknown>}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(1, Math.round(((props as unknown as Storyboard).duration ?? 3) * 30)),
    })}
  />
);
