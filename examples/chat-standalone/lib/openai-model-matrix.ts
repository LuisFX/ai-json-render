/**
 * Code-owned OpenAI model matrix for chat selectors.
 * Flip `enabled` / edit `efforts` here — UI and server both read this.
 *
 * @see https://developers.openai.com/api/docs/models/all
 * @see https://developers.openai.com/api/docs/guides/reasoning
 */

export const REASONING_EFFORTS = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export type OpenAIModelRow = {
  id: string;
  label: string;
  enabled: boolean;
  /** Empty => hide reasoning selector for this model. */
  efforts: ReasoningEffort[];
  defaultEffort: ReasoningEffort | null;
  streaming: boolean;
};

export const DEFAULT_OPENAI_MODEL_ID = "gpt-5.4-mini";

const MODERN: ReasoningEffort[] = ["none", "low", "medium", "high", "xhigh"];

const GPT5_LEGACY: ReasoningEffort[] = ["minimal", "low", "medium", "high"];

const PRO_EFFORTS: ReasoningEffort[] = ["medium", "high", "xhigh"];

export const OPENAI_MODEL_MATRIX: OpenAIModelRow[] = [
  {
    id: "gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    enabled: true,
    efforts: MODERN,
    defaultEffort: "medium",
    streaming: true,
  },
  {
    id: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    enabled: true,
    efforts: MODERN,
    defaultEffort: "medium",
    streaming: true,
  },
  {
    id: "gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    enabled: true,
    efforts: MODERN,
    defaultEffort: "medium",
    streaming: true,
  },
  {
    id: "gpt-5.5",
    label: "GPT-5.5",
    enabled: true,
    efforts: MODERN,
    defaultEffort: "medium",
    streaming: true,
  },
  {
    id: "gpt-5.5-pro",
    label: "GPT-5.5 Pro",
    enabled: false,
    efforts: PRO_EFFORTS,
    defaultEffort: "high",
    streaming: false,
  },
  {
    id: "gpt-5.4",
    label: "GPT-5.4",
    enabled: true,
    efforts: MODERN,
    defaultEffort: "none",
    streaming: true,
  },
  {
    id: "gpt-5.4-pro",
    label: "GPT-5.4 Pro",
    enabled: false,
    efforts: PRO_EFFORTS,
    defaultEffort: "medium",
    streaming: true,
  },
  {
    id: "gpt-5.4-mini",
    label: "GPT-5.4 mini",
    enabled: true,
    efforts: MODERN,
    defaultEffort: "none",
    streaming: true,
  },
  {
    id: "gpt-5.4-nano",
    label: "GPT-5.4 nano",
    enabled: true,
    efforts: MODERN,
    defaultEffort: "none",
    streaming: true,
  },
  {
    id: "gpt-5.3-codex",
    label: "GPT-5.3 Codex",
    enabled: true,
    efforts: ["low", "medium", "high", "xhigh"],
    defaultEffort: "medium",
    streaming: true,
  },
  {
    id: "gpt-5.2",
    label: "GPT-5.2",
    enabled: true,
    efforts: MODERN,
    defaultEffort: "none",
    streaming: true,
  },
  {
    id: "gpt-5",
    label: "GPT-5",
    enabled: true,
    efforts: GPT5_LEGACY,
    defaultEffort: "medium",
    streaming: true,
  },
  {
    id: "gpt-5-pro",
    label: "GPT-5 Pro",
    enabled: false,
    efforts: ["high"],
    defaultEffort: "high",
    streaming: true,
  },
  {
    id: "gpt-5-mini",
    label: "GPT-5 mini",
    enabled: true,
    efforts: GPT5_LEGACY,
    defaultEffort: "medium",
    streaming: true,
  },
  {
    id: "gpt-5-nano",
    label: "GPT-5 nano",
    enabled: true,
    efforts: GPT5_LEGACY,
    defaultEffort: "medium",
    streaming: true,
  },
];

export function getModelRow(
  id: string | undefined | null,
): OpenAIModelRow | undefined {
  if (!id) return undefined;
  return OPENAI_MODEL_MATRIX.find((row) => row.id === id);
}

export function getEnabledOpenAIModels(): OpenAIModelRow[] {
  return OPENAI_MODEL_MATRIX.filter((row) => row.enabled);
}

export function isEnabledOpenAIModel(id: string | undefined | null): boolean {
  return Boolean(getModelRow(id)?.enabled);
}

/** Resolve an enabled model id; fall back to DEFAULT_OPENAI_MODEL_ID. */
export function resolveEnabledModelId(modelId?: string | null): string {
  if (isEnabledOpenAIModel(modelId)) return modelId!;
  return DEFAULT_OPENAI_MODEL_ID;
}

/**
 * Seed initial UI selection from env if that id is enabled; else default.
 */
export function seedOpenAIModelId(envModel?: string | null): string {
  if (isEnabledOpenAIModel(envModel)) return envModel!;
  return DEFAULT_OPENAI_MODEL_ID;
}

/**
 * Clamp effort to the model's allowed set (or default).
 * Returns null when the model has no reasoning efforts.
 */
export function clampEffort(
  modelId: string | undefined | null,
  effort: string | undefined | null,
): ReasoningEffort | null {
  const row = getModelRow(resolveEnabledModelId(modelId));
  if (!row || row.efforts.length === 0) return null;
  if (effort && row.efforts.includes(effort as ReasoningEffort)) {
    return effort as ReasoningEffort;
  }
  return row.defaultEffort;
}
