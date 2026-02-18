"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import {
	ACCENT_OPTIONS,
	COLOR_SCHEME_OPTIONS,
	FONT_OPTIONS,
	FONT_SIZE_OPTIONS,
	NAVIGATION_POSITION_OPTIONS,
	usePreferences,
} from "@/lib/preferences/preferences-context";
import { cn } from "@/lib/utils";

/** Theme option id -> image path for preview in preferences. */
const THEME_PREVIEW_IMAGES: Record<string, string> = {
	light: "/images/lightmode.png",
	dark: "/images/darkmode.png",
	system: "/images/system.png",
};

/** Swatch colors shown in the accent picker (approximate match to CSS accent overrides). */
export const ACCENT_SWATCH_COLORS: Record<
	(typeof ACCENT_OPTIONS)[number]["id"],
	string
> = {
	blue: "#4f6bed",
	green: "#22c55e",
	purple: "#a855f7",
	orange: "#f97316",
	pink: "#ec4899",
	red: "#ef4444",
	yellow: "#eab308",
};

/**
 * Shared preferences UI: theme, accent color, font style.
 * Used inside both Dialog (desktop) and Vaul Drawer (mobile).
 */
export function PreferencesContent() {
	const { theme, setTheme } = useTheme();
	const {
		accent,
		setAccent,
		colorScheme,
		setColorScheme,
		fontStyle,
		setFontStyle,
		fontSize,
		setFontSize,
		navigationPosition,
		setNavigationPosition,
	} = usePreferences();

	return (
		<>
			{/* Theme (Color mode) */}
			<section aria-labelledby="theme-heading" className="mb-8">
				<h3
					className="mb-1 font-medium text-base text-card-foreground"
					id="theme-heading"
				>
					Tema
				</h3>
				{/* <p className="mb-3 text-muted-foreground text-sm">
					Scegli tema chiaro, scuro o in base al sistema.
				</p> */}
				<div className="flex gap-3">
					{[
						{ id: "light", label: "Chiaro" },
						{ id: "dark", label: "Scuro" },
						{ id: "system", label: "Sistema" },
					].map((opt) => {
						const isSelected = theme === opt.id;
						return (
							<button
								aria-pressed={isSelected}
								className={cn(
									"flex h-auto w-xs flex-col gap-2 rounded-lg border-2 p-3 text-left transition-colors",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									isSelected
										? "border-primary bg-primary/5"
										: "border-border bg-muted/30 hover:border-muted-foreground/30"
								)}
								key={opt.id}
								onClick={() => setTheme(opt.id)}
								type="button"
							>
								{/* Dimensioni fisse per l'anteprima: 20rem larghezza bottone, 6rem altezza area immagine */}
								<div className="relative h-full w-full min-w-0 overflow-hidden rounded-md">
									<Image
										alt={`Anteprima tema ${opt.label.toLowerCase()}`}
										className="object-cover"
										height={1000}
										src={THEME_PREVIEW_IMAGES[opt.id] ?? ""}
										width={1000}
									/>
								</div>
								<span className="font-medium text-card-foreground text-sm">
									{opt.label}
								</span>
								{/* {isSelected && (
									<span className="flex items-center gap-1 text-primary text-xs">
										<Check aria-hidden className="size-3.5" />
										Selezionato
									</span>
								)} */}
							</button>
						);
					})}
				</div>
			</section>

			{/* Palette: Predefinito vs Rich colors (sidebar/navbar colorati) */}
			<section aria-labelledby="color-scheme-heading" className="mb-8">
				<h3
					className="mb-1 font-medium text-base text-card-foreground"
					id="color-scheme-heading"
				>
					Tema
				</h3>
				<div className="flex gap-3">
					{COLOR_SCHEME_OPTIONS.map(
						(opt: (typeof COLOR_SCHEME_OPTIONS)[number]) => {
							const isSelected = colorScheme === opt.id;
							return (
								<button
									aria-pressed={isSelected}
									className={cn(
										"flex flex-1 items-center justify-center rounded-lg border-2 py-3 font-medium text-sm transition-colors",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
										isSelected
											? "border-primary bg-primary/5 text-card-foreground"
											: "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30"
									)}
									key={opt.id}
									onClick={() => setColorScheme(opt.id)}
									type="button"
								>
									{opt.label}
								</button>
							);
						}
					)}
				</div>
			</section>

			{/* Accent color */}
			<section aria-labelledby="accent-heading" className="mb-8">
				<h3
					className="mb-4 font-medium text-base text-card-foreground"
					id="accent-heading"
				>
					Colore di accento
				</h3>
				{/* <p className="mb-3 text-muted-foreground text-sm">
					Usato per pulsanti, link e evidenziazioni.
				</p> */}
				<div className="flex flex-wrap gap-3">
					{ACCENT_OPTIONS.map((opt) => {
						const isSelected = accent === opt.id;
						return (
							<button
								aria-label={`Accento ${opt.label}`}
								aria-pressed={isSelected}
								className={cn(
									"size-10 rounded-xl border-2 transition-transform",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									isSelected
										? "scale-110 border-foreground"
										: "border-transparent hover:scale-105"
								)}
								key={opt.id}
								onClick={() => setAccent(opt.id)}
								style={{
									backgroundColor: ACCENT_SWATCH_COLORS[opt.id],
								}}
								title={opt.label}
								type="button"
							/>
						);
					})}
				</div>
			</section>

			{/* Navigation position: sidebar left/right, top bar, bottom navbar */}
			<section aria-labelledby="nav-position-heading" className="mb-8">
				<h3
					className="mb-1 font-medium text-base text-card-foreground"
					id="nav-position-heading"
				>
					Posizione navigazione
				</h3>
				<div className="grid grid-cols-2 gap-3">
					{NAVIGATION_POSITION_OPTIONS.map(
						(opt: (typeof NAVIGATION_POSITION_OPTIONS)[number]) => {
							const isSelected = navigationPosition === opt.id;
							return (
								<button
									aria-pressed={isSelected}
									className={cn(
										"flex items-center justify-center rounded-lg border-2 py-3 font-medium text-sm transition-colors",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
										isSelected
											? "border-primary bg-primary/5 text-card-foreground"
											: "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30"
									)}
									key={opt.id}
									onClick={() => setNavigationPosition(opt.id)}
									type="button"
								>
									{opt.label}
								</button>
							);
						}
					)}
				</div>
			</section>

			{/* Font size: Piccolo / Normale / Grande */}
			<section aria-labelledby="font-size-heading" className="mb-8">
				<h3
					className="mb-1 font-medium text-base text-card-foreground"
					id="font-size-heading"
				>
					Dimensione carattere
				</h3>
				<div className="flex gap-3">
					{FONT_SIZE_OPTIONS.map((opt: (typeof FONT_SIZE_OPTIONS)[number]) => {
						const isSelected = fontSize === opt.id;
						return (
							<button
								aria-pressed={isSelected}
								className={cn(
									"flex flex-1 items-center justify-center rounded-lg border-2 py-3 font-medium text-sm transition-colors",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									isSelected
										? "border-primary bg-primary/5 text-card-foreground"
										: "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30"
								)}
								key={opt.id}
								onClick={() => setFontSize(opt.id)}
								type="button"
							>
								{opt.label}
							</button>
						);
					})}
				</div>
			</section>

			{/* Font style */}
			<section aria-labelledby="font-heading" className="mb-2">
				<h3
					className="mb-1 font-medium text-base text-card-foreground"
					id="font-heading"
				>
					Stile carattere
				</h3>
				{/* <p className="mb-3 text-muted-foreground text-sm">
					Predefinito (Inter) o arrotondato (SF Pro Rounded).
				</p> */}
				<div className="flex gap-3">
					{FONT_OPTIONS.map((opt) => {
						const isSelected = fontStyle === opt.id;
						return (
							<button
								aria-pressed={isSelected}
								className={cn(
									"flex flex-1 items-center justify-center rounded-lg border-2 py-4 font-medium text-lg transition-colors",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									isSelected
										? "border-primary bg-primary/5 text-card-foreground"
										: "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30"
								)}
								key={opt.id}
								onClick={() => setFontStyle(opt.id)}
								style={
									opt.id === "rounded"
										? { fontFamily: "var(--font-sf-pro-rounded)" }
										: undefined
								}
								type="button"
							>
								Ag
							</button>
						);
					})}
				</div>
			</section>
		</>
	);
}
