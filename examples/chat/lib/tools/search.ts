import { tool, generateText, stepCountIs } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { createChatOpenAI } from "../model";

const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";

/**
 * Web search for topics the specialized tools do not cover.
 * OpenAI Responses `webSearch` when `OPENAI_API_KEY` is set; otherwise Perplexity via AI Gateway.
 *
 * The OpenAI provider tool has no `execute` (the Responses API runs it). ToolLoopAgent in
 * `ai@6` only accepts user tools, so this wrapper calls `generateText` with that provider
 * tool rather than hanging `openai.tools.webSearch()` on the agent.
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
      const openai = createChatOpenAI();
      if (openai) {
        const { text } = await generateText({
          model: openai(
            process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
          ),
          tools: { web_search: openai.tools.webSearch() },
          prompt: query,
          stopWhen: stepCountIs(3),
        } as Parameters<typeof generateText>[0]);
        return { content: text };
      }
      if (process.env.AI_GATEWAY_API_KEY?.trim()) {
        const { text } = await generateText({
          model: gateway("perplexity/sonar"),
          prompt: query,
        });
        return { content: text };
      }
      return {
        error: "Web search needs OPENAI_API_KEY or AI_GATEWAY_API_KEY.",
      };
    } catch (error) {
      return {
        error: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
