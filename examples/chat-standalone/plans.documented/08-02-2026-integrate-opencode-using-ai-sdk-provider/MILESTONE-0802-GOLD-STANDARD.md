# MILESTONE — OpenCode serve + AI SDK lab = GOLD STANDARD (2026-08-02)

> **Branch:** `feat/freeze-spec-with-ai-sdk-state-bridge-using-ai-sdk-opencode-provider`  
> **Lab:** `examples/chat`  
> **Doc index:** [`INDEX.md`](./INDEX.md)  
> **Verdict:** **MAJOR MILESTONE SUCCESS** — this experiment is the **gold standard** other
> Meridian / OpenCode experiments measure against.

---

## One sentence

A stock `opencode serve` (no fork delta for this lab) + community AI SDK provider + Next chat,
with Path A Langfuse on serve **and** AI SDK Langfuse on Next, is enough to run a real protocol
preview conversation and compare OpenAI vs OpenCode fairly.

---

## What “gold standard” means here

| Bar | Receipt |
|---|---|
| Serve-first works | Live suite **8/8**; free-form + Mode B-style SpecStream |
| Effort is first-class | Shared UI dial → OpenAI `reasoningEffort` / serve `variant` |
| Observability (serve) | Path A `opencode.turn` on `ses_*` (Path A≠B dual-boot = conflict law) |
| Observability (app) | Next `instrumentation` → Langfuse `sessionId = conv_*` |
| Fair compare | Same prompt family: OpenAI `conv_JNPGj8KgnHiDP4vg` vs OpenCode `conv_GeYenLxcbx46cDav` / `ses_03bca57efffeNwon7o1hl3VaoS` |
| Lab workspace in git | `fixtures/opencode-lab/` + out-of-git inventory documented |
| Zero fork tax | f1-opencode source tree clean for this arc |

**Later experiments lose if they cannot match:** serve-first loop, dual Langfuse visibility
(`conv_*` + `ses_*`), shared effort dial, and documented out-of-git config.

---

## Architecture snapshot

```text
Browser /c/conv_*  →  Next /api/generate  →  ToolLoopAgent
                         │                      │
                         │ AI SDK Langfuse      ├─ provider=openai → OpenAI API
                         │ session=conv_*       └─ provider=opencode → opencode serve
                         │                              │
                         │                              └─ Path A plugin → Langfuse ses_*
```

Map: [ARCHITECTURE-TODAY.md](./ARCHITECTURE-TODAY.md) · Out-of-git: [OUT-OF-GIT-CONFIG.md](./OUT-OF-GIT-CONFIG.md)

---

## Headline journals

| Doc | Role |
|---|---|
| [FINDINGS.md](./FINDINGS.md) | Provider lab 8/8 + hard holes |
| [JOURNAL-0802-serve-telemetry-e2e.md](./JOURNAL-0802-serve-telemetry-e2e.md) | Path A / B / dual-boot |
| [JOURNAL-0802-aisdk-langfuse.md](./JOURNAL-0802-aisdk-langfuse.md) | Next AI SDK → Langfuse |
| [JOURNAL-0802-variant-effort.md](./JOURNAL-0802-variant-effort.md) | Shared effort dial |
| [FUTURE-TICKET-meridian-opencode-agents.md](./FUTURE-TICKET-meridian-opencode-agents.md) | Tune via specialized agents (primary \| sub \| both) |

---

## What comes next (not this milestone)

OpenCode’s **agent create** machinery is how we tune Meridian on the same harness — specialized
primary / sub / both agents — without rebuilding the loop. That work is parked in the future ticket
above. Do not dilute this milestone by starting it here.
