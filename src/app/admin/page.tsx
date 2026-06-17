"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Shield, Settings, Pause, Play, Bell, Send, Users, Download, Trash2, Database,
  AlertTriangle, Loader2, LogOut, CheckCircle, XCircle,
} from "lucide-react";
import { PageBackground } from "@/components/PageBackground";
import { useEventStream } from "@/hooks/useEventStream";
import { apiGet, apiSend, ClientError } from "@/lib/client";

type AdminSettings = {
  startTime: string;
  durationMs: number;
  isPaused: boolean;
  isActive: boolean;
  selectedDataset: "A" | "B";
};
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
  const qc = useQueryClient();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const settings = useQuery({ queryKey: ["adminSettings"], queryFn: () => apiGet<AdminSettings>("/api/admin/settings") });
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

  const [noteForm, setNoteForm] = useState({ title: "", message: "", type: "info" });
  const [startTime, setStartTime] = useState("");
  const [hours, setHours] = useState(2);
  const [minutes, setMinutes] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showTeams, setShowTeams] = useState(false);

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
          {/* Settings */}
          <div className={card}>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><Settings className="h-5 w-5 text-cyan-400" /> Game Settings</h2>
            <label className="mb-1 block text-sm text-gray-300">Start time</label>
            <input type="datetime-local" className={input} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-gray-300">Hours</label>
                <input type="number" min={0} max={23} className={input} value={hours} onChange={(e) => setHours(+e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-300">Minutes</label>
                <input type="number" min={0} max={59} className={input} value={minutes} onChange={(e) => setMinutes(+e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-sm text-gray-300">Challenge dataset (affects new games only)</label>
              <select
                className={input}
                value={s?.selectedDataset ?? "A"}
                onChange={(e) => saveSettings.mutate({ selectedDataset: e.target.value })}
              >
                <option value="A">Set A</option>
                <option value="B">Set B</option>
              </select>
            </div>
            <button
              onClick={() => saveSettings.mutate({ startTime: new Date(startTime).toISOString(), durationMs: (hours * 3600 + minutes * 60) * 1000 })}
              disabled={saveSettings.isPending}
              className="mt-4 w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              Save Settings
            </button>
          </div>

          {/* Actions */}
          <div className={card}>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><Database className="h-5 w-5 text-purple-400" /> Game Actions</h2>
            <button
              onClick={() => pause.mutate(!s?.isPaused)}
              disabled={pause.isPending || !s}
              className={`mb-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white disabled:opacity-50 ${s?.isPaused ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}`}
            >
              {s?.isPaused ? <><Play className="h-5 w-5" /> Resume Game</> : <><Pause className="h-5 w-5" /> Pause Game</>}
            </button>
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
