import { redirect } from '@sveltejs/kit';

/**
 * The map is the home page. /map stayed behind as a second, diverging copy of
 * it, so it now redirects instead of being maintained twice.
 */
export const load = () => {
	redirect(308, '/');
};
