# Mappable Landmark Inventory

What we expect the closest "mappable" JSON output to contain before it can be confidently converted to F# FormSpec. Based on `formSpecPhq9Goalpost` and `formSpecFullFixture`.

---

## 1. Top-Level Spec Structure

| Field | Required | Description | Fixture Reference |
|-------|----------|-------------|-------------------|
| `root` | Yes | Root element key (e.g. `"phq9-form"`) | Both fixtures |
| `elements` | Yes | Flat map of elements by key | Both fixtures |
| `state` | Yes | Initial state model for bindings | Both fixtures |
| `steps` | For multi-step | Step metadata (key, order, label) | Both fixtures |
| `score` | For scored forms | maxScore, ranges (min, max, label, tag) | Both fixtures |
| `clinicalPathway` | For pathways | States, transitions, conditions, actions | PHQ-9 goalpost |

---

## 2. Elements (Form Fields & Layout)

### 2.1 Layout Components

| Component | Purpose | Key Props | PHQ-9 Goalpost | Full Fixture |
|-----------|---------|-----------|----------------|--------------|
| `Form` | Form container | submitAction, submitActionParams | phq9-form | form-root |
| `Stack` | Flex layout | direction, gap | stack-main | stack-main, stack-step1, stack-step2 |
| `Step` | Step section | label, order, description | step-screening, step-symptoms, step-impairment, step-scoring | step-1, step-2, step-3 |

### 2.2 Field Components (F# FieldType equivalents)

| Component | F# FieldType | Key Props | PHQ-9 | Full Fixture |
|-----------|--------------|-----------|-------|--------------|
| `Input` | Input | label, name, type, value, placeholder | - | input-name, input-email |
| `Textarea` | Textarea | label, name, placeholder, rows | - | textarea-notes |
| `Radio` | Radio | label, name, options, value ($bindState) | refusal-radio, impairment-radio | radio-gender |
| `Select` | Select | label, name, options, placeholder | - | select-role |
| `Checkbox` | Checkbox | label, name, checked | - | checkbox-consent |
| `CheckboxList` | CheckboxList | label, name, options, value | - | checkboxlist-symptoms |
| `TagList` | TagList | label, name, options, value | - | taglist-tags |
| `TextAutoComplete` | TextAutoComplete | label, name, options, value | - | autocomplete-diagnosis |
| `Matrix` | Matrix | label, name, items, options, value ($bindState) | phq9-matrix | matrix-scale |
| `Message` | Message | heading, message, messageType | phq9-instructions | message-info |
| `ReadOnly` | ReadOnly | heading, content, collapsible, formatting | scoring-instructions | readonly-instructions |
| `ScoreSummary` | ScoreSummary | maxScore, currentScore ($state), ranges | phq9-score-summary | - |
| `Signature` | Signature | label, name, value | - | signature-pad |
| `PluginField` | PluginField | pluginId, fieldName, config | - | plugin-custom |
| `Button` | Button | label, variant, disabled, on.press | phq9-submit | btn-submit |

### 2.3 Element Requirements

- Every key in a `children` array MUST have a corresponding element patch (no orphan children).
- Each element has: `type`, `props`, `children`, optional `visible`, optional `on`.

---

## 3. State & Bindings

| Pattern | Purpose | Example |
|---------|---------|---------|
| `$bindState` | Two-way binding (read/write) | `value: { $bindState: "/phq9/responses" }` |
| `$state` | One-way read (visibility, currentScore) | `visible: { $state: "/refusal", eq: "no" }` |
| State path convention | Nested object for form data | `/phq9/responses`, `/phq9/totalScore`, `/refusal`, `/impairment` |

---

## 4. Visibility Conditions

| Shape | Purpose | Example |
|-------|---------|---------|
| `visible: true` | Always visible | Default |
| `visible: { $state: "/path", eq: "value" }` | Show when state matches | `{ $state: "/refusal", eq: "no" }` for step-symptoms |

---

## 5. Scoring

| Field | Required | Description |
|-------|----------|-------------|
| `score.maxScore` | Yes | Maximum possible score (e.g. 27 for PHQ-9) |
| `score.ranges` | Yes | Array of { min, max, label, tag } |
| `ScoreSummary.currentScore` | Yes | `{ $state: "/phq9/totalScore" }` or literal number |
| Matrix options | For scored Matrix | Each option has `score: 0|1|2|3` |

---

## 6. Clinical Pathway (PHQ-9 Goalpost)

### 6.1 Top-Level

| Field | Required | Description |
|-------|----------|-------------|
| `pathwayId` | Yes | Unique identifier |
| `pathwayName` | Yes | Human-readable name |
| `version` | Yes | Semantic version |
| `protocolSource` | No | Source of protocol |
| `executionMode` | Yes | `{ single: { selectionStrategy: "highestPriority" } }` |
| `initialState` | Yes | Key of first state |
| `states` | Yes | Array of PathwayState |
| `transitions` | Yes | Array of PathwayTransition |

### 6.2 State Types (Decision removed)

| Type | Purpose | Payload |
|------|---------|---------|
| `evaluation` | Evaluate conditions | evaluation.name, parameters, criticalFindings |
| `action` | Single action | action: PathwayAction |
| `compoundAction` | Multiple actions | actions: PathwayAction[] |
| `conditionalAction` | If/else | condition, thenAction, elseAction |
| `terminal` | End state | terminal.outcome |

### 6.3 Conditions

| Condition | Purpose | Example |
|-----------|---------|---------|
| `{ always: true }` | Unconditional | Linear flow |
| `{ field: "ref", evaluator: "Equals", value: "yes" }` | Field value | Refusal check |
| `{ matrixItem: { field, itemKey, evaluator, value } }` | Matrix item (e.g. suicidal) | Suicidal ideation check |
| `{ fieldScoreInRange: [fieldKey, min, max] }` | Score range from field | Severity classification |
| `{ scoreInRange: [min, max] }` | Global score range | Full fixture |
| `{ and: [...] }`, `{ or: [...] }`, `{ not: ... }` | Compound conditions | - |

### 6.4 Actions

| Action | Purpose | Example |
|--------|---------|---------|
| `referral` | Refer to specialist | target, urgency, reason |
| `task` | Clinical task | category, description, priority |
| `alert` | Safety alert | category, message, severity |
| `medication` | Medication recommendation | name, dose, route |
| `test` | Lab/test order | testName, testType |
| `education` | Patient education | topics[] |
| `setFieldValue` | Set field from pathway | targetField, value, condition? |

### 6.5 Transitions

- `from`, `to`: state keys
- `condition`: PathwayCondition
- `priority`: Lower = higher priority when multiple match

### 6.6 PHQ-9 Pathway Goalpost (Flow)

Target from `formSpecPhq9Goalpost`:

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

## 7. PHQ-9 Specific Landmark Checklist

| Item | Description | Status |
|------|-------------|--------|
| Refusal flow | Radio (yes/no) -> state-declined if yes | Goalpost |
| 4 Steps | Patient Screening, Depression Symptom Assessment, Functional Impairment, Scoring | Goalpost |
| Matrix 9 items | little-interest, feeling-down, sleep, tired, appetite, self-worth, concentration, slow-or-fast, suicidal | Goalpost |
| Matrix options 0-3 | Not at all, Several days, More than half, Nearly every day (with scores) | Goalpost |
| ScoreSummary | maxScore 27, ranges 0-4/5-9/10-14/15-19/20-27 | Goalpost |
| matrixItem condition | Suicidal item != "0" -> state-suicidal-alert | Goalpost |
| fieldScoreInRange | Classify -> minimal/mild/moderate/moderately-severe/severe | Goalpost |
| Visibility | Steps after refusal only when refusal=no | Goalpost |

---

## 8. Tiered Landmark Criteria (test-form-generation.ts)

| Tier | Criteria | Mappable When |
|------|----------|---------------|
| 1 | Matrix only | validation + hasMatrix + hasRoot + no orphans |
| 2 | Matrix + steps + score | validation + hasMatrix + hasRoot + no orphans |
| 3 | + refusal + visibility | Same as Tier 2 |
| 4 | + clinicalPathway | validation + hasMatrix + hasRoot + hasClinicalPathway + no orphans |

---

## 9. Conversion Readiness (JSON -> F# FormSpec)

A spec is **mappable** when:

1. **Validation passes** – `formSpecCatalog.validate(spec)` succeeds
2. **No orphan children** – Every referenced child has an element
3. **Tier-appropriate structure** – /root, /steps, /score present (Tier 2+); /clinicalPathway present (Tier 4)
4. **Matrix present** – For PHQ-9-style forms, Matrix with items and scored options
5. **State paths consistent** – Bindings use paths that exist in `state`

The mapper (future work) will:

- Resolve element keys to FieldKey (GUID or stable id)
- Map PathwayCondition/PathwayAction to F# union types
- Map StepMeta to FormSpec Steps
- Map ScoreMeta to ScoreColor/ScoreRange
