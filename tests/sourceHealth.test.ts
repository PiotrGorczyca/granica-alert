import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSourceFresh } from '../convex/lib/sourceHealth.ts';

/**
 * Guards the difference between "RCB published no alert" and "we cannot see
 * RCB". Reporting the second as the first is reassurance the app has not earned.
 */

const NOW = Date.parse('2026-09-17T18:00:00.000Z');
const agoMinutes = (m: number) => new Date(NOW - m * 60_000).toISOString();

test('a recent successful poll is fresh', () => {
	assert.equal(isSourceFresh('ok', agoMinutes(3), NOW), true);
	assert.equal(isSourceFresh('ok', agoMinutes(20), NOW), true);
});

test('a poll that has fallen behind is not fresh', () => {
	assert.equal(isSourceFresh('ok', agoMinutes(21), NOW), false);
	assert.equal(isSourceFresh('ok', agoMinutes(60 * 6), NOW), false);
});

test('a failing or stale source is never fresh, however recent the attempt', () => {
	// 'stale' is the parse-succeeded-but-understood-nothing case: a layout change.
	assert.equal(isSourceFresh('error', agoMinutes(1), NOW), false);
	assert.equal(isSourceFresh('stale', agoMinutes(1), NOW), false);
});

test('never having fetched is not fresh', () => {
	assert.equal(isSourceFresh('ok', null, NOW), false);
	assert.equal(isSourceFresh('ok', '', NOW), false);
	assert.equal(isSourceFresh(null, null, NOW), false);
});

test('an untrustworthy clock does not count as fresh', () => {
	assert.equal(isSourceFresh('ok', 'not a date', NOW), false);
	assert.equal(isSourceFresh('ok', agoMinutes(-10), NOW), false);
});
