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
import type * as diary from "../diary.js";
import type * as http from "../http.js";
import type * as lib_chatAiBooking from "../lib/chatAiBooking.js";
import type * as lib_chatAiShared from "../lib/chatAiShared.js";
import type * as lib_chatAiTypes from "../lib/chatAiTypes.js";
import type * as lib_runClubSchedule from "../lib/runClubSchedule.js";
import type * as migrations from "../migrations.js";
import type * as postcards from "../postcards.js";
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
  diary: typeof diary;
  http: typeof http;
  "lib/chatAiBooking": typeof lib_chatAiBooking;
  "lib/chatAiShared": typeof lib_chatAiShared;
  "lib/chatAiTypes": typeof lib_chatAiTypes;
  "lib/runClubSchedule": typeof lib_runClubSchedule;
  migrations: typeof migrations;
  postcards: typeof postcards;
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
