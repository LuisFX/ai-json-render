/**
 * Test FormSpec generation in isolation.
 *
 * Run with: pnpm --filter web test:form-gen
 *
 * Requires: dev server running (pnpm dev) and AI_API_KEY or similar configured.
 *
 * Usage:
 *   BASE_URL=http://localhost:51840 pnpm --filter web test:form-gen
 *   TIER=1 pnpm --filter web test:form-gen   # Matrix only
 *   TIER=2 pnpm --filter web test:form-gen   # Matrix + steps/score (default)
 *   TIER=3 pnpm --filter web test:form-gen   # + refusal, visibility
 *   TIER=4 pnpm --filter web test:form-gen   # + clinicalPathway
 *   SAVE_JSON=output.json TIER=4 pnpm --filter web test:form-gen   # save compiled spec to file
 */

import { writeFileSync } from "fs";
import { compileSpecStream } from "@json-render/core";
import { formSpecCatalog } from "../lib/render/form-spec-catalog";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:51840";
const TIER = parseInt(process.env.TIER ?? "2", 10);

const TIER_PROMPTS: Record<number, string> = {
  1: "PHQ-9 Matrix only: 9 items (Little interest, Feeling down, Sleep, Tired, Appetite, Self-worth, Concentration, Slow/fast, Suicidal thoughts), options 0-3 with scores. Output the phq9-matrix element. Output Form, Stack, phq9-matrix, Submit button.",
  2: "Build a PHQ-9 style depression screening: Matrix with 9 items, options 0-3 with scores. ScoreSummary with ranges 0-4 minimal, 5-9 mild, 10-14 moderate, 15-19 moderately severe, 20-27 severe. Output /steps, /score. Use state /phq9/responses and /phq9/totalScore.",
  3: "PHQ-9 with refusal: Refusal Radio (yes/no), Matrix (9 items, options 0-3 with scores), ScoreSummary. Visibility: steps after refusal only when refusal=no. Output /steps, /score. Use 4 Steps: Patient Screening, Depression Symptom Assessment, Functional Impairment, Scoring.",
  4: "Build a complete PHQ-9 form matching the goalpost: Refusal Radio (refusal-radio), Matrix (phq9-matrix, 9 items including suicidal), Functional impairment Radio, ScoreSummary. Output /steps, /score, /clinicalPathway. Pathway: initialState state-refusal-check. States: refusal-check, phq9-collect, impairment, calc-score, suicidal-check, suicidal-alert (action/alert), classify, minimal/mild/moderate/moderately-severe/severe (actions), declined/complete/escalated (terminal). Transitions: refusal=no->phq9-collect, refusal=yes->declined; matrixItem phq9-matrix suicidal NotEquals 0->suicidal-alert; suicidal Equals 0->classify; fieldScoreInRange phq9-matrix [0,4]->minimal, [5,9]->mild, [10,14]->moderate, [15,19]->moderately-severe, [20,27]->severe; minimal/mild/moderate->complete; moderately-severe/severe->escalated.",
};

const PROMPT = TIER_PROMPTS[TIER] ?? TIER_PROMPTS[2];

function collectChildKeys(spec: Record<string, unknown>): Set<string> {
  const keys = new Set<string>();
  const elements = spec.elements as
    | Record<string, { children?: string[] }>
    | undefined;
  if (!elements) return keys;
  for (const el of Object.values(elements)) {
    if (Array.isArray(el?.children)) {
      for (const k of el.children) keys.add(k);
    }
  }
  return keys;
}

function collectElementKeys(spec: Record<string, unknown>): Set<string> {
  const elements = spec.elements as Record<string, unknown> | undefined;
  return new Set(elements ? Object.keys(elements) : []);
}

type PathwayReport = {
  ok: boolean;
  reasons: string[];
};

function conditionKind(condition: unknown): string | null {
  if (!condition || typeof condition !== "object") return null;
  const c = condition as Record<string, unknown>;
  if (c.always === true) return "always";
  if (typeof c.field === "string") return "field";
  if (c.matrixItem && typeof c.matrixItem === "object") return "matrixItem";
  if (Array.isArray(c.fieldScoreInRange)) return "fieldScoreInRange";
  if (Array.isArray(c.scoreInRange)) return "scoreInRange";
  if (Array.isArray(c.and)) return "and";
  if (Array.isArray(c.or)) return "or";
  if (c.not) return "not";
  return null;
}

function fieldRefsInCondition(condition: unknown): string[] {
  if (!condition || typeof condition !== "object") return [];
  const c = condition as Record<string, unknown>;
  const refs: string[] = [];
  if (typeof c.field === "string") refs.push(c.field);
  if (c.matrixItem && typeof c.matrixItem === "object") {
    const field = (c.matrixItem as { field?: unknown }).field;
    if (typeof field === "string") refs.push(field);
  }
  if (
    Array.isArray(c.fieldScoreInRange) &&
    typeof c.fieldScoreInRange[0] === "string"
  ) {
    refs.push(c.fieldScoreInRange[0]);
  }
  for (const key of ["and", "or"] as const) {
    if (Array.isArray(c[key])) {
      for (const child of c[key] as unknown[])
        refs.push(...fieldRefsInCondition(child));
    }
  }
  if (c.not) refs.push(...fieldRefsInCondition(c.not));
  return refs;
}

/** Tier 4: pathway must be the goalpost dialect, not merely present. */
function scorePathway(
  spec: Record<string, unknown>,
  elementKeys: Set<string>,
): PathwayReport {
  const reasons: string[] = [];
  const pathway = spec.clinicalPathway as Record<string, unknown> | undefined;
  if (!pathway || typeof pathway !== "object") {
    return { ok: false, reasons: ["clinicalPathway missing"] };
  }
  if (
    typeof pathway.initialState !== "string" ||
    pathway.initialState.length === 0
  ) {
    reasons.push("initialState missing");
  }
  if (!Array.isArray(pathway.states)) reasons.push("states is not an array");
  if (!Array.isArray(pathway.transitions))
    reasons.push("transitions is not an array");
  if (reasons.length > 0) return { ok: false, reasons };

  const states = pathway.states as Array<{ key?: string; type?: string }>;
  const transitions = pathway.transitions as Array<{
    from?: string;
    to?: string;
    condition?: unknown;
  }>;
  const types = new Set(states.map((s) => s.type).filter(Boolean));
  for (const required of ["evaluation", "action", "terminal"] as const) {
    if (!types.has(required)) reasons.push(`missing state type ${required}`);
  }
  const kinds = new Set(
    transitions.map((t) => conditionKind(t.condition)).filter(Boolean),
  );
  for (const required of [
    "field",
    "matrixItem",
    "fieldScoreInRange",
    "always",
  ] as const) {
    if (!kinds.has(required)) reasons.push(`missing condition ${required}`);
  }
  const stateKeys = new Set(
    states.map((s) => s.key).filter((k): k is string => !!k),
  );
  if (
    typeof pathway.initialState === "string" &&
    !stateKeys.has(pathway.initialState)
  ) {
    reasons.push(`initialState ${pathway.initialState} is not a state key`);
  }
  for (const t of transitions) {
    if (t.from && !stateKeys.has(t.from))
      reasons.push(`transition from unknown state ${t.from}`);
    if (t.to && !stateKeys.has(t.to))
      reasons.push(`transition to unknown state ${t.to}`);
    for (const ref of fieldRefsInCondition(t.condition)) {
      if (!elementKeys.has(ref))
        reasons.push(`condition field ref ${ref} is not an element`);
    }
  }
  return { ok: reasons.length === 0, reasons };
}

async function main() {
  console.log("FormSpec generation test (Tier", TIER, ")");
  console.log("========================");
  console.log("Prompt:", PROMPT);
  console.log("API:", `${BASE_URL}/api/generate`);
  console.log("");

  const res = await fetch(`${BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: PROMPT,
      context: { mode: "form" },
    }),
  });

  if (!res.ok) {
    console.error("API error:", res.status, res.statusText);
    const text = await res.text();
    console.error(text.slice(0, 500));
    process.exit(1);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    console.error("No response body");
    process.exit(1);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  const patches: Array<{ op: string; path: string; value?: unknown }> = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("__meta")) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.op && parsed.path) {
          patches.push(parsed);
        }
      } catch {
        // skip non-JSON lines
      }
    }
  }
  if (buffer.trim()) {
    try {
      const parsed = JSON.parse(buffer.trim());
      if (parsed.op && parsed.path) patches.push(parsed);
    } catch {
      // skip
    }
  }

  console.log("Output (patches):", patches.length);
  console.log("----------------");
  for (const p of patches) {
    console.log(JSON.stringify(p));
  }
  if (patches.length === 0) {
    console.log("(no patches - check API response or rate limits)");
  }

  const hasRoot = patches.some((p) => p.path === "/root");
  const hasSteps = patches.some((p) => p.path === "/steps");
  const hasScore = patches.some((p) => p.path === "/score");
  const hasClinicalPathway = patches.some((p) => p.path === "/clinicalPathway");
  const elementCount = patches.filter((p) =>
    p.path?.startsWith("/elements/"),
  ).length;
  const hasMatrix = patches.some(
    (p) =>
      p.path?.startsWith("/elements/") &&
      (p.value as { type?: string })?.type === "Matrix",
  );

  console.log("");
  console.log("Summary:");
  console.log("  /root:", hasRoot ? "yes" : "no");
  console.log("  /steps:", hasSteps ? "yes" : "no");
  console.log("  /score:", hasScore ? "yes" : "no");
  console.log("  /clinicalPathway:", hasClinicalPathway ? "yes" : "no");
  console.log("  elements:", elementCount);
  console.log("  Matrix present:", hasMatrix ? "yes" : "no");

  const jsonl = patches.map((p) => JSON.stringify(p)).join("\n");
  let compiled: Record<string, unknown> = {};
  try {
    compiled = compileSpecStream(jsonl, {}) as Record<string, unknown>;
  } catch (err) {
    console.log("");
    console.log("Compile: FAILED -", String(err));
    process.exit(1);
  }

  const childKeys = collectChildKeys(compiled);
  const elementKeys = collectElementKeys(compiled);
  const orphanChildren = [...childKeys].filter((k) => !elementKeys.has(k));

  if (orphanChildren.length > 0) {
    console.log("");
    console.log(
      "Orphan children (referenced but not emitted):",
      orphanChildren.join(", "),
    );
  }

  const validation = formSpecCatalog.validate(compiled);
  console.log("");
  console.log("Validation:", validation.success ? "PASS" : "FAIL");
  if (!validation.success && validation.error) {
    console.log("  Error:", validation.error.toString());
  }

  if (validation.success && validation.data) {
    const matrixEl = (
      validation.data.elements as Record<
        string,
        { props?: { items?: unknown[] } }
      >
    )?.["phq9-matrix"];
    const matrixItems = matrixEl?.props?.items;
    if (matrixEl && Array.isArray(matrixItems)) {
      console.log("  Matrix items:", matrixItems.length);
    }
  }

  const pathway =
    TIER >= 4
      ? scorePathway(compiled, elementKeys)
      : { ok: true, reasons: [] as string[] };
  if (TIER >= 4) {
    console.log("");
    console.log("Pathway shape:", pathway.ok ? "PASS" : "FAIL");
    for (const reason of pathway.reasons) console.log("  -", reason);
  }

  const needsStepsAndScore = TIER >= 2;
  const landmark =
    validation.success &&
    hasMatrix &&
    hasRoot &&
    (!needsStepsAndScore || (hasSteps && hasScore)) &&
    (TIER < 4 || (hasClinicalPathway && pathway.ok)) &&
    orphanChildren.length === 0;

  console.log("");
  console.log("Landmark (mappable):", landmark ? "YES" : "no");

  const savePath = process.env.SAVE_JSON;
  if (savePath && landmark) {
    const outPath = savePath.startsWith("/")
      ? savePath
      : `${process.cwd()}/${savePath}`;
    writeFileSync(outPath, JSON.stringify(compiled, null, 2), "utf-8");
    console.log("");
    console.log("Saved compiled spec to:", outPath);
  } else if (savePath) {
    console.log("");
    console.log("Did not write", savePath, "(landmark was no)");
  }

  if (!landmark) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
