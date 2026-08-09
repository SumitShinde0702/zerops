/** Thin Slack helpers for the incident demo recording flow. */

export type IncidentTicket = {
  id: string;
  title: string;
  severity: string;
  summary: string;
  templateId: string;
  roomId?: string;
  createdAt: number;
  slackChannel?: string;
  slackThreadTs?: string;
};

const tickets = new Map<string, IncidentTicket>();

export function getTicket(id: string) {
  return tickets.get(id) ?? null;
}

export function findTicketByRoom(roomId: string) {
  for (const t of tickets.values()) {
    if (t.roomId === roomId) return t;
  }
  return null;
}

export function bindTicketRoom(ticketId: string, roomId: string) {
  const t = tickets.get(ticketId);
  if (!t) return null;
  t.roomId = roomId;
  tickets.set(ticketId, t);
  return t;
}

function env(name: string) {
  return (process.env[name] || "").trim();
}

export function slackConfigured() {
  const token = env("SLACK_BOT_TOKEN");
  const channel = env("SLACK_CHANNEL_ID");
  return Boolean(token.startsWith("xoxb-") && /^C[A-Z0-9]+$/i.test(channel));
}

export function slackConfigHint() {
  const token = env("SLACK_BOT_TOKEN");
  const channel = env("SLACK_CHANNEL_ID");
  if (!token) return "Set SLACK_BOT_TOKEN (must start with xoxb-) in .env";
  if (!token.startsWith("xoxb-")) return "SLACK_BOT_TOKEN must be a Bot User OAuth Token (xoxb-…), not a config token";
  if (!channel) return "Set SLACK_CHANNEL_ID in .env";
  if (!/^C[A-Z0-9]+$/i.test(channel)) {
    return "SLACK_CHANNEL_ID must look like C0123456789 (open channel details in Slack — not the channel name)";
  }
  return "";
}

function publicApiUrl() {
  return env("PUBLIC_API_URL") || `http://127.0.0.1:${process.env.PORT || 4010}`;
}

function publicWebUrl() {
  return env("PUBLIC_WEB_URL") || "http://localhost:5173";
}

async function slackApi(method: string, body: Record<string, unknown>) {
  const token = env("SLACK_BOT_TOKEN");
  if (!token) throw new Error("SLACK_BOT_TOKEN missing");
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; error?: string; ts?: string; channel?: string };
  if (!data.ok) throw new Error(data.error || `slack_${method}_failed`);
  return data;
}

async function postWebhook(text: string, blocks?: unknown[]) {
  const url = env("SLACK_PAGERDUTY_WEBHOOK_URL");
  if (!url) return false;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "PagerDuty",
      icon_emoji: ":rotating_light:",
      text,
      blocks,
    }),
  });
  if (!res.ok) throw new Error(`pagerduty_webhook_${res.status}`);
  return true;
}

export function mintIncidentTicket(): IncidentTicket {
  const id = `PD-${Math.floor(1000 + Math.random() * 9000)}`;
  const ticket: IncidentTicket = {
    id,
    title: `checkout-500 · ${id}`,
    severity: "high",
    summary: "Checkout error rate spiked to 25% after deploy (10:15). Payments failing for a subset of users.",
    templateId: "checkout-500",
    createdAt: Date.now(),
  };
  tickets.set(id, ticket);
  return ticket;
}

/** Demo beat: PagerDuty alert → Room bot invites Create Room. */
export async function triggerSlackIncidentDemo(ticket: IncidentTicket) {
  const channel = env("SLACK_CHANNEL_ID");
  const createUrl = `${publicApiUrl()}/api/slack/open?ticket=${encodeURIComponent(ticket.id)}`;
  const webFallback = `${publicWebUrl()}/from-slack?ticket=${encodeURIComponent(ticket.id)}`;

  const pdText = `*${ticket.severity.toUpperCase()}* · ${ticket.id} — Checkout errors\n${ticket.summary}`;
  const pdBlocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `🚨 ${ticket.id} · Checkout error spike`, emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Severity*\n${ticket.severity}` },
        { type: "mrkdwn", text: `*Service*\ncheckout` },
        { type: "mrkdwn", text: `*Error rate*\n25% peak` },
        { type: "mrkdwn", text: `*Status*\ntriggered` },
      ],
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: ticket.summary },
    },
  ];

  let pagerDutyVia = "bot";
  let threadTs: string | undefined;

  const usedWebhook = await postWebhook(pdText, pdBlocks).catch(() => false);
  if (usedWebhook) {
    pagerDutyVia = "webhook";
  } else if (slackConfigured()) {
    const pd = await slackApi("chat.postMessage", {
      channel,
      text: pdText,
      blocks: [
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: "*PagerDuty* · simulated alert for Room demo" }],
        },
        ...pdBlocks,
      ],
    });
    threadTs = pd.ts;
  } else {
    throw new Error("slack_not_configured");
  }

  if (!slackConfigured()) {
    return {
      ticket,
      createUrl: webFallback,
      pagerDutyVia,
      roomPosted: false,
      note: "PagerDuty webhook sent. Add SLACK_BOT_TOKEN + SLACK_CHANNEL_ID for Room bot reply.",
    };
  }

  const roomMsg = await slackApi("chat.postMessage", {
    channel,
    thread_ts: threadTs,
    text: `Room can spin up a shared agent session for ${ticket.id}.`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Room* · Looks like an incident worth a shared agent run.\nCreate a room for *${ticket.id}* so the team can pair-debug live (steer / take over / approve).`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            style: "primary",
            text: { type: "plain_text", text: "Create Room", emoji: true },
            url: createUrl,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Open in browser", emoji: true },
            url: webFallback,
          },
        ],
      },
    ],
  });

  ticket.slackChannel = channel;
  ticket.slackThreadTs = threadTs || roomMsg.ts;
  tickets.set(ticket.id, ticket);

  return {
    ticket,
    createUrl,
    webFallback,
    pagerDutyVia,
    roomPosted: true,
    slackTs: roomMsg.ts,
  };
}

/** Post resolved note back into the incident Slack thread. */
export async function postIncidentResolved(ticket: IncidentTicket, summary?: string) {
  if (!slackConfigured() || !ticket.roomId) return { posted: false as const };
  const channel = ticket.slackChannel || env("SLACK_CHANNEL_ID");
  const roomUrl = `${publicWebUrl()}/r/${ticket.roomId}`;
  const joinUrl = `${publicWebUrl()}/join/${ticket.roomId}`;
  const text = `✅ *Resolved* · ${ticket.id}\n${summary?.trim() || "Incident handled in a shared Room session."}\n*Room:* ${roomUrl}\n*Join:* ${joinUrl}`;
  await slackApi("chat.postMessage", {
    channel,
    thread_ts: ticket.slackThreadTs,
    text,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `✅ *Resolved* · ${ticket.id}\n${summary?.trim() || "Incident handled in a shared Room session."}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Open Room", emoji: true },
            url: roomUrl,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Join as teammate", emoji: true },
            url: joinUrl,
          },
        ],
      },
    ],
  });
  return { posted: true as const, roomUrl, joinUrl };
}
