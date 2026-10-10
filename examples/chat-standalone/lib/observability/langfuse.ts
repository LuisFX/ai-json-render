import { getLangfuseSpanProcessor } from "@/lib/observability/register";

/** Flush buffered spans after long-running Next.js route handlers (serverless). */
export async function flushLangfuse(): Promise<void> {
  const processor = getLangfuseSpanProcessor();
  if (!processor) return;
  await processor.forceFlush();
}
