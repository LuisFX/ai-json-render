/**
 * Optional live smoke: statePathsOnly prompt → SpecStream /state → bridge.
 * Skips without OPENAI_API_KEY.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";
import { streamText } from "ai";
import type { Spec } from "@json-render/core";

import { createAiSdkStateBridgeWithStore } from "./ai-sdk-state-bridge";
import { resolveModel } from "./model";
import { statePathsOnlyPrompt } from "./state-paths-only-prompt";
import { mineStatePaths } from "./state-paths";

function loadEnvLocal(): void {
  const path = join(dirname(fileURLToPath(import.meta.url)), "../.env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

describe("statePathsOnly live (OpenAI)", () => {
  test.skipIf(!hasOpenAI)(
    "fills a few mined paths into the store",
    async () => {
      process.env.AI_PROVIDER = "openai";

      const spec = JSON.parse(
        readFileSync(
          join(
            fixtures,
            "high-severity-clinical-history-review/trace-conv_jMMi0kX3a6oclD2A-spec.json",
          ),
          "utf8",
        ),
      ) as Spec;

      const mined = mineStatePaths(spec);
      const focus = mined.paths.slice(0, 3);
      const system = `${statePathsOnlyPrompt(spec)}

FOCUS: For this smoke test, emit ONLY patches for these paths (as /state/...):
${focus.map((p) => `- ${p}`).join("\n")}
Use realistic mock clinical sample data. No /root or /elements.`;

      const { bridge, store } = createAiSdkStateBridgeWithStore();
      const result = streamText({
        model: resolveModel(),
        system,
        prompt: "Fill the focused state paths now.",
        maxOutputTokens: 800,
      });

      const text = await result.text;
      bridge.pushJsonl(text.endsWith("\n") ? text : `${text}\n`);

      let hits = 0;
      for (const path of focus) {
        if (store.get(path) !== undefined) hits++;
      }
      expect(hits).toBeGreaterThanOrEqual(1);
    },
    90_000,
  );
});
