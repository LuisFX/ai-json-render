# Final Spec

The structure both Playground and Dashboard render from. After JSONL patches are applied, this is the in-memory object the Renderer consumes.

> **Code:** `packages/core/src/types.ts` 166-175 (Spec), 56-72 (UIElement); `packages/react/src/schema.ts` 10-29.

---

## Top-Level Shape

```typescript
interface Spec {
  root: string;                              // Key of the root element
  elements: Record<string, UIElement>;       // Flat map: key → element
  state?: Record<string, unknown>;           // Optional initial state
}
```

| Field | Type | Purpose |
|-------|------|---------|
| `root` | string | Key into `elements` for the root node |
| `elements` | Record | All elements by key. Flat adjacency list. |
| `state` | object? | Seed data for `$state`, `$bindState`, `repeat` |

---

## Element Shape (UIElement)

```typescript
interface UIElement {
  type: string;                              // Component name from catalog
  props: Record<string, unknown>;           // Component props (may use expressions)
  children?: string[];                       // Child element keys
  visible?: VisibilityCondition;           // When to show (default: true)
  on?: Record<string, ActionBinding>;        // Event → action bindings
  repeat?: { statePath: string; key?: string };  // Render children per array item
}
```

| Field | Required | Purpose |
|-------|----------|---------|
| `type` | Yes | Catalog component name (Card, Input, Button, etc.) |
| `props` | Yes | Props object. Values can be literals or expressions. |
| `children` | No | Array of element keys. Empty or omitted = leaf. |
| `visible` | No | Condition to show/hide. Omitted = always visible. |
| `on` | No | Event bindings: `{ press: { action: "setState", params: {...} } }` |
| `repeat` | No | Render children once per item in `state[statePath]` |

> **Code:** `packages/core/src/types.ts` 56-72.

---

## Prop Expressions

Props can be literals or dynamic expressions:

| Expression | Purpose | Example |
|------------|---------|---------|
| `{ $state: "/path" }` | Read from state | `{ $state: "/user/name" }` |
| `{ $bindState: "/path" }` | Two-way binding | `{ $bindState: "/form/email" }` |
| `{ $bindItem: "field" }` | Two-way binding (inside repeat) | `{ $bindItem: "completed" }` |
| `{ $item: "field" }` | Read from current repeat item | `{ $item: "title" }` |
| `{ $index: true }` | Current repeat index | `{ $index: true }` |
| `{ $cond, $then, $else }` | Conditional value | `{ $cond: { $state: "/tab", eq: "home" }, $then: "blue", $else: "gray" }` |

> **Code:** `packages/core/src/props.ts` 18-43, 149-193.

---

## Visibility Condition

```typescript
type VisibilityCondition =
  | boolean
  | { $state: string; eq?: unknown; neq?: unknown; gt?: number; ... }
  | { $item: string; eq?: unknown; ... }
  | { $index: true; eq?: unknown; ... }
  | VisibilityCondition[]
  | { $and: VisibilityCondition[] }
  | { $or: VisibilityCondition[] };
```

- `{ $state: "/path", eq: "value" }` — show when state value equals
- `{ $state: "/path" }` — show when truthy
- Array = implicit AND
- `{ $and: [...] }` / `{ $or: [...] }` — explicit AND/OR

> **Code:** `packages/core/src/types.ts` 98-161.

---

## Action Binding

```typescript
interface ActionBinding {
  action: string;
  params?: Record<string, DynamicValue>;
  confirm?: { title: string; message: string; ... };
  onSuccess?: { navigate: string } | { set: Record<string, unknown> } | { action: string };
  onError?: { set: Record<string, unknown> } | { action: string };
  preventDefault?: boolean;
}
```

Used in `on`: `{ press: { action: "setState", params: { statePath: "/x", value: 1 } } }`

> **Code:** `packages/core/src/actions.ts` 37-50.

---

## Repeat

```typescript
repeat: { statePath: string; key?: string }
```

- `statePath` — JSON path to array in state (e.g. `"/todos"`)
- `key` — Field on each item for React keys (e.g. `"id"`)

Children render once per array item. Inside children, use `$item`, `$index`, `$bindItem`.

> **Code:** `packages/core/src/types.ts` 71; `packages/react/src/renderer.tsx` (RepeatChildren).

---

## Example

```json
{
  "root": "card",
  "elements": {
    "card": {
      "type": "Card",
      "props": { "title": "Contact Us", "maxWidth": "md" },
      "children": ["form"]
    },
    "form": {
      "type": "Stack",
      "props": { "direction": "vertical", "gap": "md" },
      "children": ["name", "email", "submit"]
    },
    "name": {
      "type": "Input",
      "props": {
        "label": "Name",
        "name": "name",
        "value": { "$bindState": "/form/name" },
        "checks": [{ "type": "required", "message": "Required" }]
      },
      "children": []
    },
    "email": {
      "type": "Input",
      "props": {
        "label": "Email",
        "name": "email",
        "type": "email",
        "value": { "$bindState": "/form/email" }
      },
      "children": []
    },
    "submit": {
      "type": "Button",
      "props": { "label": "Send" },
      "on": { "press": { "action": "formSubmit" } },
      "children": []
    }
  },
  "state": {
    "form": { "name": "", "email": "" }
  }
}
```

---

## Where It Comes From

| Source | How |
|--------|-----|
| JSONL patches | `applySpecPatch` / `applyPatch` mutates spec from stream |
| DB (Dashboard) | `widget.spec` loaded and passed as `initialSpec` |
| In-memory (Playground) | `useUIStream` builds spec from patches; versions store it |

Both apps end up with the same `Spec` shape. The Renderer is catalog-agnostic for structure; only the catalog's component names and props differ.
