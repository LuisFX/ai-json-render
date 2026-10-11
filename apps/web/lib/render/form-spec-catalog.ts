import { defineCatalog, DynamicNumberSchema } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

/**
 * FormSpec catalog - FormSpec FieldTypes for clinical forms.
 * Maps to F# FormSpec.fs. Used in Form mode in playground.
 */

const fieldOption = z.object({
  value: z.string(),
  description: z.string().nullable(),
  optionKey: z.string().nullable(),
  score: z.number().nullable(),
});

/** Matrix item: accepts value/description OR key/label (LLM often uses key/label) */
const matrixItem = z
  .object({
    value: z.string().optional(),
    description: z.string().nullable().optional(),
    key: z.string().optional(),
    label: z.string().optional(),
  })
  .transform((v) => ({
    value: v.value ?? v.key ?? "",
    description: v.description ?? v.label ?? null,
  }));

/** Matrix option: accepts value as number or string, score for PHQ-9-style scoring */
const matrixOption = z
  .object({
    value: z.union([z.string(), z.number()]),
    description: z.string().nullable().optional(),
    score: z.number().nullable().optional(),
  })
  .transform((v) => ({
    value: String(v.value),
    description: v.description ?? null,
    score: v.score ?? null,
  }));

export const formSpecCatalog = defineCatalog(schema, {
  components: {
    // Layout
    Step: {
      props: z.object({
        label: z.string(),
        order: z.number(),
        description: z.string().nullable(),
      }),
      slots: ["default"],
      description:
        "Form section container for multi-step forms. Children are the fields in this step.",
      example: { label: "Patient Demographics", order: 1 },
    },

    Form: {
      props: z.object({
        submitAction: z.string().nullable(),
        submitActionParams: z.record(z.string(), z.unknown()).nullable(),
      }),
      slots: ["default"],
      description:
        "Form container. Wrap form inputs and a submit Button inside.",
    },

    Stack: {
      props: z.object({
        direction: z.enum(["horizontal", "vertical"]).nullable(),
        gap: z.enum(["none", "sm", "md", "lg"]).nullable(),
      }),
      slots: ["default"],
      description: "Flex layout container",
      example: { direction: "vertical", gap: "md" },
    },

    // Text inputs
    Input: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        type: z
          .enum([
            "text",
            "email",
            "password",
            "number",
            "tel",
            "search",
            "color",
            "date",
            "datetime-local",
            "time",
          ])
          .nullable(),
        value: z.string().nullable(),
        placeholder: z.string().nullable(),
        checks: z
          .array(
            z.object({
              type: z.string(),
              message: z.string(),
              args: z.record(z.string(), z.unknown()).optional(),
            }),
          )
          .nullable(),
      }),
      slots: [],
      description:
        "Text/number/date input. Use type for email, password, date, etc. Use { $bindState } on value.",
    },

    Textarea: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        placeholder: z.string().nullable(),
        rows: z.number().nullable(),
        value: z.string().nullable(),
      }),
      slots: [],
      description: "Multi-line text input. Use { $bindState } on value.",
    },

    // Choice inputs
    Radio: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        options: z.array(fieldOption),
        value: z.string().nullable(),
      }),
      slots: [],
      events: ["change"],
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
      slots: [],
      events: ["change"],
      description: "Dropdown single choice.",
    },

    Checkbox: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        checked: z.boolean().nullable(),
      }),
      slots: [],
      events: ["change"],
      description: "Checkbox. Use { $bindState } on checked.",
    },

    CheckboxList: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        options: z.array(fieldOption),
        value: z.array(z.string()).nullable(),
      }),
      slots: [],
      events: ["change"],
      description: "Multi-select from options.",
    },

    TagList: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        options: z.array(fieldOption),
        value: z.array(z.string()).nullable(),
      }),
      slots: [],
      events: ["change"],
      description: "Tag-style multi-select.",
    },

    TextAutoComplete: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        options: z.array(fieldOption),
        value: z.string().nullable(),
      }),
      slots: [],
      events: ["change"],
      description: "Autocomplete from options.",
    },

    // Special
    Matrix: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        items: z.array(matrixItem),
        options: z.array(matrixOption),
        value: z.record(z.string(), z.string()).nullable(),
      }),
      slots: [],
      events: ["change"],
      description:
        "Likert/matrix: items = rows (questions), options = columns (scale).",
    },

    Signature: {
      props: z.object({
        label: z.string().nullable(),
        name: z.string(),
        value: z.string().nullable(),
      }),
      slots: [],
      description: "Signature pad. Value is base64.",
    },

    // Informational
    Message: {
      props: z.object({
        heading: z.string(),
        message: z.string(),
        messageType: z
          .enum(["warning", "success", "error", "info", "danger"])
          .nullable(),
        footer: z.string().nullable(),
      }),
      slots: [],
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
      slots: [],
      description: "Read-only content block.",
    },
    ScoreSummary: {
      props: z.object({
        maxScore: z.number(),
        currentScore: DynamicNumberSchema.nullable(),
        ranges: z
          .array(
            z.object({
              min: z.number(),
              max: z.number(),
              label: z.string(),
              tag: z.string().nullable(),
            }),
          )
          .nullable(),
      }),
      slots: [],
      description:
        "Displays score for scored forms. Use currentScore from state. Ranges show severity bands (success/warning/danger).",
    },

    // Extensibility
    PluginField: {
      props: z.object({
        pluginId: z.string(),
        fieldName: z.string(),
        config: z.record(z.string(), z.unknown()).nullable(),
      }),
      slots: [],
      description:
        "Custom plugin field. pluginId identifies the plugin. fieldName is display name.",
    },

    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary", "danger"]).nullable(),
        disabled: z.boolean().nullable(),
      }),
      slots: [],
      events: ["press"],
      description: "Submit or action button.",
    },
  },
  actions: {
    setState: {
      params: z.object({
        statePath: z.string(),
        value: z.unknown(),
      }),
      description: "Update state at path.",
    },
    pushState: {
      params: z.object({
        statePath: z.string(),
        value: z.unknown(),
        clearStatePath: z.string().optional(),
      }),
      description: "Append to array in state.",
    },
    removeState: {
      params: z.object({
        statePath: z.string(),
        index: z.number(),
      }),
      description: "Remove from array in state.",
    },
    formSubmit: {
      params: z.object({
        message: z.string().optional(),
      }),
      description: "Form submit action.",
    },
  },
});
