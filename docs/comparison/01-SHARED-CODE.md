# Shared Code

What Playground and Dashboard share, and what they don't.

---

## Shared Packages

Both depend on:

| Package | Provides |
|---------|----------|
| `@json-render/core` | `buildUserPrompt`, `applySpecPatch`, `defineCatalog`, schema, patch parsing |
| `@json-render/react` | `useUIStream`, `Renderer`, `StateProvider`, `VisibilityProvider`, `ActionProvider`, `defineRegistry` |
| `@json-render/codegen` | `collectUsedComponents`, `serializeProps` (Playground uses for JSX; Dashboard has dep) |
| `@repo/ai-config` | `getModel()` |
| `ai` | `streamText` |

The streaming pipeline is the same shared code.

---

## Shared Logic (Same Code Paths)

| Logic | Package | Used by |
|-------|---------|---------|
| useUIStream | `@json-render/react` | Both |
| Parse line → JSON.parse | `packages/react/src/hooks.ts` 41-65 | Both |
| applyPatch | `packages/react/src/hooks.ts` 163-204 | Both |
| buildUserPrompt | `packages/core/src/prompt.ts` | Both |
| Renderer | `@json-render/react` | Both |
| schema, defineCatalog | `@json-render/core`, `@json-render/react/schema` | Both |

---

## Not Shared (App-Specific)

| Area | Playground | Dashboard |
|------|------------|-----------|
| **Catalog** | `playgroundCatalog` | `dashboardCatalog` |
| **Registry** | `apps/web/lib/render/registry.tsx` | `examples/dashboard/lib/render/registry.tsx` |
| **Renderer wrapper** | `PlaygroundRenderer` (ValidationProvider) | `DashboardRenderer` |
| **Generate API** | `apps/web/app/api/generate/route.ts` | `examples/dashboard/app/api/generate/route.ts` |
| **UI components** | `apps/web/components/ui/*` | `examples/dashboard/components/ui/*` |
| **Page layout** | Versions, tabs, code pane | Widget grid, Add Widget card |

---

## Duplicated (Same Pattern, Different Files)

| Concept | Playground | Dashboard |
|---------|------------|-----------|
| Catalog definition | `apps/web/lib/render/catalog.ts` | `examples/dashboard/lib/render/catalog.ts` |
| Registry (components + actions) | `apps/web/lib/render/registry.tsx` | `examples/dashboard/lib/render/registry.tsx` |
| Renderer wrapper | `apps/web/lib/render/renderer.tsx` | `examples/dashboard/lib/render/renderer.tsx` |
| shadcn-style UI | `apps/web/components/ui/button.tsx` etc. | `examples/dashboard/components/ui/button.tsx` etc. |

UI components (Button, Card, Input, etc.) are duplicated per app, not in a shared package.

---

## Dashboard-Only

| Area | Notes |
|------|-------|
| DB | PostgreSQL, Drizzle, `widgets` table |
| Widget CRUD | `GET/POST/PATCH/DELETE /api/v1/widgets` |
| Reorder | `POST /api/v1/widgets/reorder` |
| dnd-kit | Drag-and-drop for widget order |
| recharts | Charts in widgets |

---

## Playground-Only

| Area | Notes |
|------|-------|
| Versions | Multiple generations, select/compare |
| Tabs | json, nested, stream, catalog |
| React/JSX export | `collectUsedComponents` + `serializeProps` + `generateJSX` |
| ValidationProvider | Form validation before submit |
| Rate limiting | Upstash Redis |
| MDX docs | Full docs site |
