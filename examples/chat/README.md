# Chat Example

An AI-powered data explorer that streams rich, interactive UI directly into a chat interface. The default assistant uses tool calls to fetch real data (weather, GitHub, crypto, Hacker News, web search), then generates a json-render spec that renders inline alongside the conversation using shadcn components, Recharts, and React Three Fiber. The **default / jev** toggle also runs experimental Jev composition from prepared sample recipes — Jev cannot call those tools or invent copy.

## What it shows

- **Streaming specs inside chat messages** -- `pipeJsonRender` on the server merges the AI SDK UI stream with json-render spec patches so text, tool-call indicators, and rendered UI all appear in the correct order within a single message bubble.
- **ToolLoopAgent with live data** -- the default model loops through tool calls (weather, GitHub repos/PRs, crypto prices, Hacker News, web search) to gather real data before generating UI. OpenAI is first (`OPENAI_API_KEY` via `@ai-sdk/openai`); AI Gateway is only used if OpenAI is unset.
- **Experimental Jev** -- select **jev** to compose a dashboard from prepared explorer candidates via TypeSafe System One (`TYPESAFE_API_KEY`). Follow-ups replay the last assistant `data-spec` as `initialSpec`.
- **Full catalog/registry stack** -- a catalog constrains what the model can produce; the registry maps every component to a real React implementation (shadcn, Recharts charts, R3F 3D scenes).
- **State and interactivity** -- `$state`, `$bindState`, visibility, and actions work inside the streamed spec, so the rendered UI is interactive, not static.

## Setup

```bash
pnpm install          # from the monorepo root
cd examples/chat
cp .env.example .env.local
```

Set the required environment variables in `.env.local`:

<table>
<thead>
<tr><th>Variable</th><th>Required</th><th>Description</th></tr>
</thead>
<tbody>
<tr><td><code>OPENAI_API_KEY</code></td><td>Yes (default agent)</td><td>OpenAI key via <code>@ai-sdk/openai</code></td></tr>
<tr><td><code>OPENAI_MODEL</code></td><td>No</td><td>Defaults to <code>gpt-5.4-mini</code></td></tr>
<tr><td><code>TYPESAFE_API_KEY</code></td><td>Yes (jev toggle)</td><td>TypeSafe native key, not a Gateway key</td></tr>
<tr><td><code>AI_GATEWAY_API_KEY</code></td><td>No</td><td>Fallback when OpenAI is unset; Perplexity web search</td></tr>
<tr><td><code>AI_GATEWAY_MODEL</code></td><td>No</td><td>Gateway model when OpenAI is unset</td></tr>
<tr><td><code>KV_REST_API_URL</code></td><td>No</td><td>Upstash Redis URL for rate limiting</td></tr>
<tr><td><code>KV_REST_API_TOKEN</code></td><td>No</td><td>Upstash Redis token</td></tr>
<tr><td><code>RATE_LIMIT_PER_MINUTE</code></td><td>No</td><td>Defaults to <code>10</code></td></tr>
<tr><td><code>RATE_LIMIT_PER_DAY</code></td><td>No</td><td>Defaults to <code>100</code></td></tr>
</tbody>
</table>

Rate limiting is a no-op when the Upstash variables are not set.

## Run

```bash
pnpm dev
# http://chat-demo.json-render.localhost:1355
```

Requires global [`portless`](https://github.com/vercel-labs/portless). The `predev` script checks for it automatically.

## Build checks

From the monorepo root, run `pnpm --filter example-chat check-types` and `pnpm turbo run build --filter=example-chat`.

The type check also verifies that Streamdown and `@streamdown/code` resolve the same Shiki installation. The workspace dependency extension and scoped override keep their exported highlighting types compatible without relying on whichever Shiki version happens to be hoisted.

## Files

- `app/page.tsx` -- chat UI with `useChat`, default/jev toggle, message rendering, and inline spec display
- `app/api/generate/route.ts` -- default agent through `pipeJsonRender`, or Jev composition as `data-spec` parts
- `lib/agent.ts` -- `createAgent()` `ToolLoopAgent` with system prompt from `explorerCatalog.prompt()`
- `lib/model.ts` -- OpenAI-first language model and TypeSafe key helper
- `lib/jev/` -- prepared explorer candidates, TypeSafe evaluator, UI-stream adapter
- `lib/tools/` -- tool definitions for weather, GitHub, crypto, Hacker News, and web search
- `lib/render/catalog.ts` -- component catalog (shadcn base + custom metrics, tables, charts, tabs, 3D)
- `lib/render/registry.tsx` -- maps catalog types to React components (shadcn, Recharts, R3F)
- `lib/render/renderer.tsx` -- `ExplorerRenderer` wrapping `StateProvider`, `VisibilityProvider`, `ActionProvider`, and `Renderer`
