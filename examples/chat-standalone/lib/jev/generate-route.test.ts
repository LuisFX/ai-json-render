// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../app/api/generate/route.ts",
  ),
  "utf8",
);

describe("POST /api/generate Jev branch", () => {
  it("never constructs ToolLoopAgent on the Jev path", () => {
    expect(routeSource).not.toMatch(
      /import\s*\{[^}]*\bagent\b[^}]*\}\s*from\s*["']@\/lib\/agent["']/,
    );
    expect(routeSource).toContain('if (composer.kind === "jev")');
    expect(routeSource).toContain("createCompositionStreamResponse");
    expect(routeSource).toMatch(/await import\(["']@\/lib\/agent["']\)/);

    const jevStart = routeSource.indexOf('if (composer.kind === "jev")');
    const jevCompose = routeSource.indexOf(
      "createCompositionStreamResponse",
      jevStart,
    );
    const agentImport = routeSource.indexOf('await import("@/lib/agent")');
    expect(jevStart).toBeGreaterThan(-1);
    expect(jevCompose).toBeGreaterThan(jevStart);
    expect(agentImport).toBeGreaterThan(jevCompose);
  });

  it("refuses Mode B state-fill before the agent module loads", () => {
    const refuse = routeSource.indexOf("jev-state-fill-refused");
    const agentImport = routeSource.indexOf('await import("@/lib/agent")');
    expect(refuse).toBeGreaterThan(-1);
    expect(refuse).toBeLessThan(agentImport);
    expect(routeSource).toContain("Jev cannot fill a frozen spec.");
  });
});
