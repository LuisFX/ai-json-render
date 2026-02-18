# Developer Documentation - Table of Contents

TLDR of each doc at a glance.

---

## Apps and ports (`pnpm dev`)

| App | Package | Port | Description |
|-----|---------|------|-------------|
| Web | `web` | 3000 | Docs & Playground |
| Dashboard | `example-dashboard` | 3001 | Example dashboard app |
| Remotion | `example-remotion` | 3002 | Video example (explicit port) |
| Chat | `example-chat` | 3003 | Chat example |

Ports 3000–3003 are used when all apps start together. If a port is busy, Next.js picks the next available one. React Native (`example-react-native`) is run separately: `npx expo start` in `examples/react-native`.

---

## Playground deep-dive (port 3000)

| Doc | Topic |
|-----|-------|
| [playground/TOC.md](../playground/TOC.md) | Index |
| [playground/00-ARCHITECTURE.md](../playground/00-ARCHITECTURE.md) | Pipeline diagram |
| [playground/01-JSONL-PATCHES.md](../playground/01-JSONL-PATCHES.md) | JSONL, patches, parsing |
| [playground/02-PROMPT-FLOW.md](../playground/02-PROMPT-FLOW.md) | Prompts, catalog |
| [playground/03-REACT-CODE.md](../playground/03-REACT-CODE.md) | Spec to React code |

---

## Dashboard deep-dive (port 3001)

| Doc | Topic |
|-----|-------|
| [dashboard/TOC.md](../dashboard/TOC.md) | Index |
| [dashboard/00-ARCHITECTURE.md](../dashboard/00-ARCHITECTURE.md) | Pipeline, widgets, DB |
| [dashboard/01-JSONL-PATCHES.md](../dashboard/01-JSONL-PATCHES.md) | JSONL (same as playground) |
| [dashboard/02-PROMPT-FLOW.md](../dashboard/02-PROMPT-FLOW.md) | dashboardCatalog, actions |
| [dashboard/03-DB-PERSISTENCE.md](../dashboard/03-DB-PERSISTENCE.md) | Save, load, reconstitute, reorder |

---

## Playground vs Dashboard (side-by-side)

| Doc | Topic |
|-----|-------|
| [comparison/TOC.md](../comparison/TOC.md) | Index |
| [comparison/00-OVERVIEW.md](../comparison/00-OVERVIEW.md) | Ports, layout, one-sentence summary |
| [comparison/01-SHARED-CODE.md](../comparison/01-SHARED-CODE.md) | Shared packages, pipeline, duplicated |
| [comparison/02-SIDE-BY-SIDE.md](../comparison/02-SIDE-BY-SIDE.md) | Feature comparison tables |
| [comparison/03-FINAL-SPEC.md](../comparison/03-FINAL-SPEC.md) | Spec structure (root, elements, state, UIElement) |

---

## FormSpec JSON enhancement (F# FormSpec mapping)

| Doc | Topic |
|-----|-------|
| [form-spec/TOC.md](../form-spec/TOC.md) | Index |
| [form-spec/00-BRAINSTORM.md](../form-spec/00-BRAINSTORM.md) | Phased plan: Steps, Form fields, Scoring, ClinicalPathway |

---

## [01-system-overview.md](./01-system-overview.md)

**What it is.** json-render is a Generative UI framework: you define a catalog of components and actions, the AI generates JSON specs constrained to that catalog, and you render them as React components.

**TLDR:** Packages (core, react, shadcn, react-native, remotion), key concepts (Spec, Catalog, Registry), getting started, and how it all fits together.

---

## [02-architecture.md](./02-architecture.md)

**Layers and flow.** Layered architecture: Presentation → API → Rendering → Core → Context. How Spec, Catalog, Registry, and providers interact.

**TLDR:** System diagram, package dependencies, core abstractions (Spec, UIElement, Catalog, Registry), context providers (State, Action, Visibility, Validation), streaming via useUIStream and buildUserPrompt.

---

## [03-component-system.md](./03-component-system.md)

**Catalog + Registry.** Define components in a catalog (Zod props, descriptions, events); implement them in a registry. AI generates specs from the catalog.

**TLDR:** defineCatalog, defineRegistry, component props (emit, on, bindings), dynamic expressions ($state, $cond, $bindState), visibility, repeat, built-in actions, shadcn components.

---

## [04-data-flow.md](./04-data-flow.md)

**Streaming and prompts.** Real-time streaming: AI emits JSON patches, client applies them incrementally. buildUserPrompt for user prompts, catalog.prompt() for system prompts.

**TLDR:** useUIStream, buildUserPrompt (fresh/refinement/state modes), JSON Patch format and paths, API route pattern, SpecStream compiler, iteration flow.

---

## [05-api-reference.md](./05-api-reference.md)

**API surface.** Types, functions, and hooks from core and react packages.

**TLDR:** Spec, UIElement, JsonPatch; defineSchema, defineCatalog, buildUserPrompt; defineRegistry, Renderer, createRenderer; useUIStream, StateProvider, ActionProvider; component props and hooks.

---

## [06-testing.md](./06-testing.md)

**Testing strategy.** Unit tests (core, react, components), integration tests (streaming, API), E2E (playground). Vitest, Testing Library, MSW.

**TLDR:** Test structure, vitest config, core/visibility/action tests, useUIStream and Renderer tests, component tests, mocking, CI.

---

## [07-prompt-engineering.md](./07-prompt-engineering.md)

**LLM integration.** Catalog-driven prompts: catalog.prompt() for system prompt, buildUserPrompt for user prompt. Refinement modes.

**TLDR:** catalog.prompt() with customRules, buildUserPrompt options, what the LLM sees (component names + schemas + descriptions), how correctness is enforced (prompt, parsing, renderer fallback, optional catalog.validate()), JSON Patch format, API route pattern, catalog best practices.

---

## [08-ai-provider-config.md](./08-ai-provider-config.md)

**AI provider configuration.** Centralized `@repo/ai-config` package for switching LLM providers via env vars. Phased plan for extensibility.

**TLDR:** getModel() from @repo/ai-config, AI_PROVIDER/AI_MODEL env, Anthropic + Gateway support, Phase 2 (OpenAI), Phase 3 (config file).

---

## Quick reference

| Doc | Topic | Key exports / concepts |
|-----|-------|------------------------|
| 01 | Overview | Spec, Catalog, Registry, packages |
| 02 | Architecture | Layers, providers, streaming |
| 03 | Components | defineCatalog, defineRegistry, emit, on, bindings |
| 04 | Data flow | useUIStream, buildUserPrompt, patches |
| 05 | API | Types, functions, hooks |
| 06 | Testing | Vitest, MSW, mocking |
| 07 | Prompts | catalog.prompt(), buildUserPrompt |
| 08 | AI config | getModel(), AI_PROVIDER, AI_MODEL |
