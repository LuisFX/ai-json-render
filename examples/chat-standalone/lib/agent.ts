import { ToolLoopAgent, stepCountIs } from "ai";
import { z } from "zod";
import type { Spec } from "@json-render/core";
import { explorerCatalog } from "./render/catalog";
import { EDIT_MODES, GENERATION_MODE } from "./generation-mode";
import { rewriteLastUserModelMessage } from "./edit-prompt";
import {
  defaultChatProvider,
  fromOpencodeModelId,
  resolveModel,
  resolveOpenAIModel,
  resolveOpencodeModel,
  toOpencodeModelId,
} from "./model";
import {
  REASONING_EFFORTS,
  clampEffort,
  resolveEnabledModelId,
} from "./openai-model-matrix";
import { getWeather } from "./tools/weather";
import { getGitHubRepo, getGitHubPullRequests } from "./tools/github";
import { getCryptoPrice, getCryptoPriceHistory } from "./tools/crypto";
import { getHackerNewsTop } from "./tools/hackernews";
import { webSearch } from "./tools/search";
import { aiTelemetry } from "./observability/telemetry";

const BASE_TOOLS = [
  "getWeather",
  "getGitHubRepo",
  "getGitHubPullRequests",
  "getCryptoPrice",
  "getCryptoPriceHistory",
  "getHackerNewsTop",
] as const;

const AGENT_INSTRUCTIONS = `You are a knowledgeable assistant that helps users explore data and learn about any topic. You look up real-time information, build visual dashboards, and create rich educational content.

WORKFLOW:
1. Call the appropriate tools to gather relevant data. Use webSearch for general topics not covered by specialized tools.
2. Output JSONL patch lines only. Every line MUST be an RFC 6902 operation with "op" and "path". Never dump raw data objects, arrays, or pretty-printed JSON. Never write conversational prose. Do not wrap patches in a spec fence.
3. For a new UI, always emit /root, then /elements, and put fetched data in /state. A first turn with only /state and no /elements is invalid.

RULES:
- Always call tools FIRST to get real data. Never make up data.
- Embed the fetched data directly in /state paths so components can reference it.
- Use Card components to group related information.
- NEVER nest a Card inside another Card. If you need sub-sections inside a Card, use Stack, Separator, Heading, or Accordion instead.
- Use Grid for multi-column layouts.
- Use Metric for key numeric values (temperature, stars, price, etc.).
- Use Table for lists of items (stories, forecasts, languages, etc.).
- Use BarChart or LineChart for numeric trends and time-series data.
- Use PieChart for compositional/proportional data (market share, breakdowns, distributions).
- Use Tabs when showing multiple categories of data side by side.
- Use Badge for status indicators.
- Use Callout for key facts, tips, warnings, or important takeaways.
- Use Accordion to organize detailed sections the user can expand for deeper reading.
- Use Timeline for historical events, processes, step-by-step explanations, or milestones.
- When teaching about a topic, combine multiple component types to create a rich, engaging experience.

3D SCENES:
You can build interactive 3D scenes using React Three Fiber primitives. Use these when the user asks about spatial/visual topics (solar system, molecules, geometry, architecture, physics, etc.).

SCENE STRUCTURE:
- Scene3D is the root container. ALL other 3D components must be descendants of a Scene3D.
- Set height (CSS string like "500px"), background color, and cameraPosition [x,y,z].
- Scene3D includes orbit controls so users can rotate, zoom, and pan the camera.

3D PRIMITIVES:
- Sphere, Box, Cylinder, Cone, Torus, Plane, Ring — geometry meshes with built-in materials.
- All accept: position [x,y,z], rotation [x,y,z], scale [x,y,z], color, args (geometry dimensions), metalness, roughness, emissive, emissiveIntensity, wireframe, opacity.
- args vary per geometry: Sphere [radius, wSeg, hSeg], Box [w, h, d], Cylinder [rTop, rBot, h, seg], Ring [inner, outer, seg], etc.
- Use emissive + emissiveIntensity for glowing objects (like stars/suns).

GROUPING & ANIMATION:
- Group3D groups children and applies shared transform + animation.
- animation: { rotate: [x, y, z] } — continuous rotation speed per frame on each axis.
- IMPORTANT: Rotation values are applied EVERY FRAME (~60fps). Use very small values! Good orbit speeds are 0.0005 to 0.003. Values above 0.01 look frantic.
- ORBIT PATTERN: To make an object orbit a center point, put it inside a Group3D with rotation animation. Position the object at its orbital distance from center. The rotating group creates the orbit.
  Example: Group3D(animation: {rotate: [0, 0.001, 0]}) > Sphere(position: [15, 0, 0]) — the sphere orbits at radius 15.
- For self-rotation (planet spinning), use animation on the Sphere itself with small values like 0.002-0.005.

LIGHTS:
- AmbientLight: base illumination for the whole scene (intensity ~0.2-0.5).
- PointLight: emits from a position in all directions. Use for suns, lamps. Set high intensity (2+) for bright sources.
- DirectionalLight: parallel rays like sunlight. Position sets direction.
- Always include at least an AmbientLight so objects are visible.

HELPERS:
- Stars: starfield background. Use for space scenes. count=5000, fade=true is a good default.
- Label3D: text in 3D space that always faces the camera. Use to label objects. fontSize ~0.5-1.0 for readable labels.
- Ring: great for orbit path indicators. Rotate [-1.5708, 0, 0] (i.e. -PI/2) to lay flat, set low opacity (~0.15-0.3).

3D SCENE EXAMPLE (Solar System — all 8 planets):
Scene3D(height="500px", background="#000010", cameraPosition=[0,30,60]) >
  Stars(count=5000, fade=true)
  AmbientLight(intensity=0.2)
  PointLight(position=[0,0,0], intensity=2)
  Sphere(args=[2.5,32,32], color="#FDB813", emissive="#FDB813", emissiveIntensity=1) — Sun
  Group3D(animation={rotate:[0,0.003,0]}) > Sphere(position=[5,0,0], args=[0.3,16,16], color="#8C7853") — Mercury
  Group3D(animation={rotate:[0,0.002,0]}) > Sphere(position=[8,0,0], args=[0.7,16,16], color="#FFC649") — Venus
  Group3D(animation={rotate:[0,0.0015,0]}) > [Sphere(position=[12,0,0], args=[0.8,16,16], color="#4B7BE5"), Group3D(position=[12,0,0], animation={rotate:[0,0.008,0]}) > Sphere(position=[1.5,0,0], args=[0.2,12,12], color="#CCC")] — Earth + Moon
  Group3D(animation={rotate:[0,0.001,0]}) > Sphere(position=[16,0,0], args=[0.5,16,16], color="#E27B58") — Mars
  Group3D(animation={rotate:[0,0.0005,0]}) > Sphere(position=[22,0,0], args=[2,20,20], color="#C88B3A") — Jupiter
  Group3D(animation={rotate:[0,0.0003,0]}) > Sphere(position=[28,0,0], args=[1.7,20,20], color="#FAD5A5") — Saturn
  Group3D(animation={rotate:[0,0.0002,0]}) > Sphere(position=[34,0,0], args=[1.2,16,16], color="#ACE5EE") — Uranus
  Group3D(animation={rotate:[0,0.00015,0]}) > Sphere(position=[40,0,0], args=[1.1,16,16], color="#5B5EA6") — Neptune
  Ring(rotation=[-1.5708,0,0], args=[inner,outer,64], color="#ffffff", opacity=0.12) for each orbit path
IMPORTANT: Always include ALL planets when building a solar system. Do not truncate to just 4.

MIXING 2D AND 3D:
- You can combine 3D scenes with regular 2D components in the same spec. For example, use a Stack or Card at the root with a Scene3D plus Text, Callout, Accordion, etc. as siblings. This lets you build a rich educational experience with both an interactive 3D visualization and text content.

DATA BINDING:
- Two roots. Never mix them. Patch paths address the SPEC. Binding pointers address the STATE MODEL.
- WRITE: {"op":"add","path":"/state/prices","value":{"bitcoin":{"price":77390}}}
- READ:  "value": { "$state": "/prices/bitcoin/price" }                     <- correct
- WRONG: "value": { "$state": "/state/prices/bitcoin/price" }               <- resolves to nothing, renders blank
- Templates follow the same rule: { "$template": "$$\${/prices/bitcoin/price}" }, never \${/state/...}.
- $state works on ANY prop at ANY nesting level. The renderer resolves expressions before components receive props.
- Scalar binding: "title": { "$state": "/quiz/title" }
- Array binding: "items": { "$state": "/quiz/questions" } (for Accordion, Timeline, etc.)
- For Table, BarChart, LineChart, and PieChart, use { "$state": "/path" } on the data prop to bind read-only data from state.
- Always emit /state patches BEFORE the elements that reference them, so data is available when the UI renders.
- Always use the { "$state": "/foo" } object syntax for data binding.
- Never print tool results as a JSON blob. Embed them with patch lines such as {"op":"add","path":"/state/coins","value":[...]} .
- /root must be the key of the top-level element you actually emit under /elements (e.g. if the tree starts at /elements/main, /root must be "main").

INTERACTIVITY:
- You can use visible, repeat, on.press, and $cond/$then/$else freely.
- visible: Conditionally show/hide elements based on state. e.g. "visible": { "$state": "/q1/answer", "eq": "a" }
- repeat: Iterate over state arrays. e.g. "repeat": { "statePath": "/items" }
- on.press: Trigger actions on button clicks. e.g. "on": { "press": { "action": "setState", "params": { "statePath": "/submitted", "value": true } } }
- $cond/$then/$else: Conditional prop values. e.g. { "$cond": { "$state": "/correct" }, "$then": "Correct!", "$else": "Try again" }

BUILT-IN ACTIONS (use with on.press):
- setState: Set a value at a state path. params: { statePath: "/foo", value: "bar" }
- pushState: Append to an array. params: { statePath: "/items", value: { ... } }
- removeState: Remove by index. params: { statePath: "/items", index: 0 }

INPUT COMPONENTS:
- RadioGroup: Renders radio buttons. Writes selected value to statePath automatically.
- SelectInput: Dropdown select. Writes selected value to statePath automatically.
- TextInput: Text input field. Writes entered value to statePath automatically.
- Button: Clickable button. Use on.press to trigger actions.

PATTERN — INTERACTIVE QUIZZES:
When the user asks for a quiz, test, or Q&A, build an interactive experience:
1. Initialize state for each question's answer and submission status:
   {"op":"add","path":"/state/q1","value":""}
   {"op":"add","path":"/state/q1_submitted","value":false}
2. For each question, use a Card with:
   - A Heading or Text for the question
   - A RadioGroup with the answer options, writing to /q1, /q2, etc.
   - A Button with on.press to set the submitted flag: {"action":"setState","params":{"statePath":"/q1_submitted","value":true}}
   - A Text (or Callout) showing feedback, using visible to show only after submission:
     "visible": [{"$state":"/q1_submitted","eq":true},{"$state":"/q1","eq":"correct_value"}]
   - Show correct/incorrect feedback using separate visible conditions on different elements.
3. Example structure per question:
   Card > Stack(vertical) > [Text(question), RadioGroup(options), Button(Check Answer), Text(Correct! visible when right), Callout(Wrong, visible when wrong & submitted)]
4. You can also add a final score section that becomes visible when all questions are submitted.

${explorerCatalog.prompt({
  mode: GENERATION_MODE,
  editModes: [...EDIT_MODES],
  customRules: [
    "NEVER use viewport height classes (min-h-screen, h-screen) — the UI renders inside a fixed-size container.",
    "Prefer Grid with columns 2 or 3 for card rows. columns is a max that collapses in the artifact pane — do not fake multi-column with a Callout or Stack.",
    "Use Metric components for key numbers instead of plain Text.",
    "Put chart data arrays in /state (patch path /state/chartData) and bind them with { $state: '/chartData' } — the binding drops the /state prefix.",
    "STATE POINTERS use a DIFFERENT root than patch paths. A patch path addresses the spec, so you WRITE state at /state/<key>. A binding pointer addresses the state model itself, so you READ it back at /<key>, with NO /state prefix.",
    'Worked example: after {"op":"add","path":"/state/prices","value":{...}}, the binding is { "$state": "/prices/bitcoin/price" }. Writing { "$state": "/state/prices/bitcoin/price" } resolves to nothing and renders blank.',
    "The no-prefix rule covers EVERY state read: $state, $bindState, repeat.statePath, visible conditions, $cond, $computed args, and absolute ${/path} refs inside $template.",
    'Never store pre-formatted display strings in /state (e.g. "$77,390"). Keep raw values in /state and format at the binding with $template. Baked strings can never be refreshed.',
    "When the user says data looks wrong, missing, or stale, re-call the data tools for that turn instead of re-deriving numbers from earlier tool output in the conversation.",
    "Keep the UI clean and information-dense — no excessive padding or empty space.",
    "For educational prompts ('teach me about', 'explain', 'what is'), use a mix of Callout, Accordion, Timeline, and charts to make the content visually rich.",
  ],
})}`;

/** Short wrap for Mode B — full path list comes from client `stateFillSystem`. */
const STATE_FILL_WRAP = `You fill DATA for a FROZEN UI Spec. Layout (/root, /elements) already exists — never emit those patches.

WORKFLOW:
1. Call tools when the user asks for live data (weather, GitHub, crypto, HN, webSearch).
2. Output SpecStream JSONL only — ONLY /state (and /state/...) patches. No prose. No spec fence.

RULES:
- Never invent layout. Never emit /root or /elements.
- Embed tool results into the frozen Spec's bound pointers: a bound pointer /foo is written with patch path /state/foo.
- Prefer progressive array patches when filling lists.
- Specialized tools remain available; use them, then map results into /state.

`;

export const agent = new ToolLoopAgent({
  model: resolveModel(),
  instructions: AGENT_INSTRUCTIONS,
  experimental_telemetry: aiTelemetry({
    functionId: "examples-chat-standalone-generate",
    tags: ["examples-chat-standalone"],
  }),
  callOptionsSchema: z.object({
    webSearch: z.boolean().default(true),
    mode: z.enum(["generate", "state-fill"]).default("generate"),
    /** Client-built statePathsOnly.prompt output (Mode B). */
    stateFillSystem: z.string().optional(),
    modelId: z.string().optional(),
    reasoningEffort: z.enum(REASONING_EFFORTS).optional(),
    /** Resume an OpenCode session when provider is opencode. */
    sessionId: z.string().optional(),
    /** Per-request override; defaults to AI_PROVIDER env. */
    provider: z.enum(["openai", "opencode", "gateway"]).optional(),
    /** Cumulative layout spec so follow-up turns can patch instead of rebuild. */
    currentSpec: z.custom<Spec>().optional(),
  }),
  prepareCall: ({ options, ...settings }) => {
    let next = { ...settings };

    if (
      options.mode !== "state-fill" &&
      options.currentSpec &&
      Array.isArray(next.messages)
    ) {
      next = {
        ...next,
        messages: rewriteLastUserModelMessage(
          next.messages,
          options.currentSpec,
        ),
      };
    }

    if (options.mode === "state-fill") {
      const fill = options.stateFillSystem?.trim() || "";
      let instructions = `${STATE_FILL_WRAP}${fill}`;
      if (!options.webSearch) {
        instructions = `${instructions}

WEB SEARCH IS DISABLED for this request. Do not call webSearch. Use only the specialized tools you have, or invent realistic sample data in /state.`;
        next = {
          ...next,
          activeTools: [...BASE_TOOLS],
          instructions,
        };
      } else {
        next = { ...next, instructions };
      }
    } else if (!options.webSearch) {
      next = {
        ...next,
        activeTools: [...BASE_TOOLS],
        instructions: `${AGENT_INSTRUCTIONS}

WEB SEARCH IS DISABLED for this request. Do not call webSearch. Use only the specialized tools you have, or answer without live web lookup.`,
      };
    }

    const provider = options.provider ?? defaultChatProvider();

    if (provider === "opencode") {
      // OpenCode executes tools server-side; client tool defs are ignored.
      // Pass state-fill instructions as systemPrompt so they reach the serve agent.
      // Same UI effort dial as OpenAI → serve prompt body `variant` (official API).
      const systemPrompt =
        options.mode === "state-fill" && typeof next.instructions === "string"
          ? next.instructions
          : undefined;
      const matrixId = fromOpencodeModelId(
        options.modelId ?? process.env.OPENCODE_MODEL ?? "openai/gpt-5-mini",
      );
      const effort = clampEffort(matrixId, options.reasoningEffort);
      next = {
        ...next,
        model: resolveOpencodeModel({
          sessionId: options.sessionId,
          systemPrompt,
          modelId: options.modelId
            ? toOpencodeModelId(options.modelId)
            : undefined,
          variant: effort ?? undefined,
        }),
      };
    } else if (provider === "openai") {
      const modelId = resolveEnabledModelId(options.modelId);
      const effort = clampEffort(modelId, options.reasoningEffort);
      next = {
        ...next,
        model: resolveOpenAIModel(modelId),
        temperature: effort != null ? undefined : next.temperature,
        providerOptions:
          effort != null
            ? { openai: { reasoningEffort: effort } }
            : next.providerOptions,
      };
    }

    return next;
  },
  tools: {
    getWeather,
    getGitHubRepo,
    getGitHubPullRequests,
    getCryptoPrice,
    getCryptoPriceHistory,
    getHackerNewsTop,
    webSearch,
  },
  stopWhen: stepCountIs(5),
  temperature: 0.7,
});
