import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDueForRefresh } from '../convex/lib/refreshSchedule.ts';

/**
 * This schedule decides how hard we lean on gov.pl. Too eager and the bot gets
 * blocked; too lazy and we miss the line naming which voivodeships an alert went
 * to, which is the only geography the source gives us.
 */

const NOW = Date.parse('2026-09-17T12:00:00.000Z');
const agoHours = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
const agoMinutes = (m: number) => new Date(NOW - m * 60_000).toISOString();

test('a komunikat never read yet is always due', () => {
	assert.equal(
		isDueForRefresh({ publishedAt: agoHours(1), lastRefreshedAt: null, hasArea: false }, NOW),
		true
	);
});

test('a fresh komunikat is re-read every poll', () => {
	// Under 2h old: this is the window in which RCB appends the scope line.
	const fresh = { publishedAt: agoHours(1), hasArea: true };
	assert.equal(isDueForRefresh({ ...fresh, lastRefreshedAt: agoMinutes(6) }, NOW), true);
	assert.equal(isDueForRefresh({ ...fresh, lastRefreshedAt: agoMinutes(2) }, NOW), false);
});

test('a few hours old, it drops to every half hour', () => {
	const midAged = { publishedAt: agoHours(6), hasArea: true };
	assert.equal(isDueForRefresh({ ...midAged, lastRefreshedAt: agoMinutes(31) }, NOW), true);
	assert.equal(isDueForRefresh({ ...midAged, lastRefreshedAt: agoMinutes(10) }, NOW), false);
});

test('once settled, only komunikaty still missing an area are re-read', () => {
	const settled = { publishedAt: agoHours(24), lastRefreshedAt: agoHours(4) };
	assert.equal(isDueForRefresh({ ...settled, hasArea: false }, NOW), true);
	assert.equal(isDueForRefresh({ ...settled, hasArea: true }, NOW), false);
});

test('a settled komunikat still respects its interval', () => {
	assert.equal(
		isDueForRefresh(
			{ publishedAt: agoHours(24), lastRefreshedAt: agoMinutes(60), hasArea: false },
			NOW
		),
		false
	);
});

test('past the window nothing is re-read, area or not', () => {
	// The cap is what stops the poller accumulating permanent work.
	for (const hasArea of [true, false]) {
		assert.equal(
			isDueForRefresh({ publishedAt: agoHours(49), lastRefreshedAt: null, hasArea }, NOW),
			false
		);
	}
});

test('nonsense timestamps never trigger a fetch loop', () => {
	assert.equal(isDueForRefresh({ publishedAt: 'not a date', hasArea: false }, NOW), false);
	// A future publish date would otherwise compute a negative age.
	assert.equal(
		isDueForRefresh({ publishedAt: new Date(NOW + 3_600_000).toISOString(), hasArea: false }, NOW),
		false
	);
});

test('a full day of polling stays within a sane request budget', () => {
	// Simulate one komunikat through 48h of five-minute polls and count fetches.
	let lastRefreshedAt: string | null = null;
	let fetches = 0;
	const publishedAt = new Date(NOW).toISOString();

	for (let minute = 0; minute <= 48 * 60; minute += 5) {
		const now = NOW + minute * 60_000;
		if (isDueForRefresh({ publishedAt, lastRefreshedAt, hasArea: true }, now)) {
			fetches++;
			lastRefreshedAt = new Date(now).toISOString();
		}
	}

	// Old behaviour was one fetch every poll for 48h = 576.
	assert.ok(fetches <= 50, `expected a tapered budget, got ${fetches}`);
	assert.ok(fetches >= 20, `expected the fresh window to be covered, got ${fetches}`);
});
