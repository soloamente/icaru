/**
 * API client for the Laravel backend.
 * Base URL: https://web-production-7ff544.up.railway.app/
 * Headers for protected routes: Authorization: Bearer <access_token>, Accept: application/json
 */

import type {
	ApiClient,
	ApiNegotiation,
	CreateNegotiationBody,
	LoginResponse,
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

/**
 * GET /clients — List clients.
 * Query: ?search=name_or_vat
 * Sellers see only own clients; Directors see all company clients.
 */
export async function listClients(
	accessToken: string,
	params?: { search?: string }
): Promise<{ data: ApiClient[] } | { error: string }> {
	try {
		const searchParams = new URLSearchParams();
		if (params?.search?.trim()) {
			searchParams.set("search", params.search.trim());
		}
		const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
		const res = await fetch(`${BASE_URL}/clients${query}`, {
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

// --- Negotiations API ---

/**
 * GET /negotiations — List negotiations (latest first).
 * Optional ?client_id=123 to filter by client.
 */
export async function listNegotiations(
	accessToken: string,
	params?: { client_id?: number }
): Promise<{ data: ApiNegotiation[] } | { error: string }> {
	try {
		const search =
			params?.client_id != null ? `?client_id=${params.client_id}` : "";
		const res = await fetch(`${BASE_URL}/negotiations${search}`, {
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

export { BASE_URL };
