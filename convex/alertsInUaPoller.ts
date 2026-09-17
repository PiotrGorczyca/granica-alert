import { action } from './_generated/server';
import { api } from './_generated/api';
import { activeWesternOblasts } from './lib/uaOblasts.ts';
import { USER_AGENT } from './lib/http.ts';

const ACTIVE_URL = 'https://api.alerts.in.ua/v1/alerts/active.json';

type PollResult = {
	success: boolean;
	skipped?: boolean;
	reason?: string;
	error?: string;
	active_oblasts?: string[];
	edge_detected?: boolean;
};

/**
 * Poll alerts.in.ua for air-raid alarms in the western oblasts.
 *
 * The API allows 30 requests per 10 minutes (it says so in the body of a 429),
 * so the cron runs at 30s - 20 calls per window, leaving headroom for a retry.
 */
export const pollAlertsInUa = action({
	args: {},
	handler: async (ctx): Promise<PollResult> => {
		const token = process.env.ALERTS_IN_UA_TOKEN;

		if (!token) {
			// Not an error - the source is simply not configured. Recorded as stale so
			// it shows up as unavailable rather than silently healthy.
			await ctx.runMutation(api.mutations.updateSourceStatus, {
				source_name: 'alerts_in_ua',
				status: 'stale',
				error_message: 'ALERTS_IN_UA_TOKEN not set on the Convex deployment'
			});
			return { success: true, skipped: true, reason: 'no_token' };
		}

		try {
			const response = await fetch(ACTIVE_URL, {
				headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT }
			});

			if (!response.ok) {
				// The rate-limit message arrives as a JSON body, not a header.
				const detail = (await response.text()).slice(0, 200);
				await ctx.runMutation(api.mutations.updateSourceStatus, {
					source_name: 'alerts_in_ua',
					status: 'error',
					error_message: `HTTP ${response.status}: ${detail}`
				});
				return { success: false, error: `HTTP ${response.status}` };
			}

			const payload = await response.json();
			const active = activeWesternOblasts(payload);

			const edgeDetected: boolean = await ctx.runMutation(api.mutations.updateUaRaidState, {
				active
			});

			await ctx.runMutation(api.mutations.updateSourceStatus, {
				source_name: 'alerts_in_ua',
				status: 'ok',
				items_seen: active.length
			});

			return {
				success: true,
				active_oblasts: active.map((o) => o.name_pl),
				edge_detected: edgeDetected
			};
		} catch (error) {
			console.error('alerts.in.ua poll error:', error);
			await ctx.runMutation(api.mutations.updateSourceStatus, {
				source_name: 'alerts_in_ua',
				status: 'error',
				error_message: String(error)
			});
			return { success: false, error: String(error) };
		}
	}
});
