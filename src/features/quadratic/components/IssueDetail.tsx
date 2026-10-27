"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowUp,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Copy,
  GitBranch,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Reply,
  SmilePlus,
  Star,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { Command } from "cmdk";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  useIssueActions,
  useToast,
  useWorkspace,
  type Issue,
  type IssueDetailData,
} from "../data";
import { Avatar, LabelDot, PRIORITIES, PriorityIcon, ProjectIcon, StatusIcon, TeamIcon } from "../icons";
import { useShortcuts } from "../shortcuts";
import { useUi } from "../ui";
import { branchName, useIssueClipboard } from "./IssueContextMenu";
import { lastListOrder } from "./IssueView";
import { DueDate } from "./IssueRow";
import { AutoTextarea, EditableMarkdown, Markdown } from "./Markdown";
import {
  CycleGlyph,
  EstimateGlyph,
  PropertyPopover,
  estimateLabel,
  type PropertyKind,
} from "./pickers";
import { EmptyState, IconButton, Menu, MenuItem, MenuSeparator, Popover, Tooltip, formatShortDate, timeAgo } from "./primitives";
import { cn } from "@/lib/utils";

const REACTIONS = ["👍", "👎", "❤️", "🎉", "😄", "😕", "👀", "🚀", "🔥", "✅"];

const PROPERTY_KEYS: Record<string, PropertyKind> = {
  s: "status",
  p: "priority",
  a: "assignee",
  l: "labels",
  "shift+p": "project",
  "shift+c": "cycle",
  "shift+d": "dueDate",
  "shift+e": "estimate",
  "shift+m": "team",
};

export function IssueDetail({ identifier, embedded = false }: { identifier: string; embedded?: boolean }) {
  const ws = useWorkspace();
  const data = useQuery(api.quadratic.issues.get, {
    token: ws.token,
    workspaceId: ws.workspace._id,
    identifier,
  });
  if (data === undefined) {
    return (
      <div className="flex h-full flex-col">
        <div className="h-11 border-b border-q-line" />
        <div className="mx-auto w-full max-w-[760px] space-y-4 px-8 py-10">
          <div className="h-8 w-2/3 animate-pulse rounded bg-q-hover" />
          <div className="h-4 w-full animate-pulse rounded bg-q-hover" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-q-hover" />
        </div>
      </div>
    );
  }
  if (data === null) {
    return <EmptyState title="Issue not found" description={`${identifier} doesn't exist or was deleted.`} />;
  }
  return <IssueDetailLoaded data={data} embedded={embedded} />;
}

function IssueDetailLoaded({ data, embedded }: { data: IssueDetailData; embedded: boolean }) {
  const ws = useWorkspace();
  const ui = useUi();
  const actions = useIssueActions();
  const toast = useToast();
  const clipboard = useIssueClipboard();
  const toggleFavorite = useMutation(api.quadratic.favorites.toggle);
  const setSubscribed = useMutation(api.quadratic.issues.setSubscribed);
  const { issue } = data;
  // The live list copy carries optimistic updates; fall back to the detail copy.
  const live: Issue = (ws.issuesById.get(issue._id) as Issue | undefined) ?? issue;
  const team = ws.teamsById.get(live.teamId);
  const identifier = ws.identifier(live);
  const isFavorite = ws.favorites.some((fav) => fav.kind === "issue" && fav.targetId === issue._id);
  const position = lastListOrder.ids.indexOf(issue._id);

  useEffect(() => {
    ui.activeIssues.current = () => [live];
  }, [live, ui.activeIssues]);

  const step = (delta: number) => {
    const nextId = lastListOrder.ids[position + delta];
    const next = nextId ? ws.issuesById.get(nextId) : undefined;
    if (next) ui.navigate(`/issue/${ws.identifier(next)}`);
  };

  const remove = () => {
    void actions.setArchived([issue._id], true);
    toast.show({
      title: `${identifier} deleted`,
      action: { label: "Undo", onClick: () => void actions.setArchived([issue._id], false) },
    });
    if (!embedded) ui.navigate(lastListOrder.path ?? (team ? `/team/${team.key}/all` : "/my-issues/assigned"));
  };

  const shortcuts: Record<string, (event: KeyboardEvent) => void> = {
    "mod+.": () => void clipboard.copy(identifier, `Copied ${identifier}`),
    "mod+backspace": remove,
    i: () => void actions.update(issue._id, { assigneeId: ws.viewer._id }),
  };
  if (!embedded) {
    shortcuts.j = () => step(1);
    shortcuts.k = () => step(-1);
    shortcuts.escape = () => ui.navigate(lastListOrder.path ?? (team ? `/team/${team.key}/all` : "/my-issues/assigned"));
  }
  for (const [key, kind] of Object.entries(PROPERTY_KEYS)) shortcuts[key] = () => ui.openPicker(kind, [live]);
  useShortcuts(shortcuts, !ui.dialogOpen);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-q-line px-3 sm:px-5">
        {team ? (
          <button
            type="button"
            onClick={() => ui.navigate(`/team/${team.key}/all`)}
            className="flex items-center gap-1.5 rounded px-1 py-0.5 text-q-text2 hover:bg-q-hover"
          >
            <TeamIcon name={team.name} color={team.color} icon={team.icon} size={16} />
            {team.name}
          </button>
        ) : null}
        <span className="text-q-text4">›</span>
        <span className="text-q-text2">{identifier}</span>
        <Tooltip label={isFavorite ? "Remove from favorites" : "Add to favorites"}>
          <IconButton
            label="Favorite"
            onClick={() =>
              toggleFavorite({ token: ws.token, workspaceId: ws.workspace._id, kind: "issue", targetId: issue._id }).catch(toast.error)
            }
          >
            <Star size={14} className={isFavorite ? "fill-[#f2c94c] text-[#f2c94c]" : ""} />
          </IconButton>
        </Tooltip>
        <Menu
          trigger={
            <IconButton label="More actions">
              <MoreHorizontal size={15} />
            </IconButton>
          }
        >
          <MenuItem icon={<Copy size={14} />} keys={["⌘", "."]} onSelect={() => clipboard.copy(identifier, `Copied ${identifier}`)}>
            Copy ID
          </MenuItem>
          <MenuItem icon={<Link2 size={14} />} onSelect={() => clipboard.copy(clipboard.url(live), "Copied issue URL")}>
            Copy link
          </MenuItem>
          <MenuItem
            icon={<GitBranch size={14} />}
            onSelect={() => clipboard.copy(branchName(identifier, live.title, ws.viewer.handle), "Copied git branch name")}
          >
            Copy git branch name
          </MenuItem>
          <MenuSeparator />
          <MenuItem danger icon={<Trash2 size={14} />} keys={["⌘", "⌫"]} onSelect={remove}>
            Delete issue
          </MenuItem>
        </Menu>
        {!embedded && position >= 0 ? (
          <div className="ml-auto flex items-center gap-1 text-[12px] text-q-text3">
            <span className="mr-1 tabular-nums">
              {position + 1} / {lastListOrder.ids.length}
            </span>
            <Tooltip label="Previous issue" keys={["K"]}>
              <IconButton label="Previous issue" disabled={position <= 0} onClick={() => step(-1)}>
                <ChevronUp size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip label="Next issue" keys={["J"]}>
              <IconButton label="Next issue" disabled={position >= lastListOrder.ids.length - 1} onClick={() => step(1)}>
                <ChevronDown size={15} />
              </IconButton>
            </Tooltip>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="q-scroll min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[800px] px-5 pb-24 pt-8 sm:px-10">
            <TitleEditor issue={live} />
            <div className="mt-3">
              <EditableMarkdown
                value={issue.description}
                onSave={(description) => void actions.update(issue._id, { description })}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
              <MobileProperties issue={live} />
            </div>
            <SubIssues issue={live} />
            <Activity data={data} issue={live} onToggleSubscribe={(subscribed) =>
              setSubscribed({ token: ws.token, workspaceId: ws.workspace._id, issueId: issue._id, subscribed }).catch(toast.error)
            } />
          </div>
        </div>
        <aside className="q-scroll hidden w-[300px] shrink-0 border-l border-q-line px-5 py-5 lg:block">
          <PropertiesPanel issue={live} data={data} />
        </aside>
      </div>
    </div>
  );
}

function TitleEditor({ issue }: { issue: Issue }) {
  const actions = useIssueActions();
  const [draft, setDraft] = useState(issue.title);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(issue.title);
  }, [focused, issue.title]);
  const commit = () => {
    setFocused(false);
    const next = draft.replace(/\s+/g, " ").trim();
    if (next && next !== issue.title) void actions.update(issue._id, { title: next });
    else setDraft(issue.title);
  };
  return (
    <AutoTextarea
      value={draft}
      onChange={(value) => setDraft(value.replace(/\n/g, ""))}
      onFocus={() => setFocused(true)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          (event.target as HTMLTextAreaElement).blur();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setDraft(issue.title);
          (event.target as HTMLTextAreaElement).blur();
        }
      }}
      aria-label="Issue title"
      className="text-[22px] font-semibold leading-[1.3] tracking-[-0.01em] text-q-text sm:text-[24px]"
    />
  );
}

function SubIssues({ issue }: { issue: Issue }) {
  const ws = useWorkspace();
  const ui = useUi();
  const children = ws.childrenByParent.get(issue._id) ?? [];
  const done = children.filter((child) => {
    const type = ws.statesById.get(child.stateId)?.type;
    return type === "completed" || type === "canceled";
  }).length;
  return (
    <div className="mt-6">
      {children.length > 0 ? (
        <div className="mb-1 flex items-center gap-2 text-[12px] text-q-text3">
          <span className="font-medium text-q-text2">Sub-issues</span>
          <span>
            {done}/{children.length}
          </span>
        </div>
      ) : null}
      {children.length > 0 ? (
        <div className="overflow-hidden rounded-[8px] border border-q-border">
          {children.map((child) => {
            const state = ws.statesById.get(child.stateId);
            const assignee = child.assigneeId ? ws.membersById.get(child.assigneeId) : undefined;
            return (
              <div
                key={child._id}
                onClick={() => ui.navigate(`/issue/${ws.identifier(child)}`)}
                className="flex h-9 cursor-default items-center gap-2.5 border-b border-q-line px-3 last:border-b-0 hover:bg-q-hover"
              >
                <PriorityIcon priority={child.priority} size={14} />
                <span className="w-[56px] shrink-0 text-[12px] text-q-text3">{ws.identifier(child)}</span>
                {state ? <StatusIcon type={state.type} color={state.color} progress={ws.stateProgress(state)} /> : null}
                <span className="min-w-0 flex-1 truncate text-q-text">{child.title}</span>
                <Avatar name={assignee?.name} hue={assignee?.avatarHue} size={18} />
              </div>
            );
          })}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() =>
          ui.openCreate({ teamId: issue.teamId, parentId: issue._id, projectId: issue.projectId, cycleId: issue.cycleId })
        }
        className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-[12px] text-q-text3 hover:bg-q-hover hover:text-q-text"
      >
        <Plus size={13} />
        Add sub-issues
      </button>
    </div>
  );
}

// ---------- properties ----------

function PropertyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[34px] items-center gap-2">
      <span className="w-[86px] shrink-0 text-[12px] text-q-text3">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function ValueButton({ children, muted, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { muted?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-left text-[13px] transition-colors hover:bg-q-hover",
        muted ? "text-q-text3" : "text-q-text",
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function usePropertyDisplay(issue: Issue) {
  const ws = useWorkspace();
  const state = ws.statesById.get(issue.stateId);
  const assignee = issue.assigneeId ? ws.membersById.get(issue.assigneeId) : undefined;
  const project = issue.projectId ? ws.projectsById.get(issue.projectId) : undefined;
  const cycle = issue.cycleId ? ws.cyclesById.get(issue.cycleId) : undefined;
  const team = ws.teamsById.get(issue.teamId);
  return { ws, state, assignee, project, cycle, team };
}

function PropertiesPanel({ issue, data }: { issue: Issue; data: IssueDetailData }) {
  const { ws, state, assignee, project, cycle, team } = usePropertyDisplay(issue);
  const closed = state?.type === "completed" || state?.type === "canceled";
  const estimate = estimateLabel(ws, issue.teamId, issue.estimate);
  const one = [issue];
  return (
    <div className="space-y-0.5">
      <div className="mb-2 text-[12px] font-medium text-q-text3">Properties</div>
      <PropertyRow label="Status">
        <PropertyPopover
          kind="status"
          issues={one}
          trigger={
            <ValueButton>
              {state ? <StatusIcon type={state.type} color={state.color} progress={ws.stateProgress(state)} /> : null}
              {state?.name}
            </ValueButton>
          }
        />
      </PropertyRow>
      <PropertyRow label="Priority">
        <PropertyPopover
          kind="priority"
          issues={one}
          trigger={
            <ValueButton muted={issue.priority === 0}>
              <PriorityIcon priority={issue.priority} />
              {issue.priority === 0 ? "Set priority" : PRIORITIES[issue.priority].name}
            </ValueButton>
          }
        />
      </PropertyRow>
      <PropertyRow label="Assignee">
        <PropertyPopover
          kind="assignee"
          issues={one}
          trigger={
            <ValueButton muted={!assignee}>
              <Avatar name={assignee?.name} hue={assignee?.avatarHue} size={18} />
              {assignee?.name ?? "Assign"}
            </ValueButton>
          }
        />
      </PropertyRow>
      <PropertyRow label="Labels">
        <PropertyPopover
          kind="labels"
          issues={one}
          trigger={
            <ValueButton muted={issue.labelIds.length === 0}>
              {issue.labelIds.length === 0 ? (
                "Add label"
              ) : (
                <span className="flex flex-wrap gap-1 py-1">
                  {issue.labelIds.map((labelId) => {
                    const label = ws.labelsById.get(labelId);
                    return label ? (
                      <span key={label._id} className="inline-flex h-[22px] items-center gap-1.5 rounded-full border border-q-border px-2 text-[12px] text-q-text2">
                        <LabelDot color={label.color} />
                        {label.name}
                      </span>
                    ) : null;
                  })}
                </span>
              )}
            </ValueButton>
          }
        />
      </PropertyRow>
      <PropertyRow label="Project">
        <PropertyPopover
          kind="project"
          issues={one}
          trigger={
            <ValueButton muted={!project}>
              <ProjectIcon color={project?.color ?? "var(--q-text-4)"} icon={project?.icon} />
              <span className="truncate">{project?.name ?? "Add to project"}</span>
            </ValueButton>
          }
        />
      </PropertyRow>
      {team?.cyclesEnabled ? (
        <PropertyRow label="Cycle">
          <PropertyPopover
            kind="cycle"
            issues={one}
            trigger={
              <ValueButton muted={!cycle}>
                <CycleGlyph active={Boolean(cycle)} />
                {cycle ? (cycle.name ?? `Cycle ${cycle.number}`) : "Add to cycle"}
              </ValueButton>
            }
          />
        </PropertyRow>
      ) : null}
      {team && team.estimateType !== "notUsed" ? (
        <PropertyRow label="Estimate">
          <PropertyPopover
            kind="estimate"
            issues={one}
            trigger={
              <ValueButton muted={!estimate}>
                <EstimateGlyph />
                {estimate ? `${estimate}${team.estimateType === "tShirt" ? "" : " Points"}` : "Set estimate"}
              </ValueButton>
            }
          />
        </PropertyRow>
      ) : null}
      <PropertyRow label="Due date">
        <PropertyPopover
          kind="dueDate"
          issues={one}
          trigger={
            <ValueButton muted={!issue.dueDate}>
              {issue.dueDate ? <DueDate value={issue.dueDate} closed={closed} /> : "Set due date"}
            </ValueButton>
          }
        />
      </PropertyRow>
      <div className="my-4 h-px bg-q-line" />
      <ParentAndRelations issue={issue} data={data} />
    </div>
  );
}

function MobileProperties({ issue }: { issue: Issue }) {
  const { ws, state, assignee, project } = usePropertyDisplay(issue);
  const chip = "inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-q-border px-2 text-[12px] text-q-text2";
  const one = [issue];
  return (
    <>
      <PropertyPopover kind="status" issues={one} trigger={<button type="button" className={chip}>{state ? <StatusIcon type={state.type} color={state.color} progress={ws.stateProgress(state)} /> : null}{state?.name}</button>} />
      <PropertyPopover kind="priority" issues={one} trigger={<button type="button" className={chip}><PriorityIcon priority={issue.priority} size={14} />{PRIORITIES[issue.priority].name}</button>} />
      <PropertyPopover kind="assignee" issues={one} trigger={<button type="button" className={chip}><Avatar name={assignee?.name} hue={assignee?.avatarHue} size={16} />{assignee?.name ?? "Assignee"}</button>} />
      <PropertyPopover kind="labels" issues={one} trigger={<button type="button" className={chip}><LabelDot color="var(--q-text-3)" />{issue.labelIds.length ? `${issue.labelIds.length} labels` : "Labels"}</button>} />
      <PropertyPopover kind="project" issues={one} trigger={<button type="button" className={chip}><ProjectIcon color={project?.color ?? "var(--q-text-4)"} />{project?.name ?? "Project"}</button>} />
    </>
  );
}

const RELATION_LABELS = {
  blocks: { outgoing: "Blocks", incoming: "Blocked by" },
  related: { outgoing: "Related to", incoming: "Related to" },
  duplicate: { outgoing: "Duplicate of", incoming: "Duplicated by" },
} as const;

function IssueSearchList({ exclude, onPick, placeholder }: { exclude: Set<string>; onPick: (issue: Issue) => void; placeholder: string }) {
  const ws = useWorkspace();
  const [search, setSearch] = useState("");
  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ws.issues
      .filter((issue) => !exclude.has(issue._id))
      .filter((issue) => !query || issue.title.toLowerCase().includes(query) || ws.identifier(issue).toLowerCase().includes(query))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 30);
  }, [exclude, search, ws]);
  return (
    <Command shouldFilter={false} className="q-cmd flex max-h-[360px] flex-col" loop>
      <div className="flex h-10 items-center border-b border-q-border px-3">
        <Command.Input autoFocus value={search} onValueChange={setSearch} placeholder={placeholder} className="text-[13px]" />
      </div>
      <Command.List className="q-scroll py-1">
        <Command.Empty>No issues</Command.Empty>
        {results.map((issue) => {
          const state = ws.statesById.get(issue.stateId);
          return (
            <Command.Item key={issue._id} value={issue._id} onSelect={() => onPick(issue)}>
              {state ? <StatusIcon type={state.type} color={state.color} progress={ws.stateProgress(state)} /> : null}
              <span className="w-[56px] shrink-0 text-[12px] text-q-text3">{ws.identifier(issue)}</span>
              <span className="truncate">{issue.title}</span>
            </Command.Item>
          );
        })}
      </Command.List>
    </Command>
  );
}

function ParentAndRelations({ issue, data }: { issue: Issue; data: IssueDetailData }) {
  const ws = useWorkspace();
  const ui = useUi();
  const toast = useToast();
  const actions = useIssueActions();
  const addRelation = useMutation(api.quadratic.issues.addRelation);
  const removeRelation = useMutation(api.quadratic.issues.removeRelation);
  const [relationType, setRelationType] = useState<"blocks" | "blockedBy" | "related" | "duplicate" | "parent" | null>(null);
  const parent = issue.parentId ? ws.issuesById.get(issue.parentId) : undefined;
  const exclude = new Set<string>([issue._id, ...data.relations.map((r) => r.issue._id as string)]);

  const link = (target: Issue, label: string, onRemove: () => void, key: string) => {
    const state = ws.statesById.get(target.stateId);
    return (
      <div key={key} className="group flex items-center gap-2 rounded-[6px] px-1 py-1 hover:bg-q-hover">
        <span className="w-[74px] shrink-0 text-[12px] text-q-text3">{label}</span>
        <button type="button" onClick={() => ui.navigate(`/issue/${ws.identifier(target)}`)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
          {state ? <StatusIcon type={state.type} color={state.color} progress={ws.stateProgress(state)} size={12} /> : null}
          <span className="shrink-0 text-[12px] text-q-text3">{ws.identifier(target)}</span>
          <span className="truncate text-[12px] text-q-text2">{target.title}</span>
        </button>
        <button type="button" aria-label="Remove" onClick={onRemove} className="text-q-text4 opacity-0 hover:text-q-text group-hover:opacity-100">
          <X size={12} />
        </button>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[12px] font-medium text-q-text3">Relations</span>
        <Popover
          open={relationType !== null}
          onOpenChange={(open) => !open && setRelationType(null)}
          align="end"
          className="w-[320px]"
          trigger={
            <span>
              <Menu
                align="end"
                trigger={
                  <IconButton label="Add relation" className="h-6 w-6">
                    <Plus size={13} />
                  </IconButton>
                }
              >
                <MenuItem onSelect={() => setRelationType("parent")}>Set parent issue</MenuItem>
                <MenuItem onSelect={() => setRelationType("blocks")}>Blocks…</MenuItem>
                <MenuItem onSelect={() => setRelationType("blockedBy")}>Blocked by…</MenuItem>
                <MenuItem onSelect={() => setRelationType("related")}>Related to…</MenuItem>
                <MenuItem onSelect={() => setRelationType("duplicate")}>Duplicate of…</MenuItem>
              </Menu>
            </span>
          }
        >
          {relationType ? (
            <IssueSearchList
              exclude={exclude}
              placeholder={relationType === "parent" ? "Set parent issue…" : "Search issues…"}
              onPick={async (target) => {
                const type = relationType;
                setRelationType(null);
                if (type === "parent") {
                  await actions.update(issue._id, { parentId: target._id });
                  return;
                }
                try {
                  await addRelation({ token: ws.token, workspaceId: ws.workspace._id, issueId: issue._id, relatedIssueId: target._id, type });
                } catch (error) {
                  toast.error(error);
                }
              }}
            />
          ) : null}
        </Popover>
      </div>
      {parent ? link(parent, "Parent", () => void actions.update(issue._id, { parentId: null }), "parent") : null}
      {data.relations.map((relation) =>
        link(
          (ws.issuesById.get(relation.issue._id) as Issue | undefined) ?? (relation.issue as Issue),
          RELATION_LABELS[relation.type][relation.direction],
          () =>
            void removeRelation({ token: ws.token, workspaceId: ws.workspace._id, relationId: relation._id }).catch(toast.error),
          relation._id,
        ),
      )}
      {!parent && data.relations.length === 0 ? <div className="px-1 text-[12px] text-q-text4">No relations</div> : null}
      <div className="my-4 h-px bg-q-line" />
      <div className="space-y-1 text-[12px] text-q-text3">
        <div>Created {formatShortDate(issue.createdAt)} by {ws.membersById.get(issue.creatorId)?.name ?? "someone"}</div>
        <div>Updated {timeAgo(issue.updatedAt)}</div>
      </div>
    </div>
  );
}

// ---------- activity ----------

type HistoryEntry = IssueDetailData["history"][number];
type CommentEntry = IssueDetailData["comments"][number];

function HistoryLine({ entry }: { entry: HistoryEntry }) {
  const ws = useWorkspace();
  const actor = entry.actorId ? ws.membersById.get(entry.actorId) : undefined;
  const name = <span className="font-medium text-q-text2">{actor?.name ?? "Someone"}</span>;
  const stateName = (id?: string) => (id ? ws.statesById.get(id)?.name : undefined) ?? "a removed status";
  const member = (id?: string) => (id ? ws.membersById.get(id)?.name : undefined);
  const strong = (text: ReactNode) => <span className="text-q-text2">{text}</span>;
  let text: ReactNode;
  let icon: ReactNode = <span className="h-1.5 w-1.5 rounded-full bg-q-text4" />;
  switch (entry.kind) {
    case "created":
      text = <>{name} created the issue</>;
      break;
    case "state": {
      const state = entry.toValue ? ws.statesById.get(entry.toValue) : undefined;
      icon = state ? <StatusIcon type={state.type} color={state.color} progress={ws.stateProgress(state)} size={12} /> : icon;
      text = <>{name} changed status from {strong(stateName(entry.fromValue))} to {strong(stateName(entry.toValue))}</>;
      break;
    }
    case "priority":
      icon = <PriorityIcon priority={Number(entry.toValue)} size={12} />;
      text = Number(entry.toValue) === 0
        ? <>{name} removed the priority</>
        : <>{name} set priority to {strong(PRIORITIES[Number(entry.toValue)]?.name)}</>;
      break;
    case "assignee":
      icon = <Avatar name={member(entry.toValue)} hue={entry.toValue ? ws.membersById.get(entry.toValue)?.avatarHue : undefined} size={14} />;
      text = !entry.toValue
        ? <>{name} removed assignee {strong(member(entry.fromValue) ?? "")}</>
        : entry.toValue === entry.actorId
          ? <>{name} self-assigned the issue</>
          : <>{name} assigned the issue to {strong(member(entry.toValue) ?? "someone")}</>;
      break;
    case "labelAdded":
    case "labelRemoved": {
      const label = ws.labelsById.get((entry.toValue ?? entry.fromValue) as string);
      icon = <LabelDot color={label?.color ?? "var(--q-text-4)"} />;
      text = <>{name} {entry.kind === "labelAdded" ? "added" : "removed"} label {strong(label?.name ?? "a deleted label")}</>;
      break;
    }
    case "project": {
      const project = entry.toValue ? ws.projectsById.get(entry.toValue) : undefined;
      icon = <ProjectIcon color={project?.color ?? "var(--q-text-4)"} size={12} />;
      text = entry.toValue ? <>{name} added the issue to project {strong(project?.name ?? "a project")}</> : <>{name} removed the issue from its project</>;
      break;
    }
    case "cycle": {
      const cycle = entry.toValue ? ws.cyclesById.get(entry.toValue) : undefined;
      icon = <CycleGlyph active={Boolean(cycle)} />;
      text = entry.toValue ? <>{name} moved the issue to {strong(cycle?.name ?? `Cycle ${cycle?.number ?? ""}`)}</> : <>{name} removed the issue from its cycle</>;
      break;
    }
    case "parent": {
      const parent = entry.toValue ? ws.issuesById.get(entry.toValue) : undefined;
      text = entry.toValue ? <>{name} set parent to {strong(parent ? ws.identifier(parent) : "an issue")}</> : <>{name} removed the parent issue</>;
      break;
    }
    case "title":
      text = <>{name} changed the title from {strong(`“${entry.fromValue}”`)} to {strong(`“${entry.toValue}”`)}</>;
      break;
    case "estimate":
      text = entry.toValue ? <>{name} set the estimate to {strong(entry.toValue)}</> : <>{name} removed the estimate</>;
      break;
    case "dueDate":
      text = entry.toValue ? <>{name} set the due date to {strong(formatShortDate(entry.toValue))}</> : <>{name} removed the due date</>;
      break;
    case "team":
      text = <>{name} moved the issue from {strong(entry.fromValue)} to {strong(entry.toValue)}</>;
      break;
    case "archived":
      text = <>{name} deleted the issue</>;
      break;
    case "restored":
      text = <>{name} restored the issue</>;
      break;
    default:
      text = <>{name} updated the issue</>;
  }
  return (
    <div className="flex items-center gap-3 py-1.5 pl-[3px] text-[12.5px] text-q-text3">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0">
        {text}
        {entry.viaApi ? (
          <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-[4px] border border-q-border px-1 text-[11px] text-q-text3">
            <Zap size={10} /> MCP
          </span>
        ) : null}
        <span className="text-q-text4"> · {timeAgo(entry.createdAt)}</span>
      </span>
    </div>
  );
}

function CommentCard({ comment, replies, issueId }: { comment: CommentEntry; replies: CommentEntry[]; issueId: Id<"quadraticIssues"> }) {
  const ws = useWorkspace();
  const toast = useToast();
  const toggleReaction = useMutation(api.quadratic.comments.toggleReaction);
  const update = useMutation(api.quadratic.comments.update);
  const remove = useMutation(api.quadratic.comments.remove);
  const [replying, setReplying] = useState(false);

  const renderOne = (entry: CommentEntry, nested: boolean) => (
    <CommentBody
      key={entry._id}
      entry={entry}
      nested={nested}
      onReact={(emoji) =>
        toggleReaction({ token: ws.token, workspaceId: ws.workspace._id, commentId: entry._id, emoji }).catch(toast.error)
      }
      onEdit={(body) => update({ token: ws.token, workspaceId: ws.workspace._id, commentId: entry._id, body }).catch(toast.error)}
      onDelete={() => remove({ token: ws.token, workspaceId: ws.workspace._id, commentId: entry._id }).catch(toast.error)}
      onReply={() => setReplying(true)}
    />
  );

  return (
    <div className="my-3 overflow-hidden rounded-[8px] border border-q-border bg-q-raised">
      {renderOne(comment, false)}
      {replies.map((reply) => renderOne(reply, true))}
      {replying ? (
        <div className="border-t border-q-line px-3 py-2">
          <CommentComposer issueId={issueId} parentId={comment._id} autoFocus onDone={() => setReplying(false)} compact />
        </div>
      ) : null}
    </div>
  );
}

function CommentBody({
  entry,
  nested,
  onReact,
  onEdit,
  onDelete,
  onReply,
}: {
  entry: CommentEntry;
  nested: boolean;
  onReact: (emoji: string) => void;
  onEdit: (body: string) => void;
  onDelete: () => void;
  onReply: () => void;
}) {
  const ws = useWorkspace();
  const author = ws.membersById.get(entry.authorId);
  const mine = entry.authorId === ws.viewer._id;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.body);
  return (
    <div className={cn("group px-3.5 py-3", nested && "border-t border-q-line")}>
      <div className="flex items-center gap-2">
        <Avatar name={author?.name} hue={author?.avatarHue} size={20} />
        <span className="font-medium text-q-text">{author?.name ?? "Former member"}</span>
        <span className="text-[12px] text-q-text4">
          {timeAgo(entry.createdAt)}
          {entry.editedAt ? " (edited)" : ""}
        </span>
        <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Popover
            align="end"
            className="p-1"
            trigger={
              <IconButton label="Add reaction" className="h-6 w-6">
                <SmilePlus size={13} />
              </IconButton>
            }
          >
            <div className="grid grid-cols-5 gap-0.5">
              {REACTIONS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => onReact(emoji)} className="h-8 w-8 rounded text-[16px] hover:bg-q-active">
                  {emoji}
                </button>
              ))}
            </div>
          </Popover>
          {!nested ? (
            <IconButton label="Reply" className="h-6 w-6" onClick={onReply}>
              <Reply size={13} />
            </IconButton>
          ) : null}
          {mine ? (
            <Menu
              align="end"
              trigger={
                <IconButton label="Comment actions" className="h-6 w-6">
                  <MoreHorizontal size={13} />
                </IconButton>
              }
            >
              <MenuItem icon={<Pencil size={14} />} onSelect={() => setEditing(true)}>
                Edit
              </MenuItem>
              <MenuItem danger icon={<Trash2 size={14} />} onSelect={onDelete}>
                Delete
              </MenuItem>
            </Menu>
          ) : null}
        </div>
      </div>
      <div className="mt-1.5 pl-7">
        {editing ? (
          <div>
            <AutoTextarea
              autoFocus
              value={draft}
              onChange={setDraft}
              className="text-[14px] text-q-text2"
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  onEdit(draft);
                  setEditing(false);
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setDraft(entry.body);
                  setEditing(false);
                }
              }}
            />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" className="h-7 rounded-[6px] px-2.5 text-[12px] text-q-text3 hover:bg-q-hover" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="h-7 rounded-[6px] bg-q-accent px-2.5 text-[12px] font-medium text-white"
                onClick={() => {
                  onEdit(draft);
                  setEditing(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <Markdown>{entry.body}</Markdown>
        )}
        {entry.reactions.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {entry.reactions.map((reaction) => {
              const reacted = reaction.userIds.includes(ws.viewer._id);
              return (
                <Tooltip
                  key={reaction.emoji}
                  label={reaction.userIds.map((id) => ws.membersById.get(id)?.name ?? "Someone").join(", ")}
                >
                  <button
                    type="button"
                    onClick={() => onReact(reaction.emoji)}
                    className={cn(
                      "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[12px]",
                      reacted ? "border-q-accent bg-q-selected text-q-text" : "border-q-border text-q-text3 hover:bg-q-hover",
                    )}
                  >
                    {reaction.emoji}
                    <span>{reaction.userIds.length}</span>
                  </button>
                </Tooltip>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CommentComposer({
  issueId,
  parentId,
  autoFocus,
  onDone,
  compact = false,
}: {
  issueId: Id<"quadraticIssues">;
  parentId?: Id<"quadraticComments">;
  autoFocus?: boolean;
  onDone?: () => void;
  compact?: boolean;
}) {
  const ws = useWorkspace();
  const toast = useToast();
  const create = useMutation(api.quadratic.comments.create);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const submit = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      await create({ token: ws.token, workspaceId: ws.workspace._id, issueId, body, parentId });
      setBody("");
      onDone?.();
    } catch (error) {
      toast.error(error);
    } finally {
      setSending(false);
    }
  };
  return (
    <div className={cn(compact ? "" : "rounded-[8px] border border-q-border bg-q-raised px-3.5 py-3 focus-within:border-q-text4")}>
      <AutoTextarea
        autoFocus={autoFocus}
        value={body}
        onChange={setBody}
        minRows={compact ? 1 : 2}
        placeholder={parentId ? "Leave a reply…" : "Leave a comment…"}
        className="text-[14px] leading-[1.6] text-q-text2"
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void submit();
          }
          if (event.key === "Escape" && onDone) {
            event.preventDefault();
            onDone();
          }
        }}
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <span className="text-[11px] text-q-text4">Markdown · @ to mention</span>
        <Tooltip label="Send" keys={["⌘", "↵"]}>
          <button
            type="button"
            aria-label="Send comment"
            onClick={() => void submit()}
            disabled={!body.trim() || sending}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-q-accent text-white disabled:bg-q-active disabled:text-q-text4"
          >
            <ArrowUp size={14} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

function Activity({
  data,
  issue,
  onToggleSubscribe,
}: {
  data: IssueDetailData;
  issue: Issue;
  onToggleSubscribe: (subscribed: boolean) => void;
}) {
  const ws = useWorkspace();
  const topLevel = data.comments.filter((comment) => !comment.parentId);
  const repliesByParent = new Map<string, CommentEntry[]>();
  for (const comment of data.comments) {
    if (comment.parentId) repliesByParent.set(comment.parentId, [...(repliesByParent.get(comment.parentId) ?? []), comment]);
  }
  const items = [
    ...data.history.map((entry) => ({ kind: "history" as const, at: entry.createdAt, entry })),
    ...topLevel.map((comment) => ({ kind: "comment" as const, at: comment.createdAt, comment })),
  ].sort((a, b) => a.at - b.at);
  const subscribers = data.subscriberIds.map((id) => ws.membersById.get(id)).filter((m) => m !== undefined);

  return (
    <div className="mt-10">
      <div className="mb-3 flex items-center gap-2 border-t border-q-line pt-6">
        <span className="font-medium text-q-text">Activity</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex -space-x-1">
            {subscribers.slice(0, 4).map((member) => (
              <Avatar key={member._id} name={member.name} hue={member.avatarHue} size={18} className="ring-2 ring-q-panel" />
            ))}
          </div>
          <button
            type="button"
            onClick={() => onToggleSubscribe(!data.subscribed)}
            className="inline-flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-[12px] text-q-text3 hover:bg-q-hover hover:text-q-text"
          >
            {data.subscribed ? <BellOff size={13} /> : <Bell size={13} />}
            {data.subscribed ? "Unsubscribe" : "Subscribe"}
          </button>
        </div>
      </div>
      <div className="relative">
        {items.map((item) =>
          item.kind === "history" ? (
            <HistoryLine key={item.entry._id} entry={item.entry} />
          ) : (
            <CommentCard
              key={item.comment._id}
              comment={item.comment}
              replies={repliesByParent.get(item.comment._id) ?? []}
              issueId={issue._id}
            />
          ),
        )}
      </div>
      <div className="mt-4">
        <CommentComposer issueId={issue._id} />
      </div>
    </div>
  );
}
