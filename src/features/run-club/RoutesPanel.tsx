"use client";

import { formatDistance } from "./geo";
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
  routes: ClubRoute[] | undefined;
  selectedRouteId: string | null;
  selfClientId?: string;
  canEditMeetup: boolean;
  onLocate: () => void;
  onSelectRoute: (routeId: string | null) => void;
  onApplyToMeetup: (routeId: string) => void;
  onClearMeetupRoute: () => void;
  onStartDrawing: () => void;
  onDeleteRoute: (routeId: string) => void;
};

export default function RoutesPanel({
  startLabel,
  address,
  routes,
  selectedRouteId,
  selfClientId,
  canEditMeetup,
  onLocate,
  onSelectRoute,
  onApplyToMeetup,
  onClearMeetupRoute,
  onStartDrawing,
  onDeleteRoute,
}: RoutesPanelProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div className="space-y-3 px-1 pb-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-[family-name:var(--run-display)] text-xl text-[color:var(--run-ink)]">
            {startLabel}
          </p>
          <p className="mt-0.5 truncate text-xs text-[color:var(--run-muted)]">{address}</p>
        </div>
        <button
          type="button"
          onClick={onStartDrawing}
          className="shrink-0 rounded-full bg-[color:var(--run-ink)] px-3 py-1.5 text-xs font-medium text-[color:var(--run-accent)]"
        >
          Draw
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-full bg-[color:var(--run-ink)] px-3 py-2 text-xs font-medium text-[color:var(--run-accent)]"
        >
          Maps
        </a>
        <button
          type="button"
          onClick={onLocate}
          className="inline-flex items-center rounded-full border border-[color:var(--run-line)] bg-white/70 px-3 py-2 text-xs font-medium"
        >
          Locate me
        </button>
      </div>

      <section className="space-y-2 border-t border-[color:var(--run-line)] pt-3">
        {routes === undefined ? (
          <p className="text-sm text-[color:var(--run-muted)]">Loading…</p>
        ) : null}

        {routes?.length === 0 ? (
          <p className="text-sm text-[color:var(--run-muted)]">No routes yet.</p>
        ) : null}

        {(routes ?? []).map((route) => {
          const selected = selectedRouteId === route._id;
          return (
            <div
              key={route._id}
              className={`rounded-2xl border px-3 py-2.5 ${
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
                  {formatDistance(route.distanceMeters)} · {route.displayName}
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
                      Use meetup
                    </button>
                  ) : null}
                  {canEditMeetup ? (
                    <button
                      type="button"
                      onClick={onClearMeetupRoute}
                      className="rounded-full bg-white/15 px-3 py-1.5 text-xs"
                    >
                      Clear
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
        })}
      </section>
    </div>
  );
}
