---
title: Which HTTP evaluator do the json-render hosts actually call?
slug: 2026-10-09-hosts-do-not-use-the-gateway-evaluator
date: 2026-10-09
type: research
arc: 2026-10-09-jev-machinery
status: live
read_order: 3
tags: [jev, typesafe, gateway]
---

# Which HTTP evaluator do the json-render hosts actually call?

Hub: [[HANDOFF-MEMORY]] · composer: [[2026-10-09-what-makes-jev-work]] · chat vs playground: [[2026-10-10-chat-domain-jev-decisions]] · journal: [[2026-10-10-journal]]

Two evaluators exist. The hosts that ship a Jev toggle use one. Core's public helper is the other.

## 1. The contract the composer needs

`Experimental_CompositionEvaluator` (`packages/core/src/experimental-compose.ts`) is a function `{ state, questions, signal } → { answers, usage? }`. Every question the composer builds is `type: "choice"` with `criteria: Record<string, string>` (`Experimental_ChoiceQuestion`, `:61-65`). `validateEvaluation` (`:240-265`) then demands `answers[name].choice` be a key of that map.

Noul and Score exist on TypeSafe's SDK (`apps/web/node_modules/@typesafe-ai/sdk/dist/index.d.mts`, `NoulQuestion` / `ScoreQuestion`, `:46-79`). The composer never asks them. A host adapter that returned `type: "noul"` would throw in `createTypeSafeEvaluator` (`apps/web/lib/jev/typesafe-evaluator.ts:29-30`).

## 2. What the playground and chat call

`createTypeSafeEvaluator` in both hosts (`apps/web/lib/jev/typesafe-evaluator.ts`, `examples/chat/lib/jev/typesafe-evaluator.ts`):

- `new TypeSafeClient({ apiKey, defaultModel: "jev-latest" })`
- `client.systemOne({ state: state as EntryType, questions }, { signal })`
- Map `result.usage.input_tokens` → composer `inputTokens`
- Keep `choice` and `confidence`; drop `probabilities` and `output_tokens`

SDK 0.6.0, measured from `apps/web/node_modules/@typesafe-ai/sdk`:

| fact | site |
|---|---|
| Default base URL | `https://api.typesafe.ai` (`TypeSafeClientConfig.baseURL`, env `TYPESAFE_BASE_URL`) |
| Default model | `jev-latest` (env `TYPESAFE_DEFAULT_MODEL`) |
| HTTP | `POST /v1/systemone` (`dist/index.mjs:554`, body `{ ...request, model }`) |
| API key env | `TYPESAFE_API_KEY` (`ENV.apiKey` in `dist/index.d.mts:315`) |
| Request | `SystemOneRequest`: `state: EntryType`, `questions`, optional `model` (`:147-154`) |
| Choice answer | `choice`, `confidence`, `probabilities` (`ChoiceResponse`, `:93-101`) |
| Usage | `input_tokens`, `output_tokens` (`Usage`, `:121-126`) |

`@ai-sdk/typesafe-ai` is not a dependency. Host READMEs state it targets AI SDK 7; this repo stays on `ai@6` (`apps/web/lib/jev/README.md:58`).

UI toggle string `typesafe-ai/jev` is a **host model id** (`apps/web/lib/use-playground-stream.ts:18`, `examples/chat/app/page.tsx:31`). It selects the composition route. It is **not** the string sent to TypeSafe. TypeSafe receives `jev-latest` unless `TYPESAFE_DEFAULT_MODEL` overrides the client.

Missing key: HTTP **503**, message names `TYPESAFE_API_KEY` (playground `apps/web/lib/jev/response.ts:49-56`).

## 3. What core still ships and who calls it

`experimental_createEvaluator` (`packages/core/src/experimental-evaluator.ts:36-80`):

- Requires a non-empty `apiKey` ("A Vercel AI Gateway API key is required.")
- `POST https://ai-gateway.vercel.sh/v4/ai/evaluation-model`
- Headers: `Authorization: Bearer`, `ai-gateway-protocol-version: 0.0.1`, `ai-gateway-auth-method: api-key`, `ai-evaluation-model-specification-version: 4`, `ai-model-id: ${model}`
- Body `{ state, questions }`
- Tests pass `model: "typesafe-ai/jev"` (`experimental-evaluator.test.ts`, 4 `it(`s)

Grep of production TS (2026-10-09): `createTypeSafeEvaluator` is the default `evaluate` in both host `compose.ts` files. `experimental_createEvaluator` is imported in `packages/core/src/index.ts:245`, its own test file, and mentioned in docs / `skills/core/SKILL.md` / docs-chat. **Zero call sites in `apps/web` or `examples/chat`.**

Public docs still describe the Gateway adapter as the way to self-host Jev (`apps/web/content/docs/jev.mdx:101-121`, `packages/core/README.md:13-24`). The playground capabilities section (`jev.mdx:167`) was updated this branch to name `TYPESAFE_API_KEY` and `@typesafe-ai/sdk`. Those two paragraphs describe different wires.

## 4. Why the split exists

The composer is provider-independent. Gateway v4 is an optional transport with no AI SDK import. These hosts cannot use `@ai-sdk/typesafe-ai` on `ai@6`, and the product rule for this branch is OpenAI + TypeSafe native, not a Gateway key. The adapter that satisfies that rule is `createTypeSafeEvaluator`. The Gateway helper remains for apps that want that path.

## What is NOT known

- Byte compatibility: whether Gateway v4 `{ state, questions }` is the same document TypeSafe `/v1/systemone` accepts. Not probed.
- Whether `probabilities` from System One should be surfaced on `Experimental_CompositionStep`. Today they are dropped.
- Whether `experimental_createEvaluator` will stay the documented default now that the in-repo hosts diverged.
- TypeSafe server behavior under abort / retry vs the composer's `evaluateWithSignal` race (`experimental-compose.ts:222-237`). SDK retries default `maxRetries: 2`, timeout 10000 ms per attempt (`RetryPolicy` / `TypeSafeClientConfig` in the `.d.mts`).
