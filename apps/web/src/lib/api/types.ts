/**
 * Types for the Laravel backend API (compravendita).
 * Base URL: https://web-production-7ff544.up.railway.app/
 */

/** Role names from API: Admin, Director, Seller (Venditore) */
export type RoleName = "Admin" | "Director" | "Venditore";

export interface ApiRole {
	nome: RoleName;
}

export interface ApiCompany {
	id: number;
	ragione_sociale: string;
	[key: string]: unknown;
}

export interface ApiUser {
	id: number;
	email: string;
	role: ApiRole;
	company?: ApiCompany | null;
	[key: string]: unknown;
}

/** Response from POST /login */
export interface LoginResponse {
	access_token: string;
	token_type: "Bearer";
	user: ApiUser;
	must_change_password: boolean;
}

/** Normalized role for app (Venditore → Seller) */
export type AppRole = "admin" | "director" | "seller";

export function roleFromApi(role: ApiRole | undefined): AppRole {
	if (!role?.nome) {
		return "seller";
	}
	const n = role.nome.toLowerCase();
	if (n === "admin") {
		return "admin";
	}
	if (n === "director") {
		return "director";
	}
	return "seller";
}

// --- Clients API ---

/** Client from GET /clients. Sellers see only own clients; Directors see all company clients. */
export interface ApiClient {
	id: number;
	ragione_sociale: string;
	partita_iva?: string | null;
	[key: string]: unknown;
}

// --- Negotiations API ---

/** Spanco stage enum: S, P, A, N, C, O */
export type SpancoStage = "S" | "P" | "A" | "N" | "C" | "O";

/** Percentuale avanzamento: 0–100 in 20% increments */
export type PercentualeAvanzamento = 0 | 20 | 40 | 60 | 80 | 100;

export interface ApiNegotiationClient {
	id: number;
	ragione_sociale?: string;
	[key: string]: unknown;
}

export interface ApiNegotiation {
	id: number;
	client_id: number;
	referente: string;
	spanco: SpancoStage;
	importo: number;
	/** 0–100, avanzamento in step da 20% */
	percentuale: number;
	note: string | null;
	abbandonata: boolean;
	created_at?: string;
	updated_at?: string;
	/** Client relation when included */
	client?: ApiNegotiationClient;
}

export interface CreateNegotiationBody {
	client_id: number;
	referente: string;
	spanco: SpancoStage;
	importo: number;
	/** 0–100, in 20% increments */
	percentuale: number;
	note?: string;
}

export interface UpdateNegotiationBody {
	spanco?: SpancoStage;
	percentuale?: number;
	importo?: number;
	abbandonata?: boolean;
}
