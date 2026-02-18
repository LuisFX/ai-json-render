# Playground vs Dashboard

Side-by-side comparison of the two main example apps.

---

## [00-OVERVIEW.md](./00-OVERVIEW.md)

**At a glance.** Ports, packages, one-sentence summary of each app.

---

## [01-SHARED-CODE.md](./01-SHARED-CODE.md)

**What they share.** Catalog locations (each app has its own; LLM sees only that app's catalog), packages, pipeline, identical code paths. What's duplicated vs. app-specific.

---

## [02-SIDE-BY-SIDE.md](./02-SIDE-BY-SIDE.md)

**Feature comparison.** Catalogs, code views, persistence, actions, validation. Quick reference table.

---

## [03-FINAL-SPEC.md](./03-FINAL-SPEC.md)

**The spec.** The single structure both apps render from: `root`, `elements`, `state`; element shape (`type`, `props`, `children`, `on`, `visible`, `repeat`); prop expressions; visibility; actions.

---

## Quick links

| Topic | Playground | Dashboard |
|-------|------------|-----------|
| Architecture | [playground/00-ARCHITECTURE](../playground/00-ARCHITECTURE.md) | [dashboard/00-ARCHITECTURE](../dashboard/00-ARCHITECTURE.md) |
| JSONL/patches | [playground/01-JSONL-PATCHES](../playground/01-JSONL-PATCHES.md) | [dashboard/01-JSONL-PATCHES](../dashboard/01-JSONL-PATCHES.md) |
| Prompts | [playground/02-PROMPT-FLOW](../playground/02-PROMPT-FLOW.md) | [dashboard/02-PROMPT-FLOW](../dashboard/02-PROMPT-FLOW.md) |
| React code | [playground/03-REACT-CODE](../playground/03-REACT-CODE.md) | — |
| DB persistence | — | [dashboard/03-DB-PERSISTENCE](../dashboard/03-DB-PERSISTENCE.md) |
| Catalogs & LLM | [dev/07-prompt-engineering](../dev/07-prompt-engineering.md) (what LLM sees, correctness) | same |
