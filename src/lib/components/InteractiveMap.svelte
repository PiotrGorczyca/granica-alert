<script lang="ts">
	import { onMount } from 'svelte';
	import * as maplibregl from 'maplibre-gl';
	import type { MapMouseEvent } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import epR134 from '$lib/data/ep-r134.json';
	import borderPoints from '$lib/data/border-points.json';
	import type { PageData } from '../../routes/$types';

	let { 
		events = [],
		activeLayers = {
			epR134: true,
			borderPoints: true,
			events: true
		}
	}: {
		events?: PageData['events'];
		activeLayers?: {
			epR134: boolean;
			borderPoints: boolean;
			events: boolean;
		};
	} = $props();

	let mapContainer: HTMLDivElement;
	let map: maplibregl.Map;

	function eventsToGeoJSON(events: PageData['events']) {
		return {
			type: 'FeatureCollection',
			features: events
				.filter(e => e.type !== 'notam_zone')
				.map((event, idx) => ({
					type: 'Feature',
					properties: {
						id: idx,
						title: event.title,
						type: event.type,
						published_at: event.published_at,
						source_url: event.source_url,
						source_name: event.source_name,
						polish_airspace_violation: event.polish_airspace_violation || 'not_applicable'
					},
					geometry: {
						type: 'Point',
						coordinates: [23.7 + Math.random() * 0.6, 50.8 + Math.random() * 0.8]
					}
				}))
		};
	}

	onMount(() => {
		map = new maplibregl.Map({
			container: mapContainer,
			style: {
				version: 8,
				sources: {
					'osm-tiles': {
						type: 'raster',
						tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
						tileSize: 256,
						attribution:
							'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					}
				},
				layers: [
					{
						id: 'osm-tiles',
						type: 'raster',
						source: 'osm-tiles',
						minzoom: 0,
						maxzoom: 19
					}
				]
			},
			center: [23.5, 51.0],
			zoom: 7
		});

		map.addControl(new maplibregl.NavigationControl(), 'top-right');
		map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

		map.on('load', () => {
			map.addSource('ep-r134', {
				type: 'geojson',
				data: epR134 as any
			});

			map.addLayer({
				id: 'ep-r134-fill',
				type: 'fill',
				source: 'ep-r134',
				paint: {
					'fill-color': '#B86A1C',
					'fill-opacity': 0.2
				},
				layout: {
					visibility: activeLayers.epR134 ? 'visible' : 'none'
				}
			});

			map.addLayer({
				id: 'ep-r134-outline',
				type: 'line',
				source: 'ep-r134',
				paint: {
					'line-color': '#B86A1C',
					'line-width': 2,
					'line-dasharray': [2, 2]
				},
				layout: {
					visibility: activeLayers.epR134 ? 'visible' : 'none'
				}
			});

			map.addSource('border-points', {
				type: 'geojson',
				data: borderPoints as any
			});

			map.addLayer({
				id: 'border-points',
				type: 'circle',
				source: 'border-points',
				paint: {
					'circle-radius': 8,
					'circle-color': [
						'match',
						['get', 'type'],
						'border_crossing',
						'#3A5F7A',
						'context_area',
						'#5C6675',
						'#3A5F7A'
					],
					'circle-stroke-width': 2,
					'circle-stroke-color': '#ffffff'
				},
				layout: {
					visibility: activeLayers.borderPoints ? 'visible' : 'none'
				}
			});

			map.addLayer({
				id: 'border-points-labels',
				type: 'symbol',
				source: 'border-points',
				layout: {
					'text-field': ['get', 'name'],
					'text-font': ['Open Sans Regular'],
					'text-offset': [0, 1.5],
					'text-anchor': 'top',
					'text-size': 12,
					visibility: activeLayers.borderPoints ? 'visible' : 'none'
				},
				paint: {
					'text-color': '#1C2430',
					'text-halo-color': '#ffffff',
					'text-halo-width': 2
				}
			});

			// Add event pins
			const eventData = eventsToGeoJSON(events);
			map.addSource('event-pins', {
				type: 'geojson',
				data: eventData as any
			});

			map.addLayer({
				id: 'event-pins',
				type: 'circle',
				source: 'event-pins',
				paint: {
					'circle-radius': 6,
					'circle-color': [
						'match',
						['get', 'type'],
						'rcb_air',
						'#B86A1C',
						'dorsz_violation',
						'#A9483D',
						'incident',
						'#A9483D',
						'#3A5F7A'
					],
					'circle-stroke-width': 2,
					'circle-stroke-color': '#ffffff'
				},
				layout: {
					visibility: activeLayers.events ? 'visible' : 'none'
				}
			});

			map.on('click', 'border-points', (e: any) => {
				if (e.features && e.features.length > 0) {
					const feature = e.features[0];
					const coordinates = (feature.geometry as any).coordinates.slice();
					const { name, description } = feature.properties as {
						name: string;
						description: string;
					};

					new maplibregl.Popup()
						.setLngLat([coordinates[0], coordinates[1]])
						.setHTML(`<strong>${name}</strong><br>${description}`)
						.addTo(map);
				}
			});

			map.on('click', 'ep-r134-fill', (e: any) => {
				if (e.features && e.features.length > 0) {
					const feature = e.features[0];
					const { name, description } = feature.properties as {
						name: string;
						description: string;
					};

					new maplibregl.Popup()
						.setLngLat(e.lngLat)
						.setHTML(`<strong>${name}</strong><br>${description}`)
						.addTo(map);
				}
			});

			map.on('click', 'event-pins', (e: any) => {
				if (e.features && e.features.length > 0) {
					const feature = e.features[0];
					const props = feature.properties;
					
					const eventTypeLabels: Record<string, string> = {
						rcb_air: 'RCB powietrzny',
						rcb_other: 'RCB',
						dorsz_ops: 'DORSZ',
						dorsz_violation: 'DORSZ naruszenie',
						ua_raid_west: 'UA nalot',
						incident: 'Incydent',
						news: 'Wiadomości',
						osint: 'OSINT'
					};

					const violationLabels: Record<string, string> = {
						yes: 'Tak',
						no: 'Nie',
						unknown: 'Nieznane',
						not_applicable: 'N/A'
					};

					function getTimeSince(isoString: string) {
						const now = Date.now();
						const then = new Date(isoString).getTime();
						const diffMinutes = Math.floor((now - then) / 60000);
						if (diffMinutes < 60) return `${diffMinutes} min temu`;
						const diffHours = Math.floor(diffMinutes / 60);
						if (diffHours < 24) return `${diffHours}h temu`;
						return `${Math.floor(diffHours / 24)} dni temu`;
					}

					const typeLabel = eventTypeLabels[props.type] || props.type;
					const timeSince = getTimeSince(props.published_at);
					const violationText = props.polish_airspace_violation !== 'not_applicable' 
						? `<br><small>Naruszenie RP: ${violationLabels[props.polish_airspace_violation]}</small>`
						: '';

					new maplibregl.Popup()
						.setLngLat(e.lngLat)
						.setHTML(`
							<div style="min-width: 200px;">
								<div style="font-size: 11px; color: #5C6675; margin-bottom: 4px;">
									${typeLabel} · ${timeSince}
								</div>
								<strong style="font-size: 13px;">${props.title}</strong>
								${violationText}
								<div style="margin-top: 8px; font-size: 11px;">
									<a href="${props.source_url}" target="_blank" rel="noopener" style="color: #3A5F7A;">Źródło ↗</a>
								</div>
							</div>
						`)
						.addTo(map);
				}
			});

			map.on('mouseenter', 'border-points', () => {
				map.getCanvas().style.cursor = 'pointer';
			});

			map.on('mouseleave', 'border-points', () => {
				map.getCanvas().style.cursor = '';
			});

			map.on('mouseenter', 'ep-r134-fill', () => {
				map.getCanvas().style.cursor = 'pointer';
			});

			map.on('mouseleave', 'ep-r134-fill', () => {
				map.getCanvas().style.cursor = '';
			});

			map.on('mouseenter', 'event-pins', () => {
				map.getCanvas().style.cursor = 'pointer';
			});

			map.on('mouseleave', 'event-pins', () => {
				map.getCanvas().style.cursor = '';
			});
		});

		// Watch for layer visibility changes
		$effect(() => {
			if (map && map.isStyleLoaded()) {
				if (map.getLayer('ep-r134-fill')) {
					map.setLayoutProperty('ep-r134-fill', 'visibility', activeLayers.epR134 ? 'visible' : 'none');
					map.setLayoutProperty('ep-r134-outline', 'visibility', activeLayers.epR134 ? 'visible' : 'none');
				}
				if (map.getLayer('border-points')) {
					map.setLayoutProperty('border-points', 'visibility', activeLayers.borderPoints ? 'visible' : 'none');
					map.setLayoutProperty('border-points-labels', 'visibility', activeLayers.borderPoints ? 'visible' : 'none');
				}
				if (map.getLayer('event-pins')) {
					map.setLayoutProperty('event-pins', 'visibility', activeLayers.events ? 'visible' : 'none');
				}
			}
		});

		// Update event pins when events change
		$effect(() => {
			if (map && map.isStyleLoaded() && map.getSource('event-pins')) {
				const source = map.getSource('event-pins') as any;
				source.setData(eventsToGeoJSON(events) as any);
			}
		});

		return () => {
			map.remove();
		};
	});
</script>

<div bind:this={mapContainer} class="h-full w-full"></div>
