"use client";

import { useState } from "react";
import { formatDistance } from "./geo";
import { MAX_ROUTE_NAME_LENGTH } from "./config";
import type { RouteWaypoint } from "./types";

export type ClubRoute = {
  _id: string;
  name: string;
  displayName: string;
  clientId: string;
  distanceMeters: number;
  waypoints: RouteWaypoint[];
  createdAt: number;
};

type RoutesPanelProps = {
  startLabel: string;
  address: string;
  notes?: string;
  routes: ClubRoute[] | undefined;
  selectedRouteId: string | null;
  drawing: boolean;
  draftWaypoints: RouteWaypoint[];
  draftDistanceMeters: number;
  selfClientId?: string;
  canEditMeetup: boolean;
  onLocate: () => void;
  onSelectRoute: (routeId: string | null) => void;
  onApplyToMeetup: (routeId: string) => void;
  onClearMeetupRoute: () => void;
  onStartDrawing: () => void;
  onUndoPoint: () => void;
  onClearDraft: () => void;
  onCancelDrawing: () => void;
  onSaveDraft: (name: string) => Promise<void>;
  onDeleteRoute: (routeId: string) => void;
};

export default function RoutesPanel({
  startLabel,
  address,
  notes,
  routes,
  selectedRouteId,
  drawing,
  draftWaypoints,
  draftDistanceMeters,
  selfClientId,
  canEditMeetup,
  onLocate,
  onSelectRoute,
  onApplyToMeetup,
  onClearMeetupRoute,
  onStartDrawing,
  onUndoPoint,
  onClearDraft,
  onCancelDrawing,
  onSaveDraft,
  onDeleteRoute,
}: RoutesPanelProps) {
  const [nameDraft, setNameDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div className="space-y-4 px-1 pb-1">
      <div>
        <p className="font-[family-name:var(--run-display)] text-2xl text-[color:var(--run-ink)]">
          {startLabel}
        </p>
        <p className="mt-1 text-sm text-[color:var(--run-muted)]">{address}</p>
      </div>
      <p className="text-sm leading-relaxed text-[color:var(--run-ink)]">
        {notes ?? "Meet at the start pin, then pick a saved route or draw a new one on the map."}
      </p>

      <div className="flex flex-wrap gap-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--run-ink)] px-4 py-2.5 text-sm font-medium text-[color:var(--run-accent)]"
        >
          Open in Maps
        </a>
        <button
          type="button"
          onClick={onLocate}
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--run-line)] bg-white/70 px-4 py-2.5 text-sm font-medium"
        >
          Use my location
        </button>
      </div>

      <section className="space-y-2 border-t border-[color:var(--run-line)] pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--run-muted)]">
            Routes
          </p>
          {!drawing ? (
            <button
              type="button"
              onClick={onStartDrawing}
              className="rounded-full bg-[color:var(--run-ink)] px-3 py-1.5 text-xs font-medium text-[color:var(--run-accent)]"
            >
              Draw new
            </button>
          ) : null}
        </div>

        {drawing ? (
          <div className="space-y-3 rounded-2xl border border-[color:var(--run-line)] bg-white/70 p-3">
            <p className="text-sm text-[color:var(--run-ink)]">
              Tap the map to drop points. {draftWaypoints.length} point
              {draftWaypoints.length === 1 ? "" : "s"}
              {draftWaypoints.length >= 2
                ? ` · ${formatDistance(draftDistanceMeters)}`
                : ""}
            </p>
            <input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              maxLength={MAX_ROUTE_NAME_LENGTH}
              placeholder="Route name"
              className="w-full rounded-full border border-[color:var(--run-line)] bg-white px-3 py-2 text-sm outline-none"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onUndoPoint}
                disabled={draftWaypoints.length === 0}
                className="rounded-full border border-[color:var(--run-line)] bg-white px-3 py-1.5 text-xs disabled:opacity-40"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={onClearDraft}
                disabled={draftWaypoints.length === 0}
                className="rounded-full border border-[color:var(--run-line)] bg-white px-3 py-1.5 text-xs disabled:opacity-40"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={onCancelDrawing}
                className="rounded-full border border-[color:var(--run-line)] bg-white px-3 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || draftWaypoints.length < 2 || !nameDraft.trim()}
                onClick={() => {
                  setSaving(true);
                  void onSaveDraft(nameDraft.trim())
                    .then(() => setNameDraft(""))
                    .finally(() => setSaving(false));
                }}
                className="rounded-full bg-[color:var(--run-ink)] px-3 py-1.5 text-xs font-medium text-[color:var(--run-accent)] disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save route"}
              </button>
            </div>
          </div>
        ) : null}

        {!drawing && routes === undefined ? (
          <p className="text-sm text-[color:var(--run-muted)]">Loading routes…</p>
        ) : null}

        {!drawing && routes?.length === 0 ? (
          <p className="text-sm text-[color:var(--run-muted)]">
            No club routes yet. Tap Draw new and plot a path on the map.
          </p>
        ) : null}

        {!drawing
          ? (routes ?? []).map((route) => {
              const selected = selectedRouteId === route._id;
              return (
                <div
                  key={route._id}
                  className={`rounded-2xl border px-3 py-3 ${
                    selected
                      ? "border-[color:var(--run-ink)] bg-[color:var(--run-ink)] text-[color:var(--run-accent)]"
                      : "border-[color:var(--run-line)] bg-white/70"
                  }`}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => onSelectRoute(selected ? null : route._id)}
                  >
                    <p className="font-medium">{route.name}</p>
                    <p
                      className={`text-xs ${
                        selected ? "text-[color:var(--run-accent)]/80" : "text-[color:var(--run-muted)]"
                      }`}
                    >
                      {formatDistance(route.distanceMeters)} · {route.waypoints.length} points ·{" "}
                      {route.displayName}
                    </p>
                  </button>
                  {selected ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {canEditMeetup ? (
                        <button
                          type="button"
                          onClick={() => onApplyToMeetup(route._id)}
                          className="rounded-full bg-[color:var(--run-accent)] px-3 py-1.5 text-xs font-medium text-[color:var(--run-ink)]"
                        >
                          Use for meetup
                        </button>
                      ) : null}
                      {canEditMeetup ? (
                        <button
                          type="button"
                          onClick={onClearMeetupRoute}
                          className="rounded-full bg-white/15 px-3 py-1.5 text-xs"
                        >
                          Clear meetup route
                        </button>
                      ) : null}
                      {route.clientId === selfClientId ? (
                        <button
                          type="button"
                          onClick={() => onDeleteRoute(route._id)}
                          className="rounded-full bg-white/15 px-3 py-1.5 text-xs"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })
          : null}
      </section>
    </div>
  );
}
