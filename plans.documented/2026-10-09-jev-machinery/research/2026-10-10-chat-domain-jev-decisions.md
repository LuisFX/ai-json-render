---
title: Playground Jev is not enough for chat spec-painting
slug: 2026-10-10-chat-domain-jev-decisions
date: 2026-10-10
type: research
arc: 2026-10-09-jev-machinery
status: live
read_order: 5
tags: [jev, chat-standalone, typesafe, intent-routing, fan-out]
---

# Playground Jev is not enough for chat spec-painting

Hub: [[HANDOFF-MEMORY]] · machinery: [[2026-10-09-what-makes-jev-work]] · evaluator: [[2026-10-09-hosts-do-not-use-the-gateway-evaluator]] · journal: [[2026-10-10-journal]]

Live TypeSafe docs used (2026-10-10): [llms.txt](https://docs.typesafe.ai/llms.txt), [how to build](https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md), [intent routing](https://docs.typesafe.ai/patterns/intent-routing.md), [speculative fan-out](https://docs.typesafe.ai/patterns/fan-out.md), [confidence](https://docs.typesafe.ai/confidence.md), [jev-1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md). Official skill: `skills/typesafe-ai/SKILL.md`.

This file is **research**, not architecture. No tickets. Do not implement from it until a glance is confirmed.

## Verdict

We ported the playground **compose path**. That is the right machine for spec painting. It is **not** a complete decision surface for this chat.

Playground is a good start: catalog + atomic candidates + Choice membership/layout + sequential add/replace/remove/move. Chat is a different domain. The user is not filling a form and is not always asking for a UI. Extra Jev decisions belong in the **host**, before `experimental_composeSpec`, because the composer only asks Choice questions.

## What we did port (keep)

Measured on `feat/chat-standalone-jev`, files under `examples/chat-standalone/lib/jev/`:

| playground piece | standalone equivalent | chat-correct? |
|---|---|---|
| TypeSafe `jev-latest` Choice evaluator | `typesafe-evaluator.ts` | yes |
| `experimental_composeSpec` | `compose.ts` | yes |
| host-owned candidates | `grammar.ts` explorer recipes | yes — sample weather/crypto/GitHub/HN, not live tools |
| batch new tree, sequential edit | core, via `initialSpec` | yes as a tree editor; **no** as a chat router |
| `unavailable` Choice arm | core `root` / `next` | exists, unused as coverage |
| Mode B refuse | `request.ts` `jev-state-fill-refused` | yes — code, not Jev |
| no Scene3D | `compose.test.ts` | yes |
| quoted titles copied in code | `buildCandidates` regex | yes — TypeSafe jaggedness: do not generate copy |
| confidence returned | evaluator maps `confidence`; composer stores, does not gate | playground-same, chat-wrong |

Jev still never writes a Spec. That law holds.

## Why playground is a weak sample of chat

Playground prompt ≈ "design this settings card / dashboard." One domain of recipes. Follow-ups are layout edits ("remove the bio"). No live-tool sibling. Version history is that session's spec.

Standalone chat prompt ≈ a conversation turn. Four recipe **families** dumped into one candidate pool. A live `ToolLoopAgent` sits behind the same input. Timeline **fold-merges** `flat` specs across composers. Users name cities and assets the recipes do not contain (Austin). Users switch topic ("now crypto") after a finished tree.

TypeSafe's own programming model: **atomic questions, composed in code**. The composer asks "which of these elements?" That is one judgment. Chat needs several others **first**. Adding those questions in one System One call barely changes latency ([fan-out](https://docs.typesafe.ai/patterns/fan-out.md)).

Jaggedness that already showed up:

- **Large mixed state** (weather + crypto + GitHub + HN in one membership batch) is distractor material. Filter the family in code, then compose.
- **Literal reading.** Membership says "include this New York metric?" not "is this request about these three cities?" Austin still gets NYC recipes.
- **Generation.** Jev cannot invent Austin weather. Code must refuse, not hope `unavailable` wins among 30 membership choices.
- **Counting.** "Remove Solana, how many metrics remain?" is code. Sequential `remove:<id>` is the Jev part; it worked on a clean thread.

## Extra Jev decisions chat needs (host-side)

Ask these in **one** TypeSafe call over named JSON state (`user_request`, `has_existing_spec`, `offered_families`, `offered_entities`, `existing_element_labels`). Then code routes. Do not stuff them into `experimental_composeSpec` Choice criteria.

### 1. Intent — [intent routing](https://docs.typesafe.ai/patterns/intent-routing.md)

**Choice** `intent`:

| option | when |
|---|---|
| `paint_new` | no usable spec, or the turn asks for a different dashboard |
| `edit_existing` | follow-up on the current tree ("remove Solana", "put the chart on top") |
| `refuse_live` | user asked for live / current / fetched data while Jev is on |
| `not_ui` | greeting, thanks, a question that is not spec painting |
| `unavailable` | the request is a UI, and the offered recipes cannot fulfill it |

Gate on **confidence**. Low confidence → do not paint; say so in the transcript. Thresholds live in one host file (TypeSafe skill: questions and thresholds in one place). Destructive-feeling edits (remove/replace) sit higher than `paint_new`.

Playground never needed this: every prompt was a UI request.

### 2. Recipe family, then coverage

**Choice** `family`: `weather` | `crypto` | `github` | `hn` | `mixed` | `none`.

**Noul per named entity** (one question per city/asset parsed in code, or listed in state): "This request is asking for `Austin` weather." "Austin is among the offered weather recipes." Combine in code: if asking-for ∧ ¬offered → `unavailable`, **do not** call the composer.

That is the Austin failure, named as a TypeSafe pattern rather than a compose bug.

After family is known, `buildCandidates` should offer **that family only**. Four families in one batch is the "rate the pitch" anti-pattern.

### 3. Edit vs new tree when `initialSpec` exists

Today: any `currentSpec` from the timeline forces sequential edit (`experimental-compose.ts` `editing = !!options.initialSpec`).

Chat: "now show crypto" after a weather tree is often `paint_new`, not "add crypto candidates into the weather card." Playground's Clear starts fresh; chat conversations do not.

**Choice** `tree_op` (speculative, ignore unless `has_existing_spec`): `edit_in_place` | `replace_tree`. Code passes `initialSpec` only for `edit_in_place`.

### 4. Completeness after select, before trusting layout

Playground workaround: "Name required sections explicitly." Chat users will not.

**Score** `coverage` on `{ user_request, selected_ids, selected_descriptions }` after the composer's select step, or as a host Noul beforehand: "The offered recipes, if all selected, would answer this request." If not, stop with `unavailable` instead of streaming a related-but-wrong tree that later throws `Spec contains unreachable elements.`

### 5. Confidence on layout — [confidence routing](https://docs.typesafe.ai/patterns/confidence-routing.md)

The evaluator already returns `confidence`. The composer does not act on it. Chat streamed a catalog-order preview, then layout threw.

Host rule (stakes: a wrong dashboard is recoverable; an unreachable tree is a console error):

- `root === unavailable` or low root confidence → no spec, transcript says sample data cannot fulfill this.
- layout confidence low → keep the first snapshot (catalog order under default slot) **or** drop it; do not publish a failed rearrange.

Noul has no `confidence`; threshold the probability itself (`|2p-1|` if a shared scale is wanted).

### 6. Live vs sample

**Noul** `wants_live`: "The user is asking for live, current, or freshly fetched data rather than a prepared sample dashboard."

If high: do not paint sample metrics as if they were a fetch. Point at the Jev toggle. Playground had no ToolLoopAgent on the same input.

Mode B is already refused in code. Leave it there.

## Chat-domain **code** laws (not Jev questions)

These are host bugs that poison the questions Jev does get.

**Fold-merge of `flat` specs.** `foldSpecTimeline` → `applyFlatOrNested` spreads `incoming.elements` onto the previous tree (`spec-timeline.ts:169-170`). A Jev `flat` after an agent-painted spec becomes a frankenstein `initialSpec`. Sequential edit then asks Jev to remove/replace nodes from another composer's tree. Playground never mixed composers in one fold.

A Jev `flat` in chat should **replace** the timeline spec for that turn, not merge. `/state` patches can still merge. That is a fold law, not a TypeSafe question.

**Quote extraction** stays in code. **Mode B** stays in code. **No live tools on Jev** stays in code.

## What not to do

- Do not teach Jev to generate Austin weather, table rows, or headings. That is jaggedness #9 (generation).
- Do not add Noul/Score to `Experimental_CompositionEvaluator`. The public composer is Choice-only by construction. Extra decisions are a **host router** that may skip `composeSpec`.
- Do not collapse intent + family + coverage into one Choice. Split, fan out, combine in code.
- Do not patch the resizable-panel hydration mismatch as a Jev bug. It is `react-resizable-panels` SSR style objects (camelCase vs kebab-case). Unrelated to the Jev toggle.

## Smoke that already named these gaps

| turn | observed | missing decision |
|---|---|---|
| crypto on a 4-week agent thread | v2 contaminated by v1 agent elements; follow-up threw unreachable | fold-merge; maybe `replace_tree` |
| crypto on a new thread, then "remove Solana" | Version 2, Solana gone | sequential edit is enough **when** the spec is Jev-only |
| Austin weather | composing banner, no honest unavailable | family + entity coverage Nouls |
| layout throw after preview | `Spec contains unreachable elements.` | completeness / layout confidence gate |

## Next, if this glance is confirmed

A host `routeChatTurn` (name TBD) in `examples/chat-standalone/lib/jev/` that:

1. Builds named state from the user text + timeline + grammar entity lists.
2. Calls TypeSafe once with intent / family / wants_live / coverage / tree_op.
3. Branches in code: transcript-only, refuse-live, unavailable, `composeUI` with filtered candidates, or sequential edit with `initialSpec`.

Questions and thresholds in that one file. Do not start from a new prompt to the composer.
