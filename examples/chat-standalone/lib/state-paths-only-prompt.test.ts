import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Spec } from "@json-render/core";

import { statePathsOnlyPrompt } from "./state-paths-only-prompt";
import { mineStatePaths } from "./state-paths";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");
const snapshotPath = join(
  fixtures,
  "state-bridge/state-paths-only.prompt.snapshot.txt",
);

describe("statePathsOnlyPrompt", () => {
  test("matches high-severity snapshot and omits layout curriculum", () => {
    const spec = JSON.parse(
      readFileSync(
        join(
          fixtures,
          "high-severity-clinical-history-review/trace-conv_jMMi0kX3a6oclD2A-spec.json",
        ),
        "utf8",
      ),
    ) as Spec;

    const prompt = statePathsOnlyPrompt(spec);
    const snapshot = readFileSync(snapshotPath, "utf8");
    expect(prompt + "\n").toBe(snapshot);

    const { paths } = mineStatePaths(spec);
    for (const path of paths) {
      expect(prompt).toContain(path);
    }

    // Must not teach SpecStream layout the way catalog.prompt does
    expect(prompt).not.toContain('"path":"/root"');
    expect(prompt).not.toContain("AVAILABLE COMPONENTS (");
    expect(prompt).toContain("/state");
    expect(prompt).toContain("```spec");
  });

  test("synthetic Spec lists bind + repeat paths", () => {
    const spec = JSON.parse(
      readFileSync(
        join(fixtures, "state-bridge/synthetic-bind-repeat-spec.json"),
        "utf8",
      ),
    ) as Spec;
    const prompt = statePathsOnlyPrompt(spec);
    expect(prompt).toContain("/draftName");
    expect(prompt).toContain("/items");
    expect(prompt).toContain("repeat.statePath");
  });
});
