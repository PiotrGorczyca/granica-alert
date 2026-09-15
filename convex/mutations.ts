import { mutation } from './_generated/server';
import { v } from 'convex/values';

// Simple hash function for content deduplication (Web Crypto compatible)
async function simpleHash(text: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(text);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	return hashHex.substring(0, 16);
}

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

		// Create content hash using Web Crypto
		const contentHash = await simpleHash(komunikat.title + komunikat.url);

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

// Update UA raid state and detect edges (inactive → active)
// Returns true if edge was detected and event was created
export const updateUaRaidState = mutation({
	args: {
		active_oblasts: v.array(v.string())
	},
	handler: async (ctx, args) => {
		const now = new Date().toISOString();

		// Get current state (singleton table)
		const currentState = await ctx.db.query('ua_raid_state').first();

		const previousActive = currentState?.active_oblasts || [];
		const nowActive = args.active_oblasts;

		// Detect edge: was inactive (empty), now active (non-empty)
		const wasInactive = previousActive.length === 0;
		const nowActiveTransition = nowActive.length > 0;
		const edgeDetected = wasInactive && nowActiveTransition;

		// Update or create state
		if (currentState) {
			await ctx.db.patch(currentState._id, {
				active_oblasts: nowActive,
				updated_at: now,
				previous_active: previousActive
			});
		} else {
			await ctx.db.insert('ua_raid_state', {
				active_oblasts: nowActive,
				updated_at: now,
				previous_active: []
			});
		}

		// Create event only on edge: inactive → active
		if (edgeDetected) {
			console.log(`UA raid edge detected! Active oblasts: ${nowActive.join(', ')}`);

			await ctx.db.insert('events', {
				type: 'ua_raid_west',
				title: `Alert powietrzny w zachodniej Ukrainie: ${nowActive.join(', ')}`,
				body: `Aktywne alarmy w obwodach: ${nowActive.map(capitalizeFirst).join(', ')}. Może to skutkować operowaniem polskiego i sojuszniczego lotnictwa w polskiej przestrzeni powietrznej.`,
				published_at: now,
				ingested_at: now,
				source_name: 'alerts.in.ua',
				source_url: 'https://alerts.in.ua/',
				confidence: 'official',
				polish_airspace_violation: 'not_applicable',
				ua_oblasts: nowActive
			});
		}

		return edgeDetected;
	}
});

function capitalizeFirst(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export const storeNewsItem = mutation({
	args: {
		newsItem: v.object({
			external_id: v.string(),
			title: v.string(),
			url: v.string(),
			summary: v.optional(v.string()),
			published_at: v.string(),
			source_key: v.string(),
			source_name: v.string(),
			matched_keywords: v.array(v.string())
		})
	},
	handler: async (ctx, args) => {
		const { newsItem } = args;

		const existing = await ctx.db
			.query('news_items')
			.withIndex('by_external_id', (q) =>
				q.eq('source_key', newsItem.source_key).eq('external_id', newsItem.external_id)
			)
			.first();

		if (existing) {
			return false;
		}

		const contentHash = await simpleHash(newsItem.title + newsItem.url);

		const eventId = await ctx.db.insert('events', {
			type: 'news',
			title: newsItem.title,
			body: newsItem.summary,
			published_at: newsItem.published_at,
			ingested_at: new Date().toISOString(),
			source_name: newsItem.source_name,
			source_url: newsItem.url,
			confidence: 'single_outlet',
			polish_airspace_violation: 'not_applicable',
			raw_content_hash: contentHash
		});

		await ctx.db.insert('news_items', {
			external_id: newsItem.external_id,
			source_key: newsItem.source_key,
			url: newsItem.url,
			fetched_at: new Date().toISOString(),
			content_hash: contentHash,
			event_id: eventId
		});

		return true;
	}
});
