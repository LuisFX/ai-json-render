import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import {
  dumpCatalogPromptFixtures,
  RELATED_GROUPS,
} from "./catalog-prompt-dump";
import { explorerCatalog } from "./render/catalog";

describe("catalog prompt dump", () => {
  test("dumps full explorerCatalog.prompt fixtures (PieChart-shaped per component)", () => {
    const result = dumpCatalogPromptFixtures();
    const { outDir, componentNames, promptSha256, filesWritten } = result;

    expect(componentNames.length).toBeGreaterThan(0);
    expect(componentNames).toEqual([...explorerCatalog.componentNames]);
    expect(promptSha256).toMatch(/^[a-f0-9]{64}$/);

    // Catalog-wide artifacts
    for (const name of [
      "explorerCatalog.prompt.standalone.txt",
      "explorerCatalog.prompt.meta.json",
      "AVAILABLE-COMPONENTS.prompt-lines.txt",
      "index.json",
      "README.md",
    ]) {
      expect(existsSync(join(outDir, name))).toBe(true);
      expect(filesWritten).toContain(name);
    }

    const fullPrompt = readFileSync(
      join(outDir, "explorerCatalog.prompt.standalone.txt"),
      "utf8",
    );
    expect(fullPrompt).toBe(
      explorerCatalog.prompt({ mode: "standalone" }) + "\n",
    );
    expect(fullPrompt).toContain("AVAILABLE COMPONENTS");
    expect(fullPrompt).toContain("OUTPUT FORMAT (JSONL");

    const index = JSON.parse(
      readFileSync(join(outDir, "index.json"), "utf8"),
    ) as {
      promptSha256: string;
      components: Array<{ name: string }>;
    };
    expect(index.promptSha256).toBe(promptSha256);
    expect(index.components.map((c) => c.name)).toEqual(componentNames);

    // Related groups
    for (const group of Object.keys(RELATED_GROUPS)) {
      const path = join(outDir, `${group}-related.prompt-lines.txt`);
      expect(existsSync(path)).toBe(true);
      const body = readFileSync(path, "utf8");
      for (const name of RELATED_GROUPS[group]!) {
        if (componentNames.includes(name)) {
          expect(body).toContain(`- ${name}:`);
        }
      }
    }

    // Per-component PieChart-shaped triad
    for (const name of componentNames) {
      const promptLinePath = join(outDir, `${name}.prompt-line.txt`);
      const metaPath = join(outDir, `${name}.meta.json`);
      const agentPath = join(outDir, `${name}.agent-context.json`);

      expect(existsSync(promptLinePath)).toBe(true);
      expect(existsSync(metaPath)).toBe(true);
      expect(existsSync(agentPath)).toBe(true);

      const promptLine = readFileSync(promptLinePath, "utf8").trimEnd();
      expect(promptLine.startsWith(`- ${name}:`)).toBe(true);

      const meta = JSON.parse(readFileSync(metaPath, "utf8")) as {
        componentName: string;
        promptLine: string;
        promptSha256: string;
        promptMode: string;
      };
      expect(meta.componentName).toBe(name);
      expect(meta.promptLine).toBe(promptLine);
      expect(meta.promptSha256).toBe(promptSha256);
      expect(meta.promptMode).toBe("standalone");

      const agentCtx = JSON.parse(readFileSync(agentPath, "utf8")) as {
        componentName: string;
        mentionedInAgent: boolean;
        agentWorkflowMentions: string[];
        customRulesMentions: string[];
      };
      expect(agentCtx.componentName).toBe(name);
      expect(typeof agentCtx.mentionedInAgent).toBe("boolean");
    }

    // Spot-check PieChart (the original debug target)
    const pieLine = readFileSync(
      join(outDir, "PieChart.prompt-line.txt"),
      "utf8",
    );
    expect(pieLine).toContain("nameKey");
    expect(pieLine).toContain("valueKey");
    expect(pieLine).toContain("$state");

    const pieAgent = JSON.parse(
      readFileSync(join(outDir, "PieChart.agent-context.json"), "utf8"),
    ) as { mentionedInAgent: boolean; agentWorkflowMentions: string[] };
    expect(pieAgent.mentionedInAgent).toBe(true);
    expect(
      pieAgent.agentWorkflowMentions.some((l) => l.includes("PieChart")),
    ).toBe(true);
  });
});
