import { VOIVODESHIPS, POWIATS, POWIAT_VOIVODESHIPS } from './adminAreaNames.ts';

/** A powiat pinned to its voivodeship, which is what makes it drawable. */
export type PowiatRef = {
	name: string;
	voivodeship: string;
};

/**
 * Administrative areas named by an official communication.
 *
 * Names are canonical and match the `nazwa` property in the bundled boundary
 * GeoJSON exactly, so the map can shade them without any further guessing.
 */
export type AlertAreas = {
	voivodeships: string[];
	powiats: PowiatRef[];
	/**
	 * Powiats the text names but we cannot place: ten powiat names belong to two
	 * different voivodeships and the text did not say which. Worth showing as
	 * text, never worth shading - guessing would put an alert over the wrong
	 * half of the country.
	 */
	unplaceablePowiats: string[];
};

const EMPTY: AlertAreas = { voivodeships: [], powiats: [], unplaceablePowiats: [] };

const PL_LETTER = 'a-ząćęłńóśźż';

/** Lowercase, collapse whitespace, normalise the dashes gov.pl mixes in. */
function normalise(text: string): string {
	return text
		.toLowerCase()
		.replace(/[‐-―−]/g, '-')
		.replace(/\s+/g, ' ');
}

/**
 * Polish declines these names ("woj. lubelskiego", "powiatu łęczyńskiego"), so we
 * match on a stem and let any inflectional ending follow.
 *
 * Voivodeships all end in -ie ("lubelskie" -> "lubelsk"); powiat adjectives end in
 * -i ("łęczyński" -> "łęczyńsk"). City powiats ("powiat Biała Podlaska") have no
 * adjective and are matched literally.
 */
function stemOf(word: string): string {
	if (word.endsWith('ie')) return word.slice(0, -2);
	if (word.endsWith('i') || word.endsWith('y')) return word.slice(0, -1);
	return word;
}

type Candidate = { canonical: string; pattern: RegExp };

function buildCandidates(names: readonly string[], strip: string): Candidate[] {
	return (
		names
			.map((canonical) => {
				const bare = canonical.startsWith(strip) ? canonical.slice(strip.length) : canonical;
				const stem = stemOf(normalise(bare));
				return { canonical, stem };
			})
			// Longest stem first: "kujawsko-pomorsk" must win before "pomorsk", and
			// "dolnośląsk" before "śląsk". Matches are masked out as we go.
			.sort((a, b) => b.stem.length - a.stem.length)
			.map(({ canonical, stem }) => ({
				canonical,
				// A hyphen counts as a word boundary in JS \b, which would let "pomorsk"
				// match inside "kujawsko-pomorskiego" - so the boundary is spelled out.
				pattern: new RegExp(`(?<![${PL_LETTER}-])${escapeRegex(stem)}[${PL_LETTER}]*`, 'gu')
			}))
	);
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const VOIVODESHIP_CANDIDATES = buildCandidates(VOIVODESHIPS, '');
const POWIAT_CANDIDATES = buildCandidates(POWIATS, 'powiat ');

/**
 * Marks where the text switches between talking about voivodeships and powiats.
 *
 * RCB is not consistent with itself: the same kind of alert appears as "na
 * terenie woj. podkarpackiego" and "na terenie woj: lubelskiego", so the
 * abbreviation is matched with a dot, a colon or neither. The punctuation is
 * consumed as part of the marker so it is not mistaken for a sentence end.
 */
const MARKER = /(wojew[oó]dztw\w*|woj\b[.:]?)|(powiat\w*|powiecie)/gu;

/**
 * Pull the administrative areas out of an official Polish communication.
 *
 * RCB states its scope in prose - "Alert RCB został wysłany do odbiorców na
 * terenie woj. podkarpackiego i lubelskiego", "na terenie powiatu łęczyńskiego" -
 * so we read the scope from the words the issuer actually used. Nothing is
 * inferred: text that names no area yields no area.
 */
export function extractAreas(text: string | undefined | null): AlertAreas {
	if (!text) return EMPTY;

	const haystack = normalise(text);
	const voivodeships = new Set<string>();
	const powiatNames = new Set<string>();

	// Each marker governs the text that follows it, up to the next marker or the
	// end of the sentence - that is what makes "woj. podkarpackiego i lubelskiego"
	// resolve to two voivodeships rather than one.
	const markers = [...haystack.matchAll(MARKER)];

	for (let i = 0; i < markers.length; i++) {
		const marker = markers[i];
		const isVoivodeship = marker[1] !== undefined;
		const from = marker.index + marker[0].length;
		const nextMarker = markers[i + 1]?.index ?? haystack.length;
		const sentenceEnd = findSentenceEnd(haystack, from);
		const window = haystack.slice(from, Math.min(nextMarker, sentenceEnd));

		const found = matchIn(window, isVoivodeship ? VOIVODESHIP_CANDIDATES : POWIAT_CANDIDATES);
		for (const name of found) (isVoivodeship ? voivodeships : powiatNames).add(name);
	}

	return placePowiats([...voivodeships].sort(), [...powiatNames].sort());
}

/**
 * Pin each powiat to a voivodeship so the map can find its polygon.
 *
 * Most powiat names are unique. For the ten that are not, the voivodeship named
 * elsewhere in the same text decides; if nothing decides it, the powiat is
 * reported as unplaceable rather than drawn in a guessed location.
 */
function placePowiats(voivodeships: string[], powiatNames: string[]): AlertAreas {
	const powiats: PowiatRef[] = [];
	const unplaceablePowiats: string[] = [];

	for (const name of powiatNames) {
		const parents = POWIAT_VOIVODESHIPS[name] ?? [];

		if (parents.length === 1) {
			powiats.push({ name, voivodeship: parents[0] });
			continue;
		}

		const decidedBy = parents.filter((parent) => voivodeships.includes(parent));
		if (decidedBy.length === 1) {
			powiats.push({ name, voivodeship: decidedBy[0] });
		} else {
			unplaceablePowiats.push(name);
		}
	}

	return { voivodeships, powiats, unplaceablePowiats };
}

/**
 * The areas to actually shade, and at which level.
 *
 * When a communication names both - "trening w powiecie krasnostawskim, woj.
 * lubelskie" - the voivodeship is context for the powiat, not a second alert
 * zone. Shading the narrower scope keeps a one-powiat siren drill from lighting
 * up a region of two million people.
 */
export function shadingScope(
	areas: AlertAreas
):
	| { level: 'powiat'; powiats: PowiatRef[] }
	| { level: 'voivodeship'; voivodeships: string[] }
	| { level: 'none' } {
	if (areas.powiats.length > 0) return { level: 'powiat', powiats: areas.powiats };
	if (areas.voivodeships.length > 0)
		return { level: 'voivodeship', voivodeships: areas.voivodeships };
	return { level: 'none' };
}

/** End of sentence, ignoring the dots inside abbreviations like "woj." or "ul.". */
function findSentenceEnd(text: string, from: number): number {
	const rest = text.slice(from);
	const end = rest.search(/[.!?;](\s|$)/u);
	return end === -1 ? text.length : from + end;
}

function matchIn(window: string, candidates: Candidate[]): string[] {
	let remaining = window;
	const found: string[] = [];

	for (const { canonical, pattern } of candidates) {
		pattern.lastIndex = 0;
		if (!pattern.test(remaining)) continue;
		found.push(canonical);
		// Blank out what we matched so a shorter, nested stem cannot claim it too.
		pattern.lastIndex = 0;
		remaining = remaining.replace(pattern, (m) => ' '.repeat(m.length));
	}

	return found;
}

/** True when the areas carry nothing the map could draw. */
export function areasAreEmpty(areas: AlertAreas): boolean {
	return (
		areas.voivodeships.length === 0 &&
		areas.powiats.length === 0 &&
		areas.unplaceablePowiats.length === 0
	);
}
