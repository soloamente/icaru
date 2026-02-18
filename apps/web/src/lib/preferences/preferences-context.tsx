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
const STORAGE_KEY_FONT_SIZE = "ui-font-size";
const STORAGE_KEY_NAV_POSITION = "ui-nav-position";
const STORAGE_KEY_COLOR_SCHEME = "ui-color-scheme";

export const COLOR_SCHEME_OPTIONS = [
	{ id: "default", label: "Predefinito" },
	{ id: "rich", label: "Dataweb" },
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

/** Dimensione base del carattere: scala tutto l’interfaccia (usa % sul root per rispettare le preferenze del browser). */
export const FONT_SIZE_OPTIONS = [
	{ id: "small", label: "Piccolo" },
	{ id: "medium", label: "Normale" },
	{ id: "large", label: "Grande" },
] as const;

export type AccentId = (typeof ACCENT_OPTIONS)[number]["id"];
export type FontId = (typeof FONT_OPTIONS)[number]["id"];
export type FontSizeId = (typeof FONT_SIZE_OPTIONS)[number]["id"];
export type NavigationPositionId =
	(typeof NAVIGATION_POSITION_OPTIONS)[number]["id"];
export type ColorSchemeId = (typeof COLOR_SCHEME_OPTIONS)[number]["id"];

interface PreferencesState {
	accent: AccentId;
	fontStyle: FontId;
	/** Dimensione carattere: small / medium / large (scala base dell’interfaccia). */
	fontSize: FontSizeId;
	navigationPosition: NavigationPositionId;
	/** Palette: default (neutri) o rich (colorati vivaci per sidebar/navbar). */
	colorScheme: ColorSchemeId;
}

interface PreferencesContextValue extends PreferencesState {
	setAccent: (accent: AccentId) => void;
	setFontStyle: (fontStyle: FontId) => void;
	setFontSize: (fontSize: FontSizeId) => void;
	setNavigationPosition: (position: NavigationPositionId) => void;
	setColorScheme: (scheme: ColorSchemeId) => void;
}

const defaultState: PreferencesState = {
	accent: "blue",
	fontStyle: "rounded",
	fontSize: "medium",
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

function readFontSize(): FontSizeId {
	if (typeof window === "undefined") {
		return defaultState.fontSize;
	}
	const raw = localStorage.getItem(STORAGE_KEY_FONT_SIZE);
	if (raw && FONT_SIZE_OPTIONS.some((o) => o.id === raw)) {
		return raw as FontSizeId;
	}
	return defaultState.fontSize;
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

/** Applies accent, font, font size, navigation position and color scheme to the document (data attributes). */
function applyPreferences(
	accent: AccentId,
	fontStyle: FontId,
	fontSize: FontSizeId,
	navigationPosition: NavigationPositionId,
	colorScheme: ColorSchemeId
) {
	const root = document.documentElement;
	root.setAttribute("data-accent", accent);
	root.setAttribute("data-font", fontStyle);
	root.setAttribute("data-font-size", fontSize);
	root.setAttribute("data-nav-position", navigationPosition);
	root.setAttribute("data-color-scheme", colorScheme);
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
	const [accent, setAccentState] = useState<AccentId>(defaultState.accent);
	const [fontStyle, setFontStyleState] = useState<FontId>(
		defaultState.fontStyle
	);
	const [fontSize, setFontSizeState] = useState<FontSizeId>(
		defaultState.fontSize
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
		const initialFontSize = readFontSize();
		const initialNavPosition = readNavigationPosition();
		const initialColorScheme = readColorScheme();
		setAccentState(initialAccent);
		setFontStyleState(initialFont);
		setFontSizeState(initialFontSize);
		setNavigationPositionState(initialNavPosition);
		setColorSchemeState(initialColorScheme);
		applyPreferences(
			initialAccent,
			initialFont,
			initialFontSize,
			initialNavPosition,
			initialColorScheme
		);
	}, []);

	// Apply to document whenever preferences change
	useEffect(() => {
		applyPreferences(
			accent,
			fontStyle,
			fontSize,
			navigationPosition,
			colorScheme
		);
	}, [accent, fontStyle, fontSize, navigationPosition, colorScheme]);

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

	const setFontSize = useCallback((value: FontSizeId) => {
		setFontSizeState(value);
		if (typeof window !== "undefined") {
			localStorage.setItem(STORAGE_KEY_FONT_SIZE, value);
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
		fontSize,
		navigationPosition,
		colorScheme,
		setAccent,
		setFontStyle,
		setFontSize,
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
