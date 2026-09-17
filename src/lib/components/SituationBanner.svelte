<script lang="ts">
	import type { AreaVerdict } from '$lib/userArea';
	import type { ActiveOblast, RcbAirState } from '$lib/types';

	let {
		state,
		dataFresh = true,
		rcbAir,
		verdict,
		oblasts = [],
		windowMinutes = 120
	}: {
		state: RcbAirState;
		/** False when the RCB poller is failing or has fallen behind. */
		dataFresh?: boolean;
		rcbAir: {
			title: string;
			published_at: string;
			published_date: string | null;
			time_precision: 'detected' | 'day' | null;
			cancelled: boolean;
			source_url: string;
			source_available: boolean | null;
		} | null;
		verdict: AreaVerdict;
		oblasts?: ActiveOblast[];
		windowMinutes?: number;
	} = $props();

	const bordering = $derived(oblasts.filter((o) => o.borders_poland));

	function timeAgo(iso: string): string {
		const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
		if (minutes < 1) return 'przed chwilą';
		if (minutes < 60) return `${minutes} min temu`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours} godz. temu`;
		return `${Math.floor(hours / 24)} dni temu`;
	}

	/**
	 * RCB states a date but no time of day, and we only record a clock time when
	 * we were watching continuously. "wykryto" says that time is ours; a
	 * day-precision komunikat is shown as a date, because that is all we know.
	 */
	const whenLabel = $derived(
		!rcbAir
			? ''
			: rcbAir.time_precision === 'detected'
				? `wykryto ${timeAgo(rcbAir.published_at)}`
				: `wg RCB ${rcbAir.published_date ?? new Date(rcbAir.published_at).toLocaleDateString('pl-PL')}`
	);
</script>

<div
	class="rounded-lg border p-3 {state === 'active'
		? 'border-attention bg-attention-bg'
		: !dataFresh
			? 'border-critical bg-critical-bg'
			: 'border-border bg-surface'}"
>
	<div class="flex items-start gap-3">
		<div
			class="mt-1 h-2.5 w-2.5 flex-none rounded-full {state === 'active'
				? 'bg-attention'
				: state === 'cancelled'
					? 'bg-calm'
					: 'bg-ink-muted'}"
		></div>

		<div class="min-w-0 flex-1">
			{#if state === 'active' && rcbAir}
				<p class="text-sm font-semibold text-ink">Alert RCB o zagrożeniu z powietrza</p>
				<p class="mt-0.5 text-xs text-ink-muted">{rcbAir.title} · {whenLabel}</p>
			{:else if state === 'cancelled' && rcbAir}
				<!-- The only all-clear we ever state, because RCB stated it. -->
				<p class="text-sm font-semibold text-ink">RCB odwołało zagrożenie</p>
				<p class="mt-0.5 text-xs text-ink-muted">{rcbAir.title} · {whenLabel}</p>
			{:else if state === 'no_confirmation' && rcbAir}
				<!--
					Not an all-clear. RCB does not publish a stand-down for every alert, so
					its silence tells us nothing and must not be shown as "all quiet".
				-->
				<p class="text-sm font-semibold text-ink">Brak potwierdzenia odwołania</p>
				<p class="mt-0.5 text-xs text-ink-muted">
					Ostatni alert powietrzny: {rcbAir.title} ({whenLabel}). RCB nie opublikowało odwołania —
					nie wiemy, czy zagrożenie minęło.
				</p>
			{:else if !dataFresh}
				<!-- Never report quiet we cannot vouch for. -->
				<p class="text-sm font-semibold text-ink">Brak danych z RCB</p>
				<p class="mt-0.5 text-xs text-ink-muted">
					Nie udało się pobrać komunikatów RCB. To nie znaczy, że nie ma alertu — sprawdź
					bezpośrednio u źródła.
				</p>
			{:else}
				<p class="text-sm font-semibold text-ink">Brak alertów powietrznych RCB</p>
				<p class="mt-0.5 text-xs text-ink-muted">
					W ostatnich godzinach RCB nie opublikowało alertu o zagrożeniu z powietrza.
				</p>
			{/if}

			{#if !dataFresh && state !== 'none'}
				<p class="mt-2 rounded border border-critical bg-critical-bg px-2 py-1 text-xs text-ink">
					Dane z RCB mogą być nieaktualne — ostatnie pobranie się nie powiodło.
				</p>
			{/if}

			<!-- The question a resident actually opens this for. -->
			{#if verdict.kind === 'alert'}
				<p class="mt-2 rounded bg-attention px-2 py-1 text-xs font-medium text-surface">
					{#if verdict.scope === 'powiat'}
						Dotyczy Twojego województwa — {verdict.powiats.join(', ')}
					{:else}
						Alert obejmuje woj. {verdict.area}
					{/if}
				</p>
			{:else if verdict.kind === 'clear' && state === 'active'}
				<p class="mt-2 text-xs text-calm">Alert nie obejmuje woj. {verdict.area}.</p>
			{/if}

			{#if bordering.length > 0}
				<p class="mt-2 text-xs text-ink-muted">
					Alarm powietrzny po stronie ukraińskiej: {bordering
						.map((o) => (o.scope === 'full' ? o.name_pl : `${o.name_pl} (część)`))
						.join(', ')}. Nie oznacza zagrożenia dla terytorium RP.
				</p>
			{/if}

			{#if rcbAir}
				<p class="mt-2 text-xs">
					{#if rcbAir.source_available === false}
						<span class="text-ink-muted">Źródło zostało usunięte z gov.pl</span>
					{:else}
						<a
							href={rcbAir.source_url}
							target="_blank"
							rel="noopener noreferrer"
							class="text-info hover:underline">Sprawdź w RCB ↗</a
						>
					{/if}
				</p>
			{/if}
		</div>
	</div>

	{#if state === 'active'}
		<p class="mt-2 border-t border-attention/30 pt-2 text-[11px] leading-snug text-ink-muted">
			RCB nie podaje godziny zakończenia alertu. Pokazujemy go przez {windowMinutes} min od wykrycia albo
			do momentu odwołania przez RCB.
		</p>
	{/if}
</div>
