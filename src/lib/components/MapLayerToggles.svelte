<script lang="ts">
	import type { MapLayers } from '$lib/types';

	let {
		activeLayers = $bindable({
			alertAreas: true,
			uaOblasts: true,
			borderPoints: true
		})
	}: {
		activeLayers: MapLayers;
	} = $props();

	let expanded = $state(false);

	function toggleExpanded() {
		expanded = !expanded;
	}

	const layers = [
		{ key: 'alertAreas' as const, label: 'Obszary alertu RCB', icon: '🟧' },
		{ key: 'uaOblasts' as const, label: 'Alarmy w zach. Ukrainie', icon: '🟥' },
		{ key: 'borderPoints' as const, label: 'Przejścia graniczne', icon: '📍' }
	];
</script>

<div class="rounded-lg border border-border bg-surface shadow-lg">
	{#if expanded}
		<div class="p-3">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-xs font-semibold text-ink">Warstwy</span>
				<button
					onclick={toggleExpanded}
					class="text-ink-muted hover:text-ink"
					aria-label="Zwiń warstwy"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
			<div class="space-y-2">
				{#each layers as layer}
					<label class="flex items-center gap-2 text-xs">
						<input
							type="checkbox"
							bind:checked={activeLayers[layer.key]}
							class="h-4 w-4 rounded border-border text-calm focus:ring-calm"
						/>
						<span>{layer.icon}</span>
						<span class="text-ink">{layer.label}</span>
					</label>
				{/each}
			</div>
			<div class="mt-3 border-t border-border pt-2">
				<p class="text-xs text-ink-muted">
					Zaznaczamy wyłącznie obszary wskazane w oficjalnych komunikatach. Bez śledzenia wojsk i
					bez zgadywania.
				</p>
			</div>
		</div>
	{:else}
		<button
			onclick={toggleExpanded}
			class="flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-bg"
			aria-label="Pokaż warstwy mapy"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
				/>
			</svg>
		</button>
	{/if}
</div>
