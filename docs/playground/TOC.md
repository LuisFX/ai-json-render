# Playground Documentation

How the playground (port 3000) works: from user prompt to live UI.

---

## [00-ARCHITECTURE.md](./00-ARCHITECTURE.md)

**The pipeline.** End-to-end flow: user types prompt → API → LLM → JSONL stream → client parses patches → spec updates → Renderer shows UI.

---

## [01-JSONL-PATCHES.md](./01-JSONL-PATCHES.md)

**What the LLM returns.** JSONL format, RFC 6902 patches, why we use plain text (not structured output), and how the client parses line-by-line.

---

## [02-PROMPT-FLOW.md](./02-PROMPT-FLOW.md)

**How the LLM is instructed.** System prompt from catalog, user prompt from buildUserPrompt, custom rules, and what "guaranteed" output really means.

---

## [03-REACT-CODE.md](./03-REACT-CODE.md)

**Spec → React code.** The spec is the source of truth. The "code" tab walks the spec tree and emits JSX—it does not come from the LLM.

---

## Quick reference

| Doc | Topic |
|-----|-------|
| 00 | Architecture, pipeline diagram |
| 01 | JSONL, patches, parsing (no schema) |
| 02 | Prompts, catalog, instructions |
| 03 | Spec → React code export |
