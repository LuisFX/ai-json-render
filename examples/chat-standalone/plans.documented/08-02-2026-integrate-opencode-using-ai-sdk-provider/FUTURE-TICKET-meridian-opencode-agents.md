# FUTURE TICKET — Meridian specialized OpenCode agents (primary | sub | both)

> **Status:** backlog / not started  
> **Spawned from:** [MILESTONE-0802-GOLD-STANDARD.md](./MILESTONE-0802-GOLD-STANDARD.md)  
> **Trigger receipt:** `opencode agent create` → `.opencode/agents/meridian-cds-renderer.md`  
>   (local demo on `opencode@dev`, 2026-08-02 — scaffolding only, not production-tuned)

---

## Why this exists

Today’s gold-standard lab proves: **stock `opencode serve` + AI SDK provider is enough** for a
coding-shaped agent loop (tools, sessions, Path A Langfuse, effort/`variant`).

OpenCode out of the box is a **coding agent**. The architecture is extensible. Meridian’s future is
not “prompt harder” — it is **specialized agents** that tune the same harness for clinical protocol
authoring / CDS / json-render Spec work.

OpenCode already ships machinery to create agents (`opencode agent create`) with:

| Dimension | What we saw |
|---|---|
| Location | Project (`.opencode/agents/`) vs global |
| Permissions | Allow-list (bash, read, edit, glob, grep, webfetch, task, todowrite, websearch, lsp, skill, …) |
| Mode | e.g. **All** (primary-capable) |
| Output | Markdown agent file with frontmatter `description` + `mode` + body |

That scaffold is the on-ramp. **Tuning Meridian = authoring / composing these agents**, not forking
the serve loop.

---

## Ticket intent

Design and land a Meridian agent pack that uses OpenCode’s native agent model:

1. **Primary** — clinician-facing Protocol Author / CDS renderer (owns the interview + mint).
2. **Sub** — focused workers (catalog fidelity, SpecStream/json-render constraints, chart grounding,
   approval gate) launched via Task / subagent patterns.
3. **Both** — primary that can spawn Meridian subs without escaping the serve permission model.

**Success looks like:** the same serve + AI SDK client path as the gold-standard lab, but
`OPENCODE_AGENT=meridian-…` (or equivalent) loads a domain persona whose tools/skills/permissions
are CDS-shaped — measured against the gold-standard Langfuse receipts (latency, cache, patch
density, Path A cost).

---

## Non-goals (for this ticket)

- Replacing AI SDK `ToolLoopAgent` in `examples/chat` as the lab harness
- Forking OpenCode core for Meridian souls
- Conflating **OpenCode Persona/Agent** (producer) with **Meridian Agent** (clinical DAG node) —
  keep Producer ≠ Product (Meridian conversational-engine law)

---

## Sketch of work (when pulled)

1. Inventory upstream agent create + load paths (`opencode agent create`, `.opencode/agents/*.md`,
   serve `agent` field, permission modes primary/sub/all).
2. Replace the auto-generated `meridian-cds-renderer.md` body with Meridian-true doctrine
   (json-render SpecStream, frozen Spec / Mode B, cite entity IDs, no invented chart data).
3. Define permission/skill matrix: what a CDS renderer may touch vs a coding agent.
4. Wire lab: `OPENCODE_AGENT=…` on generate + Langfuse tags `agent=<name>`.
5. A/B vs gold-standard coding agent on the same protocol prompt (`conv_GeYen…` / `conv_JNPG…`
   family) — fair compare recipe already exists.

---

## Links

- Gold standard: [MILESTONE-0802-GOLD-STANDARD.md](./MILESTONE-0802-GOLD-STANDARD.md)
- Lab map: [ARCHITECTURE-TODAY.md](./ARCHITECTURE-TODAY.md)
- Fair observe: [JOURNAL-0802-aisdk-langfuse.md](./JOURNAL-0802-aisdk-langfuse.md)
- Demo scaffold (out of this repo): `~/code/luisfx/opencode/.opencode/agents/meridian-cds-renderer.md`
