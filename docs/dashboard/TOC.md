# Dashboard Documentation

How the dashboard (port 3001) works: widgets, generation, persistence, and reload.

---

## [00-ARCHITECTURE.md](./00-ARCHITECTURE.md)

**The pipeline.** Page loads saved widgets from DB, user adds/generates widgets, spec streams in, auto-saves on complete, drag-to-reorder persists.

---

## [01-JSONL-PATCHES.md](./01-JSONL-PATCHES.md)

**What the LLM returns.** Same as playground: JSONL, RFC 6902 patches. The dashboard uses the same useUIStream and parsing.

---

## [02-PROMPT-FLOW.md](./02-PROMPT-FLOW.md)

**Dashboard catalog.** Form component, real API actions (createCustomer, viewInvoices, etc.), no validation layer. Different from playground.

---

## [03-DB-PERSISTENCE.md](./03-DB-PERSISTENCE.md)

**Save, load, reconstitute.** How widgets are persisted to PostgreSQL, loaded on mount, passed to Widget as initialSpec, and how saved widgets re-run data-fetch actions.

---

## Quick reference

| Doc | Topic |
|-----|-------|
| 00 | Architecture, pipeline, DB in the loop |
| 01 | JSONL, patches (same as playground) |
| 02 | dashboardCatalog, actions |
| 03 | DB schema, save/load/reconstitute/reorder |
