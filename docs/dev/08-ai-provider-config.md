# AI Provider Configuration

Phased plan for a centralized, configuration-friendly AI model setup across the monorepo.

---

## Goals

1. **Single source of truth** – No duplicated `lib/ai-model.ts` in each app
2. **Configuration-driven** – Switch providers via env vars, not code changes
3. **Extensible** – Add new providers (OpenAI, Google, etc.) without touching app code
4. **Type-safe** – Proper `LanguageModelV1` types and imports in consuming apps

---

## Phases

### Phase 1: Shared package (current)

**Deliverable:** `@repo/ai-config` package with `getModel()`.

- Single `getModel()` that reads env and returns the appropriate model
- Supports: Anthropic (direct), AI Gateway
- Auto-detect: prefer `ANTHROPIC_API_KEY` when set, else `AI_GATEWAY_API_KEY`
- Optional `AI_PROVIDER` to force a provider when both keys exist
- Optional `AI_MODEL` for model override

**Env vars:**
```
AI_PROVIDER=anthropic|gateway   # optional, auto-detect
AI_MODEL=claude-haiku-4-5       # optional, default: anthropic/claude-haiku-4.5
ANTHROPIC_API_KEY=...           # for direct Anthropic
AI_GATEWAY_API_KEY=...          # for Vercel AI Gateway
```

**Usage:**
```ts
import { getModel } from "@repo/ai-config";

const result = streamText({
  model: getModel(),
  system: systemPrompt,
  prompt: userPrompt,
});
```

---

### Phase 2: Explicit provider selection + OpenAI

**Deliverable:** Add OpenAI support, make `AI_PROVIDER` the primary switch.

- Add `@ai-sdk/openai` to the package
- When `AI_PROVIDER=openai`, use `OPENAI_API_KEY` and `AI_MODEL` (e.g. `gpt-4o`)
- Document provider-specific model ID formats
- Add `getModel(options?: { provider?: string; model?: string })` for overrides

**Env vars (extended):**
```
AI_PROVIDER=anthropic|gateway|openai
AI_MODEL=...                    # provider-specific format
OPENAI_API_KEY=...
```

---

### Phase 3: Config file + provider registry

**Deliverable:** Optional config file for complex setups.

- Support `ai.config.ts` or `AI_CONFIG` env (JSON) for:
  - Default provider and model
  - Per-route or per-feature overrides
  - Custom base URLs, headers
- Provider registry: pluggable providers via a simple interface
- Keep env vars as the primary mechanism; config file as override

---

### Phase 4: Runtime provider switching (optional)

**Deliverable:** Allow different models per request or per feature.

- `getModel({ provider, model })` for request-level overrides
- Use case: A/B testing models, premium vs standard tiers
- May require passing config through React context or middleware

---

## Package layout

```
packages/ai-config/
  src/
    index.ts       # getModel(), types
    providers/     # (Phase 3) provider implementations
  package.json
  tsconfig.json
  tsup.config.ts
```

---

## Migration checklist (Phase 1)

- [x] Create `packages/ai-config`
- [x] Add `getModel()` with Anthropic + Gateway support
- [x] Add `AI_PROVIDER` and `AI_MODEL` env handling
- [x] Migrate `apps/web` to use `@repo/ai-config`
- [x] Migrate `examples/dashboard` to use `@repo/ai-config`
- [x] Migrate `examples/remotion` to use `@repo/ai-config`
- [x] Migrate `examples/chat` to use `@repo/ai-config`
- [x] Migrate `examples/react-native` (uses `getModel({ apiKeys })` for Metro)
- [x] Remove duplicated `lib/ai-model.ts` from all apps
- [ ] Update `.env.example` and `turbo.json` with `AI_PROVIDER`, `AI_MODEL`
- [ ] Update docs (TOC, README)
