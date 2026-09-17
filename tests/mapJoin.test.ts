import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractAreas } from '../convex/lib/adminAreas.ts';
import { VOIVODESHIPS, POWIAT_VOIVODESHIPS } from '../convex/lib/adminAreaNames.ts';
import { WATCHED_OBLASTS } from '../convex/lib/uaOblasts.ts';

/**
 * The extractor produces names; the map looks those names up in the bundled
 * boundary data. If the two ever drift apart the map silently shades nothing -
 * during an actual alert, which is exactly when it must not. These tests hold
 * the join keys together.
 */

const read = (path: string) =>
	JSON.parse(readFileSync(new URL(`../src/lib/data/${path}`, import.meta.url), 'utf8'));

const wojewodztwa = read('wojewodztwa.json');
const powiaty = read('powiaty.json');
const uaOblasts = read('ua-oblasts.json');

test('every voivodeship name resolves to exactly one polygon', () => {
	for (const name of VOIVODESHIPS) {
		const hits = wojewodztwa.features.filter(
			(f: { properties: { nazwa: string } }) => f.properties.nazwa === name
		);
		assert.equal(hits.length, 1, `${name}: expected 1 polygon, got ${hits.length}`);
	}
});

test('every powiat name+voivodeship pair resolves to a polygon', () => {
	for (const [name, parents] of Object.entries(POWIAT_VOIVODESHIPS)) {
		for (const voivodeship of parents) {
			const hits = powiaty.features.filter(
				(f: { properties: { nazwa: string; wojewodztwo: string } }) =>
					f.properties.nazwa === name && f.properties.wojewodztwo === voivodeship
			);
			assert.equal(hits.length, 1, `${name} / ${voivodeship}: got ${hits.length} polygons`);
		}
	}
});

test('powiat polygons all carry a voivodeship the extractor knows', () => {
	const known = new Set(VOIVODESHIPS);
	for (const f of powiaty.features) {
		assert.ok(
			known.has(f.properties.wojewodztwo),
			`${f.properties.nazwa} tagged with unknown voivodeship ${f.properties.wojewodztwo}`
		);
	}
});

test('every watched oblast has geometry to shade', () => {
	for (const oblast of WATCHED_OBLASTS) {
		const hits = uaOblasts.features.filter(
			(f: { properties: { iso: string } }) => f.properties.iso === oblast.iso
		);
		assert.equal(hits.length, 1, `${oblast.namePl} (${oblast.iso}): got ${hits.length} polygons`);
	}
});

test('a real RCB alert shades real polygons end to end', () => {
	// Verbatim from gov.pl, 17.09.
	const areas = extractAreas(
		'Alert RCB został wysłany do odbiorców na terenie woj: lubelskiego i podkarpackiego'
	);

	const shaded = wojewodztwa.features.filter((f: { properties: { nazwa: string } }) =>
		areas.voivodeships.includes(f.properties.nazwa)
	);

	assert.equal(shaded.length, 2);
	assert.deepEqual(
		shaded.map((f: { properties: { nazwa: string } }) => f.properties.nazwa).sort(),
		['lubelskie', 'podkarpackie']
	);
});

test('a real siren-drill alert shades one powiat polygon', () => {
	const areas = extractAreas(
		'na terenie powiatu łęczyńskiego odbędzie się trening systemu alarmowania'
	);

	const wanted = new Set(areas.powiats.map((p) => `${p.name}|${p.voivodeship}`));
	const shaded = powiaty.features.filter(
		(f: { properties: { nazwa: string; wojewodztwo: string } }) =>
			wanted.has(`${f.properties.nazwa}|${f.properties.wojewodztwo}`)
	);

	assert.equal(shaded.length, 1);
	assert.equal(shaded[0].properties.nazwa, 'powiat łęczyński');
});
