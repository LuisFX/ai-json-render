# API Reference

## Core Types

### UIElement

The fundamental building block of the UI system.

```typescript
interface UIElement<T extends string = string, P = Record<string, unknown>> {
  key: string;              // Unique identifier for reconciliation
  type: T;                 // Component type from registry
  props: P;                // Component-specific properties
  children?: string[];     // Array of child element keys
  parentKey?: string | null; // Parent element key (null for root)
  visible?: VisibilityCondition; // Conditional visibility
}
```

**Source**: [`packages/core/src/types.ts:52-62`](../../packages/core/src/types.ts#L52-L62)

### UITree

The complete UI structure with flat element storage.

```typescript
interface UITree {
  root: string;                          // Key of root element
  elements: Record<string, UIElement>;   // Flat storage of all elements
}
```

**Source**: [`packages/core/src/types.ts:85-89`](../../packages/core/src/types.ts#L85-L89)

### JsonPatch

JSON patch operations for incremental updates.

```typescript
interface PatchOp {
  op: "add" | "set" | "remove" | "replace";
  path: string;
  value?: any;
}

type JsonPatch = PatchOp;
```

**Source**: [`packages/core/src/types.ts:140-148`](../../packages/core/src/types.ts#L140-L148)

## React Integration

### useUIStream Hook

Primary hook for streaming UI generation.

```typescript
interface UseUIStreamOptions {
  api: string;                                    // API endpoint
  onComplete?: (tree: UITree) => void;           // Completion callback
  onError?: (error: Error) => void;              // Error callback
}

interface UseUIStreamReturn {
  tree: UITree | null;                           // Current UI tree
  isStreaming: boolean;                          // Streaming status
  error: Error | null;                          // Any error
  send: (prompt: string, context?: Record<string, unknown>) => Promise<void>; // Generate UI
  clear: () => void;                            // Clear state
}

function useUIStream(options: UseUIStreamOptions): UseUIStreamReturn;
```

**Source**: [`packages/react/src/hooks.ts:72-90`](../../packages/react/src/hooks.ts#L72-L90)

### Renderer Component

Main component for rendering UI trees.

```typescript
interface RendererProps {
  tree: UITree | null;                          // UI tree to render
  registry: ComponentRegistry;                  // Component mappings
  loading?: boolean;                           // Loading state
  fallback?: ComponentRenderer;                // Fallback component
}

function Renderer(props: RendererProps): JSX.Element;
```

**Source**: [`packages/react/src/renderer.tsx:41-48`](../../packages/react/src/renderer.tsx#L41-L48)

### Component Registry

Type-safe component registration system.

```typescript
interface ComponentRenderProps<P = Record<string, unknown>> {
  element: UIElement<string, P>;               // Element being rendered
  children?: ReactNode;                        // Rendered children
  onAction?: (action: Action) => void;        // Action handler
  loading?: boolean;                          // Loading state
}

type ComponentRenderer<P = Record<string, unknown>> = 
  ComponentType<ComponentRenderProps<P>>;

type ComponentRegistry = Record<string, ComponentRenderer<any>>;
```

**Source**: [`packages/react/src/renderer.tsx:21-34`](../../packages/react/src/renderer.tsx#L21-L34)

## Context Providers

### JSONUIProvider

Root provider that combines all contexts.

```typescript
interface JSONUIProviderProps {
  children: ReactNode;
  initialData?: DataModel;
  authState?: AuthState;
  onAction?: (action: Action) => Promise<void>;
}

function JSONUIProvider(props: JSONUIProviderProps): JSX.Element;
```

**Source**: [`packages/react/src/renderer.tsx:185-233`](../../packages/react/src/renderer.tsx#L185-L233)

### Data Context

Manages dynamic data binding and updates.

```typescript
interface DataContextValue {
  data: DataModel;                             // Current data model
  updateData: (path: string, value: any) => void; // Update data at path
  bindToField: (path: string) => any;         // Bind to form field
}

interface DataProviderProps {
  children: ReactNode;
  initialData?: DataModel;
}

function DataProvider(props: DataProviderProps): JSX.Element;
function useData(): DataContextValue;
function useDataValue<T>(path: string): T;
function useDataBinding(path: string): any;
```

**Source**: [`packages/react/src/contexts/data.ts`](../../packages/react/src/contexts/data.ts)

### Visibility Context

Controls element visibility based on conditions.

```typescript
interface VisibilityContextValue {
  authState: AuthState;                        // Authentication state
  setAuthState: (state: AuthState) => void;    // Update auth state
}

interface VisibilityProviderProps {
  children: ReactNode;
  authState?: AuthState;
}

function VisibilityProvider(props: VisibilityProviderProps): JSX.Element;
function useVisibility(): VisibilityContextValue;
function useIsVisible(condition?: VisibilityCondition): boolean;
```

**Source**: [`packages/react/src/contexts/visibility.ts`](../../packages/react/src/contexts/visibility.ts)

### Action Context

Handles user actions with confirmation and error handling.

```typescript
interface ActionContextValue {
  execute: (action: Action) => Promise<void>;  // Execute action
  isExecuting: (actionId: string) => boolean;  // Check if executing
  confirm: (config: ConfirmConfig) => Promise<boolean>; // Show confirmation
}

interface ActionProviderProps {
  children: ReactNode;
  onAction?: (action: Action) => Promise<void>;
}

function ActionProvider(props: ActionProviderProps): JSX.Element;
function useActions(): ActionContextValue;
function useAction(action: Action): () => Promise<void>;
```

**Source**: [`packages/react/src/contexts/actions.ts`](../../packages/react/src/contexts/actions.ts)

### Validation Context

Provides form validation capabilities.

```typescript
interface ValidationContextValue {
  mode: ValidationMode;                        // Validation mode
  setMode: (mode: ValidationMode) => void;    // Set validation mode
  errors: Record<string, string[]>;           // Current errors
  validate: (path: string, value: any) => string[]; // Validate value
}

interface ValidationProviderProps {
  children: ReactNode;
  mode?: ValidationMode;
}

function ValidationProvider(props: ValidationProviderProps): JSX.Element;
function useValidation(): ValidationContextValue;
function useFieldValidation(path: string): FieldValidationState;
```

**Source**: [`packages/react/src/contexts/validation.ts`](../../packages/react/src/contexts/validation.ts)

## Action System

### Action Definition

Rich action definitions with params, confirmation, and handlers.

```typescript
interface Action {
  name: string;                               // Action name (must be in catalog)
  params?: Record<string, DynamicValue>;     // Parameters with dynamic values
  confirm?: ActionConfirm;                   // Confirmation dialog
  onSuccess?: ActionOnSuccess;               // Success handler
  onError?: ActionOnError;                   // Error handler
}

interface ActionConfirm {
  title: string;                             // Dialog title
  message: string;                           // Dialog message
  confirmLabel?: string;                     // Confirm button text
  cancelLabel?: string;                      // Cancel button text
  variant?: "default" | "danger";           // Dialog variant
}

type ActionOnSuccess = 
  | { navigate: string }                     // Navigate to URL
  | { set: Record<string, unknown> }        // Set data values
  | { action: string };                     // Execute another action

type ActionOnError =
  | { set: Record<string, unknown> }        // Set error data
  | { action: string };                     // Execute error handler action
```

**Source**: [`packages/core/src/actions.ts:24-46`](../../packages/core/src/actions.ts#L24-L46)

### Action Execution

```typescript
type ActionHandler<TParams = Record<string, unknown>, TResult = unknown> = 
  (params: TParams) => Promise<TResult> | TResult;

interface ActionDefinition<TParams = Record<string, unknown>> {
  params?: z.ZodType<TParams>;               // Zod schema for params
  description?: string;                      // AI description
}

interface ResolvedAction {
  name: string;                              // Resolved action name
  params: Record<string, unknown>;          // Resolved parameters
  confirm?: ActionConfirm;                  // Confirmation config
  onSuccess?: ActionOnSuccess;              // Success handler
  onError?: ActionOnError;                  // Error handler
}

function resolveAction(action: Action, dataModel: DataModel): ResolvedAction;
function executeAction(ctx: ActionExecutionContext): Promise<void>;
```

**Source**: [`packages/core/src/actions.ts:68-150`](../../packages/core/src/actions.ts#L68-L150)

## Dynamic Values

### Dynamic Value System

Support for data binding with path-based references.

```typescript
type DynamicValue<T = unknown> = T | { path: string };
type DynamicString = DynamicValue<string>;
type DynamicNumber = DynamicValue<number>;
type DynamicBoolean = DynamicValue<boolean>;

// Zod schemas for validation
const DynamicValueSchema: z.ZodType<DynamicValue>;
const DynamicStringSchema: z.ZodType<DynamicString>;
const DynamicNumberSchema: z.ZodType<DynamicNumber>;
const DynamicBooleanSchema: z.ZodType<DynamicBoolean>;

function resolveDynamicValue<T>(value: DynamicValue<T>, dataModel: DataModel): T;
function getByPath(obj: Record<string, unknown>, path: string): unknown;
function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void;
```

**Source**: [`packages/core/src/types.ts:7-40`](../../packages/core/src/types.ts#L7-L40)

## Visibility System

### Visibility Conditions

Flexible visibility control with boolean, auth, and logic expressions.

```typescript
type VisibilityCondition =
  | boolean                                   // Static visibility
  | { path: string }                         // Data-based visibility
  | { auth: "signedIn" | "signedOut" }      // Auth-based visibility  
  | LogicExpression;                        // Complex logic

interface LogicExpression {
  and?: VisibilityCondition[];              // AND operation
  or?: VisibilityCondition[];               // OR operation
  not?: VisibilityCondition;                // NOT operation
}

interface AuthState {
  isSignedIn: boolean;                      // Authentication status
  user?: Record<string, unknown>;          // User data
}

interface VisibilityContext {
  authState: AuthState;                     // Current auth state
  data: DataModel;                         // Current data model
}

function evaluateVisibility(
  condition: VisibilityCondition, 
  context: VisibilityContext
): boolean;

function evaluateLogicExpression(
  expr: LogicExpression,
  context: VisibilityContext  
): boolean;
```

**Source**: [`packages/core/src/visibility.ts`](../../packages/core/src/visibility.ts)

## Component Catalog

### Catalog Definition

Type-safe component catalog with validation and AI integration.

```typescript
interface ComponentDefinition<TProps extends ComponentSchema = ComponentSchema> {
  props: TProps;                            // Zod schema for props
  hasChildren?: boolean;                   // Whether component has children
  description?: string;                    // AI description
}

interface CatalogConfig<
  TComponents extends Record<string, ComponentDefinition> = Record<string, ComponentDefinition>,
  TActions extends Record<string, ActionDefinition> = Record<string, ActionDefinition>,
  TFunctions extends Record<string, ValidationFunction> = Record<string, ValidationFunction>,
> {
  name?: string;                           // Catalog name
  components: TComponents;                 // Component definitions
  actions?: TActions;                      // Action definitions
  functions?: TFunctions;                  // Validation functions
  validation?: ValidationMode;             // Validation mode
}

interface Catalog<
  TComponents extends Record<string, ComponentDefinition>,
  TActions extends Record<string, ActionDefinition>,
  TFunctions extends Record<string, ValidationFunction>,
> {
  readonly name: string;
  readonly componentNames: (keyof TComponents)[];
  readonly actionNames: (keyof TActions)[];
  readonly functionNames: (keyof TFunctions)[];
  readonly validation: ValidationMode;
  readonly components: TComponents;
  readonly actions: TActions;
  readonly functions: TFunctions;
  readonly elementSchema: z.ZodType<UIElement>;
  readonly treeSchema: z.ZodType<UITree>;
  
  hasComponent(type: string): boolean;
  hasAction(name: string): boolean;
  hasFunction(name: string): boolean;
  validateElement(element: unknown): ValidationResult;
  validateTree(tree: unknown): ValidationResult;
  generatePrompt(): string;
}

function createCatalog<
  TComponents extends Record<string, ComponentDefinition>,
  TActions extends Record<string, ActionDefinition>,
  TFunctions extends Record<string, ValidationFunction>,
>(config: CatalogConfig<TComponents, TActions, TFunctions>): Catalog<TComponents, TActions, TFunctions>;
```

**Source**: [`packages/core/src/catalog.ts:15-100`](../../packages/core/src/catalog.ts#L15-L100)

## Validation System

### Validation Configuration

Runtime validation with custom functions and modes.

```typescript
type ValidationMode = "strict" | "warn" | "off";

interface ValidationFunction<TValue = unknown, TResult = boolean> {
  (value: TValue, context?: ValidationContext): TResult;
}

interface ValidationContext {
  element: UIElement;
  tree: UITree;
  dataModel: DataModel;
}

interface ValidationConfig {
  mode: ValidationMode;
  functions: Record<string, ValidationFunction>;
}

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

const ValidationConfigSchema: z.ZodType<ValidationConfig>;

function validateValue<T>(
  value: T, 
  schema: z.ZodType<T>,
  mode: ValidationMode
): ValidationResult;
```

**Source**: [`packages/core/src/validation.ts`](../../packages/core/src/validation.ts)

## Code Generation

### Tree Traversal

Utilities for analyzing and generating code from UI trees.

```typescript
interface TreeVisitor {
  onElement?: (element: UIElement, path: string[]) => void;
  onEnterElement?: (element: UIElement, path: string[]) => void;
  onExitElement?: (element: UIElement, path: string[]) => void;
}

function traverseTree(tree: UITree, visitor: TreeVisitor): void;

function collectUsedComponents(tree: UITree): string[];
function collectDataPaths(tree: UITree): string[];
function collectActions(tree: UITree): Action[];
```

**Source**: [`packages/codegen/src/traverse.ts`](../../packages/codegen/src/traverse.ts)

### Serialization

Code generation and serialization utilities.

```typescript
interface SerializeOptions {
  indent?: number;                          // Indentation level
  quotes?: "single" | "double";           // Quote style
  trailingComma?: boolean;                 // Trailing commas
}

function serializePropValue(
  value: unknown, 
  options?: SerializeOptions
): string;

function serializeProps(
  props: Record<string, unknown>,
  options?: SerializeOptions
): string;

function escapeString(str: string, quote?: "single" | "double"): string;
```

**Source**: [`packages/codegen/src/serialize.ts`](../../packages/codegen/src/serialize.ts)

## API Routes

### Generation Endpoint

Streaming UI generation endpoint.

```typescript
// POST /api/generate
interface GenerateRequest {
  prompt: string;                          // User prompt
  context?: {
    previousTree?: UITree;                 // Previous tree for iteration
    [key: string]: unknown;               // Additional context
  };
}

interface GenerateResponse {
  // Streaming JSON Lines response
  // Each line is a JsonPatch operation
}
```

**Implementation**: [`apps/web/app/api/generate/route.ts`](../../apps/web/app/api/generate/route.ts)

### System Prompt Structure

```typescript
const SYSTEM_PROMPT = `You are a UI generator that outputs JSONL (JSON Lines) patches.

AVAILABLE COMPONENTS (22):

Layout:
- Card: { title?: string, description?: string, maxWidth?: "sm"|"md"|"lg"|"full", centered?: boolean } - Container card for content sections. Has children. Use for forms/content boxes, NOT for page headers.
- Stack: { direction?: "horizontal"|"vertical", gap?: "sm"|"md"|"lg" } - Flex container. Has children.
...

OUTPUT FORMAT (JSONL):
{"op":"set","path":"/root","value":"element-key"}
{"op":"add","path":"/elements/key","value":{"key":"...","type":"...","props":{...},"children":[...]}}

ALL COMPONENTS support: className?: string[] - array of Tailwind classes for custom styling

RULES:
1. First line sets /root to root element key
2. Add elements with /elements/{key}
3. Children array contains string keys, not objects
4. Parent first, then children
5. Each element needs: key, type, props
6. Use className for custom Tailwind styling when needed
...`;
```

**Source**: [`apps/web/app/api/generate/route.ts:7-55`](../../apps/web/app/api/generate/route.ts#L7-L55)

## Built-in Components

### Layout Components

| Component | Props | Description |
|-----------|--------|-------------|
| `Card` | `{title?, description?, maxWidth?, centered?, className?}` | Container for content sections |
| `Stack` | `{direction?, gap?, className?}` | Flex container (horizontal/vertical) |
| `Grid` | `{columns?, gap?, className?}` | CSS Grid layout |
| `Divider` | `{className?}` | Horizontal separator |

### Form Components

| Component | Props | Description |
|-----------|--------|-------------|
| `Input` | `{label, name, type?, placeholder?, className?}` | Text input field |
| `Textarea` | `{label, name, placeholder?, rows?, className?}` | Multi-line text input |
| `Select` | `{label, name, options[], placeholder?, className?}` | Dropdown selection |
| `Checkbox` | `{label, name, checked?, className?}` | Checkbox input |
| `Radio` | `{label, name, options[], className?}` | Radio button group |
| `Switch` | `{label, name, checked?, className?}` | Toggle switch |

### Action Components

| Component | Props | Description |
|-----------|--------|-------------|
| `Button` | `{label, variant?, actionText?, className?}` | Clickable button |
| `Link` | `{label, href, className?}` | Navigation link |

### Display Components

| Component | Props | Description |
|-----------|--------|-------------|
| `Heading` | `{text, level?, className?}` | Heading text (h1-h4) |
| `Text` | `{content, variant?, className?}` | Paragraph text |
| `Image` | `{src, alt, width?, height?, className?}` | Image display |
| `Avatar` | `{src?, name, size?, className?}` | User avatar with fallback |
| `Badge` | `{text, variant?, className?}` | Status badge |
| `Alert` | `{title, message?, type?, className?}` | Alert banner |
| `Progress` | `{value, max?, label?, className?}` | Progress bar |
| `Rating` | `{value, max?, label?, className?}` | Star rating |

### Chart Components

| Component | Props | Description |
|-----------|--------|-------------|
| `BarGraph` | `{title?, data: {label, value}[], className?}` | Vertical bar chart |
| `LineGraph` | `{title?, data: {label, value}[], className?}` | Line chart |

**Component Implementations**: [`apps/web/components/demo/`](../../apps/web/components/demo/)

## Error Handling

### Common Error Types

```typescript
class ValidationError extends Error {
  constructor(public errors: string[]) {
    super(`Validation failed: ${errors.join(", ")}`);
  }
}

class StreamingError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
  }
}

class ComponentNotFoundError extends Error {
  constructor(public componentType: string) {
    super(`Component not found: ${componentType}`);
  }
}
```

### Error Recovery Patterns

```typescript
// Component fallback
const Component = registry[element.type] ?? fallback;

// Graceful patch parsing
function parsePatchLine(line: string): JsonPatch | null {
  try {
    return JSON.parse(line) as JsonPatch;
  } catch {
    return null; // Skip invalid lines
  }
}

// Stream error handling
useUIStream({
  api: "/api/generate",
  onError: (error) => {
    console.error("Generation failed:", error);
    toast.error("Failed to generate UI");
  }
});
```

## Performance Considerations

### Optimization Strategies

1. **Flat Element Storage**: O(1) lookups, efficient patch operations
2. **Stable React Keys**: Efficient reconciliation during streaming  
3. **Incremental Updates**: Only changed elements re-render
4. **Request Cancellation**: Abort in-flight requests on new generation
5. **Component Memoization**: Memo components based on element props
6. **Lazy Loading**: Load components on-demand from registry

### Memory Management

```typescript
// Immutable updates with structural sharing
const newTree = {
  ...tree,
  elements: {
    ...tree.elements,
    [key]: updatedElement // Only changed element allocates new memory
  }
};

// Cleanup on component unmount
useEffect(() => {
  return () => {
    abortControllerRef.current?.abort();
  };
}, []);
```

## Examples

### Basic Usage

```typescript
import { useUIStream, Renderer, JSONUIProvider } from "@json-render/react";
import { demoRegistry } from "./components";

function App() {
  const { tree, isStreaming, send } = useUIStream({
    api: "/api/generate"
  });

  return (
    <JSONUIProvider>
      <Renderer 
        tree={tree} 
        registry={demoRegistry}
        loading={isStreaming}
      />
      <button onClick={() => send("Create a login form")}>
        Generate UI
      </button>
    </JSONUIProvider>
  );
}
```

### Custom Component

```typescript
function CustomButton({ element }: ComponentRenderProps) {
  const { props } = element;
  const label = props.label as string;
  
  return (
    <button 
      className="px-4 py-2 bg-blue-500 text-white rounded"
      onClick={() => console.log("Clicked:", label)}
    >
      {label}
    </button>
  );
}

const registry = {
  ...demoRegistry,
  CustomButton
};
```

### Data Binding

```typescript
function DataDrivenApp() {
  const [data, setData] = useState({
    user: { name: "John", email: "john@example.com" }
  });

  return (
    <JSONUIProvider initialData={data}>
      <Renderer tree={tree} registry={registry} />
    </JSONUIProvider>
  );
}

// Component with dynamic value
{
  "key": "greeting",
  "type": "Text",
  "props": {
    "content": { "path": "user.name" } // Resolves to "John"
  }
}
```

## Next Steps

- [🧪 Testing Guide](./06-testing.md)
- [🔧 Development Setup](./07-development.md)  
- [📖 Usage Examples](./08-examples.md)