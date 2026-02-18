import { createAnthropic } from "@ai-sdk/anthropic";
import { gateway } from "@ai-sdk/gateway";

const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

/** Return type compatible with streamText/generateText model parameter */
export type AIModel = ReturnType<typeof gateway>;

export type GetModelOptions = {
  /** Override provider (anthropic | gateway). When not set, auto-detects from env. */
  provider?: "anthropic" | "gateway";
  /** Override model ID. When not set, uses AI_MODEL or default. */
  model?: string;
  /** Explicit API keys (for Metro/Expo where process.env may not be inlined). */
  apiKeys?: {
    anthropic?: string;
    gateway?: string;
  };
};

/**
 * Returns the AI model for generation. Configuration is driven by env vars:
 *
 * - AI_PROVIDER: "anthropic" | "gateway" – force provider when both keys exist
 * - AI_MODEL: model ID (e.g. claude-haiku-4-5, anthropic/claude-haiku-4.5)
 * - ANTHROPIC_API_KEY: for direct Anthropic API
 * - AI_GATEWAY_API_KEY: for Vercel AI Gateway
 *
 * Auto-detect: uses Anthropic when ANTHROPIC_API_KEY is set, else Gateway.
 */
export function getModel(options?: GetModelOptions): AIModel {
  const provider =
    options?.provider ??
    (process.env.AI_PROVIDER as "anthropic" | "gateway" | undefined);
  const modelEnv =
    options?.model ??
    process.env.AI_MODEL ??
    process.env.AI_GATEWAY_MODEL ??
    DEFAULT_MODEL;
  const anthropicKey =
    options?.apiKeys?.anthropic ?? process.env.ANTHROPIC_API_KEY;
  const gatewayKey =
    options?.apiKeys?.gateway ?? process.env.AI_GATEWAY_API_KEY;

  const useAnthropic =
    provider === "anthropic" || (provider !== "gateway" && anthropicKey);

  if (useAnthropic && anthropicKey) {
    const anthropic = createAnthropic({ apiKey: anthropicKey });
    const modelId = modelEnv.startsWith("anthropic/")
      ? modelEnv.slice(10)
      : modelEnv;
    return anthropic(modelId);
  }

  if (gatewayKey) {
    return gateway(modelEnv);
  }

  throw new Error(
    "No AI provider configured. Set ANTHROPIC_API_KEY or AI_GATEWAY_API_KEY in your environment.",
  );
}
