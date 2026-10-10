# ASB-007 — OpenAI model matrix

> Wave 5 · Dep: none (lab DX; orthogonal to Mode A/B).  
> Parent: [`INDEX.md`](./INDEX.md).  
> Landed: `7f4d2f1`.

## Intent

Code-owned OpenAI model list with enabled flags + allowed reasoning efforts. Chat UI selects model/effort per request; generate route + agent honor them.

## Delivered

- [`lib/openai-model-matrix.ts`](../../lib/openai-model-matrix.ts) + unit tests
- [`lib/model.ts`](../../lib/model.ts) — `resolveModel(modelId?)` / seed from `OPENAI_MODEL`
- Composer selectors (when not gateway) → `body.modelId` + `body.reasoningEffort`
- Agent `callOptionsSchema` / `prepareCall` apply selection

## Exit

Enabled ids only in the selector; disabled ids clamp to default; effort clamped per model row.
