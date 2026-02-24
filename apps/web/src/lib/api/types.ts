/**
 * Types for the Laravel backend API (compravendita).
 * Base URL: https://web-production-7ff544.up.railway.app/
 */

/** Role names from API: Admin, Direttore Vendite, Venditore */
export type RoleName = "Admin" | "Direttore Vendite" | "Venditore";

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
	/** Numeric role id from API: 1 = Admin, 2 = Direttore Vendite, 3 = Venditore */
	role_id?: number;
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

/**
 * Map API role to normalized app role.
 * Accepts both the `role` object (with `nome`) and the numeric `role_id`
 * so that the mapping works regardless of which field the API populates.
 *
 * role.nome values: "Admin", "Direttore Vendite", "Venditore"
 * role_id values:   1 = Admin, 2 = Direttore Vendite, 3 = Venditore
 */
export function roleFromApi(
	role: ApiRole | undefined,
	roleId?: number
): AppRole {
	if (role?.nome) {
		const n = role.nome.toLowerCase();
		if (n === "admin") {
			return "admin";
		}
		if (n === "direttore vendite" || n === "director") {
			return "director";
		}
		if (n === "venditore") {
			return "seller";
		}
	}
	// Fallback to numeric role_id when role object is missing or unrecognised
	if (roleId === 1) {
		return "admin";
	}
	if (roleId === 2) {
		return "director";
	}
	return "seller";
}

// --- Clients API ---

/** Address object included with every client from GET /clients. Fields may be null if missing from API. */
export interface ApiClientAddress {
	id: number;
	client_id: number;
	indirizzo?: string | null;
	citta?: string | null;
	CAP?: string | null;
	provincia?: string | null;
	regione?: string | null;
	/** Latitude from geocoding (present when client has coordinates, e.g. /negotiations/me/with-coordinates). */
	latitude?: number | null;
	/** Longitude from geocoding. */
	longitude?: number | null;
	/** True when geocoding failed for this address. */
	geocoding_failed?: boolean;
}

/**
 * Lightweight client item from GET /clients/without-negotiations (id + nome only).
 * Used for the "Cliente" select in the new negotiation form.
 */
export interface ApiClientWithoutNegotiation {
	id: number;
	nome: string;
}

/**
 * Client from GET /api/clients/me or GET /api/clients/company.
 * Venditore/Direttore: propri clienti (/me). Direttore Vendite: tutta l'azienda (/company).
 * Ogni cliente include sempre l'oggetto address nella risposta API.
 */
export interface ApiClient {
	id: number;
	ragione_sociale: string;
	email?: string | null;
	p_iva?: string | null;
	telefono?: string | null;
	/** Tipologia cliente restituita dall'API (es. categoria/segmento). */
	tipologia?: string | null;
	company_id?: number;
	user_id?: number;
	/** Sempre presente nella risposta API (GET /api/clients). */
	address?: ApiClientAddress | null;
	[key: string]: unknown;
}

/**
 * Payload per la creazione di un nuovo cliente tramite
 * `POST /api/clients`. I campi dell'indirizzo sono "flattened"
 * nel body come indicato dalla documentazione Laravel: il backend
 * si occupa di creare/aggiornare la riga nella tabella `addresses`.
 */
export interface CreateClientBody {
	ragione_sociale: string;
	email?: string | null;
	telefono?: string | null;
	p_iva?: string | null;
	/** Tipologia cliente (categoria/segmento) opzionale. */
	tipologia?: string | null;
	// Campi indirizzo opzionali ma raccomandati
	indirizzo?: string | null;
	citta?: string | null;
	cap?: string | null;
	provincia?: string | null;
	regione?: string | null;
}

/**
 * Payload per l'aggiornamento di un cliente esistente tramite
 * `PUT /api/clients/{id}`. Tutti i campi sono opzionali così
 * possiamo inviare solo quelli effettivamente modificati dal form.
 *
 * Come per `CreateClientBody`, i dati di indirizzo viaggiano nel
 * body principale e il backend gestisce in autonomia la tabella
 * `addresses` (creazione/aggiornamento).
 */
export interface UpdateClientBody {
	ragione_sociale?: string;
	email?: string | null;
	telefono?: string | null;
	p_iva?: string | null;
	tipologia?: string | null;
	indirizzo?: string | null;
	citta?: string | null;
	cap?: string | null;
	provincia?: string | null;
	regione?: string | null;
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

/**
 * Confronto mensile (questo mese vs mese precedente) per statistiche trattative.
 * Usato in NegotiationsStatistics per aperte e concluse.
 */
export interface NegotiationsMonthlyComparison {
	current_month: number;
	previous_month: number;
	diff: number;
	percentage: number;
}

/**
 * Risposta GET /api/statistics/negotiations — Statistiche trattative per utente autenticato.
 * Trattativa aperta: non abbandonata, Spanco != 'O', percentuale < 100.
 * Trattativa conclusa: Spanco 'O' oppure percentuale 100%.
 */
export interface NegotiationsStatistics {
	total_open_negotiations: number;
	conclusion_percentage: number;
	average_open_amount: number;
	average_concluded_amount: number;
	/** Totale importo trattative aperte (stringa numerica dall'API). */
	total_open_amount: string;
	average_closing_days: number;
}

/** Percentuale avanzamento: 0–100 in 20% increments */
export type PercentualeAvanzamento = 0 | 20 | 40 | 60 | 80 | 100;

export interface ApiNegotiationClient {
	id: number;
	/** Ragione sociale del cliente associato alla trattativa (quando incluso nella risposta). */
	ragione_sociale?: string;
	/** Telefono del cliente, se il backend lo include nella relazione `client` della trattativa. */
	telefono?: string | null;
	/** Address with coordinates when fetching from /negotiations/me/with-coordinates. */
	address?: ApiClientAddress | null;
	[key: string]: unknown;
}

/** File attachment returned with negotiation (e.g. GET /negotiations/{id}) */
export interface ApiNegotiationFile {
	id: number;
	/** Original filename when present */
	file_name?: string | null;
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
	/** Data di apertura della trattativa (separata da created_at nell'API Laravel). */
	data_apertura?: string;
	/** Data di chiusura quando la trattativa è conclusa (se esposta dall'API). */
	data_chiusura?: string;
	/** Data di abbandono quando la trattativa è abbandonata (se esposta dall'API). */
	data_abbandono?: string;
	created_at?: string;
	updated_at?: string;
	/** Client relation when included */
	client?: ApiNegotiationClient;
	/** File attachments when included in response */
	files?: ApiNegotiationFile[];
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
	/** Referente (contact person) — editable on update */
	referente?: string;
	/** Note — editable on update */
	note?: string | null;
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

// --- Teams API ---
// Endpoints: GET /api/teams, GET /api/teams/my-teams, GET /api/teams/available-members,
// POST /api/teams, GET /api/teams/{id}, PUT /api/teams/{id}, DELETE /api/teams/{id},
// POST /api/teams/{id}/members, DELETE /api/teams/{id}/members/{userId},
// GET /api/teams/{id}/stats

/** Creator sub-object included in team responses (id, nome, cognome). */
export interface ApiTeamCreator {
	id: number;
	nome: string;
	cognome: string;
}

/** Pivot data for team_user relationship. */
export interface ApiTeamUserPivot {
	team_id: number;
	user_id: number;
	created_at: string;
	updated_at: string;
}

/** Team member as returned in team detail / create / update responses. */
export interface ApiTeamUser {
	id: number;
	nome: string;
	cognome: string;
	email: string;
	pivot: ApiTeamUserPivot;
}

/** Role sub-object for available members. */
export interface ApiAvailableMemberRole {
	id: number;
	nome: string;
}

/**
 * Available member from GET /api/teams/available-members.
 * Includes venditori and other direttori vendite (excluding the current user).
 */
export interface ApiAvailableMember {
	id: number;
	nome: string;
	cognome: string;
	email: string;
	role_id: number;
	role: ApiAvailableMemberRole;
}

/**
 * Full team object from GET /api/teams (list) and GET /api/teams/{id} (detail).
 * `users` array is present in detail/create/update responses but absent in list.
 * `users_count` and `effective_members_count` are present in list and detail.
 */
export interface ApiTeam {
	id: number;
	nome: string;
	description: string | null;
	data_creazione: string;
	company_id: number;
	creator_id: number;
	creator_participates: boolean;
	created_at: string;
	updated_at: string;
	/** Number of users in the pivot table (without creator). Present in list/detail. */
	users_count?: number;
	/** Effective members including creator if creator_participates. Present in list/detail. */
	effective_members_count?: number;
	creator: ApiTeamCreator;
	/** Member list — present in detail, create, update responses. */
	users?: ApiTeamUser[];
}

/**
 * Minimal team from GET /api/teams/my-teams (Venditore / Direttore).
 * Payload volutamente ridotto: solo id, nome, creator_name.
 */
export interface ApiTeamMinimal {
	id: number;
	nome: string;
	creator_name: string;
}

/** Stats bucket (count + total amount) for pipeline / concluded / abandoned. */
export interface ApiTeamStatsBucket {
	count: number;
	total_importo: number;
}

/** Response from GET /api/teams/{id}/stats — aggregate metrics for team negotiations. */
export interface ApiTeamStats {
	team_id: number;
	effective_members_count: number;
	member_ids: number[];
	pipeline: ApiTeamStatsBucket;
	concluded: ApiTeamStatsBucket;
	abandoned: ApiTeamStatsBucket;
}

/** Request body for POST /api/teams (create team). */
export interface CreateTeamBody {
	nome: string;
	description?: string | null;
	creator_participates?: boolean;
	/** Array of user ids to add as members. Must belong to same company. */
	members?: number[];
}

/**
 * Request body for PUT /api/teams/{id} (update team).
 * All fields are optional — send only what changed.
 * IMPORTANT: if `members` is sent it performs a SYNC (replaces all members).
 */
export interface UpdateTeamBody {
	nome?: string;
	description?: string | null;
	creator_participates?: boolean;
	/** Full member list — REPLACES existing members. Omit to leave members unchanged. */
	members?: number[];
}

/** Request body for POST /api/teams/{id}/members (add members without removing existing). */
export interface AddTeamMembersBody {
	/** Array of user ids to add. Min 1 element. Must belong to same company. */
	members: number[];
}
