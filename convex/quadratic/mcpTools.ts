import { v } from "convex/values";
import { internalMutation, internalQuery, type QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { fail, type Actor } from "./access";
import {
  PRIORITY_NAMES,
  addComment,
  createIssue,
  createLabel,
  createProject,
  findIssueByIdentifier,
  identifierFor,
  updateIssue,
  updateProject,
  type IssueFields,
  type ProjectFields,
} from "./model";

/**
 * Implementations of the MCP tools served at /quadratic/mcp. Tool names and
 * arguments mirror Linear's hosted MCP server so prompts written for Linear
 * work unchanged. Arguments come from LLMs, so everything is parsed by hand
 * and names, keys, emails, handles and ids are all accepted as references.
 */

type Args = Record<string, unknown>;

// ---------- argument parsing ----------

function optString(args: Args, key: string): string | undefined {
  const value = args[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") fail(`"${key}" must be a string.`);
  return value;
}

function reqString(args: Args, key: string): string {
  const value = optString(args, key);
  if (value === undefined) fail(`"${key}" is required.`);
  return value;
}

/** undefined = leave alone, null = clear. */
function nullableString(args: Args, key: string): string | null | undefined {
  if (!(key in args) || args[key] === undefined) return undefined;
  if (args[key] === null || args[key] === "") return null;
  return optString(args, key);
}

function optNumber(args: Args, key: string): number | undefined {
  const value = args[key];
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isFinite(parsed)) fail(`"${key}" must be a number.`);
  return parsed;
}

function optBoolean(args: Args, key: string): boolean | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") fail(`"${key}" must be true or false.`);
  return value;
}

function optStringArray(args: Args, key: string): string[] | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value ? [value] : [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    fail(`"${key}" must be an array of strings.`);
  }
  return value as string[];
}

function priorityFrom(args: Args): number | undefined {
  const value = args.priority;
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string") {
    const index = PRIORITY_NAMES.findIndex((name) => name.toLowerCase() === value.toLowerCase());
    if (index >= 0) return index;
    if (value.toLowerCase() === "none") return 0;
  }
  return optNumber(args, "priority");
}

function toIso(timestamp: number | undefined) {
  return timestamp === undefined ? null : new Date(timestamp).toISOString();
}

// ---------- workspace lookup cache ----------

async function loadWorkspace(ctx: QueryCtx, actor: Actor, appUrl: string) {
  const workspace = await ctx.db.get("quadraticWorkspaces", actor.workspaceId);
  if (!workspace) fail("Workspace not found.");
  const teams = await ctx.db
    .query("quadraticTeams")
    .withIndex("by_workspaceId", (q) => q.eq("workspaceId", actor.workspaceId))
    .take(100);
  const states = await ctx.db
    .query("quadraticStates")
    .withIndex("by_workspaceId", (q) => q.eq("workspaceId", actor.workspaceId))
    .take(1000);
  const labels = await ctx.db
    .query("quadraticLabels")
    .withIndex("by_workspaceId", (q) => q.eq("workspaceId", actor.workspaceId))
    .take(500);
  const projects = await ctx.db
    .query("quadraticProjects")
    .withIndex("by_workspaceId_and_archivedAt", (q) => q.eq("workspaceId", actor.workspaceId))
    .take(500);
  const cycles = await ctx.db
    .query("quadraticCycles")
    .withIndex("by_workspaceId", (q) => q.eq("workspaceId", actor.workspaceId))
    .order("desc")
    .take(500);
  const memberships = await ctx.db
    .query("quadraticMembers")
    .withIndex("by_workspaceId", (q) => q.eq("workspaceId", actor.workspaceId))
    .take(500);
  const users: (Doc<"quadraticUsers"> & { role: Doc<"quadraticMembers">["role"] })[] = [];
  for (const membership of memberships) {
    const user = await ctx.db.get("quadraticUsers", membership.userId);
    if (user) users.push({ ...user, role: membership.role });
  }
  return new WorkspaceLookup(actor, workspace, appUrl, teams, states, labels, projects, cycles, users);
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

class WorkspaceLookup {
  constructor(
    readonly actor: Actor,
    readonly workspace: Doc<"quadraticWorkspaces">,
    readonly appUrl: string,
    readonly teams: Doc<"quadraticTeams">[],
    readonly states: Doc<"quadraticStates">[],
    readonly labels: Doc<"quadraticLabels">[],
    readonly projects: Doc<"quadraticProjects">[],
    readonly cycles: Doc<"quadraticCycles">[],
    readonly users: (Doc<"quadraticUsers"> & { role: Doc<"quadraticMembers">["role"] })[],
  ) {}

  url(path: string) {
    return `${this.appUrl}/quadratic/${this.workspace.slug}${path}`;
  }

  team(ref: string) {
    const team = this.teams.find(
      (t) => t._id === ref || same(t.key, ref) || same(t.name, ref),
    );
    if (!team) fail(`No team matches "${ref}". Use list_teams to see teams.`);
    return team;
  }

  defaultTeam(ref: string | undefined) {
    if (ref) return this.team(ref);
    if (this.teams.length === 1) return this.teams[0];
    fail(`"team" is required. Options: ${this.teams.map((t) => t.key).join(", ")}.`);
  }

  user(ref: string) {
    if (same(ref, "me")) {
      const me = this.users.find((u) => u._id === this.actor.userId);
      if (me) return me;
    }
    const cleaned = ref.replace(/^@/, "");
    const user = this.users.find(
      (u) =>
        u._id === cleaned ||
        same(u.handle, cleaned) ||
        (u.email !== undefined && same(u.email, cleaned)) ||
        same(u.name, cleaned),
    );
    if (!user) fail(`No workspace member matches "${ref}". Use list_users to see members.`);
    return user;
  }

  state(ref: string, teamId: Id<"quadraticTeams">) {
    const teamStates = this.states.filter((s) => s.teamId === teamId).sort((a, b) => a.position - b.position);
    const state =
      teamStates.find((s) => s._id === ref || same(s.name, ref)) ?? teamStates.find((s) => same(s.type, ref));
    if (!state) {
      fail(`No status matches "${ref}". Options: ${teamStates.map((s) => s.name).join(", ")}.`);
    }
    return state;
  }

  label(ref: string, teamId?: Id<"quadraticTeams">) {
    const label = this.labels.find(
      (l) => (l._id === ref || same(l.name, ref)) && (!teamId || !l.teamId || l.teamId === teamId),
    );
    if (!label) fail(`No label matches "${ref}". Use list_issue_labels, or create_issue_label first.`);
    return label;
  }

  project(ref: string) {
    const project = this.projects.find((p) => !p.archivedAt && (p._id === ref || same(p.name, ref)));
    if (!project) fail(`No project matches "${ref}". Use list_projects to see projects.`);
    return project;
  }

  cycle(ref: string, teamId: Id<"quadraticTeams">) {
    const now = Date.now();
    const teamCycles = this.cycles.filter((c) => c.teamId === teamId).sort((a, b) => a.number - b.number);
    const currentIndex = teamCycles.findIndex((c) => c.startsAt <= now && c.endsAt > now);
    let cycle: Doc<"quadraticCycles"> | undefined;
    if (same(ref, "current")) cycle = teamCycles[currentIndex];
    else if (same(ref, "next")) cycle = currentIndex >= 0 ? teamCycles[currentIndex + 1] : teamCycles.find((c) => c.startsAt > now);
    else if (same(ref, "previous")) cycle = currentIndex > 0 ? teamCycles[currentIndex - 1] : undefined;
    else cycle = teamCycles.find((c) => c._id === ref || String(c.number) === ref || (c.name && same(c.name, ref)));
    if (!cycle) fail(`No cycle matches "${ref}" for this team. Is "Cycles" enabled for it?`);
    return cycle;
  }

  formatUser(id: Id<"quadraticUsers"> | undefined) {
    if (!id) return null;
    const user = this.users.find((u) => u._id === id);
    return user ? { id: user._id, name: user.name, displayName: user.handle, email: user.email ?? null } : null;
  }

  formatTeam(team: Doc<"quadraticTeams">) {
    return {
      id: team._id,
      key: team.key,
      name: team.name,
      description: team.description ?? null,
      cyclesEnabled: team.cyclesEnabled,
      estimateType: team.estimateType,
      url: this.url(`/team/${team.key}/all`),
    };
  }

  formatState(state: Doc<"quadraticStates">) {
    return { id: state._id, name: state.name, type: state.type, color: state.color, position: state.position };
  }

  formatCycle(cycle: Doc<"quadraticCycles">) {
    const now = Date.now();
    return {
      id: cycle._id,
      number: cycle.number,
      name: cycle.name ?? `Cycle ${cycle.number}`,
      teamId: cycle.teamId,
      startsAt: toIso(cycle.startsAt),
      endsAt: toIso(cycle.endsAt),
      status: cycle.endsAt <= now ? "past" : cycle.startsAt <= now ? "current" : "upcoming",
    };
  }

  formatProject(project: Doc<"quadraticProjects">, withDescription = false) {
    return {
      id: project._id,
      name: project.name,
      summary: project.summary ?? null,
      ...(withDescription ? { description: project.description } : {}),
      status: project.status,
      health: project.health ?? null,
      priority: { value: project.priority, name: PRIORITY_NAMES[project.priority] },
      lead: this.formatUser(project.leadId),
      teams: project.teamIds
        .map((id) => this.teams.find((t) => t._id === id))
        .filter((t) => t !== undefined)
        .map((t) => ({ id: t._id, key: t.key, name: t.name })),
      startDate: project.startDate ?? null,
      targetDate: project.targetDate ?? null,
      createdAt: toIso(project.createdAt),
      updatedAt: toIso(project.updatedAt),
      archivedAt: toIso(project.archivedAt),
      url: this.url(`/project/${project._id}`),
    };
  }

  identifier(issue: Pick<Doc<"quadraticIssues">, "teamId" | "number">) {
    const team = this.teams.find((t) => t._id === issue.teamId);
    return team ? identifierFor(team, issue) : String(issue.number);
  }

  formatIssue(
    issue: Doc<"quadraticIssues">,
    parent: Pick<Doc<"quadraticIssues">, "teamId" | "number"> | null,
    withDescription = false,
  ) {
    const team = this.teams.find((t) => t._id === issue.teamId);
    const state = this.states.find((s) => s._id === issue.stateId);
    const project = issue.projectId ? this.projects.find((p) => p._id === issue.projectId) : undefined;
    const cycle = issue.cycleId ? this.cycles.find((c) => c._id === issue.cycleId) : undefined;
    const identifier = this.identifier(issue);
    return {
      id: issue._id,
      identifier,
      title: issue.title,
      ...(withDescription ? { description: issue.description } : {}),
      status: state ? { id: state._id, name: state.name, type: state.type } : null,
      priority: { value: issue.priority, name: PRIORITY_NAMES[issue.priority] },
      assignee: this.formatUser(issue.assigneeId),
      creator: this.formatUser(issue.creatorId),
      team: team ? { id: team._id, key: team.key, name: team.name } : null,
      project: project ? { id: project._id, name: project.name } : null,
      cycle: cycle ? { id: cycle._id, number: cycle.number, name: cycle.name ?? `Cycle ${cycle.number}` } : null,
      labels: issue.labelIds
        .map((id) => this.labels.find((l) => l._id === id)?.name)
        .filter((name) => name !== undefined),
      parent: parent ? this.identifier(parent) : null,
      estimate: issue.estimate ?? null,
      dueDate: issue.dueDate ?? null,
      createdAt: toIso(issue.createdAt),
      updatedAt: toIso(issue.updatedAt),
      startedAt: toIso(issue.startedAt),
      completedAt: toIso(issue.completedAt),
      canceledAt: toIso(issue.canceledAt),
      archivedAt: toIso(issue.archivedAt),
      url: this.url(`/issue/${identifier}`),
    };
  }
}

async function resolveIssue(ctx: QueryCtx, lookup: WorkspaceLookup, ref: string) {
  const byIdentifier = await findIssueByIdentifier(ctx, lookup.actor.workspaceId, ref);
  if (byIdentifier) return byIdentifier.issue;
  const id = ctx.db.normalizeId("quadraticIssues", ref);
  const issue = id ? await ctx.db.get("quadraticIssues", id) : null;
  if (!issue || issue.workspaceId !== lookup.actor.workspaceId) fail(`No issue matches "${ref}".`);
  return issue;
}

async function parentOf(ctx: QueryCtx, issue: Doc<"quadraticIssues">) {
  return issue.parentId ? await ctx.db.get("quadraticIssues", issue.parentId) : null;
}

async function formatIssues(ctx: QueryCtx, lookup: WorkspaceLookup, issues: Doc<"quadraticIssues">[]) {
  const parents = new Map<string, Doc<"quadraticIssues"> | null>();
  const result = [];
  for (const issue of issues) {
    if (issue.parentId && !parents.has(issue.parentId)) parents.set(issue.parentId, await parentOf(ctx, issue));
    result.push(lookup.formatIssue(issue, issue.parentId ? (parents.get(issue.parentId) ?? null) : null));
  }
  return result;
}

// ---------- read tools ----------

async function listIssues(ctx: QueryCtx, lookup: WorkspaceLookup, args: Args, forceAssignee?: string) {
  const limit = Math.max(1, Math.min(250, optNumber(args, "limit") ?? 50));
  const includeArchived = optBoolean(args, "includeArchived") ?? false;
  const text = optString(args, "query");
  const teamRef = optString(args, "team");
  const team = teamRef ? lookup.team(teamRef) : undefined;
  const assigneeRef = forceAssignee ?? optString(args, "assignee");
  const stateRef = optString(args, "state");
  const labelRef = optString(args, "label");
  const projectRef = optString(args, "project");
  const cycleRef = optString(args, "cycle");
  const parentRef = optString(args, "parentId");
  const priority = priorityFrom(args);
  const orderBy = optString(args, "orderBy") === "createdAt" ? "createdAt" : "updatedAt";

  let candidates: Doc<"quadraticIssues">[];
  if (text) {
    const exact = await findIssueByIdentifier(ctx, lookup.actor.workspaceId, text);
    const matches = await ctx.db
      .query("quadraticIssues")
      .withSearchIndex("search_title", (q) => q.search("title", text).eq("workspaceId", lookup.actor.workspaceId))
      .take(100);
    candidates = exact ? [exact.issue, ...matches.filter((m) => m._id !== exact.issue._id)] : matches;
  } else {
    candidates = await ctx.db
      .query("quadraticIssues")
      .withIndex("by_workspaceId_and_archivedAt", (q) =>
        includeArchived
          ? q.eq("workspaceId", lookup.actor.workspaceId)
          : q.eq("workspaceId", lookup.actor.workspaceId).eq("archivedAt", undefined),
      )
      .take(3000);
  }

  const assignee =
    assigneeRef === undefined ? undefined : same(assigneeRef, "none") ? null : lookup.user(assigneeRef)._id;
  const parent = parentRef ? await resolveIssue(ctx, lookup, parentRef) : undefined;
  const project = projectRef ? lookup.project(projectRef) : undefined;

  const filtered = candidates.filter((issue) => {
    if (!includeArchived && issue.archivedAt) return false;
    if (team && issue.teamId !== team._id) return false;
    if (assignee !== undefined && (issue.assigneeId ?? null) !== assignee) return false;
    if (priority !== undefined && issue.priority !== priority) return false;
    if (project && issue.projectId !== project._id) return false;
    if (parent && issue.parentId !== parent._id) return false;
    if (stateRef) {
      const state = lookup.states.find((s) => s._id === issue.stateId);
      if (!state || !(same(state.name, stateRef) || same(state.type, stateRef) || state._id === stateRef)) return false;
    }
    if (labelRef) {
      const names = issue.labelIds.map((id) => lookup.labels.find((l) => l._id === id));
      if (!names.some((l) => l && (same(l.name, labelRef) || l._id === labelRef))) return false;
    }
    if (cycleRef) {
      const cycle = lookup.cycle(cycleRef, issue.teamId);
      if (issue.cycleId !== cycle._id) return false;
    }
    return true;
  });

  if (!text) filtered.sort((a, b) => b[orderBy] - a[orderBy]);
  const page = filtered.slice(0, limit);
  return {
    issues: await formatIssues(ctx, lookup, page),
    total: filtered.length,
    truncated: filtered.length > page.length,
  };
}

async function getIssue(ctx: QueryCtx, lookup: WorkspaceLookup, args: Args) {
  const issue = await resolveIssue(ctx, lookup, reqString(args, "id"));
  const children = await ctx.db
    .query("quadraticIssues")
    .withIndex("by_parentId", (q) => q.eq("parentId", issue._id))
    .take(100);
  const outgoing = await ctx.db
    .query("quadraticRelations")
    .withIndex("by_issueId", (q) => q.eq("issueId", issue._id))
    .take(100);
  const incoming = await ctx.db
    .query("quadraticRelations")
    .withIndex("by_relatedIssueId", (q) => q.eq("relatedIssueId", issue._id))
    .take(100);
  const relations = [];
  for (const relation of outgoing) {
    const other = await ctx.db.get("quadraticIssues", relation.relatedIssueId);
    if (other) relations.push({ type: relation.type === "blocks" ? "blocks" : relation.type, issue: lookup.identifier(other) });
  }
  for (const relation of incoming) {
    const other = await ctx.db.get("quadraticIssues", relation.issueId);
    if (other) {
      relations.push({ type: relation.type === "blocks" ? "blocked_by" : relation.type, issue: lookup.identifier(other) });
    }
  }
  const comments = await ctx.db
    .query("quadraticComments")
    .withIndex("by_issueId", (q) => q.eq("issueId", issue._id))
    .take(500);
  return {
    ...lookup.formatIssue(issue, await parentOf(ctx, issue), true),
    subIssues: children
      .filter((child) => !child.archivedAt)
      .map((child) => {
        const state = lookup.states.find((s) => s._id === child.stateId);
        return { identifier: lookup.identifier(child), title: child.title, status: state?.name ?? null };
      }),
    relations,
    commentCount: comments.length,
  };
}

async function listComments(ctx: QueryCtx, lookup: WorkspaceLookup, args: Args) {
  const issue = await resolveIssue(ctx, lookup, reqString(args, "issueId"));
  const comments = await ctx.db
    .query("quadraticComments")
    .withIndex("by_issueId", (q) => q.eq("issueId", issue._id))
    .take(500);
  return {
    issue: lookup.identifier(issue),
    comments: comments.map((comment) => ({
      id: comment._id,
      body: comment.body,
      author: lookup.formatUser(comment.authorId),
      parentId: comment.parentId ?? null,
      createdAt: toIso(comment.createdAt),
      editedAt: toIso(comment.editedAt),
    })),
  };
}

async function runRead(ctx: QueryCtx, lookup: WorkspaceLookup, tool: string, args: Args): Promise<unknown> {
  switch (tool) {
    case "list_teams":
      return { teams: lookup.teams.map((team) => lookup.formatTeam(team)) };
    case "get_team": {
      const team = lookup.team(reqString(args, "query"));
      return {
        ...lookup.formatTeam(team),
        statuses: lookup.states
          .filter((s) => s.teamId === team._id)
          .sort((a, b) => a.position - b.position)
          .map((s) => lookup.formatState(s)),
      };
    }
    case "list_users":
      return {
        users: lookup.users.map((user) => ({
          ...lookup.formatUser(user._id),
          admin: user.role === "admin",
          isMe: user._id === lookup.actor.userId,
        })),
      };
    case "get_user": {
      const user = lookup.user(optString(args, "query") ?? "me");
      return { ...lookup.formatUser(user._id), admin: user.role === "admin", isMe: user._id === lookup.actor.userId };
    }
    case "list_issue_statuses": {
      const team = lookup.defaultTeam(optString(args, "team"));
      return {
        team: team.key,
        statuses: lookup.states
          .filter((s) => s.teamId === team._id)
          .sort((a, b) => a.position - b.position)
          .map((s) => lookup.formatState(s)),
      };
    }
    case "get_issue_status": {
      const team = lookup.defaultTeam(optString(args, "team"));
      return lookup.formatState(lookup.state(reqString(args, "query"), team._id));
    }
    case "list_issue_labels": {
      const teamRef = optString(args, "team");
      const team = teamRef ? lookup.team(teamRef) : undefined;
      return {
        labels: lookup.labels
          .filter((l) => !team || !l.teamId || l.teamId === team._id)
          .map((l) => ({
            id: l._id,
            name: l.name,
            color: l.color,
            description: l.description ?? null,
            team: l.teamId ? (lookup.teams.find((t) => t._id === l.teamId)?.key ?? null) : null,
          })),
      };
    }
    case "list_projects": {
      const teamRef = optString(args, "team");
      const team = teamRef ? lookup.team(teamRef) : undefined;
      const includeArchived = optBoolean(args, "includeArchived") ?? false;
      const state = optString(args, "state");
      const projects = lookup.projects.filter(
        (p) =>
          (includeArchived || !p.archivedAt) &&
          (!team || p.teamIds.includes(team._id)) &&
          (!state || same(p.status, state)),
      );
      return { projects: projects.map((p) => lookup.formatProject(p)) };
    }
    case "get_project": {
      const project = lookup.project(reqString(args, "query"));
      const issues = await ctx.db
        .query("quadraticIssues")
        .withIndex("by_projectId", (q) => q.eq("projectId", project._id))
        .take(1000);
      const live = issues.filter((i) => !i.archivedAt);
      const done = live.filter((i) => {
        const type = lookup.states.find((s) => s._id === i.stateId)?.type;
        return type === "completed" || type === "canceled";
      }).length;
      return {
        ...lookup.formatProject(project, true),
        issueCount: live.length,
        progress: live.length ? Math.round((done / live.length) * 100) / 100 : 0,
      };
    }
    case "list_cycles": {
      const team = lookup.defaultTeam(optString(args, "teamId") ?? optString(args, "team"));
      const type = optString(args, "type");
      if (type) return { cycles: [lookup.formatCycle(lookup.cycle(type, team._id))] };
      return {
        cycles: lookup.cycles
          .filter((c) => c.teamId === team._id)
          .sort((a, b) => b.number - a.number)
          .map((c) => lookup.formatCycle(c)),
      };
    }
    case "list_issues":
      return await listIssues(ctx, lookup, args);
    case "list_my_issues":
      return await listIssues(ctx, lookup, args, "me");
    case "get_issue":
      return await getIssue(ctx, lookup, args);
    case "list_comments":
      return await listComments(ctx, lookup, args);
    default:
      fail(`Unknown tool "${tool}".`);
  }
}

export const read = internalQuery({
  args: {
    userId: v.id("quadraticUsers"),
    workspaceId: v.id("quadraticWorkspaces"),
    appUrl: v.string(),
    tool: v.string(),
    args: v.any(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const actor: Actor = { userId: args.userId, workspaceId: args.workspaceId, viaApi: true };
    const lookup = await loadWorkspace(ctx, actor, args.appUrl);
    return await runRead(ctx, lookup, args.tool, (args.args ?? {}) as Args);
  },
});

// ---------- write tools ----------

function issueFieldsFrom(lookup: WorkspaceLookup, args: Args, teamId: Id<"quadraticTeams">): IssueFields {
  const fields: IssueFields = {};
  const title = optString(args, "title");
  if (title !== undefined) fields.title = title;
  if (typeof args.description === "string") fields.description = args.description;
  const state = optString(args, "state");
  if (state) fields.stateId = lookup.state(state, teamId)._id;
  const priority = priorityFrom(args);
  if (priority !== undefined) fields.priority = priority;
  const assignee = nullableString(args, "assignee");
  if (assignee !== undefined) fields.assigneeId = assignee === null ? null : lookup.user(assignee)._id;
  const project = nullableString(args, "project");
  if (project !== undefined) fields.projectId = project === null ? null : lookup.project(project)._id;
  const cycle = nullableString(args, "cycle");
  if (cycle !== undefined) fields.cycleId = cycle === null ? null : lookup.cycle(cycle, teamId)._id;
  const labels = optStringArray(args, "labels");
  if (labels !== undefined) fields.labelIds = labels.map((ref) => lookup.label(ref, teamId)._id);
  if ("estimate" in args) fields.estimate = args.estimate === null ? null : optNumber(args, "estimate");
  const dueDate = nullableString(args, "dueDate");
  if (dueDate !== undefined) fields.dueDate = dueDate;
  return fields;
}

function projectFieldsFrom(lookup: WorkspaceLookup, args: Args): ProjectFields {
  const fields: ProjectFields = {};
  const name = optString(args, "name");
  if (name !== undefined) fields.name = name;
  const summary = optString(args, "summary");
  if (summary !== undefined) fields.summary = summary;
  if (typeof args.description === "string") fields.description = args.description;
  const state = optString(args, "state");
  if (state) {
    const statuses = ["backlog", "planned", "started", "paused", "completed", "canceled"] as const;
    const status = statuses.find((s) => same(s, state) || (s === "started" && same(state, "in progress")));
    if (!status) fail(`"state" must be one of ${statuses.join(", ")}.`);
    fields.status = status;
  }
  const priority = priorityFrom(args);
  if (priority !== undefined) fields.priority = priority;
  const lead = nullableString(args, "lead");
  if (lead !== undefined) fields.leadId = lead === null ? null : lookup.user(lead)._id;
  const teams = optStringArray(args, "teams");
  if (teams !== undefined) fields.teamIds = teams.map((ref) => lookup.team(ref)._id);
  const startDate = nullableString(args, "startDate");
  if (startDate !== undefined) fields.startDate = startDate;
  const targetDate = nullableString(args, "targetDate");
  if (targetDate !== undefined) fields.targetDate = targetDate;
  return fields;
}

export const write = internalMutation({
  args: {
    userId: v.id("quadraticUsers"),
    workspaceId: v.id("quadraticWorkspaces"),
    appUrl: v.string(),
    tool: v.string(),
    args: v.any(),
  },
  returns: v.any(),
  handler: async (ctx, { userId, workspaceId, appUrl, tool, args: rawArgs }) => {
    const actor: Actor = { userId, workspaceId, viaApi: true };
    const args = (rawArgs ?? {}) as Args;
    const lookup = await loadWorkspace(ctx, actor, appUrl);

    switch (tool) {
      case "create_issue": {
        const team = lookup.defaultTeam(optString(args, "team"));
        const fields = issueFieldsFrom(lookup, args, team._id);
        const parentRef = optString(args, "parentId");
        if (parentRef) fields.parentId = (await resolveIssue(ctx, lookup, parentRef))._id;
        const { issueId } = await createIssue(ctx, actor, {
          ...fields,
          teamId: team._id,
          title: reqString(args, "title"),
        });
        const issue = await ctx.db.get("quadraticIssues", issueId);
        if (!issue) fail("Issue vanished.");
        return lookup.formatIssue(issue, await parentOf(ctx, issue), true);
      }
      case "update_issue": {
        const existing = await resolveIssue(ctx, lookup, reqString(args, "id"));
        const teamRef = optString(args, "team");
        const team = teamRef ? lookup.team(teamRef) : lookup.teams.find((t) => t._id === existing.teamId);
        if (!team) fail("Team not found.");
        const fields = issueFieldsFrom(lookup, args, team._id);
        const parentRef = nullableString(args, "parentId");
        if (parentRef !== undefined) {
          fields.parentId = parentRef === null ? null : (await resolveIssue(ctx, lookup, parentRef))._id;
        }
        await updateIssue(ctx, actor, existing._id, { ...fields, teamId: team._id });
        const issue = await ctx.db.get("quadraticIssues", existing._id);
        if (!issue) fail("Issue vanished.");
        // Team changes renumber the issue; refresh the cache's view of teams.
        const fresh = await loadWorkspace(ctx, actor, appUrl);
        return fresh.formatIssue(issue, await parentOf(ctx, issue), true);
      }
      case "create_comment": {
        const issue = await resolveIssue(ctx, lookup, reqString(args, "issueId"));
        const parentRef = optString(args, "parentId");
        const parentId = parentRef ? ctx.db.normalizeId("quadraticComments", parentRef) : undefined;
        if (parentRef && !parentId) fail(`No comment matches "${parentRef}".`);
        const commentId = await addComment(ctx, actor, issue._id, reqString(args, "body"), parentId ?? undefined);
        return {
          id: commentId,
          issue: lookup.identifier(issue),
          url: lookup.url(`/issue/${lookup.identifier(issue)}`),
        };
      }
      case "create_project": {
        const fields = projectFieldsFrom(lookup, args);
        if (!fields.teamIds?.length && lookup.teams.length === 1) fields.teamIds = [lookup.teams[0]._id];
        const projectId = await createProject(ctx, actor, { ...fields, name: reqString(args, "name") });
        const project = await ctx.db.get("quadraticProjects", projectId);
        if (!project) fail("Project vanished.");
        return lookup.formatProject(project, true);
      }
      case "update_project": {
        const project = lookup.project(reqString(args, "id"));
        const updated = await updateProject(ctx, actor, project._id, projectFieldsFrom(lookup, args));
        return lookup.formatProject(updated, true);
      }
      case "create_issue_label": {
        const teamRef = optString(args, "teamId") ?? optString(args, "team");
        const labelId = await createLabel(ctx, actor, {
          name: reqString(args, "name"),
          color: optString(args, "color"),
          description: optString(args, "description"),
          teamId: teamRef ? lookup.team(teamRef)._id : undefined,
        });
        const label = await ctx.db.get("quadraticLabels", labelId);
        return { id: labelId, name: label?.name, color: label?.color };
      }
      default:
        fail(`Unknown tool "${tool}".`);
    }
  },
});
