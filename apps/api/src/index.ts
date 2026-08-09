import { config as loadEnv } from "dotenv";
import cors from "cors";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import {
  applyWorkerEvent,
  claimJob,
  createRoom,
  getEvents,
  getRoom,
  handoff,
  joinRoom,
  killRoom,
  leaveRoom,
  listRooms,
  listTemplates,
  pauseRoom,
  presenceUpdate,
  resolveGate,
  resumeRoom,
  seedDemoRoom,
  startRoom,
  seedIncidentBriefing,
  steerRoom,
  takeOver,
  ackSteers,
} from "./store.js";
import {
  bindTicketRoom,
  findTicketByRoom,
  getTicket,
  mintIncidentTicket,
  postIncidentResolved,
  slackConfigHint,
  slackConfigured,
  triggerSlackIncidentDemo,
} from "./slack.js";
import { attachWs, broadcast, presenceCount } from "./ws.js";

loadEnv({ path: path.resolve(process.cwd(), "../../.env") });
loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

function webOrigin() {
  return (process.env.PUBLIC_WEB_URL || "http://localhost:5173").replace(/\/$/, "");
}

function openOrCreateRoomFromTicket(ticketId: string) {
  const ticket = getTicket(ticketId);
  if (!ticket) return null;
  if (ticket.roomId) {
    const existing = getRoom(ticket.roomId);
    if (existing) return { room: existing, ticket, created: false };
  }
  const { room } = createRoom({
    title: ticket.title,
    templateId: ticket.templateId,
    ownerName: "You",
  });
  // Context first (PagerDuty + commits), then wait — no autopilot until someone steers
  seedIncidentBriefing(room.id, ticket);
  bindTicketRoom(ticket.id, room.id);
  return { room: getRoom(room.id)!, ticket, created: true };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "room-api" });
});

app.get("/api/templates", (_req, res) => {
  res.json(listTemplates());
});

app.get("/api/rooms", (req, res) => {
  const filter = String(req.query.filter || "all");
  const rooms = listRooms(filter).map((r) => ({
    ...r,
    liveViewers: presenceCount(r.id),
  }));
  res.json(rooms);
});

app.post("/api/rooms", (req, res) => {
  const { title, templateId, ownerName } = req.body ?? {};
  const { room } = createRoom({
    title: title || "",
    templateId: templateId || "checkout-500",
    ownerName: ownerName || "You",
  });
  startRoom(room.id);
  const fresh = getRoom(room.id)!;
  broadcast(room.id, { type: "snapshot", room: fresh, events: getEvents(room.id) });
  res.status(201).json({
    room: fresh,
    member: fresh.members[0],
    joinPath: `/join/${fresh.id}`,
  });
});

app.post("/api/demo", (_req, res) => {
  const room = seedDemoRoom();
  res.json({ room, member: room.members[0], joinPath: `/join/${room.id}` });
});

/** Recording flow: button → Slack PagerDuty alert → Room bot Create Room. */
app.post("/api/demo/slack", async (_req, res) => {
  const ticket = mintIncidentTicket();
  try {
    const result = await triggerSlackIncidentDemo(ticket);
    res.json({
      ok: true,
      ...result,
      slackReady: slackConfigured(),
      hint: "Open Slack → click Create Room on the Room bot message.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "slack_failed";
    res.status(message === "slack_not_configured" ? 503 : 502).json({
      ok: false,
      error: message,
      ticket,
      hint:
        message === "slack_not_configured"
          ? slackConfigHint() ||
            "Set SLACK_BOT_TOKEN (xoxb-…) + SLACK_CHANNEL_ID (C…) in .env"
          : "Check Slack token scopes (chat:write), reinstall the app, and /invite the bot to the channel.",
    });
  }
});

app.get("/api/slack/ticket/:id", (req, res) => {
  const ticket = getTicket(req.params.id);
  if (!ticket) return res.status(404).json({ error: "not_found" });
  res.json({ ticket });
});

app.post("/api/slack/open-room", (req, res) => {
  const ticketId = String(req.body?.ticket || "");
  const opened = openOrCreateRoomFromTicket(ticketId);
  if (!opened) return res.status(404).json({ error: "ticket_not_found" });
  const fresh = opened.room;
  broadcast(fresh.id, { type: "snapshot", room: fresh, events: getEvents(fresh.id) });
  res.json({
    room: fresh,
    member: fresh.members[0],
    ticket: opened.ticket,
    created: opened.created,
    joinPath: `/join/${fresh.id}`,
  });
});

/** Slack button target — creates room then redirects into the web app. */
app.get("/api/slack/open", (req, res) => {
  const ticketId = String(req.query.ticket || "");
  const opened = openOrCreateRoomFromTicket(ticketId);
  if (!opened) {
    return res.redirect(`${webOrigin()}/app?slack=missing`);
  }
  const fresh = opened.room;
  broadcast(fresh.id, { type: "snapshot", room: fresh, events: getEvents(fresh.id) });
  res.redirect(`${webOrigin()}/r/${fresh.id}?from=slack`);
});

app.get("/api/rooms/:id", (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: "not_found" });
  res.json({ room, events: getEvents(room.id), liveViewers: presenceCount(room.id) });
});

app.post("/api/rooms/:id/join", (req, res) => {
  const result = joinRoom(req.params.id, {
    name: req.body?.name || "Alex",
    role: req.body?.role === "viewer" ? "viewer" : "editor",
  });
  if (!result) return res.status(404).json({ error: "not_found" });
  broadcast(req.params.id, { type: "event", event: result.event, room: result.room });
  res.json(result);
});

app.post("/api/rooms/:id/leave", (req, res) => {
  const event = leaveRoom(req.params.id, req.body?.memberId);
  if (!event) return res.status(404).json({ error: "not_found" });
  const room = getRoom(req.params.id);
  broadcast(req.params.id, { type: "event", event, room });
  res.json({ ok: true });
});

app.post("/api/rooms/:id/steer", (req, res) => {
  const result = steerRoom(req.params.id, req.body?.memberId, String(req.body?.message || ""));
  if (!result) return res.status(404).json({ error: "not_found" });
  if ("error" in result) return res.status(403).json(result);
  broadcast(req.params.id, { type: "event", event: result.event, room: result.room });
  res.json(result);
});

app.post("/api/rooms/:id/handoff", (req, res) => {
  const result = handoff(req.params.id, req.body?.fromId, req.body?.toId);
  if (!result) return res.status(404).json({ error: "not_found" });
  if ("error" in result) return res.status(403).json(result);
  broadcast(req.params.id, { type: "event", event: result.event, room: result.room });
  res.json(result);
});

app.post("/api/rooms/:id/takeover", (req, res) => {
  const result = takeOver(req.params.id, req.body?.memberId);
  if (!result) return res.status(404).json({ error: "not_found" });
  if ("error" in result) return res.status(403).json(result);
  broadcast(req.params.id, { type: "event", event: result.event, room: result.room });
  res.json(result);
});

app.post("/api/rooms/:id/gate", (req, res) => {
  const decision = req.body?.decision === "rejected" ? "rejected" : "approved";
  const result = resolveGate(req.params.id, req.body?.memberId, decision, req.body?.choice);
  if (!result) return res.status(404).json({ error: "not_found" });
  if ("error" in result) return res.status(403).json(result);
  const events = "events" in result && Array.isArray(result.events) ? result.events : [result.event];
  for (const event of events) {
    broadcast(req.params.id, { type: "event", event, room: result.room });
  }
  res.json(result);
});

app.post("/api/rooms/:id/pause", (req, res) => {
  const event = pauseRoom(req.params.id);
  if (!event) return res.status(404).json({ error: "not_found" });
  broadcast(req.params.id, { type: "event", event, room: getRoom(req.params.id) });
  res.json({ ok: true });
});

app.post("/api/rooms/:id/resolve", async (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: "not_found" });
  const summary = String(req.body?.summary || room.summary || "Marked resolved by the room.");
  const result = applyWorkerEvent(req.params.id, {
    type: "room.updated",
    status: "done",
    summary,
    payload: { status: "done", summary },
  });
  if (!result) return res.status(404).json({ error: "not_found" });
  broadcast(req.params.id, { type: "event", event: result.event, room: result.room });

  const ticket = findTicketByRoom(req.params.id);
  let slack: { posted: boolean; roomUrl?: string; joinUrl?: string } = { posted: false };
  if (ticket) {
    try {
      slack = await postIncidentResolved(ticket, summary);
    } catch {
      slack = { posted: false };
    }
  }
  res.json({ room: result.room, event: result.event, slack });
});

app.post("/internal/rooms/:id/resolved", async (req, res) => {
  const ticket = findTicketByRoom(req.params.id);
  if (!ticket) return res.json({ posted: false });
  try {
    const slack = await postIncidentResolved(ticket, String(req.body?.summary || ""));
    res.json(slack);
  } catch (err) {
    res.status(502).json({ posted: false, error: err instanceof Error ? err.message : "slack_failed" });
  }
});

app.post("/api/rooms/:id/kill", (req, res) => {
  const result = killRoom(req.params.id);
  if (!result) return res.status(404).json({ error: "not_found" });
  for (const event of result.events) {
    broadcast(req.params.id, { type: "event", event, room: result.room });
  }
  res.json(result);
});

app.post("/api/rooms/:id/resume", (req, res) => {
  const result = resumeRoom(req.params.id);
  if (!result) return res.status(404).json({ error: "not_found" });
  for (const event of result.events) {
    broadcast(req.params.id, { type: "event", event, room: result.room });
  }
  res.json({ ok: true });
});

app.post("/api/rooms/:id/presence", (req, res) => {
  const event = presenceUpdate(req.params.id, req.body?.memberId, req.body?.mode === "steering" ? "steering" : "watching");
  if (!event) return res.status(404).json({ error: "not_found" });
  broadcast(req.params.id, { type: "event", event, room: getRoom(req.params.id) });
  res.json({ ok: true });
});

app.get("/internal/jobs/claim", (_req, res) => {
  const roomId = claimJob();
  if (!roomId) return res.status(204).end();
  const room = getRoom(roomId);
  if (!room) return res.status(204).end();
  res.json({ room, events: getEvents(roomId) });
});

app.post("/internal/rooms/:id/events", (req, res) => {
  const result = applyWorkerEvent(req.params.id, req.body ?? {});
  if (!result) return res.status(404).json({ error: "not_found" });
  broadcast(req.params.id, { type: "event", event: result.event, room: result.room });
  res.json(result);
});

app.post("/internal/rooms/:id/ack-steers", (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: "not_found" });
  ackSteers(req.params.id);
  res.json({ ok: true, events: getEvents(req.params.id) });
});

if (process.env.SERVE_WEB === "true") {
  const webDist = process.env.WEB_DIST
    ? path.resolve(process.cwd(), process.env.WEB_DIST)
    : path.resolve(__dirname, "../../../web/dist");
  app.use(express.static(webDist));
  app.get(/^(?!\/api)(?!\/ws)(?!\/internal).*/, (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}

const port = Number(process.env.PORT || 4010);
const server = http.createServer(app);
attachWs(server);
server.listen(port, () => {
  console.log(`Room API listening on :${port}`);
});
