import { describe, expect, test } from "bun:test";

import {
  OPENAI_MODEL_MATRIX,
  clampEffort,
  getEnabledOpenAIModels,
  isEnabledOpenAIModel,
  resolveEnabledModelId,
  seedOpenAIModelId,
} from "./openai-model-matrix";

describe("openai-model-matrix", () => {
  test("every row: defaultEffort is null iff efforts empty, else ∈ efforts", () => {
    for (const row of OPENAI_MODEL_MATRIX) {
      if (row.efforts.length === 0) {
        expect(row.defaultEffort).toBeNull();
        continue;
      }
      expect(row.defaultEffort).not.toBeNull();
      expect(row.efforts).toContain(row.defaultEffort!);
    }
  });

  test("enabled models are streaming-friendly lab defaults", () => {
    const enabled = getEnabledOpenAIModels();
    expect(enabled.length).toBeGreaterThan(5);
    expect(enabled.every((r) => r.enabled)).toBe(true);
    expect(isEnabledOpenAIModel("gpt-5.5-pro")).toBe(false);
    expect(isEnabledOpenAIModel("gpt-5.4-mini")).toBe(true);
  });

  test("clampEffort snaps invalid / missing to default", () => {
    expect(clampEffort("gpt-5.4-mini", undefined)).toBe("none");
    expect(clampEffort("gpt-5.4-mini", "bogus")).toBe("none");
    expect(clampEffort("gpt-5.4-mini", "high")).toBe("high");
    expect(clampEffort("gpt-5", "none")).toBe("medium"); // none not allowed
    expect(clampEffort("gpt-5", "minimal")).toBe("minimal");
    expect(clampEffort("gpt-5.3-codex", "none")).toBe("medium");
  });

  test("resolveEnabledModelId rejects disabled ids", () => {
    expect(resolveEnabledModelId("gpt-5.5-pro")).toBe("gpt-5.4-mini");
    expect(resolveEnabledModelId("gpt-5.5")).toBe("gpt-5.5");
    expect(seedOpenAIModelId("gpt-4o")).toBe("gpt-5.4-mini");
    expect(seedOpenAIModelId("gpt-5.4-nano")).toBe("gpt-5.4-nano");
  });
});
