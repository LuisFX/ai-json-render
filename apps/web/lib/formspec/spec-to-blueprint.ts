/**
 * Turn a json-render Spec into a Healix Blueprint.
 *
 * The Spec is the LLM preview (string keys). The Blueprint is an empty FormSpec.
 * Construction goes through published @f1studio/form-spec helpers. This module
 * does not build FieldKey / StateKey / condition unions itself.
 *
 * Helpers that do not exist are named and skipped (or refuse the build, for a
 * data field with no constructor). See plan.01.
 */
import type { Spec } from "@json-render/core";
import { formSpecHelpers } from "./helpers";

const {
  addPathwayToFormSpec,
  createActionState,
  createCheckboxField,
  createCheckboxListField,
  createClinicalPathway,
  createFieldOption,
  createFormSpec,
  createFormStep,
  createMatrixField,
  createPluginField,
  createTerminalState,
  createTextField,
  createTransition,
  defaultArg,
  deserializeFormSpec,
  getFieldKeyString,
  isSome,
  listToArray,
  serializeFormSpec,
} = formSpecHelpers;

type FormSpec = ReturnType<typeof createFormSpec>;
type FormField = ReturnType<typeof createTextField>;
type FormStep = ReturnType<typeof createFormStep>;

/** Empty FormSpec template. field.Value stays None. */
export type Blueprint = FormSpec & { readonly __brand: "Blueprint" };

/** Thoth JSON of a Blueprint. Healix loads this with deserializeBlueprint. */
export type BlueprintThothString = string & {
  readonly __brand: "BlueprintThothString";
};

export type BuildFailure = {
  readonly field: string;
  readonly reason: string;
};

export type BlueprintBuild =
  | {
      readonly kind: "built";
      readonly blueprint: Blueprint;
      readonly thoth: BlueprintThothString;
      readonly warnings: readonly string[];
    }
  | { readonly kind: "refused"; readonly failures: readonly BuildFailure[] };

const LAYOUT = new Set(["Form", "Stack", "Step"]);
const DISPLAY = new Set(["Button", "Message", "ReadOnly", "ScoreSummary"]);

type Element = Spec["elements"][string];

/** String the helpers pass to Guid.Parse. fable-library-js 1.11 Guid.js has no newGuid. */
function guid(): string {
  return crypto.randomUUID();
}

function asBlueprint(formSpec: FormSpec): Blueprint {
  Object.defineProperty(formSpec, "__brand", {
    value: "Blueprint",
    enumerable: false,
    configurable: true,
  });
  return formSpec as Blueprint;
}

export function toBlueprintThothString(raw: string): BlueprintThothString {
  return raw as BlueprintThothString;
}

function propsOf(element: Element): Record<string, unknown> {
  return (element.props ?? {}) as Record<string, unknown>;
}

function labelOf(element: Element, fallback: string): string {
  const props = propsOf(element);
  const label = props.label ?? props.heading ?? props.name;
  return typeof label === "string" && label.length > 0 ? label : fallback;
}

function optionRows(
  raw: unknown,
): Array<{ description: string; value: string; optionKey: string }> | null {
  if (!Array.isArray(raw)) return null;
  return raw.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const value = String(row.value ?? row.key ?? "");
    const description = String(row.description ?? row.label ?? value);
    return { description, value, optionKey: guid() };
  });
}

function fieldFromElement(
  key: string,
  element: Element,
  fieldKey: string,
  warnings: string[],
): { ok: true; field: FormField } | { ok: false; failure: BuildFailure } {
  const props = propsOf(element);
  const label = labelOf(element, key);

  switch (element.type) {
    case "Input":
    case "Textarea":
      return { ok: true, field: createTextField(fieldKey, label, false) };
    case "Checkbox":
      return { ok: true, field: createCheckboxField(fieldKey, label, false) };
    case "CheckboxList":
    case "Radio":
    case "Select": {
      if (element.type !== "CheckboxList") {
        warnings.push(
          `${key}: no create${element.type}Field helper; used createCheckboxListField`,
        );
      }
      const options = optionRows(props.options);
      if (!options) {
        return {
          ok: false,
          failure: { field: key, reason: "choice field has no options array" },
        };
      }
      return {
        ok: true,
        field: createCheckboxListField(fieldKey, label, options),
      };
    }
    case "Matrix": {
      const items = optionRows(props.items);
      const options = optionRows(props.options);
      if (!items || !options) {
        return {
          ok: false,
          failure: { field: key, reason: "matrix is missing items or options" },
        };
      }
      warnings.push(
        `${key}: createFieldOption drops option scores (helper sets Score = None)`,
      );
      const itemOptions = items.map((item) =>
        createFieldOption(item.description, item.value, item.optionKey),
      );
      const scaleOptions = options.map((option) =>
        createFieldOption(option.description, option.value, option.optionKey),
      );
      return {
        ok: true,
        field: createMatrixField(fieldKey, label, itemOptions, scaleOptions),
      };
    }
    case "PluginField": {
      const pluginId =
        typeof props.pluginId === "string" ? props.pluginId : "unknown.plugin";
      return {
        ok: true,
        field: createPluginField(fieldKey, label, { pluginId }),
      };
    }
    default:
      return {
        ok: false,
        failure: {
          field: key,
          reason: `missing-helper:create${element.type}Field`,
        },
      };
  }
}

function childrenOf(spec: Spec, key: string): string[] {
  const children = spec.elements[key]?.children;
  return Array.isArray(children) ? children : [];
}

function collectFields(
  spec: Spec,
  key: string,
  keys: Map<string, string>,
  warnings: string[],
  failures: BuildFailure[],
  fields: FormField[],
): void {
  const element = spec.elements[key];
  if (!element) return;
  if (element.visible && element.visible !== true) {
    warnings.push(`${key}: visible/DependsOn omitted (no DependsOn helper)`);
  }
  if (LAYOUT.has(element.type) || DISPLAY.has(element.type)) {
    if (DISPLAY.has(element.type)) {
      warnings.push(`${key}: ${element.type} is not a FormSpec field; skipped`);
    }
    for (const child of childrenOf(spec, key)) {
      collectFields(spec, child, keys, warnings, failures, fields);
    }
    return;
  }
  const fieldKey = guid();
  const built = fieldFromElement(key, element, fieldKey, warnings);
  if (!built.ok) {
    failures.push(built.failure);
    return;
  }
  keys.set(key, getFieldKeyString(built.field.FieldKey) || fieldKey);
  fields.push(built.field);
}

function actionText(action: unknown): string {
  if (!action || typeof action !== "object") return "Clinical action";
  const record = action as Record<string, unknown>;
  for (const name of [
    "task",
    "alert",
    "referral",
    "medication",
    "education",
    "test",
  ]) {
    const payload = record[name];
    if (!payload || typeof payload !== "object") continue;
    const body = payload as Record<string, unknown>;
    if (typeof body.description === "string") return body.description;
    if (typeof body.message === "string") return body.message;
    if (typeof body.reason === "string") return body.reason;
    if (typeof body.name === "string") return body.name;
    if (Array.isArray(body.topics)) return body.topics.map(String).join("; ");
  }
  return "Clinical action";
}

function conditionKind(condition: unknown): string | null {
  if (!condition || typeof condition !== "object") return null;
  const c = condition as Record<string, unknown>;
  if (c.always === true) return "always";
  if (typeof c.field === "string" && c.evaluator === "Equals")
    return "fieldEquals";
  if (typeof c.field === "string") return "field";
  if (c.matrixItem) return "matrixItem";
  if (Array.isArray(c.fieldScoreInRange)) return "fieldScoreInRange";
  if (Array.isArray(c.scoreInRange)) return "scoreInRange";
  return "unsupported";
}

function attachPathway(
  spec: Spec,
  form: FormSpec,
  fieldKeys: Map<string, string>,
  warnings: string[],
): FormSpec {
  const pathway = spec.clinicalPathway;
  if (!pathway) return form;
  if (spec.score) {
    warnings.push(
      "score omitted (no Score helper; createFormSpec sets Score = None)",
    );
  }

  const stateKeys = new Map<string, string>();
  const states = [];
  for (const state of pathway.states) {
    const stateKey = guid();
    if (state.type === "terminal") {
      stateKeys.set(state.key, stateKey);
      states.push(
        createTerminalState(stateKey, state.terminal?.outcome ?? state.label),
      );
      continue;
    }
    if (
      state.type === "action" ||
      state.type === "compoundAction" ||
      state.type === "conditionalAction"
    ) {
      if (state.type !== "action") {
        warnings.push(
          `${state.key}: missing-helper:create${state.type}State; used createActionState`,
        );
      }
      const text =
        state.type === "action" ? actionText(state.action) : state.label;
      stateKeys.set(state.key, stateKey);
      states.push(createActionState(stateKey, state.label, text, undefined));
      continue;
    }
    warnings.push(
      `${state.key}: missing-helper:createEvaluationState; evaluation state omitted`,
    );
  }

  const transitions = [];
  for (const transition of pathway.transitions) {
    const kind = conditionKind(transition.condition);
    const from = stateKeys.get(transition.from);
    const to = stateKeys.get(transition.to);
    if (!from || !to) {
      warnings.push(
        `${transition.from}->${transition.to}: skipped (endpoint state was omitted)`,
      );
      continue;
    }
    if (kind === "fieldEquals") {
      const condition = transition.condition as {
        field: string;
        value?: string | number;
      };
      const fieldKey = fieldKeys.get(condition.field);
      if (!fieldKey) {
        warnings.push(
          `${transition.from}->${transition.to}: field ref ${condition.field} has no FieldKey`,
        );
        continue;
      }
      transitions.push(
        createTransition(
          guid(),
          from,
          to,
          fieldKey,
          String(condition.value ?? ""),
        ),
      );
      continue;
    }
    warnings.push(
      `${transition.from}->${transition.to}: helper-cannot-express:${kind ?? "unknown"} (createTransition is FieldCondition Equals only)`,
    );
  }

  if (states.length === 0) {
    warnings.push(
      "clinicalPathway omitted (no states the helpers can construct)",
    );
    return form;
  }
  warnings.push(
    "createClinicalPathway sets InitialState to a fixed guid; it does not take initialState",
  );
  const built = createClinicalPathway(
    pathway.pathwayName || "Clinical pathway",
    states,
    transitions,
  );
  return addPathwayToFormSpec(form, built);
}

/**
 * Spec → Blueprint, or every reason the build was refused.
 * A refusal builds nothing.
 */
export function specToBlueprint(spec: Spec): BlueprintBuild {
  const warnings: string[] = [];
  const failures: BuildFailure[] = [];
  const fieldKeys = new Map<string, string>();

  const stepKeys = Object.entries(spec.elements)
    .filter(([, element]) => element.type === "Step")
    .sort((a, b) => {
      const ao = Number(propsOf(a[1]).order ?? 0);
      const bo = Number(propsOf(b[1]).order ?? 0);
      return ao - bo;
    })
    .map(([key]) => key);

  const steps: FormStep[] = [];
  if (stepKeys.length === 0) {
    const fields: FormField[] = [];
    collectFields(spec, spec.root, fieldKeys, warnings, failures, fields);
    if (fields.length > 0) {
      steps.push(createFormStep(1, "Form", fields));
    }
  } else {
    stepKeys.forEach((key, index) => {
      const fields: FormField[] = [];
      for (const child of childrenOf(spec, key)) {
        collectFields(spec, child, fieldKeys, warnings, failures, fields);
      }
      const label = labelOf(spec.elements[key]!, `Step ${index + 1}`);
      steps.push(createFormStep(index + 1, label, fields));
    });
  }

  if (failures.length > 0) {
    return { kind: "refused", failures };
  }
  if (
    steps.length === 0 ||
    steps.every((step) => listToArray(step.Fields).length === 0)
  ) {
    return {
      kind: "refused",
      failures: [
        { field: spec.root, reason: "no fields the helpers can construct" },
      ],
    };
  }

  const form = attachPathway(
    spec,
    createFormSpec(guid(), "Generated form", steps),
    fieldKeys,
    warnings,
  );
  const blueprint = asBlueprint(form);
  const thoth = toBlueprintThothString(serializeFormSpec(blueprint));
  const decoded = deserializeFormSpec(thoth);
  if (!isSome(decoded)) {
    return {
      kind: "refused",
      failures: [
        { field: spec.root, reason: "deserializeFormSpec returned None" },
      ],
    };
  }
  return { kind: "built", blueprint, thoth, warnings };
}

export function pathwayIsPresent(formSpec: FormSpec): boolean {
  return defaultArg(formSpec.ClinicalPathway, undefined) !== undefined;
}
