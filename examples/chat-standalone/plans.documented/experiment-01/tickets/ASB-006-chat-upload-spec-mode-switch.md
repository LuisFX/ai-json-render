# ASB-006 — Chat upload Spec + mode switch

> Wave 4 · Dep: ASB-004, ASB-005.  
> Parent: [`INDEX.md`](./INDEX.md).

## Intent

Upload/paste frozen Spec; `uploadedSpec ? statePathsOnly.prompt : explorerCatalog.prompt`; Mode B wires `data-spec` → bridge.

## Exit

Manual smoke: Mode A generate → export → new chat upload → Mode B state stream → paint.

## Trap

Do not build this before Wave 1 tests are green.
