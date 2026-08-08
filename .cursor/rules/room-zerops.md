# Room (Zerops Challenge) — stay on route

> Cursor: treat this as always-on. Prefer also enabling `.cursor/rules/` once Agent mode allows `.mdc`. Full detail: root `AGENTS.md`.

Challenge: https://www.wemakedevs.org/hackathons/zerops

## Product
Build **Room**: multiplayer live agent sessions (watch, steer, hand off, approve). YC Multiplayer AI — not a chatbot, not Miro stickies, not a Zerops yaml tool, not an ops monitor.

## Must ship
- Live Zerops URL; meaningful multi-service use (web + api + worker + Postgres + Valkey)
- `zerops.yaml`; private network for worker/db/cache
- Two-browser multiplayer demo (presence, live steps, steer, handoff, gate, checkpoint resume)
- Public repo; demo video + social post tags later

## Stack
Node, Vite/React/TS/Tailwind, Taste Skill, shadcn, React Bits, assistant-ui for steer only, Linear × Miro-grid UI.

## Do not
- Replace Room with a different idea mid-build
- Ship single-container Hello World as the whole product
- Make `/r/:id` a ChatGPT clone (canvas + plan + presence is the core)
- Add TailAdmin wholesale or purple-gradient AI slop
- Commit secrets; leave the user unable to explain the architecture
