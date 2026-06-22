"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Archive, Download, Trash2, Loader2, X, FileText } from "lucide-react";
import { useEventStream } from "@/hooks/useEventStream";
import { apiGet, apiSend, ClientError } from "@/lib/client";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { settle } from "@/lib/motion";

type Summary = {
  id: string; label: string; datasetName: string; startTime: string; durationMs: number;
  teamCount: number; topScore: number; finishedCount: number; archivedAt: string;
};
type Team = {
  rank: number; teamName: string; leaderName: string; leaderEmail: string; leaderMobile: string;
  leaderDepartment: string; members: { name: string; email: string | null; mobile: string; department: string }[];
  score: number; completedCount: number; skipsUsed: number; picturesCompleted: number;
  riddlesCompleted: number; total: number; finished: boolean; lastCompletedAt: string | null;
};
type Detail = Summary & { teams: Team[] };

const fmtDur = (ms: number) => `${Math.floor(ms / 3600000)}h ${Math.round((ms % 3600000) / 60000)}m`;
const fmtDate = (iso: string) => new Date(iso).toLocaleString();

export default function AdminArchivePage() {
  useEventStream(true);
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const flash = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 3500); };
  const onErr = (e: unknown) => flash(false, e instanceof ClientError ? e.message : "Failed");

  const archives = useQuery({ queryKey: ["adminArchives"], queryFn: () => apiGet<{ archives: Summary[] }>("/api/admin/archive") });
  const detail = useQuery({
    queryKey: ["adminArchive", openId],
    queryFn: () => apiGet<Detail>(`/api/admin/archive/${openId}`),
    enabled: !!openId,
  });

  const archiveNow = useMutation({
    mutationFn: () => apiSend<{ id: string; teamCount: number }>("/api/admin/archive", "POST", {}),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["adminArchives"] }); flash(true, `Archived ${r.teamCount} teams`); },
    onError: onErr,
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiSend(`/api/admin/archive/${id}`, "DELETE"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["adminArchives"] }); setOpenId(null); flash(true, "Archive deleted"); },
    onError: onErr,
  });

  const list = archives.data?.archives ?? [];

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link href="/admin" className="flex items-center gap-1.5 text-sm text-ink-2 transition-colors hover:text-ink">
            <ChevronLeft className="h-4 w-4" /> Command
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="label !text-signal">Records</span>
            <span className="font-serif text-xl text-ink">Game Archive</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-8">
        <AnimatePresence>
          {msg && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={settle}
              className={cn("mb-5 flex items-center gap-3 border-l-2 pl-4 text-sm", msg.ok ? "border-ok text-ok" : "border-alert text-alert")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", msg.ok ? "bg-ok" : "bg-alert")} /> {msg.text}
            </motion.div>
          )}
        </AnimatePresence>

        <Panel
          label="Past Games"
          aside={
            <Button size="sm" noMagnet disabled={archiveNow.isPending} onClick={() => archiveNow.mutate()}>
              {archiveNow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />} Archive current game
            </Button>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-line">
            {list.map((a) => (
              <li key={a.id} className="flex items-center gap-2 transition-colors hover:bg-paper-1">
                <button onClick={() => setOpenId(a.id)} className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 py-4 text-left">
                  <div className="min-w-0">
                    <p className="truncate font-serif text-lg text-ink">{a.label}</p>
                    <p className="data mt-0.5 truncate text-xs text-ink-3">
                      {a.datasetName} · {a.teamCount} teams · top {a.topScore} · {a.finishedCount} finished · {fmtDate(a.archivedAt)}
                    </p>
                  </div>
                </button>
                <a href={`/api/admin/archive/${a.id}/export`} download title="Export (.json)" className="shrink-0 rounded-md p-2 text-ink-3 transition-colors hover:text-signal"><Download className="h-4 w-4" /></a>
                <button onClick={() => { if (confirm(`Delete archive "${a.label}"?`)) remove.mutate(a.id); }} title="Delete" className="mr-1 shrink-0 rounded-md p-2 text-ink-3 transition-colors hover:text-alert"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
            {list.length === 0 && (
              <li className="label py-10 text-center">No archived games yet. Stop a game (or archive the current one) to record it here.</li>
            )}
          </ul>
        </Panel>
      </main>

      {/* Detail */}
      <Sheet open={!!openId} onClose={() => setOpenId(null)} draggable={false}>
        {detail.isLoading || !detail.data ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-signal" /></div>
        ) : (
          <div className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="label mb-2">Game Record</div>
                <h2 className="font-serif text-3xl text-ink">{detail.data.label}</h2>
              </div>
              <button onClick={() => setOpenId(null)} className="rounded-full p-2 text-ink-3 hover:text-ink"><X className="h-5 w-5" /></button>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-5 sm:grid-cols-4">
              {[
                ["Dataset", detail.data.datasetName],
                ["Duration", fmtDur(detail.data.durationMs)],
                ["Teams", String(detail.data.teamCount)],
                ["Top Score", String(detail.data.topScore)],
                ["Finished", String(detail.data.finishedCount)],
                ["Started", fmtDate(detail.data.startTime)],
                ["Archived", fmtDate(detail.data.archivedAt)],
              ].map(([k, v]) => (
                <div key={k}><dt className="label">{k}</dt><dd className="data mt-1 text-sm text-ink">{v}</dd></div>
              ))}
            </dl>

            <div className="label mb-3 mt-6">Final Standings</div>
            <ul className="divide-y divide-line">
              {detail.data.teams.map((t) => (
                <li key={t.rank} className="grid grid-cols-[2rem_1fr_auto] items-start gap-4 py-4">
                  <span className={cn("data text-lg tabular-nums", t.rank <= 3 ? "text-signal" : "text-ink-3")}>{String(t.rank).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-serif text-lg text-ink">{t.teamName}</span>
                      {t.finished && <span className="label !text-ok">Finished</span>}
                    </div>
                    <p className="data mt-0.5 truncate text-xs text-ink-3">{t.leaderName} · {t.leaderEmail} · {t.leaderMobile}</p>
                    <p className="data mt-0.5 text-xs text-ink-3">
                      {t.completedCount}/{t.total} solved · {t.picturesCompleted} pics · {t.riddlesCompleted} riddles · {t.skipsUsed} skips
                    </p>
                    {t.members.length > 0 && (
                      <p className="data mt-1 text-xs text-ink-3">
                        Members: {t.members.map((m) => (m.email ? `${m.name} (${m.email})` : m.name)).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right"><div className="data text-xl tabular-nums text-ink">{t.score}</div><div className="label">pts</div></div>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-3">
              <div className="flex gap-3">
                <a href={`/api/admin/archive/${detail.data.id}/attendance`} download className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line-strong py-3 text-sm text-ink transition-colors hover:border-signal/50 hover:bg-paper-2">
                  <FileText className="h-4 w-4" /> Attendance CSV
                </a>
                <a href={`/api/admin/archive/${detail.data.id}/export`} download className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line-strong py-3 text-sm text-ink transition-colors hover:border-signal/50 hover:bg-paper-2">
                  <Download className="h-4 w-4" /> Export JSON
                </a>
              </div>
              <Button variant="alert" size="lg" className="w-full" noMagnet disabled={remove.isPending} onClick={() => remove.mutate(detail.data!.id)}>
                {remove.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Trash2 className="h-4 w-4" /> Delete Archive</>}
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
