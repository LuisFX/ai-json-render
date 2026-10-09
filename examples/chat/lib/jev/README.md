# Chat Jev composition

Select **jev** in the **default / jev** toggle. The default agent uses OpenAI (`OPENAI_API_KEY` via `@ai-sdk/openai`) and live tools. Jev uses TypeSafe System One (`TYPESAFE_API_KEY` via `@typesafe-ai/sdk`) and only selects among prepared explorer recipes — it cannot call weather/GitHub/crypto/HN tools or invent copy.

## Run

Set `OPENAI_API_KEY` and `TYPESAFE_API_KEY` in `examples/chat/.env.local`. `AI_GATEWAY_API_KEY` is only used if OpenAI is unset (agent + Perplexity web search).

From the repository root:

```sh
pnpm --filter example-chat dev
```

Use the portless URL printed by the command. With the HTTPS proxy enabled this is `https://chat-demo.json-render.localhost`.

## Files

- `grammar.ts` — chat-owned sample data and atomic candidates matching the explorer catalog (Text `content`, Table `{data, columns:{key,label}[]}`, Metric `{label,value,detail,trend}`).
- `typesafe-evaluator.ts` — TypeSafe System One adapter (duplicated from the playground; this example must not import `apps/web`).
- `compose.ts` — `experimental_composeSpec` over `explorerCatalog`.
- `response.ts` — streams composition snapshots as `data-spec` patches plus a final flat spec into the chat UI message stream.
- `../model.ts` — OpenAI-first language model; TypeSafe key helper.
