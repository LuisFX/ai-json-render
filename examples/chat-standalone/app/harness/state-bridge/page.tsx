"use client";

import { useMemo, useState, type ReactNode } from "react";
import { createStateStore, type Spec } from "@json-render/core";
import { ExplorerRenderer } from "@/lib/render/renderer";
import { createAiSdkStateBridge } from "@/lib/ai-sdk-state-bridge";
import { ThemeToggle } from "@/components/theme-toggle";
import highSeveritySpec from "@/fixtures/high-severity-clinical-history-review/trace-conv_jMMi0kX3a6oclD2A-spec.json";
import statePartsFixture from "@/fixtures/state-bridge/high-severity-state-parts.json";

/**
 * Lab harness (ASB-004): paint a frozen Spec with StateProvider store=
 * fed by AiSdkStateBridge. Layout stays frozen while /state patches fill the store.
 *
 * Route: /harness/state-bridge
 */

type PartsFixture = {
  parts: Array<{ type: string; data?: unknown }>;
};

export default function StateBridgeHarnessPage(): ReactNode {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [status, setStatus] = useState<string>("Load a frozen Spec to begin.");
  const [elementKeyCount, setElementKeyCount] = useState(0);
  const [tick, setTick] = useState(0);

  const store = useMemo(() => createStateStore({}), []);
  const bridge = useMemo(() => createAiSdkStateBridge({ store }), [store]);

  function loadBuiltIn(): void {
    const raw = highSeveritySpec as Spec;
    const { state: _drop, ...rest } = raw;
    const frozen = { ...rest, state: undefined } as Spec;
    const partsFixture = statePartsFixture as PartsFixture;

    const before = Object.keys(frozen.elements).length;
    bridge.applyParts(partsFixture.parts);
    setSpec(frozen);
    setElementKeyCount(before);
    setTick((t) => t + 1);
    setStatus(
      `Mode B harness: ${before} elements frozen; store filled from fixture /state parts.`,
    );
  }

  function applyExtraPatch(): void {
    bridge.applyPatch({
      op: "replace",
      path: "/state/headlineCounts",
      value: {
        activeConditions: 99,
        activeAlerts: 1,
        highSignalVitals: 0,
        highSignalMeds: 0,
      },
    });
    setTick((t) => t + 1);
    setStatus(
      `Patched /headlineCounts in store. Element count still ${elementKeyCount} (layout frozen).`,
    );
  }

  const snapshot = store.getSnapshot();
  void tick;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">
            State-bridge harness
          </h1>
          <p className="text-xs text-muted-foreground">{status}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-xs rounded-md border px-3 py-1.5 hover:bg-muted"
            onClick={loadBuiltIn}
          >
            Load high-severity Spec
          </button>
          <button
            type="button"
            className="text-xs rounded-md border px-3 py-1.5 hover:bg-muted disabled:opacity-40"
            disabled={!spec}
            onClick={applyExtraPatch}
          >
            Patch headlineCounts
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 p-4 max-w-6xl mx-auto">
        <div className="min-h-[480px] rounded-lg border p-3 overflow-auto">
          {spec ? (
            <ExplorerRenderer spec={spec} store={store} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No Spec loaded. Click &quot;Load high-severity Spec&quot;.
            </p>
          )}
        </div>
        <aside className="rounded-lg border p-3 text-xs space-y-2 overflow-auto max-h-[70vh]">
          <div className="font-medium">Store snapshot</div>
          <pre className="whitespace-pre-wrap break-all text-[10px] leading-relaxed opacity-80">
            {JSON.stringify(snapshot, null, 2)}
          </pre>
        </aside>
      </main>
    </div>
  );
}
