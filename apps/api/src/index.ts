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
  steerRoom,
  takeOver,
  ackSteers,
} from "./store.js";
import { attachWs, broadcast, presenceCount } from "./ws.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

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
  const result = resolveGate(req.params.id, req.body?.memberId, decision);
  if (!result) return res.status(404).json({ error: "not_found" });
  if ("error" in result) return res.status(403).json(result);
  broadcast(req.params.id, { type: "event", event: result.event, room: result.room });
  res.json(result);
});

app.post("/api/rooms/:id/pause", (req, res) => {
  const event = pauseRoom(req.params.id);
  if (!event) return res.status(404).json({ error: "not_found" });
  broadcast(req.params.id, { type: "event", event, room: getRoom(req.params.id) });
  res.json({ ok: true });
});

app.post("/api/rooms/:id/kill", (req, res) => {
  const result = killRoom(req.params.id);
  if (!result) return res.status(404).json({ error: "not_found" });
  broadcast(req.params.id, { type: "event", event: result.event, room: result.room });
  res.json(result);
});

app.post("/api/rooms/:id/resume", (req, res) => {
  const event = resumeRoom(req.params.id);
  if (!event) return res.status(404).json({ error: "not_found" });
  broadcast(req.params.id, { type: "event", event, room: getRoom(req.params.id) });
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

const port = Number(process.env.PORT || 4000);
const server = http.createServer(app);
attachWs(server);
server.listen(port, () => {
  console.log(`Room API listening on :${port}`);
});
