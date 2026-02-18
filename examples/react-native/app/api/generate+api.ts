import { streamText } from "ai";
import { getModel } from "@repo/ai-config";
import { buildUserPrompt } from "@json-render/core";
import { catalog, customRules } from "../../lib/render/catalog";

const SYSTEM_PROMPT = catalog.prompt({ customRules });

const MAX_PROMPT_LENGTH = 500;

// Pass apiKeys explicitly so Expo's Metro bundler inlines process.env refs
const modelEnv =
  process.env.AI_GATEWAY_MODEL ??
  process.env.AI_MODEL ??
  "anthropic/claude-haiku-4.5";

export async function POST(req: Request) {
  console.log("[API] POST /api/generate called");
  console.log("[API] Anthropic key present:", !!process.env.ANTHROPIC_API_KEY);
  console.log("[API] Gateway key present:", !!process.env.AI_GATEWAY_API_KEY);
  console.log("[API] Model:", modelEnv);

  try {
    const { prompt, context } = await req.json();
    console.log("[API] prompt:", prompt);

    const userPrompt = buildUserPrompt({
      prompt,
      currentSpec: context?.previousSpec,
      state: context?.state,
      maxPromptLength: MAX_PROMPT_LENGTH,
    });

    const model = getModel({
      model: modelEnv,
      apiKeys: {
        anthropic: process.env.ANTHROPIC_API_KEY,
        gateway: process.env.AI_GATEWAY_API_KEY,
      },
    });

    console.log("[API] calling streamText");
    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.7,
    });

    console.log("[API] returning text stream response");
    return result.toTextStreamResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("API generate error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
