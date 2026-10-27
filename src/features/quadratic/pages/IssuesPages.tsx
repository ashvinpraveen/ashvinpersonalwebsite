"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Archive, RotateCcw, Search } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useToast, useWorkspace, type Issue } from "../data";
import { Avatar, StatusIcon, TeamIcon } from "../icons";
import { useUi } from "../ui";
import { IssueView, ViewHeader, ViewTabs } from "../components/IssueView";
import { Button, EmptyState, formatShortDate, timeAgo } from "../components/primitives";

export function TeamIssuesPage({ teamKey, tab }: { teamKey: string; tab: "all" | "active" | "backlog" }) {
  const ws = useWorkspace();
  const team = ws.teamByKey.get(teamKey.toUpperCase());
  const issues = useMemo(() => {
    if (!team) return [];
    return ws.issues.filter((issue) => {
      if (issue.teamId !== team._id) return false;
      const type = ws.statesById.get(issue.stateId)?.type;
      if (tab === "active") return type === "unstarted" || type === "started";
      if (tab === "backlog") return type === "backlog";
      return true;
    });
  }, [tab, team, ws.issues, ws.statesById]);
  if (!team) return <EmptyState title="Team not found" description={`There's no team with the identifier ${teamKey}.`} />;
  const backlogState = (ws.statesByTeam.get(team._id) ?? []).find((state) => state.type === "backlog");
  return (
    <IssueView
      viewKey={`team:${team._id}:${tab}`}
      issues={issues}
      teamId={team._id}
      hiddenFilters={["team"]}
      createDefaults={{ teamId: team._id, ...(tab === "backlog" && backlogState ? { stateId: backlogState._id } : {}) }}
      emptyTitle={tab === "backlog" ? "Backlog is empty" : tab === "active" ? "No active issues" : "No issues yet"}
      emptyDescription="Issues are the units of work your team tracks. Create one to get started."
      header={
        <>
          <TeamIcon name={team.name} color={team.color} icon={team.icon} size={18} />
          <span className="truncate font-medium text-q-text">{team.name}</span>
          <ViewTabs
            tabs={[
              { label: "All issues", href: `/team/${team.key}/all`, active: tab === "all" },
              { label: "Active", href: `/team/${team.key}/active`, active: tab === "active" },
              { label: "Backlog", href: `/team/${team.key}/backlog`, active: tab === "backlog" },
            ]}
          />
        </>
      }
    />
  );
}

export function MyIssuesPage({ tab }: { tab: "assigned" | "created" | "subscribed" }) {
  const ws = useWorkspace();
  const subscribed = useQuery(
    api.quadratic.issues.subscribedIds,
    tab === "subscribed" ? { token: ws.token, workspaceId: ws.workspace._id } : "skip",
  );
  const issues = useMemo(() => {
    const me = ws.viewer._id;
    if (tab === "assigned") return ws.issues.filter((issue) => issue.assigneeId === me);
    if (tab === "created") return ws.issues.filter((issue) => issue.creatorId === me);
    const ids = new Set<string>(subscribed ?? []);
    return ws.issues.filter((issue) => ids.has(issue._id));
  }, [subscribed, tab, ws.issues, ws.viewer._id]);
  return (
    <IssueView
      viewKey={`my:${tab}`}
      issues={issues}
      hiddenFilters={tab === "assigned" ? ["assignee"] : tab === "created" ? ["creator"] : []}
      createDefaults={tab === "assigned" ? { assigneeId: ws.viewer._id } : undefined}
      defaultDisplay={{ completed: "week" }}
      emptyTitle={tab === "assigned" ? "No issues assigned to you" : tab === "created" ? "You haven't created any issues" : "No subscribed issues"}
      emptyDescription="Issues you're working on will show up here."
      header={
        <>
          <Avatar name={ws.viewer.name} hue={ws.viewer.avatarHue} size={18} />
          <span className="font-medium text-q-text">My issues</span>
          <ViewTabs
            tabs={[
              { label: "Assigned", href: "/my-issues/assigned", active: tab === "assigned" },
              { label: "Created", href: "/my-issues/created", active: tab === "created" },
              { label: "Subscribed", href: "/my-issues/subscribed", active: tab === "subscribed" },
            ]}
          />
        </>
      }
    />
  );
}

export function TrashPage() {
  const ws = useWorkspace();
  const toast = useToast();
  const archived = useQuery(api.quadratic.issues.listArchived, { token: ws.token, workspaceId: ws.workspace._id });
  const restore = useMutation(api.quadratic.issues.setArchivedState);
  return (
    <div className="flex h-full flex-col">
      <ViewHeader>
        <Archive size={16} className="text-q-text3" />
        <span className="font-medium text-q-text">Trash</span>
        <span className="text-q-text3">Deleted issues can be restored</span>
      </ViewHeader>
      <div className="q-scroll flex-1">
        {archived === undefined ? null : archived === null || archived.length === 0 ? (
          <EmptyState icon={<Archive size={36} strokeWidth={1.25} />} title="Trash is empty" description="Issues you delete show up here." />
        ) : (
          archived.map((issue) => {
            const state = ws.statesById.get(issue.stateId);
            return (
              <div key={issue._id} className="flex h-[39px] items-center gap-3 border-b border-q-line px-5">
                {state ? <StatusIcon type={state.type} color={state.color} progress={ws.stateProgress(state)} /> : null}
                <span className="w-[62px] shrink-0 text-[12.5px] text-q-text3">{ws.identifier(issue as Issue)}</span>
                <span className="min-w-0 flex-1 truncate text-q-text2">{issue.title}</span>
                <span className="text-[12px] text-q-text4">Deleted {issue.archivedAt ? timeAgo(issue.archivedAt) : ""}</span>
                <Button
                  size="sm"
                  onClick={() =>
                    restore({ token: ws.token, workspaceId: ws.workspace._id, issueIds: [issue._id as Id<"quadraticIssues">], archived: false })
                      .then(() => toast.show({ title: `${ws.identifier(issue as Issue)} restored` }))
                      .catch(toast.error)
                  }
                >
                  <RotateCcw size={12} />
                  Restore
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function SearchPage() {
  const ws = useWorkspace();
  const ui = useUi();
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...ws.issues].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted.slice(0, 25);
    const terms = q.split(/\s+/);
    return sorted
      .filter((issue) => {
        const haystack = `${ws.identifier(issue)} ${issue.title}`.toLowerCase();
        return terms.every((term) => haystack.includes(term));
      })
      .slice(0, 100);
  }, [query, ws]);
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-q-line px-5">
        <Search size={16} className="text-q-text3" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search issues by title or ID…"
          className="h-full flex-1 text-[15px] outline-none"
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) ui.navigate(`/issue/${ws.identifier(results[0])}`);
          }}
        />
      </div>
      <div className="q-scroll flex-1">
        {!query ? <div className="px-5 pb-1 pt-4 text-[12px] font-medium text-q-text3">Recently updated</div> : null}
        {results.length === 0 ? (
          <EmptyState icon={<Search size={32} strokeWidth={1.25} />} title="No results" description={`Nothing matches “${query}”.`} />
        ) : (
          results.map((issue) => {
            const state = ws.statesById.get(issue.stateId);
            const assignee = issue.assigneeId ? ws.membersById.get(issue.assigneeId) : undefined;
            return (
              <button
                key={issue._id}
                type="button"
                onClick={() => ui.navigate(`/issue/${ws.identifier(issue)}`)}
                className="flex h-[39px] w-full items-center gap-3 border-b border-q-line px-5 text-left hover:bg-q-hover"
              >
                {state ? <StatusIcon type={state.type} color={state.color} progress={ws.stateProgress(state)} /> : null}
                <span className="w-[62px] shrink-0 text-[12.5px] text-q-text3">{ws.identifier(issue)}</span>
                <span className="min-w-0 flex-1 truncate text-q-text">{issue.title}</span>
                <span className="text-[12px] text-q-text4">{formatShortDate(issue.updatedAt)}</span>
                <Avatar name={assignee?.name} hue={assignee?.avatarHue} size={18} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
