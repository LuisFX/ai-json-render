import { describe, expect, test } from "bun:test";
import { SPEC_DATA_PART_TYPE } from "@json-render/core";
import type { UIMessage } from "ai";

import {
  foldSpecTimeline,
  formatPatchSummary,
  summarizePatches,
} from "./spec-timeline";

const SPEC_PART = SPEC_DATA_PART_TYPE;

function patchPart(op: string, path: string, value?: unknown) {
  return {
    type: SPEC_PART,
    data: {
      type: "patch",
      patch: value === undefined ? { op, path } : { op, path, value },
    },
  };
}

function layoutParts(root: string, heading: string) {
  return [
    patchPart("add", "/root", root),
    patchPart("add", `/elements/${root}`, {
      type: "Card",
      props: {},
      children: ["h1"],
    }),
    patchPart("add", "/elements/h1", {
      type: "Heading",
      props: { text: heading },
      children: [],
    }),
  ];
}

function user(id: string, text: string): UIMessage {
  return {
    id,
    role: "user",
    parts: [{ type: "text", text }],
  } as UIMessage;
}

function assistant(id: string, parts: unknown[]): UIMessage {
  return {
    id,
    role: "assistant",
    parts,
  } as UIMessage;
}

describe("foldSpecTimeline", () => {
  test("returns empty when no spec parts", () => {
    const messages = [
      user("u1", "hi"),
      assistant("a1", [{ type: "text", text: "hello" }]),
    ];
    expect(foldSpecTimeline(messages)).toEqual([]);
  });

  test("full first turn folds a layout spec as v1", () => {
    const messages = [
      user("u1", "build a card"),
      assistant("a1", layoutParts("main", "Severity brief")),
    ];
    const turns = foldSpecTimeline(messages);
    expect(turns).toHaveLength(1);
    expect(turns[0]?.version).toBe(1);
    expect(turns[0]?.messageId).toBe("a1");
    expect(turns[0]?.prompt).toBe("build a card");
    expect(turns[0]?.spec.root).toBe("main");
    expect(Object.keys(turns[0]?.spec.elements ?? {})).toEqual(
      expect.arrayContaining(["main", "h1"]),
    );
    expect(turns[0]?.summary.added).toEqual(
      expect.arrayContaining(["main", "h1"]),
    );
  });

  test('delta second turn accumulates on top of v1 (must not yield root: "")', () => {
    const messages = [
      user("u1", "build a card"),
      assistant("a1", layoutParts("main", "Version one")),
      user("u2", "add a subtitle"),
      assistant("a2", [
        patchPart("add", "/elements/sub", {
          type: "Text",
          props: { text: "Hello" },
          children: [],
        }),
        patchPart("replace", "/elements/main", {
          type: "Card",
          props: {},
          children: ["h1", "sub"],
        }),
      ]),
    ];
    const turns = foldSpecTimeline(messages);
    expect(turns).toHaveLength(2);
    expect(turns[1]?.version).toBe(2);
    expect(turns[1]?.spec.root).toBe("main");
    expect(turns[1]?.spec.root).not.toBe("");
    expect(turns[1]?.spec.elements.h1).toBeDefined();
    expect(turns[1]?.spec.elements.sub).toBeDefined();
    expect(turns[1]?.summary.added).toEqual(["sub"]);
    expect(turns[1]?.summary.replaced).toEqual(["main"]);
    expect(turns[0]?.spec.elements.sub).toBeUndefined();
  });

  test("includes /state-only turns as a new version", () => {
    const messages = [
      user("u1", "build"),
      assistant("a1", layoutParts("main", "Dash")),
      user("u2", "fill prices"),
      assistant("a2", [
        patchPart("add", "/state/prices", [{ id: "btc", value: 1 }]),
      ]),
    ];
    const turns = foldSpecTimeline(messages);
    expect(turns).toHaveLength(2);
    expect(turns[1]?.spec.root).toBe("main");
    expect(turns[1]?.spec.state).toEqual({ prices: [{ id: "btc", value: 1 }] });
    expect(turns[1]?.summary.stateTouched).toEqual(["/state/prices"]);
    expect(turns[1]?.summary.added).toEqual([]);
  });

  test("malformed patch is ignored and does not drop prior spec", () => {
    const messages = [
      assistant("a1", layoutParts("main", "Ok")),
      assistant("a2", [
        {
          type: SPEC_PART,
          data: { type: "patch", patch: { op: "nope", path: "/elements/x" } },
        },
        {
          type: SPEC_PART,
          data: { type: "not-a-patch" },
        },
        patchPart("add", "/elements/extra", {
          type: "Text",
          props: { text: "kept" },
          children: [],
        }),
      ]),
    ];
    const turns = foldSpecTimeline(messages);
    expect(turns).toHaveLength(2);
    expect(turns[1]?.spec.root).toBe("main");
    expect(turns[1]?.spec.elements.extra).toBeDefined();
  });

  test("remove op drops the element from the cumulative spec", () => {
    const messages = [
      assistant("a1", layoutParts("main", "Keep")),
      assistant("a2", [patchPart("remove", "/elements/h1")]),
    ];
    const turns = foldSpecTimeline(messages);
    expect(turns[1]?.spec.elements.h1).toBeUndefined();
    expect(turns[1]?.spec.elements.main).toBeDefined();
    expect(turns[1]?.summary.removed).toEqual(["h1"]);
  });

  test("coerces root when /root does not match any element", () => {
    const messages = [
      assistant("a1", [
        patchPart("add", "/root", "dashboard"),
        patchPart("add", "/elements/main", {
          type: "Card",
          props: {},
          children: ["h1"],
        }),
        patchPart("add", "/elements/h1", {
          type: "Heading",
          props: { text: "Hi" },
          children: [],
        }),
      ]),
    ];
    const turns = foldSpecTimeline(messages);
    expect(turns[0]?.spec.root).toBe("main");
    expect(turns[0]?.spec.elements.main).toBeDefined();
  });
});

describe("summarizePatches / formatPatchSummary", () => {
  test("formats added, replaced, and state paths", () => {
    const summary = summarizePatches([
      { op: "add", path: "/elements/a", value: {} },
      { op: "add", path: "/elements/b", value: {} },
      { op: "replace", path: "/elements/c/props/title", value: "x" },
      { op: "add", path: "/state/rows", value: [] },
    ]);
    expect(summary.added).toEqual(["a", "b"]);
    expect(summary.replaced).toEqual(["c"]);
    expect(summary.stateTouched).toEqual(["/state/rows"]);
    expect(formatPatchSummary(summary)).toBe(
      "2 elements added, 1 replaced, 1 state path",
    );
  });
});
