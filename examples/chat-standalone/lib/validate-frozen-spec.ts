/**
 * Validate a client-uploaded frozen Spec for Mode B (ASB-006).
 */

import type { Spec } from "@json-render/core";

import { mineStatePaths } from "./state-paths";

export type FrozenSpecValidation =
  | {
      ok: true;
      spec: Spec;
      warnings: string[];
    }
  | {
      ok: false;
      error: string;
    };

export function validateFrozenSpec(raw: unknown): FrozenSpecValidation {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Spec must be a JSON object" };
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.root !== "string" || !obj.root.trim()) {
    return { ok: false, error: "Spec.root must be a non-empty string" };
  }
  if (
    obj.elements === null ||
    typeof obj.elements !== "object" ||
    Array.isArray(obj.elements)
  ) {
    return { ok: false, error: "Spec.elements must be an object" };
  }
  const elements = obj.elements as Record<string, unknown>;
  if (Object.keys(elements).length === 0) {
    return { ok: false, error: "Spec.elements must be non-empty" };
  }
  if (!(obj.root in elements)) {
    return {
      ok: false,
      error: `Spec.root "${obj.root}" is missing from elements`,
    };
  }

  // Strip seed state — Mode B refills via bridge
  const { state: _drop, ...rest } = obj;
  const spec = { ...rest, state: undefined } as Spec;
  const warnings: string[] = [];
  const mined = mineStatePaths(spec);
  if (mined.paths.length === 0) {
    warnings.push(
      "No $state / $bindState / repeat.statePath bindings found — state-fill may have nothing to target.",
    );
  }
  return { ok: true, spec, warnings };
}
