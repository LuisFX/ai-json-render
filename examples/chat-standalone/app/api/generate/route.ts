import { minuteRateLimit, dailyRateLimit } from "@/lib/rate-limit";
import {
  REASONING_EFFORTS,
  type ReasoningEffort,
  resolveEnabledModelId,
} from "@/lib/openai-model-matrix";
import {
  defaultChatProvider,
  toOpencodeModelId,
  type ChatProvider,
} from "@/lib/model";
import {
  withLangfuseTrace,
  wrapLangfuseRoute,
} from "@/lib/observability/langfuse-route";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { pipeJsonRender } from "@json-render/core";
import { headers } from "next/headers";
import { parseCurrentSpec } from "@/lib/edit-prompt";
import { resolveComposer } from "@/lib/jev/request";
import {
  createCompositionStreamResponse,
  lastUserPrompt,
} from "@/lib/jev/response";

/** OpenCode multi-steps inside one provider call; 60s is often too short. */
export const maxDuration = 300;

function parseReasoningEffort(value: unknown): ReasoningEffort | undefined {
  if (typeof value !== "string") return undefined;
  return (REASONING_EFFORTS as readonly string[]).includes(value)
    ? (value as ReasoningEffort)
    : undefined;
}

function parseProvider(value: unknown): ChatProvider | undefined {
  if (value === "openai" || value === "opencode" || value === "gateway") {
    return value;
  }
  return undefined;
}

function lastUserText(messages: UIMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!msg || msg.role !== "user") continue;
    const texts: string[] = [];
    for (const part of msg.parts ?? []) {
      if (part.type === "text" && typeof part.text === "string") {
        texts.push(part.text);
      }
    }
    if (texts.length > 0) return texts.join("\n").slice(0, 500);
  }
  return undefined;
}

async function handleGenerate(req: Request): Promise<Response> {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";

  const [minuteResult, dailyResult] = await Promise.all([
    minuteRateLimit.limit(ip),
    dailyRateLimit.limit(ip),
  ]);

  if (!minuteResult.success || !dailyResult.success) {
    const isMinuteLimit = !minuteResult.success;
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: isMinuteLimit
          ? "Too many requests. Please wait a moment before trying again."
          : "Daily limit reached. Please try again tomorrow.",
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const body = await req.json();
  const uiMessages: UIMessage[] = body.messages;
  const webSearchEnabled = body.webSearch !== false;
  const mode =
    body.mode === "state-fill"
      ? ("state-fill" as const)
      : ("generate" as const);
  const stateFillSystem =
    typeof body.stateFillSystem === "string" ? body.stateFillSystem : undefined;
  const modelId = typeof body.modelId === "string" ? body.modelId : undefined;
  const reasoningEffort = parseReasoningEffort(body.reasoningEffort);
  const sessionId =
    typeof body.sessionId === "string" && body.sessionId.trim()
      ? body.sessionId.trim()
      : undefined;
  const conversationId =
    typeof body.conversationId === "string" && body.conversationId.trim()
      ? body.conversationId.trim()
      : undefined;
  const provider = parseProvider(body.provider) ?? defaultChatProvider();
  const currentSpec = parseCurrentSpec(body.currentSpec);

  if (!uiMessages || !Array.isArray(uiMessages) || uiMessages.length === 0) {
    return new Response(
      JSON.stringify({ error: "messages array is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (mode === "state-fill" && !stateFillSystem?.trim()) {
    return new Response(
      JSON.stringify({
        error: "stateFillSystem is required when mode is state-fill",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const composer = resolveComposer({
    composer: body.composer,
    mode,
  });
  if (composer.kind === "jev-state-fill-refused") {
    return new Response(
      JSON.stringify({
        error: "Jev cannot fill a frozen spec.",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  if (composer.kind === "jev") {
    return withLangfuseTrace(
      {
        traceName: "chat.generate",
        sessionId: conversationId,
        tags: ["jev", "examples-chat-standalone"],
        input: lastUserPrompt(uiMessages),
      },
      async () =>
        createCompositionStreamResponse(
          req,
          lastUserPrompt(uiMessages),
          currentSpec ?? body.currentSpec,
        ),
    );
  }

  const resolvedModel =
    provider === "opencode"
      ? modelId
        ? toOpencodeModelId(modelId)
        : (process.env.OPENCODE_MODEL ?? "openai/gpt-5-mini")
      : provider === "openai"
        ? resolveEnabledModelId(modelId)
        : (process.env.AI_GATEWAY_MODEL ?? "anthropic/claude-haiku-4.5");

  console.info(
    `[chat-standalone/generate] provider=${provider} model=${resolvedModel} effort=${reasoningEffort ?? "default"} conversationId=${conversationId ?? "none"} sessionId=${sessionId ?? "none"} mode=${mode}`,
  );

  return withLangfuseTrace(
    {
      traceName: "chat.generate",
      sessionId: conversationId,
      tags: [provider, mode, "examples-chat-standalone"],
      input: lastUserText(uiMessages),
    },
    async () => {
      const { agent } = await import("@/lib/agent");
      const modelMessages = await convertToModelMessages(uiMessages);
      const result = await agent.stream({
        messages: modelMessages,
        options: {
          webSearch: webSearchEnabled,
          mode,
          stateFillSystem,
          modelId,
          reasoningEffort,
          sessionId,
          provider,
          currentSpec,
        },
      });

      const stream = createUIMessageStream({
        execute: async ({ writer }) => {
          writer.merge(
            pipeJsonRender(
              result.toUIMessageStream({
                messageMetadata: ({ part }) => {
                  // TextStreamPart "finish" has no providerMetadata; sessionId lands on finish-step.
                  if (part.type !== "finish-step") return undefined;
                  const oc = part.providerMetadata?.opencode as
                    | { sessionId?: string; cost?: number; messageId?: string }
                    | undefined;
                  if (!oc?.sessionId) return undefined;
                  return {
                    opencodeSessionId: oc.sessionId,
                    opencodeCost: oc.cost,
                    opencodeMessageId: oc.messageId,
                  };
                },
              }),
            ),
          );
        },
      });

      return createUIMessageStreamResponse({ stream });
    },
  );
}

export const POST = wrapLangfuseRoute(handleGenerate, "api.generate");
