/**
 * Mode B system fragment: fill `/state` for a frozen Spec (ASB-005).
 * Does NOT include SpecStream `/root`/`/elements` layout curriculum.
 */

import type { Spec } from "@json-render/core";

import {
  mineStatePaths,
  type MinedStatePaths,
  formatStatePathBindingLine,
  normalizeStatePointer,
} from "./state-paths";
import { explorerCatalog } from "./render/catalog";

type CatalogLike = {
  data: {
    components?: Record<string, { description?: string; props?: unknown }>;
  };
  componentNames: string[];
};

export type StatePathsOnlyPromptOptions = {
  /** Defaults to explorerCatalog */
  catalog?: CatalogLike;
  /** Soft warn when Spec has no mined paths */
  allowEmpty?: boolean;
};

function componentBlurb(catalog: CatalogLike, type: string): string {
  const def = catalog.data.components?.[type];
  if (!def) return `(type ${type} — not in catalog)`;
  const desc = def.description?.trim() || "no description";
  return `${type}: ${desc}`;
}

/**
 * Build a state-fill prompt for a frozen Spec.
 * Output still uses ```spec fences with `/state` SpecStream patches only
 * so existing `pipeJsonRender` classification works.
 */
export function statePathsOnlyPrompt(
  spec: Spec,
  options: StatePathsOnlyPromptOptions = {},
): string {
  const catalog = options.catalog ?? explorerCatalog;
  const mined: MinedStatePaths = mineStatePaths(spec);
  const typesUsed = [...new Set(mined.usages.map((u) => u.type))].sort();

  const lines: string[] = [];
  lines.push(
    "You fill DATA for a FROZEN UI Spec. The layout (/root, /elements) already exists and must NOT be changed.",
  );
  lines.push("");
  lines.push("ROLE:");
  lines.push(
    "- Emit SpecStream patches that write ONLY under /state (and /state/...).",
  );
  lines.push("- Never emit /root or /elements patches.");
  lines.push("- Do not invent new component types or rearrange the tree.");
  lines.push("");
  lines.push("OUTPUT FORMAT:");
  lines.push(
    "Respond with a brief one-sentence note, then a ```spec fence containing JSONL RFC 6902 patches.",
  );
  lines.push("Every patch path MUST start with /state.");
  lines.push(
    "Stream arrays progressively when useful (initialize [], then /state/items/0, /1, …).",
  );
  lines.push("Include realistic sample data — never leave bound arrays empty.");
  lines.push("");
  lines.push("STATE MODEL (single source of truth):");
  lines.push(
    'Components bind via { "$state": "/pointer" } or { "$bindState": "/pointer" } or repeat.statePath.',
  );
  lines.push(
    "Binding pointers address the state model (no /state prefix). Patch paths write those values under /state.",
  );
  lines.push(
    "Your patches populate those pointers so the frozen UI lights up.",
  );
  lines.push("");

  if (mined.paths.length === 0) {
    lines.push(
      "WARNING: No $state / $bindState / repeat.statePath bindings were found on this Spec.",
    );
    lines.push(
      "Still emit a minimal /state object only if the user asked for seed data; otherwise ask what to fill.",
    );
  } else {
    lines.push(`MINED STATE PATHS (${mined.paths.length}):`);
    lines.push(
      "Each row lists the binding pointer AND the patch path. Never concatenate /state onto a pointer that already has it.",
    );
    for (const path of mined.paths) {
      const bind = normalizeStatePointer(path);
      const hints = mined.usages
        .filter((u) => u.path === path)
        .map((u) => `${u.type}.${u.propKey} (${u.elementKey})`);
      const unique = [...new Set(hints)].slice(0, 4);
      lines.push(`${formatStatePathBindingLine(bind)}  ← ${unique.join("; ")}`);
    }
    lines.push("");
    lines.push("COMPONENT TYPES USED (blurbs only — not a full catalog dump):");
    for (const type of typesUsed) {
      lines.push(`- ${componentBlurb(catalog, type)}`);
    }
  }

  lines.push("");
  lines.push(
    "EXAMPLE (shape only — use the mined paths above, not these names):",
  );
  lines.push("```spec");
  lines.push('{"op":"add","path":"/state/exampleTitle","value":"Sample"}');
  lines.push('{"op":"add","path":"/state/exampleItems","value":[]}');
  lines.push(
    '{"op":"add","path":"/state/exampleItems/0","value":{"id":"1","label":"First"}}',
  );
  lines.push("```");

  return lines.join("\n");
}

/** Alias matching plan naming. */
export const statePathsOnly = {
  prompt: statePathsOnlyPrompt,
};
