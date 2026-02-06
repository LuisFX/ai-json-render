import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a UI generator that outputs JSONL (JSON Lines) patches.

AVAILABLE COMPONENTS (22):

Layout:
- Card: { title?: string, description?: string, maxWidth?: "sm"|"md"|"lg"|"full", centered?: boolean } - Container card for content sections. Has children. Use for forms/content boxes, NOT for page headers.
- Stack: { direction?: "horizontal"|"vertical", gap?: "sm"|"md"|"lg" } - Flex container. Has children.
- Grid: { columns?: 2|3|4, gap?: "sm"|"md"|"lg" } - Grid layout. Has children. ALWAYS use mobile-first: set columns:1 and use className for larger screens.
- Divider: {} - Horizontal separator line

Form Inputs:
- Input: { label: string, name: string, type?: "text"|"email"|"password"|"number", placeholder?: string } - Text input
- Textarea: { label: string, name: string, placeholder?: string, rows?: number } - Multi-line text
- Select: { label: string, name: string, options: string[], placeholder?: string } - Dropdown select
- Checkbox: { label: string, name: string, checked?: boolean } - Checkbox input
- Radio: { label: string, name: string, options: string[] } - Radio button group
- Switch: { label: string, name: string, checked?: boolean } - Toggle switch

Actions:
- Button: { label: string, variant?: "primary"|"secondary"|"danger", actionText?: string } - Clickable button. actionText is shown in toast on click (defaults to label)
- Link: { label: string, href: string } - Anchor link

Typography:
- Heading: { text: string, level?: 1|2|3|4 } - Heading text (h1-h4)
- Text: { content: string, variant?: "body"|"caption"|"muted" } - Paragraph text

Data Display:
- Image: { src: string, alt: string, width?: number, height?: number } - Image
- Avatar: { src?: string, name: string, size?: "sm"|"md"|"lg" } - User avatar with fallback initials
- Badge: { text: string, variant?: "default"|"success"|"warning"|"danger" } - Status badge
- Alert: { title: string, message?: string, type?: "info"|"success"|"warning"|"error" } - Alert banner
- Progress: { value: number, max?: number, label?: string } - Progress bar (value 0-100)
- Rating: { value: number, max?: number, label?: string } - Star rating display

Charts:
- BarGraph: { title?: string, data: Array<{label: string, value: number}> } - Vertical bar chart
- LineGraph: { title?: string, data: Array<{label: string, value: number}> } - Line chart with points

OUTPUT FORMAT (JSONL):
{"op":"set","path":"/root","value":"element-key"}
{"op":"add","path":"/elements/key","value":{"key":"...","type":"...","props":{...},"children":[...]}}

ALL COMPONENTS support: className?: string[] - array of Tailwind classes for custom styling

RULES:
1. First line sets /root to root element key
2. Add elements with /elements/{key}
3. Children array contains string keys, not objects
4. Parent first, then children
5. Each element needs: key, type, props
6. Use className for custom Tailwind styling when needed

FORBIDDEN CLASSES (NEVER USE):
- min-h-screen, h-screen, min-h-full, h-full, min-h-dvh, h-dvh - viewport heights break the small render container
- bg-gray-50, bg-slate-50 or any page background colors - container already has background

MOBILE-FIRST RESPONSIVE:
- ALWAYS design mobile-first. Single column on mobile, expand on larger screens.
- Grid: Use columns:1 prop, add className:["sm:grid-cols-2"] or ["md:grid-cols-3"] for larger screens
- DO NOT put page headers/titles inside Card - use Stack with Heading directly
- Horizontal stacks that may overflow should use className:["flex-wrap"]
- For forms (login, signup, contact): Card should be the root element, NOT wrapped in a centering Stack

EXAMPLE (Blog with responsive grid):
{"op":"set","path":"/root","value":"page"}
{"op":"add","path":"/elements/page","value":{"key":"page","type":"Stack","props":{"direction":"vertical","gap":"lg"},"children":["header","posts"]}}
{"op":"add","path":"/elements/header","value":{"key":"header","type":"Stack","props":{"direction":"vertical","gap":"sm"},"children":["title","desc"]}}
{"op":"add","path":"/elements/title","value":{"key":"title","type":"Heading","props":{"text":"My Blog","level":1}}}
{"op":"add","path":"/elements/desc","value":{"key":"desc","type":"Text","props":{"content":"Latest posts","variant":"muted"}}}
{"op":"add","path":"/elements/posts","value":{"key":"posts","type":"Grid","props":{"columns":1,"gap":"md","className":["sm:grid-cols-2","lg:grid-cols-3"]},"children":["post1"]}}
{"op":"add","path":"/elements/post1","value":{"key":"post1","type":"Card","props":{"title":"Post Title"},"children":["excerpt"]}}
{"op":"add","path":"/elements/excerpt","value":{"key":"excerpt","type":"Text","props":{"content":"Post content...","variant":"body"}}}

Generate JSONL:`;

const MAX_PROMPT_LENGTH = 500;

export async function POST(req: Request) {
  const { prompt, context } = await req.json();
  const previousTree = context?.previousTree;

  const sanitizedPrompt = String(prompt || "").slice(0, MAX_PROMPT_LENGTH);

  // Build the user prompt, including previous tree for iteration
  let userPrompt = sanitizedPrompt;
  if (
    previousTree &&
    previousTree.root &&
    Object.keys(previousTree.elements || {}).length > 0
  ) {
    userPrompt = `CURRENT UI STATE (already loaded, DO NOT recreate existing elements):
${JSON.stringify(previousTree, null, 2)}

USER REQUEST: ${sanitizedPrompt}

IMPORTANT: The current UI is already loaded. Output ONLY the patches needed to make the requested change:
- To add a new element: {"op":"add","path":"/elements/new-key","value":{...}}
- To modify an existing element: {"op":"set","path":"/elements/existing-key","value":{...}}
- To update the root: {"op":"set","path":"/root","value":"new-root-key"}
- To add children: update the parent element with new children array

DO NOT output patches for elements that don't need to change. Only output what's necessary for the requested modification.`;
  }

  const model = anthropic(
    process.env.AI_GATEWAY_MODEL || "claude-3-5-sonnet-20241022",
  );

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.7,
  });

  return result.toTextStreamResponse();
}
