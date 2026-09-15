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
		no: 'Nie',
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
		return `${diffDays} dni temu`;
	}

	function getEventTypeColor(type: string): string {
		switch (type) {
			case 'rcb_air':
				return 'bg-orange-100 text-orange-800 border-orange-200';
			case 'dorsz_violation':
				return 'bg-red-100 text-red-800 border-red-200';
			case 'dorsz_ops':
				return 'bg-blue-100 text-blue-800 border-blue-200';
			case 'ua_raid_west':
				return 'bg-yellow-100 text-yellow-800 border-yellow-200';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	}
</script>

<svelte:head>
	<title>Granica Alert - Świadomość sytuacyjna wschodniej Polski</title>
	<meta
		name="description"
		content="Aktualna sytuacja powietrzna i komunikaty RCB dla wschodniej Polski"
	/>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto max-w-4xl px-4 py-4">
			<h1 class="text-2xl font-bold text-gray-900">Granica Alert</h1>
			<p class="mt-1 text-sm text-gray-600">Świadomość sytuacyjna wschodniej Polski</p>
		</div>
	</header>

	<main class="mx-auto max-w-4xl px-4 py-6">
		<!-- Situation Strip -->
		<section class="mb-6">
			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
				{#if data.status}
					<div class="space-y-3">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<h2 class="mb-1 text-lg font-semibold text-gray-900">
									{#if data.status.rcb_air_active}
										Aktywny alert RCB
									{:else}
										Brak aktywnego alertu powietrznego
									{/if}
								</h2>
								<p class="text-gray-700">
									{data.status.headline}
								</p>
							</div>
							{#if data.status.rcb_air_active}
								<span
									class="ml-4 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-800"
								>
									Aktywne
								</span>
							{:else}
								<span
									class="ml-4 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800"
								>
									Spokojnie
								</span>
							{/if}
						</div>

						{#if data.status.polish_airspace_violation === 'no' && data.status.rcb_air_active}
							<div
								class="flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-2"
							>
								<svg class="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
										clip-rule="evenodd"
									/>
								</svg>
								<span class="text-sm font-medium text-blue-900">
									Brak naruszenia polskiej przestrzeni powietrznej
								</span>
							</div>
						{/if}

						{#if data.status.primary_source_url}
							<div class="border-t border-gray-100 pt-2">
								<a
									href={data.status.primary_source_url}
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
								>
									Zobacz oficjalny komunikat
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
						{/if}

						<div class="border-t border-gray-100 pt-2 text-xs text-gray-500">
							Ostatnia aktualizacja: {formatTime(data.status.as_of)}
						</div>
					</div>
				{:else}
					<p class="text-gray-500">Ładowanie statusu...</p>
				{/if}
			</div>
		</section>

		<!-- Recent Events -->
		<section class="mb-6">
			<h2 class="mb-3 text-lg font-semibold text-gray-900">Ostatnie wydarzenia</h2>
			<div class="space-y-3">
				{#each data.events as event}
					<article
						class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
					>
						<div class="mb-2 flex items-start justify-between gap-3">
							<div class="flex-1">
								<div class="mb-1 flex items-center gap-2">
									<span
										class="inline-block rounded border px-2 py-1 text-xs font-medium {getEventTypeColor(
											event.type
										)}"
									>
										{eventTypeLabels[event.type] || event.type}
									</span>
									<span class="text-xs text-gray-500">
										{getTimeSince(event.published_at)}
									</span>
								</div>
								<h3 class="mb-1 font-medium text-gray-900">
									{event.title}
								</h3>
								{#if event.body}
									<p class="line-clamp-2 text-sm text-gray-700">
										{event.body}
									</p>
								{/if}
							</div>
						</div>

						<div class="flex items-center justify-between border-t border-gray-100 pt-2">
							<div class="flex items-center gap-4 text-xs text-gray-600">
								<span class="font-medium">{event.source_name}</span>
								{#if event.polish_airspace_violation}
									<span>Naruszenie RP: {violationLabels[event.polish_airspace_violation]}</span>
								{/if}
							</div>
							<a
								href={event.source_url}
								target="_blank"
								rel="noopener noreferrer"
								class="text-xs text-blue-600 hover:text-blue-800 hover:underline"
							>
								Źródło
							</a>
						</div>
					</article>
				{:else}
					<div class="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
						<p class="text-gray-500">Brak wydarzeń do wyświetlenia</p>
					</div>
				{/each}
			</div>
		</section>

		<!-- Disclaimer -->
		<section class="mb-6">
			<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
				<div class="flex gap-3">
					<svg
						class="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fill-rule="evenodd"
							d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
					<div class="text-sm text-yellow-900">
						<p class="mb-1 font-semibold">Ważne zastrzeżenie</p>
						<p>
							Granica Alert <strong>nie jest oficjalnym produktem rządowym</strong>. To niezależne
							narzędzie agregujące publicznie dostępne komunikaty. Zawsze sprawdzaj oficjalne źródła
							(RCB, DORSZ, MON) dla potwierdzenia informacji. System nie wykrywa zagrożeń -
							wyświetla tylko oficjalne komunikaty i ich kontekst.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Footer links -->
		<footer class="space-y-2 pb-8 text-center text-sm text-gray-600">
			<div class="flex justify-center gap-4">
				<a href="/sources" class="hover:text-gray-900 hover:underline">Źródła i zaufanie</a>
				<span class="text-gray-400">·</span>
				<a href="/map" class="hover:text-gray-900 hover:underline">Mapa</a>
				<span class="text-gray-400">·</span>
				<a href="/settings" class="hover:text-gray-900 hover:underline">Ustawienia</a>
			</div>
			<p class="text-xs text-gray-500">Dane ze źródeł: RCB (gov.pl)</p>
		</footer>
	</main>
</div>
