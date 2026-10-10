/** Client-safe chat provider helpers — no OpenCode SDK imports. */

export type ChatProvider = "openai" | "opencode" | "gateway";

/** Map matrix id (`gpt-5.4-mini`) → OpenCode catalog id (`openai/gpt-5.4-mini`). */
export function toOpencodeModelId(modelId: string): string {
  if (modelId.includes("/")) return modelId;
  return `openai/${modelId}`;
}

/** Strip `openai/` prefix for UI matrix selection. */
export function fromOpencodeModelId(modelId: string): string {
  return modelId.startsWith("openai/")
    ? modelId.slice("openai/".length)
    : modelId;
}
