"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ListFilter, Plus, SlidersHorizontal, X, Kanban, Rows3, ChevronDown, Check } from "lucide-react";
import { Command } from "cmdk";
import { useWorkspace, type WorkspaceData } from "../data";
import {
  FILTER_LABELS,
  GROUPING_LABELS,
  ORDERING_LABELS,
  PROPERTY_LABELS,
  stateKey,
  type DisplayOptions,
  type FilterField,
  type Grouping,
  type IssueFilter,
  type Ordering,
  type PropertyKey,
} from "../filters";
import { Avatar, LabelDot, PRIORITIES, PriorityIcon, ProjectIcon, StatusIcon, TeamIcon } from "../icons";
import { CycleGlyph } from "./pickers";
import { Menu, MenuItem, Popover, Switch } from "./primitives";
import { cn } from "@/lib/utils";

type FilterOption = { value: string; label: string; icon?: ReactNode };

const FIELD_ICONS: Record<FilterField, ReactNode> = {
  status: <StatusIcon type="started" color="var(--q-text-3)" />,
  priority: <PriorityIcon priority={2} size={14} />,
  assignee: <Avatar size={14} />,
  creator: <Avatar size={14} />,
  label: <LabelDot color="var(--q-text-3)" />,
  project: <ProjectIcon color="var(--q-text-3)" />,
  cycle: <CycleGlyph />,
  team: <TeamIcon name="T" color="var(--q-text-4)" size={14} />,
};

export function filterOptions(field: FilterField, ws: WorkspaceData, teamId?: string): FilterOption[] {
  switch (field) {
    case "status": {
      const states = teamId ? (ws.statesByTeam.get(teamId) ?? []) : [...ws.statesByTeam.values()].flat();
      const seen = new Set<string>();
      return states
        .filter((state) => {
          const key = stateKey(state);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((state) => ({
          value: stateKey(state),
          label: state.name,
          icon: <StatusIcon type={state.type} color={state.color} progress={ws.stateProgress(state)} />,
        }));
    }
    case "priority":
      return PRIORITIES.map((p) => ({ value: String(p.value), label: p.name, icon: <PriorityIcon priority={p.value} size={14} /> }));
    case "assignee":
    case "creator":
      return [
        ...(field === "assignee" ? [{ value: "none", label: "No assignee", icon: <Avatar size={14} /> }] : []),
        { value: "me", label: "Current user", icon: <Avatar name={ws.viewer.name} hue={ws.viewer.avatarHue} size={14} /> },
        ...ws.members.map((m) => ({ value: m._id, label: m.name, icon: <Avatar name={m.name} hue={m.avatarHue} size={14} /> })),
      ];
    case "label":
      return [
        { value: "none", label: "No labels", icon: <LabelDot color="var(--q-text-4)" /> },
        ...ws.labels
          .filter((l) => !teamId || !l.teamId || l.teamId === teamId)
          .map((l) => ({ value: l._id, label: l.name, icon: <LabelDot color={l.color} /> })),
      ];
    case "project":
      return [
        { value: "none", label: "No project", icon: <ProjectIcon color="var(--q-text-4)" /> },
        ...ws.projects.map((p) => ({ value: p._id, label: p.name, icon: <ProjectIcon color={p.color} icon={p.icon} /> })),
      ];
    case "cycle":
      return [
        { value: "none", label: "No cycle", icon: <CycleGlyph /> },
        ...ws.cycles
          .filter((c) => !teamId || c.teamId === teamId)
          .sort((a, b) => b.startsAt - a.startsAt)
          .slice(0, 12)
          .map((c) => ({ value: c._id, label: c.name ?? `Cycle ${c.number}`, icon: <CycleGlyph active={c.startsAt <= Date.now() && c.endsAt > Date.now()} /> })),
      ];
    case "team":
      return ws.teams.map((t) => ({ value: t._id, label: t.name, icon: <TeamIcon name={t.name} color={t.color} icon={t.icon} size={14} /> }));
  }
}

function FilterValueList({
  field,
  filter,
  onChange,
  teamId,
}: {
  field: FilterField;
  filter: IssueFilter;
  onChange: (filter: IssueFilter) => void;
  teamId?: string;
}) {
  const ws = useWorkspace();
  const values = new Set(filter[field] ?? []);
  return (
    <Command className="q-cmd flex max-h-[360px] flex-col" loop>
      <div className="flex h-10 items-center border-b border-q-border px-3">
        <Command.Input autoFocus placeholder={`${FILTER_LABELS[field]}...`} className="text-[13px]" />
      </div>
      <Command.List className="q-scroll py-1">
        <Command.Empty>No results</Command.Empty>
        {filterOptions(field, ws, teamId).map((option) => {
          const checked = values.has(option.value);
          return (
            <Command.Item
              key={option.value}
              value={`${option.label} ${option.value}`}
              onSelect={() => {
                const next = new Set(values);
                if (checked) next.delete(option.value);
                else next.add(option.value);
                onChange({ ...filter, [field]: [...next] });
              }}
            >
              <span
                className={cn(
                  "flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[3px] border",
                  checked ? "border-q-accent bg-q-accent text-white" : "border-q-text4",
                )}
              >
                {checked ? <Check size={10} strokeWidth={3} /> : null}
              </span>
              <span className="flex w-4 justify-center">{option.icon}</span>
              <span className="truncate">{option.label}</span>
            </Command.Item>
          );
        })}
      </Command.List>
    </Command>
  );
}

const FIELDS: FilterField[] = ["status", "assignee", "creator", "priority", "label", "project", "cycle", "team"];

export function FilterButton({
  filter,
  onChange,
  teamId,
  hiddenFields = [],
  open,
  onOpenChange,
}: {
  filter: IssueFilter;
  onChange: (filter: IssueFilter) => void;
  teamId?: string;
  hiddenFields?: FilterField[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [field, setField] = useState<FilterField | null>(null);
  const fields = FIELDS.filter((f) => !hiddenFields.includes(f));
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setField(null);
      }}
      className="w-[260px]"
      trigger={
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-[12px] text-q-text3 hover:bg-q-hover hover:text-q-text"
        >
          <ListFilter size={14} />
          Filter
        </button>
      }
    >
      {field ? (
        <FilterValueList field={field} filter={filter} onChange={onChange} teamId={teamId} />
      ) : (
        <Command className="q-cmd flex flex-col" loop>
          <div className="flex h-10 items-center border-b border-q-border px-3">
            <Command.Input autoFocus placeholder="Filter..." className="text-[13px]" />
          </div>
          <Command.List className="py-1">
            {fields.map((f) => (
              <Command.Item key={f} value={FILTER_LABELS[f]} onSelect={() => setField(f)}>
                <span className="flex w-4 justify-center">{FIELD_ICONS[f]}</span>
                {FILTER_LABELS[f]}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      )}
    </Popover>
  );
}

export function FilterChips({
  filter,
  onChange,
  teamId,
}: {
  filter: IssueFilter;
  onChange: (filter: IssueFilter) => void;
  teamId?: string;
}) {
  const ws = useWorkspace();
  const active = (Object.entries(filter) as [FilterField, string[] | undefined][]).filter(([, values]) => values?.length);
  return (
    <>
      {active.map(([field, values]) => {
        const options = filterOptions(field, ws, teamId);
        const labels = values!.map((value) => options.find((o) => o.value === value)?.label ?? "Unknown");
        const first = options.find((o) => o.value === values![0]);
        return (
          <div key={field} className="inline-flex h-7 items-center overflow-hidden rounded-[6px] border border-q-border text-[12px]">
            <span className="flex h-full items-center gap-1.5 border-r border-q-border px-2 text-q-text2">
              <span className="flex w-3.5 justify-center">{FIELD_ICONS[field]}</span>
              {FILTER_LABELS[field]}
            </span>
            <span className="flex h-full items-center border-r border-q-border px-2 text-q-text3">
              {values!.length > 1 ? (field === "label" ? "include any of" : "is any of") : "is"}
            </span>
            <Popover
              className="w-[260px]"
              trigger={
                <button type="button" className="flex h-full max-w-[220px] items-center gap-1.5 border-r border-q-border px-2 text-q-text2 hover:bg-q-hover">
                  {values!.length === 1 && first?.icon ? <span className="flex w-3.5 justify-center">{first.icon}</span> : null}
                  <span className="truncate">{values!.length > 2 ? `${values!.length} ${FILTER_LABELS[field].toLowerCase()}` : labels.join(", ")}</span>
                </button>
              }
            >
              <FilterValueList field={field} filter={filter} onChange={onChange} teamId={teamId} />
            </Popover>
            <button
              type="button"
              aria-label={`Remove ${FILTER_LABELS[field]} filter`}
              className="flex h-full w-7 items-center justify-center text-q-text3 hover:bg-q-hover hover:text-q-text"
              onClick={() => onChange({ ...filter, [field]: [] })}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </>
  );
}

function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex h-9 items-center justify-between gap-3 px-3">
      <span className="text-q-text3">{label}</span>
      <Menu
        align="end"
        trigger={
          <button type="button" className="inline-flex h-7 min-w-[130px] items-center justify-between gap-2 rounded-[6px] border border-q-border bg-q-raised px-2 text-[12px] text-q-text2 hover:bg-q-active">
            {options[value]}
            <ChevronDown size={12} className="text-q-text3" />
          </button>
        }
      >
        {(Object.keys(options) as T[]).map((key) => (
          <MenuItem key={key} onSelect={() => onChange(key)} checked={key === value}>
            {options[key]}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}

export function DisplayButton({
  display,
  onChange,
  allowBoard = true,
  groupings,
}: {
  display: DisplayOptions;
  onChange: (display: DisplayOptions) => void;
  allowBoard?: boolean;
  groupings?: Grouping[];
}) {
  const groupingOptions = useMemo(() => {
    const keys = groupings ?? (Object.keys(GROUPING_LABELS) as Grouping[]);
    return Object.fromEntries(keys.map((key) => [key, GROUPING_LABELS[key]])) as Record<Grouping, string>;
  }, [groupings]);
  const set = (patch: Partial<DisplayOptions>) => onChange({ ...display, ...patch });
  return (
    <Popover
      align="end"
      className="w-[340px]"
      trigger={
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-q-border px-2 text-[12px] text-q-text2 hover:bg-q-hover"
        >
          <SlidersHorizontal size={13} />
          Display
        </button>
      }
    >
      <div className="py-2">
        {allowBoard ? (
          <div className="grid grid-cols-2 gap-2 px-3 pb-2">
            {(["list", "board"] as const).map((layout) => (
              <button
                key={layout}
                type="button"
                onClick={() => set({ layout })}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 rounded-[6px] border text-[12px]",
                  display.layout === layout ? "border-q-text4 bg-q-active text-q-text" : "border-q-border text-q-text3 hover:bg-q-hover",
                )}
              >
                {layout === "list" ? <Rows3 size={15} /> : <Kanban size={15} />}
                {layout === "list" ? "List" : "Board"}
              </button>
            ))}
          </div>
        ) : null}
        <SelectRow
          label={display.layout === "board" ? "Columns" : "Grouping"}
          value={display.grouping}
          options={groupingOptions}
          onChange={(grouping) => set({ grouping })}
        />
        <SelectRow
          label="Ordering"
          value={display.ordering}
          options={ORDERING_LABELS}
          onChange={(ordering: Ordering) => set({ ordering })}
        />
        <div className="my-2 h-px bg-q-border" />
        <SelectRow
          label="Completed issues"
          value={display.completed}
          options={{ all: "All", month: "Past month", week: "Past week", none: "None" }}
          onChange={(completed) => set({ completed })}
        />
        <div className="flex h-9 items-center justify-between px-3">
          <span className="text-q-text3">Show sub-issues</span>
          <Switch checked={display.showSubIssues} onChange={(showSubIssues) => set({ showSubIssues })} label="Show sub-issues" />
        </div>
        {display.layout === "list" ? (
          <div className="flex h-9 items-center justify-between px-3">
            <span className="text-q-text3">Show empty groups</span>
            <Switch checked={display.showEmptyGroups} onChange={(showEmptyGroups) => set({ showEmptyGroups })} label="Show empty groups" />
          </div>
        ) : null}
        <div className="my-2 h-px bg-q-border" />
        <div className="px-3 pb-1 text-[12px] text-q-text3">Display properties</div>
        <div className="flex flex-wrap gap-1.5 px-3 pb-1">
          {(Object.keys(PROPERTY_LABELS) as PropertyKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => set({ properties: { ...display.properties, [key]: !display.properties[key] } })}
              className={cn(
                "h-6 rounded-[5px] border px-2 text-[12px]",
                display.properties[key] ? "border-q-text4 bg-q-active text-q-text" : "border-q-border text-q-text3 hover:bg-q-hover",
              )}
            >
              {PROPERTY_LABELS[key]}
            </button>
          ))}
        </div>
      </div>
    </Popover>
  );
}

export function AddFilterIcon() {
  return <Plus size={13} />;
}
