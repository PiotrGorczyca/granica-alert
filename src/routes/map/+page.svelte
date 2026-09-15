<script lang="ts">
	import InteractiveMap from '$lib/components/InteractiveMap.svelte';
	import MapLegend from '$lib/components/MapLegend.svelte';
	import StatusOverlay from '$lib/components/StatusOverlay.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Mapa - Granica Alert</title>
</svelte:head>

<div class="relative h-[calc(100vh-4rem)] w-full bg-bg">
	<div class="absolute inset-0">
		<InteractiveMap />
	</div>

	<div class="pointer-events-none absolute inset-0">
		<div class="pointer-events-auto absolute left-4 top-4 z-10 max-w-sm">
			<StatusOverlay status={data.status} />
		</div>

		<div class="pointer-events-auto absolute right-4 top-4 z-10 max-w-xs">
			<MapLegend />
		</div>

		<div class="pointer-events-auto absolute bottom-4 left-4 right-4 z-10 lg:left-auto lg:w-80">
			<div class="rounded-lg border border-border bg-surface p-4 shadow-lg">
				<h3 class="mb-2 text-sm font-semibold text-ink">O mapie</h3>
				<p class="text-xs text-ink-muted">
					Interaktywna mapa przedstawia kontekst geograficzny dla wschodniej Polski. Kliknij w
					punkty i strefy, aby zobaczyć więcej informacji.
				</p>
			</div>
		</div>
	</div>
</div>
