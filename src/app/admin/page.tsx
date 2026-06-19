"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Pause, Play, Square, Send, Download, Trash2, AlertTriangle, Loader2, LogOut, X, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useEventStream } from "@/hooks/useEventStream";
import { apiGet, apiSend, ClientError } from "@/lib/client";
import { Panel } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { springHeavy, settle } from "@/lib/motion";

type AdminSettings = {
  startTime: string;
  durationMs: number;
  isPaused: boolean;
  pausedAt: string | null;
  totalPauseMs: number;
  isActive: boolean;
  selectedDatasetId: string | null;
  selectedDatasetName: string | null;
};

type GameStatus = "IDLE" | "SCHEDULED" | "RUNNING" | "PAUSED" | "ENDED";

function deriveStatus(s: AdminSettings, now = Date.now()): GameStatus {
  if (!s.isActive) return "IDLE";
  const start = new Date(s.startTime).getTime();
  if (now < start) return "SCHEDULED";
  const activePause = s.isPaused && s.pausedAt ? now - new Date(s.pausedAt).getTime() : 0;
  const elapsed = now - start - (s.totalPauseMs + activePause);
  if (elapsed >= s.durationMs) return "ENDED";
  return s.isPaused ? "PAUSED" : "RUNNING";
}

const fmtMs = (ms: number) => {
  const x = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(x / 3600)).padStart(2, "0")}:${String(Math.floor((x % 3600) / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};
type DatasetOption = { id: string; name: string; challengeCount: number };
type Stats = { totalTeams: number; completedTeams: number; averageScore: number; topScore: number };
type AdminTeam = {
  id: string; teamName: string; leaderName: string; leaderEmail: string;
  leaderMobile: string; leaderDepartment: string; score: number;
  members: { name: string; mobile: string; department: string }[];
};
type AdminNote = {
  id: string; title: string; message: string; type: string; isActive: boolean; readCount: number; createdAt: string;
};

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

export default function AdminPage() {
  useEventStream(true);
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const settings = useQuery({ queryKey: ["adminSettings"], queryFn: () => apiGet<AdminSettings>("/api/admin/settings") });
  const datasets = useQuery({ queryKey: ["adminDatasets"], queryFn: () => apiGet<{ datasets: DatasetOption[] }>("/api/admin/datasets") });
  const stats = useQuery({ queryKey: ["adminStats"], queryFn: () => apiGet<Stats>("/api/admin/stats") });
  const teams = useQuery({ queryKey: ["adminTeams"], queryFn: () => apiGet<{ teams: AdminTeam[] }>("/api/admin/teams") });
  const notes = useQuery({ queryKey: ["adminNotes"], queryFn: () => apiGet<{ notifications: AdminNote[] }>("/api/admin/notifications") });

  const invalidate = (keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const pause = useMutation({
    mutationFn: (paused: boolean) => apiSend("/api/admin/pause", "POST", { paused }),
    onSuccess: () => { invalidate(["adminSettings"]); flash(true, "Updated pause state."); },
    onError: (e) => flash(false, e instanceof ClientError ? e.message : "Failed."),
  });
  const saveSettings = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiSend("/api/admin/settings", "PATCH", body),
    onSuccess: () => { invalidate(["adminSettings"]); flash(true, "Settings saved."); },
    onError: (e) => flash(false, e instanceof ClientError ? e.message : "Failed."),
  });
  const sendNote = useMutation({
    mutationFn: (body: { title?: string; message: string; type: string }) => apiSend("/api/admin/notifications", "POST", body),
    onSuccess: () => { invalidate(["adminNotes"]); flash(true, "Notification sent."); },
    onError: (e) => flash(false, e instanceof ClientError ? e.message : "Failed."),
  });
  const noteAction = useMutation({
    mutationFn: ({ id, method }: { id: string; method: "PATCH" | "DELETE" }) => apiSend(`/api/admin/notifications/${id}`, method),
    onSuccess: () => { invalidate(["adminNotes"]); flash(true, "Done."); },
    onError: (e) => flash(false, e instanceof ClientError ? e.message : "Failed."),
  });
  const reset = useMutation({
    mutationFn: () => apiSend<{ deleted: number }>("/api/admin/reset", "POST"),
    onSuccess: (r) => { invalidate(["adminTeams", "adminStats"]); flash(true, `Reset ${r.deleted} teams.`); setConfirmReset(false); },
    onError: (e) => flash(false, e instanceof ClientError ? e.message : "Failed."),
  });
  const startGame = useMutation({
    mutationFn: (body: { startTime: string; durationMs: number; selectedDatasetId: string }) => apiSend("/api/admin/game/start", "POST", body),
    onSuccess: () => { invalidate(["adminSettings", "adminDatasets"]); flash(true, "Game started."); },
    onError: (e) => flash(false, e instanceof ClientError ? e.message : "Failed."),
  });
  const stopGame = useMutation({
    mutationFn: (password: string) => apiSend("/api/admin/game/stop", "POST", { password }),
    onSuccess: () => { invalidate(["adminSettings", "adminDatasets", "adminTeams", "adminStats"]); flash(true, "Game stopped."); setShowStop(false); setStopPassword(""); },
    onError: (e) => flash(false, e instanceof ClientError ? e.message : "Failed."),
  });

  const [noteForm, setNoteForm] = useState({ title: "", message: "", type: "info" });
  const [startTime, setStartTime] = useState("");
  const [hours, setHours] = useState(2);
  const [minutes, setMinutes] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const [showStop, setShowStop] = useState(false);
  const [stopPassword, setStopPassword] = useState("");

  const s = settings.data;
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (s && !seeded) {
      setStartTime(toLocalInput(s.startTime));
      setHours(Math.floor(s.durationMs / 3600000));
      setMinutes(Math.round((s.durationMs % 3600000) / 60000));
      setSeeded(true);
    }
  }, [s, seeded]);

  return (
    <div className="min-h-dvh">
      {/* Command header */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 animate-breathe rounded-full bg-signal" />
            <span className="label !text-signal">Command</span>
            <span className="font-serif text-xl text-ink">Control</span>
          </div>
          <button
            onClick={() => signOut({ redirectTo: "/login" })}
            className="flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-sm text-ink-2 transition-colors hover:border-alert/50 hover:text-alert"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-5 pb-24 pt-8">
        {/* Flash */}
        <AnimatePresence>
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={settle}
              className={cn("flex items-center gap-3 border-l-2 pl-4 text-sm", msg.ok ? "border-ok text-ok" : "border-alert text-alert")}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", msg.ok ? "bg-ok" : "bg-alert")} />
              {msg.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-y-5 sm:grid-cols-4">
          {[
            ["Units", stats.data?.totalTeams],
            ["Completed", stats.data?.completedTeams],
            ["Avg Score", stats.data?.averageScore],
            ["Top Score", stats.data?.topScore],
          ].map(([label, value]) => (
            <div key={label as string} className="border-l border-line pl-4">
              <span className="label block">{label as string}</span>
              <span className="data mt-1 block text-2xl tabular-nums text-ink">{value ?? "—"}</span>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Game Control */}
          <Panel label="Operation Control">
            {!s ? (
              <p className="label py-6 text-center">Loading…</p>
            ) : (
              <GameControl
                s={s}
                datasets={datasets.data?.datasets ?? []}
                startTime={startTime}
                setStartTime={setStartTime}
                hours={hours}
                setHours={setHours}
                minutes={minutes}
                setMinutes={setMinutes}
                onSelectDataset={(id) => saveSettings.mutate({ selectedDatasetId: id })}
                onStart={() => {
                  if (!s.selectedDatasetId) { flash(false, "Select a dataset first."); return; }
                  startGame.mutate({ startTime: new Date(startTime).toISOString(), durationMs: (hours * 3600 + minutes * 60) * 1000, selectedDatasetId: s.selectedDatasetId });
                }}
                onPauseToggle={() => pause.mutate(!s.isPaused)}
                onStop={() => setShowStop(true)}
                starting={startGame.isPending}
                pausing={pause.isPending}
              />
            )}
          </Panel>

          {/* Operations */}
          <Panel label="Operations" bodyClassName="p-4 space-y-3">
            <Link
              href="/admin/datasets"
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper-1 px-4 py-3.5 text-ink transition-colors hover:border-signal/50 hover:bg-paper-2"
            >
              <span>Manage Challenge Datasets</span>
              <ChevronRight className="h-4 w-4 text-signal" />
            </Link>
            <a
              href="/api/admin/export"
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper-1 px-4 py-3.5 text-ink transition-colors hover:border-signal/50 hover:bg-paper-2"
            >
              <span>Download Attendance CSV</span>
              <Download className="h-4 w-4 text-signal" />
            </a>
            <button
              onClick={() => setShowTeams((v) => !v)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-paper-1 px-4 py-3.5 text-ink transition-colors hover:border-signal/50 hover:bg-paper-2"
            >
              <span>{showTeams ? "Hide" : "View"} Registered Units</span>
              <span className="data text-sm text-ink-2">{teams.data?.teams.length ?? 0}</span>
            </button>
            <button
              onClick={() => setConfirmReset(true)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-alert/30 px-4 py-3.5 text-alert transition-colors hover:bg-alert/10"
            >
              <span>Reset All Units</span>
              <Trash2 className="h-4 w-4" />
            </button>
            <p className="data text-xs leading-relaxed text-ink-3">
              Reset wipes all unit accounts &amp; progress. Stopping a game (in Operation Control) ends it but keeps units.
            </p>
          </Panel>
        </div>

        {/* Teams list */}
        <AnimatePresence>
          {showTeams && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={settle} className="overflow-hidden">
              <Panel label="Registered Units" bodyClassName="p-0">
                <ul className="divide-y divide-line">
                  {teams.data?.teams.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate font-serif text-lg text-ink">{t.teamName}</p>
                        <p className="data mt-0.5 truncate text-xs text-ink-3">{t.leaderName} · {t.leaderEmail} · {t.leaderMobile}</p>
                      </div>
                      <span className="data shrink-0 text-xl tabular-nums text-signal">{t.score}</span>
                    </li>
                  ))}
                  {teams.data?.teams.length === 0 && <li className="label px-4 py-6 text-center">No units registered</li>}
                </ul>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Broadcast */}
        <Panel label="Broadcast Transmission" bodyClassName="p-4">
          <div className="space-y-5">
            <Input label="Title (optional)" value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })} />
            <div>
              <label className="label mb-2 block">Message</label>
              <textarea
                rows={3}
                value={noteForm.message}
                onChange={(e) => setNoteForm({ ...noteForm, message: e.target.value })}
                className="w-full rounded-xl border border-line bg-paper-1 px-4 py-3 text-[16px] text-ink outline-none transition-colors placeholder:text-ink-3/70 focus:border-signal focus:bg-paper-2"
                placeholder="Transmission to all field units…"
              />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="sm:w-48">
                <Select
                  label="Severity"
                  value={noteForm.type}
                  onChange={(v) => setNoteForm({ ...noteForm, type: v })}
                  options={[
                    { value: "info", label: "Info" },
                    { value: "warning", label: "Warning" },
                    { value: "success", label: "Success" },
                    { value: "error", label: "Error" },
                  ]}
                />
              </div>
              <Button
                size="lg"
                noMagnet
                disabled={sendNote.isPending || !noteForm.message.trim()}
                onClick={() => { if (noteForm.message.trim()) { sendNote.mutate(noteForm); setNoteForm({ title: "", message: "", type: "info" }); } }}
              >
                <Send className="h-4 w-4" /> Transmit
              </Button>
            </div>
          </div>

          {(notes.data?.notifications.length ?? 0) > 0 && (
            <ul className="mt-6 divide-y divide-line border-t border-line">
              {notes.data?.notifications.map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {n.title && <p className="text-ink">{n.title}</p>}
                      <span className="label !text-ink-3">{n.type} · read {n.readCount}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-2">{n.message}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {n.isActive && (
                      <button onClick={() => noteAction.mutate({ id: n.id, method: "PATCH" })} className="rounded-md border border-line-strong px-2 py-1 text-xs text-ink-2 transition-colors hover:text-ink">Mute</button>
                    )}
                    <button onClick={() => noteAction.mutate({ id: n.id, method: "DELETE" })} className="rounded-md p-1.5 text-ink-3 transition-colors hover:text-alert"><X className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </main>

      {/* Reset confirmation */}
      <AnimatePresence>
        {confirmReset && (
          <Modal onClose={() => setConfirmReset(false)}>
            <AlertTriangle className="mb-4 h-8 w-8 text-alert" />
            <h3 className="font-serif text-3xl text-ink">Reset all units?</h3>
            <p className="mt-3 text-sm text-ink-2">This permanently deletes every unit, their operatives, and game progress. Admin is preserved.</p>
            <div className="mt-8 flex gap-3">
              <Button variant="ghost" size="lg" className="flex-1" noMagnet onClick={() => setConfirmReset(false)}>Cancel</Button>
              <Button variant="alert" size="lg" className="flex-1" noMagnet disabled={reset.isPending} onClick={() => reset.mutate()}>
                {reset.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Reset All"}
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Stop confirmation */}
      <AnimatePresence>
        {showStop && (
          <Modal onClose={() => { setShowStop(false); setStopPassword(""); }}>
            <Square className="mb-4 h-8 w-8 text-alert" />
            <h3 className="font-serif text-3xl text-ink">Stop &amp; discard game?</h3>
            <p className="mt-3 text-sm text-ink-2">This ends the running game for everyone and unlocks the dataset. Re-enter the admin password to confirm.</p>
            <div className="mt-6">
              <Input label="Admin Password" type="password" value={stopPassword} onChange={(e) => setStopPassword(e.target.value)} />
            </div>
            <div className="mt-8 flex gap-3">
              <Button variant="ghost" size="lg" className="flex-1" noMagnet onClick={() => { setShowStop(false); setStopPassword(""); }}>Cancel</Button>
              <Button variant="alert" size="lg" className="flex-1" noMagnet disabled={stopGame.isPending || !stopPassword} onClick={() => stopGame.mutate(stopPassword)}>
                {stopGame.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Stop Game"}
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

const statusStyles: Record<GameStatus, string> = {
  IDLE: "text-ink-3",
  SCHEDULED: "text-ink-2",
  RUNNING: "text-ok",
  PAUSED: "text-signal",
  ENDED: "text-alert",
};

function GameControl({
  s, datasets, startTime, setStartTime, hours, setHours, minutes, setMinutes,
  onSelectDataset, onStart, onPauseToggle, onStop, starting, pausing,
}: {
  s: AdminSettings;
  datasets: DatasetOption[];
  startTime: string; setStartTime: (v: string) => void;
  hours: number; setHours: (v: number) => void;
  minutes: number; setMinutes: (v: number) => void;
  onSelectDataset: (id: string | null) => void;
  onStart: () => void; onPauseToggle: () => void; onStop: () => void;
  starting: boolean; pausing: boolean;
}) {
  const now = Date.now();
  const status = deriveStatus(s, now);
  const armed = s.isActive;

  let timerLabel = "";
  let timerValue = "";
  if (status === "SCHEDULED") { timerLabel = "Starts in"; timerValue = fmtMs(new Date(s.startTime).getTime() - now); }
  else if (status === "RUNNING" || status === "PAUSED") {
    const activePause = s.isPaused && s.pausedAt ? now - new Date(s.pausedAt).getTime() : 0;
    const left = s.durationMs - (now - new Date(s.startTime).getTime() - (s.totalPauseMs + activePause));
    timerLabel = s.isPaused ? "Paused — left" : "Ends in";
    timerValue = fmtMs(left);
  }

  return (
    <div className="space-y-5">
      {/* status row */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <span className="label block">Status</span>
          <span className={cn("data mt-1 block text-2xl", statusStyles[status])}>{status}</span>
        </div>
        {timerValue && (
          <div className="text-right">
            <span className="label block">{timerLabel}</span>
            <span className="data mt-1 block text-2xl tabular-nums text-ink">{timerValue}</span>
          </div>
        )}
        {status === "ENDED" && <span className="data text-2xl text-alert">Ended</span>}
      </div>

      {!armed ? (
        <div className="space-y-5">
          <Input label="Start Time" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Duration — Hours" type="number" min={0} max={23} value={hours} onChange={(e) => setHours(+e.target.value)} />
            <Input label="Duration — Minutes" type="number" min={0} max={59} value={minutes} onChange={(e) => setMinutes(+e.target.value)} />
          </div>
          <Select
            label="Challenge Dataset"
            value={s.selectedDatasetId ?? ""}
            onChange={(v) => onSelectDataset(v || null)}
            options={datasets.map((d) => ({ value: d.id, label: `${d.name} (${d.challengeCount})` }))}
            placeholder="Select a dataset"
          />
          <Button size="lg" noMagnet className="w-full" disabled={starting} onClick={onStart}>
            {starting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Play className="h-5 w-5" /> Start Game</>}
          </Button>
          <p className="data text-xs leading-relaxed text-ink-3">
            Use a start time of now (or earlier) to begin immediately, or a future time to schedule. Settings lock once the game starts.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-y-4">
            <div><dt className="label">Dataset</dt><dd className="mt-1 text-ink">{s.selectedDatasetName ?? "—"}</dd></div>
            <div><dt className="label">Duration</dt><dd className="data mt-1 text-ink">{Math.floor(s.durationMs / 3600000)}h {Math.round((s.durationMs % 3600000) / 60000)}m</dd></div>
            <div className="col-span-2"><dt className="label">Start</dt><dd className="data mt-1 text-ink">{new Date(s.startTime).toLocaleString()}</dd></div>
          </dl>
          {(status === "RUNNING" || status === "PAUSED") && (
            <Button size="lg" noMagnet className="w-full" variant={s.isPaused ? "primary" : "outline"} disabled={pausing} onClick={onPauseToggle}>
              {s.isPaused ? <><Play className="h-5 w-5" /> Resume</> : <><Pause className="h-5 w-5" /> Pause</>}
            </Button>
          )}
          <Button size="lg" noMagnet className="w-full" variant="alert" onClick={onStop}>
            <Square className="h-5 w-5" /> Stop &amp; Discard Game
          </Button>
          <p className="data text-xs leading-relaxed text-ink-3">
            Settings are locked while a game is armed. Stop the game to reconfigure or pick a different dataset.
          </p>
        </div>
      )}
    </div>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={settle}
      className="fixed inset-0 z-50 flex items-center justify-center bg-paper/80 px-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10 }}
        transition={springHeavy}
        className="w-full max-w-sm rounded-2xl border border-line-strong bg-paper-2 p-7 shadow-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
