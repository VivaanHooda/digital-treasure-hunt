"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, Crosshair, Radar, Power, type LucideIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";
import { LogoutConfirm } from "@/components/ui/LogoutConfirm";

interface DockItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

const ITEMS: DockItem[] = [
  { href: "/dashboard", label: "Control", Icon: Compass },
  { href: "/game", label: "Mission", Icon: Crosshair },
  { href: "/leaderboard", label: "Standings", Icon: Radar },
];

/* Hide the dock entirely on these route prefixes. */
const HIDDEN_ON = ["/login", "/register", "/admin"];

/* ───────────────────────────────────────────────────────────────────────────
   Dock — a floating, context-aware navigator. No bottom tab bar, no emoji.
   Small and elegant; the active destination carries the signal accent.
   ─────────────────────────────────────────────────────────────────────────── */
export function Dock() {
  const pathname = usePathname() ?? "";
  const hidden = HIDDEN_ON.some((p) => pathname.startsWith(p));
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (hidden) return null;

  return (
    <>
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...spring, delay: 0.2 }}
      className="fixed inset-x-0 bottom-[max(1rem,var(--safe-bottom))] z-40 flex justify-center px-4"
      aria-label="Primary"
    >
      <div className="flex items-center gap-1 rounded-full border border-line-strong bg-paper-3/90 p-1.5 shadow-dock backdrop-blur-md">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-2 rounded-full px-3.5 py-2 transition-colors duration-200",
                active ? "text-signal" : "text-ink-3 hover:text-ink",
              )}
            >
              {active && (
                <motion.span
                  layoutId="dock-active"
                  className="absolute inset-0 rounded-full bg-signal-soft"
                  transition={spring}
                />
              )}
              <Icon className="relative z-10 h-5 w-5" />
              <span
                className={cn(
                  "label relative z-10 !tracking-[0.16em] transition-all",
                  active ? "!text-signal max-w-24 opacity-100" : "max-w-0 overflow-hidden opacity-0 group-hover:max-w-24 group-hover:opacity-100",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
        <div className="mx-1 h-5 w-px bg-line-strong" />
        <button
          onClick={() => setConfirmOpen(true)}
          aria-label="Sign out"
          className="flex items-center rounded-full px-3 py-2 text-ink-3 transition-colors duration-200 hover:text-alert"
        >
          <Power className="h-5 w-5" />
        </button>
      </div>
    </motion.nav>

    <LogoutConfirm
      open={confirmOpen}
      onCancel={() => setConfirmOpen(false)}
      onConfirm={() => signOut({ redirectTo: "/login" })}
    />
    </>
  );
}
