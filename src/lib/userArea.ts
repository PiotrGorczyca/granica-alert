import { browser } from '$app/environment';
import type { AlertAreas, ActiveOblast } from './types';

const STORAGE_KEY = 'granica-alert:my-area';

/**
 * The voivodeship the user says they live in.
 *
 * Stored in this browser only. Nothing is sent anywhere, and no location
 * permission is asked for - a civic tool for a border region should not be
 * collecting where its users are.
 */
export function loadMyArea(): string | null {
	if (!browser) return null;
	try {
		return localStorage.getItem(STORAGE_KEY);
	} catch {
		// Private windows and blocked site data both throw here.
		return null;
	}
}

export function saveMyArea(voivodeship: string | null): void {
	if (!browser) return;
	try {
		if (voivodeship) localStorage.setItem(STORAGE_KEY, voivodeship);
		else localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Not being able to remember the choice is survivable; crashing is not.
	}
}

export type AreaVerdict =
	| { kind: 'unset' }
	| { kind: 'clear'; area: string }
	| { kind: 'alert'; area: string; scope: 'voivodeship' | 'powiat'; powiats: string[] };

/**
 * Does the alert in force actually cover the user's voivodeship?
 *
 * This is the question the app exists to answer, so it is computed from the
 * areas the issuer named, never from proximity or guesswork.
 */
export function verdictFor(myArea: string | null, areas: AlertAreas | null): AreaVerdict {
	if (!myArea) return { kind: 'unset' };
	if (!areas) return { kind: 'clear', area: myArea };

	const powiatsHere = areas.powiats.filter((p) => p.voivodeship === myArea);
	if (powiatsHere.length > 0) {
		return {
			kind: 'alert',
			area: myArea,
			scope: 'powiat',
			powiats: powiatsHere.map((p) => p.name)
		};
	}

	if (areas.voivodeships.includes(myArea)) {
		return { kind: 'alert', area: myArea, scope: 'voivodeship', powiats: [] };
	}

	return { kind: 'clear', area: myArea };
}

/** Oblasts under alarm that border Poland - the ones worth flagging first. */
export function borderingOblasts(oblasts: ActiveOblast[]): ActiveOblast[] {
	return oblasts.filter((o) => o.borders_poland);
}
