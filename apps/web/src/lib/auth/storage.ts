/**
 * Persist auth token and user in localStorage so sessions survive refresh.
 * Keys are prefixed to avoid collisions.
 */

import type { ApiUser } from "@/lib/api/types";

const TOKEN_KEY = "compravendita_access_token";
const USER_KEY = "compravendita_user";

export function getStoredToken(): string | null {
	if (typeof window === "undefined") {
		return null;
	}
	try {
		return localStorage.getItem(TOKEN_KEY);
	} catch {
		return null;
	}
}

export function setStoredAuth(token: string, user: ApiUser): void {
	if (typeof window === "undefined") {
		return;
	}
	try {
		localStorage.setItem(TOKEN_KEY, token);
		localStorage.setItem(USER_KEY, JSON.stringify(user));
	} catch {
		// Ignore quota / private mode
	}
}

export function clearStoredAuth(): void {
	if (typeof window === "undefined") {
		return;
	}
	try {
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(USER_KEY);
	} catch {
		// Ignore
	}
}

export function getStoredUser(): ApiUser | null {
	if (typeof window === "undefined") {
		return null;
	}
	try {
		const raw = localStorage.getItem(USER_KEY);
		if (!raw) {
			return null;
		}
		return JSON.parse(raw) as ApiUser;
	} catch {
		return null;
	}
}
