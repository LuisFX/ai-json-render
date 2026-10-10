import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { validateFrozenSpec } from "./validate-frozen-spec";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

describe("validateFrozenSpec", () => {
  test("accepts high-severity Spec and strips state", () => {
    const raw = JSON.parse(
      readFileSync(
        join(
          fixtures,
          "high-severity-clinical-history-review/trace-conv_jMMi0kX3a6oclD2A-spec.json",
        ),
        "utf8",
      ),
    );
    const result = validateFrozenSpec(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.root).toBeTruthy();
    expect(result.spec.state).toBeUndefined();
    expect(result.warnings.length).toBe(0);
  });

  test("rejects missing elements", () => {
    const result = validateFrozenSpec({ root: "main", elements: {} });
    expect(result.ok).toBe(false);
  });
});
