# FormSpec JSON Enhancement

json-render emits an LLM-friendly Spec. The product of this arc is a Healix **Blueprint**: an empty FormSpec template, branded, serialized with Thoth.

Think F#. Write TypeScript. Do not recreate FormSpec types. Construct with published `@f1studio/form-spec` helpers.

---

## [00-BRAINSTORM.md](./00-BRAINSTORM.md)

Design notes for the Spec shape (Steps, fields, scoring, ClinicalPathway). The Spec is the preview. The Blueprint is the product.

---

## Quick Reference: FormSpec FieldType → JSON Component

| FormSpec | JSON type | Notes |
|----------|-----------|-------|
| Text, Email, Password, Number, Tel | Input | `type` prop |
| TextArea | Textarea | |
| Date, DateTimeLocal, Time | Input | `type: "date"` etc. |
| Checkbox | Checkbox | |
| Radio, SingleChoice, Dropdown | Radio / Select | |
| MultiChoice, CheckboxList, TagList | CheckboxList / TagList | Multi-select |
| Matrix | Matrix | Likert, rows × options |
| Signature | Signature | |
| Message | Message | Warning, Success, Error, Info |
| DependsOn | `visible` | `{ $state, eq }` etc. |

---

## Board

Living status: [plans.documented/fsharp-formspec/plan.01.md](../../plans.documented/fsharp-formspec/plan.01.md).

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Steps | Shipped |
| 2 | Form fields catalog | Shipped |
| 3 | Scoring (data + ScoreSummary, no live calculation) | Shipped |
| 4 | ClinicalPathway schema on Spec | Shipped |
| 5 | Complete Spec including a mappable pathway | Blocked (Anthropic credits). Schema and prompt cap are in place |
| 6 | Spec → Blueprint via `@f1studio/form-spec` helpers | Goalpost proven. Saved Tier 4 spec has no pathway |

**Target:** `Blueprint` / `BlueprintThothString` — the branded empty FormSpec Healix loads with `deserializeBlueprint`. GUIDs are minted by the published helpers, not by json-render.
