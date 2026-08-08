# Room

Multiplayer live agent sessions for teams — Google Docs for agents.

Built for [The Zerops Challenge](https://www.wemakedevs.org/hackathons/zerops). Aligns with [YC Multiplayer AI RFS](https://www.ycombinator.com/rfs).

## What it does

- Start a long-running engineering agent in a shared **Room**
- Teammates join the same URL and see tool calls live
- **Steer** mid-run, **Take over**, **Approve/Reject** gates
- Kill + **resume from checkpoint**

## Stack

| Service | Role |
|---------|------|
| `web` | Vite + React UI (Linear × Miro grid) |
| `api` | Express HTTP + WebSocket |
| `worker` | Agent runner (polls jobs, emits events) |

Optional on Zerops: Postgres + Valkey (MVP uses in-memory room state on the API; worker talks to API over private network).

## Local dev

```bash
npm install
npm run dev
```

That starts **api + worker + web** together. Open http://localhost:5173

Put `OPENAI_API_KEY` in repo-root `.env` (see `.env.example`). The worker loads it automatically.

## Zerops

See `zerops.yaml`. Services:

- **api** — public HTTP/WS, also serves the built web UI (`SERVE_WEB=true`)
- **worker** — private, `API_URL` points at `api`

## Demo script

See [DEMO.md](./DEMO.md).

## Agent routing

See [AGENTS.md](./AGENTS.md).
