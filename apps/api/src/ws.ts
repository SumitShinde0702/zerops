import type { IncomingMessage } from "http";
import { WebSocketServer, type WebSocket } from "ws";

type Client = { ws: WebSocket; roomId: string; memberId?: string };

const clients = new Set<Client>();

export function attachWs(server: import("http").Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws, req: IncomingMessage) => {
    const url = new URL(req.url || "", "http://localhost");
    const roomId = url.searchParams.get("roomId");
    if (!roomId) {
      ws.close();
      return;
    }
    const client: Client = { ws, roomId };
    clients.add(client);
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === "hello" && msg.memberId) client.memberId = msg.memberId;
      } catch {
        /* ignore */
      }
    });
    ws.on("close", () => clients.delete(client));
  });
  return wss;
}

export function broadcast(roomId: string, message: unknown) {
  const data = JSON.stringify(message);
  for (const c of clients) {
    if (c.roomId === roomId && c.ws.readyState === c.ws.OPEN) {
      c.ws.send(data);
    }
  }
}

export function presenceCount(roomId: string) {
  let n = 0;
  for (const c of clients) if (c.roomId === roomId) n += 1;
  return n;
}
