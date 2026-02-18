import { streamText } from "ai";
import { getVideoPrompt } from "@/lib/catalog";
import { getModel } from "@repo/ai-config";

export const maxDuration = 30;

// Generate prompt from catalog - uses Remotion schema's prompt template with custom rules
const SYSTEM_PROMPT = getVideoPrompt();

const MAX_PROMPT_LENGTH = 500;

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const sanitizedPrompt = String(prompt || "").slice(0, MAX_PROMPT_LENGTH);

  const result = streamText({
    model: getModel(),
    system: SYSTEM_PROMPT,
    prompt: sanitizedPrompt,
    temperature: 0.7,
  });

  return result.toTextStreamResponse();
}
