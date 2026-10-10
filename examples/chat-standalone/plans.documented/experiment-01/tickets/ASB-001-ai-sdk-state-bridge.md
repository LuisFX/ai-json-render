# ASB-001 — AiSdkStateBridge implementation

> Wave 1 · **NEXT** · Blocks ASB-002/003 and Wave 2.  
> Parent: [`INDEX.md`](./INDEX.md) · [`../PRD.md`](../PRD.md) §3a.

## Intent

Ship `createAiSdkStateBridge` in [`examples/chat/lib/ai-sdk-state-bridge.ts`](../../lib/ai-sdk-state-bridge.ts): SpecStream `/state` patches → `@json-render/core` `StateStore`.

## Contract

- `applyPatch` / `applyParts` / `pushJsonl`
- `stateOnly` default `true` (ignore `/elements`, `/root`)
- Path rewrite: `/state/foo` → store `/foo`

## Exit

Compiles; consumed by ASB-002.
