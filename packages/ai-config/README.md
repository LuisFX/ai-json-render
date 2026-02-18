# @repo/ai-config

Centralized AI provider configuration for the monorepo. Switch LLM providers via env vars without changing app code.

## Usage

```ts
import { getModel } from "@repo/ai-config";

const result = streamText({
  model: getModel(),
  system: systemPrompt,
  prompt: userPrompt,
});
```

## Configuration (env vars)

| Var | Description | Default |
|-----|-------------|---------|
| `AI_PROVIDER` | Force provider: `anthropic` or `gateway` | Auto-detect |
| `AI_MODEL` | Model ID (e.g. `claude-haiku-4-5`) | `anthropic/claude-haiku-4.5` |
| `AI_GATEWAY_MODEL` | Alias for `AI_MODEL` (legacy) | Same as above |
| `ANTHROPIC_API_KEY` | Direct Anthropic API key | - |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key | - |

**Auto-detect:** Uses Anthropic when `ANTHROPIC_API_KEY` is set, else Gateway when `AI_GATEWAY_API_KEY` is set.

## Options (programmatic override)

```ts
getModel({
  provider: "anthropic",
  model: "claude-sonnet-4-5",
  apiKeys: {
    anthropic: process.env.ANTHROPIC_API_KEY,
    gateway: process.env.AI_GATEWAY_API_KEY,
  },
});
```

Use `apiKeys` when the bundler (e.g. Metro) does not inline `process.env` from the package.

## Phases

See [docs/dev/08-ai-provider-config.md](../../docs/dev/08-ai-provider-config.md) for the full phased plan (OpenAI, config file, etc.).
