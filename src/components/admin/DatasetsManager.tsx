"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus, Trash2, Pencil, Lock, ChevronLeft, ChevronRight, Image as ImageIcon, ScrollText,
  Upload, Link as LinkIcon, Loader2, Save, Download, FileUp,
} from "lucide-react";
import { apiGet, apiSend, ClientError } from "@/lib/client";
import { Panel } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { settle } from "@/lib/motion";

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

const textareaCls =
  "w-full rounded-xl border border-line bg-paper-1 px-4 py-3 text-[16px] text-ink outline-none transition-colors placeholder:text-ink-3/70 focus:border-signal focus:bg-paper-2 disabled:opacity-50";

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

function Flash({ msg }: { msg: { ok: boolean; text: string } | null }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={settle}
          className={cn("mb-4 flex items-center gap-3 border-l-2 pl-4 text-sm", msg.ok ? "border-ok text-ok" : "border-alert text-alert")}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", msg.ok ? "bg-ok" : "bg-alert")} />
          {msg.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
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

  const [importing, setImporting] = useState(false);
  const onImportFile = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/admin/datasets/import", { method: "POST", body: fd, credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Import failed");
      refetchDatasets();
      flash(true, `Imported “${data.name}” · ${data.count} challenges`);
    } catch (e) {
      onErr(e);
    } finally {
      setImporting(false);
    }
  };

  const managed = datasets.data?.datasets.find((d) => d.id === manageId) ?? null;

  if (manageId && managed) {
    return <ChallengeManager dataset={managed} onBack={() => setManageId(null)} onChanged={refetchDatasets} flash={flash} onErr={onErr} />;
  }

  return (
    <Panel label="Challenge Datasets" bodyClassName="p-4">
      <Flash msg={msg} />

      <div className="mb-4 flex items-end gap-3">
        <div className="flex-1">
          <Input label="New Dataset" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </div>
        <Button noMagnet disabled={createDs.isPending || !newName.trim()} onClick={() => newName.trim() && createDs.mutate(newName.trim())}>
          <Plus className="h-4 w-4" /> Create
        </Button>
      </div>

      {/* Import a portable .thds.json export from any deployment */}
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-line pb-5">
        <p className="data text-xs text-ink-3">Move datasets between deployments — export below, or import a file.</p>
        <label className={cn(
          "flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-line-strong px-3 py-2 text-sm text-ink-2 transition-colors hover:border-ink-3 hover:text-ink",
          importing && "pointer-events-none opacity-50",
        )}>
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          {importing ? "Importing…" : "Import dataset"}
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => { onImportFile(e.target.files?.[0]); e.currentTarget.value = ""; }}
          />
        </label>
      </div>

      <ul className="divide-y divide-line border-t border-line">
        {datasets.data?.datasets.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-serif text-lg text-ink">{d.name}</span>
                {d.selected && <span className="label !text-signal">Selected</span>}
                {d.locked && <span className="flex items-center gap-1 label !text-signal"><Lock className="h-3 w-3" /> Locked</span>}
                {d.used && !d.locked && <span className="label !text-ink-3">Used</span>}
              </div>
              <p className="data mt-1 text-xs text-ink-3">{d.challengeCount} challenges · {d.pictureCount} pictures · {d.riddleCount} riddles</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" variant="outline" noMagnet onClick={() => setManageId(d.id)}>Manage</Button>
              <a
                href={`/api/admin/datasets/${d.id}/export`}
                download
                title="Export (.json)"
                className="rounded-md p-2 text-ink-3 transition-colors hover:text-signal"
              ><Download className="h-4 w-4" /></a>
              <button
                onClick={() => { const n = prompt("Rename dataset", d.name); if (n && n.trim()) renameDs.mutate({ id: d.id, name: n.trim() }); }}
                disabled={d.locked}
                title="Rename"
                className="rounded-md p-2 text-ink-3 transition-colors hover:text-ink disabled:opacity-30"
              ><Pencil className="h-4 w-4" /></button>
              <button
                onClick={() => { if (confirm(`Delete dataset "${d.name}"? This cannot be undone.`)) deleteDs.mutate(d.id); }}
                disabled={d.used}
                title={d.used ? "Used by a game — cannot delete" : "Delete"}
                className="rounded-md p-2 text-ink-3 transition-colors hover:text-alert disabled:opacity-30"
              ><Trash2 className="h-4 w-4" /></button>
            </div>
          </li>
        ))}
        {datasets.data?.datasets.length === 0 && <li className="label py-6 text-center">No datasets yet. Create one above.</li>}
      </ul>
    </Panel>
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

  const [editorOpen, setEditorOpen] = useState(false);
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
    onSuccess: () => { refetch(); setEditorOpen(false); setDraft(emptyDraft()); flash(true, "Challenge added"); },
    onError: onErr,
  });
  const update = useMutation({
    mutationFn: (id: string) => apiSend(`/api/admin/challenges/${id}`, "PATCH", toPayload(draft)),
    onSuccess: () => { refetch(); setEditorOpen(false); setEditingId(null); setDraft(emptyDraft()); flash(true, "Challenge updated"); },
    onError: onErr,
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiSend(`/api/admin/challenges/${id}`, "DELETE"),
    onSuccess: () => { refetch(); flash(true, "Challenge deleted"); },
    onError: onErr,
  });

  const list = challenges.data?.challenges ?? [];
  const loadDraft = (c: Challenge) => setDraft({
    type: c.type, title: c.title, description: c.description, imageUrl: c.imageUrl ?? "",
    latitude: String(c.latitude), longitude: String(c.longitude),
    marginOfError: String(c.marginOfError), points: String(c.points),
  });
  const openAdd = () => { setEditingId(null); setDraft(emptyDraft()); setEditorOpen(true); };
  const openEdit = (c: Challenge) => {
    if (locked) return;
    setEditingId(c.id);
    loadDraft(c);
    setEditorOpen(true);
  };
  // Step to an adjacent challenge while the editor is open (discards unsaved edits).
  const currentIndex = editingId ? list.findIndex((c) => c.id === editingId) : -1;
  const step = (delta: number) => {
    const next = list[currentIndex + delta];
    if (next) { setEditingId(next.id); loadDraft(next); }
  };
  const saving = create.isPending || update.isPending;

  return (
    <Panel label={dataset.name} bodyClassName="p-4" aside={locked ? <span className="flex items-center gap-1 label !text-signal"><Lock className="h-3 w-3" /> Locked</span> : undefined}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-ink-2 transition-colors hover:text-ink">
          <ChevronLeft className="h-4 w-4" /> All datasets
        </button>
        <Button size="sm" noMagnet disabled={locked} onClick={openAdd}><Plus className="h-4 w-4" /> Add Challenge</Button>
      </div>

      {locked && (
        <p className="mb-5 border-l-2 border-signal pl-4 text-sm text-ink-2">
          This dataset is in use by a running game and cannot be edited until the game ends.
        </p>
      )}

      {/* Challenges — click any row to edit (opens the editor sheet) */}
      <ul className="divide-y divide-line border-y border-line">
        {challenges.data?.challenges.map((c) => (
          <li key={c.id} className="flex items-center gap-2 rounded-lg transition-colors hover:bg-paper-1">
            <button
              onClick={() => openEdit(c)}
              disabled={locked}
              className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-2 text-left disabled:cursor-default"
            >
              {c.type === "PICTURE" ? <ImageIcon className="h-4 w-4 shrink-0 text-signal" /> : <ScrollText className="h-4 w-4 shrink-0 text-ink-2" />}
              <div className="min-w-0">
                <p className="truncate text-ink">{c.position + 1}. {c.title}</p>
                <p className="data mt-0.5 truncate text-xs text-ink-3">{c.points} pts · ±{c.marginOfError}m · {c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}</p>
              </div>
            </button>
            <button
              onClick={() => { if (confirm("Delete this challenge?")) remove.mutate(c.id); }}
              disabled={locked}
              className="mr-1 shrink-0 rounded-md p-2 text-ink-3 transition-colors hover:text-alert disabled:opacity-30"
              title="Delete"
            ><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
        {challenges.data?.challenges.length === 0 && <li className="label py-6 text-center">No challenges yet — add one above.</li>}
      </ul>

      {/* Editor — rises in place; no scrolling past challenges to reach a form */}
      <Sheet open={editorOpen} onClose={() => setEditorOpen(false)} draggable={false}>
        <div className="pb-2">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="label">{editingId ? "Edit Challenge" : "New Challenge"}</div>
            {editingId && currentIndex >= 0 && list.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => step(-1)}
                  disabled={currentIndex <= 0}
                  className="rounded-md border border-line-strong p-1.5 text-ink-2 transition-colors hover:text-ink disabled:opacity-30"
                  aria-label="Previous challenge"
                ><ChevronLeft className="h-4 w-4" /></button>
                <span className="data px-1 text-xs tabular-nums text-ink-3">{currentIndex + 1}/{list.length}</span>
                <button
                  onClick={() => step(1)}
                  disabled={currentIndex >= list.length - 1}
                  className="rounded-md border border-line-strong p-1.5 text-ink-2 transition-colors hover:text-ink disabled:opacity-30"
                  aria-label="Next challenge"
                ><ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
          </div>
          <h2 className="mb-6 font-serif text-3xl text-ink">{draft.title.trim() || "Untitled File"}</h2>

          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <Select
              label="Type"
              value={draft.type}
              onChange={(v) => setDraft({ ...draft, type: v as Draft["type"] })}
              options={[{ value: "PICTURE", label: "Picture" }, { value: "RIDDLE", label: "Riddle" }]}
            />
            <Input label="Title (heading)" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} disabled={locked} placeholder="e.g. Front Gate" />
            <div className="sm:col-span-2">
              <label className="label mb-2 block">{draft.type === "RIDDLE" ? "Riddle Text" : "Description"}</label>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder={draft.type === "RIDDLE" ? "Write the riddle…" : "Describe the challenge…"}
                rows={3}
                disabled={locked}
                className={textareaCls}
              />
            </div>
            <Input label="Latitude" value={draft.latitude} onChange={(e) => setDraft({ ...draft, latitude: e.target.value })} placeholder="12.92403" inputMode="decimal" disabled={locked} />
            <Input label="Longitude" value={draft.longitude} onChange={(e) => setDraft({ ...draft, longitude: e.target.value })} placeholder="77.50119" inputMode="decimal" disabled={locked} />
            <Input label="Margin of Error (m)" value={draft.marginOfError} onChange={(e) => setDraft({ ...draft, marginOfError: e.target.value })} placeholder="50" inputMode="numeric" disabled={locked} />
            <Input label="Points" value={draft.points} onChange={(e) => setDraft({ ...draft, points: e.target.value })} placeholder="10" inputMode="numeric" disabled={locked} />
          </div>

          <ImageInput value={draft.imageUrl} datasetId={dataset.id} disabled={locked} onChange={(url) => setDraft({ ...draft, imageUrl: url })} onErr={onErr} />

          <div className="mt-7 flex gap-3">
            <Button variant="ghost" size="lg" className="flex-1" noMagnet onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button size="lg" className="flex-1" noMagnet disabled={locked || saving} onClick={() => (editingId ? update.mutate(editingId) : create.mutate())}>
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-4 w-4" /> {editingId ? "Save changes" : "Add challenge"}</>}
            </Button>
          </div>
        </div>
      </Sheet>
    </Panel>
  );
}

function ImageInput({
  value, datasetId, disabled, onChange, onErr,
}: {
  value: string; datasetId: string; disabled: boolean; onChange: (url: string) => void; onErr: (e: unknown) => void;
}) {
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [uploading, setUploading] = useState(false);

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
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-3">
        <span className="label">Image</span>
        <div className="flex gap-1 rounded-lg border border-line p-0.5">
          <button type="button" onClick={() => setMode("upload")} disabled={disabled} className={cn("flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors", mode === "upload" ? "bg-signal text-paper" : "text-ink-3 hover:text-ink")}><Upload className="h-3 w-3" /> Upload</button>
          <button type="button" onClick={() => setMode("link")} disabled={disabled} className={cn("flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors", mode === "link" ? "bg-signal text-paper" : "text-ink-3 hover:text-ink")}><LinkIcon className="h-3 w-3" /> Link</button>
        </div>
        <span className="data text-xs text-ink-3">(required for pictures)</span>
      </div>

      {mode === "upload" ? (
        <input
          key="upload"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled || uploading}
          onChange={(e) => onFile(e.target.files?.[0])}
          className="w-full rounded-xl border border-line bg-paper-1 px-4 py-3 text-sm text-ink-2 outline-none transition-colors file:mr-3 file:rounded-md file:border-0 file:bg-paper-3 file:px-3 file:py-1.5 file:text-xs file:text-ink hover:file:bg-paper-2 disabled:opacity-50"
        />
      ) : (
        <input
          key="link"
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/image.jpg"
          disabled={disabled}
          className={textareaCls}
        />
      )}

      {uploading && <p className="mt-2 flex items-center gap-1.5 data text-xs text-ink-3"><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</p>}
      {value && (
        <div className="mt-3 flex justify-center rounded-xl border border-line-strong bg-paper-2 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="preview" className="max-h-72 w-auto rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
