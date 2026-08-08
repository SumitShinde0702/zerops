# Room — Agent Routing Guide

Read this before any code change. This is the source of truth for the Zerops Challenge build.

Challenge: https://www.wemakedevs.org/hackathons/zerops  
YC thesis: https://www.ycombinator.com/rfs (Multiplayer AI)

---

## What we are building

**Room** — Google Docs for agents. Multiplayer-by-default live agent sessions.

Teammates join the **same** running agent session to:
- watch steps/tools live
- steer / redirect mid-run
- hand off ownership
- approve/reject gated actions
- resume from checkpoints

**Not building:** Miro sticky boards, ChatGPT clones, yaml generators, ops dashboards, CI wrappers, donation apps.

**One-liner:** ChatGPT is Word 2003. Room is Docs for agents.

---

## Challenge constraints (non-negotiable)

From [The Zerops Challenge](https://www.wemakedevs.org/hackathons/zerops):

1. **Solo** — one project, you own the architecture decisions.
2. **Live on Zerops** — reachable URL; stays up through judging.
3. **Meaningful Zerops use** — not “host a static site only.”
4. **Architecture shape** — aim for **3+ services**: frontend, API, database minimum; we also use **worker + cache**.
5. **Public source** for judges.
6. **Submission pack:** repo + live URL + demo video + social post tagging `@WeMakeDevs` `@zeropsio` + how Zerops is used + AI tools disclosed.
7. **AI policy:** AI assists; you must understand and be able to explain everything. No fully AI-generated black box.

### Finished means
- Live URL works
- Zerops is how it is built/deployed/operated
- Source reviewable

### Target Zerops topology (example project shape)

**Public:** Vite frontend · Node API (HTTP + WebSocket)  
**Private:** Agent worker · Postgres · Valkey  
**Optional later:** Shared Storage for artifacts · Object storage  

Wire via `zerops.yaml`. Prefer private networking for worker ↔ api ↔ db/cache.

ZCP (Zerops Control Plane) is optional for deploy loop; product must still run on Zerops either way.

---

## Product routes (do not invent random pages)

| Route | Purpose |
|-------|---------|
| `/` | Landing — brand **Room** hero, one CTA to demo |
| `/app` | Linear-like lobby — room list, filters, new room |
| `/app/new` | Create & start shared agent run |
| `/r/:id` | **Core** — plan / live run / people+steer on Miro grid |
| `/join/:id` | Cold join mid-run |
| `/app/history` | Past sessions + replay |
| `/app/templates` | 3 eng templates |
| `/about` | How Zerops is used (judges) |

---

## Multiplayer proof (must work in demo)

Two browsers, same `/r/:id`:
1. Presence appears on join
2. Steps stream on both
3. Steer from B changes plan for both
4. Take over moves ownership
5. Gate Approve/Reject visible to both
6. Kill + resume from checkpoint

If B cannot **change** the run, it is not multiplayer.

---

## Stack lock

- **Runtime:** Node.js, Vite + React + TypeScript + Tailwind
- **UI skill:** Taste Skill (`design-taste-frontend` v2) — https://www.tasteskill.dev/
- **UI libs:** shadcn/ui · [React Bits](https://reactbits.dev/get-started/index) · assistant-ui only for steer thread · Aceternity only if needed
- **Look:** Linear lobby × Figma/Miro **dot/square grid** Room canvas
- **Not:** TailAdmin full theme, purple AI slop, Inter-default generic SaaS

---

## Engineering rules

- Prefer small, working vertical slices over unfinished mega-features.
- Scripted demo agent is OK for MVP (realistic steps + delays); optional LLM later.
- Event types: `step.*` · `presence.*` · `steer` · `handoff` · `gate.*` · `checkpoint` · `resumed`
- No secrets in git. Env via Zerops.
- Every AI tool used must be listable for the submission form.

---

## Demo script (ship this)

1. Landing → open demo  
2. Start `checkout-500` room  
3. Second browser joins  
4. Both see live tool step  
5. Steer: skip opening PR  
6. Take over + gate  
7. Kill → resume  
8. Say: “YC asked for multiplayer AI. This is it — on Zerops.”

---

## Out of scope for MVP

GitHub App provisioning, full org RBAC, Slack, playbook marketplace, real per-PR container spins, cloning entire stacks per lane, redesigning into a chat-first app.
