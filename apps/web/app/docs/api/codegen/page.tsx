import { Code } from "@/components/code";

export const metadata = {
  title: "@json-render/codegen API | json-render",
};

export default function CodegenApiPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">@json-render/codegen</h1>
      <p className="text-muted-foreground mb-8">
        Utilities for generating code from UI trees.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">Tree Traversal</h2>

      <h3 className="text-lg font-semibold mt-8 mb-4">traverseTree</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Walk the UI tree depth-first.
      </p>
      <Code lang="typescript">{`function traverseTree(
  tree: UITree,
  visitor: TreeVisitor,
  startKey?: string
): void

interface TreeVisitor {
  (element: UIElement, depth: number, parent: UIElement | null): void;
}`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">collectUsedComponents</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Get all unique component types used in a tree.
      </p>
      <Code lang="typescript">{`function collectUsedComponents(tree: UITree): Set<string>

// Example
const components = collectUsedComponents(tree);
// Set { 'Card', 'Metric', 'Chart' }`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">collectDataPaths</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Get all data paths referenced in props (valuePath, dataPath, bindPath,
        etc.).
      </p>
      <Code lang="typescript">{`function collectDataPaths(tree: UITree): Set<string>

// Example
const paths = collectDataPaths(tree);
// Set { 'analytics/revenue', 'analytics/customers' }`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">collectActions</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Get all action names used in the tree.
      </p>
      <Code lang="typescript">{`function collectActions(tree: UITree): Set<string>

// Example
const actions = collectActions(tree);
// Set { 'submit_form', 'refresh_data' }`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Serialization</h2>

      <h3 className="text-lg font-semibold mt-8 mb-4">serializePropValue</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Serialize a single value to a code string.
      </p>
      <Code lang="typescript">{`function serializePropValue(
  value: unknown,
  options?: SerializeOptions
): { value: string; needsBraces: boolean }

// Examples
serializePropValue("hello")
// { value: '"hello"', needsBraces: false }

serializePropValue(42)
// { value: '42', needsBraces: true }

serializePropValue({ path: 'user/name' })
// { value: '{ path: "user/name" }', needsBraces: true }`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">serializeProps</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Serialize a props object to a JSX attributes string.
      </p>
      <Code lang="typescript">{`function serializeProps(
  props: Record<string, unknown>,
  options?: SerializeOptions
): string

// Example
serializeProps({ title: 'Dashboard', columns: 3, disabled: true })
// 'title="Dashboard" columns={3} disabled'`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">escapeString</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Escape a string for use in code.
      </p>
      <Code lang="typescript">{`function escapeString(
  str: string,
  quotes?: 'single' | 'double'
): string`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Types</h2>

      <h3 className="text-lg font-semibold mt-8 mb-4">GeneratedFile</h3>
      <Code lang="typescript">{`interface GeneratedFile {
  /** File path relative to project root */
  path: string;
  /** File contents */
  content: string;
}`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">CodeGenerator</h3>
      <Code lang="typescript">{`interface CodeGenerator {
  /** Generate files from a UI tree */
  generate(tree: UITree): GeneratedFile[];
}`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">SerializeOptions</h3>
      <Code lang="typescript">{`interface SerializeOptions {
  /** Quote style for strings */
  quotes?: 'single' | 'double';
  /** Indent for objects/arrays */
  indent?: number;
}`}</Code>
    </article>
  );
}
