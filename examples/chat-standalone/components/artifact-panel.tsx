"use client";

import { Copy, Download } from "lucide-react";
import type { Spec, StateStore } from "@json-render/core";
import { toast } from "sonner";

import { ExplorerRenderer } from "@/lib/render/renderer";
import { formatPatchSummary, type SpecTurn } from "@/lib/spec-timeline";
import { VersionTimeline } from "@/components/version-timeline";

type ArtifactPanelProps = {
  turns: SpecTurn[];
  selectedVersion: number | null;
  continueFromVersion: number | null;
  onSelectVersion: (version: number) => void;
  onContinueFrom: (version: number) => void;
  frozenSpec?: Spec | null;
  store?: StateStore;
  loading?: boolean;
  onExport: () => void;
};

export function ArtifactPanel({
  turns,
  selectedVersion,
  continueFromVersion,
  onSelectVersion,
  onContinueFrom,
  frozenSpec,
  store,
  loading,
  onExport,
}: ArtifactPanelProps) {
  const selected =
    turns.find((t) => t.version === selectedVersion) ?? turns.at(-1) ?? null;
  const spec = frozenSpec ?? selected?.spec ?? null;
  const elementCount = spec ? Object.keys(spec.elements ?? {}).length : 0;
  const isFrozen = frozenSpec != null;

  const handleCopy = async () => {
    if (!spec) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
      toast.success("Copied Spec JSON");
    } catch {
      toast.error("Could not copy Spec");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 flex-col gap-2 border-b px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-medium text-foreground">
              {isFrozen
                ? "Frozen Spec (Mode B)"
                : selected
                  ? `Version ${selected.version}`
                  : "Artifact"}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {isFrozen
                ? "Layout frozen · store-driven state fill"
                : selected
                  ? `${elementCount} elements · ${formatPatchSummary(selected.summary)}`
                  : "Prompt to generate a UI"}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={!spec}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
              title="Copy Spec JSON"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
            <button
              type="button"
              onClick={onExport}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Export envelope + Spec"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </div>
        {!isFrozen && (
          <VersionTimeline
            turns={turns}
            selectedVersion={selectedVersion}
            continueFromVersion={continueFromVersion}
            onSelect={onSelectVersion}
            onContinueFrom={onContinueFrom}
          />
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {spec ? (
          <ExplorerRenderer
            spec={spec}
            store={isFrozen ? store : undefined}
            loading={loading}
            stateKey={isFrozen ? "frozen" : `v${selected?.version ?? 0}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Generated UI will appear here.
          </div>
        )}
      </div>
    </div>
  );
}
