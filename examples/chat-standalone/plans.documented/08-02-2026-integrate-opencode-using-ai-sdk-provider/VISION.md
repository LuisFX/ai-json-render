# VISION — The chat example talks to a running opencode, through nothing but an AI SDK provider

> **THESIS ONLY (origin intent).** Not the ops runbook and not the final shipped surface.  
> **Read instead:** [`INDEX.md`](./INDEX.md) → [`MILESTONE-0802-GOLD-STANDARD.md`](./MILESTONE-0802-GOLD-STANDARD.md) · [`FINDINGS.md`](./FINDINGS.md)  
> **Written:** 2026-08-02 · **Scope:** `examples/chat` ONLY · **Companion:** [`PRD.md`](./PRD.md) (archive)  
> **This plan was EXCLUSIVELY about testing** `ai-sdk-provider-opencode-sdk` **with `ai@^6` in this example.**  
> What actually shipped grew beyond “one seam” (QoL UI, dual Langfuse, effort dial) — that is intentional
> follow-through, documented in the journals + milestone. Do not treat DoD #1 below as a constraint on
> later commits.

---

## The one sentence

**This chat example knows nothing about opencode — it is a plain AI SDK v6 app with a single model seam
(`resolveModel()` in `lib/model.ts`) — so if swapping that one seam for
[`ai-sdk-provider-opencode-sdk`](https://github.com/ben-vargas/ai-sdk-provider-opencode-sdk) makes it hold a
conversation against a locally running `opencode serve`, we have proven that opencode's entire server-side
agent machinery (agents, skills, tools, permissions, sessions) can be consumed by ANY existing AI-SDK client
without that client learning a new transport.**

## Why this experiment exists (the upstream context, one paragraph)

A sibling product (Meridian, in `f1-monorepo`) maintains a bespoke serverless reimplementation of opencode's
agent loop and wants to delete it by consuming a stock `opencode serve` (the clean fork at
`~/code/f1-studio/f1-opencode`, branch `dev`). The riskiest question in that migration is the seam: does an
AI-SDK-native client survive, or must every client be rewritten onto `@opencode-ai/sdk` + SSE? This example
is the cheapest possible falsification test because it is the *most ignorant possible client*: it was built
against gateway models, its agent loop is a stock `ToolLoopAgent`, and its only render contract is text
(spec fences via `pipeJsonRender`). If the provider works here, it works anywhere AI SDK v6 works.

## What a source-level scout already established (2026-08-02 — verify live, don't re-derive)

A read-only scout audited the provider's source and the fork's SDK before this plan was written:

- **Survives the provider:** text streaming; server-side tool calls as real AI-SDK tool parts
  (`providerExecuted: true, dynamic: true`); reasoning parts; permission asks as `tool-approval-request`
  with a full reply round-trip (`permission.reply`); files/sources; usage + dollar cost in
  `providerMetadata.opencode.cost`; abort → `session.abort`.
- **Does NOT survive:** opencode's `question` tool (`question.asked` becomes a stream **error** while the
  server session blocks); client-defined tools (warned + ignored — opencode executes tools server-side);
  step boundaries (whole run = one AI-SDK step); subagent/task/snapshot/compaction parts (dropped);
  sampling params (warn + no-op).
- **Session semantics:** the opencode session is bound to the **model instance**, not the call. A
  module-scope model = one session shared across every request in the process. `{ sessionId }` resumes;
  the id is surfaced on every finish part. History is flattened into one synthetic user message
  (`[Assistant]: ...` prefixes) — resume + full history = the model sees everything twice.
- **Package health:** v3.0.6 (2026-06-11), `3.x` = AI SDK v6 line, MIT, single maintainer, well-tested
  event converter. Deps: `@opencode-ai/sdk ^1.2.15` (fork serves 1.18.x — shapes matched on inspection).

All of the above is source-reading, not runtime observation. **This lab is the runtime observation.**

## Definition of done

1. **Smoke:** a browser conversation in this example streams text end-to-end from `opencode serve` with
   `AI_PROVIDER=opencode` and zero other code changes beyond the model seam.
2. **Tool truth:** a turn that triggers opencode server-side tools renders those tool calls in this UI as
   tool parts (and the example's own seven client tools are provably ignored, warning observed).
3. **Session truth:** the module-scope-agent footgun is demonstrated (two tabs share one session without
   `createNewSession`), then defeated; the sessionId-persistence + last-user-message-only pattern is
   demonstrated to preserve multi-turn context without duplication.
4. **Render contract survives:** a spec-fence response (` ```spec `) streams through the provider and
   `pipeJsonRender` renders it — proving text-level contracts are transport-independent.
5. **The two known holes are reproduced on purpose** and their exact failure shapes documented: the
   `question` tool (stream error + blocked session) and a permission `ask` (approval part → reply).
6. **Mode B freeze-spec state-fill** (this branch's namesake): a frozen Spec receives `/state` patches
   through the provider + `AiSdkStateBridge` — proving the per-request `systemPrompt` path.
7. **A FINDINGS.md** records every observation with enough precision that the Meridian experiments
   (`f1-monorepo/apps/meridian-marketplace/plans.documented/08-02-2026-serve-*`) can cite it instead of
   re-running it.

## What we refuse

| Refuse | Why |
|---|---|
| Touching the opencode fork's source | The whole thesis is *stock serve*; a fork edit invalidates the result |
| Adding Meridian/clinical anything to this example | This lab proves the SEAM, not the domain |
| Building a question-tool sidecar here | Known gap; reproducing the failure is the deliverable, fixing it belongs to the Meridian experiments |
| Wrapping the provider in new abstractions | One env-gated branch in `resolveModel()`; the provider is used exactly as its README intends |
| Keeping `ai@6.0.33` | The provider is developed against `^6.0.85`; testing on a stale minor produces noise, not findings |

## Read order

This VISION → [`PRD.md`](./PRD.md) → run the phases → `FINDINGS.md` (written during the run).
