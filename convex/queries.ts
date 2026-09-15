import { query } from './_generated/server';
import { v } from 'convex/values';

// Get current status for situation strip
export const getStatus = query({
	args: {},
	handler: async (ctx) => {
		// Get most recent RCB air event
		const recentRcbAir = await ctx.db
			.query('events')
			.withIndex('by_type', (q) => q.eq('type', 'rcb_air'))
			.order('desc')
			.first();

		// Get source freshness
		const rcbStatus = await ctx.db
			.query('source_status')
			.withIndex('by_source', (q) => q.eq('source_name', 'rcb'))
			.first();

		const alertsInUaStatus = await ctx.db
			.query('source_status')
			.withIndex('by_source', (q) => q.eq('source_name', 'alerts_in_ua'))
			.first();

		// Check if there's a recent (< 2 hours) RCB air alert
		const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
		const rcbAirActive = recentRcbAir && recentRcbAir.published_at > twoHoursAgo;

		// Placeholder for UA raid status (will be implemented with alerts.in.ua integration)
		const uaWestRaidActive = false;
		const uaOblasts: string[] = [];

		return {
			as_of: new Date().toISOString(),
			rcb_air_active: rcbAirActive,
			headline: rcbAirActive && recentRcbAir ? recentRcbAir.title : 'No active RCB air alert',
			polish_airspace_violation: 'no', // Default conservative assumption
			violation_source: null,
			ua_west_raid_active: uaWestRaidActive,
			ua_oblasts: uaOblasts,
			primary_source_url: recentRcbAir?.source_url || null,
			sources_freshness: {
				rcb: rcbStatus?.last_successful_fetch || null,
				alerts_in_ua: alertsInUaStatus?.last_successful_fetch || null
			}
		};
	}
});

// Get events feed with filters
export const getEvents = query({
	args: {
		limit: v.optional(v.number()),
		type: v.optional(v.string()),
		since: v.optional(v.string()) // ISO date
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 20;

		let eventsQuery = ctx.db.query('events');

		// Apply type filter if provided
		if (args.type) {
			eventsQuery = eventsQuery.withIndex('by_type', (q) => q.eq('type', args.type as any));
		} else {
			eventsQuery = eventsQuery.withIndex('by_published_at');
		}

		let events = await eventsQuery.order('desc').take(limit * 2); // Get extra for filtering

		// Filter by since date if provided
		if (args.since) {
			events = events.filter((e) => e.published_at >= args.since!);
		}

		// Take only requested limit
		events = events.slice(0, limit);

		return events.map((event) => ({
			_id: event._id,
			type: event.type,
			title: event.title,
			body: event.body,
			published_at: event.published_at,
			source_name: event.source_name,
			source_url: event.source_url,
			confidence: event.confidence,
			polish_airspace_violation: event.polish_airspace_violation,
			location: event.location,
			ua_oblasts: event.ua_oblasts
		}));
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
		let relatedEvents = [];
		if (event.related_event_ids && event.related_event_ids.length > 0) {
			const related = await Promise.all(event.related_event_ids.map((id) => ctx.db.get(id)));
			relatedEvents = related.filter(Boolean);
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
						error_message: source.error_message
					};
					return acc;
				},
				{} as Record<string, any>
			)
		};
	}
});
