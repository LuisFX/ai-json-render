# Dashboard Prompt Flow

The dashboard uses a different catalog and API than the playground.

---

## System Prompt

`dashboardCatalog.prompt()` from `examples/dashboard/lib/render/catalog.ts`.

No custom rules (unlike the playground). The catalog itself defines:

- **Form** component — `submitAction`, `submitActionParams`
- **Button** — `action`, `actionParams` (in props; events still use `on.press`)
- **Input** — `value` with `$bindState`, no `name` or `checks`
- **Real actions** — `viewCustomers`, `createCustomer`, `viewInvoices`, `createInvoice`, etc.

---

## User Prompt

`buildUserPrompt({ prompt, state: context?.state })`

- **Fresh:** User prompt + reminder
- **State:** Widget passes `state` so the model can reference current form/data when refining

The dashboard generate route does **not** pass `previousSpec` for refinement (the widget sends it, but the route ignores it). Edits may regenerate from scratch.

---

## Actions vs Playground

| Playground | Dashboard |
|------------|-----------|
| formSubmit (toast) | createCustomer, viewInvoices, etc. |
| setState, pushState, removeState | Same + catalog actions |
| ValidationProvider | None |
| Stub actions | Real API calls to `/api/v1/*` |

---

## Generate API

```typescript
// examples/dashboard/app/api/generate/route.ts
const SYSTEM_PROMPT = dashboardCatalog.prompt();

const userPrompt = buildUserPrompt({
  prompt,
  state: context?.state,
});

streamText({ system: SYSTEM_PROMPT, prompt: userPrompt, temperature: 0.7 });
```
