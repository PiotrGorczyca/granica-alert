<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const eventTypeLabels: Record<string, string> = {
		rcb_air: 'RCB: Alert powietrzny',
		rcb_other: 'RCB: Komunikat',
		dorsz_ops: 'DORSZ: Operacja',
		dorsz_violation: 'DORSZ: Naruszenie',
		ua_raid_west: 'Nalot na zachodnią Ukrainę',
		notam_zone: 'Strefa NOTAM',
		incident: 'Incydent',
		news: 'Wiadomości',
		osint: 'OSINT'
	};

	const violationLabels: Record<string, string> = {
		yes: 'Tak',
		no: 'Nie dotyczy',
		unknown: 'Nieznane',
		not_applicable: 'Nie dotyczy'
	};

	function formatTime(isoString: string) {
		const date = new Date(isoString);
		return new Intl.DateTimeFormat('pl-PL', {
			hour: '2-digit',
			minute: '2-digit',
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		}).format(date);
	}

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

	function getEventState(event: (typeof data.events)[0]): 'active' | 'recent' {
		const now = Date.now();
		const published = new Date(event.published_at).getTime();
		const hoursSince = (now - published) / (1000 * 60 * 60);

		if (event.type === 'rcb_air' && data.status?.rcb_air_active) {
			return 'active';
		}

		return 'recent';
	}

	let activeEvents = $derived(data.events.filter((e) => getEventState(e) === 'active'));
	let recentEvents = $derived(data.events.filter((e) => getEventState(e) === 'recent'));
</script>

<svelte:head>
	<title>Dom - Granica Alert</title>
	<meta
		name="description"
		content="Status i pełna lista wydarzeń dla wschodniej Polski"
	/>
</svelte:head>

<div class="min-h-screen bg-bg">
	<header class="border-b border-border bg-surface">
		<div class="mx-auto max-w-4xl px-4 py-4">
			<h1 class="text-2xl font-bold text-ink">Dom</h1>
			<p class="mt-1 text-sm text-ink-muted">Status i lista wydarzeń</p>
		</div>
	</header>

	<main class="mx-auto max-w-4xl px-4 py-6">
		<!-- Status Strip (Hero) -->
		<section class="mb-6">
			<div
				class="rounded-lg border border-border p-6 shadow-sm {data.status?.rcb_air_active
					? 'bg-attention-bg'
					: 'bg-calm-bg'}"
			>
				{#if data.status}
					<div class="space-y-3">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<h2 class="mb-2 text-2xl font-semibold {data.status.rcb_air_active ? 'text-attention' : 'text-calm'}">
									{#if data.status.rcb_air_active}
										Alert RCB aktywny
									{:else}
										Spokojnie
									{/if}
								</h2>
								<p class="text-ink">
									{#if data.status.rcb_air_active}
										W związku z atakiem powietrznym na obiekty znajdujące się na terytorium
										Ukrainy istnieje prawdopodobieństwo, że w polskiej przestrzeni powietrznej
										operują polskie i sojusznicze statki powietrzne. Mogą być związane z tym
										zwiększone hałasy.
									{:else}
										Brak aktywnego alertu RCB powietrznego
									{/if}
								</p>
							</div>
						</div>

						{#if data.status.polish_airspace_violation === 'no' && data.status.rcb_air_active}
							<div class="flex items-center gap-2 rounded border border-info bg-info-bg px-3 py-2">
								<svg class="h-4 w-4 text-info" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
										clip-rule="evenodd"
									/>
								</svg>
								<span class="text-sm font-medium text-ink">
									Naruszenie przestrzeni RP: nie dotyczy
								</span>
							</div>
						{/if}

						<div class="border-t border-border pt-3">
							<a
								href="https://www.gov.pl/web/rcb/komunikaty"
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-1 text-sm text-info hover:underline"
							>
								Zobacz oficjalne komunikaty RCB
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
									/>
								</svg>
							</a>
						</div>

						<div class="border-t border-border pt-2 text-xs text-ink-muted">
							Ostatnia aktualizacja: {formatTime(data.status.as_of)}
						</div>
					</div>
				{:else}
					<p class="text-ink-muted">Ładowanie statusu...</p>
				{/if}
			</div>
		</section>

		<!-- Western Ukraine Correlator (quiet, secondary) -->
		{#if data.status}
			<section class="mb-6">
				<div class="rounded border border-border bg-info-bg px-4 py-3 text-sm">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="font-medium text-ink">Zachodnia Ukraina:</span>
							{#if data.status.sources_freshness.alerts_in_ua === null}
								<span class="text-ink-muted">Dane niedostępne</span>
							{:else if data.status.ua_west_raid_active}
								<span class="text-ink">
									Alarm w toku ({data.status.ua_oblasts.join(', ')})
								</span>
							{:else}
								<span class="text-ink-muted">Brak aktywnych alarmów</span>
							{/if}
						</div>
						{#if data.status.sources_freshness.alerts_in_ua === null}
							<a href="/sources" class="text-xs text-info hover:underline">szczegóły</a>
						{/if}
					</div>
				</div>
			</section>
		{/if}

		<!-- Active Events (only shown if there are active events) -->
		{#if activeEvents.length > 0}
			<section class="mb-6">
				<h2 class="mb-3 text-lg font-semibold text-ink">Teraz (aktywne)</h2>
				<div class="space-y-3">
					{#each activeEvents as event}
						<article
							class="rounded-lg border-2 border-attention bg-surface p-4 shadow-sm"
						>
							<div class="mb-2 flex items-start justify-between gap-3">
								<div class="flex-1">
									<div class="mb-2 flex items-center gap-2">
										<span
											class="inline-block rounded-full bg-attention px-3 py-1 text-xs font-medium text-surface"
										>
											{eventTypeLabels[event.type] || event.type}
										</span>
										<span
											class="inline-block rounded-full bg-attention px-3 py-1 text-xs font-medium text-surface"
										>
											aktywny
										</span>
										<span class="text-xs text-ink-muted">
											{getTimeSince(event.published_at)}
										</span>
									</div>
									<h3 class="mb-2 font-medium text-ink">
										{event.title}
									</h3>
									{#if event.body}
										<p class="text-sm text-ink-muted">
											{event.body}
										</p>
									{/if}
								</div>
							</div>

							<div
								class="flex items-center justify-between border-t border-border pt-3 text-xs"
							>
								<div class="flex items-center gap-4 text-ink-muted">
									<span class="font-medium">{event.source_name}</span>
									{#if event.polish_airspace_violation}
										<span
											>Naruszenie RP: {violationLabels[event.polish_airspace_violation]}</span
										>
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
		<section class="mb-6">
			<h2 class="mb-3 text-lg font-semibold text-ink">Ostatnie (zakończone)</h2>
			<div class="space-y-3">
				{#each recentEvents as event}
					<article class="rounded-lg border border-border bg-surface p-4 shadow-sm">
						<div class="mb-2 flex items-start justify-between gap-3">
							<div class="flex-1">
								<div class="mb-2 flex items-center gap-2">
									<span
										class="inline-block rounded border border-border bg-surface px-3 py-1 text-xs font-medium text-ink-muted"
									>
										{eventTypeLabels[event.type] || event.type}
									</span>
									<span
										class="inline-block rounded border border-border bg-surface px-3 py-1 text-xs font-medium text-ink-muted"
									>
										zakończony
									</span>
									<span class="text-xs text-ink-muted">
										{getTimeSince(event.published_at)}
									</span>
								</div>
								<h3 class="mb-2 font-medium text-ink">
									{event.title}
								</h3>
								{#if event.body}
									<p class="line-clamp-2 text-sm text-ink-muted">
										{event.body}
									</p>
								{/if}
							</div>
						</div>

						<div class="flex items-center justify-between border-t border-border pt-3 text-xs">
							<div class="flex items-center gap-4 text-ink-muted">
								<span class="font-medium">{event.source_name}</span>
								{#if event.polish_airspace_violation}
									<span>Naruszenie RP: {violationLabels[event.polish_airspace_violation]}</span>
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
					<div class="rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
						<p class="text-ink-muted">Brak zakończonych wydarzeń do wyświetlenia</p>
					</div>
				{/each}
			</div>
		</section>

		<!-- Soft Disclaimer -->
		<section class="mb-6">
			<div class="rounded border border-border bg-info-bg px-4 py-3">
				<div class="flex gap-3 text-sm">
					<svg
						class="mt-0.5 h-5 w-5 flex-shrink-0 text-info"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clip-rule="evenodd"
						/>
					</svg>
					<div class="text-ink-muted">
						<p>
							Granica Alert nie jest oficjalnym kanałem RCB. Zawsze sprawdzaj oficjalne źródła dla
							potwierdzenia.
							<a href="/sources" class="text-info hover:underline">Więcej o źródłach i zaufaniu →</a>
						</p>
					</div>
				</div>
			</div>
		</section>
	</main>
</div>
