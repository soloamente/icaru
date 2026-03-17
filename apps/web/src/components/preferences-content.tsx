"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import {
	ACCENT_OPTIONS,
	COLOR_SCHEME_OPTIONS,
	FONT_SIZE_OPTIONS,
	NAVIGATION_POSITION_OPTIONS,
	usePreferences,
} from "@/lib/preferences/preferences-context";
import { cn } from "@/lib/utils";

/** Theme option id -> image path for desktop preview. */
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

interface PreferencesContentProps {
	/** When true, theme picker uses CSS-only previews (no images) to avoid layout shift in bottom sheet. */
	isMobile?: boolean;
}

/**
 * Preferences UI: theme, accent, font size, navigation position.
 * On mobile uses CSS-only theme previews to prevent image-load layout shifts.
 */
export function PreferencesContent({
	isMobile = false,
}: PreferencesContentProps = {}) {
	const { theme, setTheme } = useTheme();
	const {
		accent,
		setAccent,
		colorScheme,
		setColorScheme,
		fontSize,
		setFontSize,
		navigationPosition,
		setNavigationPosition,
	} = usePreferences();

	const themeOptions = [
		{ id: "light" as const, label: "Chiaro" },
		{ id: "dark" as const, label: "Scuro" },
		{ id: "system" as const, label: "Sistema" },
	];

	return (
		<>
			{/* Theme (Color mode) */}
			<section aria-labelledby="theme-heading" className="mb-8">
				<h3
					className="mb-3 font-medium text-base text-card-foreground"
					id="theme-heading"
				>
					Tema
				</h3>
				<div className="flex gap-3">
					{themeOptions.map((opt) => {
						const isSelected = theme === opt.id;
						return (
							<button
								aria-pressed={isSelected}
								className={cn(
									"flex flex-1 flex-col gap-2 rounded-xl border-2 p-3 text-left transition-colors",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									isSelected
										? "border-primary bg-primary/10"
										: "border-border bg-muted/30 hover:border-muted-foreground/30"
								)}
								key={opt.id}
								onClick={() => setTheme(opt.id)}
								type="button"
							>
								{/* Mobile: CSS-only preview (no image load). Desktop: image preview. */}
								{isMobile ? (
									<div
										aria-hidden
										className={cn(
											"h-14 w-full shrink-0 rounded-lg",
											opt.id === "light" && "bg-white ring-1 ring-black/10",
											opt.id === "dark" && "bg-neutral-800",
											opt.id === "system" &&
												"bg-linear-to-r from-white via-neutral-400 to-neutral-800 ring-1 ring-black/10"
										)}
									/>
								) : (
									<div className="relative aspect-square w-full min-w-0 shrink-0 overflow-hidden rounded-lg">
										<Image
											alt={`Anteprima tema ${opt.label.toLowerCase()}`}
											className="object-cover"
											fill
											sizes="8rem"
											src={THEME_PREVIEW_IMAGES[opt.id] ?? ""}
										/>
									</div>
								)}
								<span className="font-medium text-card-foreground text-sm">
									{opt.label}
								</span>
							</button>
						);
					})}
				</div>
			</section>

			{/* Palette: Predefinito vs Rich colors */}
			<section aria-labelledby="color-scheme-heading" className="mb-8">
				<h3
					className="mb-3 font-medium text-base text-card-foreground"
					id="color-scheme-heading"
				>
					Palette
				</h3>
				<div className="flex gap-3">
					{COLOR_SCHEME_OPTIONS.map(
						(opt: (typeof COLOR_SCHEME_OPTIONS)[number]) => {
							const isSelected = colorScheme === opt.id;
							return (
								<button
									aria-pressed={isSelected}
									className={cn(
										"flex flex-1 items-center justify-center rounded-xl border-2 py-3 font-medium text-sm transition-colors",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
										isSelected
											? "border-primary bg-primary/10 text-card-foreground"
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
					className="mb-3 font-medium text-base text-card-foreground"
					id="accent-heading"
				>
					Colore di accento
				</h3>
				<div className="flex flex-wrap gap-3">
					{ACCENT_OPTIONS.map((opt) => {
						const isSelected = accent === opt.id;
						return (
							<button
								aria-label={`Accento ${opt.label}`}
								aria-pressed={isSelected}
								className={cn(
									"size-11 rounded-xl border-2 transition-transform",
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

			{/* Navigation position */}
			<section aria-labelledby="nav-position-heading" className="mb-8">
				<h3
					className="mb-3 font-medium text-base text-card-foreground"
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
										"flex items-center justify-center rounded-xl border-2 py-3 font-medium text-sm transition-colors",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
										isSelected
											? "border-primary bg-primary/10 text-card-foreground"
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

			{/* Font size */}
			<section aria-labelledby="font-size-heading" className="mb-4">
				<h3
					className="mb-3 font-medium text-base text-card-foreground"
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
									"flex flex-1 items-center justify-center rounded-xl border-2 py-3 font-medium text-sm transition-colors",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									isSelected
										? "border-primary bg-primary/10 text-card-foreground"
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
		</>
	);
}
