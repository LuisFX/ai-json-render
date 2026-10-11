/**
 * Prove a json-render Spec becomes a Healix Blueprint.
 *
 *   pnpm --filter web test:blueprint
 *
 * Writes scripts/output-blueprint.thoth.json (goalpost) and, when present,
 * scripts/output-tier4.thoth.json.
 */
import { readFileSync, writeFileSync } from "fs";
import { formSpecHelpers } from "../lib/formspec/helpers";

const { defaultArg, listToArray } = formSpecHelpers;
import type { Spec } from "@json-render/core";
import { formSpecPhq9Goalpost } from "../lib/render/form-spec-phq9-goalpost";
import {
  pathwayIsPresent,
  specToBlueprint,
} from "../lib/formspec/spec-to-blueprint";

function report(name: string, spec: Spec, outFile: string): boolean {
  console.log("");
  console.log(name);
  console.log("--------");
  const built = specToBlueprint(spec);
  if (built.kind === "refused") {
    console.log("REFUSED");
    for (const failure of built.failures) {
      console.log(`  ${failure.field}: ${failure.reason}`);
    }
    return false;
  }
  const steps = listToArray(built.blueprint.Steps);
  const fieldCount = steps.reduce(
    (sum, step) => sum + listToArray(step.Fields).length,
    0,
  );
  console.log("  steps:", steps.length);
  console.log("  fields:", fieldCount);
  console.log(
    "  clinicalPathway:",
    pathwayIsPresent(built.blueprint) ? "present" : "absent",
  );
  console.log(
    "  defaultArg(ClinicalPathway):",
    defaultArg(built.blueprint.ClinicalPathway, undefined) === undefined
      ? "None"
      : "Some",
  );
  if (built.warnings.length > 0) {
    console.log("  warnings:");
    for (const warning of built.warnings) console.log("   -", warning);
  }
  writeFileSync(outFile, built.thoth, "utf-8");
  console.log("  wrote", outFile);
  return true;
}

const goalpostOk = report(
  "goalpost",
  formSpecPhq9Goalpost,
  "scripts/output-blueprint.thoth.json",
);

let tier4Ok = true;
try {
  const raw = readFileSync("scripts/output-tier4.json", "utf-8");
  tier4Ok = report(
    "tier4",
    JSON.parse(raw) as Spec,
    "scripts/output-tier4.thoth.json",
  );
} catch {
  console.log("");
  console.log("tier4: scripts/output-tier4.json not found (skipped)");
}

if (!goalpostOk || !tier4Ok) process.exit(1);
