import { action } from './_generated/server';
import { api } from './_generated/api';

interface RssFeed {
	key: string;
	name: string;
	url: string;
	enabled: boolean;
}

const RSS_FEEDS: RssFeed[] = [
	{
		key: 'tvn24_najnowsze',
		name: 'TVN24 Najnowsze',
		url: 'https://www.tvn24.pl/najnowsze.xml',
		enabled: true
	},
	{
		key: 'tvn24_polska',
		name: 'TVN24 Polska',
		url: 'https://www.tvn24.pl/polska.xml',
		enabled: true
	},
	{
		key: 'rmf24_polska',
		name: 'RMF24 Polska',
		url: 'https://www.rmf24.pl/fakty/polska/feed',
		enabled: true
	},
	{
		key: 'rmf24_swiat',
		name: 'RMF24 Świat',
		url: 'https://www.rmf24.pl/fakty/swiat/feed',
		enabled: true
	},
	{
		key: 'defence24',
		name: 'Defence24',
		url: 'https://defence24.pl/rss',
		enabled: true
	},
	{
		key: 'polsat_news',
		name: 'Polsat News',
		url: 'https://www.polsatnews.pl/rss/',
		enabled: true
	},
	{
		key: 'gazeta_wiadomosci',
		name: 'Gazeta.pl Wiadomości',
		url: 'https://wiadomosci.gazeta.pl/pub/rss/wiadomosci.xml',
		enabled: true
	},
	{
		key: 'radio_rzeszow',
		name: 'Polskie Radio Rzeszów',
		url: 'https://www.radio.rzeszow.pl/feed/',
		enabled: true
	}
];

interface NewsItem {
	external_id: string;
	title: string;
	url: string;
	summary?: string;
	published_at: string;
	source_key: string;
	source_name: string;
	matched_keywords: string[];
}

export const pollNewsRss = action({
	args: {},
	handler: async (ctx) => {
		console.log('Polling news RSS feeds...');

		let totalNew = 0;
		const results: Record<string, { success: boolean; new_count?: number; error?: string }> = {};

		for (const feed of RSS_FEEDS) {
			if (!feed.enabled) {
				continue;
			}

			try {
				const newCount = await pollSingleFeed(ctx, feed);
				totalNew += newCount;
				results[feed.key] = { success: true, new_count: newCount };

				await ctx.runMutation(api.mutations.updateSourceStatus, {
					source_name: feed.key,
					status: 'ok'
				});
			} catch (error) {
				console.error(`Error polling ${feed.key}:`, error);
				results[feed.key] = { success: false, error: String(error) };

				await ctx.runMutation(api.mutations.updateSourceStatus, {
					source_name: feed.key,
					status: 'error',
					error_message: String(error)
				});
			}
		}

		console.log(`Stored ${totalNew} new news items across all feeds`);
		return { success: true, total_new: totalNew, results };
	}
});

async function pollSingleFeed(ctx: any, feed: RssFeed): Promise<number> {
	console.log(`Fetching ${feed.name}...`);

	const response = await fetch(feed.url, {
		headers: {
			'User-Agent': 'GranicaAlertBot/0.1 (civic air awareness; contact: dev@example.com)'
		}
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}

	const xmlText = await response.text();
	const items = parseRssFeed(xmlText);

	console.log(`Found ${items.length} items in ${feed.name}`);

	let newCount = 0;

	for (const item of items.slice(0, 20)) {
		if (!item.link || !item.title) {
			continue;
		}

		const matchedKeywords = filterByKeywords(item.title, item.description || '');

		if (matchedKeywords.length === 0) {
			continue;
		}

		const newsItem: NewsItem = {
			external_id: item.guid || item.link,
			title: item.title,
			url: item.link,
			summary: item.description ? item.description.substring(0, 500) : undefined,
			published_at: normalizeDate(item.pubDate || ''),
			source_key: feed.key,
			source_name: feed.name,
			matched_keywords: matchedKeywords
		};

		const stored = await ctx.runMutation(api.mutations.storeNewsItem, {
			newsItem
		});

		if (stored) {
			newCount++;
		}
	}

	return newCount;
}

interface RssItem {
	title: string;
	link: string;
	guid?: string;
	description?: string;
	pubDate?: string;
}

function parseRssFeed(xmlText: string): RssItem[] {
	const items: RssItem[] = [];

	const itemPattern = /<item[\s\S]*?<\/item>/gi;
	const itemMatches = xmlText.match(itemPattern) || [];

	for (const itemXml of itemMatches) {
		const title = extractTag(itemXml, 'title');
		const link = extractTag(itemXml, 'link');

		if (!title || !link) continue;

		items.push({
			title: decodeHtml(title),
			link: decodeHtml(link),
			guid: extractTag(itemXml, 'guid') || undefined,
			description: extractTag(itemXml, 'description')
				? decodeHtml(stripTags(extractTag(itemXml, 'description') || ''))
				: undefined,
			pubDate: extractTag(itemXml, 'pubDate') || extractTag(itemXml, 'dc:date') || undefined
		});
	}

	return items;
}

function extractTag(xml: string, tagName: string): string | null {
	const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
	const match = xml.match(pattern);
	if (match && match[1]) {
		return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
	}
	return null;
}

function stripTags(html: string): string {
	return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtml(text: string): string {
	return text
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#039;/g, "'")
		.replace(/&nbsp;/g, ' ');
}

function filterByKeywords(title: string, summary: string): string[] {
	const titleLower = title.toLowerCase();
	const text = `${title} ${summary}`.toLowerCase();
	const matched: string[] = [];

	// Test cases (inline documentation):
	// ACCEPT: "RCB: Nalot na Ukrainę, polskie lotnictwo operuje" (rcb + air theme)
	// ACCEPT: "DORSZ potwierdza naruszenie przestrzeni powietrznej" (dorsz + violation)
	// ACCEPT: "Drony Shahed nad Lublinem" (drone + air threat)
	// ACCEPT: "F-16 przechwyciły obiekt nad Podkarpaciem" (f-16 + action)
	// REJECT: "Atak wilka w Samoklęskach" (atak alone, no air/border context)
	// REJECT: "Pożar trawy w Rzeszowie" (city alone, no air/border/military)
	// REJECT: "Muzeum Franciszkanów zaprasza" (culture, no keywords)
	// REJECT: "Wodór jako energia przyszłości" (energy, no threat)

	// Core official/threat keywords (strong alone)
	const coreStrongKeywords = [
		'rcb',
		'dorsz',
		'dowództwo operacyjne',
		'przestrzen powietrz', // airspace (combined to be more specific)
		'naruszeni',
		'ep r',
		'ep-r',
		'shahed',
		'gerbera',
		'bezpilot',
		'dron',
		'nalot',
		'alarm powietrz',
		'operowanie lotnictwa',
		'straż graniczna',
		'radar',
		'awacs',
		'f-16'
	];

	// Context keywords (demoted to weak - need pairing)
	const weakKeywords = [
		// Geographic (demoted from strong - too broad alone)
		'dorohusk',
		'przemyśl',
		'rzeszów',
		'lublin',
		'białystok',
		'suwałki',
		'podkarpaci',
		'lubelszcz',
		'podla',
		'rusinowo',
		'wielka księża',
		// Border/boundary (demoted - need air/military context)
		'graniczn',
		// Conflict terms (demoted - too broad without context)
		'atak',
		'ukrain',
		'białoru',
		// Military/aviation
		'rakiet',
		'pocisk',
		'awaria',
		'ewakuac',
		'lotnisk',
		'chopina',
		'modlin',
		'jasionka',
		'nato',
		'sojusznic',
		'przejęt',
		'zestrzel',
		'fragmenty',
		'pirotechnik'
	];

	// Suppress: local non-threat, culture, weather, sports, entertainment
	const suppressKeywords = [
		'piłk',
		'ekstraklasa',
		'celebrity',
		'horoskop',
		'promocj',
		'black friday',
		// Add culture/museum/local events
		'muze',
		'wystaw',
		'koncert',
		'festiwal',
		'spektakl',
		'teatr',
		// Weather/fire/local incidents (without air context)
		'pożar trawy',
		'pali się trawa',
		'palenie traw',
		// Wildlife
		'wilk',
		'wilki',
		'niedźwied',
		'dzik',
		// Local infrastructure (without aviation)
		'remont drogi',
		'utrudnien drogowe',
		// Energy/tech (non-military)
		'wodór',
		'energia słoneczna',
		'fotowoltaik'
	];

	// First check suppress list
	for (const suppress of suppressKeywords) {
		if (text.includes(suppress)) {
			return [];
		}
	}

	let coreStrongCount = 0;
	let weakCount = 0;

	// Prioritize title (weight title matches more)
	// Check core strong keywords
	for (const keyword of coreStrongKeywords) {
		if (text.includes(keyword)) {
			matched.push(keyword);
			// Title match counts double
			if (titleLower.includes(keyword)) {
				coreStrongCount += 2;
			} else {
				coreStrongCount += 1;
			}
		}
	}

	// Check weak keywords
	for (const keyword of weakKeywords) {
		if (text.includes(keyword)) {
			matched.push(keyword);
			// Title match counts as 1.5
			if (titleLower.includes(keyword)) {
				weakCount += 1.5;
			} else {
				weakCount += 1;
			}
		}
	}

	// Pass criteria: ≥1 core strong (weighted) OR ≥2 weak (weighted)
	if (coreStrongCount >= 1 || weakCount >= 2) {
		return matched;
	}

	return [];
}

function normalizeDate(dateStr: string): string {
	try {
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) {
			return new Date().toISOString();
		}
		return date.toISOString();
	} catch {
		return new Date().toISOString();
	}
}
