#!/usr/bin/env node
/**
 * Regenerate the bundled administrative boundary data.
 *
 *   node scripts/gen-admin-data.mjs
 *
 * Source: GUGiK Państwowy Rejestr Granic, redistributed by ppatrzyk/polska-geojson.
 * Outputs:
 *   src/lib/data/wojewodztwa.json   16 voivodeships, simplified, for map shading
 *   src/lib/data/powiaty.json       380 powiats, simplified, tagged with wojewodztwo
 *   src/lib/data/ua-oblasts.json    the watched western Ukrainian oblasts
 *   convex/lib/adminAreaNames.ts    canonical names + powiat -> voivodeship map
 *
 * Ukrainian oblasts come from geoBoundaries (gbOpen UKR ADM1, ODbL, derived from
 * OpenStreetMap) and are filtered to exactly the oblasts convex/lib/uaOblasts.ts
 * watches, joined on ISO 3166-2 code so the two cannot drift apart.
 *
 * Powiat -> voivodeship is derived geometrically (a representative interior point
 * tested against the voivodeship polygons) because the source data does not carry
 * it, and ten powiat names are shared by two different voivodeships.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WATCHED_OBLASTS } from '../convex/lib/uaOblasts.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = 'https://raw.githubusercontent.com/ppatrzyk/polska-geojson/master';
const UA_API = 'https://www.geoboundaries.org/api/current/gbOpen/UKR/ADM1/';

/** Simplification tolerance in degrees. ~0.005 deg is ~400 m - invisible at the
 *  zoom levels this map uses, and it roughly halves the payload. */
const TOLERANCE = 0.005;

async function main() {
	const [woj, pow] = await Promise.all([
		fetchJson(`${SRC}/wojewodztwa/wojewodztwa-min.geojson`),
		fetchJson(`${SRC}/powiaty/powiaty-min.geojson`)
	]);

	console.log(`fetched ${woj.features.length} voivodeships, ${pow.features.length} powiats`);

	// Tag every powiat with the voivodeship that contains it.
	const wojRings = woj.features.map((f) => ({
		nazwa: f.properties.nazwa,
		rings: allRings(f.geometry)
	}));

	let ambiguous = 0;
	for (const f of pow.features) {
		const parent = locate(f.geometry, wojRings);
		if (!parent) throw new Error(`could not place powiat: ${f.properties.nazwa}`);
		f.properties = { nazwa: f.properties.nazwa, wojewodztwo: parent };
	}

	// name -> [voivodeship, ...]; more than one means the name alone is ambiguous.
	const powiatVoivodeships = {};
	for (const f of pow.features) {
		const set = (powiatVoivodeships[f.properties.nazwa] ??= []);
		if (!set.includes(f.properties.wojewodztwo)) set.push(f.properties.wojewodztwo);
	}
	for (const v of Object.values(powiatVoivodeships)) {
		v.sort();
		if (v.length > 1) ambiguous++;
	}
	console.log(`powiat names needing a voivodeship to disambiguate: ${ambiguous}`);

	for (const f of [...woj.features, ...pow.features]) {
		f.geometry = simplifyGeometry(f.geometry, TOLERANCE);
	}
	// The voivodeship id is only meaningful in the source file; drop it.
	for (const f of woj.features) f.properties = { nazwa: f.properties.nazwa };

	mkdirSync(join(ROOT, 'src/lib/data'), { recursive: true });
	writeOut('src/lib/data/wojewodztwa.json', woj);
	writeOut('src/lib/data/powiaty.json', pow);

	await buildUaOblasts();

	const names = woj.features.map((f) => f.properties.nazwa).sort();
	const powiatNames = Object.keys(powiatVoivodeships).sort();
	writeFileSync(
		join(ROOT, 'convex/lib/adminAreaNames.ts'),
		renderNamesModule(names, powiatNames, powiatVoivodeships),
		'utf8'
	);
	console.log('wrote convex/lib/adminAreaNames.ts');
}

/**
 * The four western oblasts we watch, keyed by ISO code so the map can shade
 * exactly what the alerts.in.ua poller reports.
 */
async function buildUaOblasts() {
	const meta = await fetchJson(UA_API);
	const all = await fetchJson(meta.simplifiedGeometryGeoJSON);

	const wanted = new Map(WATCHED_OBLASTS.map((o) => [o.iso, o]));
	const features = [];

	for (const f of all.features) {
		const watched = wanted.get(f.properties.shapeISO);
		if (!watched) continue;
		features.push({
			type: 'Feature',
			properties: {
				iso: watched.iso,
				uid: watched.uid,
				name_pl: watched.namePl,
				borders_poland: watched.bordersPoland
			},
			geometry: simplifyGeometry(f.geometry, TOLERANCE)
		});
	}

	const missing = [...wanted.keys()].filter((iso) => !features.some((f) => f.properties.iso === iso));
	if (missing.length > 0) throw new Error(`oblasts not found in source data: ${missing.join(', ')}`);

	writeOut('src/lib/data/ua-oblasts.json', { type: 'FeatureCollection', features });
}

function writeOut(rel, geojson) {
	const json = JSON.stringify(geojson);
	writeFileSync(join(ROOT, rel), json, 'utf8');
	const vertices = geojson.features.reduce((n, f) => n + countVertices(f.geometry), 0);
	console.log(`wrote ${rel} - ${(json.length / 1024).toFixed(0)} KB, ${vertices} vertices`);
}

async function fetchJson(url) {
	const res = await fetch(url, { headers: { 'User-Agent': 'granica-alert build script' } });
	if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
	return res.json();
}

function allRings(geometry) {
	if (geometry.type === 'Polygon') return geometry.coordinates;
	return geometry.coordinates.flat();
}

function outerRings(geometry) {
	if (geometry.type === 'Polygon') return [geometry.coordinates[0]];
	return geometry.coordinates.map((poly) => poly[0]);
}

function countVertices(geometry) {
	return allRings(geometry).reduce((n, ring) => n + ring.length, 0);
}

/** Which voivodeship contains this powiat. */
function locate(geometry, wojRings) {
	const ring = largestRing(geometry);
	const candidates = [centroid(ring), ...sampleVertices(ring)];

	for (const point of candidates) {
		const hits = wojRings.filter((w) => pointInRings(point, w.rings));
		if (hits.length === 1) return hits[0].nazwa;
	}
	return null;
}

function largestRing(geometry) {
	let best = null;
	let bestArea = -1;
	for (const ring of outerRings(geometry)) {
		const area = Math.abs(signedArea(ring));
		if (area > bestArea) {
			bestArea = area;
			best = ring;
		}
	}
	return best;
}

function signedArea(ring) {
	let a = 0;
	for (let i = 0; i < ring.length - 1; i++) {
		a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
	}
	return a / 2;
}

function centroid(ring) {
	const a = signedArea(ring);
	if (Math.abs(a) < 1e-14) return ring[0];
	let cx = 0;
	let cy = 0;
	for (let i = 0; i < ring.length - 1; i++) {
		const f = ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
		cx += (ring[i][0] + ring[i + 1][0]) * f;
		cy += (ring[i][1] + ring[i + 1][1]) * f;
	}
	return [cx / (6 * a), cy / (6 * a)];
}

/** A concave powiat can have its centroid outside itself; fall back to vertices. */
function sampleVertices(ring) {
	const step = Math.max(1, Math.floor(ring.length / 20));
	const out = [];
	for (let i = 0; i < ring.length; i += step) out.push(ring[i]);
	return out;
}

function pointInRings([x, y], rings) {
	let inside = false;
	for (const ring of rings) {
		for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
			const [xi, yi] = ring[i];
			const [xj, yj] = ring[j];
			if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-18) + xi) {
				inside = !inside;
			}
		}
	}
	return inside;
}

function simplifyGeometry(geometry, tolerance) {
	if (geometry.type === 'Polygon') {
		return { type: 'Polygon', coordinates: simplifyPolygon(geometry.coordinates, tolerance) };
	}
	return {
		type: 'MultiPolygon',
		coordinates: geometry.coordinates
			.map((poly) => simplifyPolygon(poly, tolerance))
			.filter((poly) => poly.length > 0)
	};
}

function simplifyPolygon(rings, tolerance) {
	return rings
		.map((ring) => {
			const simplified = douglasPeucker(ring, tolerance);
			// A ring needs 3 distinct points plus the closing point to stay valid.
			if (simplified.length < 4) return null;
			simplified[simplified.length - 1] = simplified[0];
			return simplified;
		})
		.filter(Boolean);
}

function douglasPeucker(points, tolerance) {
	if (points.length <= 3) return points.slice();

	let maxDist = 0;
	let index = 0;
	const [start, end] = [points[0], points[points.length - 1]];

	for (let i = 1; i < points.length - 1; i++) {
		const dist = perpendicularDistance(points[i], start, end);
		if (dist > maxDist) {
			maxDist = dist;
			index = i;
		}
	}

	if (maxDist <= tolerance) return [start, end];

	return [
		...douglasPeucker(points.slice(0, index + 1), tolerance).slice(0, -1),
		...douglasPeucker(points.slice(index), tolerance)
	];
}

function perpendicularDistance([px, py], [x1, y1], [x2, y2]) {
	const dx = x2 - x1;
	const dy = y2 - y1;
	if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
	const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
	const clamped = Math.max(0, Math.min(1, t));
	return Math.hypot(px - (x1 + clamped * dx), py - (y1 + clamped * dy));
}

function renderNamesModule(voivodeships, powiats, powiatVoivodeships) {
	const list = (xs) => xs.map((x) => `\t${JSON.stringify(x)},`).join('\n');
	const entries = powiats
		.map((name) => `\t${JSON.stringify(name)}: [${powiatVoivodeships[name].map((v) => JSON.stringify(v)).join(', ')}],`)
		.join('\n');

	return `// GENERATED by scripts/gen-admin-data.mjs - do not edit by hand.
// Source: GUGiK Państwowy Rejestr Granic, via ppatrzyk/polska-geojson.

/** All 16 voivodeships, canonical nominative, exactly as in wojewodztwa.json. */
export const VOIVODESHIPS: readonly string[] = [
${list(voivodeships)}
];

/** Every powiat name, canonical, exactly as in powiaty.json. */
export const POWIATS: readonly string[] = [
${list(powiats)}
];

/**
 * Which voivodeship(s) a powiat name belongs to. Ten names are shared by two
 * voivodeships ("powiat świdnicki" is both dolnośląskie and lubelskie), so a name
 * with more than one entry cannot be placed on the map without further context.
 */
export const POWIAT_VOIVODESHIPS: Readonly<Record<string, readonly string[]>> = {
${entries}
};
`;
}

await main();
