# ASB-003 — Bridge live OpenAI smoke

> Wave 1 · Dep: ASB-001 (ASB-002 preferred first).  
> Parent: [`INDEX.md`](./INDEX.md).

## Intent

`lib/ai-sdk-state-bridge.live.test.ts` — skip without API key; with chat `.env.local`, stream **only** `/state` SpecStream → bridge → assert store.

## Exit

Skip CI without key; pass locally with OpenAI env used by chat.
