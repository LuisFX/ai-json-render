# PRD — `ai-sdk-provider-opencode-sdk` lab in `examples/chat`

> **ARCHIVE (executed plan).** Do **not** use this as the ops runbook.  
> **Ops today:** [`../../README.md`](../../README.md) · [`INDEX.md`](./INDEX.md) · [`MILESTONE-0802-GOLD-STANDARD.md`](./MILESTONE-0802-GOLD-STANDARD.md)  
> **Written:** 2026-08-02 · **Companion:** [`VISION.md`](./VISION.md) · **Results:** [`FINDINGS.md`](./FINDINGS.md)  
> **Journal:** [`JOURNAL-0802-green-on-both-serves.md`](./JOURNAL-0802-green-on-both-serves.md)  
> **Scope guard:** this PRD covered ONLY installing and exercising `ai-sdk-provider-opencode-sdk` with
> `ai@^6` inside `examples/chat`, against a stock `opencode serve`. Later QoL / Langfuse / effort dial
> are documented in the journals + milestone — not fully restated here.  
> **Status:** EXECUTED 2026-08-02 — live suite `lib/ai-sdk-opencode.live.test.ts` **8/8 pass against two
> independent stock serves**: released binary 1.17.8 and `f1-opencode@dev` from source.
> Re-measured after the workspace-scoping fix.

---

## 1. Fixed points (tree + runtime, 2026-08-02)

| Fact | Evidence |
|---|---|
| Example is AI SDK v6 | `package.json` → `ai@^6.0.238`, `@ai-sdk/react@^3.0.240` |
| **Dual** model seam | `lib/model.ts` `resolveModel()` **and** `lib/agent.ts` `prepareCall` (OpenAI overrides model per request). Opencode must win in both. |
| Chat route | `app/api/generate/route.ts` (not `/api/chat`); `maxDuration = 300` |
| Client tools ignored | 7 tools on `ToolLoopAgent`; provider warns + drops them |
| Render contract is text-level | Spec fences → `pipeJsonRender`; Mode B → `AiSdkStateBridge` |
| Server engines used | **Both** pass: released binary **1.17.8** on `:4096`, and `f1-opencode@dev` from source on `:4097` (reports `version: "local"` at `/global/health`; `package.json` says 1.18.11) |
| Control plane is workspace-scoped | `/permission/:id/reply` and `/question[/:id/reply]` resolve workspace from `?directory=` → `x-opencode-directory` → **serve `process.cwd()`**. Omit it and calls 404 on any serve not launched inside the lab dir |
| Provider version | `ai-sdk-provider-opencode-sdk@3.0.6` (AI SDK v6 / LanguageModelV3 line) |
| Working model here | `openai/gpt-5-mini` (OpenAI creds only; Anthropic not in catalog) |
| Auth is machine-global | `~/.local/share/opencode/auth.json` — one provider (`openai`). Not per-repo, not per-fork; nothing to copy between them |

Repo rules: `npm view` before install; stay on **ai v6** (not 7.x); honor `minimumReleaseAge`; portless
dev; no fork edits. When `AI_PROVIDER` is unset, `resolveModel()` picks **`openai` if `OPENAI_API_KEY` is set, else `gateway`** (lab `.env.example` defaults `AI_PROVIDER=openai`).

## 2. Setup

```bash
# 1. Provider (from examples/chat; use mature v6, not ai@7)
pnpm add ai-sdk-provider-opencode-sdk@3.0.6 ai@6.0.238

# 2. Env (.env.local — untracked, never commit)
AI_PROVIDER=opencode
OPENCODE_BASE_URL=http://127.0.0.1:4096
OPENCODE_MODEL=openai/gpt-5-mini
# Absolute path — canonical lab workspace (in git):
OPENCODE_DIRECTORY=/absolute/path/to/examples/chat/fixtures/opencode-lab
```

> **Historical note:** the first green runs used `/tmp/opencode-lab-scratch`. That path is **obsolete**.
> See [`OUT-OF-GIT-CONFIG.md`](./OUT-OF-GIT-CONFIG.md).

Pick `OPENCODE_MODEL` from `opencode models` — only IDs your global auth covers will resolve, and an
uncovered ID fails as `AI_APICallError: OpenCode returned no response data for model "…"`, which reads
like a transport bug and is not one.

### Seam (implemented)

- [`lib/model.ts`](../../lib/model.ts) — `useOpencode()`, lazy `createOpencode({ baseUrl, autoStartServer: false })`,
  `resolveOpencodeModel({ sessionId, createNewSession, systemPrompt, directory })`.
  Default `createNewSession: true` unless `sessionId` set or `OPENCODE_SHARE_SESSION=1`.
- [`lib/agent.ts`](../../lib/agent.ts) — `prepareCall` opencode branch before OpenAI; Mode B instructions
  forwarded as `systemPrompt`; optional `sessionId` on `callOptionsSchema`.
- [`app/api/generate/route.ts`](../../app/api/generate/route.ts) — passes `sessionId`; surfaces
  `opencodeSessionId` / cost via `messageMetadata` on **`finish-step`** (not `finish` — AI SDK
  `TextStreamPart.finish` has no `providerMetadata`).
- [`app/c/[id]/page.tsx`](../../app/c/[id]/page.tsx) — persists sessionId; renders `dynamic-tool` parts.
  (`app/page.tsx` only redirects `/` → `/c/<id>`.)

## 3. Phases

Each phase writes evidence into [`FINDINGS.md`](./FINDINGS.md). Known failures that are reproduced
on purpose are PASS. Durations are the measured `:4096` run; the suite is 8 tests because P2 is two.

| Phase | Gate | Result |
|---|---|---|
| **P0** Smoke | Text streams; sessionId + cost metadata | **PASS** ~4s |
| **P1** Tool truth | Server tools as dynamic parts; client tools warn+ignored; UI handles `dynamic-tool` | **PASS** ~9s |
| **P2a** Session resume | `sessionId` resume recalls `ORANGE-ZEBRA-42`; ids match | **PASS** ~5s |
| **P2b** Session footgun | Shared model instance, `createNewSession: false` → same session recalls `SHARED-FOXGLOVE` | **PASS** ~4s |
| **P3** Permission ask | `tool-approval-request` → `POST /permission/:id/reply` `{reply:"once"}` → 200 | **PASS** ~9s (via provider `permission` ruleset; directory `opencode.json` alone did not gate) |
| **P4** Question hole | Stream error on `question.asked`; pending at `GET /question`; reply drains it | **PASS** ~5s (documented failure) |
| **P5** Mode A spec fence | Fence through provider → `pipeJsonRender` → 3 `data-spec` parts | **PASS** ~6s |
| **P6** Mode B state-fill | `systemPrompt` reaches serve; 3 `/state` patches paint frozen Spec via bridge | **PASS** ~4s |

### P4 is the phase that lies

P4 **passed vacuously** the first time it ran against `:4097`. Unscoped `GET /question` resolved to the
serve's own cwd (the fork repo, not the lab dir), returned `[]`, the recovery loop replied to nothing,
and `expect(Array.isArray([]))` went green. The suite now scopes every control-plane call through
`serveUrl()` and P4 asserts a **real** pending question was found, replied `200`, and drained to empty.
If you ever see P4 green with an empty `pendingQuestionIds`, it is not green.

### P6 detail (branch namesake)

Freeze-spec Mode B: set Mode B instructions as opencode `systemPrompt`, prompt for `/state`-only
patches, run through `pipeJsonRender` + `AiSdkStateBridge`. **Finding:** per-request `systemPrompt`
**does** reach serve — no need for a mounted state-fill agent markdown for this lab.

## 4. Acceptance (all answered in FINDINGS)

1. Plain AI SDK v6 app ↔ stock serve with only a model-seam change? **Yes (P0)**
2. Server tool parts + client-tool death? **Dynamic parts + loud ignore (P1)**
3. Session recipe / footgun? **createNewSession or sessionId+last-message; shared instance contaminates (P2)**
4. Permission wire shape? **tool-approval-request + permission.reply (P3)**
5. Question failure + recovery? **Stream error + out-of-band reply (P4)**
6. Text render contracts? **Mode A + Mode B both survive (P5, P6)**

## 5. Risks — settled

| Risk | Outcome |
|---|---|
| `ai` bump | Stayed on mature `6.0.238`; typecheck green |
| SDK/server skew | Provider `@opencode-ai/sdk@1.18.10` against serve **1.17.8 and 1.18.11** — route table and reply payload schemas identical across both |
| UI vs dynamic tools | Predicted miss on `tool-*` only; fixed with `dynamic-tool` case |
| Question unrecoverable | Recoverable via `POST /question/:id/reply` |
| f1-opencode boot | **Resolved — not an Effect source skew.** A stale `packages/core/node_modules/effect` symlink pointed at an unreferenced `effect@4.0.0-beta.101` (which dropped `Schedule.either`) while both catalog and `bun.lock` pin `beta.83`. `rm -rf node_modules packages/*/node_modules && bun install --frozen-lockfile` fixes it; the fork then serves the full suite. Treat any future boot failure as a stale install first. |
| Control-plane 404s | **Was a real bug, now fenced.** `serveUrl()` appends `?directory=$OPENCODE_DIRECTORY` to every `/permission` and `/question` call. Never rely on serve cwd — in a container it is never the caller's workspace |

## 6. Out of scope (unchanged)

Meridian tools/agents/skills on serve · production question sidecar UI · native SSE client ·
multi-tenancy · making opencode the example default (remains env-gated).

## 6b. QoL follow-up (2026-08-02 evening)

After the lab went green, chat QoL landed (see [`JOURNAL-0802-chat-qol.md`](./JOURNAL-0802-chat-qol.md)).
Observability that was still “deferred” in the first QoL pass **later shipped** the same day:

| Change | Shape |
|---|---|
| Conversation URL SSOT | `/` redirects to `/c/[id]`; sidebar select/new = `router.push`; no `activeId` dual-sync |
| Provider toggle | UI `openai \| opencode` per request; env is default only; models map via `openai/<id>` |
| Console breadcrumbs | `[chat/generate] provider=… model=… conversationId=… sessionId=… mode=…` |
| AI SDK telemetry | `experimental_telemetry` via `aiTelemetry()`; Next `instrumentation.ts` + Langfuse exporter |
| Serve Path A | Langfuse plugin → `opencode.turn` / `ses_*` — [`JOURNAL-0802-serve-telemetry-e2e.md`](./JOURNAL-0802-serve-telemetry-e2e.md) |
| App Langfuse | `sessionId = conv_*` — [`JOURNAL-0802-aisdk-langfuse.md`](./JOURNAL-0802-aisdk-langfuse.md) |
| Shared effort dial | OpenAI `reasoningEffort` / serve `variant` — [`JOURNAL-0802-variant-effort.md`](./JOURNAL-0802-variant-effort.md) |

Switching conversations clears `opencodeSessionIdRef` so sessions do not leak across threads.

## 7. Runbook — how to run, how to test, what to expect

> **Prefer [`../../README.md`](../../README.md) for current boot.** The copy below is the **historical**
> dual-serve proof transcript (cwd differences were deliberate). Canonical workspace is now
> `fixtures/opencode-lab`.

Everything below was executed on 2026-08-02 and the outputs are transcribed, not predicted.

### 7.1 Start a serve (you need exactly one; the lab was proved on both)

```bash
# A — released binary, launched inside the lab dir
# Historical: /tmp/opencode-lab-scratch — NOW use fixtures:
cd ~/code/luisfx/ai-json-render/examples/chat/fixtures/opencode-lab
~/.opencode/bin/opencode serve --port 4096 --hostname 127.0.0.1

# B — the clean fork, from source, cwd = the fork repo (deliberately NOT the lab dir)
# Proves control-plane must pass ?directory= (suite does via serveUrl())
cd ~/code/f1-studio/f1-opencode
bun run packages/opencode/src/index.ts serve --port 4097 --hostname 127.0.0.1
```

The two cwds differ **on purpose**: since the suite scopes every control-plane call explicitly, serve cwd
is now irrelevant and `:4097` proves it. Before the fix, only `:4096` passed — and only because its cwd
happened to be the lab dir. Keep both if you want the regression to stay visible.

Confirm before doing anything else, because every failure mode downstream looks different from "the
server isn't up":

```bash
curl -s 127.0.0.1:4096/global/health   # {"healthy":true,"version":"1.17.8"}
curl -s 127.0.0.1:4097/global/health   # {"healthy":true,"version":"local"}
```

A source-run serve self-reports `version: "local"`, **not** its `package.json` version. That string is
how you tell which engine you are actually talking to.

### 7.2 Run the suite

```bash
cd ~/code/luisfx/ai-json-render/examples/chat
bun run test:opencode                                          # uses .env.local → :4096
OPENCODE_BASE_URL=http://127.0.0.1:4097 bun run test:opencode   # override → the fork
```

The test file reads `.env.local` itself and **only fills variables that are not already set**, so an
inline `OPENCODE_BASE_URL=…` wins. No dev server is required — the suite calls `streamText` directly.

### 7.3 What a real pass looks like

```
 8 pass
 0 fail
 23 expect() calls
Ran 8 tests across 1 file. [45.46s]      # :4096 — 36.15s on :4097
```

Two kinds of alarming output are **expected** and do not mean failure:

- **P3** prints `[opencode-provider] Client manager already initialized; new options … were ignored.`
  The provider's client manager is a process singleton and P3 builds its own `createOpencode()`.
- **P4** prints a full `error:` with a stack trace out of `ai-sdk-provider-opencode-sdk/dist/index.js:890`.
  Reproducing that error **is** the assertion. A P4 that prints no stack trace has stopped testing anything.

Per-phase evidence lands in stdout as JSON keyed by `phase`. The values worth eyeballing:

| Phase | Expect to see |
|---|---|
| P0 | non-empty `sessionId` (`ses_…`), a `cost` in real dollars, `finishReasons: ["stop"]` |
| P1 | `toolCalls` containing `bash` with `dynamic: true`, and **never** `getWeatherClient` |
| P2a/P2b | `sessionId === secondSessionId`; codewords `ORANGE-ZEBRA-42` / `SHARED-FOXGLOVE` echoed back |
| P3 | `tool-approval-request` in `partTypes`, `P3-reply status: 200 body: "true"`, text ends `permission-lab-ok` |
| P4 | non-empty `pendingQuestionIds`, then `P4-recover` with `stillPending: []` |
| P5 | `specPartCount: 3`, `firstSpec` = an `add` patch at `/root` |
| P6 | `applied: { applied: 3, skipped: 0 }`, `title: "Opencode Mode B"`, `count: 2` |

### 7.4 The green that isn't: silent skips

The suite self-skips when `AI_PROVIDER != opencode` or `GET /global/health` doesn't answer
`{"healthy":true}` inside 2s. That keeps CI green, and it will happily fool you:

```
 0 pass
 8 skip
 0 fail
Ran 8 tests across 1 file. [83.00ms]     # exit code 0
```

**The tell is the clock.** A real run takes 36–46 seconds; a skipped run takes under 100ms. Check
`8 pass`, never just the exit code.

### 7.5 Trying it in the browser

```bash
bun run dev     # portless → http://chat-demo.json-render.localhost:1355
```

Requires a global `portless` (`npm i -g portless`); the `predev` hook fails loudly without it. With
`AI_PROVIDER=opencode` in `.env.local` the chat talks to serve: server-executed tools render from
`dynamic-tool` parts, and `opencodeSessionIdRef` in `app/c/[id]/page.tsx` keeps one opencode session per
conversation, cleared by New/Clear. **Do not exercise anything that triggers the `question` tool** — the
turn will error and the server session blocks until replied out-of-band (P4). That is the missing
sidecar, not a bug in the app.

### 7.6 When it breaks, check these in order

1. **`8 skip`** → `AI_PROVIDER` isn't `opencode`, or serve is down / on another port.
2. **`no response data for model "…"`** → the model ID isn't in your auth. `opencode models`.
3. **`404 PermissionNotFoundError` / `[]` from `GET /question`** → a control-plane call lost its
   `?directory=`, or `OPENCODE_DIRECTORY` doesn't match the workspace the turn actually ran in.
4. **`TypeError: Schedule.either is not a function`** on a source-run fork → stale `node_modules`;
   reinstall per §5. It is never a `.env`, secrets, or upstream-source problem.
5. **Config edits appearing to do nothing** → opencode reads config **once at startup**. Restart serve.
