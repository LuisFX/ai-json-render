import { tool, generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { resolveModel, useOpenAI } from "../model";

/**
 * Web search tool.
 *
 * - AI Gateway: Perplexity Sonar (built-in internet access + citations)
 * - OpenAI: same chat model (no Perplexity without a gateway key)
 *
 * Wrapped as a regular tool (with `execute`) so ToolLoopAgent can loop:
 * it calls the model, gets results, and feeds them back for the next step.
 */
export const webSearch = tool({
  description:
    "Search the web for current information on any topic. Use this when the user asks about something not covered by the specialized tools (weather, crypto, GitHub, Hacker News). Returns a synthesized answer based on real-time web data.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The search query — be specific and include relevant context for better results",
      ),
  }),
  execute: async ({ query }) => {
    try {
      if (useOpenAI()) {
        const { text } = await generateText({
          model: resolveModel(),
          system:
            "Answer the research query clearly and specifically. Prefer concrete facts and numbers when available.",
          prompt: query,
        });
        return { content: text };
      }

      const { text } = await generateText({
        model: gateway("perplexity/sonar"),
        prompt: query,
      });
      return { content: text };
    } catch (error) {
      return {
        error: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
