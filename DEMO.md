# Room — 90s two-browser demo

## Setup

1. Put `OPENAI_API_KEY` in repo-root `.env` (see `.env.example`).
2. Run `npm run dev` (api + worker + web).
3. Browser A: Open seeded demo / create `checkout-500`.
4. Copy **Share** join link → Browser B as **Alex**.

## Script

| Time | Browser A (You) | Browser B (Alex) |
|------|-----------------|------------------|
| 0:00 | Start room — LLM writes real step output | — |
| 0:10 | Watch tool cards | Join → appears in People |
| 0:20 | — | Same live LLM output as A |
| 0:35 | — | Steer: `Rewrite the fix more carefully and skip opening a PR` |
| 0:45 | `agent.steer` reply from the model | Same |
| 0:55 | — | **Take over** |
| 1:05 | — | Approve/Reject LLM-written gate |
| 1:30 | Tagline | “YC asked for multiplayer AI. This is it — on Zerops.” |

## Social post checklist

- Project name: **Room**
- What it does (1–2 lines)
- Short video of the two-browser demo
- Live Zerops URL
- How Zerops is used (api + worker + private network; web served from api)
- Tag `@WeMakeDevs` `@zeropsio`
