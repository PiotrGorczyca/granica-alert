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

		// For UA raids
		ua_oblasts: v.optional(v.array(v.string())),

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

	// Track RCB komunikaty we've seen to avoid duplicates
	rcb_komunikaty: defineTable({
		rcb_id: v.string(), // URL or unique identifier
		fetched_at: v.string(),
		content_hash: v.string(),
		event_id: v.optional(v.id('events'))
	}).index('by_rcb_id', ['rcb_id']),

	// System health / freshness tracking
	source_status: defineTable({
		source_name: v.string(),
		last_successful_fetch: v.string(),
		last_attempt: v.string(),
		status: v.union(v.literal('ok'), v.literal('error')),
		error_message: v.optional(v.string())
	}).index('by_source', ['source_name'])
});
