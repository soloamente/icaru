"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

import { logout as apiLogout, getMe } from "@/lib/api/client";
import type { ApiUser } from "@/lib/api/types";
import { type AppRole, roleFromApi } from "@/lib/api/types";
import {
	clearStoredAuth,
	getStoredToken,
	getStoredUser,
	setStoredAuth,
} from "@/lib/auth/storage";

interface AuthState {
	/** null = not yet loaded, undefined = loaded and not logged in */
	user: ApiUser | null | undefined;
	token: string | null;
	role: AppRole | null;
	isLoaded: boolean;
}

interface AuthContextValue extends AuthState {
	login: (token: string, user: ApiUser) => void;
	logout: () => Promise<void>;
	setUser: (user: ApiUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return ctx;
}

/** Optional hook: returns null if outside provider (e.g. on login page). */
export function useAuthOptional(): AuthContextValue | null {
	return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
	const [state, setState] = useState<AuthState>({
		user: null,
		token: null,
		role: null,
		isLoaded: false,
	});

	// On mount: restore token and user from localStorage, optionally validate with /me
	useEffect(() => {
		const token = getStoredToken();
		const storedUser = getStoredUser();
		if (!token) {
			setState({
				user: undefined,
				token: null,
				role: null,
				isLoaded: true,
			});
			return;
		}
		// Restore from storage immediately for fast UI
		setState({
			user: storedUser ?? undefined,
			token,
			role: storedUser ? roleFromApi(storedUser.role) : null,
			isLoaded: true,
		});
		// Validate with backend; only clear session on real auth failure (401), not on network errors
		getMe(token).then((result) => {
			if ("error" in result) {
				// Don't logout on "Failed to fetch" / network errors — only on 401 Unauthorized
				if (result.authFailure === true) {
					clearStoredAuth();
					setState({
						user: undefined,
						token: null,
						role: null,
						isLoaded: true,
					});
				}
				return;
			}
			setStoredAuth(token, result.data);
			setState((prev) => ({
				...prev,
				user: result.data,
				role: roleFromApi(result.data.role),
			}));
		});
	}, []);

	const login = useCallback((token: string, user: ApiUser) => {
		setStoredAuth(token, user);
		setState({
			user,
			token,
			role: roleFromApi(user.role),
			isLoaded: true,
		});
	}, []);

	const logout = useCallback(async () => {
		const token = getStoredToken();
		if (token) {
			await apiLogout(token);
		}
		clearStoredAuth();
		setState({
			user: undefined,
			token: null,
			role: null,
			isLoaded: true,
		});
	}, []);

	const setUser = useCallback((user: ApiUser) => {
		setState((prev) => {
			if (!prev.token) {
				return prev;
			}
			setStoredAuth(prev.token, user);
			return {
				...prev,
				user,
				role: roleFromApi(user.role),
			};
		});
	}, []);

	const value: AuthContextValue = useMemo(
		() => ({
			...state,
			login,
			logout,
			setUser,
		}),
		[state, login, logout, setUser]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
