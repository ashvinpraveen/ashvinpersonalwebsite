import { PRIORITIES, priorityRank } from "./icons";
import type { Issue, State, WorkspaceData } from "./data";

export type FilterField = "status" | "priority" | "assignee" | "creator" | "label" | "project" | "cycle" | "team";
/** Values per field: status uses `type:name` keys so filters work across teams;
 * people accept "me" and "none"; others use ids or "none". */
export type IssueFilter = Partial<Record<FilterField, string[]>>;

export type Grouping = "status" | "assignee" | "project" | "priority" | "cycle" | "label" | "team" | "none";
export type Ordering = "manual" | "priority" | "updatedAt" | "createdAt" | "dueDate" | "title";
export type PropertyKey =
  | "id"
  | "status"
  | "priority"
  | "assignee"
  | "labels"
  | "project"
  | "cycle"
  | "estimate"
  | "dueDate"
  | "created"
  | "updated";

export type DisplayOptions = {
  layout: "list" | "board";
  grouping: Grouping;
  ordering: Ordering;
  completed: "all" | "week" | "month" | "none";
  showSubIssues: boolean;
  showEmptyGroups: boolean;
  properties: Record<PropertyKey, boolean>;
};

export const DEFAULT_DISPLAY: DisplayOptions = {
  layout: "list",
  grouping: "status",
  ordering: "priority",
  completed: "all",
  showSubIssues: true,
  showEmptyGroups: false,
  properties: {
    id: true,
    status: true,
    priority: true,
    assignee: true,
    labels: true,
    project: true,
    cycle: false,
    estimate: true,
    dueDate: true,
    created: true,
    updated: false,
  },
};

export const GROUPING_LABELS: Record<Grouping, string> = {
  status: "Status",
  assignee: "Assignee",
  project: "Project",
  priority: "Priority",
  cycle: "Cycle",
  label: "Label",
  team: "Team",
  none: "No grouping",
};

export const ORDERING_LABELS: Record<Ordering, string> = {
  manual: "Manual",
  priority: "Priority",
  updatedAt: "Last updated",
  createdAt: "Created",
  dueDate: "Due date",
  title: "Title",
};

export const PROPERTY_LABELS: Record<PropertyKey, string> = {
  id: "ID",
  status: "Status",
  priority: "Priority",
  assignee: "Assignee",
  labels: "Labels",
  project: "Project",
  cycle: "Cycle",
  estimate: "Estimate",
  dueDate: "Due date",
  created: "Created",
  updated: "Updated",
};

export const FILTER_LABELS: Record<FilterField, string> = {
  status: "Status",
  priority: "Priority",
  assignee: "Assignee",
  creator: "Creator",
  label: "Labels",
  project: "Project",
  cycle: "Cycle",
  team: "Team",
};

export const stateKey = (state: Pick<State, "type" | "name">) => `${state.type}:${state.name}`;

const DAY = 24 * 60 * 60 * 1000;

export function isClosed(ws: WorkspaceData, issue: Issue) {
  const type = ws.statesById.get(issue.stateId)?.type;
  return type === "completed" || type === "canceled";
}

export function parseFilter(raw: string | undefined | null): IssueFilter {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as IssueFilter;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function filterCount(filter: IssueFilter) {
  return Object.values(filter).filter((values) => values && values.length > 0).length;
}

export function matchesFilter(issue: Issue, filter: IssueFilter, ws: WorkspaceData) {
  const viewerId = ws.viewer._id;
  const matchPerson = (values: string[], id: string | undefined) =>
    values.some((value) => (value === "none" ? !id : value === "me" ? id === viewerId : id === value));
  for (const [field, values] of Object.entries(filter) as [FilterField, string[] | undefined][]) {
    if (!values || values.length === 0) continue;
    switch (field) {
      case "status": {
        const state = ws.statesById.get(issue.stateId);
        if (!state || !values.includes(stateKey(state))) return false;
        break;
      }
      case "priority":
        if (!values.includes(String(issue.priority))) return false;
        break;
      case "assignee":
        if (!matchPerson(values, issue.assigneeId)) return false;
        break;
      case "creator":
        if (!matchPerson(values, issue.creatorId)) return false;
        break;
      case "label":
        if (!values.some((value) => (value === "none" ? issue.labelIds.length === 0 : issue.labelIds.includes(value as never)))) {
          return false;
        }
        break;
      case "project":
        if (!values.some((value) => (value === "none" ? !issue.projectId : issue.projectId === value))) return false;
        break;
      case "cycle":
        if (!values.some((value) => (value === "none" ? !issue.cycleId : issue.cycleId === value))) return false;
        break;
      case "team":
        if (!values.includes(issue.teamId)) return false;
        break;
    }
  }
  return true;
}

export function applyDisplayFilters(issues: Issue[], display: DisplayOptions, ws: WorkspaceData) {
  const now = Date.now();
  return issues.filter((issue) => {
    if (!display.showSubIssues && issue.parentId && ws.issuesById.has(issue.parentId)) return false;
    if (display.completed !== "all" && isClosed(ws, issue)) {
      if (display.completed === "none") return false;
      const closedAt = issue.completedAt ?? issue.canceledAt ?? issue.updatedAt;
      const window = display.completed === "week" ? 7 * DAY : 30 * DAY;
      if (now - closedAt > window) return false;
    }
    return true;
  });
}

export function sortIssues(issues: Issue[], ordering: Ordering) {
  const sorted = [...issues];
  switch (ordering) {
    case "manual":
      return sorted.sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt - a.createdAt);
    case "priority":
      return sorted.sort(
        (a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.sortOrder - b.sortOrder || b.updatedAt - a.updatedAt,
      );
    case "updatedAt":
      return sorted.sort((a, b) => b.updatedAt - a.updatedAt);
    case "createdAt":
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
    case "dueDate":
      return sorted.sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || b.updatedAt - a.updatedAt);
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
  }
}

export type GroupDescriptor =
  | { kind: "status"; state: State }
  | { kind: "assignee"; userId?: string }
  | { kind: "project"; projectId?: string }
  | { kind: "priority"; priority: number }
  | { kind: "cycle"; cycleId?: string }
  | { kind: "label"; labelId?: string }
  | { kind: "team"; teamId: string }
  | { kind: "none" };

export type IssueGroup = { key: string; label: string; descriptor: GroupDescriptor; issues: Issue[] };

/** Groups issues the way Linear does. `teamId` narrows status groups to one team's workflow. */
export function groupIssues(
  issues: Issue[],
  display: DisplayOptions,
  ws: WorkspaceData,
  teamId?: string,
): IssueGroup[] {
  const sorted = sortIssues(issues, display.ordering);
  const groups = new Map<string, IssueGroup>();
  const add = (key: string, label: string, descriptor: GroupDescriptor, issue?: Issue) => {
    let group = groups.get(key);
    if (!group) {
      group = { key, label, descriptor, issues: [] };
      groups.set(key, group);
    }
    if (issue) group.issues.push(issue);
  };
  const showEmpty = display.showEmptyGroups || display.layout === "board";

  switch (display.grouping) {
    case "none":
      return [{ key: "all", label: "All issues", descriptor: { kind: "none" }, issues: sorted }];
    case "status": {
      const states = teamId
        ? (ws.statesByTeam.get(teamId) ?? [])
        : [...ws.statesByTeam.values()].flat();
      const keyFor = (state: State) => (teamId ? state._id : stateKey(state));
      if (showEmpty) {
        for (const state of states) add(keyFor(state), state.name, { kind: "status", state });
      }
      for (const issue of sorted) {
        const state = ws.statesById.get(issue.stateId);
        if (state) add(keyFor(state), state.name, { kind: "status", state }, issue);
      }
      // Lists read like Linear's: in-flight work first (latest stage on top), then todo, backlog,
      // done and canceled. Boards keep the left-to-right workflow order.
      const order = (state: State) =>
        display.layout === "board"
          ? ({ backlog: 0, unstarted: 1, started: 2, completed: 3, canceled: 4 })[state.type] * 1000 + state.position
          : ({ started: 0, unstarted: 1, backlog: 2, completed: 3, canceled: 4 })[state.type] * 1000 +
            (state.type === "started" ? -state.position : state.position);
      return [...groups.values()].sort(
        (a, b) =>
          order((a.descriptor as { state: State }).state) - order((b.descriptor as { state: State }).state),
      );
    }
    case "assignee": {
      if (showEmpty) for (const member of ws.members) add(member._id, member.name, { kind: "assignee", userId: member._id });
      for (const issue of sorted) {
        const member = issue.assigneeId ? ws.membersById.get(issue.assigneeId) : undefined;
        if (member) add(member._id, member.name, { kind: "assignee", userId: member._id }, issue);
        else add("none", "No assignee", { kind: "assignee" }, issue);
      }
      return [...groups.values()].sort((a, b) =>
        a.key === "none" ? 1 : b.key === "none" ? -1 : a.label.localeCompare(b.label),
      );
    }
    case "project": {
      for (const issue of sorted) {
        const project = issue.projectId ? ws.projectsById.get(issue.projectId) : undefined;
        if (project) add(project._id, project.name, { kind: "project", projectId: project._id }, issue);
        else add("none", "No project", { kind: "project" }, issue);
      }
      return [...groups.values()].sort((a, b) =>
        a.key === "none" ? 1 : b.key === "none" ? -1 : a.label.localeCompare(b.label),
      );
    }
    case "priority": {
      const order = [1, 2, 3, 4, 0];
      if (showEmpty) for (const p of order) add(String(p), PRIORITIES[p].name, { kind: "priority", priority: p });
      for (const issue of sorted) {
        add(String(issue.priority), PRIORITIES[issue.priority]?.name ?? "No priority", { kind: "priority", priority: issue.priority }, issue);
      }
      return [...groups.values()].sort((a, b) => order.indexOf(Number(a.key)) - order.indexOf(Number(b.key)));
    }
    case "cycle": {
      for (const issue of sorted) {
        const cycle = issue.cycleId ? ws.cyclesById.get(issue.cycleId) : undefined;
        if (cycle) add(cycle._id, cycle.name ?? `Cycle ${cycle.number}`, { kind: "cycle", cycleId: cycle._id }, issue);
        else add("none", "No cycle", { kind: "cycle" }, issue);
      }
      return [...groups.values()].sort((a, b) => {
        if (a.key === "none") return 1;
        if (b.key === "none") return -1;
        return (ws.cyclesById.get(a.key)?.startsAt ?? 0) - (ws.cyclesById.get(b.key)?.startsAt ?? 0);
      });
    }
    case "label": {
      for (const issue of sorted) {
        if (issue.labelIds.length === 0) add("none", "No labels", { kind: "label" }, issue);
        for (const labelId of issue.labelIds) {
          const label = ws.labelsById.get(labelId);
          if (label) add(label._id, label.name, { kind: "label", labelId: label._id }, issue);
        }
      }
      return [...groups.values()].sort((a, b) =>
        a.key === "none" ? 1 : b.key === "none" ? -1 : a.label.localeCompare(b.label),
      );
    }
    case "team": {
      for (const issue of sorted) {
        const team = ws.teamsById.get(issue.teamId);
        if (team) add(team._id, team.name, { kind: "team", teamId: team._id }, issue);
      }
      return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
    }
  }
}

/** The patch that moves an issue into a group (used by board drag & drop and "+" in group headers). */
export function patchForGroup(descriptor: GroupDescriptor, issue: Issue | null, ws: WorkspaceData) {
  switch (descriptor.kind) {
    case "status": {
      if (!issue || issue.teamId === descriptor.state.teamId) return { stateId: descriptor.state._id };
      const match = (ws.statesByTeam.get(issue.teamId) ?? []).find((s) => stateKey(s) === stateKey(descriptor.state));
      return match ? { stateId: match._id } : {};
    }
    case "assignee":
      return { assigneeId: (descriptor.userId ?? null) as never };
    case "project":
      return { projectId: (descriptor.projectId ?? null) as never };
    case "priority":
      return { priority: descriptor.priority };
    case "cycle":
      return { cycleId: (descriptor.cycleId ?? null) as never };
    case "label":
      return descriptor.labelId && issue && !issue.labelIds.includes(descriptor.labelId as never)
        ? { labelIds: [...issue.labelIds, descriptor.labelId as never] }
        : {};
    default:
      return {};
  }
}
