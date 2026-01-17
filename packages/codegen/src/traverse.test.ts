import { describe, it, expect } from "vitest";
import {
  traverseTree,
  collectUsedComponents,
  collectDataPaths,
  collectActions,
} from "./traverse";
import type { UITree } from "@json-render/core";

describe("traverseTree", () => {
  it("visits all elements depth-first", () => {
    const tree: UITree = {
      root: "root",
      elements: {
        root: {
          key: "root",
          type: "Card",
          props: {},
          children: ["child1", "child2"],
        },
        child1: {
          key: "child1",
          type: "Text",
          props: {},
        },
        child2: {
          key: "child2",
          type: "Button",
          props: {},
        },
      },
    };

    const visited: string[] = [];
    traverseTree(tree, (element) => {
      visited.push(element.key);
    });

    expect(visited).toEqual(["root", "child1", "child2"]);
  });

  it("handles empty tree", () => {
    const visited: string[] = [];
    traverseTree(null as unknown as UITree, (element) => {
      visited.push(element.key);
    });
    expect(visited).toEqual([]);
  });
});

describe("collectUsedComponents", () => {
  it("collects unique component types", () => {
    const tree: UITree = {
      root: "root",
      elements: {
        root: {
          key: "root",
          type: "Card",
          props: {},
          children: ["child1", "child2"],
        },
        child1: {
          key: "child1",
          type: "Text",
          props: {},
        },
        child2: {
          key: "child2",
          type: "Text",
          props: {},
        },
      },
    };

    const components = collectUsedComponents(tree);
    expect(components).toEqual(new Set(["Card", "Text"]));
  });
});

describe("collectDataPaths", () => {
  it("collects paths from valuePath props", () => {
    const tree: UITree = {
      root: "root",
      elements: {
        root: {
          key: "root",
          type: "Metric",
          props: { valuePath: "analytics/revenue" },
        },
      },
    };

    const paths = collectDataPaths(tree);
    expect(paths).toEqual(new Set(["analytics/revenue"]));
  });

  it("collects paths from dynamic value objects", () => {
    const tree: UITree = {
      root: "root",
      elements: {
        root: {
          key: "root",
          type: "Text",
          props: { content: { path: "user/name" } },
        },
      },
    };

    const paths = collectDataPaths(tree);
    expect(paths).toEqual(new Set(["user/name"]));
  });
});

describe("collectActions", () => {
  it("collects action names from props", () => {
    const tree: UITree = {
      root: "root",
      elements: {
        root: {
          key: "root",
          type: "Button",
          props: { action: "submit_form" },
        },
      },
    };

    const actions = collectActions(tree);
    expect(actions).toEqual(new Set(["submit_form"]));
  });
});
