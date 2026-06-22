"use client";

/* ───────────────────────────────────────────────────────────────────────────
   TimeWindow — set a game's window by Start + End on a vertical timeline, with
   the duration computed live between them and quick-set chips. Replaces the
   start-time + hours/minutes inputs. `lockStart` fixes the start (mid-game edit).
   ─────────────────────────────────────────────────────────────────────────── */

const toLocal = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fmtDur = (ms: number) => {
  const total = Math.round(ms / 60000);
  return `${Math.floor(total / 60)}h ${total % 60}m`;
};
const field =
  "w-full rounded-xl border border-line bg-paper-1 px-3.5 py-3 text-[16px] text-ink outline-none transition-colors [color-scheme:dark] focus:border-signal focus:bg-paper-2 disabled:opacity-60";
const chip =
  "rounded-full border border-line-strong px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-ink-2 transition-colors hover:border-signal hover:text-signal";

export function TimeWindow({
  start,
  end,
  onStartChange,
  onEndChange,
  lockStart,
}: {
  start: string;
  end: string;
  onStartChange?: (v: string) => void;
  onEndChange: (v: string) => void;
  lockStart?: boolean;
}) {
  const startMs = start ? new Date(start).getTime() : NaN;
  const endMs = end ? new Date(end).getTime() : NaN;
  const dur = !Number.isNaN(startMs) && !Number.isNaN(endMs) ? endMs - startMs : NaN;
  const valid = !Number.isNaN(dur) && dur > 0;

  const presetEnd = (mins: number) => {
    const base = !Number.isNaN(startMs) ? startMs : Date.now();
    onEndChange(toLocal(base + mins * 60000));
  };

  return (
    <div className="rounded-2xl border border-line bg-paper-1/40 p-4">
      <div className="relative pl-6">
        <span aria-hidden className="absolute bottom-5 left-[6px] top-5 w-px bg-line-strong" />

        <div className="relative">
          <span aria-hidden className="absolute -left-6 top-[2.1rem] h-3 w-3 -translate-y-1/2 rounded-full border-2 border-signal bg-paper" />
          <label className="label mb-1.5 block">Start</label>
          <input
            type="datetime-local"
            className={field}
            value={start}
            disabled={lockStart}
            onChange={(e) => onStartChange?.(e.target.value)}
          />
        </div>

        <div className="py-3">
          <span className="data text-sm text-signal">{valid ? `Duration · ${fmtDur(dur)}` : "Duration · —"}</span>
        </div>

        <div className="relative">
          <span aria-hidden className="absolute -left-6 top-[2.1rem] h-3 w-3 -translate-y-1/2 rounded-full border-2 border-signal bg-signal" />
          <label className="label mb-1.5 block">End</label>
          <input
            type="datetime-local"
            className={field}
            value={end}
            onChange={(e) => onEndChange(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!lockStart && onStartChange && (
          <button type="button" className={chip} onClick={() => onStartChange(toLocal(Date.now()))}>Start now</button>
        )}
        {[60, 90, 120, 180].map((m) => (
          <button type="button" key={m} className={chip} onClick={() => presetEnd(m)}>
            {m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h ${m % 60}m`}
          </button>
        ))}
      </div>

      {end && !valid && <p className="mt-2 text-xs text-alert">End must be after the start time.</p>}
    </div>
  );
}
