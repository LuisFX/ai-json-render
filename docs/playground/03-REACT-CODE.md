# Spec to React Code

The "code" tab shows React/JSX. It is **generated from the spec**, not from the LLM.

---

## Source of Truth

```
LLM → JSONL patches → Spec (in memory)
                          │
                          ├──→ Renderer (live UI)
                          │
                          └──→ Code tab (JSX export)
```

The spec is the single source. Both the live UI and the exported code come from it.

---

## How the Code Is Generated

1. **Collect components** — `collectUsedComponents(spec)` walks the spec and gathers all `type` values (Card, Input, Button, etc.)
2. **Walk the tree** — Start at `spec.root`, recurse through `spec.elements[key].children`
3. **Serialize props** — For each element, `serializeProps(element.props)` turns the props object into JSX attribute strings
4. **Emit JSX** — Build `<ComponentName prop1="..." prop2={...}>` with nested children

| Step | Code reference |
|------|-----------------|
| collectUsedComponents | `packages/codegen/src/traverse.ts` 47-55 |
| generateJSX, tree walk | `apps/web/components/playground.tsx` 254-289 |
| serializeProps | `packages/codegen/src/serialize.ts` 109-131 |

```typescript
// apps/web/components/playground.tsx 254-289
function generateJSX(key: string, indent: number): string {
  const element = tree.elements[key];
  const componentName = element.type;
  const propsStr = serializeProps(propsObj);
  // ... recurse into children, build JSX string
}
```

---

## What the LLM Never Sees

The LLM outputs **patches** (add/replace/remove). It never outputs:

- React code
- JSX
- Import statements

Those are produced client-side by walking the spec and calling `serializeProps` from `@json-render/codegen`.

> **Code:** `packages/codegen/src/traverse.ts` (collectUsedComponents); `packages/codegen/src/serialize.ts` (serializeProps); `apps/web/components/playground.tsx` 245-306 (generatedCode useMemo).

---

## Summary

| Question | Answer | Code |
|----------|--------|------|
| Where does the code come from? | The spec | `apps/web/components/playground.tsx` 245-306 |
| Does the LLM generate React? | No | — |
| What generates it? | `collectUsedComponents`, `serializeProps`, recursive tree walk | `packages/codegen/src/traverse.ts` 47-55; `packages/codegen/src/serialize.ts` 109-131 |
