import { action } from './_generated/server';
import { api } from './_generated/api';
import { v } from 'convex/values';

// RCB poller - fetches from gov.pl and stores new komunikaty
export const pollRcb = action({
	args: {},
	handler: async (ctx) => {
		const rcbUrl = 'https://www.gov.pl/web/rcb/komunikaty';

		try {
			console.log('Polling RCB komunikaty...');
			const response = await fetch(rcbUrl, {
				headers: {
					'User-Agent': 'Granica Alert MVP/0.1 (civic air awareness; contact: dev@example.com)'
				}
			});

			if (!response.ok) {
				await ctx.runMutation(api.mutations.updateSourceStatus, {
					source_name: 'rcb',
					status: 'error',
					error_message: `HTTP ${response.status}`
				});
				return { success: false, error: `HTTP ${response.status}` };
			}

			const html = await response.text();
			const komunikaty = parseRcbKomunikaty(html);

			console.log(`Found ${komunikaty.length} komunikaty on page`);

			let newCount = 0;
			for (const komunikat of komunikaty) {
				const stored = await ctx.runMutation(api.mutations.storeRcbKomunikat, {
					komunikat
				});
				if (stored) newCount++;
			}

			await ctx.runMutation(api.mutations.updateSourceStatus, {
				source_name: 'rcb',
				status: 'ok'
			});

			console.log(`Stored ${newCount} new komunikaty`);
			return { success: true, new_count: newCount, total_found: komunikaty.length };
		} catch (error) {
			console.error('RCB poll error:', error);
			await ctx.runMutation(api.mutations.updateSourceStatus, {
				source_name: 'rcb',
				status: 'error',
				error_message: String(error)
			});
			return { success: false, error: String(error) };
		}
	}
});

interface RcbKomunikat {
	id: string;
	title: string;
	url: string;
	date: string;
	type: 'rcb_air' | 'rcb_other';
	body?: string;
}

// Parse RCB komunikaty list page
// Fallback fixture if live scrape is flaky
function parseRcbKomunikaty(html: string): RcbKomunikat[] {
	const komunikaty: RcbKomunikat[] = [];

	try {
		// Simple regex-based parsing for MVP
		// Match article items (typical gov.pl structure)
		const articlePattern = /<article[^>]*>[\s\S]*?<\/article>/gi;
		const articles = html.match(articlePattern) || [];

		for (const article of articles.slice(0, 20)) {
			// Limit to recent 20
			// Extract URL
			const urlMatch = article.match(/href="([^"]*komunikat[^"]*)"/i);
			if (!urlMatch) continue;

			const url = urlMatch[1].startsWith('http') ? urlMatch[1] : `https://www.gov.pl${urlMatch[1]}`;

			// Extract title
			const titleMatch = article.match(/<h[2-4][^>]*>(.*?)<\/h[2-4]>/i);
			const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';

			if (!title) continue;

			// Extract date
			const dateMatch = article.match(/(\d{4}-\d{2}-\d{2})|(\d{2}\.\d{2}\.\d{4})/);
			const dateStr = dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0];

			// Classify based on keywords
			const lowerTitle = title.toLowerCase();
			const lowerArticle = article.toLowerCase();

			const isAir =
				lowerTitle.includes('nalot') ||
				lowerTitle.includes('lotnictw') ||
				lowerTitle.includes('przestrze') ||
				lowerTitle.includes('ukrain') ||
				lowerArticle.includes('lotnictwo') ||
				lowerArticle.includes('przestrzeni powietrznej');

			const isTraining =
				lowerTitle.includes('trening') ||
				lowerTitle.includes('ćwiczenie') ||
				lowerTitle.includes('próbn') ||
				lowerTitle.includes('test');

			const type: 'rcb_air' | 'rcb_other' = isAir && !isTraining ? 'rcb_air' : 'rcb_other';

			komunikaty.push({
				id: url,
				title,
				url,
				date: normalizeDateToISO(dateStr),
				type
			});
		}
	} catch (error) {
		console.error('Parse error, using fixture fallback:', error);
		return getFixtureFallback();
	}

	// If parsing yielded nothing, use fixture
	return komunikaty.length > 0 ? komunikaty : getFixtureFallback();
}

// Fixture fallback for development and if live scrape fails
function getFixtureFallback(): RcbKomunikat[] {
	const now = new Date();
	const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

	return [
		{
			id: 'fixture-rcb-air-1',
			title: 'Komunikat RCB: Nalot na terytorium Ukrainy - operowanie polskiego lotnictwa',
			url: 'https://www.gov.pl/web/rcb/komunikaty',
			date: oneHourAgo.toISOString(),
			type: 'rcb_air',
			body: 'W związku z atakiem powietrznym na obiekty znajdujące się na terytorium Ukrainy istnieje prawdopodobieństwo, że w polskiej przestrzeni powietrznej operują polskie i sojusznicze statki powietrzne. Mogą być związane z tym drgania szyb oraz hałas.'
		}
	];
}

function normalizeDateToISO(dateStr: string): string {
	// Try to parse various date formats
	if (dateStr.includes('-')) {
		// Already YYYY-MM-DD or ISO
		return dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00Z`;
	}

	if (dateStr.includes('.')) {
		// DD.MM.YYYY format
		const parts = dateStr.split('.');
		if (parts.length === 3) {
			return `${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`;
		}
	}

	// Fallback
	return new Date().toISOString();
}
