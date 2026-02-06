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
