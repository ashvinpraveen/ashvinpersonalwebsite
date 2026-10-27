"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Command } from "cmdk";
import { useMutation } from "convex/react";
import { Calendar, Check, Plus, Users } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  useIssueActions,
  useToast,
  useWorkspace,
  type Issue,
  type IssuePatch,
  type WorkspaceData,
} from "../data";
import { stateKey } from "../filters";
import {
  Avatar,
  LabelDot,
  PRIORITIES,
  PriorityIcon,
  ProjectIcon,
  StatusIcon,
  TeamIcon,
} from "../icons";
import { Dialog, Kbd, Popover, formatShortDate } from "./primitives";
import { cn } from "@/lib/utils";

export type PropertyKind =
  | "status"
  | "priority"
  | "assignee"
  | "labels"
  | "project"
  | "cycle"
  | "estimate"
  | "dueDate"
  | "team";

export type PickerItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  keywords?: string;
  checked?: boolean;
  shortcut?: string;
  hint?: ReactNode;
};

export const PLACEHOLDERS: Record<PropertyKind, string> = {
  status: "Change status...",
  priority: "Set priority to...",
  assignee: "Assign to...",
  labels: "Change labels...",
  project: "Add to project...",
  cycle: "Move to cycle...",
  estimate: "Set estimate to...",
  dueDate: "Set due date...",
  team: "Move to team...",
};

export const ESTIMATE_SCALES: Record<string, { value: number; label: string }[]> = {
  exponential: [1, 2, 4, 8, 16].map((value) => ({ value, label: `${value} Points` })),
  fibonacci: [1, 2, 3, 5, 8].map((value) => ({ value, label: `${value} Points` })),
  linear: [1, 2, 3, 4, 5].map((value) => ({ value, label: `${value} Points` })),
  tShirt: [
    { value: 1, label: "XS" },
    { value: 2, label: "S" },
    { value: 3, label: "M" },
    { value: 5, label: "L" },
    { value: 8, label: "XL" },
  ],
};

export function estimateLabel(ws: WorkspaceData, teamId: string, estimate: number | undefined) {
  if (estimate === undefined) return null;
  const team = ws.teamsById.get(teamId);
  if (team?.estimateType === "tShirt") {
    return ESTIMATE_SCALES.tShirt.find((option) => option.value === estimate)?.label ?? String(estimate);
  }
  return String(estimate);
}

// ---------- generic list ----------

export function PickerList({
  placeholder,
  items,
  onSelect,
  multi = false,
  footer,
  onCreate,
  createLabel,
}: {
  placeholder: string;
  items: PickerItem[];
  onSelect: (id: string) => void;
  multi?: boolean;
  footer?: ReactNode;
  onCreate?: (name: string) => void;
  createLabel?: (name: string) => string;
}) {
  const [search, setSearch] = useState("");
  const exact = items.some((item) => item.label.toLowerCase() === search.trim().toLowerCase());
  return (
    <Command
      className="q-cmd flex max-h-[min(420px,60vh)] w-full flex-col"
      loop
      onKeyDown={(event) => {
        if (search === "" && /^[0-9]$/.test(event.key)) {
          const item = items.find((candidate) => candidate.shortcut === event.key);
          if (item) {
            event.preventDefault();
            onSelect(item.id);
          }
        }
      }}
    >
      <div className="flex h-11 items-center gap-2 border-b border-q-border px-3.5">
        <Command.Input
          autoFocus
          value={search}
          onValueChange={setSearch}
          placeholder={placeholder}
          className="h-full text-[13px]"
        />
        {multi ? <span className="shrink-0 text-[11px] text-q-text4">Multi-select</span> : null}
      </div>
      <Command.List className="q-scroll flex-1 py-1">
        <Command.Empty>No results</Command.Empty>
        {items.map((item) => (
          <Command.Item
            key={item.id}
            value={`${item.label} ${item.keywords ?? ""} ${item.id}`}
            onSelect={() => onSelect(item.id)}
          >
            {multi ? (
              <span
                className={cn(
                  "flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[3px] border",
                  item.checked ? "border-q-accent bg-q-accent text-white" : "border-q-text4",
                )}
              >
                {item.checked ? <Check size={10} strokeWidth={3} /> : null}
              </span>
            ) : null}
            {item.icon ? <span className="flex w-4 shrink-0 items-center justify-center">{item.icon}</span> : null}
            <span className="flex-1 truncate">{item.label}</span>
            {item.hint ? <span className="shrink-0 text-q-text4">{item.hint}</span> : null}
            {!multi && item.checked ? <Check size={14} className="shrink-0 text-q-text2" /> : null}
            {item.shortcut ? <span className="w-4 shrink-0 text-right text-[12px] text-q-text4">{item.shortcut}</span> : null}
          </Command.Item>
        ))}
        {onCreate && search.trim() && !exact ? (
          <Command.Item value={`__create ${search}`} onSelect={() => onCreate(search.trim())}>
            <Plus size={14} className="text-q-text3" />
            <span className="truncate">{createLabel ? createLabel(search.trim()) : `Create "${search.trim()}"`}</span>
          </Command.Item>
        ) : null}
      </Command.List>
      {footer}
    </Command>
  );
}

// ---------- item builders ----------

export type Selection = Set<string>;

export function buildItems(kind: PropertyKind, ws: WorkspaceData, teamId: string, selected: Selection): PickerItem[] {
  switch (kind) {
    case "status":
      return (ws.statesByTeam.get(teamId) ?? []).map((state, index) => ({
        id: state._id,
        label: state.name,
        icon: <StatusIcon type={state.type} color={state.color} progress={ws.stateProgress(state)} />,
        checked: selected.has(state._id),
        shortcut: index < 9 ? String(index + 1) : undefined,
      }));
    case "priority":
      return PRIORITIES.map((priority) => ({
        id: String(priority.value),
        label: priority.name,
        icon: <PriorityIcon priority={priority.value} />,
        checked: selected.has(String(priority.value)),
        shortcut: String(priority.value),
      }));
    case "assignee": {
      const me = ws.members.find((member) => member._id === ws.viewer._id);
      const others = ws.members.filter((member) => member._id !== ws.viewer._id).sort((a, b) => a.name.localeCompare(b.name));
      return [
        { id: "none", label: "No assignee", icon: <Avatar size={16} />, checked: selected.has("none"), shortcut: "0" },
        ...[me, ...others]
          .filter((member) => member !== undefined)
          .map((member) => ({
            id: member._id,
            label: member.name,
            keywords: `${member.handle} ${member.email ?? ""}`,
            icon: <Avatar name={member.name} hue={member.avatarHue} size={16} />,
            checked: selected.has(member._id),
            hint: member._id === ws.viewer._id ? "You" : undefined,
          })),
      ];
    }
    case "labels":
      return ws.labels
        .filter((label) => !label.teamId || label.teamId === teamId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((label) => ({
          id: label._id,
          label: label.name,
          icon: <LabelDot color={label.color} />,
          checked: selected.has(label._id),
        }));
    case "project": {
      const open = ws.projects
        .filter((project) => project.status !== "completed" && project.status !== "canceled")
        .sort((a, b) => a.name.localeCompare(b.name));
      return [
        { id: "none", label: "No project", icon: <ProjectIcon color="var(--q-text-4)" />, checked: selected.has("none") },
        ...open.map((project) => ({
          id: project._id,
          label: project.name,
          icon: <ProjectIcon color={project.color} icon={project.icon} />,
          checked: selected.has(project._id),
        })),
      ];
    }
    case "cycle": {
      const now = Date.now();
      const cycles = ws.cycles
        .filter((cycle) => cycle.teamId === teamId && cycle.endsAt > now)
        .sort((a, b) => a.startsAt - b.startsAt);
      return [
        { id: "none", label: "No cycle", icon: <CycleGlyph />, checked: selected.has("none") },
        ...cycles.map((cycle) => ({
          id: cycle._id,
          label: cycle.name ?? `Cycle ${cycle.number}`,
          icon: <CycleGlyph active={cycle.startsAt <= now} />,
          hint: `${formatShortDate(cycle.startsAt)} – ${formatShortDate(cycle.endsAt)}${cycle.startsAt <= now ? " · Current" : ""}`,
          checked: selected.has(cycle._id),
        })),
      ];
    }
    case "estimate": {
      const team = ws.teamsById.get(teamId);
      const scale = ESTIMATE_SCALES[team?.estimateType ?? "fibonacci"] ?? ESTIMATE_SCALES.fibonacci;
      return [
        { id: "none", label: "No estimate", checked: selected.has("none"), shortcut: "0" },
        ...scale.map((option, index) => ({
          id: String(option.value),
          label: option.label,
          icon: <EstimateGlyph />,
          checked: selected.has(String(option.value)),
          shortcut: String(index + 1),
        })),
      ];
    }
    case "team":
      return ws.teams.map((team) => ({
        id: team._id,
        label: team.name,
        keywords: team.key,
        icon: <TeamIcon name={team.name} color={team.color} icon={team.icon} size={16} />,
        hint: team.key,
        checked: selected.has(team._id),
      }));
    case "dueDate":
      return [];
  }
}

export function CycleGlyph({ active = false }: { active?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="5.5" stroke={active ? "var(--q-accent)" : "var(--q-text-3)"} strokeWidth="1.4" strokeDasharray={active ? undefined : "2 1.6"} />
      {active ? <path d="M7 7V1.5A5.5 5.5 0 0 1 12.5 7Z" fill="var(--q-accent)" /> : null}
    </svg>
  );
}

export function EstimateGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 1.5 12.5 4.5v5L7 12.5 1.5 9.5v-5L7 1.5Z" stroke="var(--q-text-3)" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

// ---------- applying to existing issues ----------

function selectionFor(kind: PropertyKind, issues: Issue[]): Selection {
  const values = (issue: Issue): string[] => {
    switch (kind) {
      case "status":
        return [issue.stateId];
      case "priority":
        return [String(issue.priority)];
      case "assignee":
        return [issue.assigneeId ?? "none"];
      case "labels":
        return issue.labelIds;
      case "project":
        return [issue.projectId ?? "none"];
      case "cycle":
        return [issue.cycleId ?? "none"];
      case "estimate":
        return [issue.estimate === undefined ? "none" : String(issue.estimate)];
      case "team":
        return [issue.teamId];
      case "dueDate":
        return [issue.dueDate ?? "none"];
    }
  };
  if (issues.length === 0) return new Set();
  const [first, ...rest] = issues.map(values);
  return new Set(first.filter((value) => rest.every((other) => other.includes(value))));
}

export function useApplyProperty(issues: Issue[]) {
  const ws = useWorkspace();
  const actions = useIssueActions();
  const ids = issues.map((issue) => issue._id);
  return (kind: PropertyKind, id: string) => {
    const nullable = id === "none" ? null : id;
    switch (kind) {
      case "status": {
        const target = ws.statesById.get(id);
        if (!target) return;
        // Map by status name/type for issues from other teams.
        const byTeam = new Map<string, Id<"quadraticIssues">[]>();
        for (const issue of issues) byTeam.set(issue.teamId, [...(byTeam.get(issue.teamId) ?? []), issue._id]);
        for (const [teamId, teamIssueIds] of byTeam) {
          const state =
            teamId === target.teamId
              ? target
              : (ws.statesByTeam.get(teamId) ?? []).find((candidate) => stateKey(candidate) === stateKey(target)) ??
                (ws.statesByTeam.get(teamId) ?? []).find((candidate) => candidate.type === target.type);
          if (state) void actions.updateMany(teamIssueIds, { stateId: state._id });
        }
        return;
      }
      case "priority":
        return void actions.updateMany(ids, { priority: Number(id) });
      case "assignee":
        return void actions.updateMany(ids, { assigneeId: nullable as Id<"quadraticUsers"> | null });
      case "project":
        return void actions.updateMany(ids, { projectId: nullable as Id<"quadraticProjects"> | null });
      case "cycle":
        return void actions.updateMany(ids, { cycleId: nullable as Id<"quadraticCycles"> | null });
      case "estimate":
        return void actions.updateMany(ids, { estimate: nullable === null ? null : Number(id) });
      case "team":
        return void actions.updateMany(ids, { teamId: id as Id<"quadraticTeams"> });
      case "labels": {
        const labelId = id as Id<"quadraticLabels">;
        const allHave = issues.every((issue) => issue.labelIds.includes(labelId));
        if (issues.length === 1) {
          const issue = issues[0];
          const next = allHave ? issue.labelIds.filter((l) => l !== labelId) : [...issue.labelIds, labelId];
          return void actions.update(issue._id, { labelIds: next });
        }
        return void actions.updateMany(ids, {}, allHave ? { remove: [labelId] } : { add: [labelId] });
      }
      case "dueDate":
        return void actions.updateMany(ids, { dueDate: nullable });
    }
  };
}

/** The picker body for one property of one or more existing issues. */
export function IssuePropertyMenu({
  kind,
  issues,
  onDone,
}: {
  kind: PropertyKind;
  issues: Issue[];
  onDone: () => void;
}) {
  const ws = useWorkspace();
  const apply = useApplyProperty(issues);
  const toast = useToast();
  const createLabel = useMutation(api.quadratic.labels.create);
  const teamId = issues[0]?.teamId ?? ws.teams[0]?._id;
  const selected = selectionFor(kind, issues);
  if (kind === "dueDate") {
    return (
      <DueDateMenu
        value={issues.length === 1 ? issues[0].dueDate : undefined}
        onChange={(value) => {
          apply("dueDate", value ?? "none");
          onDone();
        }}
      />
    );
  }
  const items = buildItems(kind, ws, teamId, selected);
  return (
    <PickerList
      placeholder={PLACEHOLDERS[kind]}
      items={items}
      multi={kind === "labels"}
      onSelect={(id) => {
        apply(kind, id);
        if (kind !== "labels") onDone();
      }}
      onCreate={
        kind === "labels"
          ? async (name) => {
              try {
                const labelId = await createLabel({ token: ws.token, workspaceId: ws.workspace._id, name });
                apply("labels", labelId);
              } catch (error) {
                toast.error(error);
              }
            }
          : undefined
      }
      createLabel={(name) => `Create new label: "${name}"`}
    />
  );
}

// ---------- due dates ----------

function isoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DueDateMenu({ value, onChange }: { value?: string; onChange: (value: string | null) => void }) {
  const [custom, setCustom] = useState(value ?? "");
  const presets = useMemo(() => {
    const today = new Date();
    const plus = (days: number) => {
      const date = new Date(today);
      date.setDate(date.getDate() + days);
      return date;
    };
    const endOfWeek = plus((5 - today.getDay() + 7) % 7 || 7);
    return [
      { id: "tomorrow", label: "Tomorrow", date: plus(1) },
      { id: "eow", label: "End of this week", date: endOfWeek },
      { id: "week", label: "In one week", date: plus(7) },
      { id: "twoWeeks", label: "In two weeks", date: plus(14) },
      { id: "month", label: "In one month", date: plus(30) },
    ];
  }, []);
  const items: PickerItem[] = [
    ...presets.map((preset) => ({
      id: isoDate(preset.date),
      label: preset.label,
      icon: <Calendar size={14} className="text-q-text3" />,
      hint: formatShortDate(isoDate(preset.date)),
      keywords: preset.id,
    })),
    ...(value ? [{ id: "none", label: "Remove due date", icon: <Calendar size={14} className="text-q-text4" /> }] : []),
  ];
  return (
    <div className="w-full">
      <PickerList
        placeholder="Try: tomorrow, end of week…"
        items={items}
        onSelect={(id) => onChange(id === "none" ? null : id)}
        footer={
          <form
            className="flex items-center gap-2 border-t border-q-border p-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (custom) onChange(custom);
            }}
          >
            <input
              type="date"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              className="h-7 flex-1 rounded-[5px] border border-q-border bg-q-raised px-2 text-[12px] text-q-text outline-none [color-scheme:inherit]"
            />
            <button type="submit" className="h-7 rounded-[5px] bg-q-accent px-2.5 text-[12px] font-medium text-white">
              Set
            </button>
          </form>
        }
      />
    </div>
  );
}

// ---------- triggers ----------

/** Popover picker anchored to any trigger (property chips, row cells). */
export function PropertyPopover({
  kind,
  issues,
  trigger,
  align = "start",
}: {
  kind: PropertyKind;
  issues: Issue[];
  trigger: ReactNode;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen} trigger={trigger} align={align} className="w-[260px]">
      {open ? <IssuePropertyMenu kind={kind} issues={issues} onDone={() => setOpen(false)} /> : null}
    </Popover>
  );
}

/** Centered command-style picker used by keyboard shortcuts (S, P, A, L…). */
export function PropertyDialog({
  kind,
  issues,
  onClose,
}: {
  kind: PropertyKind | null;
  issues: Issue[];
  onClose: () => void;
}) {
  const ws = useWorkspace();
  const subject =
    issues.length === 1 ? `${ws.identifier(issues[0])} – ${issues[0].title}` : `${issues.length} issues`;
  return (
    <Dialog open={kind !== null} onOpenChange={(open) => !open && onClose()} position="top" className="max-w-[560px]" label={kind ? PLACEHOLDERS[kind] : "Picker"}>
      {kind ? (
        <div>
          <div className="flex items-center gap-2 px-3.5 pt-3">
            <span className="max-w-full truncate rounded-[5px] bg-q-raised px-2 py-0.5 text-[12px] text-q-text3">{subject}</span>
          </div>
          <IssuePropertyMenu kind={kind} issues={issues} onDone={onClose} />
        </div>
      ) : null}
    </Dialog>
  );
}

/** Small chip used in the create modal and detail sidebar. */
export function PropertyChip({
  icon,
  label,
  muted,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode; label: ReactNode; muted?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-7 max-w-[220px] items-center gap-1.5 rounded-[6px] border border-q-border bg-transparent px-2 text-[12px] transition-colors hover:bg-q-hover",
        muted ? "text-q-text3" : "text-q-text2",
        className,
      )}
      {...props}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

export function PeopleGlyph() {
  return <Users size={14} className="text-q-text3" />;
}

export { Kbd };
export type { IssuePatch };
