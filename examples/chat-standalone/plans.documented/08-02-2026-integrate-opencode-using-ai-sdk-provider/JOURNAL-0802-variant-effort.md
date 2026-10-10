# JOURNAL-0802 — Shared reasoning-effort dial (OpenAI ↔ OpenCode `variant`)

> **Date:** 2026-08-02 · **Repo:** `ai-json-render` · **Branch:**
> `feat/freeze-spec-with-ai-sdk-state-bridge-using-ai-sdk-opencode-provider`
> **Companion:** [`JOURNAL-0802-chat-qol.md`](./JOURNAL-0802-chat-qol.md), [`FINDINGS.md`](./FINDINGS.md)  
> **Marketplace pointer:**
> `f1-monorepo/apps/meridian-marketplace/.../JOURNAL-0802-variant-effort.md`

---

## 1. What we learned (before any code)

1. **OpenCode’s thinking-effort UI is real** — the official web app / TUI expose a variant
   (“thinking effort”) next to the model picker. That is not a private client-only control.
2. **The same dial is on the HTTP server** — `POST /session/:id/message` (and async siblings)
   accept body field **`variant?: string`**. The public [server docs](https://opencode.ai/docs/server/)
   Messages table omits it; the OpenAPI at `/doc` and the generated SDK do not. Docs table =
   incomplete, not “missing API.”
3. **Model catalog advertises allowed variants** — `ModelV2Info.variants[]` lists ids the serve
   will accept. For GPT-class models those ids are the effort tiers (`none` / `minimal` / `low` /
   `medium` / `high` / `xhigh`, subset per model). Serve maps variant → provider
   `reasoningEffort` / `reasoning_effort` in `packages/opencode/src/provider/transform.ts`.
4. **Community AI SDK adapter already forwards it** — `OpencodeSettings.variant` lands on the
   prompt body (`opencode-language-model.ts`). No fork of serve, no fork of the adapter, no
   header hacks.
5. **Same concept, two wires** —
   - OpenAI via AI SDK: `providerOptions.openai.reasoningEffort`
   - OpenCode via serve: prompt `variant`
   The lab UI already had one effort selector; it was gated to OpenAI only
   (`chatProvider === "openai"`), so Opencode silently dropped the dial.

**Bottom line:** shared effort UI is **not hackery**. It is the official server field plus the
adapter’s already-supported setting.

---

## 2. How we went about it

1. Confirmed server exposure (SDK `variant` on prompt params + OpenCode transform variants).
2. Confirmed adapter path: `createOpencode(modelId, { variant })` → prompt body `variant`.
3. Traced the lab gap: UI hid the select for Opencode; `prepareCall` never passed variant on the
   Opencode branch.
4. Wired the thin path (no new abstractions):
   - **UI** — show effort select whenever the matrix row has efforts (both providers). Always
     send `reasoningEffort` when that select is shown.
   - **`resolveOpencodeModel`** — accept `variant?: string`, pass into provider settings.
   - **`prepareCall` (Opencode)** — `clampEffort(fromOpencodeModelId(modelId), reasoningEffort)`
     → `variant`. Same clamp source of truth as OpenAI (`openai-model-matrix.ts`).
   - **Breadcrumb** — `/api/generate` logs `effort=…` next to provider/model.
5. `bun run check-types` in `examples/chat` → green.

### Files touched

| File | Change |
|---|---|
| `app/c/[id]/page.tsx` | Show effort for both providers; send `reasoningEffort` when select shown |
| `lib/model.ts` | `OpencodeModelOptions.variant` → provider settings |
| `lib/agent.ts` | Opencode branch clamps + passes `variant` |
| `app/api/generate/route.ts` | Log `effort=` |

---

## 3. Explicit non-goals (this pass)

- Dynamic effort list from live `GET /provider` / model `variants` (still using the code-owned
  OpenAI matrix — good enough while we only run `openai/*` through serve).
- Per-request `providerOptions.opencode.variant` (adapter only exposes `messageID` there today;
  settings-at-model-construction is the supported path and matches how we already bind
  `sessionId` / `systemPrompt`).
- Live-suite assertion that serve received a given variant (would need request capture or serve
  logs); manual breadcrumb + typecheck is the bar for this QoL.

---

## 4. Smoke checklist (when stack is up)

```text
# Terminal A: f1-opencode serve (see README stack section)
# Terminal B: examples/chat next

1. Provider = OpenAI, pick high → log shows effort=high, response feels “heavier”
2. Flip Provider = OpenCode serve, same model + high → log shows effort=high;
   serve prompt carries variant (adapter → POST /session/:id/message)
3. Flip effort to low on Opencode → next turn logs effort=low
```

Expected log shape:

```text
[chat/generate] provider=opencode model=openai/gpt-5.4-mini effort=high conversationId=conv_… sessionId=… mode=generate
[chat/generate] provider=openai model=gpt-5.4-mini effort=high conversationId=conv_… sessionId=none mode=generate
```
