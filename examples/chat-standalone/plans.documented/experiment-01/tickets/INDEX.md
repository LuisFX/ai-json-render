# Tickets — Freeze the Spec, stream the state

> Reads after [`../VISION.md`](../VISION.md) + [`../PRD.md`](../PRD.md). Prefix **ASB**.  
> Branch: `feat/freeze-spec-with-ai-sdk-state-bridge`.  
> Tickets are recommendations — revise when reality lands.

> ## 🟢 ACTIVE LANE (2026-07-23)
> **Milestone 1 CLOSED** — Mode A/B lab arc (Waves 0–4 + OpenAI model matrix).  
> **Next (open, not blocking):** envelope-persisted frozen Spec · Mode B export dump · fixture dedupe.  
> Live board = this file. PRD is the contract; INDEX is the status.

---

## Board

| Ticket | Wave | Status | Landed | Evidence |
|---|---|---|---|---|
| ASB-000 | 0 | 🟢 DONE | `15244b9` | VISION + PRD + classroom corpus + HistorySidebar / conversations API |
| [ASB-001](./ASB-001-ai-sdk-state-bridge.md) | 1 | 🟢 DONE | `97a7772` | [`lib/ai-sdk-state-bridge.ts`](../../lib/ai-sdk-state-bridge.ts) |
| [ASB-002](./ASB-002-bridge-unit-tests.md) | 1 | 🟢 DONE | `97a7772` | unit tests + [`fixtures/state-bridge/`](../../fixtures/state-bridge/) |
| [ASB-003](./ASB-003-bridge-live-openai.md) | 1 | 🟢 DONE | `97a7772` | live smoke (skip without key); `test:state-bridge` |
| [ASB-004](./ASB-004-paint-frozen-spec-with-store.md) | 2 | 🟢 DONE | `781c17f` | `ExplorerRenderer store=` + `/harness/state-bridge` |
| [ASB-005](./ASB-005-state-paths-only-prompt.md) | 3 | 🟢 DONE | `781c17f` | `state-paths` + `statePathsOnly.prompt` + snapshot |
| [ASB-006](./ASB-006-chat-upload-spec-mode-switch.md) | 4 | 🟢 DONE | `781c17f` | Upload/paste; `generate`\|`state-fill`; Active Spec; suppress inline |
| [ASB-007](./ASB-007-openai-model-matrix.md) | 5 | 🟢 DONE | `7f4d2f1` | Model/effort matrix + per-request selectors through generate → agent |
| ASB-008 | — | ⬜ OPEN | — | Persist frozen Spec on conversation envelope (client-only today) |
| ASB-009 | — | 🟢 DONE | 2026-08-02 | Spec v1…vN export picker + Mode B freeze; see `JOURNAL-0802-export-spec-versions.md` |
| ASB-010 | — | ⬜ OPEN | — | Fixture layout cleanup (dedupe duplicate traces) |

---

## Milestone 1 — what shipped (commit map)

| Commit | Scope |
|---|---|
| `15244b9` | Wave 0 — classroom, fixtures, HistorySidebar, conversations CRUD, catalog-prompt dump |
| `97a7772` | Wave 1 — AiSdkStateBridge + unit/live tests |
| `781c17f` | Waves 2–4 — paint harness, path mine, Mode B chat UX |
| `7f4d2f1` | Wave 5 — OpenAI model matrix + reasoning effort UI/API |

Success sentence (from VISION): generate a Spec once → freeze → upload → only state streams in while the same dashboard paints.

---

## Fixture SSOT (lab)

| Kind | Canonical path | Notes |
|---|---|---|
| High-severity freeze (tests / harness) | [`fixtures/high-severity-clinical-history-review/`](../../fixtures/high-severity-clinical-history-review/) | Used by `state-bridge-harness`, path-mine tests |
| Bridge unit fixtures | [`fixtures/state-bridge/`](../../fixtures/state-bridge/) | Parts JSONL, synthetic bind/repeat, prompt snapshot |
| Catalog prompt dump | [`fixtures/catalog-prompt/`](../../fixtures/catalog-prompt/) | Contrast for Mode B (no layout curriculum) |
| Export dumps | `fixtures/conversations/`, flat `fixtures/trace-conv_*` | HistorySidebar Export / `/api/fixtures/dump` — **duplicates of high-severity exist**; ASB-010 |

Do not invent a fourth home for the same Spec without updating this table.

---

## Wave detail (closed — intent preserved)

### Wave 0 — Memory

Classroom + fixtures proved SpecStream, `pipeJsonRender`, catalog prompt, dashboard Spec ⊥ state, no AI-SDK StateProvider.

### Wave 1 — Bridge + tests

ASB-001…003 — SpecStream `/state` → `StateStore`. Exit: unit + live green.

### Wave 2 — Paint split

ASB-004 — frozen Spec + `StateProvider store=` (package API, not dashboard’s React `initialState`). Harness at `/harness/state-bridge`.

### Wave 3 — Mode B prompt

ASB-005 — mine `$state` / `$bindState` / `repeat.statePath`; `statePathsOnly.prompt` skips `/root`/`/elements` curriculum.

### Wave 4 — Chat UX

ASB-006 — upload/paste; `frozenSpec != null` ⇒ Mode B; page-owned part cursor; suppress inline Spec in bubbles.

### Wave 5 — Model matrix (lab DX)

ASB-007 — code-owned OpenAI matrix; UI selects `modelId` + `reasoningEffort` per request.

### Historical sequencing trap (honored)

Upload UX (ASB-006) waited until Wave 1 tests were green. Do not reverse that order on future writers.

---

## Open follow-ups (Milestone 2 candidates)

1. **ASB-008** — Persist `frozenSpec` (or artifact ref) on conversation envelope so Mode B survives thread switch / reload.
2. **ASB-009** — ~~Mode B export dumps frozen Spec + live store snapshot alongside envelope.~~ **DONE (2026-08-02)** — Spec v1…vN picker + Mode B freeze row; see [`JOURNAL-0802-export-spec-versions.md`](../JOURNAL-0802-export-spec-versions.md). (Live store snapshot still not dumped — optional follow-on.)
3. **ASB-010** — Dedupe fixture trees; one canonical high-severity path; document export landing zone.

---

## Related classroom

| Note | Why |
|---|---|
| [`classroom/ai-sdk-state-bridge.md`](../../../../classroom/ai-sdk-state-bridge.md) | Bridge API + Wave 2 consumer |
| [`classroom/mode-a-b-freeze-and-state-fill.md`](../../../../classroom/mode-a-b-freeze-and-state-fill.md) | Manual smoke checklist |
| `classroom/RFC-6902-patches.md` | SpecStream path space |
| `classroom/pipeJsonRender.md` | `data-spec` parts |
| `classroom/dashboard-example-freeze-spec.md` | freeze / `initialSpec` |
| `classroom/dashboard-example-state-split.md` | Spec ⊥ state |
| `classroom/dashboard-example-state-provider-usage.md` | compose a writer; no AI-SDK StateProvider |

---

## Status legend

| Mark | Meaning |
|---|---|
| ⬜ OPEN | Not started |
| 🟡 IN PROGRESS | Branch work |
| 🟢 DONE | Landed + evidence on board |
| ⛔ RETIRED | Superseded — leave row |
