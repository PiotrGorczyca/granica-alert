/**
 * Are we actually watching RCB right now?
 *
 * "No alert" is only a statement about the world if we have been looking. When
 * the poller is failing or has fallen behind, the honest thing to report is that
 * we are blind - otherwise the app reassures people out of its own silence,
 * which is the failure mode this project exists to avoid.
 */

/** RCB is polled every 5 minutes; beyond this we are no longer current. */
export const RCB_FRESHNESS_TOLERANCE_MINUTES = 20;

export function isSourceFresh(
	status: 'ok' | 'error' | 'stale' | null | undefined,
	lastSuccessfulFetch: string | null | undefined,
	now: number = Date.now(),
	toleranceMinutes: number = RCB_FRESHNESS_TOLERANCE_MINUTES
): boolean {
	if (status !== 'ok') return false;
	if (!lastSuccessfulFetch) return false;

	const ageMinutes = (now - Date.parse(lastSuccessfulFetch)) / 60_000;
	if (!Number.isFinite(ageMinutes)) return false;

	// A timestamp in the future means a clock we cannot trust, not freshness.
	if (ageMinutes < 0) return false;

	return ageMinutes <= toleranceMinutes;
}
