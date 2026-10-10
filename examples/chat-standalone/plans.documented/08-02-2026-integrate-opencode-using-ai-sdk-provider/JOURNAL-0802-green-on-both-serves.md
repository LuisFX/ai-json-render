# JOURNAL-0802 — The provider lab is green on two stock serves

> **HISTORICAL RECEIPT (2026-08-02 morning).** Do **not** follow §4 as a reproduce runbook — workspace
> and UI paths changed later the same day.  
> **Ops today:** [`../../README.md`](../../README.md) · [`INDEX.md`](./INDEX.md) · lab dir
> [`../../fixtures/opencode-lab/`](../../fixtures/opencode-lab/)  
> **Date:** 2026-08-02  
> **Repo:** `~/code/luisfx/ai-json-render`, branch
> `feat/freeze-spec-with-ai-sdk-state-bridge-using-ai-sdk-opencode-provider`  
> **Status:** lab COMPLETE — `lib/ai-sdk-opencode.live.test.ts` **8/8 against both** a released
> `opencode` binary and `f1-opencode@dev` built from source. **Committed** on this branch (see milestone).  
> **Per-phase wire shapes:** [`FINDINGS.md`](./FINDINGS.md).

---

## 1. What this lab is, and what it deliberately is not

`examples/chat` is the official Vercel-style AI SDK chat example. Before today it knew **nothing** about
opencode. The entire experiment is: *can a plain AI SDK v6 client hold a real conversation against
**stock, un-souled** `opencode serve` by changing only the model seam, using
`ai-sdk-provider-opencode-sdk` as the bridge?*

The answer is **yes**, and the discipline that makes the answer meaningful is:

- **Zero surgery on opencode.** No Meridian agents, no plugins, no skills, no fork edits. Stock serve.
- **Minimal opencode knowledge in the app at lab close.** Seam files below; later QoL / Langfuse /
  effort dial grew the surface (see milestone) without forking OpenCode.
- **Provider opt-in.** With `AI_PROVIDER` unset, `resolveModel()` picks `openai` if `OPENAI_API_KEY`
  is set, else `gateway`. Lab `.env` sets `AI_PROVIDER=opencode` for the suite.

This is the "external lab" slot in the experiment matrix from
`f1-monorepo/apps/meridian-marketplace/plans.documented/07-20-2026-meridian-marketplace-heart-transplant-again/JOURNAL-0802-the-serve-pivot.md`.
It exists to make the provider hypothesis cheap to judge against the native SDK+SSE bet — not to pick a
winner for Meridian yet.

## 2. The seam, in four places

| File | Change |
|---|---|
| `lib/model.ts` | `useOpencode()`, lazy `createOpencode({ baseUrl, autoStartServer: false })`, `resolveOpencodeModel({ sessionId, createNewSession, agent, systemPrompt, directory })` |
| `lib/agent.ts` | `callOptionsSchema` gains `sessionId`; `prepareCall` swaps in the opencode model and forwards Mode B instructions as `systemPrompt` |
| `app/api/generate/route.ts` | parses `sessionId`; lifts `providerMetadata.opencode` off **`finish-step`**; `maxDuration = 300` |
| `app/c/[id]/page.tsx` | persists `opencodeSessionIdRef` across turns; renders `dynamic-tool` parts alongside `tool-*` (`app/page.tsx` redirects only — post-QoL) |

The seam is **dual** — the `ToolLoopAgent` is constructed with `resolveModel()` at module scope *and*
`prepareCall` can override the model per call. Opencode has to win in both or the OpenAI branch silently
takes over. That cost real time; don't re-learn it.

## 3. Two bugs found today, both now fixed

### 3.1 `f1-opencode` "wouldn't boot" — it was a stale install, not the source

I previously recorded this as an Effect version skew in the fork. **That was wrong**, and `FINDINGS.md`
now retracts it in place. The truth:

- Both `~/code/luisfx/opencode` and `~/code/f1-studio/f1-opencode` pin `effect: 4.0.0-beta.83` in the
  root catalog **and** in `bun.lock`, and both have byte-identical `Schedule.either` source at
  `packages/core/src/util/effect-flock.ts:50`.
- But `f1-opencode/packages/core/node_modules/effect` symlinked to a leftover `effect@4.0.0-beta.101`
  that **no lockfile entry referenced**. beta.101 dropped `Schedule.either`. Hence
  `TypeError: Schedule.either is not a function` in one clone and a clean boot in the other.

```bash
cd ~/code/f1-studio/f1-opencode
rm -rf node_modules packages/*/node_modules && bun install --frozen-lockfile
```

After that the fork boots and serves the whole lab. **`f1-opencode@dev` is a viable base engine.**
Treat any future boot failure as a stale `node_modules` before suspecting source or upstream drift.

**And there was nothing to copy between the forks.** Neither has a `.env` (only upstream
`packages/slack/.env.example`); their `.opencode/opencode.jsonc` files are byte-identical; and auth is
**machine-global** in `~/.local/share/opencode/auth.json`, which holds exactly one provider: `openai`.
Every serve on this box reads that same file, which is why the model had to be `openai/gpt-5-mini` —
`anthropic/*` is absent everywhere until `opencode auth login` adds it. Not a fork problem, not a
secrets problem.

### 3.2 Control-plane routes are workspace-scoped — the one that actually matters

Moving the lab from `:4096` to `:4097` made P3 fail with `404 PermissionNotFoundError` on an
`approvalId` the stream had *just* handed us. Cause, at
`packages/opencode/src/server/routes/instance/httpapi/middleware/workspace-routing.ts:87`:

```
?directory=  →  x-opencode-directory header  →  process.cwd() of the serve process
```

`/permission/:id/reply` and `/question[/:id/reply]` resolve their workspace that way. The route table
and the reply payload schema are **identical** across 1.17.8 and 1.18.11 — only the cwd fallback
differed:

- `:4096` was launched **inside** `/private/tmp/opencode-lab-scratch`, so unscoped replies worked *by luck*.
- `:4097` runs with cwd = the fork repo, so the same POST resolved to a different workspace → 404.

**P4 was worse than a failure: it was passing vacuously.** `GET /question` on the wrong workspace
returned `[]`, so the "recovery" loop replied to nothing and then asserted `Array.isArray([])`.

Fix: a `serveUrl()` helper in the test appends `?directory=$OPENCODE_DIRECTORY` to every control-plane
call, and P4 now asserts a real pending question was found, replied `200`, and drained.

**This is the finding to carry into Meridian.** In a container the serve's cwd will never be the
clinician's workspace, so any permission or question sidecar that omits `?directory=` passes locally and
404s in staging. It is invisible until you move the server.

## 4. How to reproduce, from cold

> **Superseded runbook.** Use [`../../README.md`](../../README.md) + `fixtures/opencode-lab`. The
> `/tmp/opencode-lab-scratch` block below is what we ran on the morning of 2026-08-02; it is obsolete
> as a workspace path but still explains why unscoped control-plane calls “worked by luck” on `:4096`.

```bash
# Historical morning boot (OBSOLETE cwd) — do not use for new work:
# mkdir -p /tmp/opencode-lab-scratch && cd /tmp/opencode-lab-scratch

# Current:
cd ~/code/luisfx/ai-json-render/examples/chat/fixtures/opencode-lab
~/.opencode/bin/opencode serve --port 4096 --hostname 127.0.0.1

# Fork from source (cwd = fork repo — proves ?directory= scoping)
cd ~/code/f1-studio/f1-opencode
bun run packages/opencode/src/index.ts serve --port 4097 --hostname 127.0.0.1

cd ~/code/luisfx/ai-json-render/examples/chat
OPENCODE_BASE_URL=http://127.0.0.1:4096 bun test lib/ai-sdk-opencode.live.test.ts
OPENCODE_BASE_URL=http://127.0.0.1:4097 bun test lib/ai-sdk-opencode.live.test.ts
```

`.env.local` should set `AI_PROVIDER=opencode`, `OPENCODE_MODEL=…`, and
`OPENCODE_DIRECTORY` to the **absolute** `fixtures/opencode-lab` path. The suite self-skips when
`AI_PROVIDER != opencode` or serve is unreachable.
## 5. Traps that cost time (pre-existing, not caused by this work)

1. **Node must be ≥ 24.** `fnm use 24` — v23 trips `ERR_PNPM_UNSUPPORTED_ENGINE`.
2. **`minimumReleaseAge: 2880` in this repo.** `ai@latest` (7.x) and even `ai@6.0.240` are refused as
   too fresh. We are pinned to the mature `ai@6.0.238` on the **v6** line. Don't "just upgrade."
3. **`pnpm type-check` at the repo root fails on `@json-render/core`** because `tsup` is missing from
   `packages/core/node_modules`. Pre-existing install gap in `ai-json-render`, unrelated to the lab.
   `examples/chat` alone is clean: `cd examples/chat && ./node_modules/.bin/tsc --noEmit`.
4. **Provider client-manager is a process singleton.** Mixing `createOpencode()` instances warns
   *"Client manager already initialized; new options were ignored."* Use
   `OpencodeClientManager.createInstance()` / `resetInstance()` for isolation.

## 6. What the lab settles, and what it does not

**Settled:** text streaming, session-per-conversation (and the shared-instance contamination footgun),
server-executed tools as `dynamic-tool` parts, client tools dying loudly, permission approvals as
`tool-approval-request` → `POST /permission/:id/reply`, Mode A spec fences surviving `pipeJsonRender`,
and Mode B `/state` patches painting a frozen Spec through `AiSdkStateBridge` — all with `systemPrompt`
reaching serve, so **no agent-markdown mount was needed** for state-fill.

**Not settled — the known hole:** `question.asked` becomes a stream `error` and the server session
blocks until replied out-of-band. Meridian's `askClinician` cannot ride `useChat` through this provider
alone; it needs a **question sidecar**. That is the single biggest input to the provider-vs-native-SSE
verdict, and it is the reason this lab does not by itself pick a transport.

**Also not settled:** whether the provider's `dynamic-tool` shape is rich enough for Meridian's
render-first previews under load, and how any of this behaves with a containerized serve behind nginx
(see the `?directory=` finding — that is where it will bite).

## 7. State at the moment of writing (historical)

At first write, the lab was still uncommitted. **That is no longer true** — see branch history through
[`MILESTONE-0802-GOLD-STANDARD.md`](./MILESTONE-0802-GOLD-STANDARD.md) (`713880a` and earlier).
`.env.local` remains untracked and holds live keys — **never commit it**.
**`f1-opencode` stayed clean** in git for this arc; only `node_modules` rebuilds. Zero fork edits holds.

## 8. What followed (same day — do not treat as still open)

1. Lab + QoL + effort dial + dual Langfuse committed — gold standard declared.
2. `?directory=` law and f1-opencode install hygiene fed into Meridian experiment docs.
3. **Question sidecar** remains the open product hole (still true) — see FINDINGS P4 / future work.
4. Specialized Meridian agents via `opencode agent create` — backlog
   [`FUTURE-TICKET-meridian-opencode-agents.md`](./FUTURE-TICKET-meridian-opencode-agents.md).
