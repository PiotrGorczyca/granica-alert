/** Shapes the UI shares with the Convex queries. */

export type PowiatRef = {
	name: string;
	voivodeship: string;
};

export type AlertAreas = {
	voivodeships: string[];
	powiats: PowiatRef[];
	/** Named by the source but not placeable on the map - shown as text only. */
	unplaceablePowiats: string[];
};

export type ActiveOblast = {
	uid: number;
	iso: string;
	name_uk: string;
	name_pl: string;
	scope: 'full' | 'partial';
	borders_poland: boolean;
};

/**
 * What we can honestly say about the air-threat picture. 'cancelled' is the only
 * all-clear we assert, because it is the only one RCB states.
 */
export type RcbAirState = 'active' | 'cancelled' | 'no_confirmation' | 'none';

export type MapLayers = {
	alertAreas: boolean;
	uaOblasts: boolean;
	borderPoints: boolean;
};
