"use client";

import { useEffect, type ReactNode } from "react";
import {
  useDefaultLayout,
  usePanelRef,
  type LayoutStorage,
} from "react-resizable-panels";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useMediaQuery } from "@/lib/use-media-query";

const LAYOUT_ID = "chat-standalone-artifact";

const ssrSafeStorage: LayoutStorage = {
  getItem(key) {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore quota / private mode
    }
  },
};

type ChatSplitProps = {
  hasArtifact: boolean;
  transcript: ReactNode;
  artifact: ReactNode;
};

export function ChatSplit({
  hasArtifact,
  transcript,
  artifact,
}: ChatSplitProps) {
  const isMd = useMediaQuery("(min-width: 768px)", true);
  const artifactRef = usePanelRef();
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: LAYOUT_ID,
    panelIds: ["transcript", "artifact"],
    storage: ssrSafeStorage,
  });

  useEffect(() => {
    const panel = artifactRef.current;
    if (!panel) return;
    if (hasArtifact) {
      if (panel.isCollapsed()) panel.expand();
    } else if (!panel.isCollapsed()) {
      panel.collapse();
    }
  }, [hasArtifact, artifactRef]);

  return (
    <ResizablePanelGroup
      id={LAYOUT_ID}
      orientation={isMd ? "horizontal" : "vertical"}
      className="min-h-0 flex-1"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
    >
      <ResizablePanel
        id="transcript"
        defaultSize="40"
        minSize="28"
        className="min-h-0"
      >
        {transcript}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        id="artifact"
        panelRef={artifactRef}
        defaultSize="60"
        minSize="30"
        collapsible
        collapsedSize="0"
        className="min-h-0"
      >
        {artifact}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
