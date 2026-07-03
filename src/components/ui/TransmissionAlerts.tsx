"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { Radio, X } from "lucide-react";
import { useNotifications, type UserNotification } from "@/hooks/useGame";
import { useEventStream } from "@/hooks/useEventStream";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

const AUTO_DISMISS_MS = 9000;
const MAX_VISIBLE = 3;

const accentDot: Record<UserNotification["type"], string> = {
  info: "bg-signal",
  success: "bg-ok",
  warning: "bg-signal",
  error: "bg-alert",
};

/* ───────────────────────────────────────────────────────────────────────────
   TransmissionAlerts — a global listener that surfaces any admin broadcast as a
   live pop-up, no matter which page the operative is on. A fresh login is
   baselined so past broadcasts never replay in a stack; only transmissions that
   arrive after this session begins rise as capsules.
   ─────────────────────────────────────────────────────────────────────────── */
function AuthedAlerts() {
  // One SSE subscription for the whole authenticated app (invalidates queries).
  useEventStream(true);
  const { data } = useNotifications();

  const seen = useRef<Set<string>>(new Set());
  const baselined = useRef(false);
  const [toasts, setToasts] = useState<UserNotification[]>([]);

  useEffect(() => {
    // Wait for the first real fetch — the initial render has no data yet, and
    // baselining an empty set there would let existing transmissions pop later.
    if (!data) return;
    const notifications = data.notifications;

    // First fetch of the session: mark everything already live as seen so a new
    // login doesn't pop a backlog of old transmissions.
    if (!baselined.current) {
      notifications.forEach((n) => seen.current.add(n.id));
      baselined.current = true;
      return;
    }
    const fresh = notifications.filter((n) => !seen.current.has(n.id));
    if (fresh.length === 0) return;
    fresh.forEach((n) => seen.current.add(n.id));
    // Newest first; cap concurrent capsules so they never stack endlessly.
    setToasts((prev) => [...fresh, ...prev].slice(0, MAX_VISIBLE));
  }, [data]);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,var(--safe-top))] z-[55] flex flex-col items-center gap-2.5 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <Toast key={t.id} note={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ note, onDismiss }: { note: UserNotification; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={spring}
      className="pointer-events-auto w-full max-w-md rounded-2xl border border-line-strong bg-paper-3/95 px-4 py-3.5 shadow-dock backdrop-blur-md"
    >
      <div className="flex items-start gap-3">
        <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", accentDot[note.type])} />
        <div className="min-w-0 flex-1">
          <div className="label flex items-center gap-1.5 !text-ink-2 !tracking-[0.18em]">
            <Radio className="h-3 w-3" /> Incoming Transmission
          </div>
          {note.title && <p className="mt-1.5 font-serif text-lg leading-tight text-ink">{note.title}</p>}
          <p className={cn("break-words text-sm text-ink-2", note.title ? "mt-1" : "mt-1.5")}>{note.message}</p>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss transmission"
          className="-mr-1 -mt-0.5 shrink-0 rounded-full p-1.5 text-ink-3 transition-colors hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function TransmissionAlerts() {
  const { status } = useSession();
  // Only listen while authenticated — keeps the SSE stream and the notifications
  // query off the login / register screens.
  if (status !== "authenticated") return null;
  return <AuthedAlerts />;
}
