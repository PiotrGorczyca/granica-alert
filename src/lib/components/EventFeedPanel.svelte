<script lang="ts">
	import type { PageData } from '../../routes/$types';

	let { 
		events, 
		status,
		onClose 
	}: { 
		events: PageData['events']; 
		status: PageData['status'];
		onClose: () => void;
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
		not_applicable: 'N/A'
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
		if (diffDays === 1) return '1 dzień temu';
		if (diffDays < 7) return `${diffDays} dni temu`;

		const diffWeeks = Math.floor(diffDays / 7);
		if (diffWeeks === 1) return '1 tydzień temu';
		return `${diffWeeks} tyg. temu`;
	}

	function getEventState(event: (typeof events)[0]): 'active' | 'recent' {
		if (event.type === 'rcb_air' && status?.rcb_air_active) {
			return 'active';
		}
		return 'recent';
	}

	let activeEvents = $derived(events.filter((e) => getEventState(e) === 'active'));
	let recentEvents = $derived(events.filter((e) => getEventState(e) === 'recent'));
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-border px-4 py-3">
		<h2 class="text-base font-semibold text-ink">Wydarzenia</h2>
		<button
			onclick={onClose}
			class="text-ink-muted hover:text-ink"
			aria-label="Zamknij panel wydarzeń"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<!-- Scrollable Content -->
	<div class="flex-1 overflow-y-auto">
		<div class="p-4 space-y-4">
			<!-- Active Events -->
			{#if activeEvents.length > 0}
				<section>
					<h3 class="mb-2 text-sm font-semibold text-ink">Teraz (aktywne)</h3>
					<div class="space-y-2">
						{#each activeEvents as event}
							<article
								class="rounded-lg border-2 border-attention bg-attention-bg p-3"
							>
								<div class="mb-2 flex items-start justify-between gap-2">
									<div class="flex-1 space-y-1">
										<div class="flex flex-wrap items-center gap-1">
											<span
												class="inline-block rounded bg-attention px-2 py-0.5 text-xs font-medium text-surface"
											>
												{eventTypeLabels[event.type] || event.type}
											</span>
											<span class="text-xs text-ink-muted">
												{getTimeSince(event.published_at)}
											</span>
										</div>
										<h4 class="text-sm font-medium text-ink leading-snug">
											{event.title}
										</h4>
									</div>
								</div>

								<div class="flex items-center justify-between text-xs">
									<div class="flex items-center gap-2 text-ink-muted">
										{#if event.polish_airspace_violation && event.polish_airspace_violation !== 'not_applicable'}
											<span>
												Naruszenie: {violationLabels[event.polish_airspace_violation]}
											</span>
										{/if}
									</div>
									<a
										href={event.source_url}
										target="_blank"
										rel="noopener noreferrer"
										class="text-info hover:underline"
									>
										Źródło ↗
									</a>
								</div>
							</article>
						{/each}
					</div>
				</section>
			{/if}

			<!-- Recent Events -->
			<section>
				<h3 class="mb-2 text-sm font-semibold text-ink">Ostatnie</h3>
				<div class="space-y-2">
					{#each recentEvents.slice(0, 10) as event}
						<article class="rounded-lg border border-border bg-surface p-3">
							<div class="mb-2 space-y-1">
								<div class="flex flex-wrap items-center gap-1">
									<span
										class="inline-block rounded border border-border bg-surface px-2 py-0.5 text-xs font-medium text-ink-muted"
									>
										{eventTypeLabels[event.type] || event.type}
									</span>
									<span class="text-xs text-ink-muted">
										{getTimeSince(event.published_at)}
									</span>
								</div>
								<h4 class="text-sm font-medium text-ink leading-snug">
									{event.title}
								</h4>
							</div>

							<div class="flex items-center justify-between text-xs">
								<div class="flex items-center gap-2 text-ink-muted">
									{#if event.polish_airspace_violation && event.polish_airspace_violation !== 'not_applicable'}
										<span>
											Naruszenie: {violationLabels[event.polish_airspace_violation]}
										</span>
									{/if}
								</div>
								<a
									href={event.source_url}
									target="_blank"
									rel="noopener noreferrer"
									class="text-info hover:underline"
								>
									Źródło ↗
								</a>
							</div>
						</article>
					{:else}
						<p class="py-8 text-center text-sm text-ink-muted">
							Brak ostatnich wydarzeń
						</p>
					{/each}
				</div>
			</section>
		</div>
	</div>

	<!-- Footer -->
	<div class="border-t border-border bg-info-bg px-4 py-3">
		<p class="text-xs text-ink-muted">
			<a href="/sources" class="text-info hover:underline">Więcej o źródłach →</a>
		</p>
	</div>
</div>
