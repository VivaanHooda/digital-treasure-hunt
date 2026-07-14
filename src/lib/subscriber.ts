import type Redis from "ioredis";
import { createRedis } from "./redis";

/**
 * Shared Redis Pub/Sub hub for the SSE endpoint.
 *
 * One dedicated Redis connection per PROCESS (psubscribed to `rt:*`) fans
 * messages out to in-process listeners — instead of one Redis connection per
 * SSE client, which at ~1,000 concurrent players would mean ~1,000 Redis
 * connections/file descriptors from a single app instance.
 *
 * ioredis re-issues psubscribe automatically after a reconnect, so listeners
 * survive Redis blips. Stored on globalThis to survive dev hot reloads.
 */

type Listener = (message: string) => void;

type Hub = {
  sub: Redis;
  listeners: Map<string, Set<Listener>>;
};

const globalForHub = globalThis as unknown as { __rtHub?: Hub };

function getHub(): Hub {
  if (globalForHub.__rtHub) return globalForHub.__rtHub;

  const sub = createRedis();
  const listeners = new Map<string, Set<Listener>>();

  sub.psubscribe("rt:*").catch((e) => {
    console.error("Pub/Sub hub psubscribe failed:", e);
  });
  sub.on("pmessage", (_pattern, channel, message) => {
    const set = listeners.get(channel);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(message);
      } catch (e) {
        console.error("Pub/Sub listener error:", e);
      }
    }
  });
  sub.on("error", (e) => console.error("Pub/Sub hub connection error:", e));

  globalForHub.__rtHub = { sub, listeners };
  return globalForHub.__rtHub;
}

/** Subscribe a listener to a set of channels; returns an unsubscribe fn. */
export function subscribeChannels(channels: string[], fn: Listener): () => void {
  const { listeners } = getHub();
  for (const c of channels) {
    let set = listeners.get(c);
    if (!set) {
      set = new Set();
      listeners.set(c, set);
    }
    set.add(fn);
  }
  return () => {
    for (const c of channels) {
      const set = listeners.get(c);
      if (!set) continue;
      set.delete(fn);
      if (set.size === 0) listeners.delete(c);
    }
  };
}
