# Chat example fixtures

## Layout (SSOT)

| Kind | Path | Role |
|---|---|---|
| High-severity freeze | [`high-severity-clinical-history-review/`](./high-severity-clinical-history-review/) | **Canonical** for harness + path-mine / bridge tests |
| Bridge lab | [`state-bridge/`](./state-bridge/) | Slim `/state` parts, JSONL, synthetic bind/repeat, prompt snapshot |
| Catalog prompt | [`catalog-prompt/`](./catalog-prompt/) | `explorerCatalog.prompt` dump (Mode A curriculum contrast) |
| Conversations / flat dumps | [`conversations/`](./conversations/), `trace-conv_*` at fixtures root | HistorySidebar **Export** / `/api/fixtures/dump` output — may duplicate high-severity |

Prefer the high-severity folder when wiring new tests. Dedupe = ASB-010.

## Export shape

Dumps from the HistorySidebar **Export** action:

- `trace-<id>-envelope.json` — full `ConversationEnvelope` (Meridian golden-conversation dual; same keys as marketplace `store-schema.ts`)
- `trace-<id>-spec.json` — folded Spec `{ root, elements, state }`

**Lane difference:** Meridian Spec = `proposeView` tool OUTPUT (post-bake). Chat Spec = SpecStream fold via `buildSpecFromParts` on `data-spec` parts.
