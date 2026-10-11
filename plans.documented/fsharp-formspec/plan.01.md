# plan.01 — Spec to Blueprint

Living board. Update after each proof run.

## Framing

json-render emits a string-key Spec (preview). The product is a Healix **Blueprint**: empty FormSpec, branded, Thoth-serialized.

- Law: `MANIFESTOS/FORMSPEC_MANIFESTO.md` and `f1-monorepo/AGENTS.md` Part I.
- Construct with `@f1studio/form-spec` `FormSpec.Api.Helpers` only.
- Do not write F# in this repo. Do not mint FieldKeys here.

## Status

| Step | State |
|------|-------|
| Spec schema (steps, fields, score, clinicalPathway) | Shipped |
| Tier 2 (matrix + score) | Passed earlier |
| Tier 4 (pathway shape) | Blocked — Anthropic credit balance too low (2026-10-11). On-disk spec still has no `clinicalPathway` |
| `specToBlueprint` | Shipped. Goalpost returns `built` |
| Thoth round-trip | Goalpost: `deserializeFormSpec` is Some. `ClinicalPathway` is Some |

## Blockers (Tier 4)

1. Form-mode user prompt was truncated at 500 characters, before `/clinicalPathway`.
2. `clinicalPathway` was `s.any()`, so a wrong shape could pass a presence check.
3. `children` was required; leaf fields without `children: []` failed validation.

## Done when

1. `TIER=4` prints `Landmark (mappable): YES` and the saved JSON has `clinicalPathway.states[]` and `transitions[]`.
2. `specToBlueprint(goalpost)` and `specToBlueprint(tier4)` return `Blueprint`.
3. `serializeFormSpec` → `deserializeFormSpec` is Some. The string is a `BlueprintThothString`.

## Helpers this package does not export

Named and skipped. Not reconstructed in TypeScript.

- `createEvaluationState` — evaluation states omitted
- `createRadioField` / `createSelectField` — Radio and Select use `createCheckboxListField`
- `createTransition` accepts only FieldCondition Equals. `always`, `matrixItem`, `fieldScoreInRange` omitted
- `createClinicalPathway` sets InitialState to a fixed guid
- no DependsOn setter, no Score setter
- Message, ReadOnly, ScoreSummary, Button are not fields

`@f1studio/form-spec@5.0.0-alpha.174` (npm `latest` tag is still `5.0.0-alpha.117`). Runtime also needs `crypto-js@4.2.0`, which the published package requires but does not declare. Node ESM cannot see the CJS getter exports; `lib/formspec/helpers.ts` loads them with `createRequire`.

## Proof log

| When | What | Result |
|------|------|--------|
| (prior) | `SAVE_JSON=scripts/output-tier4.json TIER=4` | Spec saved. No `clinicalPathway`. Validation failed on missing `children`. |
| 2026-10-11 | `TIER=4` against `localhost:51840` | 0 patches. Anthropic: credit balance too low. File not overwritten. |
| 2026-10-11 | `pnpm --filter web test:blueprint` | Goalpost: 4 steps, 3 fields, `defaultArg(ClinicalPathway)` Some, Thoth round-trip Some. Wrote `scripts/output-blueprint.thoth.json`. Saved Tier 4 spec: Blueprint with `ClinicalPathway` None. |
