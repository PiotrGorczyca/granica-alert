<script lang="ts">
	import type { PageData } from '../../routes/$types';

	let { status }: { status: PageData['status'] } = $props();

	function formatTime(isoString: string) {
		const date = new Date(isoString);
		return new Intl.DateTimeFormat('pl-PL', {
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}
</script>

{#if status}
	<div
		class="rounded-lg border-l-4 bg-surface/95 shadow-lg backdrop-blur-sm {status.rcb_air_active
			? 'border-l-attention'
			: 'border-l-calm'}"
	>
		<div class="px-4 py-3">
			<div class="flex items-center justify-between gap-3">
				<div class="flex flex-1 items-center gap-3">
					<div
						class="h-3 w-3 rounded-full {status.rcb_air_active ? 'bg-attention' : 'bg-calm'}"
					></div>
					<div class="flex-1">
						<h2
							class="text-base font-semibold {status.rcb_air_active ? 'text-attention' : 'text-calm'}"
						>
							{#if status.rcb_air_active}
								Alert RCB aktywny
							{:else}
								Spokojnie
							{/if}
						</h2>
						<p class="text-xs text-ink-muted">
							{#if status.rcb_air_active}
								Lotnictwo RP operuje
							{:else}
								Brak aktywnego alertu
							{/if}
						</p>
					</div>
				</div>

				<a
					href="https://www.gov.pl/web/rcb/komunikaty"
					target="_blank"
					rel="noopener noreferrer"
					class="flex-shrink-0 text-xs text-info hover:underline"
					aria-label="Zobacz oficjalne komunikaty RCB"
				>
					RCB ↗
				</a>
			</div>

			{#if status.polish_airspace_violation === 'no' && status.rcb_air_active}
				<div class="mt-2 flex items-center gap-2 rounded border border-info bg-info-bg px-2 py-1">
					<svg class="h-3 w-3 flex-shrink-0 text-info" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clip-rule="evenodd"
						/>
					</svg>
					<span class="text-xs text-ink">Naruszenie RP: nie dotyczy</span>
				</div>
			{/if}

			<div class="mt-2 flex items-center justify-between border-t border-border pt-2">
				<span class="text-xs text-ink-muted">Aktualizacja: {formatTime(status.as_of)}</span>
				{#if status.sources_freshness.alerts_in_ua !== null}
					<span class="text-xs text-ink-muted">
						UA: {status.ua_west_raid_active ? 'Alarm' : 'Spokój'}
					</span>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="rounded-lg border border-border bg-surface/95 px-4 py-3 shadow-lg backdrop-blur-sm">
		<p class="text-sm text-ink-muted">Ładowanie statusu...</p>
	</div>
{/if}
