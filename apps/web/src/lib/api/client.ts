/**
 * API client for the Laravel backend.
 * Base URL: https://web-production-7ff544.up.railway.app/
 * Headers for protected routes: Authorization: Bearer <access_token>, Accept: application/json
 */

import type { LoginResponse } from "./types";

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
 */
export async function getMe(
	accessToken: string
): Promise<{ data: LoginResponse["user"] } | { error: string }> {
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
			return { error: msg };
		}
		return { data: json as LoginResponse["user"] };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Errore di rete";
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

export { BASE_URL };
