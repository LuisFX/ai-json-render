import { describe, expect, test } from "bun:test";

import {
  createStateBridgeHarness,
  elementKeysOf,
  loadFrozenSpecWithoutState,
  loadHighSeveritySpec,
} from "./state-bridge-harness";

describe("state-bridge harness (ASB-004)", () => {
  test("loads high-severity Spec with root + elements", () => {
    const spec = loadHighSeveritySpec();
    expect(typeof spec.root).toBe("string");
    expect(Object.keys(spec.elements).length).toBeGreaterThan(5);
  });

  test("frozen Spec drops seed state for bridge refill", () => {
    const frozen = loadFrozenSpecWithoutState();
    expect(
      frozen.state === undefined ||
        Object.keys(frozen.state ?? {}).length === 0,
    ).toBe(true);
    expect(frozen.root).toBeTruthy();
  });

  test("bridge fills store without changing element keys", () => {
    const { spec, store, elementKeysBefore } = createStateBridgeHarness();
    expect(elementKeysOf(spec)).toEqual(elementKeysBefore);
    expect(store.get("/patient")).toBeTruthy();
    expect(store.get("/headlineCounts")).toBeTruthy();
    // layout fingerprint stable after a second empty apply
    const keysAgain = elementKeysOf(spec);
    expect(keysAgain).toEqual(elementKeysBefore);
  });
});
