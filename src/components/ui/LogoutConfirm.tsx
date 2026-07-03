"use client";

import { Power } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";

/* ───────────────────────────────────────────────────────────────────────────
   LogoutConfirm — a rising file that confirms before ending the session. Shared
   by the Dock sign-out control and the Back-gesture guard so both paths ask the
   same question in the same voice.
   ─────────────────────────────────────────────────────────────────────────── */
export function LogoutConfirm({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Sheet open={open} onClose={onCancel} draggable={false}>
      <div className="pb-6">
        <div className="label mb-4 flex items-center gap-2">
          <Power className="h-3.5 w-3.5 text-alert" /> End Session
        </div>
        <h2 className="font-serif text-3xl text-ink">Sign out?</h2>
        <p className="mt-4 text-ink-2">
          You&apos;ll be returned to the login screen and will need to re-authenticate to resume the operation.
        </p>
        <div className="mt-8 flex gap-3">
          <Button variant="ghost" size="lg" className="flex-1" noMagnet onClick={onCancel}>
            Stay
          </Button>
          <Button variant="alert" size="lg" className="flex-1" noMagnet onClick={onConfirm}>
            Sign Out
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
