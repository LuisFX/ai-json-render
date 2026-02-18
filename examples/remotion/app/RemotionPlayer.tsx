"use client";

import { forwardRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { Renderer, type TimelineSpec } from "@json-render/remotion";

interface RemotionPlayerProps {
  spec: Required<TimelineSpec>;
}

export const RemotionPlayer = forwardRef<PlayerRef, RemotionPlayerProps>(
  function RemotionPlayer({ spec }, ref) {
    return (
      <Player
        ref={ref}
        component={Renderer}
        inputProps={{ spec }}
        durationInFrames={spec.composition.durationInFrames}
        fps={spec.composition.fps}
        compositionWidth={spec.composition.width}
        compositionHeight={spec.composition.height}
        style={{ width: "100%", height: "100%" }}
        controls
        loop
        acknowledgeRemotionLicense
      />
    );
  },
);
