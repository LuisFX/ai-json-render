import { describe, it, expect } from "vitest";
import { formSpecCatalog } from "./form-spec-catalog";
import { formSpecFullFixture } from "./form-spec-fixture";
import { formSpecPhq9Goalpost } from "./form-spec-phq9-goalpost";

/**
 * Validates that the formSpecCatalog accepts a complete form spec with all
 * supported FormSpec components. This fixture represents the expected output
 * when an LLM is prompted to generate "a clinical assessment form with all
 * supported field types" in Form mode.
 */
describe("formSpecCatalog", () => {
  it("validates a form spec with all supported FormSpec components", () => {
    const result = formSpecCatalog.validate(formSpecFullFixture);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.root).toBe("form-root");
    expect(result.data?.steps).toHaveLength(3);
    expect(result.data?.steps?.[0]).toEqual({
      key: "step-1",
      order: 1,
      label: "Demographics",
    });
    expect(result.data?.score).toBeDefined();
    expect(result.data?.score?.maxScore).toBe(30);
    expect(result.data?.score?.ranges).toHaveLength(3);

    const pathway = result.data?.clinicalPathway as
      | { pathwayId: string; states: unknown[]; transitions: unknown[] }
      | undefined;
    expect(pathway).toBeDefined();
    expect(pathway?.pathwayId).toBe("assessment-pathway");
    expect(pathway?.states).toHaveLength(3);
    expect(pathway?.transitions).toHaveLength(2);

    const elements = result.data?.elements ?? {};
    const types = Object.values(elements).map((el) => el.type);

    expect(types).toContain("Form");
    expect(types).toContain("Stack");
    expect(types).toContain("Step");
    expect(types).toContain("Input");
    expect(types).toContain("Textarea");
    expect(types).toContain("Radio");
    expect(types).toContain("Select");
    expect(types).toContain("Checkbox");
    expect(types).toContain("CheckboxList");
    expect(types).toContain("TagList");
    expect(types).toContain("TextAutoComplete");
    expect(types).toContain("Matrix");
    expect(types).toContain("Signature");
    expect(types).toContain("Message");
    expect(types).toContain("ReadOnly");
    expect(types).toContain("PluginField");
    expect(types).toContain("Button");
  });

  it("validates PHQ-9 style spec with Matrix key/label and numeric options", () => {
    const phq9Spec = {
      root: "phq9-form",
      elements: {
        "phq9-form": {
          type: "Form",
          props: { submitAction: "formSubmit", submitActionParams: {} },
          children: ["phq9-matrix", "phq9-submit"],
          visible: true,
        },
        "phq9-matrix": {
          type: "Matrix",
          props: {
            label: "Depression Symptoms",
            name: "phq9",
            items: [
              { key: "interest", label: "Little interest or pleasure" },
              { key: "depressed", label: "Feeling down" },
            ],
            options: [
              { value: 0, description: "Not at all" },
              { value: 1, description: "Several days", score: 1 },
              { value: 2, description: "More than half", score: 2 },
              { value: 3, description: "Nearly every day", score: 3 },
            ],
            value: { $bindState: "/phq9/responses" },
          },
          children: [],
          visible: true,
        },
        "phq9-submit": {
          type: "Button",
          props: { label: "Submit", variant: "primary" },
          children: [],
          visible: true,
        },
      },
      state: { phq9: { responses: {}, totalScore: 0 } },
    };

    const result = formSpecCatalog.validate(phq9Spec);
    expect(result.success).toBe(true);
    expect(result.data?.elements?.["phq9-matrix"]).toBeDefined();
  });

  it("validates PHQ-9 goalpost fixture with clinical pathway", () => {
    const result = formSpecCatalog.validate(formSpecPhq9Goalpost);

    expect(result.success).toBe(true);
    expect(result.data?.root).toBe("phq9-form");
    expect(result.data?.elements?.["phq9-matrix"]).toBeDefined();
    expect(result.data?.elements?.["refusal-radio"]).toBeDefined();
    expect(result.data?.score?.maxScore).toBe(27);

    const pathway = result.data?.clinicalPathway as
      | { pathwayId: string; states: unknown[]; transitions: unknown[] }
      | undefined;
    expect(pathway).toBeDefined();
    expect(pathway?.pathwayId).toBe("phq9_clinical_pathway");
    expect(pathway?.states.length).toBeGreaterThan(5);
    expect(pathway?.transitions.length).toBeGreaterThan(5);
  });

  it("rejects a spec with invalid component type", () => {
    const invalidSpec = {
      ...formSpecFullFixture,
      elements: {
        ...formSpecFullFixture.elements,
        "bad-el": {
          type: "NonExistentComponent",
          props: {},
          children: [],
          visible: true,
        },
      },
    };

    const result = formSpecCatalog.validate(invalidSpec);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
