<script lang="ts">
	import InteractiveMap from '$lib/components/InteractiveMap.svelte';
	import MapLayerToggles from '$lib/components/MapLayerToggles.svelte';
	import MapSidebar from '$lib/components/MapSidebar.svelte';
	import SituationBanner from '$lib/components/SituationBanner.svelte';
	import AreaPicker from '$lib/components/AreaPicker.svelte';
	import { loadMyArea, saveMyArea, verdictFor } from '$lib/userArea';
	import type { MapLayers } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let activeLayers: MapLayers = $state({
		alertAreas: true,
		uaOblasts: true,
		borderPoints: true
	});

	let myArea = $state<string | null>(loadMyArea());
	$effect(() => saveMyArea(myArea));

	const areas = $derived(data.status?.active_areas ?? null);
	const oblasts = $derived(data.status?.ua_oblasts ?? []);
	const verdict = $derived(verdictFor(myArea, areas));
</script>

<svelte:head>
	<title>Granica Alert — sytuacja powietrzna wschodniej Polski</title>
	<meta
		name="description"
		content="Oficjalne komunikaty RCB i alarmy powietrzne w zachodniej Ukrainie, pokazane na mapie. Niezależne narzędzie obywatelskie."
	/>
</svelte:head>

{#if !data.status}
	<div class="border-b border-critical bg-critical-bg px-4 py-2 text-xs text-ink">
		Brak połączenia z serwerem danych — pokazywane informacje mogą być nieaktualne. Sprawdź
		bezpośrednio na
		<a href="https://www.gov.pl/web/rcb/komunikaty" class="underline">gov.pl/rcb</a>.
	</div>
{/if}

<!--
	One map instance, re-laid-out by breakpoint. Rendering a second copy inside a
	`lg:hidden` branch gives MapLibre a zero-size container it cannot recover from,
	and loads every tile twice.
-->
<div class="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
	<div
		class="flex-shrink-0 border-b border-border bg-surface lg:h-full lg:w-80 lg:overflow-y-auto lg:border-r lg:border-b-0"
	>
		<!-- Phone: just the answer, and the one question we need in return. -->
		<div class="p-2 lg:hidden">
			<SituationBanner
				state={data.status?.rcb_air_state ?? 'none'}
				dataFresh={data.status?.rcb_data_fresh ?? false}
				rcbAir={data.status?.rcb_air ?? null}
				windowMinutes={data.status?.rcb_air_window_minutes ?? 120}
				{verdict}
				{oblasts}
			/>
			{#if verdict.kind === 'unset'}
				<div class="mt-2 rounded border border-border p-2">
					<AreaPicker bind:myArea compact />
				</div>
			{/if}
		</div>

		<div class="hidden h-full lg:block">
			<MapSidebar
				bind:activeLayers
				bind:myArea
				status={data.status}
				{verdict}
				events={data.events}
			/>
		</div>
	</div>

	<div class="relative min-h-0 flex-1">
		<InteractiveMap {areas} {oblasts} {activeLayers} focusArea={myArea} />

		<!-- Top-left: MapLibre's own zoom control owns the top-right corner. -->
		<div class="pointer-events-none absolute inset-0 lg:hidden">
			<div class="pointer-events-auto absolute top-2 left-2">
				<MapLayerToggles bind:activeLayers />
			</div>
		</div>
	</div>
</div>
