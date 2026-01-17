# @json-render/codegen

Utilities for generating code from json-render UI trees.

This package provides framework-agnostic utilities for building code generators. Use these utilities to create custom code exporters for your specific framework (Next.js, Remix, etc.).

## Installation

```bash
npm install @json-render/codegen
# or
pnpm add @json-render/codegen
```

## Utilities

### Tree Traversal

```typescript
import { traverseTree, collectUsedComponents, collectDataPaths, collectActions } from '@json-render/codegen';

// Walk the tree depth-first
traverseTree(tree, (element, depth, parent) => {
  console.log(`${' '.repeat(depth * 2)}${element.type}`);
});

// Get all component types used
const components = collectUsedComponents(tree);
// Set { 'Card', 'Metric', 'Button' }

// Get all data paths referenced
const dataPaths = collectDataPaths(tree);
// Set { 'analytics/revenue', 'user/name' }

// Get all action names
const actions = collectActions(tree);
// Set { 'submit_form', 'refresh_data' }
```

### Serialization

```typescript
import { serializePropValue, serializeProps, escapeString } from '@json-render/codegen';

// Serialize a single value
serializePropValue("hello");
// { value: '"hello"', needsBraces: false }

serializePropValue(42);
// { value: '42', needsBraces: true }

serializePropValue({ path: 'user/name' });
// { value: '{ path: "user/name" }', needsBraces: true }

// Serialize props for JSX
serializeProps({ title: "Dashboard", columns: 3, disabled: true });
// 'title="Dashboard" columns={3} disabled'
```

### Types

```typescript
import type { GeneratedFile, CodeGenerator } from '@json-render/codegen';

// Implement your own code generator
const myGenerator: CodeGenerator = {
  generate(tree) {
    return [
      { path: 'package.json', content: '...' },
      { path: 'app/page.tsx', content: '...' },
    ];
  }
};
```

## Building a Custom Generator

See the `examples/dashboard` for a complete example of building a Next.js code generator using these utilities.

```typescript
import { 
  collectUsedComponents, 
  collectDataPaths,
  traverseTree,
  serializeProps,
  type GeneratedFile 
} from '@json-render/codegen';
import type { UITree } from '@json-render/core';

export function generateNextJSProject(tree: UITree): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const components = collectUsedComponents(tree);
  
  // Generate package.json
  files.push({
    path: 'package.json',
    content: JSON.stringify({
      name: 'my-generated-app',
      dependencies: {
        next: '^14.0.0',
        react: '^18.0.0',
      }
    }, null, 2)
  });
  
  // Generate component files...
  // Generate main page...
  
  return files;
}
```

## License

Apache-2.0
