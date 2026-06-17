"use client";

import { Bell, X } from "lucide-react";
import { useNotifications, useDismissNotification } from "@/hooks/useGame";

const typeStyles: Record<string, string> = {
  info: "border-blue-500/50 bg-blue-500/10 text-blue-200",
  warning: "border-orange-500/50 bg-orange-500/10 text-orange-200",
  success: "border-green-500/50 bg-green-500/10 text-green-200",
  error: "border-red-500/50 bg-red-500/10 text-red-200",
};

/** Floating stack of admin notifications the user hasn't dismissed. */
export function UserNotifications() {
  const { data } = useNotifications();
  const dismiss = useDismissNotification();
  const notifications = data?.notifications ?? [];

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-3">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`rounded-xl border p-4 shadow-lg backdrop-blur-md ${typeStyles[n.type] ?? typeStyles.info}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Bell className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">{n.title ?? "Notification"}</p>
                <p className="mt-1 text-sm opacity-90">{n.message}</p>
              </div>
            </div>
            <button
              onClick={() => dismiss.mutate(n.id)}
              aria-label="Dismiss"
              className="rounded-md p-1 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
