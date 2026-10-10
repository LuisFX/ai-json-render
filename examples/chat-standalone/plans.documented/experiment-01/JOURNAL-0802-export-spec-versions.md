# JOURNAL-0802 — Export Spec v1…vN picker

> **Repo:** `ai-json-render` · **Lab:** `examples/chat`  
> **Closes:** ASB-009 (Mode B / multi-Spec export) for transcript Specs + frozen Mode B row

## Problem

A conversation can hold **multiple layout Specs** (one SpecStream fold per assistant turn that
emitted `/root` + `/elements`). Sidebar **Export JSON** previously walked messages newest-first and
silently took the latest non-empty fold — fine for a lab shortcut, wrong when you want “the first
layout” or the Mode B freeze you uploaded.

## What shipped

| Piece | Behavior |
|---|---|
| `listSpecVersions(messages)` | Appearance order → `v1…vN` (skips `/state`-only folds) |
| Modal | Open when `N > 1`, or when Mode B freeze is an extra choice |
| `N === 0` | Envelope only + toast |
| `N === 1` (no freeze) | Skip modal; export `v1` |
| Default selection | Latest `vN` (or Mode B freeze row when present) |
| Mode B row | Active conversation only: **Active frozen Spec (Mode B)** |
| Downloads | `trace-{id}-envelope.json` + `trace-{id}-v{k}-spec.json` (or `…-frozen-spec.json`) |
| Fixtures dump | Same filenames via `/api/fixtures/dump` |

UI: header **Export Spec** + sidebar **Export** (was “Export JSON”).

## Receipt checklist

1. Thread with two layout turns → Export Spec → modal shows v1 / v2 → pick v1 → disk/browser get `…-v1-spec.json`.
2. Single layout turn → no modal → `…-v1-spec.json`.
3. Mode B upload active → modal includes frozen row → exports `…-frozen-spec.json`.
4. Empty / text-only thread → envelope only + toast.

## Files

- [`lib/export-trace.ts`](../../lib/export-trace.ts) · [`lib/export-trace.test.ts`](../../lib/export-trace.test.ts)
- [`components/export-spec-dialog.tsx`](../../components/export-spec-dialog.tsx)
- [`app/c/[id]/page.tsx`](../../app/c/[id]/page.tsx)
- [`app/api/fixtures/dump/route.ts`](../../app/api/fixtures/dump/route.ts)
