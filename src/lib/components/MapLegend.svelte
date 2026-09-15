<script lang="ts">
	let isExpanded = $state(true);
</script>

<div class="rounded-lg border border-border bg-surface shadow-lg">
	<button
		onclick={() => (isExpanded = !isExpanded)}
		class="flex w-full items-center justify-between px-4 py-3 text-left"
	>
		<span class="text-sm font-semibold text-ink">Legenda mapy</span>
		<svg
			class="h-4 w-4 text-ink-muted transition-transform {isExpanded ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if isExpanded}
		<div class="border-t border-border px-4 py-3">
			<div class="space-y-3 text-sm">
				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<div class="h-4 w-4 border-2 border-dashed border-attention bg-attention opacity-20"></div>
						<span class="text-ink-muted">Strefa EP R134 (przestrzeń zastrzeżona)</span>
					</div>

					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full border-2 border-white bg-info"></div>
						<span class="text-ink-muted">Przejścia graniczne</span>
					</div>

					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full border-2 border-white bg-ink-muted"></div>
						<span class="text-ink-muted">Punkty kontekstowe</span>
					</div>
				</div>

				<div class="border-t border-border pt-3">
					<p class="mb-1 font-medium text-ink">Czego NIE pokazuje mapa:</p>
					<ul class="ml-4 list-inside list-disc space-y-1 text-ink-muted">
						<li>Pozycji dronów bojowych</li>
						<li>Tras rakiet lub pocisków</li>
						<li>Tajnych misji wojskowych</li>
						<li>Rzeczywistych lotów wojskowych</li>
					</ul>
				</div>

				<div class="border-t border-border pt-3">
					<p class="text-xs text-ink-muted">
						Mapa służy wyłącznie do kontekstu geograficznego oficjalnych komunikatów.
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>
