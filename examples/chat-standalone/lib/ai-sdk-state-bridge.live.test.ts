/**
 * Live smoke: OpenAI SpecStream `/state` → AiSdkStateBridge → StateStore.
 * Skips when OPENAI_API_KEY is absent so CI stays green.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";
import { pipeJsonRender, SPEC_DATA_PART_TYPE } from "@json-render/core";
import { streamText } from "ai";

import { createAiSdkStateBridgeWithStore } from "./ai-sdk-state-bridge";
import { resolveModel } from "./model";

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

const STATE_ONLY_SYSTEM = `You emit SpecStream only: JSONL lines of RFC 6902 patches.
Rules:
- Output ONLY JSON lines. No markdown fences. No prose. No blank commentary.
- Every patch path MUST start with /state (e.g. /state/title). Never /root or /elements.
- Use op "add" or "replace".
- Emit exactly these three patches (values may vary slightly but keys must match):
{"op":"add","path":"/state/title","value":"Live bridge smoke"}
{"op":"add","path":"/state/count","value":3}
{"op":"add","path":"/state/items","value":[{"id":"a"},{"id":"b"}]}`;

describe("AiSdkStateBridge live (OpenAI)", () => {
  test.skipIf(!hasOpenAI)(
    "state-only SpecStream through pipeJsonRender → applyParts fills store",
    async () => {
      process.env.AI_PROVIDER = "openai";

      const { bridge, store } = createAiSdkStateBridgeWithStore();
      const result = streamText({
        model: resolveModel(),
        system: STATE_ONLY_SYSTEM,
        prompt: "Emit the three required /state patches now.",
        maxOutputTokens: 400,
      });

      const parts: Array<{ type: string; data?: unknown }> = [];
      const uiStream = pipeJsonRender(result.toUIMessageStream());
      const reader = uiStream.getReader();
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        if (
          chunk &&
          typeof chunk === "object" &&
          "type" in chunk &&
          (chunk as { type: string }).type === SPEC_DATA_PART_TYPE
        ) {
          parts.push({
            type: SPEC_DATA_PART_TYPE,
            data: (chunk as { data?: unknown }).data,
          });
        }
      }

      // Fallback: if the model wrapped output oddly, also drain text via JSONL
      if (parts.length === 0) {
        const text = await result.text;
        bridge.pushJsonl(text.endsWith("\n") ? text : `${text}\n`);
      } else {
        bridge.applyParts(parts);
      }

      expect(store.get("/title")).toBe("Live bridge smoke");
      expect(store.get("/count")).toBe(3);
      const items = store.get("/items");
      expect(Array.isArray(items)).toBe(true);
      expect((items as unknown[]).length).toBeGreaterThanOrEqual(2);
    },
    60_000,
  );
});
