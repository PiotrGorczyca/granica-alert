import { decodeEntities, stripTags } from './html.ts';
import { extractAreas, type AlertAreas } from './adminAreas.ts';

export type RcbListItem = {
	/** Absolute gov.pl URL - also the dedup key. */
	url: string;
	title: string;
	/** Date as RCB states it, YYYY-MM-DD. RCB publishes no time of day. */
	date: string;
	intro: string;
};

export type RcbKomunikat = RcbListItem & {
	body: string;
	type: 'rcb_air' | 'rcb_other';
	/** RCB has published a stand-down for this threat in the same komunikat. */
	cancelled: boolean;
	areas: AlertAreas;
};

const BASE = 'https://www.gov.pl';

/**
 * Parse the komunikaty listing at /web/rcb/komunikaty.
 *
 * The page is a single <article> holding an <li> per komunikat, each with a
 * .date, a .title > a, and an .intro. Note the alert URLs are slugs like
 * /web/rcb/alert-rcb---zagrozenie-z-powietrza-1709 - they do not contain the
 * word "komunikat", so they cannot be found by matching on that.
 */
export function parseListing(html: string): RcbListItem[] {
	const items: RcbListItem[] = [];

	for (const block of html.split(/<li[\s>]/i).slice(1)) {
		const li = block.split(/<\/li>/i)[0];

		const link = li.match(
			/<div[^>]*class="[^"]*\btitle\b[^"]*"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i
		);
		if (!link) continue;

		const href = link[1];
		const title = stripTags(link[2]);
		if (!title) continue;

		const dateMatch = li.match(/<span[^>]*class="[^"]*\bdate\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
		const date = normaliseDate(dateMatch ? stripTags(dateMatch[1]) : '');
		if (!date) continue;

		const introMatch = li.match(/<div[^>]*class="[^"]*\bintro\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

		items.push({
			url: href.startsWith('http') ? href : `${BASE}${href}`,
			title,
			date,
			intro: introMatch ? stripTags(introMatch[1]) : ''
		});
	}

	return items;
}

/**
 * Pull the komunikat text out of a detail page.
 *
 * This is where the scope lives - RCB closes an alert with a sentence naming the
 * voivodeships or powiats it was sent to, which is the only geography the source
 * actually gives us.
 */
export function parseDetail(html: string): string {
	const start = html.search(/<div[^>]*class="[^"]*\beditor-content\b[^"]*"[^>]*>/i);
	if (start === -1) return '';

	const body = stripTags(html.slice(start));

	// The editor content is followed by a JSON blob and the site footer; cut there.
	const cutAt = [body.indexOf('{"register"'), body.indexOf('\nstopka')].filter((i) => i > 0);
	const end = cutAt.length > 0 ? Math.min(...cutAt) : body.length;

	return body.slice(0, end).trim();
}

/** "17.09.2026" or "2026-09-17" -> "2026-09-17"; anything else -> "". */
export function normaliseDate(raw: string): string {
	const text = decodeEntities(raw).trim();

	const dotted = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
	if (dotted) return `${dotted[3]}-${dotted[2]}-${dotted[1]}`;

	const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
	if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

	return '';
}

/**
 * Air-threat alert, or something else RCB published?
 *
 * Deliberately narrow: an alert counts as rcb_air only on RCB's own air-threat
 * wording. Siren drills and other exercises say so explicitly and are never air,
 * even when the rest of the wording looks alarming.
 */
export function classify(title: string, body: string): 'rcb_air' | 'rcb_other' {
	const text = `${title} ${body}`.toLowerCase();

	const isExercise =
		/\bćwiczeni|\btrening|\bpróbn|\bsprawdzeni\w* syst|\btestow/.test(text) &&
		!/\bnie jest to ćwiczeni/.test(text);
	if (isExercise) return 'rcb_other';

	const isAir =
		/zagrożeni\w* z powietrza/.test(text) ||
		/atak\w* powietrzn/.test(text) ||
		/operuj\w* (polskie |sojusznicze )*lotnictwo/.test(text) ||
		/operowani\w* lotnictwa/.test(text) ||
		/przestrzeni powietrznej/.test(text);

	return isAir ? 'rcb_air' : 'rcb_other';
}

/**
 * Has RCB called this threat off?
 *
 * RCB does not delete a komunikat when a threat passes - it edits the same page,
 * prefixing "Aktualizacja!" and a cancellation line above the original alert
 * text. The original alarming wording stays on the page underneath, so a
 * komunikat must be read as cancelled from the update, or the app keeps a
 * stood-down alert lit for hours.
 */
export function isCancelled(body: string): boolean {
	const text = body.toLowerCase();

	return (
		/odwołano\s+zagrożeni/.test(text) ||
		/zagrożenie\s+(zostało\s+)?odwołane/.test(text) ||
		/brak\s+zagrożenia/.test(text) ||
		/zakończył\s+się\s+atak/.test(text) ||
		/alarm\s+odwołany/.test(text) ||
		/odwołany\s+alarm/.test(text)
	);
}

/** Build the stored komunikat from a listing entry plus its detail page text. */
export function buildKomunikat(item: RcbListItem, detailBody: string): RcbKomunikat {
	const body = detailBody || item.intro;
	return {
		...item,
		body,
		type: classify(item.title, body),
		cancelled: isCancelled(body),
		areas: extractAreas(`${item.title} ${body}`)
	};
}
