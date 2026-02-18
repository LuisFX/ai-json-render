# Overview

Playground and Dashboard are two example apps that demonstrate json-render. Both live-render React from AI-generated specs.

---

## At a Glance

| | Playground | Dashboard |
|---|------------|-----------|
| **Port** | 3000 | 3001 |
| **Package** | `web` | `example-dashboard` |
| **Path** | `apps/web` | `examples/dashboard` |
| **One sentence** | Docs site with a prompt-to-UI playground; versions, tabs, React/JSX export. | Widget grid; each widget is AI-generated, saved to DB, reloadable. |

---

## Shared Pipeline

Both use the same flow:

```
User prompt → POST /api/generate → LLM streams JSONL → parse patches → applySpecPatch → spec → Renderer → live React UI
```

| Step | Shared? | Code |
|------|---------|------|
| useUIStream | Yes | `packages/react/src/hooks.ts` |
| buildUserPrompt | Yes | `packages/core/src/prompt.ts` |
| Parse JSONL, apply patches | Yes | `packages/react/src/hooks.ts` |
| Renderer | Yes (same component) | `@json-render/react` |
| Catalog | No (each has own) | `apps/web/lib/render/catalog.ts` vs `examples/dashboard/lib/render/catalog.ts` |
| Registry | No (each has own) | `apps/web/lib/render/registry.tsx` vs `examples/dashboard/lib/render/registry.tsx` |
| Generate API | No (each has own route) | `apps/web/app/api/generate` vs `examples/dashboard/app/api/generate` |

---

## Key Difference

| | Playground | Dashboard |
|---|------------|-----------|
| **Layout** | Single prompt input, versions list, json/nested/stream/catalog tabs | Widget grid, add/drag/delete widgets |
| **Persistence** | None (in-memory) | PostgreSQL (widgets table) |
| **"Code" view** | React/JSX (generated from spec) | Raw JSON spec |
| **Actions** | Stub (toast) | Real API (createCustomer, viewInvoices, etc.) |
| **Validation** | ValidationProvider, checks | None |
