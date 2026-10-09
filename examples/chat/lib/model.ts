import { gateway } from "@ai-sdk/gateway";
import { createOpenAI } from "@ai-sdk/openai";

const DEFAULT_GATEWAY_MODEL = "anthropic/claude-haiku-4.5";
const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";

export function openaiApiKey(): string {
  return process.env.OPENAI_API_KEY?.trim() ?? "";
}

/** TypeSafe's SDK env name — not a Vercel AI Gateway key. */
export function typeSafeApiKey(): string {
  return process.env.TYPESAFE_API_KEY?.trim() ?? "";
}

export function createChatOpenAI() {
  const apiKey = openaiApiKey();
  if (!apiKey) return null;
  return createOpenAI({ apiKey });
}

/** OpenAI when `OPENAI_API_KEY` is set; otherwise AI Gateway. */
export function chatLanguageModel() {
  const openai = createChatOpenAI();
  if (openai)
    return openai(process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL);
  return gateway(process.env.AI_GATEWAY_MODEL || DEFAULT_GATEWAY_MODEL);
}
