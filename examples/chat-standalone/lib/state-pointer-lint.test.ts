import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applySpecPatch,
  type Spec,
  type SpecStreamLine,
} from "@json-render/core";

import { findMisprefixedStatePointers } from "./state-pointer-lint";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

function foldPatchesFromEnvelope(path: string): Spec {
  const envelope = JSON.parse(readFileSync(path, "utf8")) as {
    messages: Array<{
      role: string;
      parts?: Array<{
        type: string;
        data?: { type?: string; patch?: SpecStreamLine };
      }>;
    }>;
  };
  const spec: Spec = { root: "", elements: {} };
  for (const message of envelope.messages) {
    if (message.role !== "assistant") continue;
    for (const part of message.parts ?? []) {
      if (part.type !== "data-spec") continue;
      const data = part.data;
      if (data?.type === "patch" && data.patch) {
        try {
          applySpecPatch(spec, data.patch);
        } catch {
          // ignore malformed ops, matching foldSpecTimeline
        }
      }
    }
  }
  return spec;
}

describe("findMisprefixedStatePointers", () => {
  test("clinical fixture has zero misprefixed pointers", () => {
    const spec = JSON.parse(
      readFileSync(
        join(
          fixtures,
          "high-severity-clinical-history-review/trace-conv_jMMi0kX3a6oclD2A-spec.json",
        ),
        "utf8",
      ),
    ) as Spec;
    expect(findMisprefixedStatePointers(spec)).toEqual([]);
  });

  test("crypto envelope fold has 15 misprefixed $state pointers", () => {
    const spec = foldPatchesFromEnvelope(
      join(
        fixtures,
        "standalone-version-export/coins-trace-conv_eogNonGb2w4DcJQM-envelope.json",
      ),
    );
    const findings = findMisprefixedStatePointers(spec);
    expect(findings).toHaveLength(15);
    expect(new Set(findings.map((f) => f.kind))).toEqual(new Set(["$state"]));
    expect(findings.every((f) => f.pointer.startsWith("/state/"))).toBe(true);
    expect(findings.every((f) => !f.suggested.startsWith("/state"))).toBe(true);
  });

  test("covers $state, $bindState, repeat.statePath, and $template", () => {
    const spec = {
      root: "main",
      elements: {
        price: {
          type: "Metric",
          props: { value: { $state: "/state/prices/btc" } },
          children: [],
        },
        input: {
          type: "TextInput",
          props: { value: { $bindState: "/state/draft" } },
          children: [],
        },
        list: {
          type: "Stack",
          props: {},
          repeat: { statePath: "/state/items" },
          children: ["row"],
        },
        label: {
          type: "Text",
          props: { text: { $template: "$${/state/prices/btc}" } },
          children: [],
        },
      },
    } as Spec;

    const findings = findMisprefixedStatePointers(spec);
    const kinds = new Set(findings.map((f) => f.kind));
    expect(kinds).toEqual(
      new Set(["$state", "$bindState", "repeat.statePath", "$template"]),
    );
    expect(findings).toHaveLength(4);
    expect(findings.find((f) => f.kind === "$state")?.suggested).toBe(
      "/prices/btc",
    );
    expect(findings.find((f) => f.kind === "$bindState")?.suggested).toBe(
      "/draft",
    );
    expect(findings.find((f) => f.kind === "repeat.statePath")?.suggested).toBe(
      "/items",
    );
    expect(findings.find((f) => f.kind === "$template")?.suggested).toBe(
      "/prices/btc",
    );
  });
});
