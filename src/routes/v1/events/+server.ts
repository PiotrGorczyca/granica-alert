import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { convex, api } from '$lib/convex';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const type = url.searchParams.get('type') || undefined;
		const since = url.searchParams.get('since') || undefined;

		const events = await convex.query(api.queries.getEvents, {
			limit,
			type,
			since
		});

		return json(events);
	} catch (error) {
		console.error('Events endpoint error:', error);
		return json({ error: 'Failed to fetch events' }, { status: 500 });
	}
};
