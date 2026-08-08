# Submission notes — Room

## Project
**Room** — multiplayer live agent sessions (YC Multiplayer AI shaped).

## How Zerops is used
- `api` service: public HTTP + WebSocket; serves the Vite UI in production (`SERVE_WEB=true`)
- `worker` service: private agent runner; polls `api` over Zerops private networking (`API_URL=http://api:4000`)
- `zerops.yaml` defines build/deploy/start for both
- Optional next: attach managed Postgres + Valkey for durable rooms/presence (MVP keeps room state on the API process for a fast demo)

## AI tools used (disclose)
- Cursor
- Taste Skill (`design-taste-frontend`)

## Social post must include
- Name: Room
- What it does
- Demo video (two browsers)
- Live URL
- Zerops usage blurb
- `@WeMakeDevs` `@zeropsio`
