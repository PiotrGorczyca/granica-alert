/**
 * Map colours, matching the app's tokens in src/routes/layout.css.
 *
 * Kept deliberately calm: the map's job is to answer "does this concern where I
 * live", not to look like a threat display. Only areas an official source
 * actually named are ever filled.
 */
export const MAP_COLORS = {
	ink: '#1c2430',
	inkMuted: '#5c6675',
	surface: '#ffffff',
	/** RCB air alert in force. */
	attention: '#b86a1c',
	/** Boundary lines for context, never an alert. */
	boundary: '#8d95a1',
	/** Ukrainian oblast under air-raid alarm. */
	uaAlarm: '#a9483d',
	borderCrossing: '#3a5f7a'
} as const;

/** Eastern Poland plus the border strip - what this app is actually about. */
export const EASTERN_POLAND_BOUNDS: [[number, number], [number, number]] = [
	[20.9, 49.0],
	[24.3, 54.5]
];
