/**
 * Detect binding pointers wrongly prefixed with `/state`.
 * Detection only — does not rewrite the spec.
 */

import type { Spec } from "@json-render/core";

import { isStatePrefixedPointer, normalizeStatePointer } from "./state-paths";

export type PointerKind =
  | "$state"
  | "$bindState"
  | "repeat.statePath"
  | "$template";

export type MisprefixedPointer = {
  pointer: string;
  suggested: string;
  elementKey: string;
  kind: PointerKind;
};

const TEMPLATE_REF = /\$\{([^}]+)\}/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function addFinding(
  findings: MisprefixedPointer[],
  seen: Set<string>,
  pointer: string,
  elementKey: string,
  kind: PointerKind,
): void {
  if (!isStatePrefixedPointer(pointer)) return;
  const key = `${elementKey}\0${kind}\0${pointer}`;
  if (seen.has(key)) return;
  seen.add(key);
  findings.push({
    pointer,
    suggested: normalizeStatePointer(pointer),
    elementKey,
    kind,
  });
}

function walkValue(
  value: unknown,
  elementKey: string,
  findings: MisprefixedPointer[],
  seen: Set<string>,
): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      walkValue(item, elementKey, findings, seen);
    }
    return;
  }
  if (!isRecord(value)) return;

  if (typeof value.$state === "string") {
    addFinding(findings, seen, value.$state, elementKey, "$state");
  }
  if (typeof value.$bindState === "string") {
    addFinding(findings, seen, value.$bindState, elementKey, "$bindState");
  }
  if (typeof value.$template === "string") {
    TEMPLATE_REF.lastIndex = 0;
    for (const match of value.$template.matchAll(TEMPLATE_REF)) {
      const raw = match[1];
      if (typeof raw === "string" && raw.startsWith("/")) {
        addFinding(findings, seen, raw, elementKey, "$template");
      }
    }
  }

  for (const [k, v] of Object.entries(value)) {
    if (k === "$state" || k === "$bindState" || k === "$template") continue;
    walkValue(v, elementKey, findings, seen);
  }
}

export function findMisprefixedStatePointers(spec: Spec): MisprefixedPointer[] {
  const findings: MisprefixedPointer[] = [];
  const seen = new Set<string>();

  for (const [elementKey, element] of Object.entries(spec.elements ?? {})) {
    if (!isRecord(element)) continue;

    if (isRecord(element.props)) {
      walkValue(element.props, elementKey, findings, seen);
    }
    if (element.visible !== undefined) {
      walkValue(element.visible, elementKey, findings, seen);
    }
    if (element.on !== undefined) {
      walkValue(element.on, elementKey, findings, seen);
    }
    if (
      isRecord(element.repeat) &&
      typeof element.repeat.statePath === "string"
    ) {
      addFinding(
        findings,
        seen,
        element.repeat.statePath,
        elementKey,
        "repeat.statePath",
      );
    }
  }

  return findings;
}
