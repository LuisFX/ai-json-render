import { gateway } from "@ai-sdk/gateway";
import { openai } from "@ai-sdk/openai";
import { createOpencode } from "ai-sdk-provider-opencode-sdk";

import {
  resolveEnabledModelId,
  seedOpenAIModelId,
} from "./openai-model-matrix";
import { toOpencodeModelId, type ChatProvider } from "./chat-provider";

export type { ChatProvider } from "./chat-provider";
export { toOpencodeModelId, fromOpencodeModelId } from "./chat-provider";

/** TypeSafe's SDK env name — not a Vercel AI Gateway key. */
export function typeSafeApiKey(): string {
  return process.env.TYPESAFE_API_KEY?.trim() ?? "";
}

const DEFAULT_GATEWAY_MODEL = "anthropic/claude-haiku-4.5";
const DEFAULT_OPENCODE_MODEL = "openai/gpt-5-mini";

/** Env default for chat provider (server). Body `provider` can override per request. */
export function defaultChatProvider(): ChatProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === "opencode") return "opencode";
  if (provider === "openai") return "openai";
  if (provider === "gateway") return "gateway";
  if (process.env.OPENAI_API_KEY && !process.env.AI_GATEWAY_API_KEY) {
    return "openai";
  }
  return "gateway";
}

/** Prefer OpenCode when AI_PROVIDER=opencode. */
export function useOpencode(): boolean {
  return defaultChatProvider() === "opencode";
}

/** Prefer OpenAI when AI_PROVIDER=openai, or when only OPENAI_API_KEY is set. */
export function useOpenAI(): boolean {
  return defaultChatProvider() === "openai";
}

/** Initial UI / env seed (enabled matrix id only). */
export function getDefaultOpenAIModelId(): string {
  return seedOpenAIModelId(process.env.OPENAI_MODEL);
}

export function resolveOpenAIModel(modelId?: string) {
  const id = resolveEnabledModelId(modelId ?? getDefaultOpenAIModelId());
  return openai(id);
}

type OpencodeModelOptions = {
  sessionId?: string;
  /**
   * When true, every call gets a fresh OpenCode session.
   * Default: true unless OPENCODE_SHARE_SESSION=1 (lab footgun demo) or sessionId is set.
   */
  createNewSession?: boolean;
  agent?: string;
  systemPrompt?: string;
  directory?: string;
  /** OpenAI matrix id or full `provider/model` catalog id. */
  modelId?: string;
  /**
   * OpenCode prompt `variant` — for GPT-class models, the thinking-effort id
   * (`none` | `minimal` | `low` | `medium` | `high` | `xhigh`). Serve maps it
   * to provider `reasoning_effort` / `reasoningEffort`.
   */
  variant?: string;
};

let _opencode: ReturnType<typeof createOpencode> | null = null;

function getOpencodeProvider() {
  if (_opencode) return _opencode;
  const baseUrl = process.env.OPENCODE_BASE_URL ?? "http://127.0.0.1:4096";
  _opencode = createOpencode({
    baseUrl,
    autoStartServer: false,
  });
  return _opencode;
}

/**
 * Resolve an OpenCode language model.
 *
 * Session binds to the model instance. Prefer createNewSession (default) or an
 * explicit sessionId — never a shared module-scope model without isolation.
 */
export function resolveOpencodeModel(opts?: OpencodeModelOptions) {
  const provider = getOpencodeProvider();
  const modelId = opts?.modelId
    ? toOpencodeModelId(opts.modelId)
    : (process.env.OPENCODE_MODEL ?? DEFAULT_OPENCODE_MODEL);
  const shareSession = process.env.OPENCODE_SHARE_SESSION === "1";
  const createNewSession =
    opts?.sessionId != null ? false : (opts?.createNewSession ?? !shareSession);

  return provider(modelId, {
    sessionId: opts?.sessionId,
    createNewSession,
    agent: opts?.agent ?? process.env.OPENCODE_AGENT,
    systemPrompt: opts?.systemPrompt,
    directory: opts?.directory ?? process.env.OPENCODE_DIRECTORY,
    variant: opts?.variant,
  });
}

export function resolveModel(modelId?: string) {
  if (useOpencode()) {
    return resolveOpencodeModel();
  }
  if (useOpenAI()) {
    return resolveOpenAIModel(modelId);
  }
  return gateway(process.env.AI_GATEWAY_MODEL || DEFAULT_GATEWAY_MODEL);
}
