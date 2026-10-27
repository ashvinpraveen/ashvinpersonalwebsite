import { defineTable } from "convex/server";
import { v } from "convex/values";

export const stateTypeValidator = v.union(
  v.literal("backlog"),
  v.literal("unstarted"),
  v.literal("started"),
  v.literal("completed"),
  v.literal("canceled"),
);

export const projectStatusValidator = v.union(
  v.literal("backlog"),
  v.literal("planned"),
  v.literal("started"),
  v.literal("paused"),
  v.literal("completed"),
  v.literal("canceled"),
);

export const projectHealthValidator = v.union(
  v.literal("onTrack"),
  v.literal("atRisk"),
  v.literal("offTrack"),
);

export const estimateTypeValidator = v.union(
  v.literal("notUsed"),
  v.literal("exponential"),
  v.literal("fibonacci"),
  v.literal("linear"),
  v.literal("tShirt"),
);

export const relationTypeValidator = v.union(
  v.literal("blocks"),
  v.literal("related"),
  v.literal("duplicate"),
);

export const favoriteKindValidator = v.union(
  v.literal("issue"),
  v.literal("project"),
  v.literal("view"),
  v.literal("cycle"),
);

export const notificationKindValidator = v.union(
  v.literal("assigned"),
  v.literal("unassigned"),
  v.literal("comment"),
  v.literal("mention"),
  v.literal("status"),
  v.literal("priority"),
  v.literal("reaction"),
  v.literal("created"),
);

/** Linear-style tables for /quadratic. Spread into `defineSchema` in `convex/schema.ts`. */
export const quadraticTables = {
  quadraticUsers: defineTable({
    name: v.string(),
    /** Linear's "display name": a lowercase handle used for @mentions. */
    handle: v.string(),
    email: v.optional(v.string()),
    avatarHue: v.number(),
    lastWorkspaceId: v.optional(v.id("quadraticWorkspaces")),
    createdAt: v.number(),
  }).index("by_handle", ["handle"]),
  quadraticSessions: defineTable({
    userId: v.id("quadraticUsers"),
    tokenHash: v.string(),
    createdAt: v.number(),
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_userId", ["userId"]),
  quadraticLoginCodes: defineTable({
    userId: v.id("quadraticUsers"),
    codeHash: v.string(),
    expiresAt: v.number(),
  })
    .index("by_codeHash", ["codeHash"])
    .index("by_userId", ["userId"]),
  quadraticWorkspaces: defineTable({
    name: v.string(),
    slug: v.string(),
    inviteCode: v.string(),
    ownerId: v.id("quadraticUsers"),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_inviteCode", ["inviteCode"]),
  quadraticMembers: defineTable({
    workspaceId: v.id("quadraticWorkspaces"),
    userId: v.id("quadraticUsers"),
    role: v.union(v.literal("admin"), v.literal("member")),
    createdAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_userId", ["userId"])
    .index("by_workspaceId_and_userId", ["workspaceId", "userId"]),
  quadraticTeams: defineTable({
    workspaceId: v.id("quadraticWorkspaces"),
    name: v.string(),
    key: v.string(),
    icon: v.optional(v.string()),
    color: v.string(),
    description: v.optional(v.string()),
    issueCount: v.number(),
    cyclesEnabled: v.boolean(),
    cycleDurationWeeks: v.number(),
    cycleStartDay: v.number(),
    upcomingCycleCount: v.number(),
    estimateType: estimateTypeValidator,
    createdAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspaceId_and_key", ["workspaceId", "key"])
    .index("by_cyclesEnabled", ["cyclesEnabled"]),
  quadraticStates: defineTable({
    workspaceId: v.id("quadraticWorkspaces"),
    teamId: v.id("quadraticTeams"),
    name: v.string(),
    type: stateTypeValidator,
    color: v.string(),
    description: v.optional(v.string()),
    position: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_teamId_and_position", ["teamId", "position"]),
  quadraticLabels: defineTable({
    workspaceId: v.id("quadraticWorkspaces"),
    teamId: v.optional(v.id("quadraticTeams")),
    name: v.string(),
    color: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_workspaceId", ["workspaceId"]),
  quadraticProjects: defineTable({
    workspaceId: v.id("quadraticWorkspaces"),
    name: v.string(),
    summary: v.optional(v.string()),
    description: v.string(),
    icon: v.optional(v.string()),
    color: v.string(),
    status: projectStatusValidator,
    health: v.optional(projectHealthValidator),
    priority: v.number(),
    leadId: v.optional(v.id("quadraticUsers")),
    teamIds: v.array(v.id("quadraticTeams")),
    startDate: v.optional(v.string()),
    targetDate: v.optional(v.string()),
    sortOrder: v.number(),
    creatorId: v.id("quadraticUsers"),
    createdAt: v.number(),
    updatedAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    archivedAt: v.optional(v.number()),
  }).index("by_workspaceId_and_archivedAt", ["workspaceId", "archivedAt"]),
  quadraticProjectUpdates: defineTable({
    workspaceId: v.id("quadraticWorkspaces"),
    projectId: v.id("quadraticProjects"),
    authorId: v.id("quadraticUsers"),
    health: projectHealthValidator,
    body: v.string(),
    createdAt: v.number(),
  }).index("by_projectId", ["projectId"]),
  quadraticCycles: defineTable({
    workspaceId: v.id("quadraticWorkspaces"),
    teamId: v.id("quadraticTeams"),
    number: v.number(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_teamId_and_number", ["teamId", "number"])
    .index("by_teamId_and_endsAt", ["teamId", "endsAt"]),
  quadraticIssues: defineTable({
    workspaceId: v.id("quadraticWorkspaces"),
    teamId: v.id("quadraticTeams"),
    number: v.number(),
    title: v.string(),
    description: v.string(),
    stateId: v.id("quadraticStates"),
    priority: v.number(),
    assigneeId: v.optional(v.id("quadraticUsers")),
    creatorId: v.id("quadraticUsers"),
    projectId: v.optional(v.id("quadraticProjects")),
    cycleId: v.optional(v.id("quadraticCycles")),
    parentId: v.optional(v.id("quadraticIssues")),
    labelIds: v.array(v.id("quadraticLabels")),
    estimate: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    sortOrder: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspaceId_and_archivedAt", ["workspaceId", "archivedAt"])
    .index("by_teamId_and_number", ["teamId", "number"])
    .index("by_parentId", ["parentId"])
    .index("by_projectId", ["projectId"])
    .index("by_cycleId", ["cycleId"])
    .index("by_stateId", ["stateId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["workspaceId"],
    }),
  quadraticComments: defineTable({
    workspaceId: v.id("quadraticWorkspaces"),
    issueId: v.id("quadraticIssues"),
    authorId: v.id("quadraticUsers"),
    parentId: v.optional(v.id("quadraticComments")),
    body: v.string(),
    createdAt: v.number(),
    editedAt: v.optional(v.number()),
  }).index("by_issueId", ["issueId"]),
  quadraticReactions: defineTable({
    commentId: v.id("quadraticComments"),
    userId: v.id("quadraticUsers"),
    emoji: v.string(),
    createdAt: v.number(),
  })
    .index("by_commentId", ["commentId"])
    .index("by_commentId_and_userId_and_emoji", ["commentId", "userId", "emoji"]),
  quadraticHistory: defineTable({
    workspaceId: v.id("quadraticWorkspaces"),
    issueId: v.id("quadraticIssues"),
    actorId: v.optional(v.id("quadraticUsers")),
    kind: v.string(),
    fromValue: v.optional(v.string()),
    toValue: v.optional(v.string()),
    viaApi: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_issueId", ["issueId"]),
  quadraticRelations: defineTable({
    workspaceId: v.id("quadraticWorkspaces"),
    issueId: v.id("quadraticIssues"),
    relatedIssueId: v.id("quadraticIssues"),
    type: relationTypeValidator,
    createdAt: v.number(),
  })
    .index("by_issueId", ["issueId"])
    .index("by_relatedIssueId", ["relatedIssueId"]),
  quadraticSubscriptions: defineTable({
    issueId: v.id("quadraticIssues"),
    userId: v.id("quadraticUsers"),
  })
    .index("by_issueId", ["issueId"])
    .index("by_userId", ["userId"])
    .index("by_issueId_and_userId", ["issueId", "userId"]),
  quadraticNotifications: defineTable({
    workspaceId: v.id("quadraticWorkspaces"),
    userId: v.id("quadraticUsers"),
    kind: notificationKindValidator,
    issueId: v.optional(v.id("quadraticIssues")),
    commentId: v.optional(v.id("quadraticComments")),
    actorId: v.optional(v.id("quadraticUsers")),
    body: v.optional(v.string()),
    readAt: v.optional(v.number()),
    snoozedUntil: v.optional(v.number()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_userId_and_workspaceId_and_createdAt", ["userId", "workspaceId", "createdAt"])
    .index("by_issueId", ["issueId"]),
  quadraticFavorites: defineTable({
    workspaceId: v.id("quadraticWorkspaces"),
    userId: v.id("quadraticUsers"),
    kind: favoriteKindValidator,
    targetId: v.string(),
    sortOrder: v.number(),
    createdAt: v.number(),
  }).index("by_userId_and_workspaceId", ["userId", "workspaceId"]),
  quadraticViews: defineTable({
    workspaceId: v.id("quadraticWorkspaces"),
    creatorId: v.id("quadraticUsers"),
    teamId: v.optional(v.id("quadraticTeams")),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.string(),
    /** JSON-encoded `IssueFilter` (see src/features/quadratic/filters.ts). */
    filters: v.string(),
    /** JSON-encoded display options (layout, grouping, ordering). */
    display: v.optional(v.string()),
    shared: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_workspaceId", ["workspaceId"]),
  quadraticApiKeys: defineTable({
    workspaceId: v.id("quadraticWorkspaces"),
    userId: v.id("quadraticUsers"),
    name: v.string(),
    keyHash: v.string(),
    prefix: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_keyHash", ["keyHash"])
    .index("by_workspaceId_and_userId", ["workspaceId", "userId"]),
};
