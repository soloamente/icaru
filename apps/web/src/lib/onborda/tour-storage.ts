export const MAIN_TOUR_NAME = "main" as const;
export const CLIENTS_TOUR_NAME = "clienti" as const;
export const NEGOTIATIONS_TOUR_NAME = "trattative" as const;
export const TEAM_TOUR_NAME = "team" as const;
export const STATS_TOUR_NAME = "statistiche" as const;
export const MAIN_TOUR_VERSION = "2026-04-29" as const;

/**
 * sessionStorage: id numerico del primo team (lista direttore) per aprire il dettaglio nel tour.
 * Chiave con prefisso `tractab-tour` per allineamento al brand Tracta B.
 */
export const TOUR_FIRST_TEAM_SESSION_KEY =
	"tractab-tour:first-team-id" as const;

/**
 * sessionStorage: sul dettaglio team ci sono membri nell’organigramma → step tour su «Dettagli venditore».
 */
export const TOUR_TEAM_HAS_MEMBERS_SESSION_KEY =
	"tractab-tour:team-detail-has-members" as const;

/** Evento window: la lista team nel client ha aggiornato la chiave sessione sopra */
export const TOUR_TEAMS_UPDATED_EVENT = "tractab-tour-teams-updated" as const;

export type TourName =
	| typeof MAIN_TOUR_NAME
	| typeof CLIENTS_TOUR_NAME
	| typeof NEGOTIATIONS_TOUR_NAME
	| typeof TEAM_TOUR_NAME
	| typeof STATS_TOUR_NAME;

type TourState = "completed" | "skipped";

interface TourStorageIdentity {
	email?: string | null;
	role?: string | null;
}

const normalizeStoragePart = (value: string | null | undefined): string =>
	(value?.trim().toLowerCase() || "anonymous").replaceAll(/\s+/g, "-");

/** Chiave localStorage per stato tour principale; include slug prodotto `tractab` (Tracta B). */
export const getTourStorageKey = ({
	email,
	role,
}: TourStorageIdentity): string =>
	[
		"tractab",
		"onborda",
		MAIN_TOUR_NAME,
		MAIN_TOUR_VERSION,
		normalizeStoragePart(role),
		normalizeStoragePart(email),
	].join(":");

export const readTourState = (key: string): TourState | null => {
	if (typeof window === "undefined") {
		return null;
	}
	let value: string | null;
	try {
		value = window.localStorage.getItem(key);
	} catch {
		return null;
	}
	if (value === "completed" || value === "skipped") {
		return value;
	}
	return null;
};

export const writeTourState = (key: string, state: TourState): void => {
	if (typeof window === "undefined") {
		return;
	}
	try {
		window.localStorage.setItem(key, state);
	} catch {
		return;
	}
};
