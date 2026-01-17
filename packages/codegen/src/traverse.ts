import type { UITree, UIElement } from "@json-render/core";

/**
 * Visitor function for tree traversal
 */
export interface TreeVisitor {
  (element: UIElement, depth: number, parent: UIElement | null): void;
}

/**
 * Traverse a UI tree depth-first
 */
export function traverseTree(
  tree: UITree,
  visitor: TreeVisitor,
  startKey?: string,
): void {
  if (!tree || !tree.root) return;

  const rootKey = startKey ?? tree.root;
  const rootElement = tree.elements[rootKey];
  if (!rootElement) return;

  function visit(key: string, depth: number, parent: UIElement | null): void {
    const element = tree.elements[key];
    if (!element) return;

    visitor(element, depth, parent);

    if (element.children) {
      for (const childKey of element.children) {
        visit(childKey, depth + 1, element);
      }
    }
  }

  visit(rootKey, 0, null);
}

/**
 * Collect all unique component types used in a tree
 */
export function collectUsedComponents(tree: UITree): Set<string> {
  const components = new Set<string>();

  traverseTree(tree, (element) => {
    components.add(element.type);
  });

  return components;
}

/**
 * Collect all data paths referenced in a tree
 */
export function collectDataPaths(tree: UITree): Set<string> {
  const paths = new Set<string>();

  traverseTree(tree, (element) => {
    // Check props for data paths
    for (const [propName, propValue] of Object.entries(element.props)) {
      // Check for path props (e.g., valuePath, dataPath, bindPath)
      if (typeof propValue === "string") {
        if (
          propName.endsWith("Path") ||
          propName === "bindPath" ||
          propName === "dataPath"
        ) {
          paths.add(propValue);
        }
      }

      // Check for dynamic value objects with path
      if (
        propValue &&
        typeof propValue === "object" &&
        "path" in propValue &&
        typeof (propValue as { path: unknown }).path === "string"
      ) {
        paths.add((propValue as { path: string }).path);
      }
    }

    // Check visibility conditions for paths
    if (element.visible && typeof element.visible === "object") {
      collectPathsFromCondition(element.visible, paths);
    }
  });

  return paths;
}

function collectPathsFromCondition(
  condition: unknown,
  paths: Set<string>,
): void {
  if (!condition || typeof condition !== "object") return;

  const cond = condition as Record<string, unknown>;

  if ("path" in cond && typeof cond.path === "string") {
    paths.add(cond.path);
  }

  if ("and" in cond && Array.isArray(cond.and)) {
    for (const sub of cond.and) {
      collectPathsFromCondition(sub, paths);
    }
  }

  if ("or" in cond && Array.isArray(cond.or)) {
    for (const sub of cond.or) {
      collectPathsFromCondition(sub, paths);
    }
  }

  if ("not" in cond) {
    collectPathsFromCondition(cond.not, paths);
  }

  // Check comparison operators
  for (const op of ["eq", "neq", "gt", "gte", "lt", "lte"]) {
    if (op in cond && Array.isArray(cond[op])) {
      for (const operand of cond[op] as unknown[]) {
        if (
          operand &&
          typeof operand === "object" &&
          "path" in operand &&
          typeof (operand as { path: unknown }).path === "string"
        ) {
          paths.add((operand as { path: string }).path);
        }
      }
    }
  }
}

/**
 * Collect all action names used in a tree
 */
export function collectActions(tree: UITree): Set<string> {
  const actions = new Set<string>();

  traverseTree(tree, (element) => {
    for (const propValue of Object.values(element.props)) {
      // Check for action prop (string action name)
      if (typeof propValue === "string" && propValue.startsWith("action:")) {
        actions.add(propValue.slice(7));
      }

      // Check for action objects
      if (
        propValue &&
        typeof propValue === "object" &&
        "name" in propValue &&
        typeof (propValue as { name: unknown }).name === "string"
      ) {
        actions.add((propValue as { name: string }).name);
      }
    }

    // Also check direct action prop
    const actionProp = element.props.action;
    if (typeof actionProp === "string") {
      actions.add(actionProp);
    }
  });

  return actions;
}
