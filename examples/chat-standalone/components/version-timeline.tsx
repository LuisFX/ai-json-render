"use client";

import { cn } from "@/lib/utils";
import { formatPatchSummary, type SpecTurn } from "@/lib/spec-timeline";

type VersionTimelineProps = {
  turns: SpecTurn[];
  selectedVersion: number | null;
  continueFromVersion: number | null;
  onSelect: (version: number) => void;
  onContinueFrom: (version: number) => void;
};

export function VersionTimeline({
  turns,
  selectedVersion,
  continueFromVersion,
  onSelect,
  onContinueFrom,
}: VersionTimelineProps) {
  if (turns.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
      {turns.map((turn) => {
        const selected = selectedVersion === turn.version;
        const continueFrom = continueFromVersion === turn.version;
        const label = formatPatchSummary(turn.summary);
        return (
          <div key={turn.version} className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              title={`v${turn.version}: ${label}${turn.prompt ? ` — ${turn.prompt}` : ""}`}
              onClick={() => onSelect(turn.version)}
              className={cn(
                "h-7 rounded-full border px-2.5 text-xs transition-colors",
                selected
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              v{turn.version}
            </button>
            {selected && (
              <button
                type="button"
                title="Send this Spec as the baseline for the next edit"
                onClick={() => onContinueFrom(turn.version)}
                className={cn(
                  "h-7 rounded-full border px-2 text-[10px] transition-colors",
                  continueFrom
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {continueFrom ? "Continuing" : "Continue from this"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
