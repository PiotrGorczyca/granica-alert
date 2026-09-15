<script lang="ts">
	import InteractiveMap from '$lib/components/InteractiveMap.svelte';
	import CompactStatusStrip from '$lib/components/CompactStatusStrip.svelte';
	import EventFeedPanel from '$lib/components/EventFeedPanel.svelte';
	import MapLayerToggles from '$lib/components/MapLayerToggles.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	
	let showFeed = $state(false);
	let activeLayers = $state({
		epR134: true,
		borderPoints: true,
		events: true
	});

	function toggleFeed() {
		showFeed = !showFeed;
	}
</script>

<svelte:head>
	<title>Granica Alert - Świadomość sytuacyjna wschodniej Polski</title>
	<meta
		name="description"
		content="Interaktywna mapa i aktualna sytuacja powietrzna dla wschodniej Polski"
	/>
</svelte:head>

<div class="relative h-[calc(100vh-4rem)] w-full overflow-hidden bg-bg">
	<!-- Full-bleed Map -->
	<div class="absolute inset-0">
		<InteractiveMap events={data.events} activeLayers={activeLayers} />
	</div>

	<!-- Overlay Layer -->
	<div class="pointer-events-none absolute inset-0">
		<!-- Compact Status Strip (Top) -->
		<div class="pointer-events-auto absolute left-4 right-4 top-4 md:left-6 md:right-auto md:max-w-md">
			<CompactStatusStrip status={data.status} />
		</div>

		<!-- Layer Toggles (Top Right) -->
		<div class="pointer-events-auto absolute right-4 top-4 md:right-6">
			<MapLayerToggles bind:activeLayers />
		</div>

		<!-- Feed Toggle Button (Desktop: right side, Mobile: bottom) -->
		<div class="pointer-events-auto absolute bottom-6 right-4 md:right-6 md:top-24">
			<button
				onclick={toggleFeed}
				class="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 shadow-lg transition-all hover:shadow-xl"
				aria-label={showFeed ? 'Ukryj wydarzenia' : 'Pokaż wydarzenia'}
			>
				<svg class="h-5 w-5 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16M4 18h16"
					/>
				</svg>
				<span class="hidden text-sm font-medium text-ink md:inline">Wydarzenia</span>
				{#if data.events.length > 0}
					<span class="flex h-5 w-5 items-center justify-center rounded-full bg-attention text-xs font-bold text-surface">
						{data.events.length}
					</span>
				{/if}
			</button>
		</div>

		<!-- Event Feed Panel (Sliding from right on desktop, bottom sheet on mobile) -->
		{#if showFeed}
			<div
				class="pointer-events-auto absolute inset-x-0 bottom-0 max-h-[60vh] overflow-hidden rounded-t-2xl border-t border-border bg-surface shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:w-96 md:max-h-none md:rounded-none md:rounded-l-2xl md:border-l md:border-t-0"
			>
				<EventFeedPanel 
					events={data.events} 
					status={data.status}
					onClose={toggleFeed}
				/>
			</div>
		{/if}
	</div>
</div>
