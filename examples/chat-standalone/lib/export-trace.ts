import type { Spec } from "@json-render/core";
import type { UIMessage } from "ai";

import { foldSpecTimeline } from "@/lib/spec-timeline";

import type { ConversationEnvelope } from "@/lib/conversation/store-schema";

export type SpecVersion = {
  /** 1-based appearance order in the conversation. */
  version: number;
  messageId: string;
  spec: Spec;
  /** Short label for the picker (Heading/Text props or root id). */
  preview: string;
};

export type ExportTraceOptions = {
  /** 1-based Spec version from `listSpecVersions`. */
  version?: number;
  /** Explicit Spec override (e.g. Mode B frozen Spec). */
  spec?: Spec;
  /** Filename label: frozen → `…-frozen-spec.json`; otherwise `…-v{k}-spec.json`. */
  label?: "frozen";
};

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function previewFromSpec(spec: Spec): string {
  const elements = spec.elements ?? {};
  for (const el of Object.values(elements)) {
    if (!el || typeof el !== "object") continue;
    const type = (el as { type?: string }).type;
    const props = (el as { props?: Record<string, unknown> }).props ?? {};
    if (type === "Heading" || type === "Text") {
      const text = props.text ?? props.children ?? props.title;
      if (typeof text === "string" && text.trim()) {
        return text.trim().slice(0, 80);
      }
    }
  }
  if (typeof spec.root === "string" && spec.root.trim()) {
    return `root: ${spec.root}`;
  }
  const keys = Object.keys(elements);
  if (keys.length > 0) return `${keys.length} elements`;
  return "Spec";
}

/** Cumulative Spec versions (patch-aware). `/state`-only turns still count. */
export function listSpecVersions(messages: UIMessage[]): SpecVersion[] {
  return foldSpecTimeline(messages).map((turn) => ({
    version: turn.version,
    messageId: turn.messageId,
    spec: turn.spec,
    preview: previewFromSpec(turn.spec),
  }));
}

function resolveExportSpec(
  envelope: ConversationEnvelope,
  opts?: ExportTraceOptions,
): {
  spec: Spec | null;
  version: number | null;
  label: "frozen" | "version" | null;
} {
  if (opts?.spec) {
    return {
      spec: opts.spec,
      version: opts.label === "frozen" ? null : (opts.version ?? null),
      label: opts.label === "frozen" ? "frozen" : "version",
    };
  }

  const versions = listSpecVersions(envelope.messages as UIMessage[]);
  if (versions.length === 0) {
    return { spec: null, version: null, label: null };
  }

  const version = opts?.version ?? versions[versions.length - 1]!.version;
  const match = versions.find((v) => v.version === version);
  if (!match) {
    return { spec: null, version: null, label: null };
  }
  return { spec: match.spec, version: match.version, label: "version" };
}

function specFilename(
  conversationId: string,
  resolved: ReturnType<typeof resolveExportSpec>,
): string | null {
  if (!resolved.spec) return null;
  if (resolved.label === "frozen") {
    return `trace-${conversationId}-frozen-spec.json`;
  }
  if (resolved.version != null) {
    return `trace-${conversationId}-v${resolved.version}-spec.json`;
  }
  return `trace-${conversationId}-spec.json`;
}

/**
 * Export Meridian-aligned envelope + chosen Spec (browser download + fixtures/).
 * Without opts, picks the latest layout Spec (vN) when any exist.
 */
export async function exportConversationTrace(
  envelope: ConversationEnvelope,
  opts?: ExportTraceOptions,
): Promise<{ ok: boolean; hasSpec: boolean; version: number | null }> {
  const resolved = resolveExportSpec(envelope, opts);
  const filename = specFilename(envelope.id, resolved);

  downloadJson(`trace-${envelope.id}-envelope.json`, envelope);
  if (resolved.spec && filename) {
    downloadJson(filename, resolved.spec);
  }

  await fetch("/api/fixtures/dump", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: envelope.id,
      envelope,
      spec: resolved.spec,
      specVersion: resolved.version,
      specFilename: filename,
    }),
  });

  return {
    ok: true,
    hasSpec: resolved.spec != null,
    version: resolved.version,
  };
}
