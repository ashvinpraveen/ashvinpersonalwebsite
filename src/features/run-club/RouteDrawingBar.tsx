"use client";

import { FormEvent, useState } from "react";
import { Undo2, X } from "lucide-react";
import { formatDistance } from "./geo";
import { MAX_ROUTE_NAME_LENGTH } from "./config";
import type { RouteWaypoint } from "./types";

type RouteDrawingBarProps = {
  draftWaypoints: RouteWaypoint[];
  draftDistanceMeters: number;
  onUndoPoint: () => void;
  onClearDraft: () => void;
  onCancelDrawing: () => void;
  onSaveDraft: (name: string) => Promise<void>;
};

export default function RouteDrawingBar({
  draftWaypoints,
  draftDistanceMeters,
  onUndoPoint,
  onClearDraft,
  onCancelDrawing,
  onSaveDraft,
}: RouteDrawingBarProps) {
  const [nameDraft, setNameDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pointCount = draftWaypoints.length;
  const canSave = pointCount >= 2 && Boolean(nameDraft.trim());

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSaveDraft(nameDraft.trim());
      setNameDraft("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save route.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="rounded-[24px] border border-white/50 bg-[color:var(--run-panel)] p-3 shadow-[0_18px_50px_rgba(12,40,28,0.22)] backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--run-muted)]">
            Drawing route
          </p>
          <p className="font-[family-name:var(--run-display)] text-2xl tracking-tight text-[color:var(--run-ink)]">
            {pointCount} point{pointCount === 1 ? "" : "s"}
            {pointCount >= 2 ? ` · ${formatDistance(draftDistanceMeters)}` : ""}
          </p>
          <p className="text-xs text-[color:var(--run-muted)]">
            {pointCount < 2
              ? "Tap the map to drop at least two points."
              : "Name it and save — or keep tapping to extend."}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancelDrawing}
          className="rounded-full p-2 text-[color:var(--run-muted)] hover:bg-white/60 hover:text-[color:var(--run-ink)]"
          aria-label="Cancel drawing"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 px-1">
        <button
          type="button"
          onClick={onUndoPoint}
          disabled={pointCount === 0}
          className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--run-line)] bg-white/80 px-3 py-2 text-sm disabled:opacity-40"
        >
          <Undo2 size={14} />
          Undo
        </button>
        <button
          type="button"
          onClick={onClearDraft}
          disabled={pointCount === 0}
          className="rounded-full border border-[color:var(--run-line)] bg-white/80 px-3 py-2 text-sm disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      {pointCount >= 2 ? (
        <div className="mt-3 flex gap-2">
          <input
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            maxLength={MAX_ROUTE_NAME_LENGTH}
            placeholder="Route name"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-full border border-[color:var(--run-line)] bg-white/80 px-4 py-2.5 text-base outline-none focus:border-[color:var(--run-accent-deep)]"
          />
          <button
            type="submit"
            disabled={saving || !canSave}
            className="shrink-0 rounded-full bg-[color:var(--run-ink)] px-4 py-2.5 text-sm font-semibold text-[color:var(--run-accent)] disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-2 px-1 text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
