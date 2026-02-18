# API Reference

## Core Types

### Spec

The complete UI structure.

```typescript
interface Spec {
  root: string;                          // Key of root element
  elements: Record<string, UIElement>;   // Flat storage of all elements
  state?: Record<string, unknown>;       // Optional initial state
}
```

### UIElement

```typescript
interface UIElement<T extends string = string, P = Record<string, unknown>> {
  type: T;                 // Component type from catalog
  props: P;                // Component-specific properties
  children?: string[];     // Array of child element keys
  visible?: VisibilityCondition;
  repeat?: { statePath: string; key?: string };
  on?: Record<string, ActionBinding | ActionBinding[]>;
}
```

### JsonPatch

RFC 6902 patch operations.

```typescript
interface JsonPatch {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: unknown;
}
```

## @json-render/core

### defineSchema

```typescript
function defineSchema(
  builder: (s: SchemaBuilder) => SchemaDefinition,
  options?: SchemaOptions
): Schema;
```

### defineCatalog

```typescript
function defineCatalog<T extends Schema>(
  schema: T,
  data: InferCatalogInput<T>
): Catalog<...>;
```

### buildUserPrompt

```typescript
interface UserPromptOptions {
  prompt: string;
  currentSpec?: Spec | null;
  state?: Record<string, unknown> | null;
  maxPromptLength?: number;
}

function buildUserPrompt(options: UserPromptOptions): string;
```

### SpecStream

```typescript
function createSpecStreamCompiler<T>(): SpecStreamCompiler<T>;
function parseSpecStreamLine(line: string): JsonPatch | null;
function applySpecPatch(obj: Spec, patch: JsonPatch): void;
function compileSpecStream<T>(jsonl: string): T;
```

### Prop Resolution

```typescript
function resolvePropValue(value: unknown, ctx: PropResolutionContext): unknown;
function resolveElementProps(props: Record<string, unknown>, ctx: PropResolutionContext): Record<string, unknown>;
function resolveBindings(props: Record<string, unknown>, ctx: PropResolutionContext): Record<string, string> | undefined;
```

### Spec Validation

```typescript
function validateSpec(spec: unknown, options?: ValidateSpecOptions): SpecValidationResult;
function autoFixSpec(spec: Spec): Spec;
function formatSpecIssues(issues: SpecIssue[]): string;
```

### Visibility

```typescript
function evaluateVisibility(condition: VisibilityCondition, ctx: VisibilityContext): boolean;

import { visibility } from "@json-render/core";
visibility.when("/path");
visibility.unless("/path");
visibility.eq("/path", val);
visibility.and(cond1, cond2);
visibility.or(cond1, cond2);
```

## @json-render/react

### defineRegistry

```typescript
function defineRegistry<C extends Catalog>(
  catalog: C,
  implementations: { components: ComponentMap<C> }
): { registry: ComponentRegistry };
```

### Renderer

```typescript
interface RendererProps {
  spec: Spec | null;
  registry: ComponentRegistry;
  loading?: boolean;
  fallback?: ComponentRenderer;
}

function Renderer(props: RendererProps): JSX.Element;
```

### createRenderer

Higher-level helper that wraps Renderer with providers:

```typescript
interface CreateRendererProps {
  registry: ComponentRegistry;
  initialState?: Record<string, unknown>;
  handlers?: Record<string, ActionHandler>;
  fallback?: ComponentRenderer;
}

function createRenderer(props: CreateRendererProps): {
  Renderer: ComponentType<{ spec: Spec | null; loading?: boolean }>;
};
```

### useUIStream

```typescript
interface UseUIStreamOptions {
  api: string;
  onComplete?: (spec: Spec) => void;
  onError?: (error: Error) => void;
}

interface UseUIStreamReturn {
  spec: Spec | null;
  isStreaming: boolean;
  error: Error | null;
  send: (prompt: string, context?: Record<string, unknown>) => Promise<void>;
  clear: () => void;
}

function useUIStream(options: UseUIStreamOptions): UseUIStreamReturn;
```

### useChatUI

For chat interfaces with mixed text and UI:

```typescript
interface UseChatUIOptions {
  api: string;
  // ...
}

function useChatUI(options: UseChatUIOptions): UseChatUIReturn;
```

### Context Providers

#### StateProvider

```typescript
interface StateProviderProps {
  children: ReactNode;
  initialState?: Record<string, unknown>;
  onStateChange?: (state: Record<string, unknown>) => void;
}

function StateProvider(props: StateProviderProps): JSX.Element;
function useStateStore(): StateContextValue;
function useStateValue<T>(path: string): T;
function useStateBinding(path: string): [unknown, (value: unknown) => void];
```

#### ActionProvider

```typescript
interface ActionProviderProps {
  children: ReactNode;
  handlers: Record<string, ActionHandler>;
}

function ActionProvider(props: ActionProviderProps): JSX.Element;
function useActions(): ActionContextValue;
function useAction(name: string): () => Promise<void>;
```

#### VisibilityProvider

```typescript
function VisibilityProvider(props: { children: ReactNode }): JSX.Element;
function useIsVisible(condition?: VisibilityCondition): boolean;
```

#### ValidationProvider

```typescript
function ValidationProvider(props: { children: ReactNode }): JSX.Element;
function useFieldValidation(path: string, config: ValidationConfig): FieldValidationState;
```

### Component Props

```typescript
interface ComponentRenderProps<P = Record<string, unknown>> {
  element: UIElement<string, P>;
  children?: ReactNode;
  emit: (event: string) => void;
  on: (event: string) => EventHandle;
  bindings?: Record<string, string>;
  loading?: boolean;
}

interface EventHandle {
  emit: () => void;
  shouldPreventDefault: boolean;
  bound: boolean;
}
```

### Hooks

| Hook | Purpose |
|------|---------|
| `useStateStore()` | State context: `state`, `get`, `set`, `update` |
| `useStateValue(path)` | Single value from state |
| `useStateBinding(path)` | Two-way binding `[value, setValue]` |
| `useBoundProp(value, bindingPath)` | Two-way binding for `$bindState`/`$bindItem` |
| `useIsVisible(condition)` | Visibility check |
| `useActions()` | Action context |
| `useAction(name)` | Single action dispatch |
| `useFieldValidation(path, config)` | Field validation state |

## API Routes

### POST /api/generate

```typescript
// Request
{
  prompt: string;
  context?: {
    previousSpec?: Spec;
    state?: Record<string, unknown>;
  };
}

// Response: Streaming text (JSON Lines)
// Each line: JSON patch or usage metadata
{"op":"add","path":"/root","value":"card-1"}
{"op":"add","path":"/elements/card-1","value":{...}}
{"__meta":"usage","promptTokens":100,"completionTokens":50,"totalTokens":150}
```

## Examples

### Basic Usage

```typescript
import { defineCatalog } from "@json-render/core";
import { schema, defineRegistry, Renderer, StateProvider, ActionProvider } from "@json-render/react";

const catalog = defineCatalog(schema, {
  components: {
    Greeting: { props: z.object({ name: z.string() }), description: "Greeting" },
  },
  actions: {},
});

const { registry } = defineRegistry(catalog, {
  components: {
    Greeting: ({ props }) => <h1>Hello, {props.name}!</h1>,
  },
});

const spec = {
  root: "g1",
  elements: {
    g1: { type: "Greeting", props: { name: "World" }, children: [] },
  },
};

function App() {
  return (
    <StateProvider>
      <ActionProvider handlers={{}}>
        <Renderer spec={spec} registry={registry} />
      </ActionProvider>
    </StateProvider>
  );
}
```

### With useUIStream

```typescript
const { spec, isStreaming, send } = useUIStream({ api: "/api/generate" });

return (
  <>
    <Renderer spec={spec} registry={registry} loading={isStreaming} />
    <button onClick={() => send("Create a login form")}>Generate</button>
  </>
);
```

## Next Steps

- [Testing Guide](./06-testing.md)
- [Prompt Engineering](./07-prompt-engineering.md)
