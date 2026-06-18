"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { capsuleVariants, spring } from "@/lib/motion";

interface IslandEvent {
  id: number;
  title: string;
  detail?: string;
}

interface IslandApi {
  /** Announce a capsule event; auto-collapses after a beat. */
  announce: (e: { title: string; detail?: string }) => void;
}

const Ctx = createContext<IslandApi | null>(null);

/** Push events to the floating capsule from anywhere in the tree. */
export function useDynamicIsland(): IslandApi {
  const api = useContext(Ctx);
  // Tolerate usage outside a provider (no-op) so screens stay decoupled.
  return api ?? { announce: () => {} };
}

export function DynamicIslandProvider({ children }: { children: React.ReactNode }) {
  const [event, setEvent] = useState<IslandEvent | null>(null);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((e: { title: string; detail?: string }) => {
    seq.current += 1;
    setEvent({ id: seq.current, ...e });
  }, []);

  useEffect(() => {
    if (!event) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setEvent(null), 4200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [event]);

  return (
    <Ctx.Provider value={{ announce }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,var(--safe-top))] z-50 flex justify-center px-4">
        <AnimatePresence mode="wait">
          {event && (
            <motion.div
              key={event.id}
              layout
              variants={capsuleVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              transition={spring}
              className="pointer-events-auto flex items-center gap-3 rounded-full border border-line-strong bg-paper-3/95 px-5 py-2.5 shadow-dock backdrop-blur-md"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-signal" />
              <span className="label !text-ink-2 !tracking-[0.18em]">{event.title}</span>
              {event.detail && (
                <span className="data text-sm font-medium text-signal">{event.detail}</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
