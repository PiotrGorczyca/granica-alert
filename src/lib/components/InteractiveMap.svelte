<script lang="ts">
	import { onMount } from 'svelte';
	import * as maplibregl from 'maplibre-gl';
	import type { MapMouseEvent } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import epR134 from '$lib/data/ep-r134.json';
	import borderPoints from '$lib/data/border-points.json';

	let mapContainer: HTMLDivElement;
	let map: maplibregl.Map;

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
					'text-size': 12
				},
				paint: {
					'text-color': '#1C2430',
					'text-halo-color': '#ffffff',
					'text-halo-width': 2
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
		});

		return () => {
			map.remove();
		};
	});
</script>

<div bind:this={mapContainer} class="h-full w-full"></div>
