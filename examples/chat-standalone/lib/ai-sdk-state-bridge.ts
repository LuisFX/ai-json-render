/**
 * AiSdkStateBridge — SpecStream `/state` patches → json-render StateStore.
 *
 * SpecStream paths target the Spec document (`/state/...`). This bridge
 * rewrites them into the live state model (`/alerts`, …) so a frozen Spec can
 * keep painting while AI SDK `data-spec` parts stream data.
 *
 * @see https://json-render.dev/docs/streaming
 * @see examples/chat-standalone/plans.documented/PRD.md §3a
 */

import {
  SPEC_DATA_PART_TYPE,
  applySpecStreamPatch,
  createStateStore,
  parseSpecStreamLine,
  type SpecStreamLine,
  type StateModel,
  type StateStore,
} from "@json-render/core";

export type SpecStreamPatch = SpecStreamLine;

export type AiSdkStateBridgeOptions = {
  store: StateStore;
  /** When true (default), ignore patches that are not under `/state`. */
  stateOnly?: boolean;
};

export type ApplyPatchResult = {
  applied: boolean;
  reason?: string;
};

export type ApplyPartsResult = {
  applied: number;
  skipped: number;
};

export type PushJsonlResult = {
  applied: number;
  skipped: number;
};

export type AiSdkStateBridge = {
  applyPatch: (patch: SpecStreamPatch) => ApplyPatchResult;
  applyParts: (
    parts: Array<{ type: string; data?: unknown }>,
  ) => ApplyPartsResult;
  pushJsonl: (chunk: string) => PushJsonlResult;
  getStore: () => StateStore;
};

function isStatePath(path: string): boolean {
  return path === "/state" || path.startsWith("/state/");
}

function cloneState(state: StateModel): StateModel {
  return structuredClone(state);
}

/**
 * Sync a full state model into the store by updating every top-level key that
 * changed (including keys removed from `next` → set to `undefined`).
 */
function syncStoreRoot(store: StateStore, next: StateModel): void {
  const prev = store.getSnapshot();
  const updates: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) {
    const path = `/${key}`;
    if (!(key in next)) {
      if (key in prev) updates[path] = undefined;
      continue;
    }
    if (prev[key] !== next[key]) {
      updates[path] = next[key];
    }
  }
  if (Object.keys(updates).length > 0) {
    store.update(updates);
  }
}

function extractPatch(data: unknown): SpecStreamPatch | null {
  if (data === null || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (obj.type !== "patch") return null;
  const patch = obj.patch;
  if (patch === null || typeof patch !== "object") return null;
  const p = patch as Record<string, unknown>;
  if (typeof p.op !== "string" || typeof p.path !== "string") return null;
  return patch as SpecStreamPatch;
}

export function createAiSdkStateBridge(
  options: AiSdkStateBridgeOptions,
): AiSdkStateBridge {
  const store = options.store;
  const stateOnly = options.stateOnly !== false;
  let jsonlBuffer = "";

  function applyPatch(patch: SpecStreamPatch): ApplyPatchResult {
    if (stateOnly && !isStatePath(patch.path)) {
      return { applied: false, reason: "non-state-path" };
    }
    if (!isStatePath(patch.path) && !stateOnly) {
      return { applied: false, reason: "bridge-only-handles-state" };
    }

    const scratch: { state: StateModel } = {
      state: cloneState(store.getSnapshot()),
    };
    applySpecStreamPatch(scratch, patch);
    syncStoreRoot(store, scratch.state);
    return { applied: true };
  }

  function applyParts(
    parts: Array<{ type: string; data?: unknown }>,
  ): ApplyPartsResult {
    let applied = 0;
    let skipped = 0;
    for (const part of parts) {
      if (part.type !== SPEC_DATA_PART_TYPE) {
        skipped++;
        continue;
      }
      const patch = extractPatch(part.data);
      if (!patch) {
        skipped++;
        continue;
      }
      const result = applyPatch(patch);
      if (result.applied) applied++;
      else skipped++;
    }
    return { applied, skipped };
  }

  function pushJsonl(chunk: string): PushJsonlResult {
    jsonlBuffer += chunk;
    const lines = jsonlBuffer.split("\n");
    jsonlBuffer = lines.pop() ?? "";
    let applied = 0;
    let skipped = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const patch = parseSpecStreamLine(trimmed);
      if (!patch) {
        skipped++;
        continue;
      }
      const result = applyPatch(patch);
      if (result.applied) applied++;
      else skipped++;
    }
    return { applied, skipped };
  }

  return {
    applyPatch,
    applyParts,
    pushJsonl,
    getStore: () => store,
  };
}

/** Convenience: fresh in-memory store + bridge. */
export function createAiSdkStateBridgeWithStore(
  initialState: StateModel = {},
  options?: Omit<AiSdkStateBridgeOptions, "store">,
): { bridge: AiSdkStateBridge; store: StateStore } {
  const store = createStateStore(initialState);
  return { store, bridge: createAiSdkStateBridge({ store, ...options }) };
}
