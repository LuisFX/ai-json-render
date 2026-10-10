# OpenCode × AI SDK lab — doc index (read this first)

> **Branch:** `feat/freeze-spec-with-ai-sdk-state-bridge-using-ai-sdk-opencode-provider`  
> **Ops SSOT (how to run today):** [`../../README.md`](../../README.md) · lab workspace [`../../fixtures/opencode-lab/`](../../fixtures/opencode-lab/)  
> **Success bar:** [`MILESTONE-0802-GOLD-STANDARD.md`](./MILESTONE-0802-GOLD-STANDARD.md)

Nothing in this folder should be deleted for being “old” — several are **historical receipts**.
Dangerous ones are stamped so you do not follow obsolete `/tmp` runbooks or “no Langfuse” claims.

## Read order (2026-08-02 shipped)

| Order | Doc | Role |
|---|---|---|
| 1 | [`MILESTONE-0802-GOLD-STANDARD.md`](./MILESTONE-0802-GOLD-STANDARD.md) | What “done” means — gold standard for other experiments |
| 2 | [`ARCHITECTURE-TODAY.md`](./ARCHITECTURE-TODAY.md) | Living topology (`conv_*` / `ses_*`, Path A/B, Next Langfuse) |
| 3 | [`OUT-OF-GIT-CONFIG.md`](./OUT-OF-GIT-CONFIG.md) | Machine auth, Langfuse creds file, env name traps |
| 4 | [`FINDINGS.md`](./FINDINGS.md) | Phase evidence 8/8 — wire shapes |
| 5 | Journals below | Dated receipts (keep; do not treat as current runbook) |
| — | [`FUTURE-TICKET-meridian-opencode-agents.md`](./FUTURE-TICKET-meridian-opencode-agents.md) | Backlog: tune via `opencode agent create` |
| — | [`VISION.md`](./VISION.md) / [`PRD.md`](./PRD.md) | Origin thesis + executed plan (**archive**) |

## Journals

| Doc | Status |
|---|---|
| [`JOURNAL-0802-green-on-both-serves.md`](./JOURNAL-0802-green-on-both-serves.md) | Historical dual-serve receipt — **do not reproduce from its §4** |
| [`JOURNAL-0802-chat-qol.md`](./JOURNAL-0802-chat-qol.md) | URL SSOT + provider toggle (observability § superseded) |
| [`JOURNAL-0802-variant-effort.md`](./JOURNAL-0802-variant-effort.md) | Shared effort → serve `variant` |
| [`JOURNAL-0802-serve-telemetry-e2e.md`](./JOURNAL-0802-serve-telemetry-e2e.md) | Path A / B / dual-boot conflict |
| [`JOURNAL-0802-aisdk-langfuse.md`](./JOURNAL-0802-aisdk-langfuse.md) | Next AI SDK → Langfuse (`conv_*`) |

## Canonical facts (if a journal disagrees, the journal is wrong)

- Lab workspace: **`examples/chat/fixtures/opencode-lab`** (not `/tmp/opencode-lab-scratch`)
- Chat UI: **`app/c/[id]/page.tsx`** (`app/page.tsx` only redirects)
- Live suite: **`bun run test:opencode`** → 8 tests
- Observability: serve Path A (`ses_*`) **and** Next Langfuse (`conv_*`) — both shipped
- `AI_PROVIDER` unset: **`openai` if `OPENAI_API_KEY` else `gateway`** (not “always gateway”)
- Work is **committed** on this branch (milestone commit and earlier)
