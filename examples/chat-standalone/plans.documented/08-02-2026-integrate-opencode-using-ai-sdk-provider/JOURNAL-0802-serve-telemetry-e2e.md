# JOURNAL-0802 — Serve telemetry E2E (Path A / Path B / dual-boot)

> **Date:** 2026-08-02  
> **Companion:** f1-monorepo `apps/meridian-marketplace/.../JOURNAL-0802-serve-observability.md` §9  
> **Scope:** prove Langfuse plugin traces on `opencode serve` through this chat app's `/api/generate` (not live test suite alone).

## Setup (measured)

- **Serve:** f1-opencode source, cwd `examples/chat/fixtures/opencode-lab`, port **4096**
- **Lab config (in git):** `fixtures/opencode-lab/opencode.json` — `experimental.openTelemetry: true`, plugin `@langfuse/opencode-observability-plugin@latest`
- **Langfuse file:** `~/.config/opencode/opencode-langfuse.json` → self-hosted `http://127.0.0.1:51793`, `environment: opencode-lab`
- **Serve env (Path A):** `LANGFUSE_BASEURL=http://127.0.0.1:51793` + `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` from chat `.env.local`; **`OTEL_EXPORTER_OTLP_ENDPOINT` unset**
- **Chat:** `examples/chat` @ `127.0.0.1:3010`

### PHI / naming traps (retest)

1. Plugin reads **`LANGFUSE_BASEURL`** (no underscore). Chat `.env.local` uses **`LANGFUSE_BASE_URL`**. Setting only the chat name does **not** move the plugin off cloud default — set **`LANGFUSE_BASEURL`** on the **serve** process.
2. Never point clinical sessions at `https://cloud.langfuse.com` by omission.

## Path A — Langfuse only

**Procedure**

1. `curl "http://127.0.0.1:4096/config?directory=$OPENCODE_DIRECTORY"` (200) — directory = absolute `fixtures/opencode-lab`
2. `POST http://127.0.0.1:3010/api/conversations` `{"create":true}` → `conv_dTXL1U530l6EiaaH`
3. `POST /api/generate` with `provider: "opencode"`, `modelId: "openai/gpt-5.6-luna"`, `reasoningEffort: "low"`, user message “Reply with exactly one word: ok”

**Receipts**

| Artifact | Value |
|---|---|
| OpenCode session | `ses_03be543a3ffeJEmNAJqT1oPksX` |
| Langfuse trace id | `be52ce35234667179207cbfbca858248` |
| Trace name | `opencode.turn` |
| Observations | 3 |
| Model reply | `ok` (stream) |
| Cost metadata | `opencodeCost` ~0.00624 |

**Result: PASS** — Langfuse API (`/api/public/traces`, Basic auth with project keys) shows new `opencode.turn` after marketplace noise (~19:54Z).

**Note:** Serve stdout did **not** echo plugin `OTEL tracing initialized` lines to `/tmp/opencode-serve-path-a.log`; proof is Langfuse API + stream session id, not serve log grep.

## Path B — OTLP → Tempo

**Env:** `OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318` on serve (plus `experimental.openTelemetry: true` in `fixtures/opencode-lab/opencode.json`).

**Receipts (dual-boot run, same day)**

- Tempo: `http://127.0.0.1:3200/api/search?q={resource.service.name="opencode"}&limit=5`
- Sample trace IDs: `1d4dea1da9b68a83bcea2d84578ca6c2` (`ModelsDev.refresh`), `35cf8e68d564813b5a87b166a0648dd1` (`sql.execute`)

**Result: PASS** for engine/infra spans (Path B).

## Dual-boot — both env vars on one serve

**Procedure:** Restart serve with **both** `LANGFUSE_BASEURL` and `OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318`. Repeat generate (“one word: dual”).

| Check | Result |
|---|---|
| Stream session | `ses_03be4ecf3ffeM50x9PLdzz0e4o` |
| Tempo opencode spans | **Present** (same search as Path B) |
| Langfuse `opencode.turn` for that session | **Absent** (session query → 0 traces) |
| Latest Langfuse `opencode.turn` | Still `be52ce35234667179207cbfbca858248` (Path-A-only run) |

**Result: FAIL for Path A under dual-boot** — confirms conflict; do not enable both on one serve PID until tracer ownership is separated (collector, second serve, or plugin/engine change).

## Copy-paste boot (Path A lab)

```bash
# Terminal A — serve (Path A only)
cd ~/code/luisfx/ai-json-render/examples/chat/fixtures/opencode-lab
unset OTEL_EXPORTER_OTLP_ENDPOINT OTEL_EXPORTER_OTLP_HEADERS
export LANGFUSE_BASEURL=http://127.0.0.1:51793
# export LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY (Doppler or chat .env.local — never commit)
bun /Users/luisfx/code/f1-studio/f1-opencode/packages/opencode/src/index.ts serve --port 4096 --hostname 127.0.0.1

# Terminal B — chat
cd ~/code/luisfx/ai-json-render/examples/chat
eval "$(fnm env)" && fnm use 24
./node_modules/.bin/next dev --turbopack --port 3010 --hostname 127.0.0.1
```
## Status at end of session

- Serve restarted **Path A only** on `:4096` (OTLP unset); chat `:3010` up.
- Full map + out-of-git inventory:
  [`ARCHITECTURE-TODAY.md`](./ARCHITECTURE-TODAY.md),
  [`OUT-OF-GIT-CONFIG.md`](./OUT-OF-GIT-CONFIG.md).
- **Shipped next (same day):** Next→Langfuse `conv_*` correlation —
  [`JOURNAL-0802-aisdk-langfuse.md`](./JOURNAL-0802-aisdk-langfuse.md).
- **Still open:** Path B on an alternate process (or post-collector); never dual-boot A+B on one PID.
