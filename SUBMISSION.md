# Zerops Challenge — submission pack (paste into the form)

## Project title *(required)*

**Room — Google Docs for agents**

*(short alt if character-limited: `Room: Multiplayer live agent sessions`)*

---

## Project Description *(required)*

Paste this (prose form for the submission box):

---

ChatGPT, Claude chat, and the rest of today’s AI UIs are Word 2003. Room is Docs for agents.

YC’s Requests for Startups called out Multiplayer AI for a reason: the best work tools of the last two decades won by going multiplayer — Google Docs replaced Word, Figma beat Photoshop — and they turned solo tools into places where teams do their best work together. AI still hasn’t had that moment. Agents are the most powerful new teammate a company can hire, yet people still open a private chat, type a prompt, and hope. When you want to collaborate, the best you get is a read-only transcript someone else can’t touch. Agents are already running tasks that take hours; work at that scale was never meant to be done alone. Room is multiplayer-by-default for that thesis (https://www.ycombinator.com/rfs).

The problem is that engineering agents are single-player by default. One person starts a long run in ChatGPT or Cursor; everyone else gets a screenshot, a Slack paste, or “wait until it’s done.” When the agent goes wrong mid-flight — wrong hypothesis, about to open a noisy PR, needs a human gate — only the person at the keyboard can redirect it. Teammates cannot change the run. They can only watch a recording later, if there is one. That’s not a small UX gap. It’s how companies will waste the most important new labor multiplier of this decade.

The impact of that problem is brutal and compounding. Parallel debugging becomes serial — I’ll run the agent, you wait. Context fragments across PagerDuty, commits, Slack, runbooks, and Drive, so the agent and the team never share one surface. Ownership collapses to “who has the laptop” instead of a first-class handoff. Teams won’t trust agents to act — merge, page, post — without shared visibility and approve/reject. Knowledge evaporates into a thousand private threads instead of one living session the company can build on.

Room’s solution is a shared live session URL (`/r/:id`) where humans and an agent occupy the same meeting surface — not another chat clone and not a sticky-board toy. Teammates see presence, stream the same tool steps live, steer the plan mid-run, take over ownership so the agent waits on the new driver, approve or reject gates together, and kill then resume from a checkpoint. A Miro-like canvas puts integrations (PagerDuty, Slack, GitHub, Drive, Zapier) on the wall as context cards connected to the agent plan; chat is there when you want the linear steer thread; Slack page-in takes a simulated PagerDuty alert to Create Room in-thread and opens the shared run. The product rule is simple: if browser B cannot change the run for browser A, it isn’t multiplayer.

Demo (two browsers, one room): https://youtu.be/RmKHUzReEoI

The impact of the solution is that agent work becomes a shared living session instead of private threads. Incident context lands once and the whole team decides on the same board. Steer, handoff, and gate are the product — not “share a transcript and pray.” Judges can open two browsers on the same room and prove it by changing the run together.

On Zerops, Room ships as a real multi-service architecture: a Vite + React + TypeScript frontend (served by the API in production), an Express HTTP + WebSocket API for rooms and Slack, and a private Node worker that polls jobs and emits step, steer, gate, and checkpoint events. Build and run are defined in `zerops.yaml`; the worker talks to the API over the project private network (`API_URL=http://api:4000`). Postgres and Valkey are the documented scale path for durable rooms and presence; the live demo keeps hot room state on the API so judging stays fast. AI tools used: Cursor, Taste Skill (`design-taste-frontend`), and optional OpenAI for richer worker replies — architecture and product decisions stay human-owned.

Live: https://api-20a-4000.ny1.zerops.app · Source: https://github.com/SumitShinde0702/zerops

---

## Repository (Source Code) *(required)*

```
https://github.com/SumitShinde0702/zerops
```

---

## Live deployment on Zerops *(required)*

```
https://api-20a-4000.ny1.zerops.app
```

*(Room UI is served from the `api` service with `SERVE_WEB=true`. Do **not** submit the ZCP Cloud IDE URL `zcp-…-8080`.)*

---

## Social Post *(for the Logitech MX Master 3 prize)*

Draft — post on X/LinkedIn, then paste the post URL into the form:

---

**Option A — punchy (X / LinkedIn)**

YC asked for Multiplayer AI.

ChatGPT is Word 2003.  
**Room** is Google Docs for agents.

Same live session URL. Teammates join mid-run, watch tools stream, **steer**, take over, approve gates, resume from checkpoint. Slack → PagerDuty alert → Create Room → two browsers, one run.

Built for @WeMakeDevs × @zeropsio — multi-service on Zerops (`api` + private `worker`).

Live: https://api-20a-4000.ny1.zerops.app  
Demo: https://youtu.be/RmKHUzReEoI  
Code: https://github.com/SumitShinde0702/zerops  

#ZeropsChallenge #MultiplayerAI

---

**Option B — slightly longer LinkedIn**

The best work tools of the last twenty years won by going multiplayer. Docs. Figma. AI still hasn’t.

Agents now run for hours — but teams still collaborate by pasting screenshots into Slack. If your teammate can’t **change** the run, it isn’t multiplayer.

I built **Room** for The Zerops Challenge: Google Docs for agents. Presence, live tools, steer, handoff, gates, canvas + chat, Slack page-in — deployed as a real multi-service app on Zerops.

Demo (two browsers): https://youtu.be/RmKHUzReEoI  
Live: https://api-20a-4000.ny1.zerops.app  
Repo: https://github.com/SumitShinde0702/zerops  

@WeMakeDevs @zeropsio

---

After you post, paste your post URL here in the form (e.g. `https://x.com/.../status/...` or LinkedIn post link).

---

## Judge checklist (you’re covered)

| Rule | Room |
|------|------|
| Live on Zerops, openable | https://api-20a-4000.ny1.zerops.app |
| Not Hello World — 3+ services shape | Frontend (Vite UI) + API + private worker (+ ZCP in project; Postgres/Valkey scale path documented) |
| Source readable | Public GitHub repo above |
| Demo video | https://youtu.be/RmKHUzReEoI |
| Social tags | `@WeMakeDevs` `@zeropsio` |
