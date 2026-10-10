# OUT-OF-GIT CONFIG — Inventory (2026-08-02)

> **Intentional.** We change OpenCode / machine files that are **not** in any git repo.
> That is fine. This document is the memory so a future session can rebuild the lab without
> archaeology.
>
> **Never commit secrets.** Redact keys in journals; keep real keys in Doppler / local env only.

Companion architecture: [`ARCHITECTURE-TODAY.md`](./ARCHITECTURE-TODAY.md).

**Update 2026-08-02 (later same day):** lab workspace config moved **into git** at
[`fixtures/opencode-lab/`](../../fixtures/opencode-lab/). `/tmp/opencode-lab-scratch` is obsolete
(pointer `MOVED.md` left there). Secrets / machine auth remain out-of-git.

---

## 1. Mental model: three layers

| Layer | In git? | Examples |
|---|---|---|
| **A. Lab app + fixture** | Yes | `examples/chat` code, journals, **`fixtures/opencode-lab/opencode.json`** |
| **B. Lab secrets / local env** | No (gitignored) | `examples/chat/.env.local` |
| **C. OpenCode machine** | No | `~/.config/opencode/*`, `~/.local/share/opencode/*`, plugin npm cache |

Layer C is what this file inventories. Layer B is listed for cross-wiring traps.

---

## 2. OpenCode global config (`~/.config/opencode/`)

### 2.1 `opencode.jsonc` — **untouched for personal TUI**

```json
{
  "$schema": "https://opencode.ai/config.json"
}
```

We deliberately did **not** put the Langfuse plugin here, so everyday `opencode` TUI is unchanged.

### 2.2 `opencode-langfuse.json` — **WE CREATED THIS** (still out of git)

**Path:** `~/.config/opencode/opencode-langfuse.json`  
**Created:** 2026-08-02 (telemetry Path A adoption)

Shape (secrets redacted):

```json
{
  "publicKey": "pk-lf-…",
  "secretKey": "sk-lf-…",
  "baseUrl": "http://127.0.0.1:51793",
  "environment": "opencode-lab"
}
```

| Field | Why |
|---|---|
| `baseUrl` | **PHI trap.** Plugin default is `https://cloud.langfuse.com`. Must be self-hosted. |
| `environment` | Label for Langfuse filters (`opencode-lab`). |
| keys | From chat `.env.local` / Doppler — **same Langfuse project** as marketplace |

**Plugin credential precedence** ([Langfuse OpenCode docs](https://langfuse.com/integrations/developer-tools/opencode)):

- If **both** `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are set on the **serve process**, env wins over this file.
- Base URL env name is **`LANGFUSE_BASEURL`** (no underscore between BASE and URL).

### 2.3 Other files in that directory (pre-existing, not lab-owned)

`package.json`, lockfiles, `node_modules` under `~/.config/opencode/` — OpenCode’s own global package area.

---

## 3. Lab workspace — **NOW IN GIT**

**Path:** `examples/chat/fixtures/opencode-lab/`  
**Was:** `/tmp/opencode-lab-scratch/` (ephemeral; obsolete)

### Tracked

- `opencode.json` — plugin + `experimental.openTelemetry` + `permission.bash: ask`
- `README.md` — boot notes
- `.gitignore` — ignores runtime/tool writes; keeps the three tracked files

### Boot

```bash
cd ~/code/luisfx/ai-json-render/examples/chat/fixtures/opencode-lab
unset OTEL_EXPORTER_OTLP_ENDPOINT
export LANGFUSE_BASEURL=http://127.0.0.1:51793
# LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY
bun /Users/luisfx/code/f1-studio/f1-opencode/packages/opencode/src/index.ts \
  serve --port 4096 --hostname 127.0.0.1
```

Chat `.env.local`:

```bash
OPENCODE_DIRECTORY=/Users/luisfx/code/luisfx/ai-json-render/examples/chat/fixtures/opencode-lab
```

Verify:

```bash
curl -s http://127.0.0.1:4096/global/health
curl -s "http://127.0.0.1:4096/config?directory=$OPENCODE_DIRECTORY" | jq '{plugin, experimental}'
```

---

## 4. Serve process environment (not a file — still “out of git”)

Lab default **Path A only**:

| Variable | Value / source | Required for |
|---|---|---|
| `LANGFUSE_PUBLIC_KEY` | from chat `.env.local` / Doppler | Path A |
| `LANGFUSE_SECRET_KEY` | same | Path A |
| `LANGFUSE_BASEURL` | `http://127.0.0.1:51793` | Path A (**name trap**) |
| `LANGFUSE_ENVIRONMENT` | `opencode-lab` (optional) | Path A label |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | **unset** on Langfuse PID | Dual-boot conflict if set with Path A |
| (Path B only) `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://127.0.0.1:4318` | Tempo — **separate serve PID** |

---

## 5. Chat lab `.env.local` (gitignored — Layer B)

**Path:** `examples/chat/.env.local`  
Documented names in `.env.example`.

| Name | Used by | Notes |
|---|---|---|
| `AI_PROVIDER` / `NEXT_PUBLIC_AI_PROVIDER` | Default provider | UI can override per request |
| `OPENCODE_BASE_URL` | Next → serve | `http://127.0.0.1:4096` |
| `OPENCODE_DIRECTORY` | Adapter / tools | **Absolute** path to `fixtures/opencode-lab` |
| `OPENCODE_MODEL` | Default catalog id | e.g. `openai/gpt-5-mini` |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | OpenAI path + UI flip | |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` | Often copied onto **serve** env | |
| `LANGFUSE_BASE_URL` | Marketplace-style Next apps | **≠** plugin’s `LANGFUSE_BASEURL` |

---

## 6. Machine-global OpenCode state (pre-existing)

| Path | Role | Lab action |
|---|---|---|
| `~/.local/share/opencode/auth.json` | Provider credentials | **Shared across all opencode binaries/forks** |
| `~/.local/share/opencode/log/opencode.log` | Serve/plugin logs | Grep `OTEL tracing initialized`, `Flushing spans` |
| `~/.local/share/opencode/*.db*` | Local session DB | Serve persistence |
| `~/.cache/opencode/packages/@langfuse/opencode-observability-plugin@latest/` | Plugin install cache | First resolve with plugin array |

---

## 7. Infrastructure (Docker)

| Container / service | Port | Lab use |
|---|---|---|
| `langfuse-langfuse-web-1` | 51793 | Path A destination |
| `f1-tempo` | 4318 / 3200 | Path B destination |
| Grafana / Loki / Prometheus | 51792 / 51790 / 51791 | Optional |

---

## 8. What we did **not** change

- `f1-opencode` **source** (git clean for this arc)
- Global `opencode.jsonc` plugin list (TUI isolation)
- Committing `.env.local` or `opencode-langfuse.json`

---

## 9. Rebuild checklist (new machine)

1. Clone repo — `fixtures/opencode-lab/opencode.json` is already there
2. Ensure Langfuse + keys; write `~/.config/opencode/opencode-langfuse.json` with **self-hosted** `baseUrl`
3. Fill `examples/chat/.env.local` — set `OPENCODE_DIRECTORY` to absolute fixture path
4. `bun install` in `f1-opencode` if serve fails on Effect skew
5. Boot serve **from fixture cwd**, Path A env only
6. Boot chat on `:3010`
7. One turn → Langfuse `opencode.turn` + chat JSONL `ses_*` metadata

---

## 10. Changelog of config edits (this arc)

| When | What | Where |
|---|---|---|
| 2026-08-02 | Created Langfuse credentials file (self-hosted) | `~/.config/opencode/opencode-langfuse.json` |
| 2026-08-02 | Wrote scratch project config | `/tmp/opencode-lab-scratch/opencode.json` (later superseded) |
| 2026-08-02 | Ensured `OPENCODE_DIRECTORY` in chat env | `examples/chat/.env.local` |
| 2026-08-02 | Serve Path A env; dual-boot tested; Path A only default | process env |
| 2026-08-02 | **Moved lab workspace into git** | `examples/chat/fixtures/opencode-lab/` |
| earlier | Plugin package cached on first resolve | `~/.cache/opencode/packages/...` |
