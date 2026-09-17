/**
 * Western Ukrainian oblasts we watch, and how to recognise them in the
 * alerts.in.ua payload.
 *
 * The uid and Ukrainian name were read off the live API (GET
 * /v1/regions/<uid>/alerts/month_ago.json), not guessed. Two details matter:
 *
 *  - `location_oblast_uid` in the payload is NOT reliable for sub-oblast alerts
 *    (a Kharkiv hromada reports its own uid there), so matching is done on the
 *    `location_oblast` name string, with `location_uid` used only for alerts
 *    that are themselves oblast-wide.
 *  - Alerts in these oblasts usually arrive at raion level ("Львівський район"),
 *    so filtering to location_type === 'oblast' would miss nearly all of them.
 */
export type WatchedOblast = {
	uid: number;
	/** ISO 3166-2 code - how the map's boundary data identifies the oblast. */
	iso: string;
	nameUk: string;
	namePl: string;
	/** Shares a land border with Poland - the ones that precede a Polish alert. */
	bordersPoland: boolean;
};

export const WATCHED_OBLASTS: readonly WatchedOblast[] = [
	{
		uid: 8,
		iso: 'UA-07',
		nameUk: 'Волинська область',
		namePl: 'obwód wołyński',
		bordersPoland: true
	},
	{
		uid: 27,
		iso: 'UA-46',
		nameUk: 'Львівська область',
		namePl: 'obwód lwowski',
		bordersPoland: true
	},
	{
		uid: 5,
		iso: 'UA-56',
		nameUk: 'Рівненська область',
		namePl: 'obwód rówieński',
		bordersPoland: false
	},
	{
		uid: 11,
		iso: 'UA-21',
		nameUk: 'Закарпатська область',
		namePl: 'obwód zakarpacki',
		bordersPoland: false
	}
];

export type OblastAlert = {
	uid: number;
	iso: string;
	name_uk: string;
	name_pl: string;
	/** 'full' when the whole oblast is under alarm, 'partial' for raion/hromada. */
	scope: 'full' | 'partial';
	borders_poland: boolean;
};

type RawAlert = {
	alert_type?: string;
	location_type?: string;
	location_title?: string;
	location_oblast?: string;
	location_uid?: string;
};

/**
 * Which watched oblasts currently have an air-raid alarm.
 *
 * Only `air_raid` counts: artillery and urban-fight alerts describe fighting on
 * the ground and say nothing about aircraft over the border.
 */
export function activeWesternOblasts(payload: unknown): OblastAlert[] {
	const alerts = extractAlerts(payload);
	const found = new Map<number, OblastAlert>();

	for (const alert of alerts) {
		if (alert.alert_type !== 'air_raid') continue;

		const oblastName = alert.location_oblast ?? alert.location_title;
		const watched = WATCHED_OBLASTS.find((o) => o.nameUk === oblastName);
		if (!watched) continue;

		const isWholeOblast =
			alert.location_type === 'oblast' && String(alert.location_uid) === String(watched.uid);

		const existing = found.get(watched.uid);
		// A whole-oblast alarm outranks a raion one if both are somehow present.
		if (existing && (existing.scope === 'full' || !isWholeOblast)) continue;

		found.set(watched.uid, {
			uid: watched.uid,
			iso: watched.iso,
			name_uk: watched.nameUk,
			name_pl: watched.namePl,
			scope: isWholeOblast ? 'full' : 'partial',
			borders_poland: watched.bordersPoland
		});
	}

	return [...found.values()].sort((a, b) => a.uid - b.uid);
}

/** The API wraps its list in `{ alerts: [...] }`; tolerate a bare array too. */
function extractAlerts(payload: unknown): RawAlert[] {
	if (Array.isArray(payload)) return payload as RawAlert[];
	if (payload && typeof payload === 'object') {
		const alerts = (payload as { alerts?: unknown }).alerts;
		if (Array.isArray(alerts)) return alerts as RawAlert[];
	}
	return [];
}
