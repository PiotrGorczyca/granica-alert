import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractAreas, shadingScope } from '../convex/lib/adminAreas.ts';

/**
 * The map shades whatever these areas name, so a regression here puts the wrong
 * part of Poland under an alert. The first two cases are verbatim RCB text.
 */

test('reads both voivodeships out of a real air-threat alert', () => {
	const areas = extractAreas(
		'Alert RCB został wysłany do odbiorców na terenie woj. podkarpackiego i lubelskiego.'
	);
	assert.deepEqual(areas.voivodeships, ['lubelskie', 'podkarpackie']);
	assert.deepEqual(areas.powiats, []);
	assert.deepEqual(shadingScope(areas), {
		level: 'voivodeship',
		voivodeships: ['lubelskie', 'podkarpackie']
	});
});

test('reads the powiat out of a real siren-training alert', () => {
	const areas = extractAreas(
		'„Ćwiczenie: dziś (17.09) w godz. 12:00-15:00 na terenie powiatu łęczyńskiego odbędzie się trening systemu alarmowania z wykorzystaniem syren. Zachowaj spokój.”'
	);
	assert.deepEqual(areas.powiats, [{ name: 'powiat łęczyński', voivodeship: 'lubelskie' }]);
	assert.deepEqual(areas.voivodeships, []);
});

test('names that nest inside one another stay separate', () => {
	assert.deepEqual(
		extractAreas('Ostrzeżenie dla woj. kujawsko-pomorskiego i pomorskiego.').voivodeships,
		['kujawsko-pomorskie', 'pomorskie']
	);
	assert.deepEqual(
		extractAreas('Alert dla woj. dolnośląskiego, śląskiego i opolskiego.').voivodeships,
		['dolnośląskie', 'opolskie', 'śląskie']
	);
	assert.deepEqual(extractAreas('Dotyczy woj. zachodniopomorskiego.').voivodeships, [
		'zachodniopomorskie'
	]);
});

test('a powiat and a voivodeship sharing a stem are told apart', () => {
	const areas = extractAreas('Alert dla powiatu lubelskiego w woj. lubelskim.');
	assert.deepEqual(areas.voivodeships, ['lubelskie']);
	assert.deepEqual(areas.powiats, [{ name: 'powiat lubelski', voivodeship: 'lubelskie' }]);
});

test('one marker governs a whole coordinated list', () => {
	assert.deepEqual(
		extractAreas('Trening w powiatach: krasnostawskim, łęczyńskim i świdnickim.').powiats,
		[
			{ name: 'powiat krasnostawski', voivodeship: 'lubelskie' },
			{ name: 'powiat łęczyński', voivodeship: 'lubelskie' }
		]
	);
});

test('declined forms are matched', () => {
	assert.deepEqual(
		extractAreas('Sytuacja w województwie podkarpackim jest monitorowana.').voivodeships,
		['podkarpackie']
	);
	assert.deepEqual(extractAreas('Alert w woj. warmińsko-mazurskim.').voivodeships, [
		'warmińsko-mazurskie'
	]);
});

test('city powiats are matched by name', () => {
	assert.deepEqual(extractAreas('Alert RCB dla powiatu Biała Podlaska.').powiats, [
		{ name: 'powiat Biała Podlaska', voivodeship: 'lubelskie' }
	]);
});

test('text naming no area yields no area', () => {
	// The single most important case: an alert whose scope we cannot read must
	// shade nothing, rather than shade a guess.
	const areas = extractAreas(
		'UWAGA! Rosyjski atak powietrzny na terenie Ukrainy. Sytuacja jest monitorowana. W przestrzeni RP operuje polskie lotnictwo. Oczekuj dalszych komunikatów'
	);
	assert.deepEqual(areas.voivodeships, []);
	assert.deepEqual(areas.powiats, []);
});

test('empty and missing input are safe', () => {
	const empty = { voivodeships: [], powiats: [], unplaceablePowiats: [] };
	assert.deepEqual(extractAreas(undefined), empty);
	assert.deepEqual(extractAreas(''), empty);
	assert.deepEqual(shadingScope(extractAreas('')), { level: 'none' });
});

test('a powiat name shared by two voivodeships is not placed on a guess', () => {
	// "powiat świdnicki" exists in both dolnośląskie and lubelskie. With nothing
	// in the text to decide, it must not be drawn anywhere.
	const areas = extractAreas('Trening systemu alarmowania w powiecie świdnickim.');
	assert.deepEqual(areas.powiats, []);
	assert.deepEqual(areas.unplaceablePowiats, ['powiat świdnicki']);
	assert.deepEqual(shadingScope(areas), { level: 'none' });
});

test('a named voivodeship decides an otherwise ambiguous powiat', () => {
	const areas = extractAreas('Trening w powiecie świdnickim, woj. lubelskie.');
	assert.deepEqual(areas.powiats, [{ name: 'powiat świdnicki', voivodeship: 'lubelskie' }]);
	assert.deepEqual(areas.unplaceablePowiats, []);
});

test('a powiat-scoped alert shades the powiat, not its whole voivodeship', () => {
	// Otherwise a siren drill in one powiat lights up a region of two million.
	const areas = extractAreas(
		'Ćwiczenie: trening systemu alarmowania na terenie powiatu krasnostawskiego, woj. lubelskie.'
	);
	assert.deepEqual(shadingScope(areas), {
		level: 'powiat',
		powiats: [{ name: 'powiat krasnostawski', voivodeship: 'lubelskie' }]
	});
});

test('RCB writes the abbreviation inconsistently', () => {
	// All three spellings occur in real komunikaty on gov.pl.
	const expected = ['lubelskie', 'podkarpackie'];
	assert.deepEqual(
		extractAreas('został wysłany do odbiorców na terenie woj: lubelskiego i podkarpackiego')
			.voivodeships,
		expected
	);
	assert.deepEqual(
		extractAreas(
			'Alert RCB został wysłany do odbiorców na terenie woj. podkarpackiego i lubelskiego.'
		).voivodeships,
		expected
	);
	assert.deepEqual(
		extractAreas('wysłany na terenie woj lubelskiego i podkarpackiego').voivodeships,
		expected
	);
});

test('an updated komunikat reads its scope from the update', () => {
	// RCB edits the page after publishing, prefixing "Aktualizacja!" and keeping
	// the original below a separator. Both halves name the same area.
	const areas = extractAreas(
		'Aktualizacja!\n"UWAGA! Odwołano zagrożenie atakiem z powietrza. Brak zagrożenia na terenie Polski."\n' +
			'został wysłany do odbiorców na terenie woj: lubelskiego i podkarpackiego\n' +
			'---------------------------\nAlert RCB o treści:\n„UWAGA! Zagrożenie atakiem z powietrza.”'
	);
	assert.deepEqual(areas.voivodeships, ['lubelskie', 'podkarpackie']);
});
