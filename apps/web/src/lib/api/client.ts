/**
 * API client for the Laravel backend.
 * Base URL: https://web-production-7ff544.up.railway.app/
 * Headers for protected routes: Authorization: Bearer <access_token>, Accept: application/json
 */

import type {
	ApiClient,
	ApiClientWithoutNegotiation,
	ApiNegotiation,
	CreateNegotiationBody,
	ImportCheckResponse,
	ImportConfirmResponse,
	LoginResponse,
	SearchResponse,
	SpancoStatistics,
	UpdateNegotiationBody,
} from "./types";

const BASE_URL =
	(typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
	"https://web-production-7ff544.up.railway.app/api";

const DEFAULT_HEADERS: HeadersInit = {
	Accept: "application/json",
	"Content-Type": "application/json",
};

function getAuthHeaders(accessToken: string): HeadersInit {
	return {
		...DEFAULT_HEADERS,
		Authorization: `Bearer ${accessToken}`,
	};
}

/**
 * POST /api/auth/login (Next.js proxy) — Body: { email, password }
 * Returns access_token and user (with role, company). Proxy forwards to Laravel backend.
 */
export async function login(
	email: string,
	password: string
): Promise<{ data: LoginResponse } | { error: string }> {
	try {
		// Use Next.js API route as proxy to avoid CORS and to handle backend 500 as JSON
		const res = await fetch("/api/auth/login", {
			method: "POST",
			headers: DEFAULT_HEADERS,
			body: JSON.stringify({ email, password }),
		});
		const json = (await res.json()) as
			| LoginResponse
			| { message?: string; errors?: Record<string, string[]> };
		if (!res.ok) {
			const msg =
				typeof (json as { message?: string }).message === "string"
					? (json as { message: string }).message
					: ((json as { errors?: Record<string, string[]> }).errors
							?.email?.[0] ?? "Login fallito.");
			return { error: msg };
		}
		return { data: json as LoginResponse };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		return { error: message };
	}
}

/**
 * GET /me — Returns current user with relations (role, company, teams).
 * Requires Authorization: Bearer <access_token>.
 * On 401 / invalid session returns error with authFailure: true so the app can logout.
 * On network errors returns error without authFailure so we don't log out the user.
 */
export async function getMe(
	accessToken: string
): Promise<
	{ data: LoginResponse["user"] } | { error: string; authFailure?: boolean }
> {
	try {
		const res = await fetch(`${BASE_URL}/me`, {
			method: "GET",
			headers: getAuthHeaders(accessToken),
		});
		const json = (await res.json()) as
			| LoginResponse["user"]
			| { message?: string };
		if (!res.ok) {
			const msg =
				typeof (json as { message?: string }).message === "string"
					? (json as { message: string }).message
					: "Sessione non valida";
			// Only treat as auth failure so we don't logout on 5xx or other server errors
			const authFailure = res.status === 401;
			return { error: msg, authFailure };
		}
		return { data: json as LoginResponse["user"] };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		// Network error (e.g. "Failed to fetch"): do not set authFailure so auth context keeps user
		return { error: message };
	}
}

/**
 * POST /logout — Invalidates token on server.
 * Requires Authorization: Bearer <access_token>.
 */
export async function logout(accessToken: string): Promise<void> {
	try {
		await fetch(`${BASE_URL}/logout`, {
			method: "POST",
			headers: getAuthHeaders(accessToken),
		});
	} catch {
		// Best-effort; clear client state regardless
	}
}

// --- Clients API ---
// Doc: Venditore/Direttore (propri) → GET /api/clients/me; Direttore (azienda) → GET /api/clients/company

/**
 * GET /clients/me — List clients assigned to the logged-in user (Venditore/Direttore Vendite).
 * Ordered by ragione_sociale. Query: ?search= for name or P.IVA if backend supports it.
 */
export async function listClientsMe(
	accessToken: string,
	params?: { search?: string }
): Promise<{ data: ApiClient[] } | { error: string }> {
	try {
		const searchParams = new URLSearchParams();
		if (params?.search?.trim()) {
			searchParams.set("search", params.search.trim());
		}
		const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
		const res = await fetch(`${BASE_URL}/clients/me${query}`, {
			method: "GET",
			headers: getAuthHeaders(accessToken),
		});
		const json = (await res.json()) as ApiClient[] | { message?: string };
		if (!res.ok) {
			const msg =
				typeof (json as { message?: string }).message === "string"
					? (json as { message: string }).message
					: "Errore nel caricamento dei clienti";
			return { error: msg };
		}
		return { data: json as ApiClient[] };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		return { error: message };
	}
}

/**
 * GET /clients/company — List all company clients (solo Direttore Vendite).
 */
export async function listClientsCompany(
	accessToken: string,
	params?: { search?: string }
): Promise<{ data: ApiClient[] } | { error: string }> {
	try {
		const searchParams = new URLSearchParams();
		if (params?.search?.trim()) {
			searchParams.set("search", params.search.trim());
		}
		const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
		const res = await fetch(`${BASE_URL}/clients/company${query}`, {
			method: "GET",
			headers: getAuthHeaders(accessToken),
		});
		const json = (await res.json()) as ApiClient[] | { message?: string };
		if (!res.ok) {
			const msg =
				typeof (json as { message?: string }).message === "string"
					? (json as { message: string }).message
					: "Errore nel caricamento dei clienti";
			return { error: msg };
		}
		return { data: json as ApiClient[] };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		return { error: message };
	}
}

/**
 * GET /clients/without-negotiations — List clients that have no negotiations (lightweight: id, nome).
 * Used to populate the "Cliente" select in the new negotiation form.
 */
export async function listClientsWithoutNegotiations(
	accessToken: string
): Promise<{ data: ApiClientWithoutNegotiation[] } | { error: string }> {
	try {
		const res = await fetch(`${BASE_URL}/clients/without-negotiations`, {
			method: "GET",
			headers: getAuthHeaders(accessToken),
		});
		const json = (await res.json()) as
			| ApiClientWithoutNegotiation[]
			| { message?: string };
		if (!res.ok) {
			const msg =
				typeof (json as { message?: string }).message === "string"
					? (json as { message: string }).message
					: "Errore nel caricamento dei clienti";
			return { error: msg };
		}
		return { data: json as ApiClientWithoutNegotiation[] };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		return { error: message };
	}
}

/**
 * List clients: defaults to "me" (Venditore/Direttore propri).
 * Use listClientsMe or listClientsCompany for explicit scope.
 */
export async function listClients(
	accessToken: string,
	params?: { search?: string }
): Promise<{ data: ApiClient[] } | { error: string }> {
	return listClientsMe(accessToken, params);
}

// --- Negotiations API ---
// Doc: Venditore/Direttore (proprie) → /me, /me/open, /me/abandoned, /me/concluded; Direttore (azienda) → /company

type NegotiationsListParams = { client_id?: number };

function buildNegotiationsQuery(params?: NegotiationsListParams): string {
	const searchParams = new URLSearchParams();
	if (params?.client_id != null) {
		searchParams.set("client_id", String(params.client_id));
	}
	const q = searchParams.toString();
	return q ? `?${q}` : "";
}

/**
 * GET /negotiations/me — All negotiations assigned to the logged-in user.
 */
export async function listNegotiationsMe(
	accessToken: string,
	params?: NegotiationsListParams
): Promise<{ data: ApiNegotiation[] } | { error: string }> {
	try {
		const query = buildNegotiationsQuery(params);
		const res = await fetch(`${BASE_URL}/negotiations/me${query}`, {
			method: "GET",
			headers: getAuthHeaders(accessToken),
		});
		const json = (await res.json()) as ApiNegotiation[] | { message?: string };
		if (!res.ok) {
			const msg =
				typeof (json as { message?: string }).message === "string"
					? (json as { message: string }).message
					: "Errore nel caricamento delle trattative";
			return { error: msg };
		}
		return { data: json as ApiNegotiation[] };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		return { error: message };
	}
}

/**
 * GET /negotiations/me/open — Open negotiations (Spanco != 'O', % < 100, not abandoned).
 */
export async function listNegotiationsMeOpen(
	accessToken: string,
	params?: NegotiationsListParams
): Promise<{ data: ApiNegotiation[] } | { error: string }> {
	try {
		const query = buildNegotiationsQuery(params);
		const res = await fetch(`${BASE_URL}/negotiations/me/open${query}`, {
			method: "GET",
			headers: getAuthHeaders(accessToken),
		});
		const json = (await res.json()) as ApiNegotiation[] | { message?: string };
		if (!res.ok) {
			const msg =
				typeof (json as { message?: string }).message === "string"
					? (json as { message: string }).message
					: "Errore nel caricamento delle trattative";
			return { error: msg };
		}
		return { data: json as ApiNegotiation[] };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		return { error: message };
	}
}

/**
 * GET /negotiations/me/abandoned — Abandoned negotiations (abbandonata = true).
 */
export async function listNegotiationsMeAbandoned(
	accessToken: string,
	params?: NegotiationsListParams
): Promise<{ data: ApiNegotiation[] } | { error: string }> {
	try {
		const query = buildNegotiationsQuery(params);
		const res = await fetch(`${BASE_URL}/negotiations/me/abandoned${query}`, {
			method: "GET",
			headers: getAuthHeaders(accessToken),
		});
		const json = (await res.json()) as ApiNegotiation[] | { message?: string };
		if (!res.ok) {
			const msg =
				typeof (json as { message?: string }).message === "string"
					? (json as { message: string }).message
					: "Errore nel caricamento delle trattative";
			return { error: msg };
		}
		return { data: json as ApiNegotiation[] };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		return { error: message };
	}
}

/**
 * GET /negotiations/me/concluded — Concluded negotiations (Spanco = 'O' OR % = 100).
 */
export async function listNegotiationsMeConcluded(
	accessToken: string,
	params?: NegotiationsListParams
): Promise<{ data: ApiNegotiation[] } | { error: string }> {
	try {
		const query = buildNegotiationsQuery(params);
		const res = await fetch(`${BASE_URL}/negotiations/me/concluded${query}`, {
			method: "GET",
			headers: getAuthHeaders(accessToken),
		});
		const json = (await res.json()) as ApiNegotiation[] | { message?: string };
		if (!res.ok) {
			const msg =
				typeof (json as { message?: string }).message === "string"
					? (json as { message: string }).message
					: "Errore nel caricamento delle trattative";
			return { error: msg };
		}
		return { data: json as ApiNegotiation[] };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		return { error: message };
	}
}

/**
 * GET /negotiations/company — All company negotiations (solo Direttore Vendite).
 */
export async function listNegotiationsCompany(
	accessToken: string,
	params?: NegotiationsListParams
): Promise<{ data: ApiNegotiation[] } | { error: string }> {
	try {
		const query = buildNegotiationsQuery(params);
		const res = await fetch(`${BASE_URL}/negotiations/company${query}`, {
			method: "GET",
			headers: getAuthHeaders(accessToken),
		});
		const json = (await res.json()) as ApiNegotiation[] | { message?: string };
		if (!res.ok) {
			const msg =
				typeof (json as { message?: string }).message === "string"
					? (json as { message: string }).message
					: "Errore nel caricamento delle trattative";
			return { error: msg };
		}
		return { data: json as ApiNegotiation[] };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		return { error: message };
	}
}

/**
 * List negotiations: uses /me by default (all of current user).
 * Prefer listNegotiationsMe, listNegotiationsMeOpen, listNegotiationsMeAbandoned,
 * listNegotiationsMeConcluded, or listNegotiationsCompany for explicit scope/filter.
 */
export async function listNegotiations(
	accessToken: string,
	params?: NegotiationsListParams
): Promise<{ data: ApiNegotiation[] } | { error: string }> {
	return listNegotiationsMe(accessToken, params);
}

/**
 * POST /negotiations — Create a new negotiation.
 */
export async function createNegotiation(
	accessToken: string,
	body: CreateNegotiationBody
): Promise<{ data: ApiNegotiation } | { error: string }> {
	try {
		const res = await fetch(`${BASE_URL}/negotiations`, {
			method: "POST",
			headers: getAuthHeaders(accessToken),
			body: JSON.stringify(body),
		});
		const json = (await res.json()) as ApiNegotiation | { message?: string };
		if (!res.ok) {
			const msg =
				typeof (json as { message?: string }).message === "string"
					? (json as { message: string }).message
					: "Errore nella creazione della trattativa";
			return { error: msg };
		}
		return { data: json as ApiNegotiation };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		return { error: message };
	}
}

/**
 * GET /negotiations/{id} — Fetch a single negotiation by ID.
 */
export async function getNegotiation(
	accessToken: string,
	id: number
): Promise<{ data: ApiNegotiation } | { error: string }> {
	try {
		const res = await fetch(`${BASE_URL}/negotiations/${id}`, {
			method: "GET",
			headers: getAuthHeaders(accessToken),
		});
		const json = (await res.json()) as ApiNegotiation | { message?: string };
		if (!res.ok) {
			const msg =
				typeof (json as { message?: string }).message === "string"
					? (json as { message: string }).message
					: "Trattativa non trovata";
			return { error: msg };
		}
		return { data: json as ApiNegotiation };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		return { error: message };
	}
}

/**
 * PUT /negotiations/{id} — Update negotiation state.
 */
export async function updateNegotiation(
	accessToken: string,
	id: number,
	body: UpdateNegotiationBody
): Promise<{ data: ApiNegotiation } | { error: string }> {
	try {
		const res = await fetch(`${BASE_URL}/negotiations/${id}`, {
			method: "PUT",
			headers: getAuthHeaders(accessToken),
			body: JSON.stringify(body),
		});
		const json = (await res.json()) as ApiNegotiation | { message?: string };
		if (!res.ok) {
			const msg =
				typeof (json as { message?: string }).message === "string"
					? (json as { message: string }).message
					: "Errore nell'aggiornamento della trattativa";
			return { error: msg };
		}
		return { data: json as ApiNegotiation };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		return { error: message };
	}
}

/**
 * POST /negotiations/{id}/files — Upload one or more files for a negotiation.
 * Second API: call after creating the negotiation (POST /negotiations) with the returned id.
 * Body: multipart/form-data with field "file" (or "files[]" depending on backend).
 * Sends one request per file for maximum backend compatibility.
 */
export async function uploadNegotiationFiles(
	accessToken: string,
	negotiationId: number,
	files: File[]
): Promise<{ ok: true } | { error: string }> {
	if (files.length === 0) {
		return { ok: true };
	}
	for (const file of files) {
		const formData = new FormData();
		formData.set("file", file);
		const res = await fetch(`${BASE_URL}/negotiations/${negotiationId}/files`, {
			method: "POST",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${accessToken}`,
				// Do not set Content-Type: browser sets multipart boundary
			},
			body: formData,
		});
		if (!res.ok) {
			const json = (await res.json()) as { message?: string };
			const msg =
				typeof json.message === "string"
					? json.message
					: "Errore nel caricamento degli allegati";
			return { error: msg };
		}
	}
	return { ok: true };
}

/**
 * GET /statistics/negotiations/spanco — Statistiche SPANCO per l'utente corrente.
 *
 * Restituisce un oggetto JSON dove le chiavi sono le lettere SPANCO presenti
 * (S, P, A, N, C, O) e i valori sono i conteggi di trattative attive per stato.
 */
export async function getNegotiationsSpancoStatistics(
	accessToken: string
): Promise<{ data: SpancoStatistics } | { error: string }> {
	try {
		const res = await fetch(`${BASE_URL}/statistics/negotiations/spanco`, {
			method: "GET",
			headers: getAuthHeaders(accessToken),
		});
		const json = (await res.json()) as SpancoStatistics | { message?: string };
		if (!res.ok) {
			const msg =
				typeof (json as { message?: string }).message === "string"
					? (json as { message: string }).message
					: "Errore nel caricamento delle statistiche SPANCO";
			return { error: msg };
		}
		return { data: json as SpancoStatistics };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		return { error: message };
	}
}

/**
 * Request body for resetting the password via POST /reset-password.
 * The `passwordConfirmation` field is mapped to the backend key `password_confirmation`.
 */
export interface ResetPasswordBody {
	token: string;
	email: string;
	password: string;
	passwordConfirmation: string;
}

/**
 * POST /forgot-password — Invio link di reset password.
 *
 * Usa direttamente il backend Laravel (`${BASE_URL}/forgot-password`) e gestisce in modo
 * esplicito il rate limiting (429) così che il frontend possa mostrare un messaggio
 * chiaro all'utente e impedirgli di inviare richieste in loop.
 */
export async function requestPasswordReset(
	email: string
): Promise<
	| { ok: true; message: string }
	| { ok: false; error: string; rateLimited?: boolean }
> {
	try {
		const res = await fetch(`${BASE_URL}/forgot-password`, {
			method: "POST",
			headers: DEFAULT_HEADERS,
			body: JSON.stringify({ email }),
		});

		const json = (await res.json()) as { message?: string };

		if (!res.ok) {
			const message =
				typeof json.message === "string"
					? json.message
					: "Impossibile inviare il link di reset della password.";

			// 429 = Too Many Requests (rate limit superato)
			const rateLimited = res.status === 429;
			return { ok: false, error: message, rateLimited };
		}

		const message =
			typeof json.message === "string"
				? json.message
				: "Ti abbiamo inviato il link per resettare la password, se l'email è presente nei nostri sistemi.";

		return { ok: true, message };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		return { ok: false, error: message };
	}
}

/**
 * POST /reset-password — Imposta una nuova password usando token ed email dal link.
 *
 * Restituisce:
 * - { ok: true, message } in caso di successo
 * - { ok: false, error, validationErrors? } in caso di token invalido (400) o errori di validazione (422)
 */
export async function resetPassword(body: ResetPasswordBody): Promise<
	| { ok: true; message: string }
	| {
			ok: false;
			error: string;
			validationErrors?: Record<string, string[]>;
	  }
> {
	try {
		const res = await fetch(`${BASE_URL}/reset-password`, {
			method: "POST",
			headers: DEFAULT_HEADERS,
			// Mappiamo il campo passwordConfirmation nel nome atteso da Laravel
			body: JSON.stringify({
				token: body.token,
				email: body.email,
				password: body.password,
				password_confirmation: body.passwordConfirmation,
			}),
		});

		const json = (await res.json()) as {
			message?: string;
			errors?: Record<string, string[]>;
		};

		if (!res.ok) {
			const message =
				typeof json.message === "string"
					? json.message
					: "Impossibile reimpostare la password.";

			// 422 → errori di validazione (es. password troppo corta o non coincidente)
			if (res.status === 422 && json.errors) {
				return {
					ok: false,
					error: message,
					validationErrors: json.errors,
				};
			}

			// 400 → token non valido / scaduto (secondo la specifica)
			return { ok: false, error: message };
		}

		const message =
			typeof json.message === "string"
				? json.message
				: "La tua password è stata reimpostata con successo.";

		return { ok: true, message };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		return { ok: false, error: message };
	}
}

// --- Import API (Excel/CSV clients) ---
// Workflow: 1) POST /import/check with file → get file_token + mapping suggestions.
//           2) POST /import/confirm with file_token + final mapping → execute import.

/**
 * POST /import/check — Upload Excel/CSV and get column mapping suggestions.
 * Content-Type: multipart/form-data, body: { file: File }.
 * Returns file_token, file_extension, matched_columns, unmatched_excel_columns,
 * missing_db_columns, all_db_columns for the mapping UI.
 */
export async function importCheck(
	accessToken: string,
	file: File
): Promise<{ data: ImportCheckResponse } | { error: string }> {
	try {
		const formData = new FormData();
		formData.set("file", file);
		const res = await fetch(`${BASE_URL}/import/check`, {
			method: "POST",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${accessToken}`,
				// Do not set Content-Type: browser sets multipart boundary
			},
			body: formData,
		});
		const json = (await res.json()) as
			| ImportCheckResponse
			| { message?: string };
		if (!res.ok) {
			const msg =
				typeof (json as { message?: string }).message === "string"
					? (json as { message: string }).message
					: "Errore nell'analisi del file";
			return { error: msg };
		}
		return { data: json as ImportCheckResponse };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		return { error: message };
	}
}

/**
 * POST /import/confirm — Execute import with file_token and final column mapping.
 * Body: { file_token, file_extension, mapping: { "Excel Header": "db_field" } }.
 * Returns imported_count and optional errors list (e.g. row-level validation).
 */
export async function importConfirm(
	accessToken: string,
	payload: {
		file_token: string;
		file_extension: string;
		mapping: Record<string, string>;
	}
): Promise<{ data: ImportConfirmResponse } | { error: string }> {
	try {
		const res = await fetch(`${BASE_URL}/import/confirm`, {
			method: "POST",
			headers: getAuthHeaders(accessToken),
			body: JSON.stringify(payload),
		});
		const json = (await res.json()) as
			| ImportConfirmResponse
			| { message?: string };
		if (!res.ok) {
			const msg =
				typeof (json as { message?: string }).message === "string"
					? (json as { message: string }).message
					: "Errore durante l'importazione";
			return { error: msg };
		}
		return { data: json as ImportConfirmResponse };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		return { error: message };
	}
}

// --- Global Search API ---
// POST /api/search — Smart search for clients and referents (min 2 chars). Scoped by role (Direttore: company; Venditore: own).

/**
 * POST /search — Unified search for clients (with/without negotiations) and referents.
 * Body: { query: string } (min 2 chars). Returns clients_with_negotiations, referents, clients_without_negotiations.
 * 422 if query missing or < 2 chars; 403 for Admin.
 */
export async function search(
	accessToken: string,
	query: string
): Promise<{ data: SearchResponse } | { error: string }> {
	const trimmed = query.trim();
	if (trimmed.length < 2) {
		return { error: "Inserire almeno 2 caratteri" };
	}
	try {
		// Use Next.js API proxy to avoid CORS; proxy forwards to Laravel backend
		const res = await fetch("/api/search", {
			method: "POST",
			headers: getAuthHeaders(accessToken),
			body: JSON.stringify({ query: trimmed }),
		});
		const json = (await res.json()) as
			| SearchResponse
			| { data?: SearchResponse }
			| { message?: string };
		if (!res.ok) {
			const msg =
				typeof (json as { message?: string }).message === "string"
					? (json as { message: string }).message
					: "Errore nella ricerca";
			return { error: msg };
		}
		// Laravel may return { data: SearchResponse } or the shape directly
		const payload = json as { data?: SearchResponse } & SearchResponse;
		const data: SearchResponse =
			payload.data &&
			Array.isArray(payload.data.clients_with_negotiations) &&
			Array.isArray(payload.data.referents) &&
			Array.isArray(payload.data.clients_without_negotiations)
				? payload.data
				: (payload as unknown as SearchResponse);
		return { data };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
		return { error: message };
	}
}

export { BASE_URL };
