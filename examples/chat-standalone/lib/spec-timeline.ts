import {
  SPEC_DATA_PART_TYPE,
  applySpecPatch,
  type Spec,
  type SpecStreamLine,
} from "@json-render/core";
import type { UIMessage } from "ai";

export type PatchSummary = {
  added: string[];
  removed: string[];
  replaced: string[];
  stateTouched: string[];
};

export type SpecTurn = {
  /** 1-based appearance order in the conversation. */
  version: number;
  messageId: string;
  /** Cumulative spec after applying this turn's patches on top of prior turns. */
  spec: Spec;
  /** Just this turn's RFC 6902 ops. */
  patches: SpecStreamLine[];
  summary: PatchSummary;
  /** User text that produced this turn. */
  prompt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPatchOp(value: unknown): value is SpecStreamLine {
  if (!isRecord(value)) return false;
  return typeof value.op === "string" && typeof value.path === "string";
}

function textFromParts(parts: UIMessage["parts"] | undefined): string {
  const texts: string[] = [];
  for (const part of parts ?? []) {
    if (
      part.type === "text" &&
      "text" in part &&
      typeof part.text === "string"
    ) {
      texts.push(part.text);
    }
  }
  return texts.join("\n").trim();
}

function lastUserPrompt(messages: UIMessage[], beforeIndex: number): string {
  for (let i = beforeIndex - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role === "user") return textFromParts(msg.parts);
  }
  return "";
}

function elementKeyFromPath(path: string): string | null {
  if (!path.startsWith("/elements/")) return null;
  const key = path.slice("/elements/".length).split("/")[0];
  return key || null;
}

export function summarizePatches(patches: SpecStreamLine[]): PatchSummary {
  const added = new Set<string>();
  const removed = new Set<string>();
  const replaced = new Set<string>();
  const stateTouched = new Set<string>();

  for (const patch of patches) {
    const path = patch.path ?? "";
    if (path === "/root" || path.startsWith("/root/")) {
      continue;
    }
    if (path === "/state" || path.startsWith("/state/")) {
      stateTouched.add(path);
      continue;
    }
    const key = elementKeyFromPath(path);
    if (!key) continue;
    const isElementRoot = path === `/elements/${key}`;
    if (patch.op === "add" && isElementRoot) {
      added.add(key);
      removed.delete(key);
      continue;
    }
    if (patch.op === "remove" && isElementRoot) {
      removed.add(key);
      added.delete(key);
      replaced.delete(key);
      continue;
    }
    replaced.add(key);
  }

  return {
    added: [...added],
    removed: [...removed],
    replaced: [...replaced],
    stateTouched: [...stateTouched],
  };
}

export function formatPatchSummary(summary: PatchSummary): string {
  const parts: string[] = [];
  if (summary.added.length === 1) parts.push("1 element added");
  else if (summary.added.length > 1) {
    parts.push(`${summary.added.length} elements added`);
  }
  if (summary.removed.length === 1) parts.push("1 element removed");
  else if (summary.removed.length > 1) {
    parts.push(`${summary.removed.length} elements removed`);
  }
  if (summary.replaced.length === 1) parts.push("1 replaced");
  else if (summary.replaced.length > 1) {
    parts.push(`${summary.replaced.length} replaced`);
  }
  if (summary.stateTouched.length === 1) parts.push("1 state path");
  else if (summary.stateTouched.length > 1) {
    parts.push(`${summary.stateTouched.length} state paths`);
  }
  return parts.join(", ") || "no structural changes";
}

export function patchesFromParts(
  parts: UIMessage["parts"] | undefined,
): SpecStreamLine[] {
  const patches: SpecStreamLine[] = [];
  for (const part of parts ?? []) {
    if (part.type !== SPEC_DATA_PART_TYPE) continue;
    const data = "data" in part ? part.data : undefined;
    if (!isRecord(data)) continue;
    if (data.type === "patch" && isPatchOp(data.patch)) {
      patches.push(data.patch);
    }
  }
  return patches;
}

function ensureRoot(spec: Spec): void {
  if (typeof spec.root === "string" && spec.elements[spec.root]) return;
  if (spec.elements.main) {
    spec.root = "main";
    return;
  }
  const keys = Object.keys(spec.elements);
  if (keys.length === 0) return;
  const referenced = new Set<string>();
  for (const el of Object.values(spec.elements)) {
    const children = (el as { children?: unknown }).children;
    if (!Array.isArray(children)) continue;
    for (const child of children) {
      if (typeof child === "string") referenced.add(child);
    }
  }
  spec.root = keys.find((key) => !referenced.has(key)) ?? keys[0]!;
}

function applyFlatOrNested(
  spec: Spec,
  parts: UIMessage["parts"] | undefined,
): boolean {
  let applied = false;
  for (const part of parts ?? []) {
    if (part.type !== SPEC_DATA_PART_TYPE) continue;
    const data = "data" in part ? part.data : undefined;
    if (!isRecord(data)) continue;
    if (
      (data.type === "flat" || data.type === "nested") &&
      isRecord(data.spec)
    ) {
      const incoming = data.spec as Partial<Spec>;
      if (typeof incoming.root === "string") spec.root = incoming.root;
      if (incoming.elements && typeof incoming.elements === "object") {
        spec.elements = { ...spec.elements, ...incoming.elements };
      }
      if (incoming.state && typeof incoming.state === "object") {
        spec.state = { ...(spec.state ?? {}), ...incoming.state };
      }
      applied = true;
    }
  }
  return applied;
}

/**
 * Fold assistant `data-spec` patches across the conversation into cumulative
 * Spec versions. Unlike `listSpecVersions`, this does not restart from an
 * empty spec per message, and `/state`-only turns still create a version.
 */
export function foldSpecTimeline(messages: UIMessage[]): SpecTurn[] {
  const turns: SpecTurn[] = [];
  const spec: Spec = { root: "", elements: {} };

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]!;
    if (message.role !== "assistant") continue;

    const hasSpecPart = (message.parts ?? []).some(
      (part) => part.type === SPEC_DATA_PART_TYPE,
    );
    if (!hasSpecPart) continue;

    const patches = patchesFromParts(message.parts);
    for (const patch of patches) {
      try {
        applySpecPatch(spec, patch);
      } catch {
        // Ignore malformed / test-failing ops so a bad line does not drop the timeline.
      }
    }
    applyFlatOrNested(spec, message.parts);
    ensureRoot(spec);

    turns.push({
      version: turns.length + 1,
      messageId: message.id,
      spec: structuredClone(spec),
      patches,
      summary: summarizePatches(patches),
      prompt: lastUserPrompt(messages, i),
    });
  }

  return turns;
}

export function latestSpec(messages: UIMessage[]): Spec | undefined {
  return foldSpecTimeline(messages).at(-1)?.spec;
}
