<script lang="ts">
</script>

<svelte:head>
	<title>Ustawienia - Granica Alert</title>
</svelte:head>

<div class="min-h-screen bg-bg">
	<header class="border-b border-border bg-surface">
		<div class="mx-auto max-w-4xl px-4 py-4">
			<h1 class="text-2xl font-bold text-ink">Ustawienia</h1>
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
					<p class="mb-1 font-semibold">Ustawienia w przygotowaniu</p>
					<p class="text-ink-muted">
						Powiadomienia push i preferencje użytkownika będą dostępne w następnej wersji aplikacji.
					</p>
				</div>
			</div>
		</div>

		<div class="mb-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
			<h2 class="mb-3 text-lg font-semibold text-ink">Planowane ustawienia powiadomień</h2>

			<div class="space-y-4">
				<div class="flex items-start justify-between border-b border-border py-3">
					<div>
						<h3 class="font-medium text-ink">Alerty RCB powietrzne</h3>
						<p class="mt-1 text-sm text-ink-muted">
							Powiadomienia o komunikatach RCB dotyczących nalotów i lotnictwa
						</p>
					</div>
					<div class="text-sm text-ink-muted">Wkrótce</div>
				</div>

				<div class="flex items-start justify-between border-b border-border py-3">
					<div>
						<h3 class="font-medium text-ink">Naruszenia przestrzeni powietrznej</h3>
						<p class="mt-1 text-sm text-ink-muted">Komunikaty DORSZ o potwierdzonych naruszeniach</p>
					</div>
					<div class="text-sm text-ink-muted">Wkrótce</div>
				</div>

				<div class="flex items-start justify-between border-b border-border py-3">
					<div>
						<h3 class="font-medium text-ink">Naloty na zachodnią Ukrainę</h3>
						<p class="mt-1 text-sm text-ink-muted">
							Alerty dla obwodów: wołyński, lwowski, rówieński
						</p>
					</div>
					<div class="text-sm text-ink-muted">Wkrótce</div>
				</div>

				<div class="flex items-start justify-between py-3">
					<div>
						<h3 class="font-medium text-ink">Wiadomości medialne</h3>
						<p class="mt-1 text-sm text-ink-muted">Doniesienia medialne (niezweryfikowane)</p>
					</div>
					<div class="text-sm text-ink-muted">Wkrótce</div>
				</div>
			</div>
		</div>

		<div class="mb-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
			<h2 class="mb-3 text-lg font-semibold text-ink">Planowane preferencje</h2>

			<div class="space-y-4 text-sm">
				<div>
					<h3 class="font-medium text-ink">Godziny ciszy</h3>
					<p class="mt-1 text-ink-muted">
						Wyłącz powiadomienia w określonych godzinach (np. 22:00 - 7:00)
					</p>
				</div>

				<div>
					<h3 class="font-medium text-ink">Język</h3>
					<p class="mt-1 text-ink-muted">Polski (domyślnie) / Angielski</p>
				</div>

				<div>
					<h3 class="font-medium text-ink">Skupienie regionalne</h3>
					<p class="mt-1 text-ink-muted">
						Priorytetyzuj wydarzenia z wybranego województwa (lubelskie, podkarpackie, podlaskie,
						wszystkie)
					</p>
				</div>
			</div>
		</div>

		<div class="mt-8 text-center text-sm text-ink-muted">
			<p class="text-ink">Granica Alert MVP v0.1</p>
			<p class="mt-1">Funkcje powiadomień zostaną włączone po publicznym uruchomieniu</p>
		</div>
	</main>
</div>
