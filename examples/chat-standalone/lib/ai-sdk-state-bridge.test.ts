import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createStateStore } from "@json-render/core";

import {
  createAiSdkStateBridge,
  createAiSdkStateBridgeWithStore,
} from "./ai-sdk-state-bridge";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/state-bridge",
);

describe("createAiSdkStateBridge", () => {
  test("applies add/replace under /state with path rewrite", () => {
    const store = createStateStore({});
    const bridge = createAiSdkStateBridge({ store });

    expect(
      bridge.applyPatch({
        op: "add",
        path: "/state/alerts",
        value: [{ id: "a1" }],
      }).applied,
    ).toBe(true);
    expect(store.get("/alerts")).toEqual([{ id: "a1" }]);

    expect(
      bridge.applyPatch({
        op: "replace",
        path: "/state/alerts",
        value: [{ id: "a2" }],
      }).applied,
    ).toBe(true);
    expect(store.get("/alerts")).toEqual([{ id: "a2" }]);
  });

  test("ignores /elements and /root when stateOnly (default)", () => {
    const store = createStateStore({ keep: true });
    const bridge = createAiSdkStateBridge({ store });

    const elements = bridge.applyPatch({
      op: "add",
      path: "/elements/main",
      value: { type: "Card", props: {}, children: [] },
    });
    expect(elements).toEqual({ applied: false, reason: "non-state-path" });

    const root = bridge.applyPatch({
      op: "replace",
      path: "/root",
      value: "main",
    });
    expect(root.applied).toBe(false);
    expect(store.getSnapshot()).toEqual({ keep: true });
  });

  test("applies whole /state blob into store root", () => {
    const store = createStateStore({ stale: "gone" });
    const bridge = createAiSdkStateBridge({ store });

    bridge.applyPatch({
      op: "add",
      path: "/state",
      value: {
        patient: { name: "Alex" },
        headlineCounts: { alerts: 2 },
      },
    });

    expect(store.get("/patient")).toEqual({ name: "Alex" });
    expect(store.get("/headlineCounts")).toEqual({ alerts: 2 });
    // previous top-level key removed when /state replaces the document state
    expect(store.get("/stale")).toBeUndefined();
  });

  test("remove under /state clears the store path", () => {
    const store = createStateStore({ alerts: [{ id: "a1" }], other: 1 });
    const bridge = createAiSdkStateBridge({ store });

    expect(
      bridge.applyPatch({ op: "remove", path: "/state/alerts" }).applied,
    ).toBe(true);
    expect(store.get("/alerts")).toBeUndefined();
    expect(store.get("/other")).toBe(1);
  });

  test("applyParts drains data-spec patch parts", () => {
    const fixture = JSON.parse(
      readFileSync(join(fixturesDir, "high-severity-state-parts.json"), "utf8"),
    ) as {
      parts: Array<{ type: string; data?: unknown }>;
    };
    const { bridge, store } = createAiSdkStateBridgeWithStore();

    const result = bridge.applyParts([
      { type: "text", data: undefined },
      ...fixture.parts,
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: { op: "add", path: "/elements/x", value: {} },
        },
      },
    ]);

    expect(result.applied).toBe(1);
    expect(result.skipped).toBeGreaterThanOrEqual(2);
    expect(store.get("/patient")).toBeTruthy();
    expect(store.get("/headlineCounts")).toBeTruthy();
  });

  test("pushJsonl applies progressive /state array patches and skips layout", () => {
    const jsonl = readFileSync(
      join(fixturesDir, "progressive-state.jsonl"),
      "utf8",
    );
    const { bridge, store } = createAiSdkStateBridgeWithStore();

    const result = bridge.pushJsonl(jsonl);
    // state lines: items, items/0, items/1, headline replace, headline remove = 5 applied
    // root + elements = 2 skipped
    expect(result.applied).toBe(5);
    expect(result.skipped).toBe(2);
    expect(store.get("/items")).toEqual([
      { id: "item-0", label: "first" },
      { id: "item-1", label: "second" },
    ]);
    expect(store.get("/headline")).toBeUndefined();
  });

  test("pushJsonl buffers incomplete trailing lines", () => {
    const { bridge, store } = createAiSdkStateBridgeWithStore();
    const partial = '{"op":"add","path":"/state/count","val';
    expect(bridge.pushJsonl(partial)).toEqual({ applied: 0, skipped: 0 });
    expect(store.getSnapshot()).toEqual({});

    const rest = 'ue":1}\n';
    expect(bridge.pushJsonl(rest)).toEqual({ applied: 1, skipped: 0 });
    expect(store.get("/count")).toBe(1);
  });

  test("re-apply of same parts is allowed (fresh store in tests)", () => {
    const parts = [
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: { op: "add", path: "/state/n", value: 1 },
        },
      },
    ];
    const { bridge, store } = createAiSdkStateBridgeWithStore();
    expect(bridge.applyParts(parts).applied).toBe(1);
    expect(bridge.applyParts(parts).applied).toBe(1);
    expect(store.get("/n")).toBe(1);
  });
});
