import { ConvexHttpClient } from 'convex/browser';

const convexUrl = import.meta.env.VITE_CONVEX_URL || '';

if (!convexUrl) {
	console.warn('VITE_CONVEX_URL not set - Convex client will not work');
}

export const convex = new ConvexHttpClient(convexUrl);

// Re-export api for convenience
// Generated files are committed to repo for production builds
export { api } from '../../convex/_generated/api.js';
