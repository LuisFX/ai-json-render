# OpenCode lab workspace (in-repo fixture)

Versioned stand-in for the old `/tmp/opencode-lab-scratch` directory.

## Purpose

1. **Project config** — `opencode.json` here is loaded when `opencode serve` is started with
   **cwd = this directory**.
2. **`OPENCODE_DIRECTORY`** — chat adapter + control-plane `?directory=` must point at this path
   (absolute) so permissions/questions resolve.
3. **Durable probing** — survives reboot; lives in git with the lab.

## Boot serve (Path A / Langfuse)

```bash
cd "$(git rev-parse --show-toplevel)/examples/chat-standalone/fixtures/opencode-lab"
# or: cd ~/code/luisfx/ai-json-render/examples/chat-standalone/fixtures/opencode-lab

unset OTEL_EXPORTER_OTLP_ENDPOINT
export LANGFUSE_BASEURL=http://127.0.0.1:51793
# LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY from Doppler or examples/chat-standalone/.env.local

bun /Users/luisfx/code/f1-studio/f1-opencode/packages/opencode/src/index.ts \
  serve --port 4096 --hostname 127.0.0.1
```

Chat `.env.local`:

```bash
OPENCODE_DIRECTORY=/absolute/path/to/examples/chat-standalone/fixtures/opencode-lab
```

## Git policy

| Tracked | Ignored (runtime) |
|---|---|
| `opencode.json`, this README | tool writes, local dumps, `.opencode/` junk — see `.gitignore` |

Secrets stay in `~/.config/opencode/opencode-langfuse.json` / env — **never** in this folder.

See `plans.documented/08-02-2026-integrate-opencode-using-ai-sdk-provider/OUT-OF-GIT-CONFIG.md`.
