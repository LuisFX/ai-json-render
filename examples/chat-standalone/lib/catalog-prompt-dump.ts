import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { explorerCatalog } from "@/lib/render/catalog";
import { GENERATION_MODE } from "@/lib/generation-mode";

const PROMPT_MODE = GENERATION_MODE;
const CATALOG_SOURCE = "examples/chat-standalone/lib/render/catalog.ts";
const AGENT_SOURCE = "examples/chat-standalone/lib/agent.ts";

/** Named sibling groups for debugging (same idea as charts-related.prompt-lines.txt). */
export const RELATED_GROUPS: Record<string, string[]> = {
  charts: ["Metric", "Table", "BarChart", "LineChart", "PieChart"],
  layout: ["Stack", "Grid", "Card", "Separator", "Heading", "Text", "Badge"],
  tabs: ["Tabs", "TabContent"],
  callouts: ["Callout", "Timeline", "Accordion"],
  inputs: ["RadioGroup", "SelectInput", "TextInput", "Button"],
  scene3d: [
    "Scene3D",
    "Group3D",
    "Box",
    "Sphere",
    "Cylinder",
    "Cone",
    "Torus",
    "Plane",
    "Ring",
    "AmbientLight",
    "PointLight",
    "DirectionalLight",
    "Stars",
    "Label3D",
  ],
};

type CatalogComponentDef = {
  description?: string;
  slots?: string[];
  events?: string[];
};

export type CatalogPromptDumpResult = {
  outDir: string;
  componentNames: string[];
  promptFullLength: number;
  promptSha256: string;
  filesWritten: string[];
};

function defaultOutDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "fixtures", "catalog-prompt");
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function extractAvailableComponentLines(prompt: string): string[] {
  const lines = prompt.split("\n");
  const start = lines.findIndex((l) => l.startsWith("AVAILABLE COMPONENTS"));
  if (start < 0) return [];

  const bullets: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.startsWith("- ")) {
      bullets.push(line);
      continue;
    }
    if (bullets.length > 0 && line === "") continue;
    if (bullets.length > 0 && /^[A-Z][A-Z0-9 /_()-]+:/.test(line)) break;
  }
  return bullets;
}

function promptLineForComponent(
  bullets: string[],
  componentName: string,
): string | null {
  const prefix = `- ${componentName}:`;
  return bullets.find((l) => l.startsWith(prefix)) ?? null;
}

function promptMentions(prompt: string, componentName: string): string[] {
  return prompt.split("\n").filter((l) => l.includes(componentName));
}

/** Agent workflow + customRules text (no ToolLoopAgent import — avoids model/tools). */
export function readAgentSourceContext(agentSourcePath: string): {
  agentSource: string;
  workflowMentions: (componentName: string) => string[];
  customRulesMentions: (componentName: string) => string[];
} {
  const agentSource = readFileSync(agentSourcePath, "utf8");

  const workflowMatch = agentSource.match(
    /const AGENT_INSTRUCTIONS = `(.*?)\$\{explorerCatalog\.prompt/s,
  );
  const workflow = workflowMatch?.[1] ?? "";

  const rulesMatch = agentSource.match(/customRules:\s*\[(.*?)\]/s);
  const rulesBlock = rulesMatch?.[1] ?? "";

  return {
    agentSource,
    workflowMentions: (componentName: string) =>
      workflow.split("\n").filter((l) => l.includes(componentName)),
    customRulesMentions: (componentName: string) =>
      rulesBlock
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && l.includes(componentName)),
  };
}

/**
 * Dump explorerCatalog.prompt({ mode: "standalone" }) into fixtures/catalog-prompt/*
 * using the PieChart debug layout: prompt-line, meta, agent-context, related groups, full explorer dump.
 */
export function dumpCatalogPromptFixtures(options?: {
  outDir?: string;
  agentSourcePath?: string;
}): CatalogPromptDumpResult {
  const outDir = options?.outDir ?? defaultOutDir();
  const agentSourcePath =
    options?.agentSourcePath ??
    join(dirname(fileURLToPath(import.meta.url)), "agent.ts");

  mkdirSync(outDir, { recursive: true });

  // Clear previous per-component dumps so renames don't leave orphans
  for (const name of readdirSync(outDir)) {
    if (
      name.endsWith(".prompt-line.txt") ||
      name.endsWith(".meta.json") ||
      name.endsWith(".agent-context.json") ||
      name.endsWith("-related.prompt-lines.txt") ||
      name === "explorerCatalog.prompt.inline.txt"
    ) {
      rmSync(join(outDir, name), { force: true });
    }
  }

  const prompt = explorerCatalog.prompt({ mode: PROMPT_MODE });
  const promptSha = sha256(prompt);
  const bullets = extractAvailableComponentLines(prompt);
  const componentNames = [...explorerCatalog.componentNames];
  const components = (
    explorerCatalog.data as { components?: Record<string, CatalogComponentDef> }
  ).components;

  const agent = readAgentSourceContext(agentSourcePath);
  const filesWritten: string[] = [];

  const write = (filename: string, contents: string) => {
    writeFileSync(join(outDir, filename), contents, "utf8");
    filesWritten.push(filename);
  };

  write(
    "explorerCatalog.prompt.standalone.txt",
    prompt.endsWith("\n") ? prompt : `${prompt}\n`,
  );
  write(
    "explorerCatalog.prompt.meta.json",
    `${JSON.stringify(
      {
        catalogSource: CATALOG_SOURCE,
        agentSource: AGENT_SOURCE,
        promptMode: PROMPT_MODE,
        promptFullLength: prompt.length,
        promptSha256: promptSha,
        componentCount: componentNames.length,
        componentNames,
        availableComponentBulletCount: bullets.length,
      },
      null,
      2,
    )}\n`,
  );

  write("AVAILABLE-COMPONENTS.prompt-lines.txt", `${bullets.join("\n")}\n`);

  write(
    "index.json",
    `${JSON.stringify(
      {
        catalogSource: CATALOG_SOURCE,
        promptMode: PROMPT_MODE,
        promptSha256: promptSha,
        components: componentNames.map((name) => ({
          name,
          promptLine: `${name}.prompt-line.txt`,
          meta: `${name}.meta.json`,
          agentContext: `${name}.agent-context.json`,
        })),
        relatedGroups: Object.keys(RELATED_GROUPS).map(
          (g) => `${g}-related.prompt-lines.txt`,
        ),
        fullPrompt: "explorerCatalog.prompt.standalone.txt",
        fullPromptMeta: "explorerCatalog.prompt.meta.json",
        allComponentLines: "AVAILABLE-COMPONENTS.prompt-lines.txt",
      },
      null,
      2,
    )}\n`,
  );

  for (const [group, names] of Object.entries(RELATED_GROUPS)) {
    const relatedLines = names
      .map((n) => promptLineForComponent(bullets, n))
      .filter((l): l is string => l != null);
    write(`${group}-related.prompt-lines.txt`, `${relatedLines.join("\n")}\n`);
  }

  for (const name of componentNames) {
    const def = components?.[name];
    const promptLine = promptLineForComponent(bullets, name);
    if (!promptLine) {
      throw new Error(
        `Missing AVAILABLE COMPONENTS bullet for ${name} in catalog.prompt()`,
      );
    }

    const mentions = promptMentions(prompt, name);
    const workflowMentions = agent.workflowMentions(name);
    const customRulesMentions = agent.customRulesMentions(name);

    write(`${name}.prompt-line.txt`, `${promptLine}\n`);
    write(
      `${name}.meta.json`,
      `${JSON.stringify(
        {
          componentName: name,
          catalogSource: CATALOG_SOURCE,
          description: def?.description ?? null,
          slots: def?.slots ?? null,
          events: def?.events ?? null,
          promptLine,
          promptMentions: mentions,
          promptMode: PROMPT_MODE,
          promptFullLength: prompt.length,
          promptSha256: promptSha,
        },
        null,
        2,
      )}\n`,
    );
    write(
      `${name}.agent-context.json`,
      `${JSON.stringify(
        {
          componentName: name,
          agentSource: AGENT_SOURCE,
          agentWorkflowMentions: workflowMentions,
          customRulesMentions,
          mentionedInAgent:
            workflowMentions.length > 0 || customRulesMentions.length > 0,
        },
        null,
        2,
      )}\n`,
    );
  }

  write(
    "README.md",
    `# Catalog prompt dumps

Generated by \`lib/catalog-prompt-dump.ts\` via:

\`\`\`bash
bun test lib/catalog-prompt-dump.test.ts
\`\`\`

## Layout (per component — same as PieChart debug set)

| File | Purpose |
|---|---|
| \`{Name}.prompt-line.txt\` | Exact \`AVAILABLE COMPONENTS\` bullet from \`catalog.prompt({ mode: "standalone" })\` |
| \`{Name}.meta.json\` | Description, slots, events, prompt line, all prompt mentions, sha of full prompt |
| \`{Name}.agent-context.json\` | Mentions in \`lib/agent.ts\` workflow / customRules |

## Catalog-wide

| File | Purpose |
|---|---|
| \`explorerCatalog.prompt.standalone.txt\` | Full system prompt string |
| \`explorerCatalog.prompt.meta.json\` | Length, sha256, component list |
| \`AVAILABLE-COMPONENTS.prompt-lines.txt\` | All component bullets |
| \`{group}-related.prompt-lines.txt\` | Sibling groups (charts, layout, inputs, …) |
| \`index.json\` | Manifest for tests / tooling |

Do not hand-edit; re-run the dump test after catalog or agent prompt changes.
`,
  );

  return {
    outDir,
    componentNames,
    promptFullLength: prompt.length,
    promptSha256: promptSha,
    filesWritten,
  };
}
