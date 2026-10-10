# ASB-002 — Bridge unit tests

> Wave 1 · Dep: ASB-001.  
> Parent: [`INDEX.md`](./INDEX.md).

## Intent

`lib/ai-sdk-state-bridge.test.ts` + slim `fixtures/state-bridge/` cut from high-severity `/state` `data-spec` parts.

## Cases

Progressive array paths · whole `/state` · ignore `/elements` · real `data-spec` shape.

## Exit

`bun test lib/ai-sdk-state-bridge.test.ts` green.
