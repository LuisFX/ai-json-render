/**
 * Live lab: ai-sdk-provider-opencode-sdk against a running `opencode serve`.
 * Skips when AI_PROVIDER!=opencode or serve is unreachable so CI stays green.
 *
 * Run (with serve on :4096):
 *   AI_PROVIDER=opencode bun test lib/ai-sdk-opencode.live.test.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";
import { pipeJsonRender, SPEC_DATA_PART_TYPE } from "@json-render/core";
import { generateText, streamText, tool } from "ai";
import { z } from "zod";

import { createAiSdkStateBridgeWithStore } from "./ai-sdk-state-bridge";
import { resolveOpencodeModel, useOpencode } from "./model";

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

const LAB_DIRECTORY = process.env.OPENCODE_DIRECTORY;

/**
 * Control-plane routes (`/permission`, `/question`) resolve the workspace from
 * `?directory=`, falling back to the serve process cwd. Omitting it 404s
 * whenever serve was not started inside the lab directory.
 */
function serveUrl(path: string): string {
  const url = new URL(
    path,
    process.env.OPENCODE_BASE_URL ?? "http://127.0.0.1:4096",
  );
  if (LAB_DIRECTORY) url.searchParams.set("directory", LAB_DIRECTORY);
  return url.toString();
}

async function serveHealthy(): Promise<boolean> {
  const base = process.env.OPENCODE_BASE_URL ?? "http://127.0.0.1:4096";
  try {
    const res = await fetch(`${base}/global/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { healthy?: boolean };
    return body.healthy === true;
  } catch {
    return false;
  }
}

const healthy = await serveHealthy();
const enabled = useOpencode() && healthy;

type Capture = {
  text: string;
  sessionId?: string;
  cost?: number;
  toolCalls: Array<{ name: string; dynamic?: boolean }>;
  partTypes: string[];
  warnings: string[];
  errors: unknown[];
  finishReasons: string[];
};

async function captureStream(
  prompt: string,
  opts?: {
    sessionId?: string;
    createNewSession?: boolean;
    system?: string;
    tools?: Record<string, ReturnType<typeof tool>>;
  },
): Promise<Capture> {
  const warnings: string[] = [];
  const prevWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(" "));
    prevWarn(...args);
  };

  try {
    const model = resolveOpencodeModel({
      sessionId: opts?.sessionId,
      createNewSession: opts?.createNewSession,
    });
    const result = streamText({
      model,
      system: opts?.system,
      prompt,
      tools: opts?.tools,
    });

    let text = "";
    const toolCalls: Capture["toolCalls"] = [];
    const partTypes: string[] = [];
    const errors: unknown[] = [];
    const finishReasons: string[] = [];
    let sessionId: string | undefined;
    let cost: number | undefined;

    for await (const part of result.fullStream) {
      partTypes.push(part.type);
      switch (part.type) {
        case "text-delta":
          text += part.text ?? "";
          break;
        case "tool-call":
          toolCalls.push({
            name: part.toolName,
            dynamic: (part as { dynamic?: boolean }).dynamic,
          });
          break;
        case "finish-step": {
          const oc = part.providerMetadata?.opencode as
            | { sessionId?: string; cost?: number }
            | undefined;
          if (oc?.sessionId) sessionId = oc.sessionId;
          if (typeof oc?.cost === "number") cost = oc.cost;
          break;
        }
        case "finish":
          finishReasons.push(part.finishReason);
          break;
        case "error":
          errors.push(part.error);
          break;
        default:
          break;
      }
    }

    // Fallback: result-level metadata
    const meta = await result.providerMetadata;
    const oc = meta?.opencode as
      | { sessionId?: string; cost?: number }
      | undefined;
    if (!sessionId && oc?.sessionId) sessionId = oc.sessionId;
    if (cost == null && typeof oc?.cost === "number") cost = oc.cost;

    return {
      text,
      sessionId,
      cost,
      toolCalls,
      partTypes,
      warnings,
      errors,
      finishReasons,
    };
  } finally {
    console.warn = prevWarn;
  }
}

describe("opencode provider lab (live)", () => {
  test.skipIf(!enabled)(
    "P0 smoke: text streams with sessionId + cost",
    async () => {
      const cap = await captureStream(
        "Reply with exactly: hello-from-opencode",
        {
          createNewSession: true,
        },
      );
      console.log(
        JSON.stringify(
          {
            phase: "P0",
            text: cap.text.slice(0, 200),
            sessionId: cap.sessionId,
            cost: cap.cost,
            finishReasons: cap.finishReasons,
            partTypes: [...new Set(cap.partTypes)],
            errors: cap.errors.map(String),
          },
          null,
          2,
        ),
      );
      expect(cap.errors.length).toBe(0);
      expect(cap.text.toLowerCase()).toContain("hello");
      expect(cap.sessionId).toBeTruthy();
    },
    120_000,
  );

  test.skipIf(!enabled)(
    "P1 tool truth: server tools observed; client tools ignored",
    async () => {
      const clientTool = tool({
        description:
          "Client-only weather tool that MUST be ignored by OpenCode",
        inputSchema: z.object({ city: z.string() }),
        execute: async ({ city }) => ({ city, temp: 72 }),
      });

      const cap = await captureStream(
        "List the files in your working directory using your built-in tools. Do not invent filenames.",
        {
          createNewSession: true,
          tools: { getWeatherClient: clientTool },
        },
      );

      console.log(
        JSON.stringify(
          {
            phase: "P1",
            text: cap.text.slice(0, 400),
            toolCalls: cap.toolCalls,
            warnings: cap.warnings,
            partTypes: [...new Set(cap.partTypes)],
            errors: cap.errors.map(String),
          },
          null,
          2,
        ),
      );

      const ignored = cap.warnings.some((w) =>
        /tool|ignored|not supported|unsupported/i.test(w),
      );
      // Either a warning about client tools, or no client tool execution — both are findings.
      expect(cap.toolCalls.every((t) => t.name !== "getWeatherClient")).toBe(
        true,
      );
      console.log(
        JSON.stringify({ clientToolsIgnoredWarning: ignored }, null, 2),
      );
    },
    180_000,
  );

  test.skipIf(!enabled)(
    "P2 session: resume by sessionId remembers prior turn",
    async () => {
      const first = await captureStream(
        "Remember this codeword for later: ORANGE-ZEBRA-42. Reply with OK.",
        { createNewSession: true },
      );
      expect(first.sessionId).toBeTruthy();

      const second = await captureStream(
        "What codeword did I ask you to remember? Reply with only the codeword.",
        { sessionId: first.sessionId },
      );

      console.log(
        JSON.stringify(
          {
            phase: "P2-resume",
            sessionId: first.sessionId,
            secondSessionId: second.sessionId,
            secondText: second.text.slice(0, 200),
          },
          null,
          2,
        ),
      );

      expect(second.text).toContain("ORANGE-ZEBRA-42");
      expect(second.sessionId).toBe(first.sessionId);
    },
    180_000,
  );

  test.skipIf(!enabled)(
    "P2 footgun: shared model instance without createNewSession shares session",
    async () => {
      // Two generateText calls on the SAME model instance (createNewSession false).
      const shared = resolveOpencodeModel({ createNewSession: false });
      const a = await generateText({
        model: shared,
        prompt: "Remember codeword SHARED-FOXGLOVE. Reply OK.",
      });
      const sessionA = (a.providerMetadata?.opencode as { sessionId?: string })
        ?.sessionId;
      const b = await generateText({
        model: shared,
        prompt:
          "What codeword did I ask you to remember? Reply with only the codeword.",
      });
      const sessionB = (b.providerMetadata?.opencode as { sessionId?: string })
        ?.sessionId;

      console.log(
        JSON.stringify(
          {
            phase: "P2-footgun",
            sessionA,
            sessionB,
            sameSession: sessionA === sessionB,
            textB: b.text.slice(0, 200),
          },
          null,
          2,
        ),
      );

      expect(sessionA).toBeTruthy();
      expect(sessionB).toBe(sessionA);
      expect(b.text).toContain("SHARED-FOXGLOVE");
    },
    180_000,
  );

  test.skipIf(!enabled)(
    "P3 permission ask: bash ask yields tool-approval-request; reply unblocks",
    async () => {
      const { createOpencode } = await import("ai-sdk-provider-opencode-sdk");
      const base = process.env.OPENCODE_BASE_URL ?? "http://127.0.0.1:4096";
      const modelId = process.env.OPENCODE_MODEL ?? "openai/gpt-5-mini";
      const oc = createOpencode({ baseUrl: base, autoStartServer: false });
      // Note: scratch opencode.json `permission.bash: ask` did NOT fire in this
      // serve+directory setup. Provider session permission ruleset DID.
      const model = oc(modelId, {
        createNewSession: true,
        directory: LAB_DIRECTORY,
        permission: [{ permission: "bash", pattern: "*", action: "ask" }],
      });

      const result = streamText({
        model,
        prompt:
          "Use your bash tool to run: echo permission-lab-ok. You must actually run the command.",
      });

      const partTypes: string[] = [];
      const approvals: Array<{ approvalId: string }> = [];
      let text = "";

      for await (const part of result.fullStream) {
        partTypes.push(part.type);
        if (part.type === "text-delta") text += part.text ?? "";
        if (part.type === "tool-approval-request") {
          approvals.push({ approvalId: part.approvalId });
          const res = await fetch(
            serveUrl(`/permission/${part.approvalId}/reply`),
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ reply: "once" }),
            },
          );
          console.log(
            JSON.stringify(
              {
                phase: "P3-reply",
                id: part.approvalId,
                status: res.status,
                body: await res.text(),
              },
              null,
              2,
            ),
          );
          expect(res.ok).toBe(true);
        }
        if (part.type === "finish" || part.type === "error") break;
      }

      console.log(
        JSON.stringify(
          {
            phase: "P3",
            partTypes: [...new Set(partTypes)],
            approvals,
            textPreview: text.slice(0, 200),
          },
          null,
          2,
        ),
      );

      expect(approvals.length).toBeGreaterThan(0);
      expect(partTypes).toContain("tool-approval-request");
      expect(text).toContain("permission-lab-ok");
    },
    90_000,
  );

  test.skipIf(!enabled)(
    "P4 question hole: question.asked becomes stream error and blocks until replied",
    async () => {
      const warnings: string[] = [];
      const prevWarn = console.warn;
      console.warn = (...args: unknown[]) => {
        warnings.push(args.map(String).join(" "));
        prevWarn(...args);
      };

      const controller = new AbortController();
      const kill = setTimeout(() => controller.abort("lab-timeout"), 25_000);

      let streamError: unknown;
      let text = "";
      let sessionId: string | undefined;
      const partTypes: string[] = [];

      try {
        const model = resolveOpencodeModel({ createNewSession: true });
        const result = streamText({
          model,
          prompt:
            "Before answering, you MUST use the built-in question tool to ask me one clarifying multiple-choice question about whether I prefer cats or dogs. Do not answer without asking.",
          abortSignal: controller.signal,
        });

        for await (const part of result.fullStream) {
          partTypes.push(part.type);
          if (part.type === "text-delta") text += part.text ?? "";
          if (part.type === "error") streamError = part.error;
          if (part.type === "finish-step") {
            const oc = part.providerMetadata?.opencode as
              | { sessionId?: string }
              | undefined;
            if (oc?.sessionId) sessionId = oc.sessionId;
          }
          // Once we see the question error, stop waiting on the blocked session.
          if (part.type === "error") {
            controller.abort("got-question-error");
            break;
          }
        }
      } catch (err) {
        streamError ??= err;
      } finally {
        clearTimeout(kill);
        console.warn = prevWarn;
      }

      // Pending question should exist server-side while the stream errored.
      const pendingBefore = (await (
        await fetch(serveUrl("/question"))
      ).json()) as Array<{ id: string; sessionID: string }>;
      const forSession = pendingBefore.filter((q) =>
        sessionId ? q.sessionID === sessionId : true,
      );

      console.log(
        JSON.stringify(
          {
            phase: "P4",
            text: text.slice(0, 200),
            partTypes: [...new Set(partTypes)],
            warning: warnings.find((w) => /question\.asked/i.test(w)),
            error:
              streamError instanceof Error
                ? streamError.message
                : String(streamError ?? ""),
            sessionId,
            pendingQuestionIds: forSession.map((q) => q.id),
          },
          null,
          2,
        ),
      );

      expect(
        warnings.some((w) => /question\.asked/i.test(w)) ||
          String(streamError ?? "").includes("question.asked"),
      ).toBe(true);

      // Abort/recover: reply to pending questions so the session unblocks.
      expect(forSession.length).toBeGreaterThan(0);
      for (const q of forSession) {
        const res = await fetch(serveUrl(`/question/${q.id}/reply`), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ answers: [["Dogs"]] }),
        });
        expect(res.ok).toBe(true);
      }
      const pendingAfter = (await (
        await fetch(serveUrl("/question"))
      ).json()) as Array<{ id: string }>;
      const stillPending = pendingAfter.filter((q) =>
        forSession.some((f) => f.id === q.id),
      );
      console.log(
        JSON.stringify(
          {
            phase: "P4-recover",
            replied: forSession.map((q) => q.id),
            stillPending,
          },
          null,
          2,
        ),
      );
      expect(stillPending).toEqual([]);
    },
    60_000,
  );

  test.skipIf(!enabled)(
    "P5 Mode A: spec fence streams through pipeJsonRender",
    async () => {
      const model = resolveOpencodeModel({ createNewSession: true });
      const result = streamText({
        model,
        system: `You help users explore data. After a one-sentence summary, output a JSONL UI spec inside a \`\`\`spec fence.
Example:
\`\`\`spec
{"op":"add","path":"/root","value":"card1"}
{"op":"add","path":"/elements/card1","value":{"type":"Card","props":{"title":"Hello"},"children":[]}}
\`\`\`
Always include a real \`\`\`spec fence with at least /root and one element.`,
        prompt:
          "Build a tiny Card titled Lab Spec with one Text child saying hi.",
      });

      const specParts: unknown[] = [];
      let text = "";
      const uiStream = pipeJsonRender(result.toUIMessageStream());
      const reader = uiStream.getReader();
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        if (!chunk || typeof chunk !== "object" || !("type" in chunk)) continue;
        const typed = chunk as { type: string; data?: unknown; text?: string };
        if (typed.type === "text-delta" || typed.type === "text") {
          text += typed.text ?? "";
        }
        if (typed.type === SPEC_DATA_PART_TYPE) {
          specParts.push(typed.data);
        }
      }

      console.log(
        JSON.stringify(
          {
            phase: "P5",
            textPreview: text.slice(0, 300),
            specPartCount: specParts.length,
            firstSpec: specParts[0],
          },
          null,
          2,
        ),
      );

      expect(specParts.length).toBeGreaterThan(0);
    },
    180_000,
  );

  test.skipIf(!enabled)(
    "P6 Mode B: systemPrompt state-fill yields /state patches into bridge",
    async () => {
      const system = `You fill DATA for a FROZEN UI Spec. Layout already exists — never emit /root or /elements.
Output ONLY a \`\`\`spec fence with JSONL patches under /state.
Emit exactly:
{"op":"add","path":"/state/title","value":"Opencode Mode B"}
{"op":"add","path":"/state/count","value":2}
{"op":"add","path":"/state/items","value":[{"id":"x"},{"id":"y"}]}`;

      const model = resolveOpencodeModel({
        createNewSession: true,
        systemPrompt: system,
      });
      const { bridge, store } = createAiSdkStateBridgeWithStore();
      const result = streamText({
        model,
        prompt: "Fill the frozen spec state now.",
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

      const applied = bridge.applyParts(parts);
      const title = store.get("/title");
      const count = store.get("/count");
      const items = store.get("/items");

      console.log(
        JSON.stringify(
          {
            phase: "P6",
            specPartCount: parts.length,
            applied,
            title,
            count,
            items,
          },
          null,
          2,
        ),
      );

      expect(parts.length).toBeGreaterThan(0);
      expect(title).toBe("Opencode Mode B");
      expect(count).toBe(2);
      expect(Array.isArray(items)).toBe(true);
    },
    180_000,
  );
});
