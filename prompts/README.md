# Prompts

Prompt documents for AI-driven JSON generation.

## form-spec-generation.md

Comprehensive reference for generating FormSpec-compatible JSON. Used when the playground is in **Form mode**.

**Goal:** Output JSON that can be **converted** to F# FormSpec. Compatibility over exactness.

**Consumers:**
- `apps/web/app/api/generate/route.ts` – Form mode system rules derive from this doc
- `packages/core/src/prompt.ts` – buildUserPrompt; user requests should be sophisticated
- Playground example prompts – aligned with doc templates

**Iteration:** Edit this file when tuning prompts. Update `FORM_SPEC_RULES` in the API route to match.

**Test in isolation:** Run `pnpm --filter web test:form-gen` (requires dev server: `pnpm dev`). The script calls the generate API with a PHQ-9 prompt and prints patches + summary (/root, /steps, /score, /clinicalPathway, element count).
