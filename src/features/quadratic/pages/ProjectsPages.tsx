"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { Archive, Box, ChevronRight, MoreHorizontal, Plus, Star, X } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useToast, useWorkspace, type Project, type WorkspaceData } from "../data";
import {
  Avatar,
  HEALTH,
  HealthBadge,
  PRIORITIES,
  PROJECT_STATUSES,
  PriorityIcon,
  ProgressRing,
  ProjectIcon,
  ProjectStatusIcon,
  TeamIcon,
  type Health,
  type ProjectStatus,
} from "../icons";
import { useUi } from "../ui";
import { IssueView, ViewHeader, ViewTabs } from "../components/IssueView";
import { AutoTextarea, EditableMarkdown, Markdown } from "../components/Markdown";
import { DueDateMenu, PickerList, PropertyChip, buildItems } from "../components/pickers";
import { Button, Dialog, EmptyState, IconButton, Menu, MenuItem, Popover, Tooltip, formatShortDate, timeAgo } from "../components/primitives";
import { cn } from "@/lib/utils";

const PROJECT_COLORS = ["#5e6ad2", "#26b5ce", "#4cb782", "#f2c94c", "#f2994a", "#eb5757", "#bb87fc", "#95a2b3"];
const PROJECT_EMOJI = ["🚀", "🎯", "📦", "🧪", "🛠️", "📈", "💡", "🔒", "🎨", "📱", "🌍", "⚡️"];

export function projectProgress(ws: WorkspaceData, projectId: string) {
  const issues = ws.issues.filter((issue) => issue.projectId === projectId);
  let done = 0;
  let started = 0;
  for (const issue of issues) {
    const type = ws.statesById.get(issue.stateId)?.type;
    if (type === "completed" || type === "canceled") done += 1;
    else if (type === "started") started += 1;
  }
  return { total: issues.length, done, started, ratio: issues.length ? done / issues.length : 0 };
}

export function ProjectsPage({ teamKey }: { teamKey?: string }) {
  const ws = useWorkspace();
  const ui = useUi();
  const team = teamKey ? ws.teamByKey.get(teamKey.toUpperCase()) : undefined;
  const [tab, setTab] = useState<"all" | "active" | "backlog" | "closed">("all");
  const projects = useMemo(
    () =>
      ws.projects
        .filter((project) => !team || project.teamIds.includes(team._id))
        .filter((project) => {
          if (tab === "active") return project.status === "started" || project.status === "planned" || project.status === "paused";
          if (tab === "backlog") return project.status === "backlog";
          if (tab === "closed") return project.status === "completed" || project.status === "canceled";
          return true;
        })
        .sort((a, b) => PROJECT_STATUSES.findIndex((s) => s.value === a.status) - PROJECT_STATUSES.findIndex((s) => s.value === b.status) || a.name.localeCompare(b.name)),
    [tab, team, ws.projects],
  );
  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        right={
          <Button variant="secondary" onClick={() => ui.openCreateProject()}>
            <Plus size={13} />
            New project
          </Button>
        }
      >
        {team ? <TeamIcon name={team.name} color={team.color} icon={team.icon} size={18} /> : <Box size={16} className="text-q-text3" />}
        <span className="font-medium text-q-text">{team ? `${team.name} projects` : "Projects"}</span>
        <div className="ml-1 flex gap-1">
          {(["all", "active", "backlog", "closed"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "h-7 rounded-[6px] border px-2.5 text-[12px] capitalize",
                tab === key ? "border-q-border bg-q-active font-medium text-q-text" : "border-transparent text-q-text3 hover:bg-q-hover",
              )}
            >
              {key === "all" ? "All projects" : key}
            </button>
          ))}
        </div>
      </ViewHeader>
      <div className="q-scroll flex-1">
        {projects.length === 0 ? (
          <EmptyState
            icon={<Box size={36} strokeWidth={1.25} />}
            title="No projects"
            description="Projects group issues toward a larger goal with a target date."
            action={
              <Button variant="primary" onClick={() => ui.openCreateProject()}>
                <Plus size={14} />
                Create project
              </Button>
            }
          />
        ) : (
          <div className="min-w-[760px]">
            <div className="flex h-9 items-center gap-4 border-b border-q-line px-5 text-[12px] text-q-text3">
              <span className="flex-1">Name</span>
              <span className="w-[110px]">Health</span>
              <span className="w-[70px]">Priority</span>
              <span className="w-[60px]">Lead</span>
              <span className="w-[90px]">Target date</span>
              <span className="w-[90px]">Progress</span>
              <span className="w-[110px]">Status</span>
            </div>
            {projects.map((project) => {
              const progress = projectProgress(ws, project._id);
              const lead = project.leadId ? ws.membersById.get(project.leadId) : undefined;
              const status = PROJECT_STATUSES.find((s) => s.value === project.status);
              return (
                <button
                  key={project._id}
                  type="button"
                  onClick={() => ui.navigate(`/project/${project._id}`)}
                  className="flex h-[44px] w-full items-center gap-4 border-b border-q-line px-5 text-left hover:bg-q-hover"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                    <ProjectIcon color={project.color} icon={project.icon} size={16} />
                    <span className="truncate text-q-text">{project.name}</span>
                    {project.summary ? <span className="hidden truncate text-q-text4 lg:inline">{project.summary}</span> : null}
                  </span>
                  <span className="w-[110px] text-[12px]">
                    <HealthBadge health={project.health} />
                  </span>
                  <span className="w-[70px]">
                    <PriorityIcon priority={project.priority} />
                  </span>
                  <span className="w-[60px]">
                    <Avatar name={lead?.name} hue={lead?.avatarHue} size={20} />
                  </span>
                  <span className="w-[90px] text-[12px] text-q-text3">{project.targetDate ? formatShortDate(project.targetDate) : "—"}</span>
                  <span className="flex w-[90px] items-center gap-2 text-[12px] text-q-text3">
                    <ProgressRing value={progress.ratio} />
                    {Math.round(progress.ratio * 100)}%
                  </span>
                  <span className="flex w-[110px] items-center gap-1.5 text-[12px] text-q-text2">
                    <ProjectStatusIcon status={project.status} />
                    {status?.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- project page ----------

function ProjectProperty({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[34px] items-center gap-2">
      <span className="w-[86px] shrink-0 text-[12px] text-q-text3">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const valueClass = "flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-left text-[13px] text-q-text hover:bg-q-hover";

export function ProjectPage({ projectId, tab }: { projectId: string; tab: "overview" | "issues" | "updates" }) {
  const ws = useWorkspace();
  const ui = useUi();
  const toast = useToast();
  const project = ws.projectsById.get(projectId);
  const detail = useQuery(
    api.quadratic.projects.get,
    project ? { token: ws.token, workspaceId: ws.workspace._id, projectId: project._id } : "skip",
  );
  const update = useMutation(api.quadratic.projects.update);
  const archive = useMutation(api.quadratic.projects.archive);
  const toggleFavorite = useMutation(api.quadratic.favorites.toggle);
  const issues = useMemo(() => ws.issues.filter((issue) => issue.projectId === projectId), [projectId, ws.issues]);
  if (!project) return <EmptyState title="Project not found" description="It may have been archived." />;
  const patch = (fields: Parameters<typeof update>[0]["patch"]) =>
    update({ token: ws.token, workspaceId: ws.workspace._id, projectId: project._id, patch: fields }).catch(toast.error);
  const isFavorite = ws.favorites.some((fav) => fav.kind === "project" && fav.targetId === project._id);

  const header = (
    <>
      <button type="button" onClick={() => ui.navigate("/projects")} className="text-q-text3 hover:text-q-text">
        Projects
      </button>
      <ChevronRight size={12} className="text-q-text4" />
      <ProjectIcon color={project.color} icon={project.icon} size={15} />
      <span className="truncate font-medium text-q-text">{project.name}</span>
      <Tooltip label={isFavorite ? "Remove from favorites" : "Add to favorites"}>
        <IconButton
          label="Favorite"
          onClick={() => toggleFavorite({ token: ws.token, workspaceId: ws.workspace._id, kind: "project", targetId: project._id }).catch(toast.error)}
        >
          <Star size={14} className={isFavorite ? "fill-[#f2c94c] text-[#f2c94c]" : ""} />
        </IconButton>
      </Tooltip>
      <ViewTabs
        tabs={[
          { label: "Overview", href: `/project/${project._id}`, active: tab === "overview" },
          { label: `Issues${issues.length ? ` ${issues.length}` : ""}`, href: `/project/${project._id}/issues`, active: tab === "issues" },
          { label: "Updates", href: `/project/${project._id}/updates`, active: tab === "updates" },
        ]}
      />
    </>
  );
  const headerRight = (
    <Menu
      align="end"
      trigger={
        <IconButton label="Project actions">
          <MoreHorizontal size={15} />
        </IconButton>
      }
    >
      <MenuItem
        danger
        icon={<Archive size={14} />}
        onSelect={() => {
          void archive({ token: ws.token, workspaceId: ws.workspace._id, projectId: project._id }).catch(toast.error);
          ui.navigate("/projects");
          toast.show({ title: `${project.name} archived` });
        }}
      >
        Archive project
      </MenuItem>
    </Menu>
  );

  if (tab === "issues") {
    return (
      <IssueView
        viewKey={`project:${project._id}`}
        issues={issues}
        hiddenFilters={["project"]}
        createDefaults={{ projectId: project._id, teamId: project.teamIds[0] }}
        emptyTitle="No issues in this project"
        emptyDescription="Add issues to track progress toward this project's goal."
        header={header}
        headerRight={headerRight}
      />
    );
  }

  const progress = projectProgress(ws, project._id);
  const lead = project.leadId ? ws.membersById.get(project.leadId) : undefined;
  const status = PROJECT_STATUSES.find((s) => s.value === project.status);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewHeader right={headerRight}>{header}</ViewHeader>
      <div className="flex min-h-0 flex-1">
        <div className="q-scroll min-w-0 flex-1">
          <div className="mx-auto max-w-[760px] px-5 pb-24 pt-10 sm:px-10">
            {tab === "updates" ? (
              <ProjectUpdates projectId={project._id} updates={detail?.updates ?? []} />
            ) : (
              <>
                <Popover
                  className="w-[260px] p-2"
                  trigger={
                    <button type="button" className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-q-border bg-q-raised hover:bg-q-active">
                      <ProjectIcon color={project.color} icon={project.icon} size={24} />
                    </button>
                  }
                >
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {PROJECT_COLORS.map((color) => (
                      <button key={color} type="button" aria-label={color} onClick={() => patch({ color, icon: null })} className="h-6 w-6 rounded-full" style={{ background: color }} />
                    ))}
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {PROJECT_EMOJI.map((emoji) => (
                      <button key={emoji} type="button" onClick={() => patch({ icon: emoji })} className="h-8 rounded text-[16px] hover:bg-q-active">
                        {emoji}
                      </button>
                    ))}
                  </div>
                </Popover>
                <ProjectTitle project={project} onSave={(name) => patch({ name })} />
                <ProjectSummary project={project} onSave={(summary) => patch({ summary })} />
                <div className="mt-6 flex flex-wrap items-center gap-2 border-y border-q-line py-3 text-[12px]">
                  <span className="text-q-text3">Progress</span>
                  <div className="h-1.5 w-40 overflow-hidden rounded-full bg-q-active">
                    <div className="h-full rounded-full bg-q-accent" style={{ width: `${progress.ratio * 100}%` }} />
                  </div>
                  <span className="text-q-text2">{Math.round(progress.ratio * 100)}%</span>
                  <span className="text-q-text4">·</span>
                  <span className="text-q-text3">
                    {progress.total} issues · {progress.started} in progress · {progress.done} done
                  </span>
                </div>
                <div className="mt-6">
                  <div className="mb-2 text-[12px] font-medium text-q-text3">Description</div>
                  <EditableMarkdown
                    value={detail?.project.description ?? ""}
                    onSave={(description) => patch({ description })}
                    placeholder="Add a description, goals, or a spec…"
                  />
                </div>
                {detail?.updates[0] ? (
                  <div className="mt-8">
                    <div className="mb-2 text-[12px] font-medium text-q-text3">Latest update</div>
                    <UpdateCard update={detail.updates[0]} />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
        <aside className="q-scroll hidden w-[300px] shrink-0 border-l border-q-line px-5 py-5 lg:block">
          <div className="mb-2 text-[12px] font-medium text-q-text3">Properties</div>
          <ProjectProperty label="Status">
            <Menu
              trigger={
                <button type="button" className={valueClass}>
                  <ProjectStatusIcon status={project.status} />
                  {status?.name}
                </button>
              }
            >
              {PROJECT_STATUSES.map((option) => (
                <MenuItem key={option.value} icon={<ProjectStatusIcon status={option.value} />} checked={option.value === project.status} onSelect={() => patch({ status: option.value })}>
                  {option.name}
                </MenuItem>
              ))}
            </Menu>
          </ProjectProperty>
          <ProjectProperty label="Health">
            <Menu
              trigger={
                <button type="button" className={valueClass}>
                  <HealthBadge health={project.health} />
                </button>
              }
            >
              {(Object.keys(HEALTH) as Health[]).map((key) => (
                <MenuItem key={key} checked={project.health === key} onSelect={() => patch({ health: key })}>
                  <HealthBadge health={key} />
                </MenuItem>
              ))}
            </Menu>
          </ProjectProperty>
          <ProjectProperty label="Priority">
            <Menu
              trigger={
                <button type="button" className={valueClass}>
                  <PriorityIcon priority={project.priority} />
                  {PRIORITIES[project.priority].name}
                </button>
              }
            >
              {PRIORITIES.map((priority) => (
                <MenuItem key={priority.value} icon={<PriorityIcon priority={priority.value} size={14} />} checked={priority.value === project.priority} onSelect={() => patch({ priority: priority.value })}>
                  {priority.name}
                </MenuItem>
              ))}
            </Menu>
          </ProjectProperty>
          <ProjectProperty label="Lead">
            <PickerPopover
              items={buildItems("assignee", ws, project.teamIds[0] ?? "", new Set([project.leadId ?? "none"])).map((item) =>
                item.id === "none" ? { ...item, label: "No lead" } : item,
              )}
              placeholder="Set project lead…"
              onSelect={(id) => patch({ leadId: id === "none" ? null : (id as Id<"quadraticUsers">) })}
              trigger={
                <button type="button" className={cn(valueClass, !lead && "text-q-text3")}>
                  <Avatar name={lead?.name} hue={lead?.avatarHue} size={18} />
                  {lead?.name ?? "Add lead"}
                </button>
              }
            />
          </ProjectProperty>
          <ProjectProperty label="Start date">
            <DatePopover value={project.startDate} onChange={(startDate) => patch({ startDate })} placeholder="Set start date" />
          </ProjectProperty>
          <ProjectProperty label="Target date">
            <DatePopover value={project.targetDate} onChange={(targetDate) => patch({ targetDate })} placeholder="Set target date" />
          </ProjectProperty>
          <ProjectProperty label="Teams">
            <PickerPopover
              multi
              items={buildItems("team", ws, "", new Set(project.teamIds))}
              placeholder="Change teams…"
              onSelect={(id) => {
                const teamId = id as Id<"quadraticTeams">;
                const next = project.teamIds.includes(teamId) ? project.teamIds.filter((t) => t !== teamId) : [...project.teamIds, teamId];
                void patch({ teamIds: next });
              }}
              trigger={
                <button type="button" className={valueClass}>
                  {project.teamIds.length ? (
                    project.teamIds.map((teamId) => {
                      const team = ws.teamsById.get(teamId);
                      return team ? <TeamIcon key={teamId} name={team.name} color={team.color} icon={team.icon} size={16} /> : null;
                    })
                  ) : (
                    <span className="text-q-text3">Add teams</span>
                  )}
                </button>
              }
            />
          </ProjectProperty>
        </aside>
      </div>
    </div>
  );
}

function ProjectTitle({ project, onSave }: { project: Project; onSave: (name: string) => void }) {
  const [draft, setDraft] = useState(project.name);
  useEffect(() => setDraft(project.name), [project.name]);
  return (
    <AutoTextarea
      value={draft}
      onChange={(value) => setDraft(value.replace(/\n/g, ""))}
      onBlur={() => (draft.trim() && draft !== project.name ? onSave(draft) : setDraft(project.name))}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          (event.target as HTMLTextAreaElement).blur();
        }
      }}
      aria-label="Project name"
      className="mt-4 text-[26px] font-semibold tracking-[-0.01em] text-q-text"
    />
  );
}

function ProjectSummary({ project, onSave }: { project: Project; onSave: (summary: string) => void }) {
  const [draft, setDraft] = useState(project.summary ?? "");
  useEffect(() => setDraft(project.summary ?? ""), [project.summary]);
  return (
    <input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => draft !== (project.summary ?? "") && onSave(draft)}
      onKeyDown={(event) => event.key === "Enter" && (event.target as HTMLInputElement).blur()}
      placeholder="Add a short summary…"
      className="mt-1 w-full text-[15px] text-q-text3 outline-none"
    />
  );
}

function PickerPopover({
  items,
  placeholder,
  onSelect,
  trigger,
  multi = false,
}: {
  items: ReturnType<typeof buildItems>;
  placeholder: string;
  onSelect: (id: string) => void;
  trigger: ReactNode;
  multi?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen} trigger={trigger} className="w-[260px]">
      {open ? (
        <PickerList
          placeholder={placeholder}
          items={items}
          multi={multi}
          onSelect={(id) => {
            onSelect(id);
            if (!multi) setOpen(false);
          }}
        />
      ) : null}
    </Popover>
  );
}

function DatePopover({ value, onChange, placeholder }: { value?: string; onChange: (value: string | null) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      className="w-[260px]"
      trigger={
        <button type="button" className={cn(valueClass, !value && "text-q-text3")}>
          {value ? formatShortDate(value) : placeholder}
        </button>
      }
    >
      {open ? (
        <DueDateMenu
          value={value}
          onChange={(next) => {
            onChange(next);
            setOpen(false);
          }}
        />
      ) : null}
    </Popover>
  );
}

type ProjectUpdate = { _id: string; authorId: string; health: Health; body: string; createdAt: number };

function UpdateCard({ update }: { update: ProjectUpdate }) {
  const ws = useWorkspace();
  const author = ws.membersById.get(update.authorId);
  return (
    <div className="rounded-[8px] border border-q-border bg-q-raised p-4">
      <div className="mb-2 flex items-center gap-2 text-[12px]">
        <HealthBadge health={update.health} />
        <span className="text-q-text4">·</span>
        <Avatar name={author?.name} hue={author?.avatarHue} size={16} />
        <span className="text-q-text2">{author?.name}</span>
        <span className="text-q-text4">{timeAgo(update.createdAt)}</span>
      </div>
      <Markdown>{update.body}</Markdown>
    </div>
  );
}

function ProjectUpdates({ projectId, updates }: { projectId: Id<"quadraticProjects">; updates: ProjectUpdate[] }) {
  const ws = useWorkspace();
  const toast = useToast();
  const post = useMutation(api.quadratic.projects.postUpdate);
  const [health, setHealth] = useState<Health>("onTrack");
  const [body, setBody] = useState("");
  return (
    <div>
      <div className="text-[20px] font-semibold text-q-text">Project updates</div>
      <div className="mt-1 text-q-text3">Share progress and flag risks. The latest update sets the project's health.</div>
      <div className="mt-5 rounded-[8px] border border-q-border bg-q-raised p-3">
        <div className="mb-2 flex gap-1.5">
          {(Object.keys(HEALTH) as Health[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setHealth(key)}
              className={cn("h-7 rounded-[6px] border px-2 text-[12px]", health === key ? "border-q-text4 bg-q-active" : "border-q-border hover:bg-q-hover")}
            >
              <HealthBadge health={key} />
            </button>
          ))}
        </div>
        <AutoTextarea value={body} onChange={setBody} minRows={3} placeholder="Write a project update…" className="text-[14px] text-q-text2" />
        <div className="mt-2 flex justify-end">
          <Button
            variant="primary"
            disabled={!body.trim()}
            onClick={() =>
              post({ token: ws.token, workspaceId: ws.workspace._id, projectId, health, body })
                .then(() => setBody(""))
                .catch(toast.error)
            }
          >
            Post update
          </Button>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {updates.map((update) => (
          <UpdateCard key={update._id} update={update} />
        ))}
      </div>
    </div>
  );
}

// ---------- create project ----------

export function CreateProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ws = useWorkspace();
  const ui = useUi();
  const toast = useToast();
  const create = useMutation(api.quadratic.projects.create);
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planned");
  const [priority, setPriority] = useState(0);
  const [leadId, setLeadId] = useState<Id<"quadraticUsers"> | undefined>(ws.viewer._id);
  const [teamIds, setTeamIds] = useState<Id<"quadraticTeams">[]>(ws.teams.slice(0, 1).map((t) => t._id));
  const [targetDate, setTargetDate] = useState<string | undefined>();
  const [color, setColor] = useState(PROJECT_COLORS[0]);

  useEffect(() => {
    if (open) {
      setName("");
      setSummary("");
      setDescription("");
      setStatus("planned");
      setPriority(0);
      setTargetDate(undefined);
      setColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);
    }
  }, [open]);

  const lead = leadId ? ws.membersById.get(leadId) : undefined;
  const submit = async () => {
    if (!name.trim()) return;
    try {
      const projectId = await create({
        token: ws.token,
        workspaceId: ws.workspace._id,
        name,
        summary,
        description,
        status,
        priority,
        leadId,
        teamIds,
        targetDate,
        color,
      });
      onClose();
      ui.navigate(`/project/${projectId}`);
    } catch (error) {
      toast.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} className="max-w-[720px]" label="Create project">
      <div className="flex items-center gap-2 px-5 pt-4 text-[12px] text-q-text3">
        New project
        <button type="button" aria-label="Close" onClick={onClose} className="ml-auto flex h-7 w-7 items-center justify-center rounded hover:bg-q-hover">
          <X size={15} />
        </button>
      </div>
      <div className="px-5 pt-2">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[8px] border border-q-border bg-q-raised">
          <ProjectIcon color={color} size={20} />
        </div>
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => (event.metaKey || event.ctrlKey) && event.key === "Enter" && void submit()}
          placeholder="Project name"
          className="w-full text-[22px] font-semibold text-q-text outline-none"
        />
        <input value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Add a short summary…" className="mt-1 w-full text-[14px] text-q-text3 outline-none" />
      </div>
      <div className="flex flex-wrap gap-1.5 px-5 pt-4">
        <Menu trigger={<PropertyChip icon={<ProjectStatusIcon status={status} />} label={PROJECT_STATUSES.find((s) => s.value === status)?.name} />}>
          {PROJECT_STATUSES.map((option) => (
            <MenuItem key={option.value} icon={<ProjectStatusIcon status={option.value} />} checked={option.value === status} onSelect={() => setStatus(option.value)}>
              {option.name}
            </MenuItem>
          ))}
        </Menu>
        <Menu trigger={<PropertyChip icon={<PriorityIcon priority={priority} size={14} />} label={priority ? PRIORITIES[priority].name : "Priority"} muted={!priority} />}>
          {PRIORITIES.map((option) => (
            <MenuItem key={option.value} icon={<PriorityIcon priority={option.value} size={14} />} checked={option.value === priority} onSelect={() => setPriority(option.value)}>
              {option.name}
            </MenuItem>
          ))}
        </Menu>
        <PickerPopover
          items={buildItems("assignee", ws, "", new Set([leadId ?? "none"])).map((item) => (item.id === "none" ? { ...item, label: "No lead" } : item))}
          placeholder="Set lead…"
          onSelect={(id) => setLeadId(id === "none" ? undefined : (id as Id<"quadraticUsers">))}
          trigger={<PropertyChip icon={<Avatar name={lead?.name} hue={lead?.avatarHue} size={16} />} label={lead ? lead.name : "Lead"} muted={!lead} />}
        />
        <PickerPopover
          multi
          items={buildItems("team", ws, "", new Set(teamIds))}
          placeholder="Teams…"
          onSelect={(id) => {
            const teamId = id as Id<"quadraticTeams">;
            setTeamIds((current) => (current.includes(teamId) ? current.filter((t) => t !== teamId) : [...current, teamId]));
          }}
          trigger={
            <PropertyChip
              icon={teamIds[0] ? <TeamIcon name={ws.teamsById.get(teamIds[0])?.name ?? "T"} color={ws.teamsById.get(teamIds[0])?.color ?? "#5e6ad2"} size={14} /> : null}
              label={teamIds.length === 1 ? ws.teamsById.get(teamIds[0])?.name : `${teamIds.length} teams`}
            />
          }
        />
        <Popover className="w-[260px]" trigger={<PropertyChip label={targetDate ? `Target: ${formatShortDate(targetDate)}` : "Target date"} muted={!targetDate} />}>
          <DueDateMenu value={targetDate} onChange={(value) => setTargetDate(value ?? undefined)} />
        </Popover>
      </div>
      <div className="px-5 pt-4">
        <AutoTextarea value={description} onChange={setDescription} minRows={4} placeholder="Write a description, a project brief, or collect ideas…" className="max-h-[35vh] text-[14px] text-q-text2" />
      </div>
      <div className="mt-4 flex items-center justify-end gap-2 border-t border-q-border px-5 py-3">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="md" disabled={!name.trim()} onClick={() => void submit()}>
          Create project
        </Button>
      </div>
    </Dialog>
  );
}
