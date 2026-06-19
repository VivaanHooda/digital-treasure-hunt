"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEventStream } from "@/hooks/useEventStream";
import { DatasetsManager } from "@/components/admin/DatasetsManager";

export default function AdminDatasetsPage() {
  useEventStream(true);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link href="/admin" className="flex items-center gap-1.5 text-sm text-ink-2 transition-colors hover:text-ink">
            <ChevronLeft className="h-4 w-4" /> Command
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="label !text-signal">Archive</span>
            <span className="font-serif text-xl text-ink">Datasets</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-8">
        <DatasetsManager />
      </main>
    </div>
  );
}
