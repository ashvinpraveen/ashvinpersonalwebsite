"use client";

import { memo, type MouseEvent } from "react";
import { Check } from "lucide-react";
import { useWorkspace, type Issue } from "../data";
import type { DisplayOptions } from "../filters";
import { Avatar, LabelDot, PriorityIcon, ProjectIcon, StatusIcon } from "../icons";
import { CycleGlyph, EstimateGlyph, PropertyPopover, estimateLabel } from "./pickers";
import { formatShortDate } from "./primitives";
import { cn } from "@/lib/utils";

const stop = (event: MouseEvent) => event.stopPropagation();

export function DueDate({ value, closed }: { value: string; closed?: boolean }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${value}T00:00:00`);
  const overdue = !closed && due < today;
  const soon = !closed && !overdue && due.getTime() - today.getTime() <= 2 * 86400000;
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1 rounded-full border border-q-border px-2 text-[12px]",
        overdue ? "text-[#eb5757]" : soon ? "text-[#f2994a]" : "text-q-text3",
      )}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <rect x="1.5" y="2.5" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
        <path d="M1.5 5h9M4 1.5v2M8 1.5v2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
      {formatShortDate(value)}
    </span>
  );
}

export function LabelPill({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex h-[22px] max-w-[140px] items-center gap-1.5 rounded-full border border-q-border px-2 text-[12px] text-q-text2">
      <LabelDot color={color} />
      <span className="truncate">{name}</span>
    </span>
  );
}

type RowProps = {
  issue: Issue;
  focused: boolean;
  selected: boolean;
  selectionActive: boolean;
  display: DisplayOptions;
  targets: Issue[];
  onOpen: (issue: Issue, event: MouseEvent) => void;
  onHover: (issue: Issue) => void;
  onToggleSelect: (issue: Issue, event: MouseEvent) => void;
};

export const IssueRow = memo(function IssueRow({
  issue,
  focused,
  selected,
  selectionActive,
  display,
  targets,
  onOpen,
  onHover,
  onToggleSelect,
}: RowProps) {
  const ws = useWorkspace();
  const state = ws.statesById.get(issue.stateId);
  const assignee = issue.assigneeId ? ws.membersById.get(issue.assigneeId) : undefined;
  const project = issue.projectId ? ws.projectsById.get(issue.projectId) : undefined;
  const cycle = issue.cycleId ? ws.cyclesById.get(issue.cycleId) : undefined;
  const children = ws.childrenByParent.get(issue._id) ?? [];
  const parent = issue.parentId ? ws.issuesById.get(issue.parentId) : undefined;
  const doneChildren = children.filter((child) => {
    const type = ws.statesById.get(child.stateId)?.type;
    return type === "completed" || type === "canceled";
  }).length;
  const closed = state?.type === "completed" || state?.type === "canceled";
  const props = display.properties;
  const estimate = estimateLabel(ws, issue.teamId, issue.estimate);

  return (
    <div
      role="row"
      data-issue-id={issue._id}
      aria-selected={selected}
      onMouseEnter={() => onHover(issue)}
      onClick={(event) => onOpen(issue, event)}
      className={cn(
        "group relative flex h-[39px] cursor-default select-none items-center gap-2 border-b border-q-line pl-3 pr-4 text-[13px] [contain-intrinsic-size:auto_39px] [content-visibility:auto] sm:pl-5 sm:pr-6",
        selected ? "bg-q-selected" : focused ? "bg-q-hover" : "",
      )}
    >
      <button
        type="button"
        aria-label={selected ? "Deselect" : "Select"}
        onClick={(event) => {
          event.stopPropagation();
          onToggleSelect(issue, event);
        }}
        className={cn(
          "absolute left-0.5 hidden h-4 w-4 items-center justify-center rounded-[4px] border sm:flex",
          selected ? "border-q-accent bg-q-accent text-white" : "border-q-text4 bg-q-panel",
          selected || selectionActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        {selected ? <Check size={11} strokeWidth={3} /> : null}
      </button>

      {props.priority ? (
        <PropertyPopover
          kind="priority"
          issues={targets}
          trigger={
            <button type="button" onClick={stop} className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-q-active" aria-label="Priority">
              <PriorityIcon priority={issue.priority} />
            </button>
          }
        />
      ) : null}

      {props.id ? (
        <span className="hidden w-[62px] shrink-0 truncate text-[12.5px] tabular-nums text-q-text3 sm:block">{ws.identifier(issue)}</span>
      ) : null}

      {props.status && state ? (
        <PropertyPopover
          kind="status"
          issues={targets}
          trigger={
            <button type="button" onClick={stop} className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-q-active" aria-label="Status">
              <StatusIcon type={state.type} color={state.color} progress={ws.stateProgress(state)} />
            </button>
          }
        />
      ) : null}

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className={cn("truncate", closed ? "text-q-text3" : "text-q-text")}>{issue.title}</span>
        {parent && display.showSubIssues ? (
          <span className="hidden shrink-0 truncate text-[12px] text-q-text4 md:inline">› {parent.title}</span>
        ) : null}
        {children.length > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-q-border px-1.5 text-[11px] text-q-text3">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            {doneChildren}/{children.length}
          </span>
        ) : null}
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 md:flex">
        {props.labels
          ? issue.labelIds.slice(0, 3).map((labelId) => {
              const label = ws.labelsById.get(labelId);
              return label ? <LabelPill key={label._id} name={label.name} color={label.color} /> : null;
            })
          : null}
        {props.labels && issue.labelIds.length > 3 ? (
          <span className="text-[12px] text-q-text3">+{issue.labelIds.length - 3}</span>
        ) : null}
        {props.project && project ? (
          <span className="inline-flex h-[22px] max-w-[160px] items-center gap-1.5 rounded-full border border-q-border px-2 text-[12px] text-q-text2">
            <ProjectIcon color={project.color} icon={project.icon} size={12} />
            <span className="truncate">{project.name}</span>
          </span>
        ) : null}
        {props.cycle && cycle ? (
          <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full border border-q-border px-2 text-[12px] text-q-text3">
            <CycleGlyph active={cycle.startsAt <= Date.now() && cycle.endsAt > Date.now()} />
            {cycle.name ?? `Cycle ${cycle.number}`}
          </span>
        ) : null}
        {props.estimate && estimate ? (
          <span className="inline-flex h-[22px] items-center gap-1 rounded-full border border-q-border px-2 text-[12px] text-q-text3">
            <EstimateGlyph />
            {estimate}
          </span>
        ) : null}
        {props.dueDate && issue.dueDate ? <DueDate value={issue.dueDate} closed={closed} /> : null}
      </div>

      {props.created ? (
        <span className="hidden w-[52px] shrink-0 text-right text-[12px] text-q-text3 lg:block">{formatShortDate(issue.createdAt)}</span>
      ) : null}
      {props.updated ? (
        <span className="hidden w-[52px] shrink-0 text-right text-[12px] text-q-text3 lg:block">{formatShortDate(issue.updatedAt)}</span>
      ) : null}

      {props.assignee ? (
        <PropertyPopover
          kind="assignee"
          issues={targets}
          align="end"
          trigger={
            <button type="button" onClick={stop} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" aria-label="Assignee">
              <Avatar name={assignee?.name} hue={assignee?.avatarHue} size={20} />
            </button>
          }
        />
      ) : null}
    </div>
  );
});
