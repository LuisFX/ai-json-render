import { streamText } from "ai";
import { headers } from "next/headers";
import { buildUserPrompt } from "@json-render/core";
import { getModel } from "@repo/ai-config";
import { minuteRateLimit, dailyRateLimit } from "@/lib/rate-limit";
import { playgroundCatalog } from "@/lib/render/catalog";
import { formSpecCatalog } from "@/lib/render/form-spec-catalog";

export const maxDuration = 30;

function getSystemPrompt(mode?: string) {
  const catalog = mode === "form" ? formSpecCatalog : playgroundCatalog;
  const baseRules =
    mode === "form"
      ? [
          "Use FormSpec components: Step, Form, Stack, Input, Textarea, Radio, Select, Checkbox, CheckboxList, TagList, TextAutoComplete, Matrix, Signature, Message, ReadOnly, ScoreSummary, PluginField, Button.",
          "Wrap the form in Form with submitAction and a Stack of Steps. Use Step for each section; root can be first Step or Stack of Steps. Output /steps with { key, order, label } for each step.",
          "For Input/Textarea: use { $bindState } on value/checked. Add checks for validation (required, email, minLength). Use Input type for email, password, date, number when appropriate.",
          "For choice fields (Radio, Select, CheckboxList, TagList, TextAutoComplete): options use { value, description, optionKey?, score? }. Use score on options for scored forms.",
          "For scored forms: add score to Radio/Select/CheckboxList options. Output /score with { maxScore, ranges: [{ min, max, label, tag }] }. Use tag: success|warning|danger|info|primary. Include ScoreSummary component with currentScore from state.",
          "Use Matrix for Likert/severity scales (items=rows, options=columns). Use Message for validation hints. Use ReadOnly for instructions (collapsible, formatting). Use Signature for consent. Use Button with on.press bound to formSubmit for submit.",
        ]
      : [
          "NEVER use viewport height classes (min-h-screen, h-screen) - the UI renders inside a fixed-size container.",
          "NEVER use page background colors (bg-gray-50) - the container has its own background.",
          "For forms or small UIs: use Card as root with maxWidth:'sm' or 'md' and centered:true.",
          "For content-heavy UIs (blogs, dashboards, product listings): use Stack or Grid as root. Use Grid with 2-3 columns for card layouts.",
          "Wrap each repeated item in a Card for visual separation and structure.",
          "Use realistic, professional sample data. Include 3-5 items with varied content. Never leave state arrays empty.",
          'For form inputs (Input, Textarea, Select), always include checks for validation (e.g. required, email, minLength). Always pair checks with a $bindState expression on the value prop (e.g. { "$bindState": "/path" }).',
          'For multi-step forms: use Step as container for each section. Root can be first Step or a Stack of Steps. Output /steps array with { key, order, label } for each step. Example: {"op":"add","path":"/steps","value":[{"key":"step-1","order":1,"label":"Demographics"},{"key":"step-2","order":2,"label":"Assessment"}]}',
        ];

  return catalog.prompt({
    customRules: baseRules,
  });
}

const MAX_PROMPT_LENGTH = 500;

export async function POST(req: Request) {
  // Get client IP for rate limiting
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";

  // Check rate limits (minute and daily)
  const [minuteResult, dailyResult] = await Promise.all([
    minuteRateLimit.limit(ip),
    dailyRateLimit.limit(ip),
  ]);

  if (!minuteResult.success || !dailyResult.success) {
    const isMinuteLimit = !minuteResult.success;
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: isMinuteLimit
          ? "Too many requests. Please wait a moment before trying again."
          : "Daily limit reached. Please try again tomorrow.",
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { prompt, context } = await req.json();
  const mode = context?.mode;

  const userPrompt = buildUserPrompt({
    prompt,
    currentSpec: context?.previousSpec,
    maxPromptLength: MAX_PROMPT_LENGTH,
  });

  const result = streamText({
    model: getModel(),
    system: getSystemPrompt(mode),
    prompt: userPrompt,
    temperature: 0.7,
  });

  // Stream the text, then append token usage metadata at the end
  const encoder = new TextEncoder();
  const textStream = result.textStream;

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of textStream) {
        controller.enqueue(encoder.encode(chunk));
      }
      // Append usage metadata after stream completes
      try {
        const usage = await result.usage;
        const meta = JSON.stringify({
          __meta: "usage",
          promptTokens: usage.inputTokens,
          completionTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
        });
        controller.enqueue(encoder.encode(`\n${meta}\n`));
      } catch {
        // Usage not available — skip silently
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
