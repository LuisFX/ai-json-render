/**
 * Lab harness helpers — frozen Spec + AiSdkStateBridge → StateStore.
 * Used by `/harness/state-bridge` and unit tests (ASB-004).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Spec, StateModel, StateStore } from "@json-render/core";
import { createStateStore } from "@json-render/core";

import {
  createAiSdkStateBridge,
  type AiSdkStateBridge,
} from "./ai-sdk-state-bridge";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesRoot = join(here, "../fixtures");

export const HIGH_SEVERITY_SPEC_PATH = join(
  fixturesRoot,
  "high-severity-clinical-history-review/trace-conv_jMMi0kX3a6oclD2A-spec.json",
);

export const STATE_BRIDGE_PARTS_PATH = join(
  fixturesRoot,
  "state-bridge/high-severity-state-parts.json",
);

export function loadHighSeveritySpec(): Spec {
  return JSON.parse(readFileSync(HIGH_SEVERITY_SPEC_PATH, "utf8")) as Spec;
}

/** Frozen Spec without seed state — refill via bridge. */
export function loadFrozenSpecWithoutState(): Spec {
  const spec = loadHighSeveritySpec();
  const { state: _drop, ...rest } = spec as Spec & { state?: StateModel };
  return { ...rest, state: undefined } as Spec;
}

export function loadStateBridgeParts(): Array<{
  type: string;
  data?: unknown;
}> {
  const fixture = JSON.parse(readFileSync(STATE_BRIDGE_PARTS_PATH, "utf8")) as {
    parts: Array<{ type: string; data?: unknown }>;
  };
  return fixture.parts;
}

export type StateBridgeHarness = {
  spec: Spec;
  store: StateStore;
  bridge: AiSdkStateBridge;
  /** Element keys before any bridge apply (layout fingerprint). */
  elementKeysBefore: string[];
};

/**
 * Create store + bridge, apply fixture `/state` parts, return frozen Spec
 * (no seed state) ready for `ExplorerRenderer store={store}`.
 */
export function createStateBridgeHarness(
  initialState: StateModel = {},
): StateBridgeHarness {
  const frozen = loadFrozenSpecWithoutState();
  const elementKeysBefore = Object.keys(frozen.elements).sort();
  const store = createStateStore(initialState);
  const bridge = createAiSdkStateBridge({ store });
  bridge.applyParts(loadStateBridgeParts());
  return { spec: frozen, store, bridge, elementKeysBefore };
}

export function elementKeysOf(spec: Spec): string[] {
  return Object.keys(spec.elements).sort();
}
