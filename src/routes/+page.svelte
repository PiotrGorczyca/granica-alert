<script lang="ts">
	import InteractiveMap from '$lib/components/InteractiveMap.svelte';
	import CompactStatusStrip from '$lib/components/CompactStatusStrip.svelte';
	import MapLayerToggles from '$lib/components/MapLayerToggles.svelte';
	import MapSidebar from '$lib/components/MapSidebar.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	
	let activeLayers = $state({
		epR134: true,
		borderPoints: true,
		events: true
	});

	let selectedEvent: typeof data.events[0] | null = $state(null);
	let sidebarCollapsed = $state(false);
</script>

<svelte:head>
	<title>Mapa - Granica Alert</title>
	<meta
		name="description"
		content="Interaktywna mapa i aktualna sytuacja powietrzna dla wschodniej Polski"
	/>
</svelte:head>

<!-- Mobile layout -->
<div class="flex h-[calc(100vh-4rem)] flex-col lg:hidden">
	<!-- Compact status strip above map -->
	<div class="flex-shrink-0 border-b border-border bg-surface p-2">
		<CompactStatusStrip status={data.status} />
	</div>

	<!-- Map with floating layer toggle -->
	<div class="relative flex-1">
		<InteractiveMap 
			events={data.events} 
			activeLayers={activeLayers}
			onEventClick={(event) => selectedEvent = event}
		/>
		
		<!-- Layer toggle (top-right) -->
		<div class="pointer-events-none absolute inset-0">
			<div class="pointer-events-auto absolute right-2 top-2">
				<MapLayerToggles bind:activeLayers />
			</div>
		</div>
	</div>
</div>

<!-- Desktop layout -->
<div class="hidden h-[calc(100vh-4rem)] lg:flex lg:flex-col">
	<!-- Top status bar (full width) -->
	<div class="flex-shrink-0 border-b border-border bg-surface px-6 py-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div
					class="h-3 w-3 rounded-full {data.status?.rcb_air_active ? 'bg-attention' : 'bg-calm'}"
				></div>
				<div>
					<span class="font-semibold text-ink {data.status?.rcb_air_active ? 'text-attention' : 'text-calm'}">
						{#if data.status?.rcb_air_active}
							Alert RCB aktywny
						{:else}
							Spokojnie
						{/if}
					</span>
					<span class="mx-2 text-ink-muted">·</span>
					<span class="text-sm text-ink-muted">
						{#if data.status?.rcb_air_active}
							Lotnictwo RP operuje
						{:else}
							Brak aktywnego alertu RCB powietrznego
						{/if}
					</span>
				</div>
			</div>
			<div class="flex items-center gap-4">
				{#if data.status}
					<span class="text-xs text-ink-muted">
						Aktualizacja: {new Intl.DateTimeFormat('pl-PL', {
							hour: '2-digit',
							minute: '2-digit'
						}).format(new Date(data.status.as_of))}
					</span>
				{/if}
				<a
					href="https://www.gov.pl/web/rcb/komunikaty"
					target="_blank"
					rel="noopener noreferrer"
					class="text-sm text-info hover:underline"
				>
					RCB ↗
				</a>
			</div>
		</div>
	</div>

	<!-- Main content: sidebar + map -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Left sidebar -->
		<div class="{sidebarCollapsed ? 'w-12' : 'w-64'} flex-shrink-0 border-r border-border bg-surface transition-all">
			<MapSidebar 
				bind:activeLayers
				selectedEvent={selectedEvent}
				collapsed={sidebarCollapsed}
				onToggleCollapse={() => sidebarCollapsed = !sidebarCollapsed}
			/>
		</div>

		<!-- Map (fills remaining space) -->
		<div class="relative flex-1">
			<InteractiveMap 
				events={data.events} 
				activeLayers={activeLayers}
				onEventClick={(event) => selectedEvent = event}
			/>
		</div>
	</div>
</div>
