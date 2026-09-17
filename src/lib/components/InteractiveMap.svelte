<script lang="ts">
	import { onMount } from 'svelte';
	import * as maplibregl from 'maplibre-gl';
	import type { GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl';
	import type { Feature, FeatureCollection } from 'geojson';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import wojewodztwa from '$lib/data/wojewodztwa.json';
	import uaOblasts from '$lib/data/ua-oblasts.json';
	import borderPoints from '$lib/data/border-points.json';
	import { MAP_COLORS, EASTERN_POLAND_BOUNDS } from '$lib/data/map-theme';
	import type { AlertAreas, ActiveOblast, MapLayers } from '$lib/types';

	let {
		areas = null,
		oblasts = [],
		activeLayers = { alertAreas: true, uaOblasts: true, borderPoints: true },
		focusArea = null
	}: {
		/** Areas under a current official alert. Null means nothing is in force. */
		areas?: AlertAreas | null;
		oblasts?: ActiveOblast[];
		activeLayers?: MapLayers;
		/** The user's own voivodeship, to centre on. */
		focusArea?: string | null;
	} = $props();

	let mapContainer: HTMLDivElement;
	let map: maplibregl.Map | undefined;
	let ready = $state(false);
	/** Powiat geometry is 359 KB, so it is only fetched when something needs it. */
	let powiatData: FeatureCollection | null = $state(null);

	const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };

	onMount(() => {
		const instance = new maplibregl.Map({
			container: mapContainer,
			style: {
				version: 8,
				sources: {
					osm: {
						type: 'raster',
						tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
						tileSize: 256,
						maxzoom: 19,
						attribution:
							'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · granice: GUGiK PRG, geoBoundaries (ODbL)'
					}
				},
				layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
			},
			bounds: EASTERN_POLAND_BOUNDS,
			fitBoundsOptions: { padding: 24 },
			// Nothing useful lies outside this frame for a border resident.
			maxBounds: [
				[13.0, 46.5],
				[32.0, 57.0]
			],
			minZoom: 4,
			attributionControl: { compact: true }
		});

		map = instance;
		instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
		instance.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

		instance.on('load', () => {
			addLayers(instance);
			addBorderMarkers(instance);
			ready = true;

			// Dev-only handle, so layer problems can be inspected from the console
			// (and by the browser checks) instead of guessed at from a screenshot.
			if (import.meta.env.DEV) {
				(window as unknown as { __granicaMap?: maplibregl.Map }).__granicaMap = instance;
			}
		});

		// MapLibre only watches the window, but this container is resized by the
		// layout too - the sidebar, and the breakpoint switch between the phone and
		// desktop arrangements. Without this the canvas keeps a stale size.
		const observer = new ResizeObserver(() => instance.resize());
		observer.observe(mapContainer);

		return () => {
			observer.disconnect();
			ready = false;
			map = undefined;
			instance.remove();
		};
	});

	function addLayers(m: maplibregl.Map) {
		// Voivodeship outlines: context, always visible, never implying an alert.
		m.addSource('woj', { type: 'geojson', data: wojewodztwa as FeatureCollection });
		m.addLayer({
			id: 'woj-line',
			type: 'line',
			source: 'woj',
			paint: { 'line-color': MAP_COLORS.boundary, 'line-width': 1, 'line-opacity': 0.55 }
		});

		// Areas actually named by a current alert. Empty until one is in force.
		m.addSource('alert-areas', { type: 'geojson', data: EMPTY });
		m.addLayer({
			id: 'alert-areas-fill',
			type: 'fill',
			source: 'alert-areas',
			paint: { 'fill-color': MAP_COLORS.attention, 'fill-opacity': 0.28 }
		});
		m.addLayer({
			id: 'alert-areas-line',
			type: 'line',
			source: 'alert-areas',
			paint: { 'line-color': MAP_COLORS.attention, 'line-width': 2 }
		});

		m.addSource('ua', { type: 'geojson', data: uaOblasts as FeatureCollection });
		m.addLayer({
			id: 'ua-line',
			type: 'line',
			source: 'ua',
			paint: {
				'line-color': MAP_COLORS.boundary,
				'line-width': 1,
				'line-opacity': 0.5,
				'line-dasharray': [3, 2]
			}
		});
		// Filled only for oblasts currently under alarm; `alarm` is set from the feed.
		m.addLayer({
			id: 'ua-fill',
			type: 'fill',
			source: 'ua',
			filter: ['in', ['get', 'alarm'], ['literal', ['full', 'partial']]],
			paint: {
				'fill-color': MAP_COLORS.uaAlarm,
				// A partial alarm covers part of the oblast, so it is drawn fainter
				// than a whole-oblast one rather than implying the same thing.
				'fill-opacity': ['case', ['==', ['get', 'alarm'], 'full'], 0.3, 0.15]
			}
		});

		m.on('click', 'alert-areas-fill', (e: MapLayerMouseEvent) => {
			const feature = e.features?.[0];
			if (!feature) return;
			new maplibregl.Popup({ closeButton: false })
				.setLngLat(e.lngLat)
				.setHTML(
					`<strong>${escapeHtml(String(feature.properties?.label ?? ''))}</strong><br>` +
						'<span style="color:#5c6675">Obszar objęty alertem RCB</span>'
				)
				.addTo(m);
		});

		m.on('click', 'ua-fill', (e: MapLayerMouseEvent) => {
			const feature = e.features?.[0];
			if (!feature) return;
			const scope = feature.properties?.alarm === 'full' ? 'cały obwód' : 'część obwodu';
			new maplibregl.Popup({ closeButton: false })
				.setLngLat(e.lngLat)
				.setHTML(
					`<strong>${escapeHtml(String(feature.properties?.name_pl ?? ''))}</strong><br>` +
						`<span style="color:#5c6675">Alarm powietrzny — ${scope}</span>`
				)
				.addTo(m);
		});

		for (const id of ['alert-areas-fill', 'ua-fill']) {
			m.on('mouseenter', id, () => (m.getCanvas().style.cursor = 'pointer'));
			m.on('mouseleave', id, () => (m.getCanvas().style.cursor = ''));
		}
	}

	/**
	 * Border crossings as DOM markers rather than a symbol layer.
	 *
	 * A symbol layer needs a glyph endpoint, which a raster-only style has no
	 * business depending on - the previous version asked for "Open Sans Regular"
	 * with no `glyphs` set, so every label silently failed to render. Markers keep
	 * the names visible with nothing external to fetch.
	 */
	function addBorderMarkers(m: maplibregl.Map) {
		for (const feature of (borderPoints as FeatureCollection).features) {
			if (feature.geometry.type !== 'Point') continue;
			const props = feature.properties ?? {};

			const el = document.createElement('div');
			el.className = 'border-marker';
			el.innerHTML =
				`<span class="border-marker__dot"></span>` +
				`<span class="border-marker__label">${escapeHtml(String(props.name ?? ''))}</span>`;

			new maplibregl.Marker({ element: el, anchor: 'left' })
				.setLngLat(feature.geometry.coordinates as [number, number])
				.setPopup(
					new maplibregl.Popup({ closeButton: false, offset: 12 }).setHTML(
						`<strong>${escapeHtml(String(props.name ?? ''))}</strong><br>` +
							`<span style="color:#5c6675">${escapeHtml(String(props.description ?? ''))}</span>`
					)
				)
				.addTo(m);
		}
	}

	/** Voivodeship or powiat polygons for the areas an alert names. */
	function areaFeatures(alertAreas: AlertAreas | null): FeatureCollection {
		if (!alertAreas) return EMPTY;

		// A powiat-scoped alert shades only those powiats: lighting up a whole
		// voivodeship for a one-powiat siren drill would be a false alarm.
		if (alertAreas.powiats.length > 0) {
			if (!powiatData) return EMPTY;
			const wanted = new Set(alertAreas.powiats.map((p) => `${p.name}|${p.voivodeship}`));
			return {
				type: 'FeatureCollection',
				features: powiatData.features
					.filter((f: Feature) => wanted.has(`${f.properties?.nazwa}|${f.properties?.wojewodztwo}`))
					.map((f: Feature) => ({
						...f,
						properties: { ...f.properties, label: f.properties?.nazwa }
					}))
			};
		}

		const wanted = new Set(alertAreas.voivodeships);
		return {
			type: 'FeatureCollection',
			features: (wojewodztwa as FeatureCollection).features
				.filter((f: Feature) => wanted.has(String(f.properties?.nazwa)))
				.map((f: Feature) => ({
					...f,
					properties: { ...f.properties, label: `woj. ${f.properties?.nazwa}` }
				}))
		};
	}

	function escapeHtml(value: string): string {
		return value.replace(
			/[&<>"']/g,
			(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c
		);
	}

	// Fetch powiat geometry only once an alert actually names a powiat.
	$effect(() => {
		if (!areas || areas.powiats.length === 0 || powiatData) return;
		let cancelled = false;
		import('$lib/data/powiaty.json').then((module) => {
			if (!cancelled) powiatData = module.default as unknown as FeatureCollection;
		});
		return () => {
			cancelled = true;
		};
	});

	// Shade the areas under alert. Reads `ready` so it re-runs once the style is
	// loaded - the previous version guarded on isStyleLoaded(), which was false on
	// the first run and so registered no dependency and never ran again.
	$effect(() => {
		if (!ready || !map) return;
		const source = map.getSource('alert-areas') as GeoJSONSource | undefined;
		source?.setData(areaFeatures(areas));
	});

	// Mark which oblasts are under alarm.
	$effect(() => {
		if (!ready || !map) return;
		const byIso = new Map(oblasts.map((o) => [o.iso, o.scope]));
		const source = map.getSource('ua') as GeoJSONSource | undefined;
		source?.setData({
			type: 'FeatureCollection',
			features: (uaOblasts as FeatureCollection).features.map((f: Feature) => ({
				...f,
				properties: {
					...f.properties,
					alarm: byIso.get(String(f.properties?.iso)) ?? 'none'
				}
			}))
		});
	});

	$effect(() => {
		if (!ready || !map) return;
		const visibility = (on: boolean) => (on ? 'visible' : 'none');
		for (const id of ['alert-areas-fill', 'alert-areas-line']) {
			map.setLayoutProperty(id, 'visibility', visibility(activeLayers.alertAreas));
		}
		for (const id of ['ua-fill', 'ua-line']) {
			map.setLayoutProperty(id, 'visibility', visibility(activeLayers.uaOblasts));
		}
		mapContainer
			.querySelectorAll<HTMLElement>('.border-marker')
			.forEach((el) => (el.style.display = activeLayers.borderPoints ? '' : 'none'));
	});

	// Centre on the user's own voivodeship when they have chosen one.
	$effect(() => {
		if (!ready || !map || !focusArea) return;
		const feature = (wojewodztwa as FeatureCollection).features.find(
			(f: Feature) => f.properties?.nazwa === focusArea
		);
		if (feature) map.fitBounds(bboxOf(feature), { padding: 48, duration: 600 });
	});

	function bboxOf(feature: Feature): [[number, number], [number, number]] {
		let minX = 180;
		let minY = 90;
		let maxX = -180;
		let maxY = -90;

		const visit = (coords: unknown): void => {
			if (Array.isArray(coords) && typeof coords[0] === 'number') {
				const [x, y] = coords as [number, number];
				minX = Math.min(minX, x);
				maxX = Math.max(maxX, x);
				minY = Math.min(minY, y);
				maxY = Math.max(maxY, y);
				return;
			}
			if (Array.isArray(coords)) coords.forEach(visit);
		};

		visit((feature.geometry as { coordinates: unknown }).coordinates);
		return [
			[minX, minY],
			[maxX, maxY]
		];
	}
</script>

<div bind:this={mapContainer} class="h-full w-full"></div>

<style>
	:global(.border-marker) {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		cursor: pointer;
	}

	:global(.border-marker__dot) {
		width: 0.55rem;
		height: 0.55rem;
		flex: none;
		border-radius: 9999px;
		background: #3a5f7a;
		box-shadow: 0 0 0 2px #fff;
	}

	:global(.border-marker__label) {
		font-size: 0.6875rem;
		line-height: 1;
		color: #1c2430;
		white-space: nowrap;
		text-shadow:
			0 0 2px #fff,
			0 0 3px #fff,
			0 0 4px #fff;
	}
</style>
