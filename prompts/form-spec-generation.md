# FormSpec JSON Generation Prompt

**Goal:** Generate JSON output that can be **converted** to F# FormSpec. We care about compatibility, not exactness. The mapper will translate our format (flat elements, string keys) to F# FormSpec (Steps with Fields, GUIDs).

---

## How the Prompt System Works

| Layer | Source | Purpose |
|-------|--------|---------|
| **System prompt** | `formSpecCatalog.prompt()` + custom rules | Components, format, rules |
| **User prompt** | `buildUserPrompt()` + user text | The request, optional currentSpec, state |

The system prompt comes from the catalog (components, actions, output format). The user prompt is the free-form request. **Together** they must be sufficient for the LLM to produce compatible JSON.

---

## Output Format

- **JSONL patches** (RFC 6902): one JSON object per line, no markdown, no code fences
- Order: `/root` first, then `/elements/<key>`, then `/state` (interleave state patches after elements that use them)
- Paths: `/root`, `/elements/<element-key>`, `/steps`, `/score`, `/clinicalPathway`, `/state`

---

## Spec Structure (What to Generate)

```json
{
  "root": "<form-root-key>",
  "elements": { "<key>": { "type": "...", "props": {...}, "children": [...], "visible": true } },
  "state": { "<path>": <initial-value> },
  "steps": [{ "key": "step-1", "order": 1, "label": "Section Name" }],
  "score": { "maxScore": 27, "ranges": [{ "min": 0, "max": 4, "label": "...", "tag": "success" }] },
  "clinicalPathway": { "pathwayId": "...", "states": [...], "transitions": [...] }
}
```

- **root**: Key of the top-level element (usually a Form)
- **elements**: Flat map. Each element has `type`, `props`, `children` (array of child keys), optional `visible`, optional `on`
- **state**: Initial values for all bound paths. Use `{}` for Matrix value, `0` for totalScore
- **steps**: Optional. For multi-step forms, one entry per step
- **score**: Optional. For scored forms: maxScore and ranges (tag: success|info|warning|danger|primary)
- **clinicalPathway**: Optional. For clinical pathways: states, transitions, conditions, actions

---

## Components (FormSpec Catalog)

### Layout

| Component | Props | Use |
|-----------|-------|-----|
| **Form** | submitAction, submitActionParams | Wrap entire form. Root or child of root |
| **Stack** | direction (horizontal\|vertical), gap (none\|sm\|md\|lg) | Flex layout |
| **Step** | label, order, description? | Form section. Use for multi-step forms |

### Text Inputs

| Component | Props | Binding |
|-----------|-------|---------|
| **Input** | label, name, type (text\|email\|password\|number\|date\|tel\|search\|color\|datetime-local\|time), value, placeholder, checks | `value: { $bindState: "/path" }` |
| **Textarea** | label, name, placeholder, rows, value | `value: { $bindState: "/path" }` |

Validation: `checks: [{ type: "required", message: "..." }, { type: "email", message: "..." }]`

### Choice Inputs

| Component | Props | Binding |
|-----------|-------|---------|
| **Radio** | label, name, options, value | `value: { $bindState: "/path" }` |
| **Select** | label, name, options, placeholder, value | `value: { $bindState: "/path" }` |
| **Checkbox** | label, name, checked | `checked: { $bindState: "/path" }` |
| **CheckboxList** | label, name, options, value | `value: { $bindState: "/path" }` (array) |
| **TagList** | label, name, options, value | `value: { $bindState: "/path" }` (array) |
| **TextAutoComplete** | label, name, options, value | `value: { $bindState: "/path" }` |

**Options:** `{ value: string, description: string, optionKey?: string, score?: number }`  
For scored forms, add `score` to options. Matrix options use numeric `value` (0, 1, 2, 3) and `score`.

### Matrix (Likert / Severity Scale)

| Prop | Shape |
|------|-------|
| items | `[{ key: string, label: string }]` or `[{ value, description }]` |
| options | `[{ value: "0"|"1"|..., description: string, score: number }]` |
| value | `{ $bindState: "/path" }` binds to `Record<itemKey, optionValue>` |

State: `{ "/phq9/responses": {}, "/phq9/totalScore": 0 }`  
Matrix value is a record: `{ "item-key": "option-value", ... }`. Options can have numeric `value` (0-3) and `score` (0-3) for PHQ-9.

### Special

| Component | Props | Use |
|-----------|-------|-----|
| **Signature** | label, name, value | Consent. Value is base64 |
| **Message** | heading, message, messageType (warning\|success\|error\|info\|danger), footer | Instructions, alerts |
| **ReadOnly** | heading, content, collapsible, initiallyExpanded, formatting (plain\|markdown\|html) | Static content |
| **ScoreSummary** | maxScore, currentScore, ranges | Displays score. Use `currentScore: { $state: "/phq9/totalScore" }` |
| **PluginField** | pluginId, fieldName, config | Placeholder for custom plugins |
| **Button** | label, variant (primary\|secondary\|danger), disabled | Submit. `on: { press: { action: "formSubmit", params: {} } }` |

---

## State and Visibility

- **$bindState**: Two-way binding for form inputs. `{ $bindState: "/path" }`
- **$state**: Read-only. For ScoreSummary currentScore, visibility conditions
- **visible**: Top-level on element. `{ $state: "/refusal", eq: "no" }` to show only when refusal is "no"
- State paths: JSON Pointer style (`/phq9/responses`, `/refusal`)

---

## Scoring

1. **Top-level score**: `{ maxScore: 27, ranges: [{ min, max, label, tag }] }`
2. **Option scores**: Add `score` to Radio/Select/CheckboxList/Matrix options
3. **ScoreSummary**: Component with `currentScore: { $state: "/path" }`, `maxScore`, `ranges`
4. **State**: Initialize `/totalScore` or `/phq9/totalScore` as 0 (runtime sums from Matrix/options)

---

## Clinical Pathway

For forms with clinical logic (e.g. PHQ-9 follow-up), output `clinicalPathway`:

```json
{
  "pathwayId": "phq9_clinical_pathway",
  "pathwayName": "PHQ-9 Depression Assessment Pathway",
  "version": "1.0.0",
  "protocolSource": "PHQ-9 clinical guidelines",
  "executionMode": { "single": { "selectionStrategy": "highestPriority" } },
  "initialState": "state-refusal-check",
  "states": [...],
  "transitions": [...]
}
```

### State Types

| type | Payload | Use |
|------|---------|-----|
| evaluation | evaluation: { name, parameters?, criticalFindings? } | Data collection step |
| action | action: { referral\|task\|alert\|medication\|education } | Single action |
| compoundAction | actions: [...] | Multiple actions |
| conditionalAction | conditionalAction: { condition, thenAction, elseAction? } | Branching |
| terminal | terminal: { outcome } | End state |

### Transition Conditions

| Condition | Shape | Use |
|-----------|-------|-----|
| always | `{ always: true }` | Unconditional |
| field | `{ field: "element-key", evaluator: "Equals", value: "yes" }` | Compare field value |
| scoreInRange | `{ scoreInRange: [min, max] }` | Global score |
| fieldScoreInRange | `{ fieldScoreInRange: ["matrix-key", min, max] }` | Matrix/field total score |
| matrixItem | `{ matrixItem: { field: "phq9-matrix", itemKey: "suicidal", evaluator: "NotEquals", value: "0" } }` | Specific Matrix item (e.g. PHQ-9 item 9) |
| and/or/not | `{ and: [cond, cond] }`, `{ or: [...] }`, `{ not: cond }` | Combine conditions |

**Field references**: Use element keys (e.g. `"refusal-radio"`, `"phq9-matrix"`). The mapper resolves to F# FieldKey.

### Actions (in states)

| Action | Shape |
|--------|-------|
| referral | `{ target, urgency?, reason? }` |
| task | `{ category?, description, priority? }` |
| alert | `{ category?, message, severity? }` |
| medication | `{ name, dose?, route? }` |
| education | `{ topics: string[] }` |
| test | `{ testName, testType? }` |

### Transitions

```json
{ "from": "state-refusal-check", "to": "state-phq9-collect", "condition": { "field": "refusal-radio", "evaluator": "Equals", "value": "no" }, "priority": 1 }
```

Lower priority number = higher precedence. One condition per transition.

### PHQ-9 Pathway Goalpost (Flow)

Target structure from `formSpecPhq9Goalpost`:

1. **state-refusal-check** (evaluation) -> refusal-radio=no -> state-phq9-collect; refusal-radio=yes -> state-declined
2. **state-phq9-collect** (evaluation) -> always -> state-impairment
3. **state-impairment** (evaluation) -> always -> state-calc-score
4. **state-calc-score** (evaluation) -> always -> state-suicidal-check
5. **state-suicidal-check** (evaluation) -> matrixItem suicidal != "0" -> state-suicidal-alert (p1); matrixItem suicidal == "0" -> state-classify (p2)
6. **state-suicidal-alert** (action/alert) -> always -> state-escalated
7. **state-classify** (evaluation) -> fieldScoreInRange phq9-matrix [0,4]->minimal, [5,9]->mild, [10,14]->moderate, [15,19]->moderately-severe, [20,27]->severe
8. **Severity actions** -> minimal/mild/moderate -> state-complete; moderately-severe/severe -> state-escalated
9. **Terminals**: state-declined, state-complete, state-escalated

---

## Tiered Test Prompts

Use `TIER=1` through `TIER=4` with `pnpm --filter web test:form-gen` to iterate:

| Tier | Target |
|------|--------|
| 1 | Matrix present, validates |
| 2 | Matrix + steps + score |
| 3 | + Refusal, visibility |
| 4 | + clinicalPathway |

---

## Example User Prompts (Sophisticated)

Use these as templates. The user request should be specific enough to trigger the right features.

### Minimal Form

```
Create a patient registration form with Input (name, email), Select (gender), Textarea (notes), Checkbox (consent), and Submit button.
```

### Multi-Step Form

```
Build a 3-step intake form: Step 1 Demographics (name, DOB, contact), Step 2 Medical History (Textarea for conditions, CheckboxList for allergies), Step 3 Consent (ReadOnly with instructions, Signature). Output /steps with key, order, label for each step.
```

### Scored Form (Radio/Select)

```
Design a risk assessment form: Radio questions with options that have scores (0-3). Output /score with maxScore and ranges (0-5 low, 6-10 moderate, 11-15 high). Include ScoreSummary component with currentScore from state.
```

### Matrix (PHQ-9 Style)

```
Build a PHQ-9 style depression screening: Matrix with 9 items (Little interest, Feeling down, Sleep, Tired, Appetite, Self-worth, Concentration, Slow/fast, Suicidal thoughts), options 0-3 (Not at all, Several days, More than half, Nearly every day) with scores 0-3. State: /phq9/responses as {}, /phq9/totalScore as 0. Include ScoreSummary with ranges 0-4 minimal, 5-9 mild, 10-14 moderate, 15-19 moderately severe, 20-27 severe.
```

### PHQ-9 with Clinical Pathway (Full)

```
Build a complete PHQ-9 form with clinical pathway:

1. Form structure: Refusal Radio (yes/no), PHQ-9 Matrix (9 items, options 0-3 with scores), Functional impairment Radio (0-3), ScoreSummary, Submit. Use visibility so steps after refusal only show when refusal=no.

2. Output /steps: Patient Screening, Depression Symptom Assessment, Functional Impairment, Scoring.

3. Output /score: maxScore 27, ranges 0-4 minimal, 5-9 mild, 10-14 moderate, 15-19 moderately severe, 20-27 severe.

4. Output /clinicalPathway:
   - initialState: state-refusal-check
   - States: refusal-check (evaluation), phq9-collect (evaluation), impairment (evaluation), calc-score (evaluation), suicidal-check (evaluation), suicidal-alert (action with alert), classify (evaluation), minimal/mild/moderate/moderately-severe/severe (actions: education, task, medication, referral), declined/complete/escalated (terminal)
   - Transitions: refusal=no -> phq9-collect; refusal=yes -> declined; suicidal item != 0 -> suicidal-alert; suicidal = 0 -> classify; fieldScoreInRange ["phq9-matrix", 0,4] -> minimal; [5,9] -> mild; [10,14] -> moderate; [15,19] -> moderately-severe; [20,27] -> severe; action states -> complete or escalated
   - Use element keys as field refs: "refusal-radio", "phq9-matrix"
   - matrixItem condition for suicidal: { matrixItem: { field: "phq9-matrix", itemKey: "suicidal", evaluator: "NotEquals", value: "0" } }
```

### All Features (Fixture Target)

```
Create a clinical assessment form with ALL supported FormSpec features: Step, Form, Stack, Input (text, email, number, date), Textarea, Radio, Select, Checkbox, CheckboxList, TagList, TextAutoComplete, Matrix (items with key/label, options with score), Signature, Message, ReadOnly, ScoreSummary, Button. Include /steps, /score with ranges, and /clinicalPathway with at least 2 states and transitions (e.g. scoreInRange to referral). Use $bindState on all form inputs. Use visibility where appropriate.
```

---

## Checklist for Compatibility

Before considering output "convertible" to F# FormSpec:

- [ ] All element keys are unique strings
- [ ] Form wraps the form; root points to Form or top container
- [ ] Steps use Step component; /steps array matches
- [ ] Matrix: items have key/label (or value/description); options have value and score for PHQ-9
- [ ] State initialized for all $bindState paths
- [ ] clinicalPathway: states have type (evaluation|action|terminal|...); transitions reference valid state keys; conditions use supported shapes (always, field, scoreInRange, fieldScoreInRange, matrixItem)
- [ ] Field refs in pathway conditions = element keys
- [ ] Score ranges: tag is success|info|warning|danger|primary

---

## Iteration Notes

- **Prompt tuning**: If LLM omits `score`, `clinicalPathway`, or `steps`, strengthen the user prompt or add custom rules to the system prompt
- **Matrix item keys**: Use consistent keys (e.g. `suicidal` for PHQ-9 item 9) so matrixItem conditions can reference them
- **Visibility**: Use `visible: { $state: "/path", eq: "value" }` for conditional sections (e.g. hide assessment when patient refused)
