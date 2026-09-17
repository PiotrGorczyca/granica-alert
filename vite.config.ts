import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	optimizeDeps: {
		// MapLibre ships its renderer's web worker as a separate module. Vite's dev
		// dependency pre-bundling rewrites it to a URL that then fails to load, and
		// because every GeoJSON source is processed in that worker, the boundary and
		// alert-area layers silently draw nothing - only the raster tiles and the DOM
		// markers survive. The production build inlines the worker and is unaffected.
		exclude: ['maplibre-gl']
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	]
});
