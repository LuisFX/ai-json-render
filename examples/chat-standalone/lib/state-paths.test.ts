import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Spec } from "@json-render/core";

import {
  mineStatePaths,
  mineTemplatePointers,
  normalizeStatePointer,
  toStatePatchPath,
  verifiedBindingPointer,
} from "./state-paths";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

describe("mineStatePaths", () => {
  test("high-severity Spec covers known $state bindings", () => {
    const spec = JSON.parse(
      readFileSync(
        join(
          fixtures,
          "high-severity-clinical-history-review/trace-conv_jMMi0kX3a6oclD2A-spec.json",
        ),
        "utf8",
      ),
    ) as Spec;

    const { paths } = mineStatePaths(spec);
    for (const required of [
      "/alerts",
      "/headlineCounts/activeConditions",
      "/vitalTrend",
      "/labs",
      "/severityBarData",
    ]) {
      expect(paths).toContain(required);
    }
    expect(paths.length).toBeGreaterThanOrEqual(13);
  });

  test("normalizeStatePointer drops one /state segment", () => {
    expect(normalizeStatePointer("/state/prices/bitcoin/price")).toBe(
      "/prices/bitcoin/price",
    );
    expect(normalizeStatePointer("/prices/bitcoin/price")).toBe(
      "/prices/bitcoin/price",
    );
    expect(normalizeStatePointer("/state")).toBe("/");
    expect(toStatePatchPath("/prices/bitcoin/price")).toBe(
      "/state/prices/bitcoin/price",
    );
    expect(toStatePatchPath("/state/prices/bitcoin/price")).toBe(
      "/state/prices/bitcoin/price",
    );
  });

  test("verifiedBindingPointer strips only when the stripped form resolves", () => {
    const state = { prices: { bitcoin: { price: 77390 } } };
    expect(verifiedBindingPointer("/state/prices/bitcoin/price", state)).toBe(
      "/prices/bitcoin/price",
    );
    expect(verifiedBindingPointer("/prices/bitcoin/price", state)).toBe(
      "/prices/bitcoin/price",
    );
    expect(verifiedBindingPointer("/state/missing", {})).toBe("/state/missing");
  });

  test("mineTemplatePointers finds absolute ${/path} refs", () => {
    const spec = {
      root: "main",
      elements: {
        price: {
          type: "Metric",
          props: {
            value: { $template: "$${/state/prices/bitcoin/price}" },
          },
          children: [],
        },
      },
    } as Spec;
    const { paths } = mineTemplatePointers(spec);
    expect(paths).toEqual(["/state/prices/bitcoin/price"]);
  });

  test("synthetic Spec mines $bindState, repeat.statePath, visible $state", () => {
    const spec = JSON.parse(
      readFileSync(
        join(fixtures, "state-bridge/synthetic-bind-repeat-spec.json"),
        "utf8",
      ),
    ) as Spec;

    const { paths, usages } = mineStatePaths(spec);
    expect(paths).toContain("/draftName");
    expect(paths).toContain("/items");
    expect(paths).toContain("/showRows");
    expect(
      usages.some(
        (u) => u.path === "/draftName" && u.propKey.includes("value"),
      ),
    ).toBe(true);
    expect(
      usages.some(
        (u) => u.path === "/items" && u.propKey === "repeat.statePath",
      ),
    ).toBe(true);
  });
});
