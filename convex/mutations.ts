import { mutation } from './_generated/server';
import { v } from 'convex/values';
import crypto from 'crypto';

// Store RCB komunikat as event if new
export const storeRcbKomunikat = mutation({
	args: {
		komunikat: v.object({
			id: v.string(),
			title: v.string(),
			url: v.string(),
			date: v.string(),
			type: v.union(v.literal('rcb_air'), v.literal('rcb_other')),
			body: v.optional(v.string())
		})
	},
	handler: async (ctx, args) => {
		const { komunikat } = args;

		// Check if we've already stored this komunikat
		const existing = await ctx.db
			.query('rcb_komunikaty')
			.withIndex('by_rcb_id', (q) => q.eq('rcb_id', komunikat.id))
			.first();

		if (existing) {
			return false; // Already stored
		}

		// Create content hash
		const contentHash = crypto
			.createHash('sha256')
			.update(komunikat.title + komunikat.url)
			.digest('hex')
			.substring(0, 16);

		// Store event
		const eventId = await ctx.db.insert('events', {
			type: komunikat.type,
			title: komunikat.title,
			body: komunikat.body,
			published_at: komunikat.date,
			ingested_at: new Date().toISOString(),
			source_name: 'RCB',
			source_url: komunikat.url,
			confidence: 'official',
			polish_airspace_violation: 'not_applicable', // RCB doesn't declare violations
			raw_content_hash: contentHash
		});

		// Track that we've seen this komunikat
		await ctx.db.insert('rcb_komunikaty', {
			rcb_id: komunikat.id,
			fetched_at: new Date().toISOString(),
			content_hash: contentHash,
			event_id: eventId
		});

		return true;
	}
});

// Update source fetch status
export const updateSourceStatus = mutation({
	args: {
		source_name: v.string(),
		status: v.union(v.literal('ok'), v.literal('error')),
		error_message: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('source_status')
			.withIndex('by_source', (q) => q.eq('source_name', args.source_name))
			.first();

		const now = new Date().toISOString();

		if (existing) {
			await ctx.db.patch(existing._id, {
				last_attempt: now,
				status: args.status,
				error_message: args.error_message,
				...(args.status === 'ok' && { last_successful_fetch: now })
			});
		} else {
			await ctx.db.insert('source_status', {
				source_name: args.source_name,
				last_attempt: now,
				last_successful_fetch: args.status === 'ok' ? now : now,
				status: args.status,
				error_message: args.error_message
			});
		}
	}
});
