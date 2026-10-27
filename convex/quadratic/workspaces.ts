import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  fail,
  getMembership,
  getMemberContext,
  getViewer,
  requireAdmin,
  requireMember,
  requireViewer,
  type Actor,
} from "./access";
import {
  DEFAULT_LABELS,
  cleanName,
  createIssue,
  createTeamWithDefaults,
} from "./model";

const RESERVED_SLUGS = new Set(["join", "login", "mcp", "new", "api", "settings", "admin", "app"]);

export function cleanSlug(slug: string) {
  const normalized = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (normalized.length < 2 || normalized.length > 32) fail("Workspace URLs are 2–32 characters.");
  if (RESERVED_SLUGS.has(normalized)) fail("That workspace URL is reserved.");
  return normalized;
}

function newInviteCode() {
  return crypto.randomUUID().replace(/-/g, "");
}

function teamKeyFrom(name: string) {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "");
  return (letters.slice(0, 3) || "TEAM").padEnd(3, "X");
}

const ONBOARDING: {
  title: string;
  state: string;
  priority: number;
  labels?: string[];
  description: string;
}[] = [
  {
    title: "Welcome to Quadratic 👋",
    state: "Todo",
    priority: 0,
    description:
      "Hi there. Quadratic is a fast, keyboard-first issue tracker for planning and building products.\n\n" +
      "This team starts with a few issues to show you around. Open each one, then close it once you've tried it.\n\n" +
      "**Tip:** press `?` anywhere to see every keyboard shortcut.",
  },
  {
    title: "3 ways to navigate Quadratic: Command menu, keyboard or mouse",
    state: "Todo",
    priority: 2,
    description:
      "- **Command menu**: press `Cmd/Ctrl K` to search for any action or page.\n" +
      "- **Keyboard**: `C` creates an issue, `J`/`K` moves through lists, `S` changes status, `P` priority, `A` assignee, `L` labels.\n" +
      "- **Mouse**: right-click any issue for a context menu.\n\n" +
      "Navigate with `G` then `I` (inbox), `M` (my issues), `P` (projects), `C` (cycles).",
  },
  {
    title: "Connect your AI tools with MCP",
    state: "Todo",
    priority: 3,
    labels: ["Feature"],
    description:
      "Quadratic ships an MCP server, so Claude, Cursor and other agents can read and update issues.\n\n" +
      "1. Open **Settings → API & MCP** and create a key.\n" +
      "2. Add the server to your client, for example:\n\n" +
      "```bash\nclaude mcp add --transport http quadratic https://ashvinpraveen.com/quadratic/mcp \\\n  --header \"Authorization: Bearer <your key>\"\n```\n\n" +
      "3. Ask your agent to *list my issues*.",
  },
  {
    title: "Use Cycles to focus work over n–weeks",
    state: "Backlog",
    priority: 4,
    description:
      "Cycles are like sprints: time-boxed periods your team commits to. Turn them on in **Settings → Teams**. " +
      "Unfinished issues roll over to the next cycle automatically.",
  },
  {
    title: "Use Projects to organize work for features or releases",
    state: "Backlog",
    priority: 4,
    description:
      "Projects group issues across teams toward a goal with a target date. Track progress and health from the Projects page.",
  },
  {
    title: "Invite your teammates",
    state: "Backlog",
    priority: 3,
    description: "Copy the invite link from **Settings → Members** and share it with your team.",
  },
  {
    title: "Fix: Issue detail flickers when switching views quickly",
    state: "In Progress",
    priority: 1,
    labels: ["Bug"],
    description: "Repro: open an issue, press `Esc`, then `J` repeatedly. This one's just an example — feel free to close it.",
  },
  {
    title: "Customize your workflow statuses",
    state: "Done",
    priority: 0,
    labels: ["Improvement"],
    description: "Rename, recolor, and add statuses for each team in **Settings → Teams**.",
  },
];

async function seedWorkspace(
  ctx: MutationCtx,
  actor: Actor,
  teamName: string,
) {
  const { teamId, stateIds } = await createTeamWithDefaults(ctx, actor.workspaceId, {
    name: teamName,
    key: teamKeyFrom(teamName),
  });
  const labelIds: Record<string, Id<"quadraticLabels">> = {};
  for (const label of DEFAULT_LABELS) {
    labelIds[label.name] = await ctx.db.insert("quadraticLabels", {
      workspaceId: actor.workspaceId,
      ...label,
      createdAt: Date.now(),
    });
  }
  // Insert oldest first so the welcome issue ends up as #1.
  for (const [index, item] of ONBOARDING.entries()) {
    await createIssue(ctx, actor, {
      teamId,
      title: item.title,
      description: item.description,
      stateId: stateIds[item.state],
      priority: item.priority,
      assigneeId: index < 3 ? actor.userId : undefined,
      labelIds: (item.labels ?? []).map((name) => labelIds[name]),
      sortOrder: index,
    });
  }
}

const workspaceSummary = v.object({
  _id: v.id("quadraticWorkspaces"),
  name: v.string(),
  slug: v.string(),
  role: v.union(v.literal("admin"), v.literal("member")),
});

export const mine = query({
  args: { token: v.string() },
  returns: v.array(workspaceSummary),
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx, args.token);
    if (!viewer) return [];
    const memberships = await ctx.db
      .query("quadraticMembers")
      .withIndex("by_userId", (q) => q.eq("userId", viewer._id))
      .take(50);
    const result = [];
    for (const membership of memberships) {
      const workspace = await ctx.db.get("quadraticWorkspaces", membership.workspaceId);
      if (workspace) {
        result.push({ _id: workspace._id, name: workspace.name, slug: workspace.slug, role: membership.role });
      }
    }
    return result;
  },
});

export const slugAvailable = query({
  args: { slug: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const workspace = await ctx.db
      .query("quadraticWorkspaces")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug.toLowerCase()))
      .first();
    return !workspace && !RESERVED_SLUGS.has(args.slug.toLowerCase());
  },
});

export const create = mutation({
  args: { token: v.string(), name: v.string(), slug: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.token);
    const owned = await ctx.db
      .query("quadraticMembers")
      .withIndex("by_userId", (q) => q.eq("userId", viewer._id))
      .take(21);
    if (owned.length >= 20) fail("You can be in at most 20 workspaces.");
    const name = cleanName(args.name, "Workspace name", 60);
    const slug = cleanSlug(args.slug);
    const clash = await ctx.db
      .query("quadraticWorkspaces")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (clash) fail("That workspace URL is taken.");
    const now = Date.now();
    const workspaceId = await ctx.db.insert("quadraticWorkspaces", {
      name,
      slug,
      inviteCode: newInviteCode(),
      ownerId: viewer._id,
      createdAt: now,
    });
    await ctx.db.insert("quadraticMembers", {
      workspaceId,
      userId: viewer._id,
      role: "admin",
      createdAt: now,
    });
    await ctx.db.patch("quadraticUsers", viewer._id, { lastWorkspaceId: workspaceId });
    await seedWorkspace(ctx, { userId: viewer._id, workspaceId }, name);
    return slug;
  },
});

export const invitePreview = query({
  args: { inviteCode: v.string() },
  returns: v.union(
    v.object({ name: v.string(), slug: v.string(), memberCount: v.number() }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const workspace = await ctx.db
      .query("quadraticWorkspaces")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .first();
    if (!workspace) return null;
    const members = await ctx.db
      .query("quadraticMembers")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspace._id))
      .take(500);
    return { name: workspace.name, slug: workspace.slug, memberCount: members.length };
  },
});

export const join = mutation({
  args: { token: v.string(), inviteCode: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.token);
    const workspace = await ctx.db
      .query("quadraticWorkspaces")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .first();
    if (!workspace) fail("This invite link is no longer valid.");
    const existing = await getMembership(ctx, workspace._id, viewer._id);
    if (!existing) {
      await ctx.db.insert("quadraticMembers", {
        workspaceId: workspace._id,
        userId: viewer._id,
        role: "member",
        createdAt: Date.now(),
      });
    }
    await ctx.db.patch("quadraticUsers", viewer._id, { lastWorkspaceId: workspace._id });
    return workspace.slug;
  },
});

export const visit = mutation({
  args: { token: v.string(), workspaceId: v.id("quadraticWorkspaces") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { viewer } = await requireMember(ctx, args.token, args.workspaceId);
    if (viewer.lastWorkspaceId !== args.workspaceId) {
      await ctx.db.patch("quadraticUsers", viewer._id, { lastWorkspaceId: args.workspaceId });
    }
    return null;
  },
});

function liteProject(project: Doc<"quadraticProjects">) {
  const { description, ...rest } = project;
  return rest;
}

/**
 * Everything small and slow-changing the app shell needs in one reactive
 * snapshot: Linear keeps this kind of data fully client-side, and so do we.
 */
export const bootstrap = query({
  args: { token: v.string(), slug: v.string() },
  handler: async (ctx, args) => {
    const workspace = await ctx.db
      .query("quadraticWorkspaces")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug.toLowerCase()))
      .first();
    if (!workspace) return { status: "missing" as const };
    const context = await getMemberContext(ctx, args.token, workspace._id);
    if (!context) return { status: "forbidden" as const, name: workspace.name };
    const { viewer, member } = context;

    const memberships = await ctx.db
      .query("quadraticMembers")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspace._id))
      .take(500);
    const members = [];
    for (const membership of memberships) {
      const user = await ctx.db.get("quadraticUsers", membership.userId);
      if (!user) continue;
      members.push({
        _id: user._id,
        name: user.name,
        handle: user.handle,
        email: user.email,
        avatarHue: user.avatarHue,
        role: membership.role,
        joinedAt: membership.createdAt,
      });
    }

    const byWorkspace = { workspaceId: workspace._id };
    const teams = await ctx.db
      .query("quadraticTeams")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", byWorkspace.workspaceId))
      .take(100);
    const states = await ctx.db
      .query("quadraticStates")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", byWorkspace.workspaceId))
      .take(1000);
    const labels = await ctx.db
      .query("quadraticLabels")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", byWorkspace.workspaceId))
      .take(500);
    const projects = await ctx.db
      .query("quadraticProjects")
      .withIndex("by_workspaceId_and_archivedAt", (q) =>
        q.eq("workspaceId", byWorkspace.workspaceId).eq("archivedAt", undefined),
      )
      .take(500);
    const cycles = await ctx.db
      .query("quadraticCycles")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", byWorkspace.workspaceId))
      .order("desc")
      .take(500);
    const views = (
      await ctx.db
        .query("quadraticViews")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", byWorkspace.workspaceId))
        .take(200)
    ).filter((view) => view.shared || view.creatorId === viewer._id);
    const favorites = await ctx.db
      .query("quadraticFavorites")
      .withIndex("by_userId_and_workspaceId", (q) =>
        q.eq("userId", viewer._id).eq("workspaceId", workspace._id),
      )
      .take(100);
    const recentNotifications = await ctx.db
      .query("quadraticNotifications")
      .withIndex("by_userId_and_workspaceId_and_createdAt", (q) =>
        q.eq("userId", viewer._id).eq("workspaceId", workspace._id),
      )
      .order("desc")
      .take(100);
    const now = Date.now();
    const unreadCount = recentNotifications.filter(
      (n) => !n.readAt && !n.archivedAt && !(n.snoozedUntil && n.snoozedUntil > now),
    ).length;

    return {
      status: "ok" as const,
      workspace: {
        _id: workspace._id,
        name: workspace.name,
        slug: workspace.slug,
        inviteCode: workspace.inviteCode,
        createdAt: workspace.createdAt,
      },
      viewer: {
        _id: viewer._id,
        name: viewer.name,
        handle: viewer.handle,
        email: viewer.email,
        avatarHue: viewer.avatarHue,
      },
      role: member.role,
      members,
      teams: teams.sort((a, b) => a.createdAt - b.createdAt),
      states,
      labels,
      projects: projects.map(liteProject),
      cycles,
      views,
      favorites: favorites.sort((a, b) => a.sortOrder - b.sortOrder),
      unreadCount,
    };
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token, args.workspaceId);
    const workspace = await ctx.db.get("quadraticWorkspaces", args.workspaceId);
    if (!workspace) fail("Workspace not found.");
    const patch: { name?: string; slug?: string } = {};
    if (args.name !== undefined) patch.name = cleanName(args.name, "Workspace name", 60);
    if (args.slug !== undefined && args.slug !== workspace.slug) {
      const slug = cleanSlug(args.slug);
      const clash = await ctx.db
        .query("quadraticWorkspaces")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (clash && clash._id !== workspace._id) fail("That workspace URL is taken.");
      patch.slug = slug;
    }
    await ctx.db.patch("quadraticWorkspaces", workspace._id, patch);
    return patch.slug ?? workspace.slug;
  },
});

export const resetInvite = mutation({
  args: { token: v.string(), workspaceId: v.id("quadraticWorkspaces") },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token, args.workspaceId);
    const inviteCode = newInviteCode();
    await ctx.db.patch("quadraticWorkspaces", args.workspaceId, { inviteCode });
    return inviteCode;
  },
});

export const setRole = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    userId: v.id("quadraticUsers"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, args.token, args.workspaceId);
    const target = await getMembership(ctx, args.workspaceId, args.userId);
    if (!target) fail("Member not found.");
    if (args.userId === viewer._id && args.role !== "admin") {
      const admins = (
        await ctx.db
          .query("quadraticMembers")
          .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
          .take(500)
      ).filter((m) => m.role === "admin");
      if (admins.length <= 1) fail("A workspace needs at least one admin.");
    }
    await ctx.db.patch("quadraticMembers", target._id, { role: args.role });
    return null;
  },
});

export const removeMember = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    userId: v.id("quadraticUsers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { viewer, member } = await requireMember(ctx, args.token, args.workspaceId);
    const leaving = args.userId === viewer._id;
    if (!leaving && member.role !== "admin") fail("Only workspace admins can remove members.");
    const target = await getMembership(ctx, args.workspaceId, args.userId);
    if (!target) return null;
    if (target.role === "admin") {
      const admins = (
        await ctx.db
          .query("quadraticMembers")
          .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
          .take(500)
      ).filter((m) => m.role === "admin");
      if (admins.length <= 1) fail("A workspace needs at least one admin.");
    }
    await ctx.db.delete("quadraticMembers", target._id);
    const keys = await ctx.db
      .query("quadraticApiKeys")
      .withIndex("by_workspaceId_and_userId", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId),
      )
      .take(100);
    for (const key of keys) {
      if (!key.revokedAt) await ctx.db.patch("quadraticApiKeys", key._id, { revokedAt: Date.now() });
    }
    return null;
  },
});
