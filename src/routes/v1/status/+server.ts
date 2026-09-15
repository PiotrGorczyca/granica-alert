import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { convex, api } from '$lib/convex';

export const GET: RequestHandler = async () => {
	try {
		const status = await convex.query(api.queries.getStatus, {});
		return json(status);
	} catch (error) {
		console.error('Status endpoint error:', error);
		return json({ error: 'Failed to fetch status' }, { status: 500 });
	}
};
