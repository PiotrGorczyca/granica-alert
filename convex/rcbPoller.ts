import { action } from './_generated/server';
import type { ActionCtx } from './_generated/server';
import { api } from './_generated/api';
import { parseListing, parseDetail, buildKomunikat } from './lib/rcbParser.ts';
import { USER_AGENT } from './lib/http.ts';

const LISTING_URL = 'https://www.gov.pl/web/rcb/komunikaty';

/**
 * Detail-page requests per run, shared between new komunikaty and re-reads.
 *
 * Most runs spend far less: gov.pl supports conditional requests, so re-reading
 * an unchanged komunikat is an empty 304, and lib/refreshSchedule keeps settled
 * komunikaty out of the queue entirely.
 */
const DETAIL_BUDGET = 8;

/**
 * How large a gap in polling still counts as "watching continuously".
 *
 * The cron runs every 5 minutes. Within this tolerance, the moment we first see
 * a komunikat is within minutes of RCB publishing it, and is worth recording as
 * a time. Past it - a first run, an outage, a redeploy - a komunikat we have just
 * found could have been published hours ago, so we fall back to the only thing
 * the source actually states: the date.
 */
const CONTINUOUS_POLL_TOLERANCE_MINUTES = 15;

/**
 * Annotated explicitly: the handler calls queries reached through `api`, whose
 * type includes this action, so inference would be circular.
 */
type RefreshCounts = { checked: number; refreshed: number; not_modified: number };

type PollResult =
	| ({ success: true; listing: 'not_modified' } & RefreshCounts)
	| ({ success: true; listing: 'fetched'; new_count: number; total_found: number } & RefreshCounts)
	| { success: false; error: string };

/**
 * Poll RCB komunikaty.
 *
 * There is deliberately no fixture fallback. If the page cannot be parsed the
 * source is marked stale and nothing is written - this app publishes official
 * communications, so inventing one to fill a gap would be the worst thing it
 * could do.
 */
export const pollRcb = action({
	args: {},
	handler: async (ctx): Promise<PollResult> => {
		try {
			const sourceState = await ctx.runQuery(api.queries.getSourceState, { source_name: 'rcb' });
			const detectedPromptly = isContinuous(sourceState.last_successful_fetch);

			const response = await fetch(LISTING_URL, {
				headers: {
					'User-Agent': USER_AGENT,
					...(sourceState.etag ? { 'If-None-Match': sourceState.etag } : {})
				}
			});

			// Listing unchanged since the last poll: nothing new to find, but the
			// komunikaty we already hold may still be due for a re-read.
			if (response.status === 304) {
				const refreshed = await refreshRecent(ctx, DETAIL_BUDGET);
				await ctx.runMutation(api.mutations.updateSourceStatus, {
					source_name: 'rcb',
					status: 'ok'
				});
				return { success: true, listing: 'not_modified' as const, ...refreshed };
			}

			if (!response.ok) {
				await ctx.runMutation(api.mutations.updateSourceStatus, {
					source_name: 'rcb',
					status: 'error',
					error_message: `HTTP ${response.status}`
				});
				return { success: false, error: `HTTP ${response.status}` };
			}

			const items = parseListing(await response.text());

			if (items.length === 0) {
				// The page loaded but we understood none of it - the layout changed.
				await ctx.runMutation(api.mutations.updateSourceStatus, {
					source_name: 'rcb',
					status: 'stale',
					error_message: 'Listing loaded but no komunikaty could be parsed (layout change?)',
					items_seen: 0
				});
				return { success: false, error: 'no_items_parsed' };
			}

			const unseen = new Set(
				await ctx.runQuery(api.queries.filterUnseenRcbUrls, {
					urls: items.map((item) => item.url)
				})
			);

			let stored = 0;
			let spent = 0;

			for (const item of items) {
				if (!unseen.has(item.url)) continue;

				// Only the detail page carries the scope sentence naming voivodeships,
				// so it is worth one extra request per genuinely new komunikat.
				let detailBody = '';
				let detailEtag: string | undefined;
				if (spent < DETAIL_BUDGET) {
					spent++;
					const detail = await fetchDetail(item.url);
					if (detail.status === 'ok') {
						detailBody = detail.body;
						detailEtag = detail.etag;
					}
				}

				const komunikat = buildKomunikat(item, detailBody);
				const didStore = await ctx.runMutation(api.mutations.storeRcbKomunikat, {
					komunikat: {
						url: komunikat.url,
						title: komunikat.title,
						date: komunikat.date,
						body: komunikat.body,
						type: komunikat.type,
						cancelled: komunikat.cancelled,
						areas: komunikat.areas,
						detectedPromptly
					}
				});

				if (didStore) {
					stored++;
					await ctx.runMutation(api.mutations.recordRcbRefresh, {
						sourceUrl: komunikat.url,
						etag: detailEtag,
						refreshedAt: new Date().toISOString()
					});
				}
			}

			const listingEtag = response.headers.get('etag');
			if (listingEtag) {
				await ctx.runMutation(api.mutations.recordSourceEtag, {
					source_name: 'rcb',
					etag: listingEtag
				});
			}

			const refreshed = await refreshRecent(ctx, DETAIL_BUDGET - spent);

			await ctx.runMutation(api.mutations.updateSourceStatus, {
				source_name: 'rcb',
				status: 'ok',
				items_seen: items.length
			});

			return {
				success: true,
				listing: 'fetched' as const,
				new_count: stored,
				total_found: items.length,
				...refreshed
			};
		} catch (error) {
			console.error('RCB poll error:', error);
			await ctx.runMutation(api.mutations.updateSourceStatus, {
				source_name: 'rcb',
				status: 'error',
				error_message: String(error)
			});
			return { success: false, error: String(error) };
		}
	}
});

/**
 * Re-read the komunikaty that are due, and apply any edits RCB has made.
 *
 * This is not a backfill. It is how the scope arrives at all for a good share of
 * alerts: RCB publishes the alert text first and appends the "wysłany do
 * odbiorców na terenie woj: ..." line minutes later, so the version we see on
 * first sight often names no area yet.
 */
async function refreshRecent(ctx: ActionCtx, budget: number): Promise<RefreshCounts> {
	const result: RefreshCounts = { checked: 0, refreshed: 0, not_modified: 0 };
	if (budget <= 0) return result;

	const candidates = await ctx.runQuery(api.queries.getRcbEventsForRefresh, { limit: budget });

	for (const candidate of candidates) {
		result.checked++;
		const detail = await fetchDetail(candidate.source_url, candidate.etag ?? undefined);
		const refreshedAt = new Date().toISOString();

		if (detail.status === 'error') continue;

		// Every remaining outcome moves last_refreshed_at. A withdrawn or unchanged
		// komunikat left permanently "due" would be retried on every poll, which is
		// precisely the request storm this schedule exists to prevent.
		await ctx.runMutation(api.mutations.recordRcbRefresh, {
			sourceUrl: candidate.source_url,
			etag: detail.status === 'gone' ? undefined : detail.etag,
			refreshedAt
		});

		if (detail.status === 'gone') {
			await ctx.runMutation(api.mutations.setRcbSourceAvailability, {
				eventId: candidate.id,
				available: false
			});
			continue;
		}

		if (detail.status === 'not_modified') {
			result.not_modified++;
			continue;
		}

		await ctx.runMutation(api.mutations.setRcbSourceAvailability, {
			eventId: candidate.id,
			available: true
		});

		if (detail.body === candidate.body) continue;

		const komunikat = buildKomunikat(
			{ url: candidate.source_url, title: candidate.title, date: '', intro: '' },
			detail.body
		);

		const didUpdate = await ctx.runMutation(api.mutations.updateRcbKomunikat, {
			eventId: candidate.id,
			body: detail.body,
			type: komunikat.type,
			cancelled: komunikat.cancelled,
			areas: komunikat.areas
		});
		if (didUpdate) result.refreshed++;
	}

	return result;
}

/**
 * Were we watching without a gap when this komunikat turned up?
 *
 * Never having fetched successfully counts as a gap: the first run sees the whole
 * listing at once, and none of it was published just then.
 */
function isContinuous(lastSuccessfulFetch: string | null): boolean {
	if (!lastSuccessfulFetch) return false;

	const gapMinutes = (Date.now() - Date.parse(lastSuccessfulFetch)) / 60_000;
	if (!Number.isFinite(gapMinutes) || gapMinutes < 0) return false;

	return gapMinutes <= CONTINUOUS_POLL_TOLERANCE_MINUTES;
}

type DetailResult =
	| { status: 'ok'; body: string; etag?: string }
	/** gov.pl confirmed the page is unchanged; no body was transferred. */
	| { status: 'not_modified'; etag?: string }
	/** gov.pl returned 404/410 - the komunikat has been withdrawn. */
	| { status: 'gone' }
	| { status: 'error' };

async function fetchDetail(url: string, etag?: string): Promise<DetailResult> {
	try {
		const response = await fetch(url, {
			headers: {
				'User-Agent': USER_AGENT,
				...(etag ? { 'If-None-Match': etag } : {})
			}
		});

		if (response.status === 304) return { status: 'not_modified', etag };
		if (response.status === 404 || response.status === 410) return { status: 'gone' };
		if (!response.ok) return { status: 'error' };

		const body = parseDetail(await response.text());
		if (!body) return { status: 'error' };

		return { status: 'ok', body, etag: response.headers.get('etag') ?? undefined };
	} catch (error) {
		// A failed detail fetch costs us the scope, not the komunikat itself.
		console.error(`RCB detail fetch failed for ${url}:`, error);
		return { status: 'error' };
	}
}
