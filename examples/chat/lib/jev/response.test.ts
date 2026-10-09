// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SPEC_DATA_PART_TYPE,
  type Spec,
  type SpecDataPart,
} from "@json-render/core";
import {
  createCompositionStreamResponse,
  lastAssistantSpec,
  lastUserPrompt,
} from "./response";
import { composeUI } from "./compose";
import type { UIMessage } from "ai";

vi.mock("./compose", () => ({ composeUI: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

async function readSse(response: Response) {
  const text = await response.text();
  return text
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice(6).trim())
    .filter((payload) => payload && payload !== "[DONE]")
    .map((payload) => JSON.parse(payload) as Record<string, unknown>);
}

describe("chat composition stream", () => {
  it("streams data-spec patches then a flat spec into the UI message stream", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "test");
    const spec: Spec = {
      root: "card",
      elements: {
        card: { type: "Card", props: { title: "Weather" }, children: [] },
      },
      state: { weather: [{ city: "New York" }] },
    };
    vi.mocked(composeUI).mockImplementation(async function* () {
      yield {
        type: "complete",
        spec,
        steps: [],
        stopReason: "finish",
        elapsedMs: 1,
        inputTokens: null,
      };
    });
    const response = createCompositionStreamResponse(
      new Request("https://example.com/api/generate"),
      "Compare weather",
    );
    expect(response.status).toBe(200);
    const chunks = await readSse(response);
    const specChunks = chunks.filter(
      (chunk) => chunk.type === SPEC_DATA_PART_TYPE,
    );
    expect(specChunks.length).toBeGreaterThan(0);
    expect(specChunks.at(-1)).toMatchObject({
      type: SPEC_DATA_PART_TYPE,
      data: { type: "flat", spec },
    });
    expect(composeUI).toHaveBeenCalled();
  });

  it("validates requests before starting the model", async () => {
    const request = new Request("https://example.com/api/generate");
    expect(createCompositionStreamResponse(request, " ").status).toBe(400);
    expect(
      createCompositionStreamResponse(request, "Edit", {
        root: "card",
        elements: { card: null },
      }).status,
    ).toBe(400);
    vi.stubEnv("OPENAI_API_KEY", "openai-key");
    vi.stubEnv("TYPESAFE_API_KEY", "");
    expect(
      createCompositionStreamResponse(request, "Compare weather").status,
    ).toBe(503);
    expect(composeUI).not.toHaveBeenCalled();
  });

  it("reads the last user prompt and replays assistant data-spec parts", () => {
    const messages: UIMessage[] = [
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "Compare weather" }],
      },
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: SPEC_DATA_PART_TYPE,
            data: {
              type: "patch",
              patch: { op: "add", path: "/root", value: "card" },
            } satisfies SpecDataPart,
          },
          {
            type: SPEC_DATA_PART_TYPE,
            data: {
              type: "flat",
              spec: {
                root: "card",
                elements: {
                  card: {
                    type: "Card",
                    props: { title: "After" },
                    children: [],
                  },
                },
              },
            } satisfies SpecDataPart,
          },
        ],
      },
      {
        id: "u2",
        role: "user",
        parts: [{ type: "text", text: "Remove the table" }],
      },
    ];
    expect(lastUserPrompt(messages)).toBe("Remove the table");
    expect(lastAssistantSpec(messages)).toEqual({
      root: "card",
      elements: {
        card: { type: "Card", props: { title: "After" }, children: [] },
      },
    });
  });
});
