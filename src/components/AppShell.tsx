"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, MapPin, Trophy, LayoutDashboard } from "lucide-react";
import { useEventStream } from "@/hooks/useEventStream";
import { UserNotifications } from "./UserNotifications";
import { PageBackground } from "./PageBackground";

/** Shared chrome for authenticated player pages: nav, live updates, toasts. */
export function AppShell({ children }: { children: React.ReactNode }) {
  // Subscribe to real-time updates for the whole authenticated area.
  useEventStream(true);

  return (
    <div className="min-h-screen">
      <PageBackground />
      <nav className="border-b border-gray-700/50 bg-gray-900/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white">
            <MapPin className="h-6 w-6 text-cyan-400" />
            Treasure Hunt
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <NavLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
            <NavLink href="/game" icon={<MapPin className="h-4 w-4" />} label="Game" />
            <NavLink href="/leaderboard" icon={<Trophy className="h-4 w-4" />} label="Leaderboard" />
            <button
              onClick={() => signOut({ redirectTo: "/login" })}
              className="flex items-center gap-1 rounded-lg bg-red-600/80 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <UserNotifications />
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
