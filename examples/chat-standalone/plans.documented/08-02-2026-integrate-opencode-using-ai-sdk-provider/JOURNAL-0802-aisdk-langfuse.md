# JOURNAL-0802 — AI SDK → Langfuse (fair OpenAI vs OpenCode)

> Lab: `examples/chat` · Goal: OpenAI turns land in the same self-hosted Langfuse as OpenCode Path A, keyed by `conv_*`.

## What landed

Marketplace-style Next exporter (no `@meridian/core` dependency):

| File | Role |
|---|---|
| `instrumentation.ts` | Registers `LangfuseSpanProcessor` on Node |
| `lib/observability/register.ts` | Lazy processor + `NodeTracerProvider` |
| `lib/observability/langfuse.ts` | `forceFlush` |
| `lib/observability/langfuse-route.ts` | `wrapLangfuseRoute` + `withLangfuseTrace` |
| `lib/observability/telemetry.ts` | `aiTelemetry` / `isLangfuseEnabled` (`AI_TELEMETRY=0` kill switch) |
| `app/api/generate/route.ts` | Trace `chat.generate`, `sessionId = conversationId` |
| `lib/agent.ts` | `experimental_telemetry: aiTelemetry({ functionId: "examples-chat-generate" })` |

Deps: `@langfuse/otel` ^4, `@langfuse/tracing` ^4, `@opentelemetry/sdk-trace-node` ^2 (match marketplace).

Env (chat `.env.local`): `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL=http://localhost:51793` (underscore — JS SDK ≠ plugin `LANGFUSE_BASEURL`).

## Fair-compare recipe

| Provider | Filter in Langfuse | Source |
|---|---|---|
| OpenAI | session = `conv_*` | Next AI SDK spans |
| OpenCode | session = `ses_*` for `opencode.turn`; also app `conv_*` | Serve Path A plugin + thin AI SDK spans |

## E2E receipts

Proved 2026-08-02 after Next restart with `instrumentation.ts` loaded.

### OpenAI

| Field | Value |
|---|---|
| `conversationId` | `conv_lf1785705563` |
| Langfuse trace | `01490064db09dd5e3f3873ca124309ec` |
| Trace name | `chat.generate` |
| Tags | `examples-chat`, `generate`, `openai` |
| Generation | `examples-chat-generate:ai.streamText.doStream` (`gpt-5.4-mini`, ~9.1k in / 21 out) |

### OpenCode (Path A still healthy + app span)

| Field | Value |
|---|---|
| `conversationId` | `conv_oc1785705607` |
| App Langfuse trace | `f30772ac7646abf8d60e82a62c9e7119` (`chat.generate`, tags include `opencode`) |
| Serve session | `ses_03ba6ca93ffeI7daOf1Yz56ATy` |
| Path A turn | `8eb78fbdb88cb49b497651b3e32de10f` (`opencode.turn`) |

Fair compare works: filter session `conv_*` for Next AI SDK; filter `ses_*` / `opencode.turn` for serve Path A. Correlate via assistant metadata `opencodeSessionId`.
