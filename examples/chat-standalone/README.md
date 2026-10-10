# Chat Standalone Example

A copy of `examples/chat` that runs json-render in **standalone** mode. Conversation history stays on the left; the generated UI streams into a **resizable artifact sidebar** on the right. Follow-up turns send the latest Spec so the model can **patch** instead of rebuilding.

This is the layout pictured in the [Generation Modes](https://json-render.dev/docs/generation-modes) standalone diagram, plus a version timeline so every iteration is inspectable.

## What it shows

- **Standalone JSONL** -- `catalog.prompt({ mode: "standalone", editModes: ["patch"] })`. The model emits RFC 6902 patch lines only (no prose, no `spec` fence). `pipeJsonRender` still classifies those lines via its heuristic `{` mode, so `useChat` + tool calls stay intact.
- **Artifact sidebar** -- `react-resizable-panels` (shadcn Base UI wrapper). Transcript left (`40%`), UI right (`60%`). Collapses until the first Spec arrives. Below `md`, the split stacks vertically.
- **Cumulative versions** -- `foldSpecTimeline` applies every assistant `data-spec` patch onto one accumulating Spec. `/state`-only turns still create a version. Click a version card in the transcript (or a `vN` chip) to preview it.
- **Patch iteration** -- each follow-up sends `currentSpec` (layout only, plus mined state *paths*) and `prepareCall` rewrites the last user message with `buildEditUserPrompt`.
- **Continue from this version** -- view-only selection vs an explicit baseline for the next edit.
- **Mode B** -- upload/paste a frozen Spec; state-fill still works, rendered in the artifact pane with the live `StateStore`.
- **Same OpenAI provider as `examples/chat`** -- copy `.env.local` from there. OpenCode remains in the copy but is not the focus.
- **Jev option** -- the **jev** toggle composes from prepared sample recipes via TypeSafe (`TYPESAFE_API_KEY`). It does not call live tools or fill a frozen Spec. See [`lib/jev/README.md`](./lib/jev/README.md).

Generation mode is a single constant in [`lib/generation-mode.ts`](./lib/generation-mode.ts). Flip it to `"inline"` to restore prose in the transcript without dropping the sidebar.

## Setup

```bash
# From the ai-json-render monorepo root (Node >= 24)
pnpm install
cd examples/chat-standalone
cp .env.example .env.local
```

Use the **same** `OPENAI_API_KEY` / `OPENAI_MODEL` / `AI_PROVIDER` values as `examples/chat/.env.local`. Add `TYPESAFE_API_KEY` for the Jev toggle.

```bash
bun run dev
# → http://chat-standalone-demo.json-render.localhost:1355
```

Requires global [`portless`](https://github.com/vercel-labs/portless). Do not add a `--port` flag.

## How iteration works

1. User asks for a UI. The agent calls tools, then streams JSONL patches. Those become **v1** in the artifact pane.
2. A follow-up ("add a 24h change column") includes conversation history **and** the current Spec. The model should emit a handful of `add`/`replace`/`remove` ops, not a full rebuild.
3. `foldSpecTimeline` snapshots **v2** as v1 + those ops. The transcript shows a version card instead of a chat bubble of UI.

Inspect a turn's `data-spec` parts: v2/v3 should be small patch lists, not a second copy of `/root` + every element.

## Files

- `app/c/[id]/page.tsx` -- chat UI, version cards, `currentSpec` on `sendMessage`
- `components/chat-split.tsx` -- resizable transcript / artifact chrome
- `components/artifact-panel.tsx` -- Spec renderer, copy/export, version chips
- `components/version-timeline.tsx` -- view-only `vN` chips + Continue from this
- `components/ui/resizable.tsx` -- shadcn Base UI wrapper around `react-resizable-panels`
- `lib/generation-mode.ts` -- `GENERATION_MODE` / `EDIT_MODES`
- `lib/spec-timeline.ts` -- cumulative fold + patch summaries
- `lib/edit-prompt.ts` -- layout-only spec + `buildEditUserPrompt` + last-user rewrite
- `lib/agent.ts` -- `ToolLoopAgent`, standalone prompt, `prepareCall` rewrite
- `app/api/generate/route.ts` -- `pipeJsonRender` + `currentSpec` option
- `lib/export-trace.ts` -- export uses the same cumulative versions

OpenCode / Langfuse notes from the original chat example still apply if you enable that provider. Prefer running this example with `AI_PROVIDER=openai`.
