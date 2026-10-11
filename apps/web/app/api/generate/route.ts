import { streamText } from "ai";
import { headers } from "next/headers";
import { buildUserPrompt } from "@json-render/core";
import { getModel } from "@repo/ai-config";
import { minuteRateLimit, dailyRateLimit } from "@/lib/rate-limit";
import { playgroundCatalog } from "@/lib/render/catalog";
import { formSpecCatalog } from "@/lib/render/form-spec-catalog";

/**
 * Form mode system prompt rules. Reference: prompts/form-spec-generation.md
 * Goal: output JSON convertible to F# FormSpec (compatibility, not exactness).
 */
const FORM_SPEC_RULES = [
  "Use FormSpec components: Step, Form, Stack, Input, Textarea, Radio, Select, Checkbox, CheckboxList, TagList, TextAutoComplete, Matrix, Signature, Message, ReadOnly, ScoreSummary, PluginField, Button.",
  "Wrap the form in Form with submitAction and a Stack of Steps. Use Step for each section; root can be first Step or Stack of Steps.",
  'CRITICAL: Every key in a children array MUST have a corresponding element patch. If you add phq9-matrix to children, you MUST output {"op":"add","path":"/elements/phq9-matrix","value":{...}}. Never reference a child without outputting its element patch.',
  'For multi-step forms: output {"op":"add","path":"/steps","value":[{"key":"step-1","order":1,"label":"Demographics"},{"key":"step-2","order":2,"label":"Assessment"}]} after /root.',
  "For Input/Textarea: use { $bindState } on value/checked. Add checks for validation (required, email, minLength). Use Input type for email, password, date, number when appropriate.",
  "For choice fields (Radio, Select, CheckboxList, TagList, TextAutoComplete): options use { value, description, optionKey?, score? }. Use score on options for scored forms.",
  'For scored forms: add score to Radio/Select/CheckboxList/Matrix options. Output {"op":"add","path":"/score","value":{"maxScore":27,"ranges":[{"min":0,"max":4,"label":"Minimal","tag":"success"},{"min":5,"max":9,"label":"Mild","tag":"info"}]}} after /steps. Use tag: success|info|warning|danger|primary. Include ScoreSummary with currentScore: { $state: "/phq9/totalScore" }.',
  'Use Matrix for Likert/severity scales (items=rows, options=columns). For PHQ-9: output the Matrix element patch. Items: 9 rows (little-interest, feeling-down, sleep, tired, appetite, self-worth, concentration, slow-or-fast, suicidal). Options: value 0-3, score 0-3. value: { $bindState: "/phq9/responses" }. State: /phq9/responses {}, /phq9/totalScore 0. Items use { value, description } or { key, label }.',
  'Submit Button MUST use on.press with action formSubmit, NOT setState. Example: on: { press: { action: "formSubmit", params: {} } }.',
  'For PHQ-9: use state path /phq9/responses (object) and /phq9/totalScore (number). ScoreSummary currentScore: { $state: "/phq9/totalScore" }.',
  'For PHQ-9 with refusal: use 4 Steps (Patient Screening, Depression Symptom Assessment, Functional Impairment, Scoring). Step 1: Refusal Radio + Message. Steps 2-4: visible: { $state: "/refusal", eq: "no" }. Refusal Radio: options yes/no, value: { $bindState: "/refusal" }.',
  'Use visible: { $state: "/path", eq: "value" } to show/hide sections conditionally (e.g. hide assessment when patient refused: visible when refusal=no).',
  'For clinical pathways: output {"op":"add","path":"/clinicalPathway","value":{...}} after /score. Reference element keys as field refs (refusal-radio, phq9-matrix). Actions: referral, task, alert, medication, education.',
  "PHQ-9 pathway GOALPOST: initialState state-refusal-check. States (in order): state-refusal-check (evaluation), state-phq9-collect (evaluation), state-impairment (evaluation), state-calc-score (evaluation), state-suicidal-check (evaluation), state-suicidal-alert (action/alert), state-classify (evaluation), state-minimal (action/education), state-mild (action/task), state-moderate (action/medication), state-moderately-severe (action/referral), state-severe (action/referral), state-declined (terminal), state-complete (terminal), state-escalated (terminal). Transitions: refusal-radio=no -> state-phq9-collect; refusal-radio=yes -> state-declined; always -> state-impairment, state-calc-score, state-suicidal-check; matrixItem phq9-matrix suicidal NotEquals 0 -> state-suicidal-alert (priority 1); matrixItem phq9-matrix suicidal Equals 0 -> state-classify (priority 2); state-suicidal-alert -> state-escalated; fieldScoreInRange phq9-matrix [0,4]->state-minimal, [5,9]->state-mild, [10,14]->state-moderate, [15,19]->state-moderately-severe, [20,27]->state-severe; minimal/mild/moderate -> state-complete; moderately-severe/severe -> state-escalated.",
];

export const maxDuration = 30;

function getSystemPrompt(mode?: string) {
  const catalog = mode === "form" ? formSpecCatalog : playgroundCatalog;
  const baseRules =
    mode === "form"
      ? FORM_SPEC_RULES
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
