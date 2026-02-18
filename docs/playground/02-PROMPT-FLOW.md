# Prompt Flow

How we tell the LLM what to output.

---

## Two Prompts

| Prompt | Source | Role | Code |
|--------|--------|------|------|
| **System** | `catalog.prompt()` | Rules, format, components, actions | `apps/web/app/api/generate/route.ts` 10-19 |
| **User** | `buildUserPrompt()` | The request + optional context | `apps/web/app/api/generate/route.ts` 52-56; `packages/core/src/prompt.ts` 61-104 |

---

## System Prompt (catalog.prompt())

Built from the catalog. Includes:

1. **Output format** — JSONL, RFC 6902 patches, one object per line
2. **Order** — `/root` first, then `/elements`, then `/state`
3. **Example** — Real component names from the catalog (not placeholders)
4. **AVAILABLE COMPONENTS** — Each component with props schema and description
5. **AVAILABLE ACTIONS** — Built-in (setState, pushState, removeState) + catalog actions
6. **Rules** — Where `on` and `visible` go, how `repeat` works, state paths, etc.
7. **Custom rules** — Playground adds things like "NEVER use min-h-screen"

The catalog is the vocabulary. The model is told to use only those components and actions.

> **Code:** `packages/core/src/schema.ts` 546-979 (generatePrompt), 752-767 (component list), 1158-1233 (formatZodType); `apps/web/lib/render/catalog.ts` (playgroundCatalog, components ~15).

For what the LLM sees (names, schemas, descriptions) and how correctness is enforced, see [dev/07-prompt-engineering](../dev/07-prompt-engineering.md).

---

## User Prompt (buildUserPrompt())

Two modes:

### Fresh generation

```
Create a login form

Remember: Output /root first, then interleave /elements and /state patches...
```

> **Code:** `packages/core/src/prompt.ts` 93-101.

### Refinement (when previousSpec exists)

```
CURRENT UI STATE (already loaded, DO NOT recreate existing elements):
{ "root": "card", "elements": { ... } }

USER REQUEST: Add a forgot password link

IMPORTANT: Output ONLY the patches needed to make the requested change:
- To add a new element: {"op":"add","path":"/elements/new-key","value":{...}}
- To modify: {"op":"replace","path":"/elements/existing-key","value":{...}}
...
```

> **Code:** `packages/core/src/prompt.ts` 31-38 (PATCH_INSTRUCTIONS), 70-89 (refinement branch).

---

## API Route

```typescript
// apps/web/app/api/generate/route.ts
const SYSTEM_PROMPT = playgroundCatalog.prompt({ customRules: [...] });
const userPrompt = buildUserPrompt({ prompt, currentSpec: context?.previousSpec });

const result = streamText({
  model: getModel(),
  system: SYSTEM_PROMPT,
  prompt: userPrompt,
  temperature: 0.7,
});

// Stream result.textStream directly — no structured output
```

> **Code:** `apps/web/app/api/generate/route.ts` 50-95.

---

## How We Constrain Output (Without a Schema)

| Mechanism | What it does |
|-----------|--------------|
| **Format instructions** | "Output ONLY JSONL patches", "one object per line" |
| **Catalog** | Lists allowed components and actions by name |
| **Examples** | Uses real catalog component names in the prompt |
| **Rules** | "ONLY use components listed above", "Each element needs type, props, children" |
| **Parsing** | Invalid lines are skipped; only valid patches affect the spec |

We rely on prompt design, not schema enforcement. The model can still output wrong things; we just don't apply them.

> **Code:** Format rules in `packages/core/src/schema.ts` 591-596, 965-982; parsing skip in `packages/react/src/hooks.ts` 62-64, 334; unknown component handling in `packages/react/src/renderer.tsx` 241-246.
