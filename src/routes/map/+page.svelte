<script lang="ts">
</script>

<svelte:head>
	<title>Mapa - Granica Alert</title>
</svelte:head>

<div class="min-h-screen bg-bg">
	<header class="border-b border-border bg-surface">
		<div class="mx-auto max-w-4xl px-4 py-4">
			<h1 class="text-2xl font-bold text-ink">Mapa kontekstu</h1>
		</div>
	</header>

	<main class="mx-auto max-w-4xl px-4 py-6">
		<div class="mb-6 rounded-lg border border-info bg-info-bg p-6">
			<div class="flex gap-3">
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
				<div class="text-sm text-ink">
					<p class="mb-1 font-semibold">Mapa w przygotowaniu</p>
					<p class="text-ink-muted">
						Interaktywna mapa z oznaczeniem stref NOTAM (np. EP R134), punktów kontekstowych i
						lokalizacji potwierdzonych incydentów pojawi się w następnej wersji.
					</p>
				</div>
			</div>
		</div>

		<div class="rounded-lg border border-border bg-surface p-6 shadow-sm">
			<h2 class="mb-3 text-lg font-semibold text-ink">Planowane elementy mapy</h2>

			<div class="space-y-4 text-sm text-ink-muted">
				<div>
					<h3 class="font-medium text-ink">Warstwy statyczne</h3>
					<ul class="mt-2 ml-4 list-inside list-disc space-y-1">
						<li>Strefa EP R134 (przestrzeń zastrzeżona przy granicy wschodniej)</li>
						<li>Punkty kontekstowe: Dorohusk, Korytnica, przejścia graniczne</li>
						<li>Granice województw wschodnich (lubelskie, podkarpackie, podlaskie)</li>
						<li>Kaliningrad i korytarz suwalski (kontekst geograficzny)</li>
					</ul>
				</div>

				<div>
					<h3 class="font-medium text-ink">Pinezki incydentów</h3>
					<ul class="mt-2 ml-4 list-inside list-disc space-y-1">
						<li>Potwierdzone lokalizacje incydentów (np. Tarnawa 2026-07)</li>
						<li>Tylko wydarzenia zweryfikowane oficjalnie</li>
						<li>Bez śledzenia ruchu wojskowego w czasie rzeczywistym</li>
					</ul>
				</div>

				<div>
					<h3 class="font-medium text-ink">Opcjonalne</h3>
					<ul class="mt-2 ml-4 list-inside list-disc space-y-1">
						<li>Ruch lotniczy cywilny (OpenSky / ADS-B) - tylko dla kontekstu</li>
						<li>Domyślnie wyłączone</li>
						<li>Nie służy do wykrywania zagrożeń</li>
					</ul>
				</div>
			</div>
		</div>

		<div class="mt-6 rounded-lg border border-attention bg-attention-bg p-6">
			<p class="text-sm text-ink-muted">
				<strong class="text-ink">Przypomnienie:</strong> Mapa nie będzie pokazywać pozycji dronów bojowych,
				rakiet ani tajnych misji wojskowych. To narzędzie kontekstu geograficznego dla oficjalnych
				komunikatów.
			</p>
		</div>
	</main>
</div>
