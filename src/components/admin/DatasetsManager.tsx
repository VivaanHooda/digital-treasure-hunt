"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Database, Plus, Trash2, Pencil, Lock, ChevronLeft, Image as ImageIcon, ScrollText,
  Upload, Link as LinkIcon, Loader2, CheckCircle, XCircle, Save,
} from "lucide-react";
import { apiGet, apiSend, ClientError } from "@/lib/client";

type DatasetRow = {
  id: string; name: string; challengeCount: number; pictureCount: number; riddleCount: number;
  used: boolean; locked: boolean; selected: boolean;
};
type Challenge = {
  id: string; position: number; type: "PICTURE" | "RIDDLE"; title: string; description: string;
  imageUrl: string | null; latitude: number; longitude: number; marginOfError: number; points: number;
};
type Draft = {
  type: "PICTURE" | "RIDDLE"; title: string; description: string; imageUrl: string;
  latitude: string; longitude: string; marginOfError: string; points: string;
};
const emptyDraft = (): Draft => ({
  type: "PICTURE", title: "", description: "", imageUrl: "",
  latitude: "", longitude: "", marginOfError: "50", points: "10",
});

async function uploadImage(file: File, datasetId: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("datasetId", datasetId);
  const r = await fetch("/api/admin/upload", { method: "POST", body: fd, credentials: "include" });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || "Upload failed");
  }
  return (await r.json()).url as string;
}

export function DatasetsManager() {
  const qc = useQueryClient();
  const [manageId, setManageId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 3500);
  };
  const onErr = (e: unknown) => flash(false, e instanceof ClientError ? e.message : e instanceof Error ? e.message : "Failed");

  const datasets = useQuery({ queryKey: ["adminDatasets"], queryFn: () => apiGet<{ datasets: DatasetRow[] }>("/api/admin/datasets") });
  const refetchDatasets = () => qc.invalidateQueries({ queryKey: ["adminDatasets"] });

  const createDs = useMutation({
    mutationFn: (name: string) => apiSend("/api/admin/datasets", "POST", { name }),
    onSuccess: () => { refetchDatasets(); setNewName(""); flash(true, "Dataset created"); },
    onError: onErr,
  });
  const renameDs = useMutation({
    mutationFn: (v: { id: string; name: string }) => apiSend(`/api/admin/datasets/${v.id}`, "PATCH", { name: v.name }),
    onSuccess: () => { refetchDatasets(); flash(true, "Renamed"); },
    onError: onErr,
  });
  const deleteDs = useMutation({
    mutationFn: (id: string) => apiSend(`/api/admin/datasets/${id}`, "DELETE"),
    onSuccess: () => { refetchDatasets(); flash(true, "Dataset deleted"); },
    onError: onErr,
  });

  const managed = datasets.data?.datasets.find((d) => d.id === manageId) ?? null;

  if (manageId && managed) {
    return (
      <ChallengeManager
        dataset={managed}
        onBack={() => setManageId(null)}
        onChanged={refetchDatasets}
        flash={flash}
        onErr={onErr}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-800/40 p-6 backdrop-blur-xl">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
        <Database className="h-5 w-5 text-indigo-400" /> Challenge Datasets
      </h2>

      {msg && (
        <div className={`mb-4 flex items-center gap-2 rounded-lg border p-2 text-sm ${msg.ok ? "border-green-500/50 bg-green-500/10 text-green-300" : "border-red-500/50 bg-red-500/10 text-red-300"}`}>
          {msg.ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />} {msg.text}
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New dataset name"
          className="flex-1 rounded-lg border border-gray-700/50 bg-gray-900/50 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
        />
        <button
          onClick={() => newName.trim() && createDs.mutate(newName.trim())}
          disabled={createDs.isPending || !newName.trim()}
          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Create
        </button>
      </div>

      <div className="space-y-2">
        {datasets.data?.datasets.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg border border-gray-700/40 bg-gray-900/40 p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{d.name}</span>
                {d.selected && <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-300">Selected</span>}
                {d.locked && <span className="flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-0.5 text-xs text-orange-300"><Lock className="h-3 w-3" /> Locked</span>}
                {d.used && !d.locked && <span className="rounded-full bg-gray-500/20 px-2 py-0.5 text-xs text-gray-300">Used</span>}
              </div>
              <p className="text-xs text-gray-400">{d.challengeCount} challenges · {d.pictureCount} pictures · {d.riddleCount} riddles</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setManageId(d.id)} className="rounded bg-blue-600/80 px-3 py-1.5 text-xs text-white hover:bg-blue-600">Manage</button>
              <button
                onClick={() => { const n = prompt("Rename dataset", d.name); if (n && n.trim()) renameDs.mutate({ id: d.id, name: n.trim() }); }}
                disabled={d.locked}
                className="rounded bg-gray-600/80 px-2 py-1.5 text-xs text-white hover:bg-gray-600 disabled:opacity-40"
                title="Rename"
              ><Pencil className="h-3.5 w-3.5" /></button>
              <button
                onClick={() => { if (confirm(`Delete dataset "${d.name}"? This cannot be undone.`)) deleteDs.mutate(d.id); }}
                disabled={d.used}
                className="rounded bg-red-600/80 px-2 py-1.5 text-xs text-white hover:bg-red-600 disabled:opacity-40"
                title={d.used ? "Used by a game — cannot delete" : "Delete"}
              ><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
        {datasets.data?.datasets.length === 0 && <p className="text-sm text-gray-400">No datasets yet. Create one above.</p>}
      </div>
    </div>
  );
}

function ChallengeManager({
  dataset, onBack, onChanged, flash, onErr,
}: {
  dataset: DatasetRow;
  onBack: () => void;
  onChanged: () => void;
  flash: (ok: boolean, text: string) => void;
  onErr: (e: unknown) => void;
}) {
  const qc = useQueryClient();
  const locked = dataset.locked;
  const key = ["adminChallenges", dataset.id];
  const challenges = useQuery({ queryKey: key, queryFn: () => apiGet<{ challenges: Challenge[] }>(`/api/admin/datasets/${dataset.id}/challenges`) });
  const refetch = () => { qc.invalidateQueries({ queryKey: key }); onChanged(); };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const toPayload = (d: Draft) => ({
    type: d.type,
    title: d.title.trim(),
    description: d.description.trim(),
    imageUrl: d.imageUrl.trim() || undefined,
    latitude: Number(d.latitude),
    longitude: Number(d.longitude),
    marginOfError: Math.round(Number(d.marginOfError)),
    points: Math.round(Number(d.points)),
  });

  const create = useMutation({
    mutationFn: () => apiSend(`/api/admin/datasets/${dataset.id}/challenges`, "POST", toPayload(draft)),
    onSuccess: () => { refetch(); setDraft(emptyDraft()); flash(true, "Challenge added"); },
    onError: onErr,
  });
  const update = useMutation({
    mutationFn: (id: string) => apiSend(`/api/admin/challenges/${id}`, "PATCH", toPayload(draft)),
    onSuccess: () => { refetch(); setEditingId(null); setDraft(emptyDraft()); flash(true, "Challenge updated"); },
    onError: onErr,
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiSend(`/api/admin/challenges/${id}`, "DELETE"),
    onSuccess: () => { refetch(); flash(true, "Challenge deleted"); },
    onError: onErr,
  });

  const startEdit = (c: Challenge) => {
    setEditingId(c.id);
    setDraft({
      type: c.type, title: c.title, description: c.description, imageUrl: c.imageUrl ?? "",
      latitude: String(c.latitude), longitude: String(c.longitude),
      marginOfError: String(c.marginOfError), points: String(c.points),
    });
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const input = "w-full rounded-lg border border-gray-700/50 bg-gray-900/50 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none disabled:opacity-50";

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-800/40 p-6 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-300 hover:text-white"><ChevronLeft className="h-4 w-4" /> All datasets</button>
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          {dataset.name}
          {locked && <span className="flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-0.5 text-xs text-orange-300"><Lock className="h-3 w-3" /> Locked</span>}
        </h2>
      </div>

      {locked && (
        <p className="mb-4 rounded-lg border border-orange-500/40 bg-orange-500/10 p-3 text-sm text-orange-300">
          This dataset is in use by a running game and cannot be edited until the game ends.
        </p>
      )}

      {/* Existing challenges */}
      <div className="mb-6 space-y-2">
        {challenges.data?.challenges.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-700/40 bg-gray-900/40 p-3">
            <div className="flex items-center gap-3 min-w-0">
              {c.type === "PICTURE" ? <ImageIcon className="h-4 w-4 flex-shrink-0 text-blue-400" /> : <ScrollText className="h-4 w-4 flex-shrink-0 text-purple-400" />}
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{c.position + 1}. {c.title}</p>
                <p className="text-xs text-gray-400">{c.points} pts · ±{c.marginOfError}m · {c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(c)} disabled={locked} className="rounded bg-gray-600/80 px-2 py-1.5 text-xs text-white hover:bg-gray-600 disabled:opacity-40"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => { if (confirm("Delete this challenge?")) remove.mutate(c.id); }} disabled={locked} className="rounded bg-red-600/80 px-2 py-1.5 text-xs text-white hover:bg-red-600 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
        {challenges.data?.challenges.length === 0 && <p className="text-sm text-gray-400">No challenges yet — add one below.</p>}
      </div>

      {/* Add / edit form */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-900/40 p-4">
        <h3 className="mb-3 font-semibold text-white">{editingId ? "Edit challenge" : "Add challenge"}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Labeled label="Challenge type">
            <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Draft["type"] })} disabled={locked} className={input}>
              <option value="PICTURE">Picture</option>
              <option value="RIDDLE">Riddle</option>
            </select>
          </Labeled>
          <Labeled label="Title (heading)">
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Front Gate" disabled={locked} className={input} />
          </Labeled>
          <Labeled label={draft.type === "RIDDLE" ? "Riddle text" : "Description"} className="sm:col-span-2">
            <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder={draft.type === "RIDDLE" ? "Write the riddle…" : "Describe the challenge…"} rows={2} disabled={locked} className={input} />
          </Labeled>
          <Labeled label="Latitude">
            <input value={draft.latitude} onChange={(e) => setDraft({ ...draft, latitude: e.target.value })} placeholder="12.92403" inputMode="decimal" disabled={locked} className={input} />
          </Labeled>
          <Labeled label="Longitude">
            <input value={draft.longitude} onChange={(e) => setDraft({ ...draft, longitude: e.target.value })} placeholder="77.50119" inputMode="decimal" disabled={locked} className={input} />
          </Labeled>
          <Labeled label="Margin of error (meters)">
            <input value={draft.marginOfError} onChange={(e) => setDraft({ ...draft, marginOfError: e.target.value })} placeholder="50" inputMode="numeric" disabled={locked} className={input} />
          </Labeled>
          <Labeled label="Points">
            <input value={draft.points} onChange={(e) => setDraft({ ...draft, points: e.target.value })} placeholder="10" inputMode="numeric" disabled={locked} className={input} />
          </Labeled>
        </div>

        <ImageInput
          value={draft.imageUrl}
          datasetId={dataset.id}
          disabled={locked}
          onChange={(url) => setDraft({ ...draft, imageUrl: url })}
          onErr={onErr}
        />

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => (editingId ? update.mutate(editingId) : create.mutate())}
            disabled={locked || create.isPending || update.isPending}
            className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {editingId ? "Save changes" : "Add challenge"}
          </button>
          {editingId && (
            <button onClick={() => { setEditingId(null); setDraft(emptyDraft()); }} className="rounded-lg bg-gray-600 px-4 py-2 font-semibold text-white hover:bg-gray-700">Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Labeled({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function ImageInput({
  value, datasetId, disabled, onChange, onErr,
}: {
  value: string; datasetId: string; disabled: boolean; onChange: (url: string) => void; onErr: (e: unknown) => void;
}) {
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [uploading, setUploading] = useState(false);
  const input = "w-full rounded-lg border border-gray-700/50 bg-gray-900/50 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none disabled:opacity-50";

  const onFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      onChange(await uploadImage(file, datasetId));
    } catch (e) {
      onErr(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm text-gray-300">Image</span>
        <div className="flex overflow-hidden rounded-lg border border-gray-700/50 text-xs">
          <button type="button" onClick={() => setMode("upload")} disabled={disabled} className={`flex items-center gap-1 px-2 py-1 ${mode === "upload" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300"}`}><Upload className="h-3 w-3" /> Upload</button>
          <button type="button" onClick={() => setMode("link")} disabled={disabled} className={`flex items-center gap-1 px-2 py-1 ${mode === "link" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300"}`}><LinkIcon className="h-3 w-3" /> Link</button>
        </div>
        <span className="text-xs text-gray-500">(required for pictures)</span>
      </div>

      {mode === "upload" ? (
        <input key="upload" type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled || uploading} onChange={(e) => onFile(e.target.files?.[0])} className={input} />
      ) : (
        <input key="link" type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://example.com/image.jpg" disabled={disabled} className={input} />
      )}

      {uploading && <p className="mt-1 flex items-center gap-1 text-xs text-gray-400"><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</p>}
      {value && (
        <div className="mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="preview" className="h-28 rounded-lg border border-gray-700/50 object-cover" />
        </div>
      )}
    </div>
  );
}
