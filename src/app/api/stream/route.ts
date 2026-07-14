import { requireUser } from "@/lib/session";
import { CHANNELS } from "@/lib/redis";
import { subscribeChannels } from "@/lib/subscriber";
import { ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream backed by a process-wide Redis Pub/Sub hub
 * (see lib/subscriber.ts — one Redis connection per process, not per client).
 *
 * Robustness model: every event is just a "something changed" signal. On
 * connect (and on every EventSource auto-reconnect) we emit a `snapshot` event
 * so the client refetches authoritative state — a dropped connection can never
 * leave the UI desynced. A heartbeat keeps the connection alive through proxies.
 */
export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    return new Response("Unauthorized", { status });
  }

  const channels = [
    CHANNELS.leaderboard,
    CHANNELS.settings,
    CHANNELS.notifications,
    CHANNELS.userGameState(user.id),
  ];
  // Listen for a real-time revoke of THIS device's session (single-device takeover).
  if (user.sid) channels.push(CHANNELS.session(user.sid));

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let unsubscribe: (() => void) | undefined;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      unsubscribe = subscribeChannels(channels, (message) => {
        let payload: { type?: string };
        try {
          payload = JSON.parse(message);
        } catch {
          payload = {};
        }
        send(payload.type ?? "update", payload);
        // This session was taken over elsewhere — push the event, then close.
        if (payload.type === "sessionRevoked") cleanup();
      });

      // Tell the client to load a fresh snapshot of everything.
      send("snapshot", { at: Date.now() });

      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          cleanup();
        }
      }, 25_000);

      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
