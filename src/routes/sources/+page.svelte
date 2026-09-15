<script lang="ts">
</script>

<svelte:head>
	<title>Źródła i zaufanie - Granica Alert</title>
</svelte:head>

<div class="min-h-screen bg-bg">
	<header class="border-b border-border bg-surface">
		<div class="mx-auto max-w-4xl px-4 py-4">
			<h1 class="text-2xl font-bold text-ink">Źródła i zaufanie</h1>
		</div>
	</header>

	<main class="mx-auto max-w-4xl px-4 py-6">
		<div class="prose prose-sm max-w-none">
			<section class="mb-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
				<h2 class="mb-3 text-lg font-semibold text-ink">Ważne zastrzeżenie</h2>
				<div class="space-y-3 text-sm text-ink-muted">
					<p>
						Granica Alert <strong class="text-ink">nie jest oficjalnym produktem rządowym</strong>.
						To niezależne narzędzie agregujące publicznie dostępne komunikaty. Zawsze sprawdzaj
						oficjalne źródła (RCB, DORSZ, MON) dla potwierdzenia informacji. System nie wykrywa
						zagrożeń - wyświetla tylko oficjalne komunikaty i ich kontekst.
					</p>
				</div>
			</section>

			<section class="mb-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
				<h2 class="mb-3 text-lg font-semibold text-ink">Oficjalne źródła</h2>
				<div class="space-y-4">
					<div>
						<h3 class="font-medium text-ink">RCB (Rządowe Centrum Bezpieczeństwa)</h3>
						<p class="mt-1 text-sm text-ink-muted">
							Główne źródło alertów powietrznych dla ludności cywilnej. Komunikaty SMS i publikacje
							na gov.pl.
						</p>
						<a
							href="https://www.gov.pl/web/rcb"
							target="_blank"
							rel="noopener noreferrer"
							class="mt-1 inline-block text-sm text-info hover:underline"
						>
							gov.pl/web/rcb ↗
						</a>
					</div>

					<div>
						<h3 class="font-medium text-ink">DORSZ (Dowództwo Operacyjne RSZ)</h3>
						<p class="mt-1 text-sm text-ink-muted">
							Potwierdza lub zaprzecza naruszeniom polskiej przestrzeni powietrznej. Komunikaty
							przez media społecznościowe i MON.
						</p>
					</div>

					<div>
						<h3 class="font-medium text-ink">MON (Ministerstwo Obrony Narodowej)</h3>
						<p class="mt-1 text-sm text-ink-muted">
							Oficjalne oświadczenia dotyczące bezpieczeństwa przestrzeni powietrznej Polski.
						</p>
					</div>
				</div>
			</section>

			<section class="mb-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
				<h2 class="mb-3 text-lg font-semibold text-ink">Co oznaczają komunikaty RCB</h2>

				<div class="space-y-3 text-sm text-ink-muted">
					<p class="text-ink">
						<strong>"Nalot na terytorium Ukrainy - operowanie polskiego lotnictwa"</strong> oznacza:
					</p>
					<ul class="ml-4 list-inside list-disc space-y-1">
						<li>Ukraina jest atakowana przez Rosję</li>
						<li>
							Polskie i sojusznicze myśliwce <strong class="text-ink"
								>prewencyjnie</strong
							> wznoszą się w powietrze
						</li>
						<li>To <strong class="text-ink">NIE oznacza</strong> ataku na Polskę</li>
						<li>
							To <strong class="text-ink">NIE oznacza</strong> automatycznie naruszenia naszej przestrzeni
							powietrznej
						</li>
					</ul>
				</div>
			</section>

			<section class="mb-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
				<h2 class="mb-3 text-lg font-semibold text-ink">Czego NIE pokazuje ta aplikacja</h2>

				<div class="space-y-2 text-sm text-ink-muted">
					<p class="text-ink">
						<strong>Granica Alert nie wykrywa zagrożeń.</strong> System nie ma dostępu do:
					</p>
					<ul class="ml-4 list-inside list-disc space-y-1">
						<li>Wojskowych radarów</li>
						<li>Klasyfikowanych tras lotów</li>
						<li>Rzeczywistego położenia dronów czy rakiet</li>
						<li>Danych wywiadowczych</li>
					</ul>
					<p class="mt-3 text-ink">
						Aplikacja <strong>agreguje i kontekstualizuje</strong> publicznie dostępne komunikaty oficjalne,
						aby pomóc zrozumieć co się dzieje, nie wymyśla "wskaźników zagrożenia".
					</p>
				</div>
			</section>

			<section class="mb-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
				<h2 class="mb-3 text-lg font-semibold text-ink">
					Dlaczego ADS-B ≠ wykrywanie zagrożeń
				</h2>

				<p class="text-sm text-ink-muted">
					ADS-B pokazuje samoloty cywilne i niektóre wojskowe, które <strong class="text-ink"
						>chcą być widziane</strong
					>. Drony bojowe i pociski manewrujące <strong class="text-ink">nie nadają ADS-B</strong
					>. Śledzenie ruchu lotniczego może pokazać "nietypowy wzór", ale nie potwierdza
					zagrożenia - do tego potrzebne są oficjalne komunikaty DORSZ lub RCB.
				</p>
			</section>

			<section class="rounded-lg border border-attention bg-attention-bg p-6">
				<h2 class="mb-3 text-lg font-semibold text-attention">
					OPSEC - Bezpieczeństwo operacyjne
				</h2>

				<p class="text-sm text-ink">
					<strong>Nie publikuj w czasie rzeczywistym:</strong>
				</p>
				<ul class="mt-2 ml-4 list-inside list-disc space-y-1 text-sm text-ink-muted">
					<li>Pozycji konkretnych samolotów wojskowych</li>
					<li>Numerów ogonowych polskich F-16</li>
					<li>Dokładnych lokalizacji patroli</li>
					<li>"Widziałem właśnie myśliwiec nad..."</li>
				</ul>
				<p class="mt-3 text-sm text-ink-muted">
					Takie informacje mogą pomóc przeciwnikowi. Zaufaj oficjalnym źródłom dla własnego
					bezpieczeństwa.
				</p>
			</section>

			<section class="mt-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
				<h2 class="mb-3 text-lg font-semibold text-ink">Zgłoś problem lub błąd</h2>
				<p class="text-sm text-ink-muted">
					Jeśli zauważysz błędną klasyfikację komunikatu lub problem techniczny, skontaktuj się
					poprzez:
				</p>
				<p class="mt-2 text-sm text-ink-muted">
					<a href="https://github.com" class="text-info hover:underline">GitHub Issues ↗</a>
				</p>
			</section>
		</div>
	</main>
</div>
