import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { Room, RoomMember } from "../lib/types";
import { api } from "../lib/utils";

/** Opens a room from a Slack Create Room / deep link. */
export function FromSlackPage() {
  const [params] = useSearchParams();
  const ticket = params.get("ticket") || "";
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ticket) {
      setError("Missing ticket id");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ room: Room; member: RoomMember }>("/api/slack/open-room", {
          method: "POST",
          body: JSON.stringify({ ticket }),
        });
        if (cancelled) return;
        sessionStorage.setItem(`room:${data.room.id}:member`, JSON.stringify(data.member));
        navigate(`/r/${data.room.id}`, { replace: true });
      } catch {
        if (!cancelled) setError("Ticket expired or API is down. Trigger the demo again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ticket, navigate]);

  return (
    <div className="miro-grid flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm text-[var(--color-muted)]">
        {error || `Opening Room for ${ticket || "ticket"}…`}
      </p>
      {error ? (
        <Link to="/" className="text-sm text-[var(--color-accent-2)]">
          Back to landing
        </Link>
      ) : null}
    </div>
  );
}
