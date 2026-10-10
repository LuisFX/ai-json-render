# JOURNAL-0802 — Chat QoL after the provider lab (BOTH providers green)

> **Date:** 2026-08-02 · **Repo:** `ai-json-render` · **Branch:**
> `feat/freeze-spec-with-ai-sdk-state-bridge-using-ai-sdk-opencode-provider`
> **Companion:** [`JOURNAL-0802-green-on-both-serves.md`](./JOURNAL-0802-green-on-both-serves.md) (lab 8/8),
> [`INDEX.md`](./INDEX.md), [`README.md`](../../README.md) (stack runbook).

---

## 1. What landed

1. **URL as conversation SSOT** — `app/page.tsx` redirects to `/c/[id]`. Chat UI is
   `app/c/[id]/page.tsx`; Select/New = `router.push`. No parallel `activeId` state.
2. **Provider toggle** — OpenAI (AI SDK) vs OpenCode serve, **per request**. Shared matrix models;
   Opencode catalog form is `openai/<id>`. Env is default only
   (`AI_PROVIDER` / `NEXT_PUBLIC_AI_PROVIDER`).
3. **Console breadcrumbs** — `/api/generate` logs  
   `[chat/generate] provider=… model=… conversationId=… sessionId=… mode=…`
4. **AI SDK `experimental_telemetry` hook** on `ToolLoopAgent` (`AI_TELEMETRY=0` to disable) —
   later wired to a real Next Langfuse exporter (see §4).
5. **Session hygiene** — `opencodeSessionIdRef` clears on route change / New / Clear / provider flip.
6. **Client/server split** — UI imports [`lib/chat-provider.ts`](../../lib/chat-provider.ts) only.
   Importing [`lib/model.ts`](../../lib/model.ts) into a client component pulls `@opencode-ai/sdk`
   (Node `fs` / `child_process`) and 500s the page. That trap is now fenced.

## 2. Verified live (same day)

Both providers answered through the UI and `/api/generate`:

```text
[chat/generate] provider=opencode model=openai/gpt-5-mini conversationId=conv_… sessionId=none mode=generate
[chat/generate] provider=openai model=gpt-5.4-mini conversationId=conv_… sessionId=none mode=generate
```

`/` → `307` → `/c/conv_…`; deep-link GET on that path → `200`.

## 3. f1-opencode — nothing to stage

Working tree at `~/code/f1-studio/f1-opencode` is **clean**. The earlier boot failure was a stale
`node_modules` symlink to unreferenced `effect@4.0.0-beta.101`; after
`rm -rf node_modules packages/*/node_modules && bun install --frozen-lockfile`, serve boots from
source and pins `effect@4.0.0-beta.83` as the lockfile intends. **Zero fork source edits** for this
lab or the QoL pass — install hygiene only, and that is not a git change.

## 4. Observability (supersedes the original “not done” note)

When this journal was first written, Path A/B and Next export were still open. **They shipped the same
day:**

| Path | Receipt |
|---|---|
| Serve Path A (Langfuse plugin → `ses_*`) | [`JOURNAL-0802-serve-telemetry-e2e.md`](./JOURNAL-0802-serve-telemetry-e2e.md) |
| Next AI SDK → Langfuse (`conv_*`) | [`JOURNAL-0802-aisdk-langfuse.md`](./JOURNAL-0802-aisdk-langfuse.md) — `instrumentation.ts` + `lib/observability/*` |
| Dual-boot Path A+B on one serve PID | **Forbidden** (conflict law) — same serve-telemetry journal |

The thin `experimental_telemetry` hook alone is **not** enough; the exporter is what makes OpenAI
comparable to OpenCode in Langfuse.

## 5. How to re-run the stack

See the **Stack: f1-opencode + this chat app** section in [`examples/chat/README.md`](../../README.md).
