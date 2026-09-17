<script lang="ts">
	import AreaPicker from './AreaPicker.svelte';
	import SituationBanner from './SituationBanner.svelte';
	import type { MapLayers } from '$lib/types';
	import type { AreaVerdict } from '$lib/userArea';
	import type { PageData } from '../../routes/$types';

	let {
		activeLayers = $bindable<MapLayers>({
			alertAreas: true,
			uaOblasts: true,
			borderPoints: true
		}),
		myArea = $bindable<string | null>(null),
		status,
		verdict,
		events = []
	}: {
		activeLayers: MapLayers;
		myArea: string | null;
		status: PageData['status'];
		verdict: AreaVerdict;
		events?: PageData['events'];
	} = $props();

	const layers = [
		{ key: 'alertAreas' as const, label: 'Obszary alertu RCB', swatch: 'bg-attention' },
		{ key: 'uaOblasts' as const, label: 'Alarmy w zach. Ukrainie', swatch: 'bg-critical' },
		{ key: 'borderPoints' as const, label: 'Przejścia graniczne', swatch: 'bg-info' }
	];

	/** Official communications only - news never appears on the map. */
	const officialEvents = $derived(
		events.filter(
			(e) => e.type === 'rcb_air' || e.type === 'rcb_other' || e.type === 'ua_raid_west'
		)
	);

	const typeLabels: Record<string, string> = {
		rcb_air: 'RCB · powietrze',
		rcb_other: 'RCB',
		ua_raid_west: 'Alarm UA'
	};

	function when(event: PageData['events'][number]): string {
		if (event.time_precision === 'day' && event.published_date) return event.published_date;
		return new Date(event.published_at).toLocaleString('pl-PL', {
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function areaSummary(event: PageData['events'][number]): string {
		const areas = event.areas;
		if (!areas) return '';
		if (areas.powiats.length > 0) return areas.powiats.map((p) => p.name).join(', ');
		if (areas.voivodeships.length > 0) return `woj. ${areas.voivodeships.join(', ')}`;
		if (areas.unplaceablePowiats.length > 0) return areas.unplaceablePowiats.join(', ');
		return '';
	}
</script>

<div class="flex h-full flex-col">
	<div class="border-b border-border p-4">
		<h1 class="text-sm font-semibold text-ink">Granica Alert</h1>
		<p class="mt-0.5 text-xs text-ink-muted">Świadomość sytuacyjna wschodniej Polski</p>
	</div>

	<div class="border-b border-border p-4">
		<SituationBanner
			state={status?.rcb_air_state ?? 'none'}
			dataFresh={status?.rcb_data_fresh ?? false}
			rcbAir={status?.rcb_air ?? null}
			windowMinutes={status?.rcb_air_window_minutes ?? 120}
			{verdict}
			oblasts={status?.ua_oblasts ?? []}
		/>
	</div>

	<div class="border-b border-border p-4">
		<AreaPicker bind:myArea />
	</div>

	<div class="border-b border-border p-4">
		<h2 class="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">Warstwy</h2>
		<div class="space-y-2">
			{#each layers as layer (layer.key)}
				<label class="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						bind:checked={activeLayers[layer.key]}
						class="h-4 w-4 rounded border-border text-calm focus:ring-calm"
					/>
					<span class="h-2.5 w-2.5 rounded-sm {layer.swatch}"></span>
					<span class="text-ink">{layer.label}</span>
				</label>
			{/each}
		</div>
		<p class="mt-3 border-t border-border pt-2 text-xs text-ink-muted">
			Zaznaczamy wyłącznie obszary wskazane w treści oficjalnych komunikatów.
		</p>
	</div>

	<div class="flex-1 overflow-y-auto p-4">
		<h2 class="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
			Komunikaty oficjalne
		</h2>

		{#if officialEvents.length === 0}
			<p class="text-xs text-ink-muted">Brak komunikatów w ostatnim czasie.</p>
		{:else}
			<ul class="space-y-3">
				{#each officialEvents as event (event._id)}
					<li class="border-b border-border pb-3 last:border-0">
						<div class="flex items-baseline justify-between gap-2">
							<span class="text-[11px] font-medium text-ink-muted">
								{typeLabels[event.type] ?? event.type}
							</span>
							<span class="text-[11px] text-ink-muted">{when(event)}</span>
						</div>
						<p class="mt-0.5 text-xs leading-snug text-ink">{event.title}</p>
						{#if areaSummary(event)}
							<p class="mt-0.5 text-[11px] text-ink-muted">{areaSummary(event)}</p>
						{/if}
						{#if event.cancelled}
							<span
								class="mt-1 inline-block rounded bg-calm-bg px-1.5 py-0.5 text-[11px] text-calm"
							>
								odwołany
							</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}

		<a href="/dom" class="mt-3 inline-block text-xs text-info hover:underline">
			Pełna lista, w tym media →
		</a>
	</div>

	<div class="border-t border-border p-3">
		<p class="text-[11px] leading-snug text-ink-muted">
			Nieoficjalne narzędzie obywatelskie. Nie jest produktem RCB ani MON. W razie zagrożenia kieruj
			się komunikatami służb.
		</p>
	</div>
</div>
