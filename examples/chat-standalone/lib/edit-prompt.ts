import {
  buildEditUserPrompt,
  isNonEmptySpec,
  type Spec,
} from "@json-render/core";
import type { ModelMessage } from "ai";

import { EDIT_MODES } from "@/lib/generation-mode";
import {
  formatStatePathBindingLine,
  mineStatePaths,
  mineTemplatePointers,
  verifiedBindingPointer,
} from "@/lib/state-paths";

const CURRENT_UI_MARKER = "CURRENT UI STATE";

export function layoutOnlySpec(spec: Spec): Spec {
  return {
    root: spec.root,
    elements: spec.elements,
  };
}

export function buildStandaloneEditUserPrompt(
  prompt: string,
  currentSpec: Spec,
): string {
  const layout = layoutOnlySpec(currentSpec);
  const base = buildEditUserPrompt({
    prompt,
    currentSpec: layout,
    config: { modes: [...EDIT_MODES] },
    format: "json",
  });

  const mined = mineStatePaths(currentSpec);
  const templates = mineTemplatePointers(currentSpec);
  const paths = [...new Set([...mined.paths, ...templates.paths])].sort();
  if (paths.length === 0) return base;

  const lines = paths.map((path) => {
    const bind = verifiedBindingPointer(path, currentSpec.state);
    return formatStatePathBindingLine(bind);
  });

  return `${base}

EXISTING STATE PATHS (values omitted):
${lines.join("\n")}`;
}

function extractMessageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const texts: string[] = [];
  for (const part of content) {
    if (
      part &&
      typeof part === "object" &&
      "type" in part &&
      part.type === "text" &&
      "text" in part &&
      typeof part.text === "string"
    ) {
      texts.push(part.text);
    }
  }
  return texts.join("\n");
}

export function parseCurrentSpec(value: unknown): Spec | undefined {
  if (!isNonEmptySpec(value)) return undefined;
  return value;
}

/**
 * Rewrite only the last user ModelMessage so the model sees the current spec.
 * Skips if the message is already an edit prompt (tool-loop steps).
 */
export function rewriteLastUserModelMessage(
  messages: ModelMessage[],
  currentSpec: Spec | undefined,
): ModelMessage[] {
  if (!currentSpec || messages.length === 0) return messages;
  let lastUser = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") {
      lastUser = i;
      break;
    }
  }
  if (lastUser < 0) return messages;

  const original = extractMessageText(messages[lastUser]!.content);
  if (!original.trim() || original.includes(CURRENT_UI_MARKER)) {
    return messages;
  }

  const nextText = buildStandaloneEditUserPrompt(original, currentSpec);
  const next = messages.slice();
  next[lastUser] = { role: "user", content: nextText };
  return next;
}
