# FormSpec JSON Enhancement - Brainstorm

How to extend the json-render spec to support F# FormSpec features. The goal: produce valid JSON that maps naturally to FormSpec.fs, enabling a future json-spec → F#-spec mapper.

---

## Current JSON Spec vs FormSpec - High-Level Mapping

| json-render | FormSpec | Notes |
|-------------|----------|-------|
| `Spec.root` | Form root / first step | Different model: we have flat elements; FormSpec has Steps → Fields |
| `Spec.elements` | `FormStep.Fields` (FormField list) | **Yes** — elements map to form fields. Each element = one FormField |
| `Spec.state` | Form values at runtime | Same concept |
| `UIElement.type` | `FieldType` (Text, Radio, etc.) | Direct mapping |
| `UIElement.props` | FieldType-specific info (TextInfo, SingleChoiceInfo, etc.) | Props = field config |
| `UIElement.visible` | `DependsOn` | Same intent: conditional visibility based on another field |
| `UIElement.on` | Actions / pathway triggers | Extensible |
| — | **Steps** | **NEW** — FormSpec breaks form into logical sections |
| — | **Score** | **NEW** — MaxScore, ScoreRanges, option-level scores |
| — | **ClinicalPathway** | **NEW** — State machine, transitions, clinical actions |

---

## Phased Enhancement Plan

### Phase 1: Steps (Form Sections)

**FormSpec:** `FormStep { StepOrder, StepLabel, Fields }`

**Idea:** Add `steps` to the spec. Each step is a logical section. Elements belong to a step.

**Option A: Steps as element containers (recommended)**

```json
{
  "root": "step-1",
  "steps": [
    { "key": "step-1", "order": 1, "label": "Patient Demographics" },
    { "key": "step-2", "order": 2, "label": "Chief Complaint" },
    { "key": "step-3", "order": 3, "label": "Assessment" }
  ],
  "elements": {
    "step-1": {
      "type": "Step",
      "props": { "label": "Patient Demographics", "order": 1 },
      "children": ["field-firstname", "field-dob", "field-gender"]
    },
    "field-firstname": { "type": "Input", "props": { "label": "First Name", ... }, "children": [] },
    ...
  }
}
```

- New component: `Step` — renders as a section (Card, AccordionItem, or tab panel)
- `steps` array: metadata for step order/labels (used by stepper UI, pathway references)
- Elements stay flat; `Step` is a container whose children are the step's fields

**Option B: Steps own element keys**

```json
{
  "root": "main",
  "steps": [
    {
      "key": "step-1",
      "order": 1,
      "label": "Demographics",
      "elements": ["field-firstname", "field-dob"]
    }
  ],
  "elements": { ... }
}
```

- `steps[].elements` = list of element keys belonging to that step
- Root could be a StepContainer that renders steps in order

**Recommendation:** Option A. Reuse existing tree: `Step` is a layout component (like Card). Catalog adds `Step` with `label`, `order`, `description`. AI generates Step elements with field children. Minimal spec change.

---

### Phase 2: Form Fields (Full FieldType Coverage)

**FormSpec FieldTypes → json-render components**

| FormSpec FieldType | json-render component | Props mapping |
|-------------------|------------------------|---------------|
| Text | Input | label, value, type: "text" |
| TextArea | Textarea | label, value, rows |
| Email | Input | type: "email" |
| Password | Input | type: "password" |
| Number | Input | type: "number" |
| Tel | Input | type: "tel" |
| Date | Input | type: "date" (or DatePicker) |
| DateTimeLocal | Input | type: "datetime-local" |
| Time | Input | type: "time" |
| Checkbox | Checkbox | label, checked |
| Radio | Radio | label, options, value |
| SingleChoice | Select or Radio | options, value |
| Dropdown | Select | options, value, placeholder |
| MultiChoice | Checkbox (multiple) | options, value (array) |
| CheckboxList | CheckboxList (new) | options, value (array) |
| TagList | TagList (new) | options, value (array) |
| Matrix | Matrix (new) | items (rows), options (columns) |
| Signature | Signature (new) | value (base64) |
| Message | Alert | title, message, type |
| BooleanInfo | Checkbox | defaultValue, selection |

**FormSpec FieldOption with Score**

```json
{
  "type": "Radio",
  "props": {
    "label": "Pain level",
    "options": [
      { "value": "0", "description": "No pain", "score": 0 },
      { "value": "1", "description": "Mild", "score": 1 },
      { "value": "5", "description": "Moderate", "score": 5 },
      { "value": "10", "description": "Severe", "score": 10 }
    ],
    "value": { "$bindState": "/form/painLevel" }
  }
}
```

- Extend option shape: `{ value, description?, score? }` — `score` for scoring calculations

**DependsOn → visible**

FormSpec `DependsOn { FieldKey, FieldValue, Evaluator }` maps directly to our `visible`:

```json
{
  "type": "Input",
  "props": { "label": "If yes, explain" },
  "visible": { "$state": "/form/previousQuestion", "eq": "yes" }
}
```

- We already support `{ $state, eq }`. Add `$field` or keep `$state` with path to field value.
- Evaluators: Equals, NotEquals, GreaterThan, LessThan, Exists, IsEmpty, Contains — we have `eq`, `neq`, `gt`, `lt`; can add `exists`, `empty`, `contains`.

**FormField metadata**

Add optional fields to elements used as form fields:

```json
{
  "type": "Input",
  "props": { ... },
  "fieldOrder": 1,
  "fieldKey": "550e8400-e29b-41d4-a716-446655440000",
  "notes": "Optional helper text",
  "isOptional": false,
  "isDeprecated": false
}
```

- `fieldKey`: GUID for FormSpec interop (optional in JSON; can be generated)
- `fieldOrder`: ordering within step
- `notes`, `isOptional`, `isDeprecated`: metadata for form authoring

**New components to add to catalog**

- `Step` — section container (label, order)
- `Matrix` — rows × columns (Likert-style)
- `Signature` — signature pad
- `CheckboxList` — multi-select from options
- `TagList` — tag-style multi-select
- `Message` — informational (Warning, Success, Error, Info)
- `ReadOnly` — collapsible content block (Heading, Content, Formatting)
- `PatientDemographics` — optional composite (Fields, RequiredFields, IncludePhoto)
- `ClinicalStaff` — staff info capture (Role, IncludeName, etc.)

---

### Phase 3: Scoring

**FormSpec:** `Score { MaxScore, ScoreRanges }`, `ScoreRange { Min, Max, Label, Tag }`, `FieldOption.Score`

**Top-level score config**

```json
{
  "root": "...",
  "elements": { ... },
  "state": { ... },
  "score": {
    "maxScore": 30,
    "ranges": [
      { "min": 0, "max": 9, "label": "Low risk", "tag": "success" },
      { "min": 10, "max": 19, "label": "Moderate", "tag": "warning" },
      { "min": 20, "max": 30, "label": "High risk", "tag": "danger" }
    ]
  }
}
```

- `tag`: "unspecified" | "primary" | "info" | "success" | "warning" | "danger" (maps to ScoreColor)
- Option-level `score` (Phase 2) + `maxScore` + `ranges` = full scoring model

**Pathway conditions using score**

- `ScoreInRange(min, max)` — total form score
- `FieldScoreInRange(fieldKey, min, max)` — single field's score

These appear in ClinicalPathway (Phase 4).

---

### Phase 4: ClinicalPathway

**FormSpec:** `ClinicalPathwaySpec` — states, transitions, constraints, actions.

**Embedded pathway in spec**

```json
{
  "root": "...",
  "elements": { ... },
  "state": { ... },
  "score": { ... },
  "clinicalPathway": {
    "pathwayId": "phq9-pathway",
    "pathwayName": "PHQ-9 Follow-up",
    "version": "1.0",
    "protocolSource": "APA Guidelines",
    "executionMode": { "single": { "selectionStrategy": "highestPriority", "requiresFullEvaluation": true } },
    "initialState": "state-start",
    "states": [
      {
        "key": "state-start",
        "label": "Start",
        "order": 0,
        "type": "evaluation",
        "evaluation": {
          "name": "Total score",
          "parameters": [["/fields/phq9-total", "GreaterOrEqual", "10"]],
          "criticalFindings": ["Suicide risk if Q9 > 0"]
        }
      },
      {
        "key": "state-refer",
        "label": "Refer to mental health",
        "order": 1,
        "type": "action",
        "action": {
          "referral": {
            "target": "Mental Health Specialist",
            "urgency": "routine",
            "days": 7,
            "reason": "PHQ-9 score indicates moderate depression"
          }
        }
      }
    ],
    "transitions": [
      {
        "from": "state-start",
        "to": "state-refer",
        "condition": { "scoreInRange": [10, 27] },
        "priority": 1
      }
    ]
  }
}
```

**Condition shapes (simplified for JSON)**

| FormSpec | JSON |
|----------|------|
| FieldCondition(fieldKey, evaluator, value) | `{ "field": "fieldKey", "evaluator": "Equals", "value": "yes" }` |
| ScoreInRange(min, max) | `{ "scoreInRange": [10, 27] }` |
| FieldScoreInRange(fieldKey, min, max) | `{ "fieldScoreInRange": ["fieldKey", 5, 10] }` |
| CompositeCondition(And, conditions) | `{ "and": [cond1, cond2] }` |
| Always | `{ "always": true }` |

**Action shapes**

| FormSpec Action | JSON |
|-----------------|------|
| Medication | `{ "medication": { "name", "dose", "route", "frequency", "duration", "asNeeded } }` |
| Test | `{ "test": { "testName", "testType", "requiresResult", "criticalValues? } }` |
| Referral | `{ "referral": { "target", "urgency", "reason" } }` |
| Education | `{ "education": { "topics", "materials? } }` |
| Task | `{ "task": { "category", "description", "priority", "dueDate", "assignee } }` |
| Alert | `{ "alert": { "category", "message", "severity" } }` |
| SetFieldValue | `{ "setFieldValue": { "targetField", "value", "condition? } }` |
| NavigateToForm | `{ "navigateToForm": { "formId", "navigationType", "returnOnComplete } }` |

**Execution mode**

- `single` — one path (HighestPriority, MostSpecific, ClinicalSeverity)
- `multi` — multiple paths (AllMatching, NonConflicting, Complementary)
- `trigger` — OnFormSave, OnFormLoad, OnFormSubmit, OnFieldChange

---

## Summary: Enhanced Spec Shape

```typescript
interface FormSpec {
  root: string;
  steps?: StepMeta[];                    // Phase 1
  elements: Record<string, UIElement>;
  state?: Record<string, unknown>;
  score?: ScoreConfig;                   // Phase 3
  clinicalPathway?: ClinicalPathwaySpec; // Phase 4
}

interface StepMeta {
  key: string;
  order: number;
  label: string;
}

interface UIElement {
  type: string;
  props: Record<string, unknown>;
  children?: string[];
  visible?: VisibilityCondition;
  on?: Record<string, ActionBinding>;
  repeat?: { statePath: string; key?: string };
  // Phase 2 - form field metadata
  fieldOrder?: number;
  fieldKey?: string;
  notes?: string;
  isOptional?: boolean;
  isDeprecated?: boolean;
}
```

---

## Implementation Order

| Phase | Scope | Catalog changes | Spec changes |
|-------|-------|-----------------|--------------|
| **1. Steps** | Step component, steps metadata | Add `Step` component | Optional `steps` array; Step elements |
| **2. Form fields** | FieldTypes, options with score, DependsOn, field metadata | Add Matrix, Signature, CheckboxList, TagList, Message, Step; extend Input/Select/Radio/Checkbox | `fieldOrder`, `fieldKey`, `notes`, `isOptional`, `isDeprecated`; option shape `{ value, description?, score? }` |
| **3. Scoring** | MaxScore, ScoreRanges | — | Top-level `score` object |
| **4. ClinicalPathway** | States, transitions, conditions, actions | — | Top-level `clinicalPathway` object |

---

## Playground Integration

- **Mode toggle:** "Form mode" vs "UI mode" — form mode uses FormSpec-aware catalog and prompt
- **Catalog:** New `formSpecCatalog` with Step, all form field types, scoring-aware options
- **Prompt:** Custom rules for form authoring (steps, field ordering, DependsOn, scoring)
- **Export:** Future json-spec → F# FormSpec mapper consumes this enhanced JSON

---

## Next Steps

1. Implement Phase 1 (Steps) in playground — add Step component, steps array, update prompt
2. Add form field components (Phase 2) incrementally — Matrix, Signature, etc.
3. Add score config (Phase 3) — top-level score, ranges
4. Design ClinicalPathway JSON schema in detail (Phase 4) — then implement

---

## Appendix: FormSpec Evaluators → JSON visible

| FormSpec Evaluator | JSON visible |
|-------------------|--------------|
| Equals | `{ $state: "/path", eq: "value" }` |
| NotEquals | `{ $state: "/path", neq: "value" }` |
| GreaterThan | `{ $state: "/path", gt: N }` |
| GreaterThanOrEquals | `{ $state: "/path", gte: N }` |
| LessThan | `{ $state: "/path", lt: N }` |
| LessThanOrEquals | `{ $state: "/path", lte: N }` |
| Exists | `{ $state: "/path" }` (truthy) |
| IsEmpty | `{ $state: "/path", empty: true }` (extend) |
| Contains | `{ $state: "/path", contains: "substr" }` (extend) |

We already support eq, neq, gt, gte, lt, lte. Add `empty` and `contains` if needed for full DependsOn parity.

---

## FormSpec Element Catalog Design

Yes, we need a dedicated **form-spec catalog** for all FormSpec FieldTypes. It follows the same pattern as playground/dashboard: `defineCatalog(schema, { components, actions })`.

### Catalog Structure (Same as Playground/Dashboard)

```typescript
// formSpecCatalog.ts
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

// Shared option shape (FieldOption: Description, Value, OptionKey, Score)
const fieldOption = z.object({
  value: z.string(),
  description: z.string().nullable(),
  optionKey: z.string().nullable(),  // GUID; can be generated if omitted
  score: z.number().nullable(),     // For scoring
});

export const formSpecCatalog = defineCatalog(schema, {
  components: {
    // Layout
    Step: { ... },
    Form: { ... },
    Stack: { ... },

    // Text inputs (consolidated - FormSpec has Text, Email, Password, etc.)
    Input: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        type: z.enum([
          "text", "email", "password", "number", "tel", "search", "color",
          "date", "datetime-local", "time"
        ]).nullable(),
        value: z.string().nullable(),
        placeholder: z.string().nullable(),
        checks: z.array(z.object({ type: z.string(), message: z.string(), args: z.record(z.unknown()).optional() })).nullable(),
      }),
      description: "Text/number/date input. Use type for email, password, date, etc.",
    },

    Textarea: { ... },

    // Choice inputs
    Radio: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        options: z.array(fieldOption),  // { value, description?, score? }
        value: z.string().nullable(),
      }),
      description: "Single choice. Options can have score for scoring.",
    },

    Select: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        options: z.array(fieldOption),
        placeholder: z.string().nullable(),
        value: z.string().nullable(),
      }),
      description: "Dropdown single choice.",
    },

    Checkbox: { ... },

    CheckboxList: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        options: z.array(fieldOption),
        value: z.array(z.string()).nullable(),  // Multi-select
      }),
      description: "Multi-select from options.",
    },

    TagList: { ... },

    TextAutoComplete: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        options: z.array(fieldOption),
        value: z.string().nullable(),
      }),
      description: "Autocomplete from options.",
    },

    // Matrix / Likert
    Matrix: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        items: z.array(fieldOption),   // Rows (questions)
        options: z.array(fieldOption), // Columns (scale)
        value: z.record(z.string(), z.string()).nullable(),  // itemKey -> optionValue
      }),
      description: "Likert/matrix: rows = questions, options = scale.",
    },

    Signature: {
      props: z.object({
        label: z.string().nullable(),
        name: z.string(),
        value: z.string().nullable(),  // Base64
      }),
      description: "Signature pad.",
    },

    // Informational
    Message: {
      props: z.object({
        heading: z.string(),
        message: z.string(),
        messageType: z.enum(["warning", "success", "error", "info", "danger"]).nullable(),
        footer: z.string().nullable(),
      }),
      description: "Informational message block.",
    },

    ReadOnly: {
      props: z.object({
        heading: z.string(),
        content: z.string(),
        collapsible: z.boolean().nullable(),
        initiallyExpanded: z.boolean().nullable(),
        formatting: z.enum(["plain", "markdown", "html"]).nullable(),
      }),
      description: "Read-only content block.",
    },

    // Extensibility
    PluginField: {
      props: z.object({
        pluginId: z.string(),
        fieldName: z.string(),
        config: z.record(z.string(), z.unknown()).nullable(),  // Plugin-specific passthrough
      }),
      description: "Custom plugin field. pluginId identifies the plugin (e.g. Fable.Form.Simple.Bulma.Fields.SignatureField). fieldName is display name. config is plugin-specific.",
    },
  },
  actions: { ... },
});
```

### Consolidation vs One-Per-FieldType

| Approach | Pros | Cons |
|----------|------|------|
| **Consolidated** (Input with type) | Fewer components, simpler prompt, less AI confusion | Slightly less explicit in prompt |
| **One per FieldType** (Text, Email, Date, etc.) | Direct 1:1 FormSpec mapping, clearer for mapper | ~22 components, longer prompt |

**Recommendation:** Consolidated for built-ins (Input, Textarea, Radio, Select, CheckboxList, Matrix, Signature, Message, ReadOnly). Add **PluginField** as the single extensibility point.

### PluginField: Handling Custom Plugins

FormSpec has `PluginField of PluginFieldConfig` where `PluginFieldConfig = { PluginId, FieldName }`. Plugins are loaded at runtime; the catalog cannot know them all ahead of time.

**Option A: Generic PluginField only**

- One component: `PluginField` with `pluginId`, `fieldName`, optional `config`.
- AI is told: "Use PluginField for custom field types. Provide pluginId (e.g. Fable.Form.Simple.Bulma.Fields.BmiCalculator) and fieldName."
- Registry: `PluginField` renders a placeholder or delegates to a plugin registry keyed by `pluginId`.

**Option B: Dynamic catalog extension**

- Base catalog has built-in field types.
- When plugins load, they register: `{ pluginId, fieldName, propsSchema? }`.
- Catalog is merged: `formSpecCatalog + pluginDefinitions`.
- AI sees both built-ins and registered plugins in the prompt.

**Option C: Hybrid**

- Base catalog: built-ins + generic `PluginField`.
- Optional: plugins can provide a schema fragment; app merges it into the catalog at init.
- Fallback: unknown pluginId → render via PluginField with passthrough config.

**Recommendation:** Start with Option A. One `PluginField` component. The json-spec → F# mapper will emit `PluginField of { PluginId, FieldName }` for elements with `type: "PluginField"`. If you later add a plugin registry that knows all plugins, you can extend the catalog (Option B) so the AI sees them by name.

### Component Count Summary

| Category | Components |
|----------|------------|
| Layout | Step, Form, Stack |
| Text | Input, Textarea |
| Choice | Radio, Select, Checkbox, CheckboxList, TagList, TextAutoComplete |
| Special | Matrix, Signature |
| Informational | Message, ReadOnly |
| Extensibility | PluginField |

~14 components. Comparable to dashboard catalog size.

### Registry Pairing

Each catalog component needs a registry implementation. For PluginField:

```tsx
// In registry
PluginField: ({ element }) => {
  const { pluginId, fieldName, config } = element.props;
  const Plugin = pluginRegistry[pluginId];  // From plugin system
  if (Plugin) return <Plugin config={config} />;
  return <div>Plugin {pluginId} not loaded</div>;
},
```
