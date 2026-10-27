"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { ChevronRight, Layers, MoreHorizontal, Plus, Star, Trash2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useToast, useWorkspace, type Cycle, type SavedView, type WorkspaceData } from "../data";
import { parseFilter, filterCount, type DisplayOptions, type IssueFilter } from "../filters";
import { Avatar, ProgressRing, TeamIcon } from "../icons";
import { useUi } from "../ui";
import { IssueView, ViewHeader } from "../components/IssueView";
import { CycleGlyph } from "../components/pickers";
import { Button, Dialog, EmptyState, IconButton, Menu, MenuItem, TextInput, Tooltip, formatShortDate, timeAgo } from "../components/primitives";

function cycleStats(ws: WorkspaceData, cycle: Cycle) {
  const issues = ws.issues.filter((issue) => issue.cycleId === cycle._id);
  let done = 0;
  let started = 0;
  for (const issue of issues) {
    const type = ws.statesById.get(issue.stateId)?.type;
    if (type === "completed" || type === "canceled") done += 1;
    else if (type === "started") started += 1;
  }
  return { total: issues.length, done, started, ratio: issues.length ? done / issues.length : 0 };
}

function cycleLabel(cycle: Cycle) {
  return cycle.name ?? `Cycle ${cycle.number}`;
}

export function CyclesPage({ teamKey }: { teamKey: string }) {
  const ws = useWorkspace();
  const ui = useUi();
  const team = ws.teamByKey.get(teamKey.toUpperCase());
  if (!team) return <EmptyState title="Team not found" />;
  if (!team.cyclesEnabled) {
    return (
      <EmptyState
        icon={<CycleGlyph />}
        title="Cycles are off for this team"
        description="Cycles are time-boxed periods (like sprints) that help your team focus. Unfinished work rolls over automatically."
        action={<Button variant="primary" onClick={() => ui.navigate(`/settings/teams/${team.key}`)}>Enable cycles</Button>}
      />
    );
  }
  const now = Date.now();
  const cycles = ws.cycles.filter((cycle) => cycle.teamId === team._id);
  const current = cycles.filter((c) => c.startsAt <= now && c.endsAt > now);
  const upcoming = cycles.filter((c) => c.startsAt > now).sort((a, b) => a.startsAt - b.startsAt);
  const past = cycles.filter((c) => c.endsAt <= now).sort((a, b) => b.startsAt - a.startsAt);
  const section = (title: string, list: Cycle[]) =>
    list.length ? (
      <div key={title}>
        <div className="sticky top-0 z-[1] flex h-9 items-center border-b border-q-line bg-q-raised px-5 text-[12px] font-medium text-q-text2">{title}</div>
        {list.map((cycle) => {
          const stats = cycleStats(ws, cycle);
          const isCurrent = cycle.startsAt <= now && cycle.endsAt > now;
          const daysLeft = Math.max(0, Math.ceil((cycle.endsAt - now) / 86400000));
          return (
            <button
              key={cycle._id}
              type="button"
              onClick={() => ui.navigate(`/team/${team.key}/cycle/${cycle.number}`)}
              className="flex h-[52px] w-full items-center gap-4 border-b border-q-line px-5 text-left hover:bg-q-hover"
            >
              <CycleGlyph active={isCurrent} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-q-text">{cycleLabel(cycle)}</span>
                  {isCurrent ? <span className="rounded-full bg-q-selected px-2 text-[11px] text-q-accent-hover">Current</span> : null}
                </div>
                <div className="text-[12px] text-q-text3">
                  {formatShortDate(cycle.startsAt)} → {formatShortDate(cycle.endsAt - 1)}
                  {isCurrent ? ` · ${daysLeft} days left` : ""}
                </div>
              </div>
              <span className="hidden text-[12px] text-q-text3 sm:block">
                {stats.total} scope · {stats.started} started · {stats.done} completed
              </span>
              <span className="flex w-[70px] items-center justify-end gap-2 text-[12px] text-q-text3">
                <ProgressRing value={stats.ratio} />
                {Math.round(stats.ratio * 100)}%
              </span>
            </button>
          );
        })}
      </div>
    ) : null;
  return (
    <div className="flex h-full flex-col">
      <ViewHeader>
        <TeamIcon name={team.name} color={team.color} icon={team.icon} size={18} />
        <span className="font-medium text-q-text">{team.name}</span>
        <ChevronRight size={12} className="text-q-text4" />
        <span className="text-q-text2">Cycles</span>
      </ViewHeader>
      <div className="q-scroll flex-1">
        {cycles.length === 0 ? <EmptyState title="Scheduling cycles…" description="Your first cycles will appear in a moment." /> : null}
        {section("Current", current)}
        {section("Upcoming", upcoming)}
        {section("Past", past)}
      </div>
    </div>
  );
}

export function CyclePage({ teamKey, number }: { teamKey: string; number: number }) {
  const ws = useWorkspace();
  const ui = useUi();
  const toast = useToast();
  const toggleFavorite = useMutation(api.quadratic.favorites.toggle);
  const team = ws.teamByKey.get(teamKey.toUpperCase());
  const cycle = team ? ws.cycles.find((c) => c.teamId === team._id && c.number === number) : undefined;
  const issues = useMemo(() => (cycle ? ws.issues.filter((issue) => issue.cycleId === cycle._id) : []), [cycle, ws.issues]);
  if (!team || !cycle) return <EmptyState title="Cycle not found" />;
  const stats = cycleStats(ws, cycle);
  const isFavorite = ws.favorites.some((fav) => fav.kind === "cycle" && fav.targetId === cycle._id);
  return (
    <IssueView
      viewKey={`cycle:${cycle._id}`}
      issues={issues}
      teamId={team._id}
      hiddenFilters={["cycle", "team"]}
      createDefaults={{ teamId: team._id, cycleId: cycle._id }}
      emptyTitle="No issues in this cycle"
      emptyDescription="Plan the cycle by moving issues into it with ⇧C."
      header={
        <>
          <TeamIcon name={team.name} color={team.color} icon={team.icon} size={18} />
          <button type="button" className="text-q-text3 hover:text-q-text" onClick={() => ui.navigate(`/team/${team.key}/cycles`)}>
            Cycles
          </button>
          <ChevronRight size={12} className="text-q-text4" />
          <span className="font-medium text-q-text">{cycleLabel(cycle)}</span>
          <span className="hidden text-[12px] text-q-text3 sm:inline">
            {formatShortDate(cycle.startsAt)} → {formatShortDate(cycle.endsAt - 1)}
          </span>
          <span className="ml-2 hidden items-center gap-1.5 text-[12px] text-q-text3 md:flex">
            <ProgressRing value={stats.ratio} />
            {Math.round(stats.ratio * 100)}% of {stats.total}
          </span>
        </>
      }
      headerRight={
        <Tooltip label={isFavorite ? "Remove from favorites" : "Add to favorites"}>
          <IconButton
            label="Favorite"
            onClick={() => toggleFavorite({ token: ws.token, workspaceId: ws.workspace._id, kind: "cycle", targetId: cycle._id }).catch(toast.error)}
          >
            <Star size={14} className={isFavorite ? "fill-[#f2c94c] text-[#f2c94c]" : ""} />
          </IconButton>
        </Tooltip>
      }
    />
  );
}

// ---------- views ----------

function describeFilter(filter: IssueFilter) {
  const count = filterCount(filter);
  return count === 0 ? "All issues" : `${count} filter${count === 1 ? "" : "s"}`;
}

export function ViewsPage() {
  const ws = useWorkspace();
  const ui = useUi();
  const toast = useToast();
  const create = useMutation(api.quadratic.views.create);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        right={
          <Button onClick={() => setCreating(true)}>
            <Plus size={13} />
            New view
          </Button>
        }
      >
        <Layers size={16} className="text-q-text3" />
        <span className="font-medium text-q-text">Views</span>
      </ViewHeader>
      <div className="q-scroll flex-1">
        {ws.views.length === 0 ? (
          <EmptyState
            icon={<Layers size={36} strokeWidth={1.25} />}
            title="No custom views yet"
            description="Views save a set of filters and display options. Filter any issue list, then press “Save view”."
            action={<Button variant="primary" onClick={() => setCreating(true)}>Create view</Button>}
          />
        ) : (
          ws.views.map((view) => {
            const creator = ws.membersById.get(view.creatorId);
            return (
              <button
                key={view._id}
                type="button"
                onClick={() => ui.navigate(`/view/${view._id}`)}
                className="flex h-[48px] w-full items-center gap-3 border-b border-q-line px-5 text-left hover:bg-q-hover"
              >
                <Layers size={15} style={{ color: view.color }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-q-text">{view.name}</div>
                  <div className="truncate text-[12px] text-q-text3">{view.description ?? describeFilter(parseFilter(view.filters))}</div>
                </div>
                {!view.shared ? <span className="rounded-full border border-q-border px-2 text-[11px] text-q-text3">Personal</span> : null}
                <Avatar name={creator?.name} hue={creator?.avatarHue} size={18} />
                <span className="w-[70px] text-right text-[12px] text-q-text4">{timeAgo(view.updatedAt)}</span>
              </button>
            );
          })
        )}
      </div>
      <Dialog open={creating} onOpenChange={setCreating} className="max-w-[440px] p-5" label="New view">
        <div className="mb-3 font-medium text-q-text">New view</div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!name.trim()) return;
            try {
              const viewId = await create({ token: ws.token, workspaceId: ws.workspace._id, name, filters: "{}" });
              setCreating(false);
              setName("");
              ui.navigate(`/view/${viewId}`);
            } catch (error) {
              toast.error(error);
            }
          }}
        >
          <TextInput autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Urgent bugs" />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!name.trim()}>
              Create view
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export function ViewPage({ viewId }: { viewId: string }) {
  const ws = useWorkspace();
  const ui = useUi();
  const toast = useToast();
  const update = useMutation(api.quadratic.views.update);
  const remove = useMutation(api.quadratic.views.remove);
  const toggleFavorite = useMutation(api.quadratic.favorites.toggle);
  const view: SavedView | undefined = ws.views.find((v) => v._id === viewId);
  const issues = useMemo(() => (view?.teamId ? ws.issues.filter((issue) => issue.teamId === view.teamId) : ws.issues), [view?.teamId, ws.issues]);
  const savedFilter = useMemo(() => parseFilter(view?.filters), [view?.filters]);
  const savedDisplay = useMemo(() => {
    try {
      return view?.display ? (JSON.parse(view.display) as Partial<DisplayOptions>) : undefined;
    } catch {
      return undefined;
    }
  }, [view?.display]);
  if (!view) return <EmptyState title="View not found" />;
  const isFavorite = ws.favorites.some((fav) => fav.kind === "view" && fav.targetId === view._id);
  const normalized = (filter: IssueFilter) =>
    JSON.stringify(Object.fromEntries(Object.entries(filter).filter(([, values]) => values && values.length).sort()));
  return (
    <IssueView
      viewKey={`view:${view._id}`}
      issues={issues}
      teamId={view.teamId}
      initialFilter={savedFilter}
      defaultDisplay={savedDisplay}
      savedFilterDirty={(filter) => normalized(filter) !== normalized(savedFilter)}
      onSaveView={(filter, display) =>
        update({ token: ws.token, workspaceId: ws.workspace._id, viewId: view._id, filters: JSON.stringify(filter), display: JSON.stringify(display) })
          .then(() => toast.show({ title: `Saved “${view.name}”` }))
          .catch(toast.error)
      }
      emptyTitle="No issues match this view"
      header={
        <>
          <Layers size={15} style={{ color: view.color }} />
          <span className="truncate font-medium text-q-text">{view.name}</span>
          <Tooltip label={isFavorite ? "Remove from favorites" : "Add to favorites"}>
            <IconButton
              label="Favorite"
              onClick={() => toggleFavorite({ token: ws.token, workspaceId: ws.workspace._id, kind: "view", targetId: view._id }).catch(toast.error)}
            >
              <Star size={14} className={isFavorite ? "fill-[#f2c94c] text-[#f2c94c]" : ""} />
            </IconButton>
          </Tooltip>
        </>
      }
      headerRight={
        <Menu
          align="end"
          trigger={
            <IconButton label="View actions">
              <MoreHorizontal size={15} />
            </IconButton>
          }
        >
          <MenuItem
            onSelect={() => {
              const name = window.prompt("Rename view", view.name);
              if (name) void update({ token: ws.token, workspaceId: ws.workspace._id, viewId: view._id, name }).catch(toast.error);
            }}
          >
            Rename
          </MenuItem>
          <MenuItem
            onSelect={() =>
              void update({ token: ws.token, workspaceId: ws.workspace._id, viewId: view._id, shared: !view.shared }).catch(toast.error)
            }
          >
            {view.shared ? "Make personal" : "Share with workspace"}
          </MenuItem>
          <MenuItem
            danger
            icon={<Trash2 size={14} />}
            onSelect={() => {
              void remove({ token: ws.token, workspaceId: ws.workspace._id, viewId: view._id }).catch(toast.error);
              ui.navigate("/views");
            }}
          >
            Delete view
          </MenuItem>
        </Menu>
      }
    />
  );
}

