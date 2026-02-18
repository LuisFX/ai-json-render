# JSONL and Patches

The dashboard uses the **same** JSONL and patch flow as the playground.

---

## Same as Playground

- LLM returns plain text, one JSON object per line (JSONL)
- Each line is an RFC 6902 patch: `{"op":"add","path":"/root","value":"card"}`, etc.
- No structured output or JSON schema
- Client parses line-by-line, skips invalid lines, applies valid patches via `applySpecPatch`
- `useUIStream` from `@json-render/react` handles the stream

---

## Dashboard-Specific

The dashboard's `Widget` uses `useUIStream` with:

- `api: "/api/generate"` — dashboard's own route (uses `dashboardCatalog`)
- `onComplete: async (completedSpec) => { ... }` — **saves to DB** when stream finishes

The parsing and patch application are identical. See [playground/01-JSONL-PATCHES.md](../playground/01-JSONL-PATCHES.md) for full detail.
