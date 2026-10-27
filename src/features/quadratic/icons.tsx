"use client";

import type { CSSProperties } from "react";

export type StateType = "backlog" | "unstarted" | "started" | "completed" | "canceled";

/** Linear's workflow-state glyphs: dashed backlog, empty todo, pie for in-progress, filled done/canceled. */
export function StatusIcon({
  type,
  color,
  progress = 0.5,
  size = 14,
}: {
  type: StateType;
  color: string;
  progress?: number;
  size?: number;
}) {
  const r = 6;
  const c = 7;
  if (type === "backlog") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
        <circle cx={c} cy={c} r={r} stroke={color} strokeWidth="1.5" strokeDasharray="1.4 1.74" />
      </svg>
    );
  }
  if (type === "unstarted") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
        <circle cx={c} cy={c} r={r} stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === "started") {
    const inner = 3;
    const circumference = 2 * Math.PI * inner;
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
        <circle cx={c} cy={c} r={r} stroke={color} strokeWidth="1.5" />
        <circle
          cx={c}
          cy={c}
          r={inner}
          stroke={color}
          strokeWidth={inner * 2}
          strokeDasharray={`${circumference * Math.min(0.95, Math.max(0.1, progress))} ${circumference}`}
          transform={`rotate(-90 ${c} ${c})`}
        />
      </svg>
    );
  }
  if (type === "completed") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
        <circle cx={c} cy={c} r={r + 0.75} fill={color} />
        <path d="M4.5 7.2 6.3 9l3.4-3.8" stroke="var(--q-panel)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx={c} cy={c} r={r + 0.75} fill={color} />
      <path d="m5 5 4 4m0-4-4 4" stroke="var(--q-panel)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function PriorityIcon({ priority, size = 16, muted = false }: { priority: number; size?: number; muted?: boolean }) {
  const base = muted ? "var(--q-text-4)" : "var(--q-text-3)";
  if (priority === 1) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
        <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill={muted ? "var(--q-text-4)" : "#f2994a"} />
        <path d="M8 4.5v4.2" stroke="var(--q-panel)" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8" cy="11.2" r="1" fill="var(--q-panel)" />
      </svg>
    );
  }
  if (priority === 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
        {[2.5, 6.75, 11].map((x) => (
          <rect key={x} x={x} y="7.25" width="2.5" height="1.5" rx="0.5" fill={base} opacity="0.9" />
        ))}
      </svg>
    );
  }
  const filled = priority === 2 ? 3 : priority === 3 ? 2 : 1;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      {[0, 1, 2].map((bar) => (
        <rect
          key={bar}
          x={2 + bar * 4.5}
          y={10 - bar * 3.5}
          width="3"
          height={4 + bar * 3.5}
          rx="1"
          fill={bar < filled ? "var(--q-text-2)" : base}
          opacity={bar < filled ? 1 : 0.35}
        />
      ))}
    </svg>
  );
}

export const PRIORITIES = [
  { value: 0, name: "No priority" },
  { value: 1, name: "Urgent" },
  { value: 2, name: "High" },
  { value: 3, name: "Medium" },
  { value: 4, name: "Low" },
] as const;

/** Linear's priority sort order: urgent first, "no priority" last. */
export const priorityRank = (priority: number) => (priority === 0 ? 5 : priority);

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase() || "?";
}

export function Avatar({
  name,
  hue,
  size = 20,
  className = "",
}: {
  name?: string | null;
  hue?: number;
  size?: number;
  className?: string;
}) {
  if (!name) {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" className={className} aria-label="Unassigned">
        <circle cx="10" cy="10" r="8.75" fill="none" stroke="var(--q-text-4)" strokeWidth="1.3" strokeDasharray="2 2" />
        <circle cx="10" cy="8" r="2.6" fill="var(--q-text-4)" />
        <path d="M5.6 15c.8-2 2.4-3 4.4-3s3.6 1 4.4 3" fill="var(--q-text-4)" />
      </svg>
    );
  }
  const style: CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.max(8, Math.round(size * 0.42)),
    background: `hsl(${hue ?? 230} 52% 46%)`,
  };
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium text-white ${className}`}
      style={style}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function TeamIcon({ name, color, icon, size = 18 }: { name: string; color: string; icon?: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[5px] font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.5) }}
    >
      {icon ?? name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function WorkspaceIcon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[5px] bg-gradient-to-br from-[#7c86ea] to-[#4651b8] font-semibold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.48) }}
    >
      {initials(name).slice(0, 2)}
    </span>
  );
}

export function LabelDot({ color, size = 8 }: { color: string; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: color }} />;
}

export function ProjectIcon({ color, icon, size = 14 }: { color: string; icon?: string; size?: number }) {
  if (icon) return <span style={{ fontSize: size, lineHeight: 1 }}>{icon}</span>;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path
        d="M8 1.6 13.6 4.8v6.4L8 14.4 2.4 11.2V4.8L8 1.6Z"
        fill={color}
        fillOpacity="0.22"
        stroke={color}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M2.6 4.9 8 8l5.4-3.1M8 8v6.2" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export type ProjectStatus = "backlog" | "planned" | "started" | "paused" | "completed" | "canceled";

export const PROJECT_STATUSES: { value: ProjectStatus; name: string; color: string }[] = [
  { value: "backlog", name: "Backlog", color: "#bec2c8" },
  { value: "planned", name: "Planned", color: "#e2e2e2" },
  { value: "started", name: "In Progress", color: "#f2c94c" },
  { value: "paused", name: "Paused", color: "#95a2b3" },
  { value: "completed", name: "Completed", color: "#5e6ad2" },
  { value: "canceled", name: "Canceled", color: "#95a2b3" },
];

export function ProjectStatusIcon({ status, size = 14 }: { status: ProjectStatus; size?: number }) {
  const meta = PROJECT_STATUSES.find((s) => s.value === status) ?? PROJECT_STATUSES[0];
  if (status === "paused") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
        <circle cx="7" cy="7" r="6" stroke={meta.color} strokeWidth="1.5" />
        <path d="M5.6 4.8v4.4M8.4 4.8v4.4" stroke={meta.color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  const type: StateType =
    status === "planned" ? "unstarted" : status === "backlog" ? "backlog" : (status as StateType);
  return <StatusIcon type={type} color={meta.color} size={size} />;
}

export const HEALTH = {
  onTrack: { name: "On track", color: "#4cb782" },
  atRisk: { name: "At risk", color: "#f2c94c" },
  offTrack: { name: "Off track", color: "#eb5757" },
} as const;

export type Health = keyof typeof HEALTH;

export function HealthBadge({ health }: { health?: Health | null }) {
  if (!health) return <span className="text-q-text4">No updates</span>;
  const meta = HEALTH[health];
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color: meta.color }}>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="6" cy="6" r="2.2" fill="currentColor" />
      </svg>
      {meta.name}
    </span>
  );
}

/** Circular progress used for project and cycle completion. */
export function ProgressRing({ value, size = 14, color = "var(--q-accent)" }: { value: number; size?: number; color?: string }) {
  const r = 5;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden>
      <circle cx="7" cy="7" r={r} fill="none" stroke="var(--q-border)" strokeWidth="2" />
      <circle
        cx="7"
        cy="7"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={`${circumference * Math.max(0, Math.min(1, value))} ${circumference}`}
        transform="rotate(-90 7 7)"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function QuadraticLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Quadratic">
      <defs>
        <linearGradient id="q-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b93f0" />
          <stop offset="1" stopColor="#4a55c4" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#q-logo)" />
      <path d="M7 23c3.5-11 14.5-11 18 0" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="16" cy="14.8" r="2.2" fill="#fff" />
    </svg>
  );
}
