import { v } from "convex/values";
import { projectHealthValidator, projectStatusValidator } from "./tables";

export const issueFieldsValidator = {
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  stateId: v.optional(v.id("quadraticStates")),
  priority: v.optional(v.number()),
  assigneeId: v.optional(v.union(v.id("quadraticUsers"), v.null())),
  projectId: v.optional(v.union(v.id("quadraticProjects"), v.null())),
  cycleId: v.optional(v.union(v.id("quadraticCycles"), v.null())),
  parentId: v.optional(v.union(v.id("quadraticIssues"), v.null())),
  labelIds: v.optional(v.array(v.id("quadraticLabels"))),
  estimate: v.optional(v.union(v.number(), v.null())),
  dueDate: v.optional(v.union(v.string(), v.null())),
  sortOrder: v.optional(v.number()),
};

export const issuePatchValidator = v.object({
  ...issueFieldsValidator,
  teamId: v.optional(v.id("quadraticTeams")),
});

export const projectFieldsValidator = {
  name: v.optional(v.string()),
  summary: v.optional(v.string()),
  description: v.optional(v.string()),
  icon: v.optional(v.union(v.string(), v.null())),
  color: v.optional(v.string()),
  status: v.optional(projectStatusValidator),
  health: v.optional(v.union(projectHealthValidator, v.null())),
  priority: v.optional(v.number()),
  leadId: v.optional(v.union(v.id("quadraticUsers"), v.null())),
  teamIds: v.optional(v.array(v.id("quadraticTeams"))),
  startDate: v.optional(v.union(v.string(), v.null())),
  targetDate: v.optional(v.union(v.string(), v.null())),
};
