"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Shield, Settings, Pause, Play, Square, Clock, Bell, Send, Users, Download, Trash2, Database,
  AlertTriangle, Loader2, LogOut, CheckCircle, XCircle,
} from "lucide-react";
import { PageBackground } from "@/components/PageBackground";
import { useEventStream } from "@/hooks/useEventStream";
import { apiGet, apiSend, ClientError } from "@/lib/client";
import { DatasetsManager } from "@/components/admin/DatasetsManager";

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
  // 1s tick so the live status/timer recompute (e.g. SCHEDULED → RUNNING → ENDED).
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

  // Seed local form state once settings load.
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

  const card = "rounded-2xl border border-gray-700/50 bg-gray-800/40 p-6 backdrop-blur-xl";
  const input = "w-full rounded-lg border border-gray-700/50 bg-gray-900/50 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none";

  return (
    <div className="min-h-screen">
      <PageBackground />
      <nav className="border-b border-gray-700/50 bg-gray-900/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-white">
            <Shield className="h-6 w-6 text-red-500" /> Admin Control Panel
          </div>
          <button
            onClick={() => signOut({ redirectTo: "/login" })}
            className="flex items-center gap-1 rounded-lg bg-red-600/80 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {msg && (
          <div className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${msg.ok ? "border-green-500/50 bg-green-500/10 text-green-300" : "border-red-500/50 bg-red-500/10 text-red-300"}`}>
            {msg.ok ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />} {msg.text}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatBox label="Teams" value={stats.data?.totalTeams} />
          <StatBox label="Completed" value={stats.data?.completedTeams} />
          <StatBox label="Avg Score" value={stats.data?.averageScore} />
          <StatBox label="Top Score" value={stats.data?.topScore} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Game Control */}
          <div className={card}>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><Settings className="h-5 w-5 text-cyan-400" /> Game Control</h2>
            {!s ? (
              <p className="text-gray-400">Loading…</p>
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
                input={input}
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
          </div>

          {/* Actions */}
          <div className={card}>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><Database className="h-5 w-5 text-purple-400" /> Game Actions</h2>
            <a
              href="/api/admin/export"
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 font-semibold text-white hover:bg-teal-700"
            >
              <Download className="h-5 w-5" /> Download Attendance CSV
            </a>
            <button
              onClick={() => setShowTeams((v) => !v)}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
            >
              <Users className="h-5 w-5" /> {showTeams ? "Hide" : "View"} Teams ({teams.data?.teams.length ?? 0})
            </button>
            <button
              onClick={() => setConfirmReset(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-700"
            >
              <Trash2 className="h-5 w-5" /> Reset All Teams
            </button>
            <p className="mt-3 text-xs text-gray-500">Reset wipes all team accounts &amp; progress. Stopping a game (in Game Control) ends it but keeps teams.</p>
          </div>
        </div>

        {/* Teams table */}
        {showTeams && (
          <div className={card}>
            <h2 className="mb-4 text-lg font-bold text-white">Registered Teams</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-gray-400">
                  <tr><th className="p-2">Team</th><th className="p-2">Leader</th><th className="p-2">Email</th><th className="p-2">Phone</th><th className="p-2 text-right">Score</th></tr>
                </thead>
                <tbody>
                  {teams.data?.teams.map((t) => (
                    <tr key={t.id} className="border-t border-gray-700/30 text-gray-200">
                      <td className="p-2 font-medium">{t.teamName}</td>
                      <td className="p-2">{t.leaderName}</td>
                      <td className="p-2">{t.leaderEmail}</td>
                      <td className="p-2">{t.leaderMobile}</td>
                      <td className="p-2 text-right font-bold text-cyan-300">{t.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Challenge Datasets */}
        <DatasetsManager />

        {/* Notifications */}
        <div className={card}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><Bell className="h-5 w-5 text-yellow-400" /> Send Notification</h2>
          <input className={input} placeholder="Title (optional)" value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })} />
          <textarea className={`${input} mt-3`} rows={3} placeholder="Message" value={noteForm.message} onChange={(e) => setNoteForm({ ...noteForm, message: e.target.value })} />
          <div className="mt-3 flex gap-3">
            <select className={input} value={noteForm.type} onChange={(e) => setNoteForm({ ...noteForm, type: e.target.value })}>
              <option value="info">Info</option><option value="warning">Warning</option><option value="success">Success</option><option value="error">Error</option>
            </select>
            <button
              onClick={() => { if (noteForm.message.trim()) { sendNote.mutate(noteForm); setNoteForm({ title: "", message: "", type: "info" }); } }}
              disabled={sendNote.isPending || !noteForm.message.trim()}
              className="flex items-center gap-2 rounded-xl bg-yellow-600 px-5 py-2.5 font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> Send
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {notes.data?.notifications.map((n) => (
              <div key={n.id} className="flex items-center justify-between rounded-lg border border-gray-700/40 bg-gray-900/40 p-3">
                <div>
                  <p className="font-medium text-white">{n.title} <span className="text-xs text-gray-400">({n.type}, read by {n.readCount})</span></p>
                  <p className="text-sm text-gray-300">{n.message}</p>
                </div>
                <div className="flex gap-2">
                  {n.isActive && (
                    <button onClick={() => noteAction.mutate({ id: n.id, method: "PATCH" })} className="rounded bg-orange-600/80 px-2 py-1 text-xs text-white hover:bg-orange-600">Deactivate</button>
                  )}
                  <button onClick={() => noteAction.mutate({ id: n.id, method: "DELETE" })} className="rounded bg-red-600/80 px-2 py-1 text-xs text-white hover:bg-red-600">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/50 bg-gray-800 p-6 text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
            <h3 className="mb-2 text-lg font-bold text-white">Reset all teams?</h3>
            <p className="mb-5 text-sm text-gray-300">This permanently deletes every team, their members, and game progress. Admin is preserved.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmReset(false)} className="flex-1 rounded-xl bg-gray-600 py-3 font-semibold text-white hover:bg-gray-700">Cancel</button>
              <button onClick={() => reset.mutate()} disabled={reset.isPending} className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {reset.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Reset All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stop game confirmation (password-gated) */}
      {showStop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/50 bg-gray-800 p-6 text-center">
            <Square className="mx-auto mb-3 h-10 w-10 text-red-400" />
            <h3 className="mb-2 text-lg font-bold text-white">Stop &amp; discard game?</h3>
            <p className="mb-4 text-sm text-gray-300">This ends the running game for everyone and unlocks the dataset. Re-enter the admin password to confirm.</p>
            <input
              type="password"
              value={stopPassword}
              onChange={(e) => setStopPassword(e.target.value)}
              placeholder="Admin password"
              className="mb-4 w-full rounded-lg border border-gray-700/50 bg-gray-900/50 px-3 py-2.5 text-white focus:border-red-400 focus:outline-none"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowStop(false); setStopPassword(""); }} className="flex-1 rounded-xl bg-gray-600 py-3 font-semibold text-white hover:bg-gray-700">Cancel</button>
              <button onClick={() => stopGame.mutate(stopPassword)} disabled={stopGame.isPending || !stopPassword} className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {stopGame.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Stop Game"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const statusStyles: Record<GameStatus, string> = {
  IDLE: "text-gray-300",
  SCHEDULED: "text-blue-300",
  RUNNING: "text-green-300",
  PAUSED: "text-orange-300",
  ENDED: "text-red-300",
};

function GameControl({
  s, datasets, startTime, setStartTime, hours, setHours, minutes, setMinutes, input,
  onSelectDataset, onStart, onPauseToggle, onStop, starting, pausing,
}: {
  s: AdminSettings;
  datasets: DatasetOption[];
  startTime: string; setStartTime: (v: string) => void;
  hours: number; setHours: (v: number) => void;
  minutes: number; setMinutes: (v: number) => void;
  input: string;
  onSelectDataset: (id: string | null) => void;
  onStart: () => void; onPauseToggle: () => void; onStop: () => void;
  starting: boolean; pausing: boolean;
}) {
  const now = Date.now();
  const status = deriveStatus(s, now);
  const armed = s.isActive;

  let timer: React.ReactNode = <span className="text-sm text-gray-400">No game scheduled</span>;
  if (status === "SCHEDULED") timer = <Timer label="Starts in" value={fmtMs(new Date(s.startTime).getTime() - now)} />;
  else if (status === "RUNNING" || status === "PAUSED") {
    const activePause = s.isPaused && s.pausedAt ? now - new Date(s.pausedAt).getTime() : 0;
    const left = s.durationMs - (now - new Date(s.startTime).getTime() - (s.totalPauseMs + activePause));
    timer = <Timer label={s.isPaused ? "Paused — time left" : "Ends in"} value={fmtMs(left)} />;
  } else if (status === "ENDED") timer = <span className="text-lg font-bold text-red-300">Ended</span>;

  return (
    <>
      <div className="mb-4 flex items-center justify-between rounded-xl border border-gray-700/50 bg-gray-900/40 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Status</p>
          <p className={`text-lg font-bold ${statusStyles[status]}`}>{status}</p>
        </div>
        {timer}
      </div>

      {!armed ? (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">Start time</label>
            <input type="datetime-local" className={input} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">Duration — hours</label>
              <input type="number" min={0} max={23} className={input} value={hours} onChange={(e) => setHours(+e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">Duration — minutes</label>
              <input type="number" min={0} max={59} className={input} value={minutes} onChange={(e) => setMinutes(+e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">Challenge dataset</label>
            <select className={input} value={s.selectedDatasetId ?? ""} onChange={(e) => onSelectDataset(e.target.value || null)}>
              <option value="">— Select a dataset —</option>
              {datasets.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.challengeCount})</option>)}
            </select>
          </div>
          <button onClick={onStart} disabled={starting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50">
            <Play className="h-5 w-5" /> Start Game
          </button>
          <p className="text-xs text-gray-500">Use a start time of now (or earlier) to begin immediately, or a future time to schedule. Settings lock once the game starts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-gray-400">Dataset</dt><dd className="font-medium text-white">{s.selectedDatasetName ?? "—"}</dd></div>
            <div><dt className="text-gray-400">Duration</dt><dd className="font-medium text-white">{Math.floor(s.durationMs / 3600000)}h {Math.round((s.durationMs % 3600000) / 60000)}m</dd></div>
            <div className="col-span-2"><dt className="text-gray-400">Start</dt><dd className="font-medium text-white">{new Date(s.startTime).toLocaleString()}</dd></div>
          </dl>
          {(status === "RUNNING" || status === "PAUSED") && (
            <button onClick={onPauseToggle} disabled={pausing} className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white disabled:opacity-50 ${s.isPaused ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}`}>
              {s.isPaused ? <><Play className="h-5 w-5" /> Resume</> : <><Pause className="h-5 w-5" /> Pause</>}
            </button>
          )}
          <button onClick={onStop} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-700">
            <Square className="h-5 w-5" /> Stop &amp; Discard Game
          </button>
          <p className="text-xs text-gray-500">Settings are locked while a game is armed. Stop the game to reconfigure or pick a different dataset.</p>
        </div>
      )}
    </>
  );
}

function Timer({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="flex items-center justify-end gap-1 text-xs uppercase tracking-wide text-gray-400"><Clock className="h-3 w-3" /> {label}</p>
      <p className="font-mono text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-800/40 p-4 text-center backdrop-blur-xl">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-white">{value ?? "—"}</p>
    </div>
  );
}
