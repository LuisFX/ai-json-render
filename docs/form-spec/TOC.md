# FormSpec JSON Enhancement

Extending the json-render spec to support F# FormSpec features for clinical forms.

---

## [00-BRAINSTORM.md](./00-BRAINSTORM.md)

**Full brainstorm.** FormSpec vs json-render mapping, phased enhancement plan (Steps, Form Fields, Scoring, ClinicalPathway), enhanced spec shape, implementation order. **FormSpec element catalog design** (all FieldTypes, PluginField, consolidation vs one-per-type).

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
| Message | Alert | Warning, Success, Error, Info |
| DependsOn | `visible` | `{ $state, eq }` etc. |

---

## Phases

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Steps | Planned |
| 2 | Form fields (full coverage) | Planned |
| 3 | Scoring | Planned |
| 4 | ClinicalPathway | Planned |
