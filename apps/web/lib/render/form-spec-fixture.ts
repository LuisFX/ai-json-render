import type { Spec } from "@json-render/core";

/**
 * Fixture: a single form with all FormSpec-supported features.
 * Used to verify the formSpecCatalog validates a complete form spec.
 * This represents the expected output when an LLM is prompted to generate
 * "a clinical assessment form with all supported field types".
 */
export const formSpecFullFixture: Spec = {
  root: "form-root",
  steps: [
    { key: "step-1", order: 1, label: "Demographics" },
    { key: "step-2", order: 2, label: "Assessment" },
    { key: "step-3", order: 3, label: "Signature" },
  ],
  score: {
    maxScore: 30,
    ranges: [
      { min: 0, max: 9, label: "Low risk", tag: "success" },
      { min: 10, max: 19, label: "Moderate", tag: "warning" },
      { min: 20, max: 30, label: "High risk", tag: "danger" },
    ],
  },
  clinicalPathway: {
    pathwayId: "assessment-pathway",
    pathwayName: "Assessment Follow-up",
    version: "1.0",
    protocolSource: "Clinical guidelines",
    executionMode: { single: { selectionStrategy: "highestPriority" } },
    initialState: "state-start",
    states: [
      {
        key: "state-start",
        label: "Evaluate",
        order: 0,
        type: "evaluation",
        evaluation: {
          name: "Total score",
          parameters: [["matrix-scale", "GreaterOrEqual", "10"]],
          criticalFindings: ["High score may indicate need for referral"],
        },
      },
      {
        key: "state-refer",
        label: "Refer to specialist",
        order: 1,
        type: "action",
        action: {
          referral: {
            target: "Mental Health Specialist",
            urgency: "routine",
            reason: "Assessment score indicates moderate to high risk",
          },
        },
      },
      {
        key: "state-complete",
        label: "Complete",
        order: 2,
        type: "terminal",
        terminal: { outcome: "Low risk - no action needed" },
      },
    ],
    transitions: [
      {
        from: "state-start",
        to: "state-refer",
        condition: { scoreInRange: [10, 27] },
        priority: 1,
      },
      {
        from: "state-start",
        to: "state-complete",
        condition: { scoreInRange: [0, 9] },
        priority: 2,
      },
    ],
  },
  state: {
    name: "",
    email: "",
    notes: "",
    gender: "",
    role: "",
    consent: false,
    symptoms: [] as string[],
    tags: [] as string[],
    diagnosis: "",
    matrixValues: {} as Record<string, string>,
  },
  elements: {
    "form-root": {
      type: "Form",
      props: { submitAction: "formSubmit", submitActionParams: null },
      children: ["stack-main"],
      visible: true,
    },
    "stack-main": {
      type: "Stack",
      props: { direction: "vertical", gap: "md" },
      children: ["step-1", "step-2", "step-3", "btn-submit"],
      visible: true,
    },
    "step-1": {
      type: "Step",
      props: { label: "Demographics", order: 1, description: null },
      children: ["stack-step1"],
      visible: true,
    },
    "stack-step1": {
      type: "Stack",
      props: { direction: "vertical", gap: "md" },
      children: ["input-name", "input-email", "textarea-notes"],
      visible: true,
    },
    "input-name": {
      type: "Input",
      props: {
        label: "Full Name",
        name: "name",
        type: "text",
        value: null,
        placeholder: "Enter name",
        checks: null,
      },
      children: [],
      visible: true,
    },
    "input-email": {
      type: "Input",
      props: {
        label: "Email",
        name: "email",
        type: "email",
        value: null,
        placeholder: "email@example.com",
        checks: null,
      },
      children: [],
      visible: true,
    },
    "textarea-notes": {
      type: "Textarea",
      props: {
        label: "Notes",
        name: "notes",
        placeholder: "Additional notes",
        rows: 3,
        value: null,
      },
      children: [],
      visible: true,
    },
    "step-2": {
      type: "Step",
      props: { label: "Assessment", order: 2, description: null },
      children: ["stack-step2"],
      visible: true,
    },
    "stack-step2": {
      type: "Stack",
      props: { direction: "vertical", gap: "md" },
      children: [
        "radio-gender",
        "select-role",
        "checkbox-consent",
        "checkboxlist-symptoms",
        "taglist-tags",
        "autocomplete-diagnosis",
        "matrix-scale",
        "message-info",
        "readonly-instructions",
        "plugin-custom",
      ],
      visible: true,
    },
    "radio-gender": {
      type: "Radio",
      props: {
        label: "Gender",
        name: "gender",
        options: [
          { value: "male", description: "Male", optionKey: null, score: null },
          {
            value: "female",
            description: "Female",
            optionKey: null,
            score: null,
          },
          {
            value: "other",
            description: "Other",
            optionKey: null,
            score: null,
          },
        ],
        value: null,
      },
      children: [],
      visible: true,
    },
    "select-role": {
      type: "Select",
      props: {
        label: "Role",
        name: "role",
        options: [
          {
            value: "patient",
            description: "Patient",
            optionKey: null,
            score: null,
          },
          {
            value: "caregiver",
            description: "Caregiver",
            optionKey: null,
            score: null,
          },
          {
            value: "clinician",
            description: "Clinician",
            optionKey: null,
            score: null,
          },
        ],
        placeholder: "Select role",
        value: null,
      },
      children: [],
      visible: true,
    },
    "checkbox-consent": {
      type: "Checkbox",
      props: {
        label: "I consent to data collection",
        name: "consent",
        checked: null,
      },
      children: [],
      visible: true,
    },
    "checkboxlist-symptoms": {
      type: "CheckboxList",
      props: {
        label: "Symptoms",
        name: "symptoms",
        options: [
          {
            value: "headache",
            description: "Headache",
            optionKey: null,
            score: null,
          },
          {
            value: "fatigue",
            description: "Fatigue",
            optionKey: null,
            score: null,
          },
          {
            value: "nausea",
            description: "Nausea",
            optionKey: null,
            score: null,
          },
        ],
        value: null,
      },
      children: [],
      visible: true,
    },
    "taglist-tags": {
      type: "TagList",
      props: {
        label: "Tags",
        name: "tags",
        options: [
          {
            value: "urgent",
            description: "Urgent",
            optionKey: null,
            score: null,
          },
          {
            value: "follow-up",
            description: "Follow-up",
            optionKey: null,
            score: null,
          },
        ],
        value: null,
      },
      children: [],
      visible: true,
    },
    "autocomplete-diagnosis": {
      type: "TextAutoComplete",
      props: {
        label: "Diagnosis",
        name: "diagnosis",
        options: [
          {
            value: "icd-001",
            description: "Common cold",
            optionKey: null,
            score: null,
          },
          {
            value: "icd-002",
            description: "Influenza",
            optionKey: null,
            score: null,
          },
        ],
        value: null,
      },
      children: [],
      visible: true,
    },
    "matrix-scale": {
      type: "Matrix",
      props: {
        label: "Severity scale",
        name: "matrixValues",
        items: [
          {
            value: "pain",
            description: "Pain level",
            optionKey: null,
            score: null,
          },
          {
            value: "mobility",
            description: "Mobility",
            optionKey: null,
            score: null,
          },
        ],
        options: [
          { value: "1", description: "1 - Low", optionKey: null, score: null },
          { value: "2", description: "2", optionKey: null, score: null },
          { value: "3", description: "3 - High", optionKey: null, score: null },
        ],
        value: null,
      },
      children: [],
      visible: true,
    },
    "message-info": {
      type: "Message",
      props: {
        heading: "Important",
        message: "Please complete all required fields.",
        messageType: "info",
        footer: null,
      },
      children: [],
      visible: true,
    },
    "readonly-instructions": {
      type: "ReadOnly",
      props: {
        heading: "Instructions",
        content: "Read these instructions carefully before filling the form.",
        collapsible: true,
        initiallyExpanded: true,
        formatting: "plain",
      },
      children: [],
      visible: true,
    },
    "plugin-custom": {
      type: "PluginField",
      props: {
        pluginId: "custom-widget",
        fieldName: "Custom Field",
        config: null,
      },
      children: [],
      visible: true,
    },
    "step-3": {
      type: "Step",
      props: { label: "Signature", order: 3, description: null },
      children: ["signature-pad"],
      visible: true,
    },
    "signature-pad": {
      type: "Signature",
      props: { label: "Sign here", name: "signature", value: null },
      children: [],
      visible: true,
    },
    "btn-submit": {
      type: "Button",
      props: { label: "Submit", variant: "primary", disabled: null },
      children: [],
      visible: true,
    },
  },
};
