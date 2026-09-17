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

/**
 * Store an RCB komunikat, keyed by its gov.pl URL.
 *
 * RCB publishes a date but no time of day. Rather than pretend to a precision the
 * source does not have, a komunikat gets a real timestamp only when both hold:
 * it is dated today, and we were polling continuously when it appeared
 * (`detectedPromptly`). Then our detection time is within minutes of publication
 * and is worth recording.
 *
 * Otherwise it keeps day precision. This matters because only a
 * 'detected' komunikat can drive the "alert in force" state: without the guard, a
 * backfill after an outage would stamp hours-old alerts with the current time and
 * light up the map for a threat that was over long ago.
 */
export const storeRcbKomunikat = mutation({
	args: {
		komunikat: v.object({
			url: v.string(),
			title: v.string(),
			date: v.string(),
			body: v.string(),
			type: v.union(v.literal('rcb_air'), v.literal('rcb_other')),
			cancelled: v.boolean(),
			areas: v.object({
				voivodeships: v.array(v.string()),
				powiats: v.array(v.object({ name: v.string(), voivodeship: v.string() })),
				unplaceablePowiats: v.array(v.string())
			}),
			/** True only if we were polling without a gap when this appeared. */
			detectedPromptly: v.boolean()
		})
	},
	handler: async (ctx, args) => {
		const { komunikat } = args;

		const existing = await ctx.db
			.query('rcb_komunikaty')
			.withIndex('by_rcb_id', (q) => q.eq('rcb_id', komunikat.url))
			.first();

		if (existing) return false;

		const now = new Date().toISOString();
		const timestampIsReal = komunikat.detectedPromptly && komunikat.date === warsawDate(new Date());
		const contentHash = await simpleHash(komunikat.title + komunikat.url);

		const eventId = await ctx.db.insert('events', {
			type: komunikat.type,
			title: komunikat.title,
			body: komunikat.body,
			published_at: timestampIsReal ? now : `${komunikat.date}T12:00:00.000Z`,
			published_date: komunikat.date,
			time_precision: timestampIsReal ? 'detected' : 'day',
			ingested_at: now,
			source_name: 'RCB',
			source_url: komunikat.url,
			confidence: 'official',
			// RCB reports threats and advice, never airspace-violation findings.
			polish_airspace_violation: 'not_applicable',
			cancelled: komunikat.cancelled,
			areas: komunikat.areas,
			raw_content_hash: contentHash
		});

		await ctx.db.insert('rcb_komunikaty', {
			rcb_id: komunikat.url,
			fetched_at: now,
			content_hash: contentHash,
			event_id: eventId
		});

		return true;
	}
});

/**
 * Apply an edit RCB made to a komunikat we already store.
 *
 * Only body, classification and areas can change - the URL, the date and our
 * detection time stay as first recorded, so an edit never rewrites history.
 */
export const updateRcbKomunikat = mutation({
	args: {
		eventId: v.id('events'),
		body: v.string(),
		type: v.union(v.literal('rcb_air'), v.literal('rcb_other')),
		cancelled: v.boolean(),
		areas: v.object({
			voivodeships: v.array(v.string()),
			powiats: v.array(v.object({ name: v.string(), voivodeship: v.string() })),
			unplaceablePowiats: v.array(v.string())
		})
	},
	handler: async (ctx, args) => {
		const event = await ctx.db.get(args.eventId);
		if (!event) return false;

		// Areas are compared too, not just the body: when the extractor improves,
		// komunikaty whose text never changed still need their scope recomputed.
		const bodyChanged = event.body !== args.body;
		const areasChanged = !sameAreas(event.areas, args.areas);
		const cancelledChanged = (event.cancelled ?? false) !== args.cancelled;
		if (!bodyChanged && !areasChanged && !cancelledChanged) return false;

		await ctx.db.patch(args.eventId, {
			body: args.body,
			type: args.type,
			cancelled: args.cancelled,
			areas: args.areas,
			raw_content_hash: await simpleHash(event.title + args.body)
		});

		return true;
	}
});

type StoredAreas = {
	voivodeships: string[];
	powiats: { name: string; voivodeship: string }[];
	unplaceablePowiats: string[];
};

export function sameAreas(a: StoredAreas | undefined, b: StoredAreas): boolean {
	if (!a) return false;
	const key = (x: StoredAreas) =>
		JSON.stringify([
			x.voivodeships,
			x.powiats.map((p) => [p.name, p.voivodeship]),
			x.unplaceablePowiats
		]);
	return key(a) === key(b);
}

/**
 * Note that we re-read a komunikat, and on what terms.
 *
 * Called for every re-read including the ones that changed nothing - a 304 still
 * has to move `last_refreshed_at`, or the komunikat stays permanently due and we
 * hammer gov.pl with the request we were trying to avoid.
 */
export const recordRcbRefresh = mutation({
	args: {
		sourceUrl: v.string(),
		etag: v.optional(v.string()),
		refreshedAt: v.string()
	},
	handler: async (ctx, args) => {
		const tracking = await ctx.db
			.query('rcb_komunikaty')
			.withIndex('by_rcb_id', (q) => q.eq('rcb_id', args.sourceUrl))
			.first();

		if (!tracking) return false;

		await ctx.db.patch(tracking._id, {
			last_refreshed_at: args.refreshedAt,
			// Keep the previous ETag when the response carried none.
			...(args.etag !== undefined && { etag: args.etag })
		});

		return true;
	}
});

/** Remember the listing page's ETag so the next poll can revalidate it. */
export const recordSourceEtag = mutation({
	args: { source_name: v.string(), etag: v.string() },
	handler: async (ctx, args) => {
		const status = await ctx.db
			.query('source_status')
			.withIndex('by_source', (q) => q.eq('source_name', args.source_name))
			.first();

		if (!status) return false;
		await ctx.db.patch(status._id, { etag: args.etag });
		return true;
	}
});

/**
 * Record whether a komunikat's source page still exists.
 *
 * gov.pl withdraws komunikaty - one of today's air alerts was published and then
 * removed within the hour, superseded by an updated one. We keep the text we
 * captured but stop presenting a dead link as the way to verify it.
 */
export const setRcbSourceAvailability = mutation({
	args: { eventId: v.id('events'), available: v.boolean() },
	handler: async (ctx, args) => {
		const event = await ctx.db.get(args.eventId);
		if (!event || event.source_available === args.available) return false;

		await ctx.db.patch(args.eventId, { source_available: args.available });
		return true;
	}
});

/** Calendar date in Poland, YYYY-MM-DD - which is the day RCB is dating by. */
function warsawDate(at: Date): string {
	try {
		return at.toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' });
	} catch {
		return at.toISOString().slice(0, 10);
	}
}

// Update source fetch status
export const updateSourceStatus = mutation({
	args: {
		source_name: v.string(),
		status: v.union(v.literal('ok'), v.literal('error'), v.literal('stale')),
		error_message: v.optional(v.string()),
		items_seen: v.optional(v.number())
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
				items_seen: args.items_seen,
				// Only a fetch that actually yielded data counts as successful, so a
				// source whose layout changed goes visibly stale instead of staying green.
				...(args.status === 'ok' && { last_successful_fetch: now })
			});
		} else {
			await ctx.db.insert('source_status', {
				source_name: args.source_name,
				last_attempt: now,
				// Never fetched successfully yet - say so rather than claiming now.
				last_successful_fetch: args.status === 'ok' ? now : '',
				status: args.status,
				error_message: args.error_message,
				items_seen: args.items_seen
			});
		}
	}
});

const oblastAlertValidator = v.object({
	uid: v.number(),
	iso: v.string(),
	name_uk: v.string(),
	name_pl: v.string(),
	scope: v.union(v.literal('full'), v.literal('partial')),
	borders_poland: v.boolean()
});

/**
 * Record which western oblasts are under air-raid alarm, and raise an event when
 * one that was clear goes active.
 *
 * The edge is per oblast rather than "was anything active": with the old
 * all-or-nothing edge, an alarm spreading from Rivne to Lviv - the one that
 * actually borders Poland - produced no event at all.
 */
export const updateUaRaidState = mutation({
	args: {
		active: v.array(oblastAlertValidator)
	},
	handler: async (ctx, args) => {
		const now = new Date().toISOString();
		const currentState = await ctx.db.query('ua_raid_state').first();

		const previous = currentState?.active ?? [];
		const previousUids = new Set(previous.map((o) => o.uid));
		const nowActive = args.active;
		const names = nowActive.map((o) => o.name_pl);

		const newlyActive = nowActive.filter((o) => !previousUids.has(o.uid));

		if (currentState) {
			await ctx.db.patch(currentState._id, {
				active: nowActive,
				active_oblasts: names,
				updated_at: now,
				previous_active: previous.map((o) => o.name_pl)
			});
		} else {
			await ctx.db.insert('ua_raid_state', {
				active: nowActive,
				active_oblasts: names,
				updated_at: now,
				previous_active: []
			});
		}

		if (newlyActive.length === 0) return false;

		const bordering = newlyActive.filter((o) => o.borders_poland);
		const headline = newlyActive
			.map((o) => (o.scope === 'full' ? o.name_pl : `${o.name_pl} (część)`))
			.join(', ');

		await ctx.db.insert('events', {
			type: 'ua_raid_west',
			title: `Alarm powietrzny w zachodniej Ukrainie: ${headline}`,
			body:
				`Alarm powietrzny ogłoszono w: ${headline}. ` +
				(bordering.length > 0
					? 'Obwód graniczy z Polską. '
					: 'Żaden z tych obwodów nie graniczy bezpośrednio z Polską. ') +
				'Alarm po stronie ukraińskiej bywa poprzedzeniem operowania polskiego i sojuszniczego ' +
				'lotnictwa w polskiej przestrzeni powietrznej, ale sam w sobie nie oznacza zagrożenia ' +
				'dla terytorium RP.',
			published_at: now,
			ingested_at: now,
			source_name: 'alerts.in.ua',
			source_url: 'https://alerts.in.ua/',
			confidence: 'official',
			polish_airspace_violation: 'not_applicable',
			ua_oblasts: newlyActive.map((o) => o.name_pl),
			ua_alert: { oblasts: newlyActive }
		});

		return true;
	}
});

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
