import { action } from './_generated/server';
import { api } from './_generated/api';

interface AlertData {
	[key: string]: any;
}

interface PollResult {
	success: boolean;
	skipped?: boolean;
	reason?: string;
	error?: string;
	active_oblasts?: string[];
	edge_detected?: boolean;
}

// alerts.in.ua poller - tracks western Ukraine oblasts for edge detection
// Emits ua_raid_west event only on inactive → active transition
export const pollAlertsInUa = action({
	args: {},
	handler: async (ctx): Promise<PollResult> => {
		// Check for token - if missing, skip gracefully
		const token = process.env.ALERTS_IN_UA_TOKEN;

		if (!token) {
			console.log(
				'ALERTS_IN_UA_TOKEN not set - skipping alerts.in.ua poll. Set token in environment to enable.'
			);
			// Don't mark as error - just skip and keep freshness null
			return { success: true, skipped: true, reason: 'no_token' };
		}

		// Western oblasts to track (configurable)
		const westernOblasts = ['volyn', 'lviv', 'rivne', 'zakarpattia'];

		try {
			console.log('Polling alerts.in.ua for western oblasts...');

			// Fetch current alert status
			const response = await fetch('https://api.alerts.in.ua/v1/alerts/active.json', {
				headers: {
					Authorization: `Bearer ${token}`,
					'User-Agent': 'Granica Alert MVP/0.1 (civic air awareness)'
				}
			});

			if (!response.ok) {
				await ctx.runMutation(api.mutations.updateSourceStatus, {
					source_name: 'alerts_in_ua',
					status: 'error',
					error_message: `HTTP ${response.status}`
				});
				return { success: false, error: `HTTP ${response.status}` };
			}

			const data = (await response.json()) as AlertData;
			console.log('alerts.in.ua response:', JSON.stringify(data).substring(0, 200));

			// Parse active alerts - structure depends on API shape
			// Common format: array of oblast objects with alert status
			const activeWesternOblasts = parseActiveWesternOblasts(data, westernOblasts);

			console.log(
				`Active western oblasts: ${activeWesternOblasts.length > 0 ? activeWesternOblasts.join(', ') : 'none'}`
			);

			// Update state and detect edge
			const edgeDetected: boolean = await ctx.runMutation(api.mutations.updateUaRaidState, {
				active_oblasts: activeWesternOblasts
			});

			await ctx.runMutation(api.mutations.updateSourceStatus, {
				source_name: 'alerts_in_ua',
				status: 'ok'
			});

			return {
				success: true,
				active_oblasts: activeWesternOblasts,
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

// Parse alerts.in.ua response to extract active western oblasts
// The API typically returns oblast-keyed objects or arrays
function parseActiveWesternOblasts(data: AlertData, westernOblasts: string[]): string[] {
	const active: string[] = [];

	// Handle different API response formats
	// Format 1: Object with oblast keys and alert status
	if (typeof data === 'object' && !Array.isArray(data)) {
		for (const oblast of westernOblasts) {
			// Try various common field names
			const oblastData = data[oblast] || data[oblast.toLowerCase()] || data[capitalizeFirst(oblast)];

			if (oblastData) {
				// Check if alert is active - various possible structures
				const isActive =
					oblastData === true ||
					oblastData.active === true ||
					oblastData.alert === true ||
					oblastData.status === 'active' ||
					oblastData.type === 'air_raid' ||
					(Array.isArray(oblastData) && oblastData.length > 0);

				if (isActive) {
					active.push(oblast);
				}
			}
		}
	}

	// Format 2: Array of alert objects
	if (Array.isArray(data)) {
		for (const alert of data) {
			if (alert.oblast || alert.region || alert.name) {
				const oblastName = (alert.oblast || alert.region || alert.name).toLowerCase();

				// Check if this is one of our western oblasts
				for (const oblast of westernOblasts) {
					if (
						oblastName.includes(oblast) ||
						oblast.includes(oblastName) ||
						transliterationsMatch(oblastName, oblast)
					) {
						if (!active.includes(oblast)) {
							active.push(oblast);
						}
					}
				}
			}
		}
	}

	return active;
}

function capitalizeFirst(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

// Handle transliteration variations (e.g., Lviv vs Lvov, Zakarpattia vs Transcarpathia)
function transliterationsMatch(name1: string, name2: string): boolean {
	const variations: Record<string, string[]> = {
		zakarpattia: ['transcarpathia', 'transcarpathian', 'zakarpattya'],
		lviv: ['lvov', 'lwow'],
		volyn: ['volhynia', 'volyn'],
		rivne: ['rivno', 'rovno']
	};

	for (const [canonical, alts] of Object.entries(variations)) {
		if (name1 === canonical || alts.some((alt) => name1.includes(alt))) {
			if (name2 === canonical || alts.some((alt) => name2.includes(alt))) {
				return true;
			}
		}
	}

	return false;
}
