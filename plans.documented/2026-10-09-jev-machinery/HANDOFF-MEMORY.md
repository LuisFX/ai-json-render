---
title: Jev machinery — hub
slug: 2026-10-09-jev-machinery
aliases: [jev-machinery]
date: 2026-10-09
type: handoff
arc: 2026-10-09-jev-machinery
status: live
read_order: 1
tags: [jev, composition, typesafe]
architecture_settled: false
tickets_cut: false
branch: feat/jev-openai-typesafe
commit: 42a182e
---

# Jev machinery

**Question this arc answers:** what exact machinery turns a prompt into a json-render `Spec` when the host model is Jev?

**Not this arc:** an architecture, a ticket board, or a commit of these files. Architecture is unwritten until a glance is confirmed. These research files stay uncommitted.

Sister doctrine (outside this vault; relative markdown, not a wikilink): [`PLANS_DOCUMENTED_DOCTRINE.md`](../../../f1-monorepo/plans.documented/PLANS_DOCUMENTED_DOCTRINE.md).

## Cold start

1. This hub.
2. [[2026-10-09-what-makes-jev-work]] — the composer, catalog, candidates, Choice questions, tree assembly, batch vs sequential, host streams.
3. [[2026-10-09-hosts-do-not-use-the-gateway-evaluator]] — TypeSafe System One vs core's Gateway adapter.
4. [[2026-10-10-chat-domain-jev-decisions]] — playground compose path is not a complete chat decision surface; extra host-side Jev questions.
5. [[2026-10-10-journal]] — TypeSafe skill install + this glance. Older: [[2026-10-09-journal]].

Measurement tool: `research/tools/2026-10-09-candidate-census.ts`. Re-run from the repo root:

```
fnm exec --using=24 -- bun plans.documented/2026-10-09-jev-machinery/research/tools/2026-10-09-candidate-census.ts
```

## One-sentence law

Jev never writes a Spec. It answers Choice questions whose criteria keys are candidate ids and structural ops; `experimental_composeSpec` clones those recipes into a tree and validates it.

## Shipped code this research describes

Branch `feat/jev-openai-typesafe` at `42a182e`. Playground and `examples/chat` Jev toggles call `createTypeSafeEvaluator` (`TYPESAFE_API_KEY`, model `jev-latest`). Default playground/chat generation uses `@ai-sdk/openai`. Core still exports `experimental_createEvaluator` as a Gateway adapter; those two hosts do not call it.

## Flags

| flag | value | meaning |
|---|---|---|
| architecture_settled | false | no `ARCHITECTURE.md`; do not write one until a glance is confirmed |
| tickets_cut | false | findings are named in research; they are not tickets yet |

## What is NOT in this vault yet

- User stories, conduit use cases, engineering-docs frontmatter.
- A rendered mermaid SVG. The state diagram lives as source in [[2026-10-09-what-makes-jev-work]].
- The live weather-smoke NDJSON dump from 2026-10-09. The throw class was observed; the Choice keys were not saved.
