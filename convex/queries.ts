import { query } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { v } from 'convex/values';
import { isDueForRefresh, REFRESH_WINDOW_HOURS } from './lib/refreshSchedule.ts';
import { airStateOf, RCB_AIR_ACTIVE_MINUTES } from './lib/airState.ts';
import { isSourceFresh } from './lib/sourceHealth.ts';

// Current situation for the status strip and the map's shading.
export const getStatus = query({
	args: {},
	handler: async (ctx) => {
		const recentRcbAir = await ctx.db
			.query('events')
			.withIndex('by_type', (q) => q.eq('type', 'rcb_air'))
			.order('desc')
			.first();

		const rcbStatus = await ctx.db
			.query('source_status')
			.withIndex('by_source', (q) => q.eq('source_name', 'rcb'))
			.first();

		const alertsInUaStatus = await ctx.db
			.query('source_status')
			.withIndex('by_source', (q) => q.eq('source_name', 'alerts_in_ua'))
			.first();

		const airState = airStateOf(
			recentRcbAir
				? {
						publishedAt: recentRcbAir.published_at,
						timePrecision: recentRcbAir.time_precision,
						cancelled: recentRcbAir.cancelled ?? false
					}
				: null
		);

		const rcbAirRecent = airState === 'active';

		// Whether we are actually watching. "No alert" only means something when we
		// have been looking; if the poller is failing the app must say so instead of
		// reassuring people out of its own silence.
		const rcbDataFresh = isSourceFresh(rcbStatus?.status, rcbStatus?.last_successful_fetch);

		const uaRaidState = await ctx.db.query('ua_raid_state').first();
		const uaActive = uaRaidState?.active ?? [];

		return {
			as_of: new Date().toISOString(),

			// "Issued within the display window", not "confirmed ongoing".
			rcb_air_state: airState,
			rcb_data_fresh: rcbDataFresh,
			rcb_air_recent: rcbAirRecent,
			rcb_air_window_minutes: RCB_AIR_ACTIVE_MINUTES,
			rcb_air: recentRcbAir
				? {
						title: recentRcbAir.title,
						body: recentRcbAir.body ?? null,
						published_at: recentRcbAir.published_at,
						published_date: recentRcbAir.published_date ?? null,
						time_precision: recentRcbAir.time_precision ?? null,
						cancelled: recentRcbAir.cancelled ?? false,
						source_url: recentRcbAir.source_url,
						source_available: recentRcbAir.source_available ?? null,
						areas: recentRcbAir.areas ?? null
					}
				: null,

			// Areas to shade right now: only those of a currently-recent air alert.
			active_areas: rcbAirRecent ? (recentRcbAir?.areas ?? null) : null,

			ua_west_raid_active: uaActive.length > 0,
			ua_oblasts: uaActive,
			ua_borders_poland_active: uaActive.some((o) => o.borders_poland),

			sources_freshness: {
				rcb: rcbStatus?.last_successful_fetch || null,
				rcb_status: rcbStatus?.status ?? null,
				alerts_in_ua: alertsInUaStatus?.last_successful_fetch || null,
				alerts_in_ua_status: alertsInUaStatus?.status ?? null
			}
		};
	}
});

/**
 * Which of these komunikat URLs we have not stored yet.
 *
 * Lets the poller skip fetching detail pages for komunikaty it already has -
 * one query instead of one wasted gov.pl request per listing entry per run.
 */
export const filterUnseenRcbUrls = query({
	args: { urls: v.array(v.string()) },
	handler: async (ctx, args) => {
		const unseen: string[] = [];

		for (const url of args.urls) {
			const existing = await ctx.db
				.query('rcb_komunikaty')
				.withIndex('by_rcb_id', (q) => q.eq('rcb_id', url))
				.first();
			if (!existing) unseen.push(url);
		}

		return unseen;
	}
});

/**
 * Recent RCB komunikaty that are due for a re-read.
 *
 * RCB edits a komunikat after publishing it - prefixing "Aktualizacja!", and
 * often only then adding the "wysłany do odbiorców na terenie woj: ..." line
 * that says who it went to. So recent komunikaty are re-read for a while, on the
 * tapering schedule in lib/refreshSchedule: hard while they are fresh, rarely
 * once settled, never past the window. Each carries the ETag we last saw, so an
 * unchanged page costs a 304 rather than a download.
 */
export const getRcbEventsForRefresh = query({
	args: { limit: v.number() },
	handler: async (ctx, args) => {
		const since = new Date(Date.now() - REFRESH_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

		const recent = [
			...(await ctx.db
				.query('events')
				.withIndex('by_type', (q) => q.eq('type', 'rcb_air').gte('published_at', since))
				.collect()),
			...(await ctx.db
				.query('events')
				.withIndex('by_type', (q) => q.eq('type', 'rcb_other').gte('published_at', since))
				.collect())
		];

		const hasArea = (e: Doc<'events'>) =>
			Boolean(
				e.areas &&
				(e.areas.voivodeships.length > 0 ||
					e.areas.powiats.length > 0 ||
					e.areas.unplaceablePowiats.length > 0)
			);

		const due: {
			id: Doc<'events'>['_id'];
			title: string;
			source_url: string;
			body: string;
			etag: string | null;
		}[] = [];

		for (const event of recent) {
			const tracking = await ctx.db
				.query('rcb_komunikaty')
				.withIndex('by_rcb_id', (q) => q.eq('rcb_id', event.source_url))
				.first();

			const candidate = {
				publishedAt: event.published_at,
				lastRefreshedAt: tracking?.last_refreshed_at ?? null,
				hasArea: hasArea(event)
			};
			if (!isDueForRefresh(candidate)) continue;

			due.push({
				id: event._id,
				title: event.title,
				source_url: event.source_url,
				body: event.body ?? '',
				etag: tracking?.etag ?? null
			});
		}

		// Komunikaty still missing an area first: they are what we stand to gain
		// most by re-reading, and the budget may not cover everything due.
		return due
			.sort((a, b) => Number(Boolean(a.body)) - Number(Boolean(b.body)))
			.slice(0, args.limit);
	}
});

/**
 * What we know about a source from the previous poll.
 *
 * `last_successful_fetch` is what tells us whether we have been watching
 * continuously. A komunikat found after a gap in polling could have been
 * published at any point during that gap, so the moment we noticed it says
 * nothing useful about when it was issued.
 */
export const getSourceState = query({
	args: { source_name: v.string() },
	handler: async (ctx, args) => {
		const status = await ctx.db
			.query('source_status')
			.withIndex('by_source', (q) => q.eq('source_name', args.source_name))
			.first();

		return {
			etag: status?.etag ?? null,
			last_successful_fetch: status?.last_successful_fetch || null
		};
	}
});

/** The shape the UI consumes. Kept in one place so every list returns the same. */
function toFeedEvent(event: Doc<'events'>) {
	return {
		_id: event._id,
		type: event.type,
		title: event.title,
		body: event.body,
		published_at: event.published_at,
		published_date: event.published_date ?? null,
		time_precision: event.time_precision ?? null,
		source_name: event.source_name,
		source_url: event.source_url,
		confidence: event.confidence,
		polish_airspace_violation: event.polish_airspace_violation,
		cancelled: event.cancelled ?? false,
		areas: event.areas ?? null,
		// undefined means "never checked"; false means the source page is gone.
		source_available: event.source_available ?? null,
		location: event.location,
		ua_oblasts: event.ua_oblasts,
		ua_alert: event.ua_alert ?? null
	};
}

// Get events feed with filters
export const getEvents = query({
	args: {
		limit: v.optional(v.number()),
		type: v.optional(v.string()),
		since: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const limit = args.limit ?? 20;

		const events = args.type
			? await ctx.db
					.query('events')
					.withIndex('by_type', (q) => q.eq('type', args.type as Doc<'events'>['type']))
					.order('desc')
					.take(limit * 2)
			: await ctx.db
					.query('events')
					.withIndex('by_published_at')
					.order('desc')
					.take(limit * 2);

		const filtered = args.since ? events.filter((e) => e.published_at >= args.since!) : events;

		return filtered.slice(0, limit).map(toFeedEvent);
	}
});

// Get single event by ID
export const getEvent = query({
	args: {
		id: v.id('events')
	},
	handler: async (ctx, args) => {
		const event = await ctx.db.get(args.id);
		if (!event) return null;

		// Get related events if any
		const relatedEvents: unknown[] = [];
		if (event.related_event_ids && event.related_event_ids.length > 0) {
			const related = await Promise.all(event.related_event_ids.map((id) => ctx.db.get(id)));
			relatedEvents.push(...related.filter(Boolean));
		}

		return {
			...event,
			related_events: relatedEvents
		};
	}
});

// Health check - source freshness
export const getHealth = query({
	args: {},
	handler: async (ctx) => {
		const sources = await ctx.db.query('source_status').collect();

		return {
			timestamp: new Date().toISOString(),
			sources: sources.reduce(
				(acc, source) => {
					acc[source.source_name] = {
						status: source.status,
						last_successful_fetch: source.last_successful_fetch,
						last_attempt: source.last_attempt,
						error_message: source.error_message,
						items_seen: source.items_seen
					};
					return acc;
				},
				{} as Record<
					string,
					{
						status: 'ok' | 'error' | 'stale';
						last_successful_fetch: string;
						last_attempt: string;
						error_message?: string;
						items_seen?: number;
					}
				>
			)
		};
	}
});
