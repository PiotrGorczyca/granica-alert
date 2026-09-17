/**
 * How often a stored komunikat is worth re-reading.
 *
 * RCB edits a komunikat in place, and the edit we care about - the "wysłany do
 * odbiorców na terenie woj: ..." line that is the only geography in the feed -
 * lands within roughly the first couple of hours. After that, edits are rare.
 *
 * So attention is spent where the changes are: every poll while a komunikat is
 * fresh, then tapering, then stopping. Without this taper the poller re-read
 * every komunikat in a 48-hour window every five minutes, which is ~2,300
 * requests a day to gov.pl for content that had not changed.
 */

type Tier = {
	/** Applies to komunikaty younger than this. */
	underAgeHours: number;
	/** Minimum gap between re-reads. */
	everyMinutes: number;
	/** Only re-read if we still have no area for it. */
	onlyIfAreaMissing: boolean;
};

const TIERS: Tier[] = [
	// While RCB is still likely to be editing: every poll.
	{ underAgeHours: 2, everyMinutes: 5, onlyIfAreaMissing: false },
	// Late corrections and stand-downs still happen; check occasionally.
	{ underAgeHours: 12, everyMinutes: 30, onlyIfAreaMissing: false },
	// Effectively settled - only worth a look if we never got an area.
	{ underAgeHours: 48, everyMinutes: 180, onlyIfAreaMissing: true }
];

export type RefreshCandidate = {
	publishedAt: string;
	lastRefreshedAt?: string | null;
	hasArea: boolean;
};

/** Is this komunikat due for a re-read right now? */
export function isDueForRefresh(candidate: RefreshCandidate, now: number = Date.now()): boolean {
	const ageHours = (now - Date.parse(candidate.publishedAt)) / 3_600_000;
	if (!Number.isFinite(ageHours) || ageHours < 0) return false;

	const tier = TIERS.find((t) => ageHours < t.underAgeHours);
	// Past the last tier: RCB does not revisit komunikaty this old.
	if (!tier) return false;

	if (tier.onlyIfAreaMissing && candidate.hasArea) return false;

	// Never re-read yet - always due.
	if (!candidate.lastRefreshedAt) return true;

	const sinceMinutes = (now - Date.parse(candidate.lastRefreshedAt)) / 60_000;
	if (!Number.isFinite(sinceMinutes)) return true;

	return sinceMinutes >= tier.everyMinutes;
}

/** Oldest tier boundary - komunikaty beyond it are never re-read. */
export const REFRESH_WINDOW_HOURS = TIERS[TIERS.length - 1].underAgeHours;
