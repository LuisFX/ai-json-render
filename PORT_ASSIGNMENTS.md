# AI JSON Render Port Assignments

This document lists port assignments for services in this monorepo to prevent conflicts.

Scope note: this project uses the `518xx` and `528xx` ranges so it is clearly separated from sister projects using other ranges.

## Port Assignments

| Service | Port | Configuration File | Notes |
|---------|------|-------------------|-------|
| **Docs & Playground (Next.js)** | 51840 | `apps/web/package.json` | Main docs site and playground |
| **Dashboard Example (Next.js)** | 51841 | `examples/dashboard/package.json` | Dashboard + API routes |
| **Remotion Example (Next.js)** | 51842 | `examples/remotion/package.json` | Video generation example |
| **Chat Example (Next.js)** | 51843 | `examples/chat/package.json` | Chat UI example |
| **PostgreSQL (Docker host port)** | 51832 | `ai-render-infra/docker-compose.yml` | Maps host `51832` -> container `5432` |
| **React Native Metro (Expo)** | 52881 | `examples/react-native/package.json` | Expo dev server + API bridge target |

## Port Ranges

- **51830-51839**: Local infrastructure (database)
- **51840-51849**: Web apps and examples
- **52880-52889**: Mobile/Expo development servers

## Verification

To check if ports are in use:

```bash
# Check all ai-json-render ports
lsof -i :51832 -i :51840 -i :51841 -i :51842 -i :51843 -i :52881

# Or check individually
lsof -i :51840  # Docs & Playground
lsof -i :51841  # Dashboard Example
lsof -i :51842  # Remotion Example
lsof -i :51843  # Chat Example
lsof -i :51832  # PostgreSQL (host mapping)
lsof -i :52881  # React Native Metro
```

## Environment Variables

Services that support `PORT` can still be overridden at runtime.

```bash
# Example: run docs app on a temporary port
PORT=51940 pnpm --filter web dev
```

## Last Updated

February 26, 2026
