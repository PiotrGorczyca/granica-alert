<script lang="ts">
	import MapLayerToggles from './MapLayerToggles.svelte';
	import type { PageData } from '../../routes/$types';

	let { 
		activeLayers = $bindable({
			epR134: true,
			borderPoints: true,
			events: true
		}),
		selectedEvent = null,
		collapsed = false,
		onToggleCollapse
	}: {
		activeLayers: {
			epR134: boolean;
			borderPoints: boolean;
			events: boolean;
		};
		selectedEvent: PageData['events'][0] | null;
		collapsed: boolean;
		onToggleCollapse: () => void;
	} = $props();

	const eventTypeLabels: Record<string, string> = {
		rcb_air: 'RCB powietrzny',
		rcb_other: 'RCB',
		dorsz_ops: 'DORSZ',
		dorsz_violation: 'DORSZ naruszenie',
		ua_raid_west: 'UA nalot',
		notam_zone: 'NOTAM',
		incident: 'Incydent',
		news: 'Wiadomości',
		osint: 'OSINT'
	};

	const violationLabels: Record<string, string> = {
		yes: 'Tak',
		no: 'Nie',
		unknown: 'Nieznane',
		not_applicable: 'Nie dotyczy'
	};

	function getTimeSince(isoString: string) {
		const now = Date.now();
		const then = new Date(isoString).getTime();
		const diffMinutes = Math.floor((now - then) / 60000);

		if (diffMinutes < 1) return 'przed chwilą';
		if (diffMinutes < 60) return `${diffMinutes} min temu`;

		const diffHours = Math.floor(diffMinutes / 60);
		if (diffHours < 24) return `${diffHours}h temu`;

		const diffDays = Math.floor(diffHours / 24);
		return `${diffDays} dni temu`;
	}
</script>

{#if collapsed}
	<!-- Collapsed state: icon rail -->
	<div class="flex h-full flex-col items-center py-4">
		<button
			onclick={onToggleCollapse}
			class="mb-4 rounded p-2 text-ink-muted hover:bg-bg hover:text-ink"
			aria-label="Rozwiń panel"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</button>
		<div class="flex flex-col gap-2">
			<div class="rounded p-2 text-center text-xs text-ink-muted" title="Warstwy">
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
					/>
				</svg>
			</div>
		</div>
	</div>
{:else}
	<!-- Expanded state -->
	<div class="flex h-full flex-col">
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-border px-4 py-3">
			<h2 class="text-sm font-semibold text-ink">Panel mapy</h2>
			<button
				onclick={onToggleCollapse}
				class="rounded p-1 text-ink-muted hover:bg-bg hover:text-ink"
				aria-label="Zwiń panel"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
		</div>

		<!-- Scrollable content -->
		<div class="flex-1 overflow-y-auto">
			<!-- Layers section -->
			<div class="border-b border-border p-4">
				<h3 class="mb-3 text-xs font-semibold uppercase text-ink-muted">Warstwy</h3>
				<div class="space-y-2">
					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							bind:checked={activeLayers.epR134}
							class="h-4 w-4 rounded border-border text-calm focus:ring-calm"
						/>
						<span class="text-ink">🟨 Strefa EP R134</span>
					</label>
					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							bind:checked={activeLayers.events}
							class="h-4 w-4 rounded border-border text-calm focus:ring-calm"
						/>
						<span class="text-ink">⚡ Wydarzenia</span>
					</label>
					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							bind:checked={activeLayers.borderPoints}
							class="h-4 w-4 rounded border-border text-calm focus:ring-calm"
						/>
						<span class="text-ink">📍 Granica / kontekst</span>
					</label>
				</div>
				<div class="mt-3 border-t border-border pt-2">
					<p class="text-xs text-ink-muted">
						Tylko kontekst oficjalnych komunikatów — bez śledzenia wojsk.
					</p>
				</div>
			</div>

			<!-- Selected event section -->
			{#if selectedEvent}
				<div class="border-b border-border p-4">
					<h3 class="mb-3 text-xs font-semibold uppercase text-ink-muted">Wybrane wydarzenie</h3>
					<div class="space-y-2 rounded border border-border bg-bg p-3">
						<div class="flex items-start justify-between gap-2">
							<span class="inline-block rounded bg-info px-2 py-0.5 text-xs font-medium text-surface">
								{eventTypeLabels[selectedEvent.type] || selectedEvent.type}
							</span>
							<span class="text-xs text-ink-muted">
								{getTimeSince(selectedEvent.published_at)}
							</span>
						</div>
						<p class="text-sm font-medium text-ink">{selectedEvent.title}</p>
						{#if selectedEvent.polish_airspace_violation && selectedEvent.polish_airspace_violation !== 'not_applicable'}
							<div class="text-xs text-ink-muted">
								<span class="font-medium">Naruszenie RP:</span>
								{violationLabels[selectedEvent.polish_airspace_violation]}
							</div>
						{/if}
						<div class="flex items-center gap-2 border-t border-border pt-2">
							<a
								href={selectedEvent.source_url}
								target="_blank"
								rel="noopener noreferrer"
								class="text-xs text-info hover:underline"
							>
								Źródło ↗
							</a>
							<a href="/dom" class="text-xs text-info hover:underline">
								Szczegóły →
							</a>
						</div>
					</div>
				</div>
			{/if}

			<!-- Quick links -->
			<div class="p-4">
				<h3 class="mb-3 text-xs font-semibold uppercase text-ink-muted">Szybkie linki</h3>
				<div class="space-y-2 text-sm">
					<a href="/dom" class="block text-info hover:underline">
						Zobacz pełną listę →
					</a>
					<a
						href="https://www.gov.pl/web/rcb/komunikaty"
						target="_blank"
						rel="noopener noreferrer"
						class="block text-info hover:underline"
					>
						Oficjalne komunikaty RCB ↗
					</a>
				</div>
			</div>
		</div>
	</div>
{/if}
