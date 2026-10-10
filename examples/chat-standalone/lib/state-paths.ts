/**
 * Mine JSON Pointer paths bound from a Spec (`$state`, `$bindState`, `repeat.statePath`).
 * Used by Mode B `statePathsOnly.prompt` (ASB-005).
 */

import { getByPath, type Spec } from "@json-render/core";

export type StatePathUsage = {
  path: string;
  elementKey: string;
  type: string;
  propKey: string;
};

export type MinedStatePaths = {
  paths: string[];
  usages: StatePathUsage[];
};

const TEMPLATE_REF = /\$\{([^}]+)\}/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** True when a binding pointer is wrongly rooted at `/state` instead of the state model. */
export function isStatePrefixedPointer(pointer: string): boolean {
  return pointer === "/state" || pointer.startsWith("/state/");
}

/**
 * Drop one leading `/state` segment so a spec patch path becomes a state-model pointer.
 * `/state/prices/btc` → `/prices/btc`. Already-correct pointers are unchanged.
 */
export function normalizeStatePointer(pointer: string): string {
  if (!isStatePrefixedPointer(pointer)) return pointer;
  const rest = pointer.slice("/state".length);
  return rest === "" ? "/" : rest;
}

/** Inverse of `normalizeStatePointer`: `/prices/btc` → `/state/prices/btc`. */
export function toStatePatchPath(pointer: string): string {
  const normalized = normalizeStatePointer(pointer);
  if (normalized === "/" || normalized === "") return "/state";
  return `/state${normalized}`;
}

/**
 * Use the stripped form only when the prefixed pointer misses in `state`
 * and the stripped pointer resolves. Otherwise keep the original.
 */
export function verifiedBindingPointer(
  pointer: string,
  state: unknown,
): string {
  if (!isStatePrefixedPointer(pointer)) return pointer;
  const stripped = normalizeStatePointer(pointer);
  const prefixedMisses = getByPath(state ?? {}, pointer) === undefined;
  const strippedHits = getByPath(state ?? {}, stripped) !== undefined;
  if (prefixedMisses && strippedHits) return stripped;
  return pointer;
}

export function formatStatePathBindingLine(bindPointer: string): string {
  const write = toStatePatchPath(bindPointer);
  return `- bind { "$state": "${bindPointer}" }   write {"op":"add","path":"${write}",...}`;
}

function collectFromValue(
  value: unknown,
  ctx: { elementKey: string; type: string; propKey: string },
  usages: StatePathUsage[],
  seen: Set<string>,
): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectFromValue(item, ctx, usages, seen);
    }
    return;
  }
  if (!isRecord(value)) return;

  if (typeof value.$state === "string") {
    const path = value.$state;
    usages.push({ ...ctx, path });
    seen.add(path);
  }
  if (typeof value.$bindState === "string") {
    const path = value.$bindState;
    usages.push({ ...ctx, path });
    seen.add(path);
  }

  for (const [k, v] of Object.entries(value)) {
    if (k === "$state" || k === "$bindState") continue;
    collectFromValue(v, { ...ctx, propKey: ctx.propKey || k }, usages, seen);
  }
}

/**
 * Walk Spec elements for state bindings.
 * Checks props (deep), `visible`, `on` / action params, and `repeat.statePath`.
 */
export function mineStatePaths(spec: Spec): MinedStatePaths {
  const usages: StatePathUsage[] = [];
  const seen = new Set<string>();

  for (const [elementKey, element] of Object.entries(spec.elements)) {
    if (!isRecord(element)) continue;
    const type = typeof element.type === "string" ? element.type : "Unknown";
    const base = { elementKey, type };

    if (isRecord(element.props)) {
      for (const [propKey, propVal] of Object.entries(element.props)) {
        collectFromValue(propVal, { ...base, propKey }, usages, seen);
      }
    }

    if (element.visible !== undefined) {
      collectFromValue(
        element.visible,
        { ...base, propKey: "visible" },
        usages,
        seen,
      );
    }

    if (element.on !== undefined) {
      collectFromValue(element.on, { ...base, propKey: "on" }, usages, seen);
    }

    if (
      isRecord(element.repeat) &&
      typeof element.repeat.statePath === "string"
    ) {
      const path = element.repeat.statePath;
      usages.push({ ...base, propKey: "repeat.statePath", path });
      seen.add(path);
    }
  }

  const paths = [...seen].sort();
  return { paths, usages };
}

function collectTemplateFromValue(
  value: unknown,
  ctx: { elementKey: string; type: string; propKey: string },
  usages: StatePathUsage[],
  seen: Set<string>,
): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectTemplateFromValue(item, ctx, usages, seen);
    }
    return;
  }
  if (!isRecord(value)) return;

  if (typeof value.$template === "string") {
    TEMPLATE_REF.lastIndex = 0;
    for (const match of value.$template.matchAll(TEMPLATE_REF)) {
      const raw = match[1];
      if (typeof raw === "string" && raw.startsWith("/")) {
        usages.push({ ...ctx, path: raw });
        seen.add(raw);
      }
    }
  }

  for (const [k, v] of Object.entries(value)) {
    if (k === "$template") continue;
    collectTemplateFromValue(
      v,
      { ...ctx, propKey: ctx.propKey || k },
      usages,
      seen,
    );
  }
}

/**
 * Mine absolute `${/path}` refs inside `$template` strings.
 * Separate from `mineStatePaths` so upload validation stays faithful.
 */
export function mineTemplatePointers(spec: Spec): MinedStatePaths {
  const usages: StatePathUsage[] = [];
  const seen = new Set<string>();

  for (const [elementKey, element] of Object.entries(spec.elements ?? {})) {
    if (!isRecord(element)) continue;
    const type = typeof element.type === "string" ? element.type : "Unknown";
    const base = { elementKey, type };

    if (isRecord(element.props)) {
      for (const [propKey, propVal] of Object.entries(element.props)) {
        collectTemplateFromValue(propVal, { ...base, propKey }, usages, seen);
      }
    }
  }

  const paths = [...seen].sort();
  return { paths, usages };
}
