import type { LayoutLoad } from './$types';
import { browser } from '$app/environment';

export const load: LayoutLoad = async ({ fetch }) => {
	if (browser) {
		try {
			const response = await fetch('/v1/status');
			const status = await response.json();
			return { status };
		} catch (error) {
			console.error('Failed to load status:', error);
			return { status: null };
		}
	}
	return { status: null };
};
