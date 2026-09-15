<script lang="ts">
	import type { PageData } from '../../routes/$types';

	let { status, compact = false }: { status: PageData['status']; compact?: boolean } = $props();

	function formatTime(isoString: string) {
		const date = new Date(isoString);
		return new Intl.DateTimeFormat('pl-PL', {
			hour: '2-digit',
			minute: '2-digit',
			day: '2-digit',
			month: '2-digit'
		}).format(date);
	}
</script>

{#if status}
	<div
		class="rounded-lg border border-border bg-surface shadow-lg {compact
			? 'p-3'
			: 'p-4'} {status.rcb_air_active ? 'border-l-4 border-l-attention' : 'border-l-4 border-l-calm'}"
	>
		<div class="space-y-2">
			<div class="flex items-start justify-between gap-3">
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<div
							class="h-2.5 w-2.5 rounded-full {status.rcb_air_active ? 'bg-attention' : 'bg-calm'}"
						></div>
						<h3
							class="text-base font-semibold {status.rcb_air_active ? 'text-attention' : 'text-calm'}"
						>
							{#if status.rcb_air_active}
								Alert RCB aktywny
							{:else}
								Spokojnie
							{/if}
						</h3>
					</div>

					{#if !compact}
						<p class="mt-2 text-sm text-ink">
							{#if status.rcb_air_active}
								W związku z atakiem powietrznym na Ukrainę w polskiej przestrzeni operują
								polskie i sojusznicze statki powietrzne.
							{:else}
								Brak aktywnego alertu RCB powietrznego
							{/if}
						</p>
					{/if}
				</div>
			</div>

			{#if status.polish_airspace_violation === 'no' && status.rcb_air_active}
				<div class="flex items-center gap-2 rounded border border-info bg-info-bg px-2 py-1.5">
					<svg class="h-4 w-4 flex-shrink-0 text-info" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clip-rule="evenodd"
						/>
					</svg>
					<span class="text-xs text-ink">Naruszenie przestrzeni RP: nie dotyczy</span>
				</div>
			{/if}

			{#if status.sources_freshness.alerts_in_ua !== null}
				<div class="flex items-center gap-2 text-xs text-ink-muted">
					<span>UA Zachód:</span>
					{#if status.ua_west_raid_active}
						<span class="font-medium text-attention">Alarm</span>
					{:else}
						<span>Spokój</span>
					{/if}
				</div>
			{/if}

			<div class="border-t border-border pt-2">
				<div class="flex items-center justify-between">
					<span class="text-xs text-ink-muted">Aktualizacja: {formatTime(status.as_of)}</span>
					<a
						href="https://www.gov.pl/web/rcb/komunikaty"
						target="_blank"
						rel="noopener noreferrer"
						class="text-xs text-info hover:underline"
					>
						RCB ↗
					</a>
				</div>
			</div>
		</div>
	</div>
{/if}
