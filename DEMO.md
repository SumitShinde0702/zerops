# Room — Slack → Room demo (recording)

## One-time Slack setup

1. Create a Slack app → **OAuth & Permissions** → Bot Token Scopes: `chat:write` (and `chat:write.public` if posting to channels the bot isn't in).
2. Install to workspace → copy **Bot User OAuth Token** (`xoxb-…`).
3. Invite the bot to your demo channel (`/invite @Room`).
4. Copy the channel ID (right-click channel → View channel details → bottom).
5. Optional: Incoming Webhook with display name **PagerDuty** for a cleaner fake alert.
6. Put values in `.env` (see `.env.example`).

```env
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C...
PUBLIC_WEB_URL=http://localhost:5173
PUBLIC_API_URL=http://127.0.0.1:4010
# optional
SLACK_PAGERDUTY_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## Run

```bash
npm run dev
```

Local API is **:4010** (avoids sticky :4000 on Windows). Web is :5173.

## What proves multiplayer (and why it’s useful)

Solo ChatGPT wastes a run when the wrong path starts. Room’s value:

1. **Shared context** — PagerDuty + commits load once; both browsers see the same brief.
2. **Redirect without restart** — Alex types `Draft the fix — skip the PR`. Plan shows **Open pull request** cancelled for everyone.
3. **Handoff** — Take over moves the driver; agent waits on the new driver.
4. **Presence** — Join shows Alex in People; last steer name is visible in the header.

If B cannot change the plan for A, it isn’t multiplayer.

## Recording script

| Time | Action |
|------|--------|
| 0:00 | Landing → **Open live demo** (does **not** open the room yet) |
| 0:05 | Cut to Slack: **PagerDuty** high alert for checkout errors |
| 0:15 | Room bot thread: **Create Room** |
| 0:20 | Click Create Room → browser opens `/r/:id` |
| 0:30 | Second browser → join link as Alex |
| 0:45 | Agent one beat → waits → steer / take over |
| 1:10 | Tagline: multiplayer agents, paged from Slack, on Zerops |

## Fallback

Lobby **Skip to room** still seeds a room without Slack.
