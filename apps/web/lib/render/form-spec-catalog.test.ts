import { describe, it, expect } from "vitest";
import { formSpecCatalog } from "./form-spec-catalog";
import { formSpecFullFixture } from "./form-spec-fixture";

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
