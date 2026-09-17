<script lang="ts">
	import wojewodztwa from '$lib/data/wojewodztwa.json';

	let {
		myArea = $bindable<string | null>(null),
		compact = false
	}: {
		myArea: string | null;
		compact?: boolean;
	} = $props();

	// Eastern border voivodeships first - this app is for the people who live there.
	const BORDER_FIRST = ['podlaskie', 'lubelskie', 'podkarpackie', 'warmińsko-mazurskie'];

	const names = (wojewodztwa as { features: { properties: { nazwa: string } }[] }).features
		.map((f) => f.properties.nazwa)
		.sort((a, b) => {
			const ai = BORDER_FIRST.indexOf(a);
			const bi = BORDER_FIRST.indexOf(b);
			if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
			return a.localeCompare(b, 'pl');
		});

	const id = 'area-picker';
</script>

<div class={compact ? 'flex items-center gap-2' : 'space-y-2'}>
	<label for={id} class="block text-xs font-medium text-ink-muted">
		{compact ? 'Moje woj.' : 'Moje województwo'}
	</label>
	<select
		{id}
		bind:value={myArea}
		class="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-ink"
	>
		<option value={null}>— nie wybrano —</option>
		{#each names as name (name)}
			<option value={name}>{name}</option>
		{/each}
	</select>
	{#if !compact}
		<p class="text-xs text-ink-muted">
			Zapisywane tylko w tej przeglądarce. Nie pytamy o lokalizację i nic nie wysyłamy.
		</p>
	{/if}
</div>
