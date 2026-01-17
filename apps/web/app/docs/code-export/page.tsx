import { Code } from "@/components/code";

export const metadata = {
  title: "Code Export | json-render",
};

export default function CodeExportPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">Code Export</h1>
      <p className="text-muted-foreground mb-8">
        Export generated UI as standalone code for your framework.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">Overview</h2>
      <p className="text-sm text-muted-foreground mb-4">
        While json-render is designed for dynamic rendering, you can export
        generated UI as static code. The code generation is intentionally
        project-specific so you have full control over:
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2 mb-8">
        <li>Component templates (standalone, no json-render dependencies)</li>
        <li>Package.json and project structure</li>
        <li>Framework-specific patterns (Next.js, Remix, etc.)</li>
        <li>How data is passed to components</li>
      </ul>

      <h2 className="text-xl font-semibold mt-12 mb-4">Architecture</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Code export is split into two parts:
      </p>

      <h3 className="text-lg font-semibold mt-8 mb-4">
        1. @json-render/codegen (utilities)
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Framework-agnostic utilities for building code generators:
      </p>
      <Code lang="typescript">{`import {
  traverseTree,          // Walk the UI tree
  collectUsedComponents, // Get all component types used
  collectDataPaths,      // Get all data binding paths
  collectActions,        // Get all action names
  serializeProps,        // Convert props to JSX string
} from '@json-render/codegen';`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">
        2. Your Project (generator)
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Custom code generator specific to your project and framework:
      </p>
      <Code lang="typescript">{`// lib/codegen/generator.ts
import { collectUsedComponents, serializeProps } from '@json-render/codegen';

export function generateNextJSProject(tree: UITree): GeneratedFile[] {
  const components = collectUsedComponents(tree);
  
  return [
    { path: 'package.json', content: '...' },
    { path: 'app/page.tsx', content: '...' },
    // ... component files
  ];
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        Example: Next.js Export
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        See the dashboard example for a complete implementation that exports:
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2 mb-4">
        <li>
          <code className="text-foreground">package.json</code> - Dependencies
          and scripts
        </li>
        <li>
          <code className="text-foreground">tsconfig.json</code> - TypeScript
          config
        </li>
        <li>
          <code className="text-foreground">next.config.js</code> - Next.js
          config
        </li>
        <li>
          <code className="text-foreground">app/layout.tsx</code> - Root layout
        </li>
        <li>
          <code className="text-foreground">app/globals.css</code> - Global
          styles
        </li>
        <li>
          <code className="text-foreground">app/page.tsx</code> - Generated page
          with data
        </li>
        <li>
          <code className="text-foreground">components/ui/*.tsx</code> -
          Standalone components
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        Standalone Components
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        The exported components are standalone with no json-render dependencies.
        They receive data as props instead of using hooks:
      </p>
      <Code lang="tsx">{`// Generated component (standalone)
interface MetricProps {
  label: string;
  valuePath: string;
  data?: Record<string, unknown>;
}

export function Metric({ label, valuePath, data }: MetricProps) {
  const value = data ? getByPath(data, valuePath) : undefined;
  return (
    <div>
      <span>{label}</span>
      <span>{formatValue(value)}</span>
    </div>
  );
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Using the Utilities</h2>

      <h3 className="text-lg font-semibold mt-8 mb-4">traverseTree</h3>
      <Code lang="typescript">{`import { traverseTree } from '@json-render/codegen';

traverseTree(tree, (element, depth, parent) => {
  console.log(' '.repeat(depth * 2) + element.type);
});`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">collectUsedComponents</h3>
      <Code lang="typescript">{`import { collectUsedComponents } from '@json-render/codegen';

const components = collectUsedComponents(tree);
// Set { 'Card', 'Metric', 'Chart', 'Table' }

// Generate only the needed component files
for (const component of components) {
  files.push({
    path: \`components/ui/\${component.toLowerCase()}.tsx\`,
    content: componentTemplates[component],
  });
}`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">serializeProps</h3>
      <Code lang="typescript">{`import { serializeProps } from '@json-render/codegen';

const propsStr = serializeProps({
  title: 'Dashboard',
  columns: 3,
  disabled: true,
});
// 'title="Dashboard" columns={3} disabled'`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Try It</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Run the dashboard example and click "Export Project" to see code
        generation in action:
      </p>
      <Code lang="bash">{`cd examples/dashboard
pnpm dev
# Open http://localhost:3001
# Generate a widget, then click "Export Project"`}</Code>
    </article>
  );
}
