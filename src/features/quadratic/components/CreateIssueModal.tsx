"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { ChevronRight, Maximize2, X } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useIssueActions, useToast, useWorkspace } from "../data";
import { Avatar, LabelDot, PRIORITIES, PriorityIcon, ProjectIcon, StatusIcon, TeamIcon } from "../icons";
import { useShortcuts } from "../shortcuts";
import type { CreateDefaults } from "../ui";
import { AutoTextarea } from "./Markdown";
import {
  CycleGlyph,
  DueDateMenu,
  ESTIMATE_SCALES,
  EstimateGlyph,
  PLACEHOLDERS,
  PickerList,
  PropertyChip,
  buildItems,
  type PropertyKind,
} from "./pickers";
import { Button, Dialog, Kbd, Popover, Switch, Tooltip, formatShortDate } from "./primitives";

type Draft = {
  teamId: Id<"quadraticTeams">;
  title: string;
  description: string;
  stateId?: Id<"quadraticStates">;
  priority: number;
  assigneeId?: Id<"quadraticUsers">;
  projectId?: Id<"quadraticProjects">;
  cycleId?: Id<"quadraticCycles">;
  parentId?: Id<"quadraticIssues">;
  labelIds: Id<"quadraticLabels">[];
  estimate?: number;
  dueDate?: string;
};

export function CreateIssueModal({
  open,
  defaults,
  onClose,
  onCreated,
}: {
  open: boolean;
  defaults: CreateDefaults;
  onClose: () => void;
  onCreated: (identifier: string) => void;
}) {
  const ws = useWorkspace();
  const actions = useIssueActions();
  const toast = useToast();
  const createLabel = useMutation(api.quadratic.labels.create);
  const initialDraft = useMemo<Draft>(() => {
    const teamId = defaults.teamId ?? (ws.teams[0]?._id as Id<"quadraticTeams">);
    return {
      teamId,
      title: "",
      description: "",
      stateId: defaults.stateId,
      priority: defaults.priority ?? 0,
      assigneeId: defaults.assigneeId,
      projectId: defaults.projectId,
      cycleId: defaults.cycleId,
      parentId: defaults.parentId,
      labelIds: defaults.labelIds ?? [],
    };
  }, [defaults, ws.teams]);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [createMore, setCreateMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openPicker, setOpenPicker] = useState<PropertyKind | null>(null);

  useEffect(() => {
    if (open) setDraft(initialDraft);
  }, [initialDraft, open]);

  const team = ws.teamsById.get(draft.teamId);
  const states = ws.statesByTeam.get(draft.teamId) ?? [];
  const state =
    (draft.stateId && ws.statesById.get(draft.stateId)) ||
    states.find((s) => s.type === "unstarted") ||
    states.find((s) => s.type === "backlog") ||
    states[0];
  const assignee = draft.assigneeId ? ws.membersById.get(draft.assigneeId) : undefined;
  const project = draft.projectId ? ws.projectsById.get(draft.projectId) : undefined;
  const cycle = draft.cycleId ? ws.cyclesById.get(draft.cycleId) : undefined;
  const parent = draft.parentId ? ws.issuesById.get(draft.parentId) : undefined;

  const submit = async () => {
    if (!draft.title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { identifier } = await actions.create({
        teamId: draft.teamId,
        title: draft.title,
        description: draft.description,
        stateId: state?._id,
        priority: draft.priority,
        assigneeId: draft.assigneeId,
        projectId: draft.projectId,
        cycleId: draft.cycleId,
        parentId: draft.parentId,
        labelIds: draft.labelIds,
        estimate: draft.estimate,
        dueDate: draft.dueDate,
      });
      toast.show({
        title: `${identifier} created`,
        description: draft.title,
        action: { label: "View issue", onClick: () => onCreated(identifier) },
      });
      if (createMore) setDraft({ ...draft, title: "", description: "" });
      else onClose();
    } catch (error) {
      toast.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  useShortcuts({ "*": () => undefined, "mod+enter": () => void submit() }, open);

  const selection = (kind: PropertyKind) => {
    switch (kind) {
      case "status":
        return new Set(state ? [state._id as string] : []);
      case "priority":
        return new Set([String(draft.priority)]);
      case "assignee":
        return new Set([draft.assigneeId ?? "none"]);
      case "labels":
        return new Set<string>(draft.labelIds);
      case "project":
        return new Set([draft.projectId ?? "none"]);
      case "cycle":
        return new Set([draft.cycleId ?? "none"]);
      case "estimate":
        return new Set([draft.estimate === undefined ? "none" : String(draft.estimate)]);
      case "team":
        return new Set<string>([draft.teamId]);
      default:
        return new Set<string>();
    }
  };

  const pick = (kind: PropertyKind, id: string) => {
    const value = id === "none" ? undefined : id;
    setDraft((current) => {
      switch (kind) {
        case "status":
          return { ...current, stateId: id as Id<"quadraticStates"> };
        case "priority":
          return { ...current, priority: Number(id) };
        case "assignee":
          return { ...current, assigneeId: value as Id<"quadraticUsers"> | undefined };
        case "labels": {
          const labelId = id as Id<"quadraticLabels">;
          return {
            ...current,
            labelIds: current.labelIds.includes(labelId)
              ? current.labelIds.filter((l) => l !== labelId)
              : [...current.labelIds, labelId],
          };
        }
        case "project":
          return { ...current, projectId: value as Id<"quadraticProjects"> | undefined };
        case "cycle":
          return { ...current, cycleId: value as Id<"quadraticCycles"> | undefined };
        case "estimate":
          return { ...current, estimate: value === undefined ? undefined : Number(value) };
        case "team":
          return {
            ...current,
            teamId: id as Id<"quadraticTeams">,
            stateId: undefined,
            cycleId: undefined,
            labelIds: current.labelIds.filter((labelId) => {
              const label = ws.labelsById.get(labelId);
              return label && (!label.teamId || label.teamId === id);
            }),
          };
        default:
          return current;
      }
    });
    if (kind !== "labels") setOpenPicker(null);
  };

  const chip = (kind: PropertyKind, icon: React.ReactNode, label: React.ReactNode, muted = false) => (
    <Popover
      key={kind}
      open={openPicker === kind}
      onOpenChange={(next) => setOpenPicker(next ? kind : null)}
      className="w-[260px]"
      trigger={<PropertyChip icon={icon} label={label} muted={muted} />}
    >
      {openPicker === kind ? (
        kind === "dueDate" ? (
          <DueDateMenu
            value={draft.dueDate}
            onChange={(value) => {
              setDraft((current) => ({ ...current, dueDate: value ?? undefined }));
              setOpenPicker(null);
            }}
          />
        ) : (
          <PickerList
            placeholder={PLACEHOLDERS[kind]}
            items={buildItems(kind, ws, draft.teamId, selection(kind))}
            multi={kind === "labels"}
            onSelect={(id) => pick(kind, id)}
            onCreate={
              kind === "labels"
                ? async (name) => {
                    try {
                      const labelId = await createLabel({ token: ws.token, workspaceId: ws.workspace._id, name });
                      pick("labels", labelId);
                    } catch (error) {
                      toast.error(error);
                    }
                  }
                : undefined
            }
            createLabel={(name) => `Create new label: "${name}"`}
          />
        )
      ) : null}
    </Popover>
  );

  const estimateText =
    draft.estimate === undefined
      ? "Estimate"
      : team?.estimateType === "tShirt"
        ? (ESTIMATE_SCALES.tShirt.find((o) => o.value === draft.estimate)?.label ?? String(draft.estimate))
        : `${draft.estimate} Points`;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} className="max-w-[740px]" label="Create issue">
      <div className="flex items-center gap-1.5 px-4 pt-3.5 text-[12px] text-q-text2">
        <Popover
          open={openPicker === "team"}
          onOpenChange={(next) => setOpenPicker(next ? "team" : null)}
          className="w-[240px]"
          trigger={
            <button type="button" className="inline-flex h-6 items-center gap-1.5 rounded-[5px] border border-q-border px-1.5 hover:bg-q-hover">
              {team ? <TeamIcon name={team.name} color={team.color} icon={team.icon} size={14} /> : null}
              {team?.key}
            </button>
          }
        >
          {openPicker === "team" ? (
            <PickerList placeholder={PLACEHOLDERS.team} items={buildItems("team", ws, draft.teamId, selection("team"))} onSelect={(id) => pick("team", id)} />
          ) : null}
        </Popover>
        <ChevronRight size={12} className="text-q-text4" />
        <span>{parent ? `Sub-issue of ${ws.identifier(parent)}` : "New issue"}</span>
        <div className="ml-auto flex items-center">
          <Tooltip label="Close" keys={["Esc"]}>
            <button type="button" aria-label="Close" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded text-q-text3 hover:bg-q-hover hover:text-q-text">
              <X size={15} />
            </button>
          </Tooltip>
        </div>
      </div>
      <div className="px-4 pt-3">
        <AutoTextarea
          autoFocus
          value={draft.title}
          onChange={(title) => setDraft((current) => ({ ...current, title: title.replace(/\n/g, " ") }))}
          placeholder="Issue title"
          aria-label="Issue title"
          className="text-[18px] font-medium text-q-text"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !(event.metaKey || event.ctrlKey)) event.preventDefault();
          }}
        />
        <AutoTextarea
          value={draft.description}
          onChange={(description) => setDraft((current) => ({ ...current, description }))}
          placeholder="Add description…"
          aria-label="Description"
          minRows={3}
          className="mt-2 max-h-[40vh] text-[14px] leading-[1.6] text-q-text2"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3 pt-4">
        {chip(
          "status",
          state ? <StatusIcon type={state.type} color={state.color} progress={ws.stateProgress(state)} /> : null,
          state?.name ?? "Status",
        )}
        {chip("priority", <PriorityIcon priority={draft.priority} size={14} />, draft.priority ? PRIORITIES[draft.priority].name : "Priority", draft.priority === 0)}
        {chip("assignee", <Avatar name={assignee?.name} hue={assignee?.avatarHue} size={16} />, assignee?.name ?? "Assignee", !assignee)}
        {chip("project", <ProjectIcon color={project?.color ?? "var(--q-text-3)"} icon={project?.icon} />, project?.name ?? "Project", !project)}
        {chip(
          "labels",
          draft.labelIds.length ? (
            <span className="flex -space-x-0.5">
              {draft.labelIds.slice(0, 3).map((id) => (
                <LabelDot key={id} color={ws.labelsById.get(id)?.color ?? "var(--q-text-3)"} />
              ))}
            </span>
          ) : (
            <LabelDot color="var(--q-text-3)" />
          ),
          draft.labelIds.length === 0
            ? "Labels"
            : draft.labelIds.length === 1
              ? (ws.labelsById.get(draft.labelIds[0])?.name ?? "1 label")
              : `${draft.labelIds.length} labels`,
          draft.labelIds.length === 0,
        )}
        {team?.cyclesEnabled
          ? chip("cycle", <CycleGlyph active={Boolean(cycle)} />, cycle ? (cycle.name ?? `Cycle ${cycle.number}`) : "Cycle", !cycle)
          : null}
        {team && team.estimateType !== "notUsed"
          ? chip("estimate", <EstimateGlyph />, estimateText, draft.estimate === undefined)
          : null}
        {chip(
          "dueDate",
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
            <rect x="1.5" y="2.5" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
            <path d="M1.5 5h9M4 1.5v2M8 1.5v2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          </svg>,
          draft.dueDate ? formatShortDate(draft.dueDate) : "Due date",
          !draft.dueDate,
        )}
      </div>
      <div className="flex items-center gap-3 border-t border-q-border px-4 py-3">
        <span className="hidden items-center gap-1 text-[12px] text-q-text4 sm:flex">
          <Maximize2 size={12} /> Markdown supported
        </span>
        <label className="ml-auto flex items-center gap-2 text-[12px] text-q-text3">
          <Switch checked={createMore} onChange={setCreateMore} label="Create more" />
          Create more
        </label>
        <Button variant="primary" size="md" onClick={() => void submit()} disabled={!draft.title.trim() || submitting}>
          Create issue
          <Kbd className="ml-1 border-white/20 bg-white/10 text-white/80">⌘↵</Kbd>
        </Button>
      </div>
    </Dialog>
  );
}
