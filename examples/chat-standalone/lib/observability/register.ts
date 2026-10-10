import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

let langfuseSpanProcessor: LangfuseSpanProcessor | null = null;
let registered = false;

function hasLangfuseKeys(): boolean {
  return !!(
    process.env.LANGFUSE_SECRET_KEY?.trim() &&
    process.env.LANGFUSE_PUBLIC_KEY?.trim()
  );
}

/** Lazy — only constructed when project API keys are set (avoids SDK warnings on startup). */
export function getLangfuseSpanProcessor(): LangfuseSpanProcessor | null {
  if (!hasLangfuseKeys()) return null;
  if (!langfuseSpanProcessor) {
    langfuseSpanProcessor = new LangfuseSpanProcessor();
  }
  return langfuseSpanProcessor;
}

/** Register Langfuse OTel once per Node process (Next.js `instrumentation.ts`). */
export function registerLangfuseOtel(): void {
  if (registered) return;
  const processor = getLangfuseSpanProcessor();
  if (!processor) return;

  const tracerProvider = new NodeTracerProvider({
    spanProcessors: [processor],
  });
  tracerProvider.register();
  registered = true;
}
