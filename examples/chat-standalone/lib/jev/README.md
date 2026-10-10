# Standalone Jev composition

Select **jev** next to Web search. The default agent uses OpenAI / OpenCode and live tools. Jev uses TypeSafe System One (`TYPESAFE_API_KEY` via `@typesafe-ai/sdk`) and only selects among prepared explorer recipes — it cannot call weather/GitHub/crypto/HN tools, invent copy, or fill a frozen Mode B spec.

Follow-ups send `currentSpec` from the version timeline as `initialSpec`. Body flag is `composer: "jev"` (`modelId` stays a GPT id).

This is the playground compose path on explorer recipes. It is not a chat router. Jev here only answers the composer's Choice questions (root / membership / layout, or sequential add/replace/remove/move). It does not decide intent (new tree vs edit vs not-a-UI), recipe family (weather vs crypto vs GitHub vs HN), whether a named city/asset is among those recipes, whether the user asked for live data, or whether to publish a low-confidence layout. Those are extra System One questions for a host router that does not exist yet. Do not invent copy or live fetches to paper over them.

## Run

Set `OPENAI_API_KEY` and `TYPESAFE_API_KEY` in `examples/chat-standalone/.env.local`.

From the repository root:

```sh
pnpm --filter example-chat-standalone dev
```

Use the portless URL printed by the command. With the HTTPS proxy enabled this is `https://chat-standalone-demo.json-render.localhost`.

## Files

- `grammar.ts` — sample data and atomic candidates matching the explorer catalog (Text `content`, Table `{data, columns:{key,label}[]}`, Metric `{label,value,detail,trend}`).
- `typesafe-evaluator.ts` — TypeSafe System One adapter (duplicated from `examples/chat`; this example must not import `apps/web`).
- `compose.ts` — `experimental_composeSpec` over standalone `explorerCatalog`.
- `response.ts` — streams composition snapshots as `data-spec` patches plus a final flat spec into the chat UI message stream.
- `request.ts` — branches generate away from `ToolLoopAgent` before that module loads.
