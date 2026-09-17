/**
 * What we can honestly say about the air-threat picture.
 *
 *  active          - issued recently, RCB has not called it off
 *  cancelled       - RCB published a stand-down; the only all-clear we assert
 *  no_confirmation - past our window with no stand-down published: state unknown
 *  none            - nothing recent enough to be worth showing
 *
 * The distinction between `no_confirmation` and `none` is the point of this
 * module. RCB does not publish a stand-down for every alert, so its silence is
 * not an all-clear, and showing one would be inventing a fact about a threat.
 */
export type RcbAirState = 'active' | 'cancelled' | 'no_confirmation' | 'none';

/** How long after issue an alert is presented as in force. Our convention. */
export const RCB_AIR_ACTIVE_MINUTES = 120;

/** How long an uncancelled alert stays worth mentioning as unresolved. */
export const RCB_AIR_MENTION_HOURS = 12;

export type AirAlertSnapshot = {
	publishedAt: string;
	/** 'detected' means we timed it ourselves; 'day' means we only know the date. */
	timePrecision: 'detected' | 'day' | null | undefined;
	cancelled: boolean;
};

export function airStateOf(
	alert: AirAlertSnapshot | null | undefined,
	now: number = Date.now()
): RcbAirState {
	if (!alert) return 'none';

	// A stand-down is the one thing RCB states outright, so it outranks any
	// window of ours.
	if (alert.cancelled) return 'cancelled';

	const publishedAt = Date.parse(alert.publishedAt);
	if (!Number.isFinite(publishedAt)) return 'none';

	const ageMinutes = (now - publishedAt) / 60_000;
	if (ageMinutes < 0) return 'none';

	// Only a komunikat we timed ourselves can be called current. A day-precision
	// timestamp came from a backfill and says nothing about the hour it was
	// issued, so treating it as fresh would light up the map for a threat that
	// may have ended hours earlier.
	if (alert.timePrecision === 'detected' && ageMinutes <= RCB_AIR_ACTIVE_MINUTES) {
		return 'active';
	}

	if (ageMinutes <= RCB_AIR_MENTION_HOURS * 60) return 'no_confirmation';

	return 'none';
}
