/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as alertsInUaPoller from "../alertsInUaPoller.js";
import type * as crons from "../crons.js";
import type * as lib_adminAreaNames from "../lib/adminAreaNames.js";
import type * as lib_adminAreas from "../lib/adminAreas.js";
import type * as lib_airState from "../lib/airState.js";
import type * as lib_html from "../lib/html.js";
import type * as lib_http from "../lib/http.js";
import type * as lib_rcbParser from "../lib/rcbParser.js";
import type * as lib_refreshSchedule from "../lib/refreshSchedule.js";
import type * as lib_sourceHealth from "../lib/sourceHealth.js";
import type * as lib_uaOblasts from "../lib/uaOblasts.js";
import type * as maintenance from "../maintenance.js";
import type * as mutations from "../mutations.js";
import type * as newsRssPoller from "../newsRssPoller.js";
import type * as queries from "../queries.js";
import type * as rcbPoller from "../rcbPoller.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  alertsInUaPoller: typeof alertsInUaPoller;
  crons: typeof crons;
  "lib/adminAreaNames": typeof lib_adminAreaNames;
  "lib/adminAreas": typeof lib_adminAreas;
  "lib/airState": typeof lib_airState;
  "lib/html": typeof lib_html;
  "lib/http": typeof lib_http;
  "lib/rcbParser": typeof lib_rcbParser;
  "lib/refreshSchedule": typeof lib_refreshSchedule;
  "lib/sourceHealth": typeof lib_sourceHealth;
  "lib/uaOblasts": typeof lib_uaOblasts;
  maintenance: typeof maintenance;
  mutations: typeof mutations;
  newsRssPoller: typeof newsRssPoller;
  queries: typeof queries;
  rcbPoller: typeof rcbPoller;
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

export declare const components: {};
