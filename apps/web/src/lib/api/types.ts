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

/**
 * Statistiche SPANCO restituite dall'endpoint
 * `/api/statistics/negotiations/spanco`.
 *
 * Le chiavi sono le lettere presenti nella risposta e i valori
 * sono i conteggi di trattative attive per quello stato.
 */
export type SpancoStatistics = Partial<Record<SpancoStage, number>>;

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

// --- Import API (Excel/CSV clients) ---

/** One suggested mapping from analysis: Excel column name → DB field name. */
export interface ImportMatchedColumn {
	excel_column: string;
	db_column: string;
}

/** Response from POST /api/import/check (file analysis). */
export interface ImportCheckResponse {
	file_token: string;
	file_extension: string;
	matched_columns: ImportMatchedColumn[];
	unmatched_excel_columns: string[];
	missing_db_columns: string[];
	all_db_columns: string[];
}

/** Response from POST /api/import/confirm (execute import). */
export interface ImportConfirmResponse {
	imported_count: number;
	errors: string[];
}

// --- Global Search API (POST /api/search) ---

/** Single client in search results (clients_with_negotiations / clients_without_negotiations). */
export interface SearchClientResult {
	id: number;
	ragione_sociale: string;
	p_iva: string | null;
	email: string | null;
	telefono: string | null;
	tipologia: string | null;
}

/** Referent row in search results (id = negotiation ID). */
export interface SearchReferentResult {
	id: number;
	referente: string;
	client_id: number;
	data_apertura: string;
	spanco: string;
	client: { ragione_sociale: string };
}

/** Response from POST /api/search (smart search for clients and referents). */
export interface SearchResponse {
	clients_with_negotiations: SearchClientResult[];
	referents: SearchReferentResult[];
	clients_without_negotiations: SearchClientResult[];
}
