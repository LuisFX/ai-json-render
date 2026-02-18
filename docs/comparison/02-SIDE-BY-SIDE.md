# Side-by-Side Comparison

Feature-by-feature comparison of Playground and Dashboard.

---

## Core

| Feature | Playground | Dashboard |
|---------|------------|-----------|
| Live render | Yes | Yes |
| JSONL → patches → spec | Yes | Yes |
| useUIStream | Yes | Yes |
| Same pipeline | Yes | Yes |
| **Same spec shape** | Yes | Yes — see [03-FINAL-SPEC.md](./03-FINAL-SPEC.md) |

---

## Catalogs

| | Playground | Dashboard |
|---|------------|-----------|
| **Catalog** | playgroundCatalog | dashboardCatalog |
| **Form component** | No | Yes (Form with submitAction) |
| **Validation** | Input/Textarea have `checks` | No checks |
| **Actions** | formSubmit (toast), setState, pushState, removeState | createCustomer, viewInvoices, createInvoice, etc. |
| **Custom rules** | Yes (e.g. "NEVER use min-h-screen") | No |

---

## Code View

| | Playground | Dashboard |
|---|------------|-----------|
| **"Code" / "Show code"** | React/JSX (generated from spec) | Raw JSON spec |
| **Implementation** | `collectUsedComponents` + `serializeProps` + `generateJSX` | `JSON.stringify(currentSpec, null, 2)` |
| **Code reference** | `apps/web/components/playground.tsx` 245-306 | `examples/dashboard/components/widget.tsx` 406 |

---

## Persistence

| | Playground | Dashboard |
|---|------------|-----------|
| **Persistence** | None | PostgreSQL |
| **Save trigger** | — | Generation complete (onComplete) |
| **Load trigger** | — | Page mount |
| **Reconstitute** | — | initialSpec passed to Widget |

---

## Layout & UX

| | Playground | Dashboard |
|---|------------|-----------|
| **Layout** | Single prompt, versions list, tabs | Widget grid |
| **Versions** | Yes (multiple generations) | No |
| **Tabs** | json, nested, stream, catalog | — |
| **Add new** | Type prompt, Enter | Click "Add Widget", type prompt |
| **Reorder** | — | Drag widgets |
| **Delete** | Clear | Delete widget (from DB) |

---

## API Routes

| | Playground | Dashboard |
|---|------------|-----------|
| **Generate** | `POST /api/generate` | `POST /api/generate` |
| **Widgets** | — | `GET/POST /api/v1/widgets` |
| **Widget by ID** | — | `GET/PATCH/DELETE /api/v1/widgets/:id` |
| **Reorder** | — | `POST /api/v1/widgets/reorder` |

---

## Summary

| Question | Playground | Dashboard |
|----------|------------|-----------|
| Same live-render pipeline? | Yes | Yes |
| Same catalog? | No | No |
| React/JSX code export? | Yes | No |
| Persistence? | No | Yes |
| Real API actions? | No | Yes |
| Form validation? | Yes | No |
