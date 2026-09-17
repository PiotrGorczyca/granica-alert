import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { extractAreas, type AlertAreas } from './lib/adminAreas.ts';
import { isCancelled } from './lib/rcbParser.ts';
import { sameAreas } from './mutations';

/**
 * Remove the fabricated RCB komunikat that the old fixture fallback wrote into
 * the database.
 *
 * Until commit "fix: remove RCB fixture fallback", a failed scrape returned a
 * hard-coded invented alert ("Komunikat RCB: Nalot na terytorium Ukrainy -
 * operowanie polskiego lotnictwa") which was stored with source_name "RCB",
 * confidence "official" and a gov.pl URL. No such komunikat was ever published.
 *
 * Run once against each deployment:
 *   npx convex run maintenance:purgeFabricatedRcbEvents '{"dryRun": true}'
 *   npx convex run maintenance:purgeFabricatedRcbEvents '{"dryRun": false}'
 *
 * Identified by the exact fixture title and its pointer at the komunikaty index
 * page rather than a real komunikat URL, so a genuine alert cannot match.
 */
const FIXTURE_TITLE = 'Komunikat RCB: Nalot na terytorium Ukrainy - operowanie polskiego lotnictwa';
const FIXTURE_SOURCE_URL = 'https://www.gov.pl/web/rcb/komunikaty';
const FIXTURE_TRACKING_ID = 'fixture-rcb-air-1';

export const purgeFabricatedRcbEvents = internalMutation({
	args: { dryRun: v.boolean() },
	handler: async (ctx, args) => {
		const events = await ctx.db
			.query('events')
			.withIndex('by_type', (q) => q.eq('type', 'rcb_air'))
			.collect();

		const fabricated = events.filter(
			(event) => event.title === FIXTURE_TITLE && event.source_url === FIXTURE_SOURCE_URL
		);

		const tracking = await ctx.db
			.query('rcb_komunikaty')
			.withIndex('by_rcb_id', (q) => q.eq('rcb_id', FIXTURE_TRACKING_ID))
			.collect();

		if (!args.dryRun) {
			for (const event of fabricated) await ctx.db.delete(event._id);
			for (const row of tracking) await ctx.db.delete(row._id);
		}

		return {
			dryRun: args.dryRun,
			events_matched: fabricated.map((e) => ({
				id: e._id,
				title: e.title,
				published_at: e.published_at
			})),
			tracking_rows_matched: tracking.length,
			deleted: args.dryRun ? 0 : fabricated.length + tracking.length
		};
	}
});

/**
 * Recompute the administrative scope of every stored RCB komunikat from the text
 * we already hold.
 *
 * The extractor improves - it learned, for instance, that RCB writes both "woj."
 * and "woj:" - and komunikaty ingested before an improvement keep whatever scope
 * was extracted at the time. This re-reads them in place, with no network calls
 * and no change to any text, timestamp or URL.
 *
 *   npx convex run maintenance:reextractAreas '{"dryRun": true}'
 */
export const reextractAreas = internalMutation({
	args: { dryRun: v.boolean() },
	handler: async (ctx, args) => {
		const events = [
			...(await ctx.db
				.query('events')
				.withIndex('by_type', (q) => q.eq('type', 'rcb_air'))
				.collect()),
			...(await ctx.db
				.query('events')
				.withIndex('by_type', (q) => q.eq('type', 'rcb_other'))
				.collect())
		];

		const changes: { title: string; before: string[]; after: string[] }[] = [];

		for (const event of events) {
			const areas = extractAreas(`${event.title} ${event.body ?? ''}`);
			const cancelled = isCancelled(event.body ?? '');

			const areasSame = sameAreas(event.areas, areas);
			const cancelledSame = (event.cancelled ?? false) === cancelled;
			if (areasSame && cancelledSame) continue;

			changes.push({
				title: event.title,
				before: [...describe(event.areas), ...(event.cancelled ? ['ODWOŁANY'] : [])],
				after: [...describe(areas), ...(cancelled ? ['ODWOŁANY'] : [])]
			});

			if (!args.dryRun) await ctx.db.patch(event._id, { areas, cancelled });
		}

		return { dryRun: args.dryRun, examined: events.length, changed: changes.length, changes };
	}
});

function describe(areas: AlertAreas | undefined): string[] {
	if (!areas) return [];
	return [
		...areas.voivodeships,
		...areas.powiats.map((p) => p.name),
		...areas.unplaceablePowiats.map((p) => `${p} (?)`)
	];
}

/**
 * Downgrade backfilled komunikaty from 'detected' to 'day' precision.
 *
 * Every RCB komunikat currently stored arrived in a single backfill, because the
 * scraper had never worked before it was rewritten. Those komunikaty carry the
 * moment of the backfill as their publication time, which is wrong by hours and -
 * worse - lets an alert that was over before we ever saw it read as in force.
 *
 * A komunikat is a backfill if it was ingested well after the day it is dated, or
 * if several were ingested in the same instant, which only a bulk import does.
 * Going forward the poller's own continuity check prevents this, so this is a
 * one-off correction of existing rows.
 *
 *   npx convex run maintenance:downgradeBackfilledTimestamps '{"dryRun": true}'
 */
export const downgradeBackfilledTimestamps = internalMutation({
	args: { dryRun: v.boolean(), ingestedWithinSeconds: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const window = (args.ingestedWithinSeconds ?? 120) * 1000;

		const events = [
			...(await ctx.db
				.query('events')
				.withIndex('by_type', (q) => q.eq('type', 'rcb_air'))
				.collect()),
			...(await ctx.db
				.query('events')
				.withIndex('by_type', (q) => q.eq('type', 'rcb_other'))
				.collect())
		].filter((e) => e.time_precision === 'detected');

		// Group by ingest instant: a cluster means a bulk import, not live detection.
		const clustered = new Set<string>();
		for (const a of events) {
			for (const b of events) {
				if (a._id === b._id) continue;
				if (Math.abs(Date.parse(a.ingested_at) - Date.parse(b.ingested_at)) <= window) {
					clustered.add(a._id);
				}
			}
		}

		const changes: { title: string; from: string; to: string }[] = [];

		for (const event of events) {
			if (!clustered.has(event._id) || !event.published_date) continue;

			const corrected = `${event.published_date}T12:00:00.000Z`;
			changes.push({ title: event.title, from: event.published_at, to: corrected });

			if (!args.dryRun) {
				await ctx.db.patch(event._id, {
					published_at: corrected,
					time_precision: 'day'
				});
			}
		}

		return { dryRun: args.dryRun, examined: events.length, changed: changes.length, changes };
	}
});
