import { describe, expect, test } from "bun:test";
import type { UIMessage } from "ai";

import { listSpecVersions } from "./export-trace";

const SPEC_PART = "data-spec" as const;

function layoutParts(root: string, heading: string) {
  return [
    {
      type: SPEC_PART,
      data: {
        type: "patch",
        patch: { op: "add", path: "/root", value: root },
      },
    },
    {
      type: SPEC_PART,
      data: {
        type: "patch",
        patch: {
          op: "add",
          path: `/elements/${root}`,
          value: {
            type: "Card",
            props: {},
            children: ["h1"],
          },
        },
      },
    },
    {
      type: SPEC_PART,
      data: {
        type: "patch",
        patch: {
          op: "add",
          path: "/elements/h1",
          value: {
            type: "Heading",
            props: { text: heading },
            children: [],
          },
        },
      },
    },
  ];
}

function stateOnlyParts() {
  return [
    {
      type: SPEC_PART,
      data: {
        type: "patch",
        patch: {
          op: "add",
          path: "/state/alerts",
          value: [{ id: "a1" }],
        },
      },
    },
  ];
}

describe("listSpecVersions", () => {
  test("returns empty when no layout Specs", () => {
    const messages = [
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "hi" }],
      },
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text: "hello" }],
      },
    ] as UIMessage[];
    expect(listSpecVersions(messages)).toEqual([]);
  });

  test("includes /state-only folds as a version", () => {
    const messages = [
      {
        id: "a1",
        role: "assistant",
        parts: layoutParts("main", "Dash"),
      },
      {
        id: "a2",
        role: "assistant",
        parts: stateOnlyParts(),
      },
    ] as UIMessage[];
    const versions = listSpecVersions(messages);
    expect(versions).toHaveLength(2);
    expect(versions[1]?.messageId).toBe("a2");
    expect(versions[1]?.spec.root).toBe("main");
    expect(versions[1]?.spec.state).toEqual({ alerts: [{ id: "a1" }] });
  });

  test("one layout Spec → v1", () => {
    const messages = [
      {
        id: "a1",
        role: "assistant",
        parts: layoutParts("main", "Severity brief"),
      },
    ] as UIMessage[];
    const versions = listSpecVersions(messages);
    expect(versions).toHaveLength(1);
    expect(versions[0]?.version).toBe(1);
    expect(versions[0]?.messageId).toBe("a1");
    expect(versions[0]?.preview).toBe("Severity brief");
    expect(versions[0]?.spec.root).toBe("main");
    expect(Object.keys(versions[0]?.spec.elements ?? {})).toContain("main");
  });

  test("two layout Specs → v1 then v2 in appearance order", () => {
    const messages = [
      {
        id: "a1",
        role: "assistant",
        parts: layoutParts("first", "Version one"),
      },
      {
        id: "u2",
        role: "user",
        parts: [{ type: "text", text: "again" }],
      },
      {
        id: "a2",
        role: "assistant",
        parts: layoutParts("second", "Version two"),
      },
    ] as UIMessage[];
    const versions = listSpecVersions(messages);
    expect(versions.map((v) => [v.version, v.messageId, v.preview])).toEqual([
      [1, "a1", "Version one"],
      [2, "a2", "Version two"],
    ]);
  });
});
