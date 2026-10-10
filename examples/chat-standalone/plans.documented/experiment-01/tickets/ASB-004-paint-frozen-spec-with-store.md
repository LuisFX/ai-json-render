# ASB-004 — Paint frozen Spec with store

> Wave 2 · Dep: Wave 1 green.  
> Parent: [`INDEX.md`](./INDEX.md).

## Intent

Dashboard-shaped split in chat: frozen Spec + `StateProvider` fed by AiSdkStateBridge (not only `spec.state` seed).

## Exit

UI or harness updates when bridge applies `/state` patches without changing `elements`.
