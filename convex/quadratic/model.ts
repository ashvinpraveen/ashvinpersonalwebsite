import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { assertMember, fail, getOwned, type Actor } from "./access";

/**
 * Domain logic shared by the app's public mutations and the MCP endpoint, so
 * both paths enforce the same validation, history, and notifications.
 */

export const PRIORITY_NAMES = ["No priority", "Urgent", "High", "Medium", "Low"] as const;

export type StateType = Doc<"quadraticStates">["type"];

export const DEFAULT_STATES: { name: string; type: StateType; color: string }[] = [
  { name: "Backlog", type: "backlog", color: "#bec2c8" },
  { name: "Todo", type: "unstarted", color: "#e2e2e2" },
  { name: "In Progress", type: "started", color: "#f2c94c" },
  { name: "In Review", type: "started", color: "#4cb782" },
  { name: "Done", type: "completed", color: "#5e6ad2" },
  { name: "Canceled", type: "canceled", color: "#95a2b3" },
  { name: "Duplicate", type: "canceled", color: "#95a2b3" },
];

export const DEFAULT_LABELS = [
  { name: "Bug", color: "#eb5757" },
  { name: "Feature", color: "#bb87fc" },
  { name: "Improvement", color: "#4ea7fc" },
];

export const TEAM_COLORS = [
  "#5e6ad2",
  "#26b5ce",
  "#4cb782",
  "#f2c94c",
  "#f2994a",
  "#eb5757",
  "#bb87fc",
  "#95a2b3",
];

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const MAX_TITLE = 512;
const MAX_DESCRIPTION = 100_000;
const MAX_LABELS_PER_ISSUE = 20;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type IssueFields = {
  title?: string;
  description?: string;
  stateId?: Id<"quadraticStates">;
  priority?: number;
  assigneeId?: Id<"quadraticUsers"> | null;
  projectId?: Id<"quadraticProjects"> | null;
  cycleId?: Id<"quadraticCycles"> | null;
  parentId?: Id<"quadraticIssues"> | null;
  labelIds?: Id<"quadraticLabels">[];
  estimate?: number | null;
  dueDate?: string | null;
  sortOrder?: number;
};

export type IssueInput = IssueFields & { teamId: Id<"quadraticTeams">; title: string };
export type IssuePatch = IssueFields & { teamId?: Id<"quadraticTeams"> };

// ---------- validation ----------

export function cleanTitle(title: string) {
  const trimmed = title.replace(/\s+/g, " ").trim();
  if (!trimmed) fail("Issue title can't be empty.");
  return trimmed.slice(0, MAX_TITLE);
}

export function cleanName(value: string, what: string, max = 80) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) fail(`${what} can't be empty.`);
  return trimmed.slice(0, max);
}

function cleanDescription(description: string) {
  if (description.length > MAX_DESCRIPTION) fail("Description is too long.");
  return description;
}

export function cleanDate(value: string | null | undefined, what: string) {
  if (value === null || value === undefined || value === "") return undefined;
  if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    fail(`${what} must be a YYYY-MM-DD date.`);
  }
  return value;
}

export function cleanPriority(priority: number) {
  if (!Number.isInteger(priority) || priority < 0 || priority > 4) {
    fail("Priority must be 0 (none), 1 (urgent), 2 (high), 3 (medium) or 4 (low).");
  }
  return priority;
}

function cleanEstimate(estimate: number | null | undefined) {
  if (estimate === null || estimate === undefined) return undefined;
  if (!Number.isFinite(estimate) || estimate < 0 || estimate > 100) fail("Estimate must be 0–100.");
  return estimate;
}

export function cleanColor(color: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) fail("Colors must be hex values like #5e6ad2.");
  return color.toLowerCase();
}

export function cleanTeamKey(key: string) {
  const normalized = key.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9]{0,6}$/.test(normalized)) {
    fail("Team identifiers are 1–7 letters or digits and start with a letter.");
  }
  return normalized;
}

export function identifierFor(team: Pick<Doc<"quadraticTeams">, "key">, issue: Pick<Doc<"quadraticIssues">, "number">) {
  return `${team.key}-${issue.number}`;
}

// ---------- lookups ----------

export async function listTeamStates(ctx: QueryCtx, teamId: Id<"quadraticTeams">) {
  return await ctx.db
    .query("quadraticStates")
    .withIndex("by_teamId_and_position", (q) => q.eq("teamId", teamId))
    .take(50);
}

export function pickDefaultState(states: Doc<"quadraticStates">[]) {
  return (
    states.find((state) => state.type === "unstarted") ??
    states.find((state) => state.type === "backlog") ??
    states[0]
  );
}

export async function findIssueByIdentifier(
  ctx: QueryCtx,
  workspaceId: Id<"quadraticWorkspaces">,
  identifier: string,
) {
  const match = /^([A-Za-z][A-Za-z0-9]{0,6})-(\d+)$/.exec(identifier.trim());
  if (!match) return null;
  const team = await ctx.db
    .query("quadraticTeams")
    .withIndex("by_workspaceId_and_key", (q) =>
      q.eq("workspaceId", workspaceId).eq("key", match[1].toUpperCase()),
    )
    .unique();
  if (!team) return null;
  const issue = await ctx.db
    .query("quadraticIssues")
    .withIndex("by_teamId_and_number", (q) => q.eq("teamId", team._id).eq("number", Number(match[2])))
    .unique();
  if (!issue) return null;
  return { team, issue };
}

// ---------- side effects ----------

export async function recordHistory(
  ctx: MutationCtx,
  actor: Actor,
  issueId: Id<"quadraticIssues">,
  kind: string,
  fromValue?: string,
  toValue?: string,
) {
  await ctx.db.insert("quadraticHistory", {
    workspaceId: actor.workspaceId,
    issueId,
    actorId: actor.userId,
    kind,
    fromValue,
    toValue,
    viaApi: actor.viaApi || undefined,
    createdAt: Date.now(),
  });
}

export async function subscribe(
  ctx: MutationCtx,
  issueId: Id<"quadraticIssues">,
  userId: Id<"quadraticUsers">,
) {
  const existing = await ctx.db
    .query("quadraticSubscriptions")
    .withIndex("by_issueId_and_userId", (q) => q.eq("issueId", issueId).eq("userId", userId))
    .unique();
  if (!existing) await ctx.db.insert("quadraticSubscriptions", { issueId, userId });
}

export async function unsubscribe(
  ctx: MutationCtx,
  issueId: Id<"quadraticIssues">,
  userId: Id<"quadraticUsers">,
) {
  const existing = await ctx.db
    .query("quadraticSubscriptions")
    .withIndex("by_issueId_and_userId", (q) => q.eq("issueId", issueId).eq("userId", userId))
    .unique();
  if (existing) await ctx.db.delete("quadraticSubscriptions", existing._id);
}

async function subscriberIds(ctx: QueryCtx, issueId: Id<"quadraticIssues">) {
  const subs = await ctx.db
    .query("quadraticSubscriptions")
    .withIndex("by_issueId", (q) => q.eq("issueId", issueId))
    .take(200);
  return subs.map((sub) => sub.userId);
}

export async function notify(
  ctx: MutationCtx,
  actor: Actor,
  userIds: Iterable<Id<"quadraticUsers">>,
  notification: Pick<Doc<"quadraticNotifications">, "kind"> &
    Partial<Pick<Doc<"quadraticNotifications">, "issueId" | "commentId" | "body">>,
) {
  const sent = new Set<string>();
  const now = Date.now();
  for (const userId of userIds) {
    if (userId === actor.userId || sent.has(userId)) continue;
    sent.add(userId);
    await ctx.db.insert("quadraticNotifications", {
      workspaceId: actor.workspaceId,
      userId,
      actorId: actor.userId,
      createdAt: now,
      ...notification,
    });
  }
}

function stateTimestamps(
  type: StateType,
  previous: Pick<Doc<"quadraticIssues">, "startedAt"> | null,
  now: number,
) {
  return {
    startedAt:
      type === "started" || type === "completed" ? (previous?.startedAt ?? now) : previous?.startedAt,
    completedAt: type === "completed" ? now : undefined,
    canceledAt: type === "canceled" ? now : undefined,
  };
}

// ---------- reference checks ----------

async function checkLabels(
  ctx: QueryCtx,
  actor: Actor,
  teamId: Id<"quadraticTeams">,
  labelIds: Id<"quadraticLabels">[],
) {
  const unique = Array.from(new Set(labelIds));
  if (unique.length > MAX_LABELS_PER_ISSUE) fail("Too many labels on one issue.");
  for (const labelId of unique) {
    const label = await getOwned(ctx, "quadraticLabels", labelId, actor, "Label");
    if (label.teamId && label.teamId !== teamId) fail(`Label "${label.name}" belongs to another team.`);
  }
  return unique;
}

async function checkParent(
  ctx: QueryCtx,
  actor: Actor,
  parentId: Id<"quadraticIssues">,
  selfId: Id<"quadraticIssues"> | null,
) {
  let cursor: Id<"quadraticIssues"> | undefined = parentId;
  for (let depth = 0; cursor && depth < 50; depth += 1) {
    if (cursor === selfId) fail("An issue can't be its own parent.");
    const issue: Doc<"quadraticIssues"> = await getOwned(ctx, "quadraticIssues", cursor, actor, "Parent issue");
    cursor = issue.parentId;
  }
}

async function checkCycle(ctx: QueryCtx, actor: Actor, cycleId: Id<"quadraticCycles">, teamId: Id<"quadraticTeams">) {
  const cycle = await getOwned(ctx, "quadraticCycles", cycleId, actor, "Cycle");
  if (cycle.teamId !== teamId) fail("That cycle belongs to another team.");
  return cycle;
}

async function checkState(ctx: QueryCtx, actor: Actor, stateId: Id<"quadraticStates">, teamId: Id<"quadraticTeams">) {
  const state = await getOwned(ctx, "quadraticStates", stateId, actor, "Status");
  if (state.teamId !== teamId) fail("That status belongs to another team.");
  return state;
}

// ---------- issues ----------

export async function createIssue(ctx: MutationCtx, actor: Actor, input: IssueInput) {
  const team = await getOwned(ctx, "quadraticTeams", input.teamId, actor, "Team");
  const states = await listTeamStates(ctx, team._id);
  const state = input.stateId
    ? await checkState(ctx, actor, input.stateId, team._id)
    : pickDefaultState(states);
  if (!state) fail("This team has no workflow statuses.");

  if (input.assigneeId) await assertMember(ctx, actor, input.assigneeId);
  if (input.projectId) await getOwned(ctx, "quadraticProjects", input.projectId, actor, "Project");
  if (input.cycleId) await checkCycle(ctx, actor, input.cycleId, team._id);
  if (input.parentId) await checkParent(ctx, actor, input.parentId, null);
  const labelIds = input.labelIds ? await checkLabels(ctx, actor, team._id, input.labelIds) : [];

  const now = Date.now();
  const number = team.issueCount + 1;
  await ctx.db.patch("quadraticTeams", team._id, { issueCount: number });

  const issueId = await ctx.db.insert("quadraticIssues", {
    workspaceId: actor.workspaceId,
    teamId: team._id,
    number,
    title: cleanTitle(input.title),
    description: cleanDescription(input.description ?? ""),
    stateId: state._id,
    priority: cleanPriority(input.priority ?? 0),
    assigneeId: input.assigneeId ?? undefined,
    creatorId: actor.userId,
    projectId: input.projectId ?? undefined,
    cycleId: input.cycleId ?? undefined,
    parentId: input.parentId ?? undefined,
    labelIds,
    estimate: cleanEstimate(input.estimate),
    dueDate: cleanDate(input.dueDate, "Due date"),
    sortOrder: input.sortOrder ?? -now,
    ...stateTimestamps(state.type, null, now),
    createdAt: now,
    updatedAt: now,
  });

  await recordHistory(ctx, actor, issueId, "created");
  await subscribe(ctx, issueId, actor.userId);
  if (input.assigneeId) {
    await subscribe(ctx, issueId, input.assigneeId);
    await notify(ctx, actor, [input.assigneeId], { kind: "assigned", issueId });
  }
  await notifyMentions(ctx, actor, issueId, undefined, input.description ?? "");

  return { issueId, identifier: identifierFor(team, { number }) };
}

export async function updateIssue(
  ctx: MutationCtx,
  actor: Actor,
  issueId: Id<"quadraticIssues">,
  patch: IssuePatch,
) {
  const issue = await getOwned(ctx, "quadraticIssues", issueId, actor, "Issue");
  const now = Date.now();
  const update: Partial<Doc<"quadraticIssues">> = {};
  let teamId = issue.teamId;

  if (patch.teamId !== undefined && patch.teamId !== issue.teamId) {
    // Moving teams: new number, map the status by type, drop team-only data.
    const fromTeam = await ctx.db.get("quadraticTeams", issue.teamId);
    const toTeam = await getOwned(ctx, "quadraticTeams", patch.teamId, actor, "Team");
    const currentState = await ctx.db.get("quadraticStates", issue.stateId);
    const targetStates = await listTeamStates(ctx, toTeam._id);
    const mapped =
      targetStates.find((state) => state.type === currentState?.type) ?? pickDefaultState(targetStates);
    if (!mapped) fail("That team has no workflow statuses.");
    const number = toTeam.issueCount + 1;
    await ctx.db.patch("quadraticTeams", toTeam._id, { issueCount: number });
    teamId = toTeam._id;
    Object.assign(update, { teamId, number, stateId: mapped._id, cycleId: undefined });
    const keptLabels: Id<"quadraticLabels">[] = [];
    for (const labelId of issue.labelIds) {
      const label = await ctx.db.get("quadraticLabels", labelId);
      if (label && (!label.teamId || label.teamId === teamId)) keptLabels.push(labelId);
    }
    update.labelIds = keptLabels;
    await recordHistory(
      ctx,
      actor,
      issueId,
      "team",
      fromTeam ? identifierFor(fromTeam, issue) : undefined,
      identifierFor(toTeam, { number }),
    );
  }

  if (patch.title !== undefined) {
    const title = cleanTitle(patch.title);
    if (title !== issue.title) {
      update.title = title;
      await recordHistory(ctx, actor, issueId, "title", issue.title, title);
    }
  }

  if (patch.description !== undefined && patch.description !== issue.description) {
    update.description = cleanDescription(patch.description);
    await notifyMentions(ctx, actor, issueId, issue.description, patch.description);
  }

  if (patch.stateId !== undefined && patch.stateId !== (update.stateId ?? issue.stateId)) {
    const state = await checkState(ctx, actor, patch.stateId, teamId);
    update.stateId = state._id;
    Object.assign(update, stateTimestamps(state.type, issue, now));
    await recordHistory(ctx, actor, issueId, "state", issue.stateId, state._id);
    const subs = await subscriberIds(ctx, issueId);
    if (state.type === "completed" || state.type === "canceled") {
      await notify(ctx, actor, subs, { kind: "status", issueId, body: state.name });
    }
  }

  if (patch.priority !== undefined && patch.priority !== issue.priority) {
    update.priority = cleanPriority(patch.priority);
    await recordHistory(ctx, actor, issueId, "priority", String(issue.priority), String(patch.priority));
    if (patch.priority === 1 && issue.assigneeId) {
      await notify(ctx, actor, [issue.assigneeId], { kind: "priority", issueId, body: "Urgent" });
    }
  }

  if (patch.assigneeId !== undefined && (patch.assigneeId ?? undefined) !== issue.assigneeId) {
    if (patch.assigneeId) {
      await assertMember(ctx, actor, patch.assigneeId);
      await subscribe(ctx, issueId, patch.assigneeId);
      await notify(ctx, actor, [patch.assigneeId], { kind: "assigned", issueId });
    }
    if (issue.assigneeId) {
      await notify(ctx, actor, [issue.assigneeId], { kind: "unassigned", issueId });
    }
    update.assigneeId = patch.assigneeId ?? undefined;
    await recordHistory(ctx, actor, issueId, "assignee", issue.assigneeId, patch.assigneeId ?? undefined);
  }

  if (patch.projectId !== undefined && (patch.projectId ?? undefined) !== issue.projectId) {
    if (patch.projectId) await getOwned(ctx, "quadraticProjects", patch.projectId, actor, "Project");
    update.projectId = patch.projectId ?? undefined;
    await recordHistory(ctx, actor, issueId, "project", issue.projectId, patch.projectId ?? undefined);
  }

  if (patch.cycleId !== undefined && (patch.cycleId ?? undefined) !== (update.cycleId ?? issue.cycleId)) {
    if (patch.cycleId) await checkCycle(ctx, actor, patch.cycleId, teamId);
    update.cycleId = patch.cycleId ?? undefined;
    await recordHistory(ctx, actor, issueId, "cycle", issue.cycleId, patch.cycleId ?? undefined);
  }

  if (patch.parentId !== undefined && (patch.parentId ?? undefined) !== issue.parentId) {
    if (patch.parentId) await checkParent(ctx, actor, patch.parentId, issueId);
    update.parentId = patch.parentId ?? undefined;
    await recordHistory(ctx, actor, issueId, "parent", issue.parentId, patch.parentId ?? undefined);
  }

  if (patch.labelIds !== undefined) {
    const next = await checkLabels(ctx, actor, teamId, patch.labelIds);
    const before = update.labelIds ?? issue.labelIds;
    const added = next.filter((id) => !before.includes(id));
    const removed = before.filter((id) => !next.includes(id));
    if (added.length || removed.length) {
      update.labelIds = next;
      for (const id of added) await recordHistory(ctx, actor, issueId, "labelAdded", undefined, id);
      for (const id of removed) await recordHistory(ctx, actor, issueId, "labelRemoved", id);
    }
  }

  if (patch.estimate !== undefined && (patch.estimate ?? undefined) !== issue.estimate) {
    update.estimate = cleanEstimate(patch.estimate);
    await recordHistory(
      ctx,
      actor,
      issueId,
      "estimate",
      issue.estimate === undefined ? undefined : String(issue.estimate),
      update.estimate === undefined ? undefined : String(update.estimate),
    );
  }

  if (patch.dueDate !== undefined && (patch.dueDate || undefined) !== issue.dueDate) {
    update.dueDate = cleanDate(patch.dueDate, "Due date");
    await recordHistory(ctx, actor, issueId, "dueDate", issue.dueDate, update.dueDate);
  }

  if (patch.sortOrder !== undefined && Number.isFinite(patch.sortOrder)) {
    update.sortOrder = patch.sortOrder;
  }

  if (Object.keys(update).length === 0) return issue;
  update.updatedAt = now;
  await ctx.db.patch("quadraticIssues", issueId, update);
  return { ...issue, ...update };
}

export async function setArchived(
  ctx: MutationCtx,
  actor: Actor,
  issueId: Id<"quadraticIssues">,
  archived: boolean,
) {
  const issue = await getOwned(ctx, "quadraticIssues", issueId, actor, "Issue");
  if (Boolean(issue.archivedAt) === archived) return;
  const now = Date.now();
  await ctx.db.patch("quadraticIssues", issueId, {
    archivedAt: archived ? now : undefined,
    updatedAt: now,
  });
  await recordHistory(ctx, actor, issueId, archived ? "archived" : "restored");
  if (archived) {
    // Sub-issues follow their parent into the trash, like Linear.
    const children = await ctx.db
      .query("quadraticIssues")
      .withIndex("by_parentId", (q) => q.eq("parentId", issueId))
      .take(100);
    for (const child of children) {
      if (!child.archivedAt) await ctx.db.patch("quadraticIssues", child._id, { archivedAt: now });
    }
  }
}

// ---------- comments & mentions ----------

const MENTION_PATTERN = /(^|[^\w@])@([a-z0-9][a-z0-9._-]{0,38})/gi;

export function extractMentions(body: string) {
  const handles = new Set<string>();
  for (const match of body.matchAll(MENTION_PATTERN)) handles.add(match[2].toLowerCase());
  return handles;
}

async function workspaceUsersByHandle(ctx: QueryCtx, workspaceId: Id<"quadraticWorkspaces">) {
  const members = await ctx.db
    .query("quadraticMembers")
    .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
    .take(500);
  const byHandle = new Map<string, Id<"quadraticUsers">>();
  for (const member of members) {
    const user = await ctx.db.get("quadraticUsers", member.userId);
    if (user) byHandle.set(user.handle, user._id);
  }
  return byHandle;
}

async function notifyMentions(
  ctx: MutationCtx,
  actor: Actor,
  issueId: Id<"quadraticIssues">,
  before: string | undefined,
  after: string,
  commentId?: Id<"quadraticComments">,
) {
  const mentioned = extractMentions(after);
  if (mentioned.size === 0) return;
  const previous = before ? extractMentions(before) : new Set<string>();
  const fresh = [...mentioned].filter((handle) => !previous.has(handle));
  if (fresh.length === 0) return;
  const byHandle = await workspaceUsersByHandle(ctx, actor.workspaceId);
  const userIds = fresh.map((handle) => byHandle.get(handle)).filter((id) => id !== undefined);
  for (const userId of userIds) await subscribe(ctx, issueId, userId);
  await notify(ctx, actor, userIds, {
    kind: "mention",
    issueId,
    commentId,
    body: after.slice(0, 280),
  });
}

export async function addComment(
  ctx: MutationCtx,
  actor: Actor,
  issueId: Id<"quadraticIssues">,
  body: string,
  parentId?: Id<"quadraticComments">,
) {
  await getOwned(ctx, "quadraticIssues", issueId, actor, "Issue");
  const trimmed = body.trim();
  if (!trimmed) fail("Comment can't be empty.");
  if (trimmed.length > 20_000) fail("Comment is too long.");
  if (parentId) {
    const parent = await getOwned(ctx, "quadraticComments", parentId, actor, "Comment");
    if (parent.issueId !== issueId) fail("Reply belongs to another issue.");
    if (parent.parentId) parentId = parent.parentId;
  }
  const commentId = await ctx.db.insert("quadraticComments", {
    workspaceId: actor.workspaceId,
    issueId,
    authorId: actor.userId,
    parentId,
    body: trimmed,
    createdAt: Date.now(),
  });
  await ctx.db.patch("quadraticIssues", issueId, { updatedAt: Date.now() });
  await subscribe(ctx, issueId, actor.userId);
  const mentioned = extractMentions(trimmed);
  const byHandle = mentioned.size ? await workspaceUsersByHandle(ctx, actor.workspaceId) : new Map();
  const mentionedIds = [...mentioned]
    .map((handle) => byHandle.get(handle))
    .filter((id): id is Id<"quadraticUsers"> => id !== undefined);
  const subs = await subscriberIds(ctx, issueId);
  await notify(
    ctx,
    actor,
    subs.filter((id) => !mentionedIds.includes(id)),
    { kind: "comment", issueId, commentId, body: trimmed.slice(0, 280) },
  );
  for (const userId of mentionedIds) await subscribe(ctx, issueId, userId);
  await notify(ctx, actor, mentionedIds, { kind: "mention", issueId, commentId, body: trimmed.slice(0, 280) });
  return commentId;
}

// ---------- projects & labels ----------

export type ProjectFields = {
  name?: string;
  summary?: string;
  description?: string;
  icon?: string | null;
  color?: string;
  status?: Doc<"quadraticProjects">["status"];
  health?: Doc<"quadraticProjects">["health"] | null;
  priority?: number;
  leadId?: Id<"quadraticUsers"> | null;
  teamIds?: Id<"quadraticTeams">[];
  startDate?: string | null;
  targetDate?: string | null;
};

async function checkTeams(ctx: QueryCtx, actor: Actor, teamIds: Id<"quadraticTeams">[]) {
  const unique = Array.from(new Set(teamIds)).slice(0, 20);
  for (const teamId of unique) await getOwned(ctx, "quadraticTeams", teamId, actor, "Team");
  return unique;
}

function projectStatusTimestamps(
  status: Doc<"quadraticProjects">["status"],
  previous: Pick<Doc<"quadraticProjects">, "startedAt"> | null,
  now: number,
) {
  return {
    startedAt: status === "started" || status === "completed" ? (previous?.startedAt ?? now) : previous?.startedAt,
    completedAt: status === "completed" ? now : undefined,
    canceledAt: status === "canceled" ? now : undefined,
  };
}

export async function createProject(
  ctx: MutationCtx,
  actor: Actor,
  input: ProjectFields & { name: string },
) {
  if (input.leadId) await assertMember(ctx, actor, input.leadId);
  const teamIds = await checkTeams(ctx, actor, input.teamIds ?? []);
  const now = Date.now();
  const status = input.status ?? "backlog";
  return await ctx.db.insert("quadraticProjects", {
    workspaceId: actor.workspaceId,
    name: cleanName(input.name, "Project name", 120),
    summary: input.summary?.slice(0, 255) || undefined,
    description: cleanDescription(input.description ?? ""),
    icon: input.icon ?? undefined,
    color: cleanColor(input.color ?? "#5e6ad2"),
    status,
    health: input.health ?? undefined,
    priority: cleanPriority(input.priority ?? 0),
    leadId: input.leadId ?? undefined,
    teamIds,
    startDate: cleanDate(input.startDate, "Start date"),
    targetDate: cleanDate(input.targetDate, "Target date"),
    sortOrder: -now,
    creatorId: actor.userId,
    createdAt: now,
    updatedAt: now,
    ...projectStatusTimestamps(status, null, now),
  });
}

export async function updateProject(
  ctx: MutationCtx,
  actor: Actor,
  projectId: Id<"quadraticProjects">,
  patch: ProjectFields,
) {
  const project = await getOwned(ctx, "quadraticProjects", projectId, actor, "Project");
  const now = Date.now();
  const update: Partial<Doc<"quadraticProjects">> = { updatedAt: now };
  if (patch.name !== undefined) update.name = cleanName(patch.name, "Project name", 120);
  if (patch.summary !== undefined) update.summary = patch.summary.slice(0, 255) || undefined;
  if (patch.description !== undefined) update.description = cleanDescription(patch.description);
  if (patch.icon !== undefined) update.icon = patch.icon ?? undefined;
  if (patch.color !== undefined) update.color = cleanColor(patch.color);
  if (patch.status !== undefined && patch.status !== project.status) {
    update.status = patch.status;
    Object.assign(update, projectStatusTimestamps(patch.status, project, now));
  }
  if (patch.health !== undefined) update.health = patch.health ?? undefined;
  if (patch.priority !== undefined) update.priority = cleanPriority(patch.priority);
  if (patch.leadId !== undefined) {
    if (patch.leadId) await assertMember(ctx, actor, patch.leadId);
    update.leadId = patch.leadId ?? undefined;
  }
  if (patch.teamIds !== undefined) update.teamIds = await checkTeams(ctx, actor, patch.teamIds);
  if (patch.startDate !== undefined) update.startDate = cleanDate(patch.startDate, "Start date");
  if (patch.targetDate !== undefined) update.targetDate = cleanDate(patch.targetDate, "Target date");
  await ctx.db.patch("quadraticProjects", projectId, update);
  return { ...project, ...update };
}

export async function createLabel(
  ctx: MutationCtx,
  actor: Actor,
  input: { name: string; color?: string; description?: string; teamId?: Id<"quadraticTeams"> },
) {
  if (input.teamId) await getOwned(ctx, "quadraticTeams", input.teamId, actor, "Team");
  const name = cleanName(input.name, "Label name", 60);
  const existing = await ctx.db
    .query("quadraticLabels")
    .withIndex("by_workspaceId", (q) => q.eq("workspaceId", actor.workspaceId))
    .take(500);
  if (existing.some((label) => label.name.toLowerCase() === name.toLowerCase() && label.teamId === input.teamId)) {
    fail(`A label named "${name}" already exists.`);
  }
  return await ctx.db.insert("quadraticLabels", {
    workspaceId: actor.workspaceId,
    teamId: input.teamId,
    name,
    color: cleanColor(input.color ?? TEAM_COLORS[existing.length % TEAM_COLORS.length]),
    description: input.description?.slice(0, 255) || undefined,
    createdAt: Date.now(),
  });
}

// ---------- teams & cycles ----------

export async function createTeamWithDefaults(
  ctx: MutationCtx,
  workspaceId: Id<"quadraticWorkspaces">,
  input: { name: string; key: string; color?: string; icon?: string },
) {
  const key = cleanTeamKey(input.key);
  const clash = await ctx.db
    .query("quadraticTeams")
    .withIndex("by_workspaceId_and_key", (q) => q.eq("workspaceId", workspaceId).eq("key", key))
    .unique();
  if (clash) fail(`Another team already uses the identifier ${key}.`);
  const teamId = await ctx.db.insert("quadraticTeams", {
    workspaceId,
    name: cleanName(input.name, "Team name", 60),
    key,
    icon: input.icon,
    color: cleanColor(input.color ?? TEAM_COLORS[0]),
    issueCount: 0,
    cyclesEnabled: false,
    cycleDurationWeeks: 2,
    cycleStartDay: 1,
    upcomingCycleCount: 2,
    estimateType: "notUsed",
    createdAt: Date.now(),
  });
  const stateIds: Record<string, Id<"quadraticStates">> = {};
  for (const [position, state] of DEFAULT_STATES.entries()) {
    stateIds[state.name] = await ctx.db.insert("quadraticStates", {
      workspaceId,
      teamId,
      ...state,
      position,
    });
  }
  return { teamId, stateIds };
}

function alignToWeekday(timestamp: number, weekday: number) {
  const date = new Date(timestamp);
  date.setUTCHours(0, 0, 0, 0);
  const diff = (date.getUTCDay() - weekday + 7) % 7;
  return date.getTime() - diff * DAY;
}

/** Keeps a current cycle plus `upcomingCycleCount` future cycles, and rolls
 * unfinished issues from ended cycles into the current one. */
export async function ensureCycles(ctx: MutationCtx, team: Doc<"quadraticTeams">, now = Date.now()) {
  if (!team.cyclesEnabled) return;
  const length = Math.max(1, Math.min(8, team.cycleDurationWeeks)) * WEEK;
  const latest = await ctx.db
    .query("quadraticCycles")
    .withIndex("by_teamId_and_number", (q) => q.eq("teamId", team._id))
    .order("desc")
    .first();

  let nextNumber = (latest?.number ?? 0) + 1;
  let nextStart =
    latest && latest.endsAt > now ? latest.endsAt : alignToWeekday(now, team.cycleStartDay);
  const futureCycles = await ctx.db
    .query("quadraticCycles")
    .withIndex("by_teamId_and_endsAt", (q) => q.eq("teamId", team._id).gt("endsAt", now))
    .take(20);
  let missing = team.upcomingCycleCount + 1 - futureCycles.length;
  while (missing > 0) {
    await ctx.db.insert("quadraticCycles", {
      workspaceId: team.workspaceId,
      teamId: team._id,
      number: nextNumber,
      startsAt: nextStart,
      endsAt: nextStart + length,
    });
    nextNumber += 1;
    nextStart += length;
    missing -= 1;
  }

  const current = await ctx.db
    .query("quadraticCycles")
    .withIndex("by_teamId_and_endsAt", (q) => q.eq("teamId", team._id).gt("endsAt", now))
    .first();
  const ended = await ctx.db
    .query("quadraticCycles")
    .withIndex("by_teamId_and_endsAt", (q) => q.eq("teamId", team._id).lte("endsAt", now))
    .order("desc")
    .take(5);
  for (const cycle of ended) {
    if (cycle.completedAt) continue;
    await ctx.db.patch("quadraticCycles", cycle._id, { completedAt: now });
    if (!current || current.startsAt > now) continue;
    const issues = await ctx.db
      .query("quadraticIssues")
      .withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
      .take(500);
    for (const issue of issues) {
      const state = await ctx.db.get("quadraticStates", issue.stateId);
      if (state && (state.type === "completed" || state.type === "canceled")) continue;
      await ctx.db.patch("quadraticIssues", issue._id, { cycleId: current._id, updatedAt: now });
    }
  }
}

// ---------- serialization ----------

export function liteIssue(issue: Doc<"quadraticIssues">) {
  const { description, workspaceId, ...rest } = issue;
  return rest;
}

export type LiteIssue = ReturnType<typeof liteIssue>;
