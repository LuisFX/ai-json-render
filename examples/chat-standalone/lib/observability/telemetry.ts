/**
 * Pure AI SDK telemetry-settings builder. Enablement is env-only; span EXPORT is
 * wired app-side (instrumentation + flushLangfuse).
 */
export type AiTelemetrySettings = {
  isEnabled: true;
  functionId: string;
  metadata?: Record<string, string | number | boolean | string[]>;
};

export function isLangfuseEnabled(): boolean {
  if (process.env.AI_TELEMETRY === "0") return false;
  return !!(
    process.env.LANGFUSE_SECRET_KEY?.trim() &&
    process.env.LANGFUSE_PUBLIC_KEY?.trim()
  );
}

export type AiTelemetryContext = {
  /** Maps to AI SDK `functionId` — shown as the span name in Langfuse. */
  functionId: string;
  sessionId?: string;
  userId?: string;
  tags?: string[];
  metadata?: Record<string, string | number | boolean>;
};

/**
 * Vercel AI SDK telemetry for Langfuse. Session/user grouping is handled by
 * `withLangfuseTrace` (`propagateAttributes`); this tags each generation span
 * with `functionId` + optional metadata.
 */
export function aiTelemetry(
  ctx: AiTelemetryContext,
): AiTelemetrySettings | undefined {
  if (!isLangfuseEnabled()) return undefined;

  const metadata: Record<string, string | number | boolean | string[]> = {
    ...ctx.metadata,
  };
  if (ctx.tags?.length) metadata.tags = ctx.tags;

  return {
    isEnabled: true,
    functionId: ctx.functionId,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}
