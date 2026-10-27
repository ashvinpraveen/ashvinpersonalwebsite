"use client";

import { useState, type DragEvent } from "react";
import { Plus } from "lucide-react";
import { useIssueActions, useWorkspace, type Issue } from "../data";
import { patchForGroup, type DisplayOptions, type IssueGroup } from "../filters";
import { Avatar, PriorityIcon, ProjectIcon, StatusIcon } from "../icons";
import { GroupIcon } from "./GroupIcon";
import { IssueContextMenu } from "./IssueContextMenu";
import type { ListInteraction } from "./IssueList";
import { DueDate, LabelPill } from "./IssueRow";
import { EstimateGlyph, estimateLabel } from "./pickers";
import { cn } from "@/lib/utils";

function BoardCard({
  issue,
  display,
  interaction,
  onDragStart,
  onDragEnd,
}: {
  issue: Issue;
  display: DisplayOptions;
  interaction: ListInteraction;
  onDragStart: (issue: Issue) => void;
  onDragEnd: () => void;
}) {
  const ws = useWorkspace();
  const state = ws.statesById.get(issue.stateId);
  const assignee = issue.assigneeId ? ws.membersById.get(issue.assigneeId) : undefined;
  const project = issue.projectId ? ws.projectsById.get(issue.projectId) : undefined;
  const estimate = estimateLabel(ws, issue.teamId, issue.estimate);
  const props = display.properties;
  const selected = interaction.selectedIds.has(issue._id);
  const closed = state?.type === "completed" || state?.type === "canceled";
  return (
    <IssueContextMenu issues={interaction.targetsFor(issue)}>
      <div
        draggable
        data-issue-id={issue._id}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", issue._id);
          onDragStart(issue);
        }}
        onDragEnd={onDragEnd}
        onMouseEnter={() => interaction.onHover(issue)}
        onClick={(event) => interaction.onOpen(issue, event)}
        className={cn(
          "cursor-default select-none rounded-[8px] border bg-q-elevated px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-colors",
          selected
            ? "border-q-accent"
            : interaction.focusedId === issue._id
              ? "border-q-text4"
              : "border-q-border hover:border-q-text4",
        )}
      >
        <div className="flex items-center gap-2 text-[12px] text-q-text3">
          {props.id ? <span className="tabular-nums">{ws.identifier(issue)}</span> : null}
          {props.assignee ? (
            <span className="ml-auto">
              <Avatar name={assignee?.name} hue={assignee?.avatarHue} size={18} />
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex items-start gap-2">
          {props.status && state && display.grouping !== "status" ? (
            <span className="mt-[3px]">
              <StatusIcon type={state.type} color={state.color} progress={ws.stateProgress(state)} />
            </span>
          ) : null}
          <span className={cn("line-clamp-2 text-[13px] leading-[1.45]", closed ? "text-q-text3" : "text-q-text")}>
            {issue.title}
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {props.priority ? (
            <span className="flex h-[22px] w-[24px] items-center justify-center rounded-[5px] border border-q-border">
              <PriorityIcon priority={issue.priority} size={14} />
            </span>
          ) : null}
          {props.project && project ? (
            <span className="inline-flex h-[22px] max-w-[150px] items-center gap-1.5 rounded-full border border-q-border px-2 text-[12px] text-q-text2">
              <ProjectIcon color={project.color} icon={project.icon} size={12} />
              <span className="truncate">{project.name}</span>
            </span>
          ) : null}
          {props.labels
            ? issue.labelIds.map((labelId) => {
                const label = ws.labelsById.get(labelId);
                return label ? <LabelPill key={label._id} name={label.name} color={label.color} /> : null;
              })
            : null}
          {props.estimate && estimate ? (
            <span className="inline-flex h-[22px] items-center gap-1 rounded-full border border-q-border px-2 text-[12px] text-q-text3">
              <EstimateGlyph />
              {estimate}
            </span>
          ) : null}
          {props.dueDate && issue.dueDate ? <DueDate value={issue.dueDate} closed={closed} /> : null}
        </div>
      </div>
    </IssueContextMenu>
  );
}

export function IssueBoard({
  groups,
  display,
  interaction,
}: {
  groups: IssueGroup[];
  display: DisplayOptions;
  interaction: ListInteraction;
}) {
  const ws = useWorkspace();
  const actions = useIssueActions();
  const [dragging, setDragging] = useState<Issue | null>(null);
  const [over, setOver] = useState<{ group: string; before: string | null } | null>(null);

  const drop = (group: IssueGroup, beforeId: string | null) => {
    const issue = dragging;
    setDragging(null);
    setOver(null);
    if (!issue) return;
    const patch: Record<string, unknown> = { ...patchForGroup(group.descriptor, issue, ws) };
    if (display.ordering === "manual") {
      const siblings = group.issues.filter((candidate) => candidate._id !== issue._id);
      const index = beforeId ? siblings.findIndex((candidate) => candidate._id === beforeId) : siblings.length;
      const prev = siblings[index - 1]?.sortOrder;
      const next = siblings[index]?.sortOrder;
      patch.sortOrder =
        prev === undefined && next === undefined
          ? issue.sortOrder
          : prev === undefined
            ? next! - 1
            : next === undefined
              ? prev + 1
              : (prev + next) / 2;
    }
    const changed = Object.entries(patch).some(
      ([key, value]) => (issue as Record<string, unknown>)[key] !== (value === null ? undefined : value),
    );
    if (changed) void actions.update(issue._id, patch);
  };

  const onDragOverCard = (event: DragEvent, group: IssueGroup, issueId: string) => {
    event.preventDefault();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2;
    const index = group.issues.findIndex((candidate) => candidate._id === issueId);
    const before = after ? (group.issues[index + 1]?._id ?? null) : issueId;
    if (over?.group !== group.key || over.before !== before) setOver({ group: group.key, before });
  };

  return (
    <div className="q-scroll flex h-full gap-3 overflow-x-auto px-4 pb-4 pt-3 sm:px-5">
      {groups.map((group) => (
        <div
          key={group.key}
          className={cn(
            "flex h-full w-[300px] shrink-0 flex-col rounded-[10px] transition-colors",
            over?.group === group.key ? "bg-q-hover" : "bg-transparent",
          )}
          onDragOver={(event) => {
            event.preventDefault();
            if (over?.group !== group.key) setOver({ group: group.key, before: null });
          }}
          onDragLeave={(event) => {
            if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) setOver(null);
          }}
          onDrop={(event) => {
            event.preventDefault();
            drop(group, over?.group === group.key ? over.before : null);
          }}
        >
          <div className="group/col flex h-9 shrink-0 items-center gap-2 px-2">
            <span className="flex w-4 items-center justify-center">
              <GroupIcon descriptor={group.descriptor} />
            </span>
            <span className="truncate font-medium text-q-text">{group.label}</span>
            <span className="text-q-text3">{group.issues.length}</span>
            <button
              type="button"
              aria-label={`Create issue in ${group.label}`}
              onClick={() => interaction.onCreateInGroup(group.descriptor)}
              className="ml-auto flex h-6 w-6 items-center justify-center rounded text-q-text3 hover:bg-q-active hover:text-q-text"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="q-scroll flex min-h-[60px] flex-1 flex-col gap-2 overflow-y-auto px-1 pb-2">
            {group.issues.map((issue) => (
              <div key={issue._id} onDragOver={(event) => onDragOverCard(event, group, issue._id)}>
                {over?.group === group.key && over.before === issue._id && dragging?._id !== issue._id ? (
                  <div className="mb-2 h-0.5 rounded bg-q-accent" />
                ) : null}
                <div className={dragging?._id === issue._id ? "opacity-40" : ""}>
                  <BoardCard
                    issue={issue}
                    display={display}
                    interaction={interaction}
                    onDragStart={setDragging}
                    onDragEnd={() => {
                      setDragging(null);
                      setOver(null);
                    }}
                  />
                </div>
              </div>
            ))}
            {over?.group === group.key && over.before === null && dragging ? <div className="h-0.5 rounded bg-q-accent" /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
