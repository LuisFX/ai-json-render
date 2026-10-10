import {
  observe,
  propagateAttributes,
  updateActiveTrace,
} from "@langfuse/tracing";
import { after } from "next/server";

import { flushLangfuse } from "@/lib/observability/langfuse";
import { isLangfuseEnabled } from "@/lib/observability/telemetry";

export type LangfuseTraceContext = {
  traceName: string;
  sessionId?: string;
  userId?: string;
  tags?: string[];
  input?: unknown;
  output?: unknown;
};

/**
 * Next.js route wrapper — `observe()` trace + `after(forceFlush)` per
 * https://langfuse.com/integrations/frameworks/vercel-ai-sdk
 */
export function wrapLangfuseRoute(
  handler: (req: Request) => Promise<Response>,
  observeName: string,
): (req: Request) => Promise<Response> {
  const run = async (req: Request): Promise<Response> => {
    if (isLangfuseEnabled()) {
      after(async () => {
        await flushLangfuse();
      });
    }
    return handler(req);
  };

  if (!isLangfuseEnabled()) return run;

  return observe(run, { name: observeName, endOnExit: false });
}

/**
 * Groups AI SDK spans under one Langfuse trace with session/user/tags.
 * Call around each request's LLM work.
 */
export async function withLangfuseTrace<T>(
  ctx: LangfuseTraceContext,
  fn: () => Promise<T>,
): Promise<T> {
  if (!isLangfuseEnabled()) return fn();

  return propagateAttributes(
    {
      traceName: ctx.traceName,
      sessionId: ctx.sessionId,
      userId: ctx.userId,
      tags: ctx.tags,
    },
    async () => {
      if (ctx.input !== undefined) {
        updateActiveTrace({ input: ctx.input });
      }
      try {
        return await fn();
      } finally {
        if (ctx.output !== undefined) {
          updateActiveTrace({ output: ctx.output });
        }
      }
    },
  );
}
