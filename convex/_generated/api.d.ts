/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminAuth from "../adminAuth.js";
import type * as adminDashboard from "../adminDashboard.js";
import type * as articleViews from "../articleViews.js";
import type * as chat from "../chat.js";
import type * as chatAgent from "../chatAgent.js";
import type * as chatAi from "../chatAi.js";
import type * as crons from "../crons.js";
import type * as diary from "../diary.js";
import type * as http from "../http.js";
import type * as lib_chatAiBooking from "../lib/chatAiBooking.js";
import type * as lib_chatAiShared from "../lib/chatAiShared.js";
import type * as lib_chatAiTypes from "../lib/chatAiTypes.js";
import type * as lib_musicTheory from "../lib/musicTheory.js";
import type * as lib_runClubSchedule from "../lib/runClubSchedule.js";
import type * as migrations from "../migrations.js";
import type * as music from "../music.js";
import type * as postcards from "../postcards.js";
import type * as quadratic_access from "../quadratic/access.js";
import type * as quadratic_apiKeys from "../quadratic/apiKeys.js";
import type * as quadratic_comments from "../quadratic/comments.js";
import type * as quadratic_cycles from "../quadratic/cycles.js";
import type * as quadratic_favorites from "../quadratic/favorites.js";
import type * as quadratic_inbox from "../quadratic/inbox.js";
import type * as quadratic_issues from "../quadratic/issues.js";
import type * as quadratic_labels from "../quadratic/labels.js";
import type * as quadratic_mcp from "../quadratic/mcp.js";
import type * as quadratic_mcpTools from "../quadratic/mcpTools.js";
import type * as quadratic_model from "../quadratic/model.js";
import type * as quadratic_projects from "../quadratic/projects.js";
import type * as quadratic_tables from "../quadratic/tables.js";
import type * as quadratic_teams from "../quadratic/teams.js";
import type * as quadratic_users from "../quadratic/users.js";
import type * as quadratic_validators from "../quadratic/validators.js";
import type * as quadratic_views from "../quadratic/views.js";
import type * as quadratic_workspaces from "../quadratic/workspaces.js";
import type * as runClub from "../runClub.js";
import type * as runClubRoutes from "../runClubRoutes.js";
import type * as runClubSocial from "../runClubSocial.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminAuth: typeof adminAuth;
  adminDashboard: typeof adminDashboard;
  articleViews: typeof articleViews;
  chat: typeof chat;
  chatAgent: typeof chatAgent;
  chatAi: typeof chatAi;
  crons: typeof crons;
  diary: typeof diary;
  http: typeof http;
  "lib/chatAiBooking": typeof lib_chatAiBooking;
  "lib/chatAiShared": typeof lib_chatAiShared;
  "lib/chatAiTypes": typeof lib_chatAiTypes;
  "lib/musicTheory": typeof lib_musicTheory;
  "lib/runClubSchedule": typeof lib_runClubSchedule;
  migrations: typeof migrations;
  music: typeof music;
  postcards: typeof postcards;
  "quadratic/access": typeof quadratic_access;
  "quadratic/apiKeys": typeof quadratic_apiKeys;
  "quadratic/comments": typeof quadratic_comments;
  "quadratic/cycles": typeof quadratic_cycles;
  "quadratic/favorites": typeof quadratic_favorites;
  "quadratic/inbox": typeof quadratic_inbox;
  "quadratic/issues": typeof quadratic_issues;
  "quadratic/labels": typeof quadratic_labels;
  "quadratic/mcp": typeof quadratic_mcp;
  "quadratic/mcpTools": typeof quadratic_mcpTools;
  "quadratic/model": typeof quadratic_model;
  "quadratic/projects": typeof quadratic_projects;
  "quadratic/tables": typeof quadratic_tables;
  "quadratic/teams": typeof quadratic_teams;
  "quadratic/users": typeof quadratic_users;
  "quadratic/validators": typeof quadratic_validators;
  "quadratic/views": typeof quadratic_views;
  "quadratic/workspaces": typeof quadratic_workspaces;
  runClub: typeof runClub;
  runClubRoutes: typeof runClubRoutes;
  runClubSocial: typeof runClubSocial;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
};
