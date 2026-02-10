"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

const STORAGE_KEY_ACCENT = "ui-accent";
const STORAGE_KEY_FONT = "ui-font";
const STORAGE_KEY_NAV_POSITION = "ui-nav-position";
const STORAGE_KEY_COLOR_SCHEME = "ui-color-scheme";

export const COLOR_SCHEME_OPTIONS = [
	{ id: "default", label: "Predefinito" },
	{ id: "rich", label: "Rich colors" },
] as const;

export const NAVIGATION_POSITION_OPTIONS = [
	{ id: "sidebar-left", label: "Barra laterale sinistra" },
	{ id: "sidebar-right", label: "Barra laterale destra" },
	{ id: "top", label: "Barra in alto" },
	{ id: "bottom", label: "Barra in basso" },
] as const;

export const ACCENT_OPTIONS = [
	{ id: "blue", label: "Blu" },
	{ id: "green", label: "Verde" },
	{ id: "purple", label: "Viola" },
	{ id: "orange", label: "Arancione" },
	{ id: "pink", label: "Rosa" },
	{ id: "red", label: "Rosso" },
	{ id: "yellow", label: "Giallo" },
] as const;

export const FONT_OPTIONS = [
	{ id: "default", label: "Predefinito" },
	{ id: "rounded", label: "Arrotondato" },
] as const;

export type AccentId = (typeof ACCENT_OPTIONS)[number]["id"];
export type FontId = (typeof FONT_OPTIONS)[number]["id"];
export type NavigationPositionId =
	(typeof NAVIGATION_POSITION_OPTIONS)[number]["id"];
export type ColorSchemeId = (typeof COLOR_SCHEME_OPTIONS)[number]["id"];

interface PreferencesState {
	accent: AccentId;
	fontStyle: FontId;
	navigationPosition: NavigationPositionId;
	/** Palette: default (neutri) o rich (colorati vivaci per sidebar/navbar). */
	colorScheme: ColorSchemeId;
}

interface PreferencesContextValue extends PreferencesState {
	setAccent: (accent: AccentId) => void;
	setFontStyle: (fontStyle: FontId) => void;
	setNavigationPosition: (position: NavigationPositionId) => void;
	setColorScheme: (scheme: ColorSchemeId) => void;
}

const defaultState: PreferencesState = {
	accent: "blue",
	fontStyle: "rounded",
	navigationPosition: "sidebar-left",
	colorScheme: "default",
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readAccent(): AccentId {
	if (typeof window === "undefined") {
		return defaultState.accent;
	}
	const raw = localStorage.getItem(STORAGE_KEY_ACCENT);
	if (raw && ACCENT_OPTIONS.some((o) => o.id === raw)) {
		return raw as AccentId;
	}
	return defaultState.accent;
}

function readFontStyle(): FontId {
	if (typeof window === "undefined") {
		return defaultState.fontStyle;
	}
	const raw = localStorage.getItem(STORAGE_KEY_FONT);
	if (raw && FONT_OPTIONS.some((o) => o.id === raw)) {
		return raw as FontId;
	}
	return defaultState.fontStyle;
}

function readNavigationPosition(): NavigationPositionId {
	if (typeof window === "undefined") {
		return defaultState.navigationPosition;
	}
	const raw = localStorage.getItem(STORAGE_KEY_NAV_POSITION);
	if (raw && NAVIGATION_POSITION_OPTIONS.some((o) => o.id === raw)) {
		return raw as NavigationPositionId;
	}
	return defaultState.navigationPosition;
}

function readColorScheme(): ColorSchemeId {
	if (typeof window === "undefined") {
		return defaultState.colorScheme;
	}
	const raw = localStorage.getItem(STORAGE_KEY_COLOR_SCHEME);
	if (raw && COLOR_SCHEME_OPTIONS.some((o) => o.id === raw)) {
		return raw as ColorSchemeId;
	}
	return defaultState.colorScheme;
}

/** Applies accent, font, navigation position and color scheme to the document (data attributes). */
function applyPreferences(
	accent: AccentId,
	fontStyle: FontId,
	navigationPosition: NavigationPositionId,
	colorScheme: ColorSchemeId
) {
	const root = document.documentElement;
	root.setAttribute("data-accent", accent);
	root.setAttribute("data-font", fontStyle);
	root.setAttribute("data-nav-position", navigationPosition);
	root.setAttribute("data-color-scheme", colorScheme);
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
	const [accent, setAccentState] = useState<AccentId>(defaultState.accent);
	const [fontStyle, setFontStyleState] = useState<FontId>(
		defaultState.fontStyle
	);
	const [navigationPosition, setNavigationPositionState] =
		useState<NavigationPositionId>(defaultState.navigationPosition);
	const [colorScheme, setColorSchemeState] = useState<ColorSchemeId>(
		defaultState.colorScheme
	);

	// Hydrate from localStorage after mount to avoid SSR mismatch;
	// apply immediately so document has correct data-* before next paint
	useEffect(() => {
		const initialAccent = readAccent();
		const initialFont = readFontStyle();
		const initialNavPosition = readNavigationPosition();
		const initialColorScheme = readColorScheme();
		setAccentState(initialAccent);
		setFontStyleState(initialFont);
		setNavigationPositionState(initialNavPosition);
		setColorSchemeState(initialColorScheme);
		applyPreferences(
			initialAccent,
			initialFont,
			initialNavPosition,
			initialColorScheme
		);
	}, []);

	// Apply to document whenever preferences change
	useEffect(() => {
		applyPreferences(accent, fontStyle, navigationPosition, colorScheme);
	}, [accent, fontStyle, navigationPosition, colorScheme]);

	const setAccent = useCallback((value: AccentId) => {
		setAccentState(value);
		if (typeof window !== "undefined") {
			localStorage.setItem(STORAGE_KEY_ACCENT, value);
		}
	}, []);

	const setFontStyle = useCallback((value: FontId) => {
		setFontStyleState(value);
		if (typeof window !== "undefined") {
			localStorage.setItem(STORAGE_KEY_FONT, value);
		}
	}, []);

	const setNavigationPosition = useCallback((value: NavigationPositionId) => {
		setNavigationPositionState(value);
		if (typeof window !== "undefined") {
			localStorage.setItem(STORAGE_KEY_NAV_POSITION, value);
		}
	}, []);

	const setColorScheme = useCallback((value: ColorSchemeId) => {
		setColorSchemeState(value);
		if (typeof window !== "undefined") {
			localStorage.setItem(STORAGE_KEY_COLOR_SCHEME, value);
		}
	}, []);

	const value: PreferencesContextValue = {
		accent,
		fontStyle,
		navigationPosition,
		colorScheme,
		setAccent,
		setFontStyle,
		setNavigationPosition,
		setColorScheme,
	};

	return (
		<PreferencesContext.Provider value={value}>
			{children}
		</PreferencesContext.Provider>
	);
}

export function usePreferences() {
	const ctx = useContext(PreferencesContext);
	if (!ctx) {
		throw new Error("usePreferences must be used within PreferencesProvider");
	}
	return ctx;
}

export function usePreferencesOptional(): PreferencesContextValue | null {
	return useContext(PreferencesContext);
}
