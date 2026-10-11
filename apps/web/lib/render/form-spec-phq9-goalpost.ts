import type { Spec } from "@json-render/core";

/**
 * PHQ-9 Goalpost Fixture
 *
 * Target structure matching BH-029 (Patient Health Questionnaire PHQ-9) and
 * PHQ-9_Depression_Assessment_and_Treatment_Pathway. Used as reference for:
 * - Form structure (refusal, Matrix, functional impairment, ScoreSummary)
 * - Clinical pathway (refusal flow, suicidal ideation safety, score-based transitions)
 * - Actions (Alert, Education, Task, Medication, Referral, Terminal)
 */
export const formSpecPhq9Goalpost: Spec = {
  root: "phq9-form",
  steps: [
    { key: "step-screening", order: 1, label: "Patient Screening" },
    { key: "step-symptoms", order: 2, label: "Depression Symptom Assessment" },
    {
      key: "step-impairment",
      order: 3,
      label: "Functional Impairment Assessment",
    },
    { key: "step-scoring", order: 4, label: "Scoring" },
  ],
  score: {
    maxScore: 27,
    ranges: [
      { min: 0, max: 4, label: "Minimal depression", tag: "success" },
      { min: 5, max: 9, label: "Mild depression", tag: "info" },
      { min: 10, max: 14, label: "Moderate depression", tag: "warning" },
      {
        min: 15,
        max: 19,
        label: "Moderately severe depression",
        tag: "warning",
      },
      { min: 20, max: 27, label: "Severe depression", tag: "danger" },
    ],
  },
  clinicalPathway: {
    pathwayId: "phq9_clinical_pathway",
    pathwayName: "PHQ-9 Depression Assessment and Treatment Pathway",
    version: "1.0.0",
    protocolSource:
      "Patient Health Questionnaire-9 (PHQ-9) clinical guidelines",
    executionMode: { single: { selectionStrategy: "highestPriority" } },
    initialState: "state-refusal-check",
    states: [
      {
        key: "state-refusal-check",
        label: "Check Patient Refusal Status",
        order: 1,
        type: "evaluation",
        evaluation: {
          name: "Patient Refusal Assessment",
          parameters: [],
          criticalFindings: [],
        },
      },
      {
        key: "state-phq9-collect",
        label: "Collect PHQ-9 Symptom Responses",
        order: 2,
        type: "evaluation",
        evaluation: {
          name: "PHQ-9 Symptom Assessment",
          parameters: [],
          criticalFindings: ["suicidal_ideation_endorsed"],
        },
      },
      {
        key: "state-impairment",
        label: "Assess Functional Impairment",
        order: 3,
        type: "evaluation",
        evaluation: {
          name: "Functional Impairment Evaluation",
          parameters: [],
          criticalFindings: [],
        },
      },
      {
        key: "state-calc-score",
        label: "Calculate PHQ-9 Total Score",
        order: 4,
        type: "evaluation",
        evaluation: {
          name: "PHQ-9 Score Calculation",
          parameters: [],
          criticalFindings: [],
        },
      },
      {
        key: "state-suicidal-check",
        label: "Safety Check - Suicidal Ideation Assessment",
        order: 5,
        type: "evaluation",
        evaluation: {
          name: "Suicidal Ideation Screening",
          parameters: [],
          criticalFindings: ["active_suicidal_ideation"],
        },
      },
      {
        key: "state-suicidal-alert",
        label: "SAFETY ALERT - Suicidal Ideation Endorsed",
        order: 6,
        type: "action",
        action: {
          alert: {
            category: "Clinical",
            message:
              "IMMEDIATE ACTION REQUIRED: Patient endorsed suicidal ideation. Do NOT leave patient alone. Immediately notify the treating physician or mental health crisis team. Conduct comprehensive suicide risk assessment.",
            severity: "Critical",
          },
        },
      },
      {
        key: "state-classify",
        label: "Classify Depression Severity Level",
        order: 7,
        type: "evaluation",
        evaluation: {
          name: "Depression Severity Classification",
          parameters: [],
          criticalFindings: [],
        },
      },
      {
        key: "state-minimal",
        label: "Minimal Depression - No Treatment Indicated",
        order: 8,
        type: "action",
        action: {
          education: {
            topics: [
              "PHQ-9 Score 0-4 indicates minimal depression. Patient may not need depression treatment. Provide psychoeducation, encourage healthy lifestyle, schedule follow-up in 3-6 months.",
            ],
          },
        },
      },
      {
        key: "state-mild",
        label: "Mild Depression - Physician Clinical Judgment Required",
        order: 9,
        type: "action",
        action: {
          task: {
            category: "General",
            description:
              "PHQ-9 Score 5-9 indicates mild depression. Assess duration, functional impairment, screen for bipolar/substance use. Consider watchful waiting or psychotherapy. Schedule follow-up in 2-4 weeks.",
            priority: "Medium",
          },
        },
      },
      {
        key: "state-moderate",
        label: "Moderate Depression - Treatment Indicated",
        order: 10,
        type: "action",
        action: {
          medication: {
            name: "SSRI antidepressant (sertraline, escitalopram, or paroxetine)",
            dose: "As directed",
            route: "PO",
          },
        },
      },
      {
        key: "state-moderately-severe",
        label: "Moderately Severe Depression - Urgent Treatment Required",
        order: 11,
        type: "action",
        action: {
          referral: {
            target: "Psychiatry / Mental Health Specialist",
            urgency: "urgent",
            reason:
              "PHQ-9 Score 15-19 indicates moderately severe depression. Urgent psychiatric consultation, start SSRI, refer for intensive psychotherapy.",
          },
        },
      },
      {
        key: "state-severe",
        label: "Severe Depression - Immediate Treatment Required",
        order: 12,
        type: "action",
        action: {
          referral: {
            target: "Mental Health Crisis Team / Psychiatry",
            urgency: "emergency",
            reason:
              "PHQ-9 Score 20-27 indicates severe depression. IMMEDIATELY notify physician. Suicide risk assessment. Consider hospitalization. Follow-up within 24-48 hours.",
          },
        },
      },
      {
        key: "state-declined",
        label: "Patient Declined Assessment",
        order: 13,
        type: "terminal",
        terminal: {
          outcome:
            "Patient declined PHQ-9 assessment. Document refusal. Offer reassessment at next visit.",
        },
      },
      {
        key: "state-complete",
        label: "PHQ-9 Assessment Complete",
        order: 14,
        type: "terminal",
        terminal: {
          outcome:
            "PHQ-9 assessment completed. Depression severity classified. Treatment plan implemented. Follow-up scheduled.",
        },
      },
      {
        key: "state-escalated",
        label: "Case Escalated to Psychiatric Care",
        order: 15,
        type: "terminal",
        terminal: {
          outcome:
            "Referred to psychiatry for comprehensive evaluation and treatment planning.",
        },
      },
    ],
    transitions: [
      {
        from: "state-refusal-check",
        to: "state-phq9-collect",
        condition: { field: "refusal-radio", evaluator: "Equals", value: "no" },
        priority: 1,
      },
      {
        from: "state-refusal-check",
        to: "state-declined",
        condition: {
          field: "refusal-radio",
          evaluator: "Equals",
          value: "yes",
        },
        priority: 2,
      },
      {
        from: "state-phq9-collect",
        to: "state-impairment",
        condition: { always: true },
        priority: 1,
      },
      {
        from: "state-impairment",
        to: "state-calc-score",
        condition: { always: true },
        priority: 1,
      },
      {
        from: "state-calc-score",
        to: "state-suicidal-check",
        condition: { always: true },
        priority: 1,
      },
      {
        from: "state-suicidal-check",
        to: "state-suicidal-alert",
        condition: {
          matrixItem: {
            field: "phq9-matrix",
            itemKey: "suicidal",
            evaluator: "NotEquals",
            value: "0",
          },
        },
        priority: 1,
      },
      {
        from: "state-suicidal-check",
        to: "state-classify",
        condition: {
          matrixItem: {
            field: "phq9-matrix",
            itemKey: "suicidal",
            evaluator: "Equals",
            value: "0",
          },
        },
        priority: 2,
      },
      {
        from: "state-suicidal-alert",
        to: "state-escalated",
        condition: { always: true },
        priority: 1,
      },
      {
        from: "state-classify",
        to: "state-minimal",
        condition: { fieldScoreInRange: ["phq9-matrix", 0, 4] },
        priority: 1,
      },
      {
        from: "state-classify",
        to: "state-mild",
        condition: { fieldScoreInRange: ["phq9-matrix", 5, 9] },
        priority: 2,
      },
      {
        from: "state-classify",
        to: "state-moderate",
        condition: { fieldScoreInRange: ["phq9-matrix", 10, 14] },
        priority: 3,
      },
      {
        from: "state-classify",
        to: "state-moderately-severe",
        condition: { fieldScoreInRange: ["phq9-matrix", 15, 19] },
        priority: 4,
      },
      {
        from: "state-classify",
        to: "state-severe",
        condition: { fieldScoreInRange: ["phq9-matrix", 20, 27] },
        priority: 5,
      },
      {
        from: "state-minimal",
        to: "state-complete",
        condition: { always: true },
        priority: 1,
      },
      {
        from: "state-mild",
        to: "state-complete",
        condition: { always: true },
        priority: 1,
      },
      {
        from: "state-moderate",
        to: "state-complete",
        condition: { always: true },
        priority: 1,
      },
      {
        from: "state-moderately-severe",
        to: "state-escalated",
        condition: { always: true },
        priority: 1,
      },
      {
        from: "state-severe",
        to: "state-escalated",
        condition: { always: true },
        priority: 1,
      },
    ],
  },
  state: {
    refusal: "",
    phq9: {
      responses: {} as Record<string, string>,
      totalScore: 0,
    },
    impairment: "",
  },
  elements: {
    "phq9-form": {
      type: "Form",
      props: { submitAction: "formSubmit", submitActionParams: null },
      children: ["stack-main"],
      visible: true,
    },
    "stack-main": {
      type: "Stack",
      props: { direction: "vertical", gap: "md" },
      children: [
        "step-screening",
        "step-symptoms",
        "step-impairment",
        "step-scoring",
        "phq9-score-summary",
        "phq9-submit",
      ],
      visible: true,
    },
    "step-screening": {
      type: "Step",
      props: { label: "Patient Screening", order: 1, description: null },
      children: ["refusal-radio", "phq9-instructions"],
      visible: true,
    },
    "refusal-radio": {
      type: "Radio",
      props: {
        label: "Patient refused administration of test:",
        name: "refusal",
        options: [
          { value: "yes", description: "Yes", optionKey: null, score: null },
          {
            value: "no",
            description: "No (Proceed with questionnaire)",
            optionKey: null,
            score: null,
          },
        ],
        value: { $bindState: "/refusal" },
      },
      children: [],
      visible: true,
    },
    "phq9-instructions": {
      type: "Message",
      props: {
        heading: "PHQ-9 Instructions",
        message:
          "Over the last 2 weeks, how often have you been bothered by any of the following problems? Please answer each question based on how often you experienced each symptom.",
        messageType: "info",
        footer: null,
      },
      children: [],
      visible: true,
    },
    "step-symptoms": {
      type: "Step",
      props: {
        label: "Depression Symptom Assessment",
        order: 2,
        description: null,
      },
      children: ["phq9-matrix"],
      visible: { $state: "/refusal", eq: "no" },
    },
    "phq9-matrix": {
      type: "Matrix",
      props: {
        label: "PHQ-9 Symptom Assessment",
        name: "phq9-responses",
        items: [
          {
            value: "little-interest",
            description: "Little interest or pleasure in doing things",
          },
          {
            value: "feeling-down",
            description: "Feeling down, depressed, or hopeless",
          },
          {
            value: "sleep",
            description:
              "Trouble falling or staying asleep, or sleeping too much",
          },
          {
            value: "tired",
            description: "Feeling tired or having little energy",
          },
          { value: "appetite", description: "Poor appetite or overeating" },
          {
            value: "self-worth",
            description:
              "Feeling bad about yourself, or that you are a failure or have let your family down",
          },
          {
            value: "concentration",
            description:
              "Trouble concentrating on things, such as reading the newspaper or watching television",
          },
          {
            value: "slow-or-fast",
            description:
              "Moving or speaking so slowly that other people could have noticed, or the opposite—being so fidgety or restless",
          },
          {
            value: "suicidal",
            description:
              "Thoughts that you would be better off dead, or of hurting yourself",
          },
        ],
        options: [
          { value: "0", description: "Not at all", score: 0 },
          { value: "1", description: "Several days", score: 1 },
          { value: "2", description: "More than half the days", score: 2 },
          { value: "3", description: "Nearly every day", score: 3 },
        ],
        value: { $bindState: "/phq9/responses" },
      },
      children: [],
      visible: true,
    },
    "step-impairment": {
      type: "Step",
      props: {
        label: "Functional Impairment Assessment",
        order: 3,
        description: null,
      },
      children: ["impairment-radio"],
      visible: { $state: "/refusal", eq: "no" },
    },
    "impairment-radio": {
      type: "Radio",
      props: {
        label:
          "If you checked off any problem, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?",
        name: "impairment",
        options: [
          { value: "0", description: "Not difficult at all", score: 0 },
          { value: "1", description: "Somewhat difficult", score: 1 },
          { value: "2", description: "Very difficult", score: 2 },
          { value: "3", description: "Extremely difficult", score: 3 },
        ],
        value: { $bindState: "/impairment" },
      },
      children: [],
      visible: true,
    },
    "step-scoring": {
      type: "Step",
      props: { label: "Scoring", order: 4, description: null },
      children: ["scoring-instructions"],
      visible: { $state: "/refusal", eq: "no" },
    },
    "scoring-instructions": {
      type: "ReadOnly",
      props: {
        heading: "PHQ-9 Score Interpretation",
        content:
          "Minimal (0-4): May not need treatment. Mild (5-9): Physician clinical judgment. Moderate (10-14): Further assessment indicated. Moderately severe (15-19): Treatment strongly recommended. Severe (20-27): Warrants treatment with antidepressants, psychotherapy, or combination.",
        collapsible: false,
        initiallyExpanded: true,
        formatting: "plain",
      },
      children: [],
      visible: true,
    },
    "phq9-score-summary": {
      type: "ScoreSummary",
      props: {
        maxScore: 27,
        currentScore: { $state: "/phq9/totalScore" },
        ranges: [
          { min: 0, max: 4, label: "Minimal", tag: "success" },
          { min: 5, max: 9, label: "Mild", tag: "info" },
          { min: 10, max: 14, label: "Moderate", tag: "warning" },
          { min: 15, max: 19, label: "Moderately severe", tag: "warning" },
          { min: 20, max: 27, label: "Severe", tag: "danger" },
        ],
      },
      children: [],
      visible: { $state: "/refusal", eq: "no" },
    },
    "phq9-submit": {
      type: "Button",
      props: { label: "Submit Assessment", variant: "primary", disabled: null },
      children: [],
      on: { press: { action: "formSubmit", params: {} } },
      visible: true,
    },
  },
};
