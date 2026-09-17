import { test } from 'node:test';
import assert from 'node:assert/strict';
import { airStateOf } from '../convex/lib/airState.ts';

/**
 * This function decides whether the app tells someone near the border that an
 * air alert is in force. Both directions of error matter: shading a region for a
 * threat that has passed is a false alarm, and reporting "all clear" that RCB
 * never issued is a false reassurance.
 */

const NOW = Date.parse('2026-09-17T18:00:00.000Z');
const agoMinutes = (m: number) => new Date(NOW - m * 60_000).toISOString();

test('a recent alert we timed ourselves is in force', () => {
	assert.equal(
		airStateOf({ publishedAt: agoMinutes(30), timePrecision: 'detected', cancelled: false }, NOW),
		'active'
	);
});

test('a stand-down outranks everything, at any age', () => {
	// RCB said so outright; that is the only all-clear we ever assert.
	for (const minutes of [1, 60, 60 * 24, 60 * 24 * 7]) {
		assert.equal(
			airStateOf(
				{ publishedAt: agoMinutes(minutes), timePrecision: 'detected', cancelled: true },
				NOW
			),
			'cancelled'
		);
	}
});

test('a backfilled alert is never reported as in force', () => {
	// The defect this guards: a komunikat found by a catch-up poll carries the
	// time of the backfill, not of publication. Treating it as fresh would shade
	// two voivodeships for a threat that may have ended hours earlier.
	assert.equal(
		airStateOf({ publishedAt: agoMinutes(5), timePrecision: 'day', cancelled: false }, NOW),
		'no_confirmation'
	);
});

test('past the window without a stand-down we say we do not know', () => {
	// Not "all clear": RCB does not publish a stand-down for every alert, so its
	// silence is not information.
	assert.equal(
		airStateOf({ publishedAt: agoMinutes(180), timePrecision: 'detected', cancelled: false }, NOW),
		'no_confirmation'
	);
});

test('the unresolved state does not linger for days', () => {
	assert.equal(
		airStateOf(
			{ publishedAt: agoMinutes(13 * 60), timePrecision: 'detected', cancelled: false },
			NOW
		),
		'none'
	);
});

test('window boundaries land on the safe side', () => {
	const at = (m: number) =>
		airStateOf({ publishedAt: agoMinutes(m), timePrecision: 'detected', cancelled: false }, NOW);
	assert.equal(at(120), 'active');
	assert.equal(at(121), 'no_confirmation');
	assert.equal(at(12 * 60), 'no_confirmation');
	assert.equal(at(12 * 60 + 1), 'none');
});

test('no alert on record is plainly none', () => {
	assert.equal(airStateOf(null, NOW), 'none');
	assert.equal(airStateOf(undefined, NOW), 'none');
});

test('unusable timestamps never produce an alert state', () => {
	assert.equal(
		airStateOf({ publishedAt: 'not a date', timePrecision: 'detected', cancelled: false }, NOW),
		'none'
	);
	// A future timestamp is a clock problem, not an alert.
	assert.equal(
		airStateOf({ publishedAt: agoMinutes(-30), timePrecision: 'detected', cancelled: false }, NOW),
		'none'
	);
});
