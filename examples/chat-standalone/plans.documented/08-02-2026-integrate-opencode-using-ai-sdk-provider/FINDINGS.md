# FINDINGS — `ai-sdk-provider-opencode-sdk` lab in `examples/chat`

> **Date:** 2026-08-02
> **Branch:** `feat/freeze-spec-with-ai-sdk-state-bridge-using-ai-sdk-opencode-provider`
> **Provider:** `ai-sdk-provider-opencode-sdk@3.0.6`
> **AI SDK:** `ai@6.0.238` (+ `@ai-sdk/react@3.0.240`)
> **Serve:** verified green on **two** stock, un-souled servers:
>   - standalone `~/.opencode/bin/opencode` **1.17.8** on `:4096` (first green: scratch cwd; **now** `fixtures/opencode-lab`)
>   - `f1-opencode@dev` from source **1.18.11** on `:4097` (cwd = fork repo). Note: a source-run serve
>     reports `{"healthy":true,"version":"local"}` — the `1.18.11` comes from `package.json`, not health.
> **Model:** `openai/gpt-5-mini` (only OpenAI credentials configured in this environment)
> **Automation:** `lib/ai-sdk-opencode.live.test.ts` — **8/8 pass against both**

---

## Verdict (one paragraph)

A plain AI SDK v6 `ToolLoopAgent` / `streamText` client can hold a full conversation against stock
`opencode serve` with only a model-seam change. Text streams, server tools arrive as dynamic parts,
session resume works, permission approvals round-trip, Mode A spec fences survive `pipeJsonRender`,
and Mode B `systemPrompt` state-fill paints a frozen Spec through `AiSdkStateBridge`. The hard hole is
exactly as the source scout predicted: **`question.asked` becomes a stream `error` while the server
session blocks** — recoverable via `POST /question/:id/reply`. Client tools are ignored loudly.
When `AI_PROVIDER` is unset, `resolveModel()` picks **`openai` if `OPENAI_API_KEY` is set, else
`gateway`** (lab `.env.example` defaults `AI_PROVIDER=openai`).

**Canonical workspace (post-lab):** [`../../fixtures/opencode-lab/`](../../fixtures/opencode-lab/) —
early receipts that say `/tmp/opencode-lab-scratch` are historical. See [`INDEX.md`](./INDEX.md).

**2026-08-02 follow-through:** Path A Langfuse + Next AI SDK Langfuse (`conv_*`) + shared effort dial
landed. This lab is the **gold standard** — see
[`MILESTONE-0802-GOLD-STANDARD.md`](./MILESTONE-0802-GOLD-STANDARD.md). Future tuning via OpenCode
agent create (primary | sub | both):
[`FUTURE-TICKET-meridian-opencode-agents.md`](./FUTURE-TICKET-meridian-opencode-agents.md).

---

## Shared reasoning effort (2026-08-02 follow-on)

Same UI dial for both providers — **no serve/adapter fork**:

| Path | Wire |
|---|---|
| OpenAI (AI SDK) | `providerOptions.openai.reasoningEffort` |
| OpenCode serve | prompt body `variant` (official; adapter `OpencodeSettings.variant`) |

Public [server docs](https://opencode.ai/docs/server/) Messages summary omits `variant`; OpenAPI
`/doc` + generated SDK include it. Lab journal:
[`JOURNAL-0802-variant-effort.md`](./JOURNAL-0802-variant-effort.md).

**Map of the whole lab (in-repo + out-of-git):**
[`ARCHITECTURE-TODAY.md`](./ARCHITECTURE-TODAY.md) ·
[`OUT-OF-GIT-CONFIG.md`](./OUT-OF-GIT-CONFIG.md) ·
[`JOURNAL-0802-serve-telemetry-e2e.md`](./JOURNAL-0802-serve-telemetry-e2e.md).

---

## Setup corrections vs. original PRD

| PRD assumption | Actual |
|---|---|
| Route `/api/chat` | Route is [`app/api/generate/route.ts`](../../app/api/generate/route.ts) |
| Single seam `resolveModel()` | Dual seam: module-scope `ToolLoopAgent.model` **and** `prepareCall` (OpenAI override). Opencode must win in both — see [`lib/model.ts`](../../lib/model.ts) + [`lib/agent.ts`](../../lib/agent.ts) |
| Default model `anthropic/claude-sonnet-4-5` | No Anthropic creds here; catalog + auth → `openai/gpt-5-mini` |
| `ai@latest` (was 7.x) | Stay on **v6** line; mature pin `6.0.238` (repo `minimumReleaseAge: 2880`) |
| `baseUrl` only | Provider also accepts `hostname`/`port`; `baseUrl` works |
| SessionId on finish part | AI SDK `TextStreamPart` **`finish` has no `providerMetadata`** — sessionId lands on **`finish-step`** |
| Tool parts `tool-*` | Provider emits **`dynamic-tool`** / stream `tool-call` with `dynamic: true`; UI predicate updated in `page.tsx` |
| `opencode.json` `permission.bash: ask` | Did **not** fire under this serve+directory setup; **provider `permission` ruleset** DID |

---

## Phase results

### P0 — Smoke: text streams

**PASS.**

```json
{
  "text": "hello-from-opencode",
  "sessionId": "ses_03c9064a4ffeDE7Q8NrEezH50D",
  "cost": 0.00429725,
  "finishReasons": ["stop"],
  "partTypes": ["start","start-step","reasoning-start","text-start","text-delta","text-end","reasoning-end","finish-step","finish"]
}
```

`providerMetadata.opencode = { sessionId, messageId, cost }` confirmed via finish-step / result metadata.

### P1 — Tool truth

**PASS.**

- Client tool (`getWeatherClient`) → warning (verbatim):
  > `[opencode-provider] Custom tool definitions are ignored. OpenCode executes tools server-side.`
  (also AI SDK Warning System duplicate)
- Server tool: `bash` with `dynamic: true`, parts include `tool-input-*`, `tool-call`, `tool-result`
- UI: `page.tsx` now handles `part.type === "dynamic-tool"` in addition to `tool-*`

### P2 — Session truth

**PASS (both halves).**

1. **Footgun:** same model instance with `createNewSession: false` → identical `sessionId` across two
   `generateText` calls; second turn remembered `SHARED-FOXGLOVE`.
2. **Fix:** `createNewSession: true` then resume with `{ sessionId }` + last-message-only → remembered
   `ORANGE-ZEBRA-42`; session IDs matched.

Client persistence: `opencodeSessionIdRef` in `page.tsx` reads finish metadata and sends `sessionId` on
subsequent turns; cleared on new/clear chat.

Env lab switch: `OPENCODE_SHARE_SESSION=1` forces the footgun path in `resolveOpencodeModel`.

### P3 — Permission ask round-trip

**PASS** (via provider session permission ruleset).

```json
{
  "approvals": [{ "approvalId": "per_fc3704860001Ln1VcKrD3G6y4Q" }],
  "partTypes": [..., "tool-approval-request", "tool-result", ...],
  "reply": { "status": 200, "body": "true" },
  "text": "...permission-lab-ok"
}
```

Wire shape:

- Stream part: `{ type: "tool-approval-request", approvalId, toolCall: { toolName, input, dynamic: true, providerExecuted: true } }`
- Reply: `POST /permission/{requestID}/reply` body `{ "reply": "once" | "always" | "reject" }`

Finding: scratch `opencode.json` `{ "permission": { "bash": "ask" } }` alone did not gate; pass
`permission: [{ permission: "bash", pattern: "*", action: "ask" }]` on the model settings.

### P4 — `question` hole (reproduced on purpose)

**PASS as documented failure + recovery.**

```json
{
  "warning": "[opencode-provider] OpenCode question.asked events are not yet mapped to AI SDK responses...",
  "error": "OpenCode question.asked events are not yet mapped to AI SDK responses... Question ID: que_...",
  "partTypes": ["start","start-step","reasoning-start","tool-input-start","error"],
  "pendingQuestionIds": ["que_..."],
  "afterReply": []
}
```

- Stream errors immediately on `question.asked`
- Server lists the pending question at `GET /question`
- Recovery: `POST /question/{id}/reply` with `{ "answers": [["Dogs"]] }` clears pending
- Without reply, the session stays blocked (earlier 180s timeout before abort/reply)

### P5 — Mode A spec fence survival

**PASS.** Spec fence streamed through provider → `pipeJsonRender` → 3 `data-spec` parts
(`/root`, element, …). Render contract is transport-independent.

### P6 — Mode B freeze-spec state-fill (branch namesake)

**PASS.** `systemPrompt` on the opencode model settings **does reach** serve (no fallback agent mount
needed). Three `/state` patches applied via `AiSdkStateBridge`:

```json
{ "title": "Opencode Mode B", "count": 2, "items": [{"id":"x"},{"id":"y"}] }
```

`prepareCall` in `agent.ts` forwards Mode B instructions as `systemPrompt` when `AI_PROVIDER=opencode`.

---

## Ops / environment findings

1. **f1-opencode@dev boot failure was a stale install, not an Effect source skew.**
   *(This entry previously blamed Effect version skew in the fork — that was wrong.)*
   Both forks pin `effect: 4.0.0-beta.83` in the catalog **and** in `bun.lock`, and both have identical
   `Schedule.either` source at `packages/core/src/util/effect-flock.ts:50`. But f1-opencode's
   `packages/core/node_modules/effect` symlink pointed at a leftover `effect@4.0.0-beta.101` that no
   lockfile entry referenced — and beta.101 dropped `Schedule.either`. Fix:

   ```bash
   rm -rf node_modules packages/*/node_modules && bun install --frozen-lockfile
   ```

   After that the fork boots and serves the whole lab 8/8. Nothing about `.env` files or secrets was
   involved: **there are no `.env` files in either fork** (only upstream `packages/slack/.env.example`),
   their `.opencode/opencode.jsonc` files are byte-identical, and credentials are global anyway (below).
2. **Auth and model catalog are machine-global, not per-repo or per-fork.** Credentials live in
   `~/.local/share/opencode/auth.json`, which currently holds exactly one provider: `openai`. Every
   serve — standalone binary or either fork — reads the same file, so `anthropic/*` IDs are absent
   everywhere until `opencode auth login` adds them. Nothing to "copy between forks."
3. **Control-plane routes are workspace-scoped — this bit us and matters for Meridian.**
   `/permission/:id/reply` and `/question[/:id/reply]` resolve their workspace via
   `?directory=` → `x-opencode-directory` header → **`process.cwd()` of the serve process**
   (`server/routes/instance/httpapi/middleware/workspace-routing.ts:87`). The route table is identical
   across 1.17.8 and 1.18.11 and so is the reply payload schema; only the *cwd fallback* differed.
   - `:4096` was launched **inside** `/private/tmp/opencode-lab-scratch`, so unscoped replies worked by luck.
   - `:4097` runs with cwd = the fork repo, so the same unscoped POST returned
     `404 PermissionNotFoundError` even though the stream had just handed us the `approvalId`.
   - P4 was worse than a failure: it *passed vacuously*, because `GET /question` on the wrong workspace
     returned `[]` and the "recovery" loop had nothing to reply to.

   The test now sends `?directory=$OPENCODE_DIRECTORY` on every control-plane call via a `serveUrl()`
   helper, and P4 asserts a real pending question was found, replied `200`, and drained.
   **Never rely on serve cwd** — in a container it will never be the caller's workspace.
4. **Provider client-manager singleton warning** when mixing `createOpencode()` instances in one process:
   > Client manager already initialized; new options from createOpencode() were ignored.
   Use `OpencodeClientManager.createInstance()` / `resetInstance()` for isolation (P3 test hit this).

---

## Answers to the six acceptance questions

1. **Does a plain AI SDK v6 app hold a conversation against stock serve with only a model-seam change?**
   **Yes** (P0 + wired `/api/generate` + `useChat`).
2. **What do server-executed tool parts look like, and do client tools die loudly?**
   Dynamic `tool-call`/`tool-result` with `dynamic: true`; client tools warn and are ignored (P1).
3. **Correct session-per-conversation recipe / wrong recipe?**
   Fresh session per conversation (`createNewSession: true`) or persist `sessionId` + last user message;
   shared model instance without isolation = contaminated context (P2).
4. **Exact wire shape of permission approval?**
   `tool-approval-request` → `POST /permission/:id/reply` `{ reply: "once"|"always"|"reject" }` (P3).
5. **Exact failure shape of `question`, recoverable?**
   Stream `error` + warning; pending at `GET /question`; reply clears — **yes, recoverable out-of-band** (P4).
6. **Do text-level render contracts survive?**
   **Yes** — Mode A fences and Mode B `/state` patches both work (P5, P6).

---

## Implications for Meridian experiments

- **Provider chat experiment** can proceed for free-form + Mode B-style text contracts.
- **Authoring HITL** still needs a **question sidecar** (P4) — do not expect `useChat` alone to carry
  `askClinician`.
- **Permission docks** can reuse AI SDK `tool-approval-request` + `permission.reply` (P3).
- Prefer **provider session `permission` ruleset** over hoping directory `opencode.json` alone gates tools.
- **Always scope control-plane calls with `?directory=` (or `x-opencode-directory`).** Meridian's serve
  will run in a container whose cwd is unrelated to the clinician's workspace, so any permission or
  question sidecar that omits it will 404 in staging while passing locally.
- `f1-opencode@dev` **is** a viable substrate — it serves the full lab identically to the released
  binary. Treat a boot failure as a stale `node_modules` before suspecting the source.
