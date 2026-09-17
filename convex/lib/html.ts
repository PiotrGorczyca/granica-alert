/** Minimal HTML helpers - the Convex runtime has no DOM parser. */

const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	oacute: 'ó',
	bdquo: '„',
	ldquo: '“',
	rdquo: '”',
	rsquo: '’',
	mdash: '—',
	ndash: '–',
	hellip: '…'
};

export function decodeEntities(text: string): string {
	return text
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
		.replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

function safeCodePoint(code: number): string {
	if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
	try {
		return String.fromCodePoint(code);
	} catch {
		return '';
	}
}

/** Strip tags and collapse whitespace, dropping script/style content entirely. */
export function stripTags(html: string): string {
	return decodeEntities(
		html
			.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
			.replace(/<[^>]+>/g, ' ')
	)
		.replace(/[ \t ]+/g, ' ')
		.replace(/\s*\n\s*/g, '\n')
		.trim();
}
