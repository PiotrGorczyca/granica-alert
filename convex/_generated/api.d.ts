/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as alertsInUaPoller from '../alertsInUaPoller.js';
import type * as crons from '../crons.js';
import type * as mutations from '../mutations.js';
import type * as queries from '../queries.js';
import type * as rcbPoller from '../rcbPoller.js';

import type { ApiFromModules, FilterApi, FunctionReference } from 'convex/server';

declare const fullApi: ApiFromModules<{
	alertsInUaPoller: typeof alertsInUaPoller;
	crons: typeof crons;
	mutations: typeof mutations;
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
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, 'public'>>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, 'internal'>>;

export declare const components: {};
