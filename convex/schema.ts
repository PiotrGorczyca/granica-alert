import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
	events: defineTable({
		// Type classification (non-negotiable from spec)
		type: v.union(
			v.literal('rcb_air'),
			v.literal('rcb_other'),
			v.literal('dorsz_ops'),
			v.literal('dorsz_violation'),
			v.literal('ua_raid_west'),
			v.literal('notam_zone'),
			v.literal('incident'),
			v.literal('news'),
			v.literal('osint')
		),

		// Core fields
		title: v.string(),
		body: v.optional(v.string()),
		published_at: v.string(), // ISO 8601
		ingested_at: v.string(), // ISO 8601

		// Source information
		source_name: v.string(),
		source_url: v.string(),
		confidence: v.union(
			v.literal('official'),
			v.literal('multi_outlet'),
			v.literal('single_outlet'),
			v.literal('osint')
		),

		// Status fields
		polish_airspace_violation: v.optional(
			v.union(v.literal('yes'), v.literal('no'), v.literal('unknown'), v.literal('not_applicable'))
		),

		// Optional metadata
		raw_content_hash: v.optional(v.string()),
		related_event_ids: v.optional(v.array(v.id('events'))),

		// For UA raids: which western oblasts, and whether the whole oblast or part
		// of it is under alarm. Names are as alerts.in.ua gives them.
		ua_oblasts: v.optional(v.array(v.string())),
		ua_alert: v.optional(
			v.object({
				oblasts: v.array(
					v.object({
						uid: v.number(),
						iso: v.string(),
						name_uk: v.string(),
						name_pl: v.string(),
						scope: v.union(v.literal('full'), v.literal('partial')),
						borders_poland: v.boolean()
					})
				)
			})
		),

		// Administrative areas the issuer named, canonical and matching the bundled
		// boundary data. Absent means the source named none - never a guess.
		areas: v.optional(
			v.object({
				voivodeships: v.array(v.string()),
				powiats: v.array(v.object({ name: v.string(), voivodeship: v.string() })),
				unplaceablePowiats: v.array(v.string())
			})
		),

		// True once the issuer has published a stand-down inside the same komunikat.
		// A cancelled alert stays in the feed as history but stops being current.
		cancelled: v.optional(v.boolean()),

		// False once the source page has gone (gov.pl does withdraw komunikaty).
		// The text we already captured stays; the link must stop being offered as
		// verification, since it no longer verifies anything.
		source_available: v.optional(v.boolean()),

		// What the source actually stated about timing. RCB publishes a date with no
		// time of day, so 'day' means published_at carries our detection time and
		// only published_date is the source's own claim.
		published_date: v.optional(v.string()),
		time_precision: v.optional(v.union(v.literal('detected'), v.literal('day'))),

		// For geocoded events (no live tracking, static pins only)
		location: v.optional(
			v.object({
				name: v.string(),
				lat: v.number(),
				lon: v.number()
			})
		)
	})
		.index('by_published_at', ['published_at'])
		.index('by_type', ['type', 'published_at'])
		.index('by_ingested_at', ['ingested_at']),

	// Track RCB komunikaty we've seen to avoid duplicates, and how recently we
	// re-read each one. RCB edits komunikaty in place, so these drive the
	// conditional re-reads rather than refetching everything on every poll.
	rcb_komunikaty: defineTable({
		rcb_id: v.string(), // the gov.pl URL
		fetched_at: v.string(),
		content_hash: v.string(),
		event_id: v.optional(v.id('events')),
		/** Last ETag gov.pl gave us, sent back as If-None-Match. */
		etag: v.optional(v.string()),
		last_refreshed_at: v.optional(v.string())
	}).index('by_rcb_id', ['rcb_id']),

	// System health / freshness tracking
	source_status: defineTable({
		source_name: v.string(),
		last_successful_fetch: v.string(),
		last_attempt: v.string(),
		// 'stale' means the fetch succeeded but yielded nothing usable - almost
		// always a changed page layout. It must not read as healthy, or the app
		// shows a green light over a source that has gone silent.
		status: v.union(v.literal('ok'), v.literal('error'), v.literal('stale')),
		error_message: v.optional(v.string()),
		items_seen: v.optional(v.number()),
		/** ETag of the listing page, so an unchanged listing costs one 304. */
		etag: v.optional(v.string())
	}).index('by_source', ['source_name']),

	// Track UA western raid state for edge detection. Singleton row.
	ua_raid_state: defineTable({
		active_oblasts: v.array(v.string()),
		active: v.optional(
			v.array(
				v.object({
					uid: v.number(),
					iso: v.string(),
					name_uk: v.string(),
					name_pl: v.string(),
					scope: v.union(v.literal('full'), v.literal('partial')),
					borders_poland: v.boolean()
				})
			)
		),
		updated_at: v.string(),
		previous_active: v.optional(v.array(v.string()))
	}),

	// Track news RSS items we've seen to avoid duplicates
	news_items: defineTable({
		external_id: v.string(), // guid or URL hash
		source_key: v.string(), // e.g. "tvn24_najnowsze"
		url: v.string(),
		fetched_at: v.string(),
		content_hash: v.string(),
		event_id: v.optional(v.id('events'))
	}).index('by_external_id', ['source_key', 'external_id'])
});
