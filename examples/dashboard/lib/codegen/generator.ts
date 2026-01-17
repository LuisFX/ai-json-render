import type { UITree } from "@json-render/core";
import {
  collectUsedComponents,
  collectDataPaths,
  traverseTree,
  serializeProps,
} from "@json-render/codegen";
import { componentTemplates } from "./templates";

export interface ExportedFile {
  path: string;
  content: string;
}

export interface GeneratorOptions {
  projectName?: string;
  data?: Record<string, unknown>;
}

/**
 * Generate a complete Next.js project from a UI tree
 */
export function generateNextJSProject(
  tree: UITree,
  options: GeneratorOptions = {},
): ExportedFile[] {
  const { projectName = "generated-dashboard", data = {} } = options;
  const files: ExportedFile[] = [];

  // Collect what we need
  const usedComponents = collectUsedComponents(tree);
  const dataPaths = collectDataPaths(tree);

  // 1. Generate package.json
  files.push({
    path: "package.json",
    content: generatePackageJson(projectName),
  });

  // 2. Generate next.config.js
  files.push({
    path: "next.config.js",
    content: `/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
};
`,
  });

  // 3. Generate tsconfig.json
  files.push({
    path: "tsconfig.json",
    content: JSON.stringify(
      {
        compilerOptions: {
          target: "ES2017",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./*"] },
        },
        include: [
          "next-env.d.ts",
          "**/*.ts",
          "**/*.tsx",
          ".next/types/**/*.ts",
        ],
        exclude: ["node_modules"],
      },
      null,
      2,
    ),
  });

  // 4. Generate globals.css
  files.push({
    path: "app/globals.css",
    content: generateGlobalsCss(),
  });

  // 5. Generate layout.tsx
  files.push({
    path: "app/layout.tsx",
    content: generateLayout(projectName),
  });

  // 6. Generate component files (only the ones that are used)
  for (const componentName of usedComponents) {
    const template = componentTemplates[componentName];
    if (template) {
      files.push({
        path: `components/ui/${componentName.toLowerCase()}.tsx`,
        content: template,
      });
    }
  }

  // 7. Generate components/ui/index.ts
  files.push({
    path: "components/ui/index.ts",
    content: generateComponentIndex(usedComponents),
  });

  // 8. Generate the main page with the tree
  files.push({
    path: "app/page.tsx",
    content: generateMainPage(tree, usedComponents, data),
  });

  // 9. Generate README
  files.push({
    path: "README.md",
    content: generateReadme(projectName),
  });

  return files;
}

function generatePackageJson(name: string): string {
  return JSON.stringify(
    {
      name,
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
      },
      dependencies: {
        next: "^14.2.0",
        react: "^18.3.0",
        "react-dom": "^18.3.0",
      },
      devDependencies: {
        "@types/node": "^20.0.0",
        "@types/react": "^18.3.0",
        "@types/react-dom": "^18.3.0",
        typescript: "^5.4.0",
      },
    },
    null,
    2,
  );
}

function generateGlobalsCss(): string {
  return `* {
  box-sizing: border-box;
}

:root {
  --background: #000;
  --foreground: #fafafa;
  --card: #0a0a0a;
  --border: #262626;
  --muted: #a3a3a3;
  --radius: 8px;
}

html,
body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--background);
  color: var(--foreground);
  -webkit-font-smoothing: antialiased;
}

button {
  font-family: inherit;
  cursor: pointer;
}

input,
select,
textarea {
  font-family: inherit;
}

::selection {
  background: var(--foreground);
  color: var(--background);
}
`;
}

function generateLayout(projectName: string): string {
  return `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${projectName}",
  description: "Generated dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
}

function generateComponentIndex(components: Set<string>): string {
  const exports = Array.from(components)
    .sort()
    .map((name) => `export { ${name} } from "./${name.toLowerCase()}";`)
    .join("\n");

  return exports + "\n";
}

function generateMainPage(
  tree: UITree,
  components: Set<string>,
  data: Record<string, unknown>,
): string {
  const imports = Array.from(components).sort().join(", ");
  const jsx = generateJSX(tree, tree.root, 4);
  const dataStr = JSON.stringify(data, null, 2).replace(/\n/g, "\n  ");

  return `"use client";

import { ${imports} } from "@/components/ui";

const data = ${dataStr};

export default function Page() {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
${jsx}
    </div>
  );
}
`;
}

function generateJSX(tree: UITree, key: string, indent: number): string {
  const element = tree.elements[key];
  if (!element) return "";

  const spaces = " ".repeat(indent);
  const componentName = element.type;

  // Filter out null/undefined props and convert data paths to data references
  const propsObj: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(element.props)) {
    if (v === null || v === undefined) continue;

    // Convert *Path props to actual data values
    if (
      typeof v === "string" &&
      (k.endsWith("Path") || k === "bindPath" || k === "dataPath")
    ) {
      // Keep as a special marker for the component
      propsObj[k] = v;
    } else {
      propsObj[k] = v;
    }
  }

  // Add data prop for components that need it
  const needsData =
    Object.keys(propsObj).some(
      (k) => k.endsWith("Path") || k === "bindPath" || k === "dataPath",
    ) || ["Chart", "Table", "Metric", "List"].includes(componentName);

  const propsStr = serializeProps(propsObj);
  const dataAttr = needsData ? " data={data}" : "";

  const hasChildren = element.children && element.children.length > 0;

  if (!hasChildren) {
    if (propsStr || dataAttr) {
      return `${spaces}<${componentName}${dataAttr}${propsStr ? " " + propsStr : ""} />`;
    }
    return `${spaces}<${componentName} />`;
  }

  const lines: string[] = [];
  if (propsStr || dataAttr) {
    lines.push(
      `${spaces}<${componentName}${dataAttr}${propsStr ? " " + propsStr : ""}>`,
    );
  } else {
    lines.push(`${spaces}<${componentName}>`);
  }

  for (const childKey of element.children!) {
    lines.push(generateJSX(tree, childKey, indent + 2));
  }

  lines.push(`${spaces}</${componentName}>`);

  return lines.join("\n");
}

function generateReadme(projectName: string): string {
  return `# ${projectName}

This dashboard was generated from a json-render UI tree.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Project Structure

- \`app/page.tsx\` - Main dashboard page
- \`components/ui/\` - UI components
- \`app/globals.css\` - Global styles
`;
}
