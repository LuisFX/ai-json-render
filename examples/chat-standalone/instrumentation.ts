/**
 * Next.js instrumentation — Langfuse OTel per
 * https://langfuse.com/integrations/frameworks/vercel-ai-sdk
 *
 * Uses NodeTracerProvider (not @vercel/otel).
 */
import { registerLangfuseOtel } from "@/lib/observability/register";

export { getLangfuseSpanProcessor } from "@/lib/observability/register";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    registerLangfuseOtel();
  }
}
