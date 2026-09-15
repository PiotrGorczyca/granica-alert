import type { LayoutLoad } from './$types';
import { convex, api } from '$lib/convex';

export const load: LayoutLoad = async () => {
	try {
		const [status, events] = await Promise.all([
			convex.query(api.queries.getStatus, {}),
			convex.query(api.queries.getEvents, { limit: 20 })
		]);
		return { status, events };
	} catch (error) {
		console.error('Failed to load data:', error);
		return { status: null, events: [] };
	}
};
