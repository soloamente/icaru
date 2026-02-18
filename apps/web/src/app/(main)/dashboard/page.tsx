"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import {
	ArrowUpRight,
	DashboardIcon,
	IconChartBarTrendUp,
	IconQuickstartFill18,
	IconSackDollarFill18,
	IconSuitcaseDollarFill18,
	IconTarget,
	IconVault3Fill18,
} from "@/components/icons";
import Loader from "@/components/loader";
import {
	SpancoDonutChart,
	SpancoDonutChartSkeleton,
} from "@/components/spanco-donut-chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
	getNegotiationsSpancoStatistics,
	getNegotiationsStatistics,
} from "@/lib/api/client";
import type { NegotiationsStatistics, SpancoStatistics } from "@/lib/api/types";
import { useAuthOptional } from "@/lib/auth/auth-context";

/** Trattative aperte: section linked from dashboard summary cards. */
const TRATTATIVE_APERTE_HREF = "/trattative/aperte" as const;
/** Trattative concluse: linked from % Conclusione and "Concluse questo mese" cards. */
const TRATTATIVE_CONCLUSE_HREF = "/trattative/concluse" as const;
/** Tutte le trattative: linked from Importo medio card. */
const TRATTATIVE_TUTTE_HREF = "/trattative/tutte" as const;

/** Format amount as EUR (Italian locale) for dashboard cards. */
function formatCurrency(value: number): string {
	return new Intl.NumberFormat("it-IT", {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}

/** Split formatted EUR into main number and suffix (e.g. "18.000" and " €") for styling value at full brightness and suffix with lower opacity. */
function formatCurrencyParts(value: number): { main: string; suffix: string } {
	const formatted = formatCurrency(value);
	const lastSpace = formatted.lastIndexOf(" ");
	if (lastSpace !== -1) {
		return {
			main: formatted.slice(0, lastSpace),
			suffix: formatted.slice(lastSpace),
		};
	}
	// Locale may output "18.000€" without space; split by symbol so € gets opacity.
	const euroIndex = formatted.indexOf("€");
	if (euroIndex !== -1) {
		return {
			main: formatted.slice(0, euroIndex).trimEnd(),
			suffix: formatted.slice(euroIndex),
		};
	}
	return { main: formatted, suffix: "" };
}

/** Card value + valueSuffix for currency cards (single formatCurrencyParts call). */
function currencyCardValue(amount: number): {
	value: string;
	valueSuffix: string;
} {
	const { main, suffix } = formatCurrencyParts(amount);
	return { value: main, valueSuffix: suffix };
}

/** Single card in the dashboard statistics grid (from GET /api/statistics/negotiations). */
interface NegotiationsStatsCard {
	id: string;
	title: string;
	value: ReactNode;
	/** Optional unit/suffix (€, %, giorni) rendered with lower opacity after the value. */
	valueSuffix?: ReactNode;
	/** Optional subtitle (e.g. trend vs previous month). */
	subtitle?: ReactNode;
	/** Color for subtitle: green if positive, red if negative. */
	subtitleColor?: "negative" | "positive";
	/** Destination for the card link (e.g. /trattative/aperte, /trattative/concluse). */
	href: string;
}

/** Stable keys for the 6 skeleton cards (avoids array index as key). */
const STATS_CARD_IDS = [
	"total-open",
	"total-open-amount",
	"average-open-amount",
	"conclusion-pct",
	"average-concluded-amount",
	"average-closing-days",
] as const;

/** Role-specific dashboard content (Admin / Director / Seller). */
function RoleDashboard({ role }: { role: "admin" | "director" | "seller" }) {
	if (role === "admin") {
		return (
			<section className="rounded-lg border border-border p-4">
				<h2 className="mb-2 font-medium">Pannello Admin</h2>
				<p className="mb-3 text-muted-foreground text-sm">
					Gestione aziende, utenti e configurazione. (Funzionalità in arrivo.)
				</p>
				<Link
					className="inline-block text-primary text-sm underline underline-offset-2 hover:no-underline"
					href="/trattative/tutte"
				>
					Vai a Trattative
				</Link>
			</section>
		);
	}
	if (role === "director") {
		return (
			<section className="rounded-lg border border-border p-4">
				<h2 className="mb-2 font-medium">Pannello Direttore</h2>
				<p className="text-muted-foreground text-sm">
					Gestione team, negoziazioni e clienti aziendali. (Funzionalità in
					arrivo.)
				</p>
			</section>
		);
	}

	// For the "seller" role we currently hide the dedicated dashboard panel
	// so that the main dashboard layout stays cleaner and focused on summary cards.
	return null;
}

/**
 * Dashboard page — overview of SPANCO stages and role-specific panel.
 * Requires authentication; redirects to /login if not logged in.
 */
export default function DashboardPage() {
	const auth = useAuthOptional();
	const router = useRouter();
	const isLoaded = auth?.isLoaded ?? false;
	const isLoggedIn = Boolean(auth?.user && auth?.token);
	const role = auth?.role ?? null;

	// Avoid hydration mismatch: auth is restored from localStorage in AuthProvider's
	// useEffect, so server and first client paint differ. Track mount before trusting auth.
	const [mounted, setMounted] = useState(false);

	// Redirect unauthenticated users to login (same pattern as clienti / trattative pages).
	useEffect(() => {
		if (auth?.isLoaded && !auth?.user) {
			router.replace("/login");
		}
	}, [auth?.isLoaded, auth?.user, router]);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Stato per il grafico SPANCO: contiene le statistiche, l'errore e il flag di caricamento.
	const [spancoStats, setSpancoStats] = useState<SpancoStatistics | null>(null);
	const [spancoError, setSpancoError] = useState<string | null>(null);
	const [isSpancoLoading, setIsSpancoLoading] = useState(false);

	// Stato per la griglia statistiche trattative (GET /api/statistics/negotiations).
	const [negotiationsStats, setNegotiationsStats] =
		useState<NegotiationsStatistics | null>(null);
	const [negotiationsError, setNegotiationsError] = useState<string | null>(
		null
	);
	const [isNegotiationsLoading, setIsNegotiationsLoading] = useState(false);

	// Hydration guard: vogliamo rendere l'UI dipendente dall'autenticazione
	// (come il pannello ruolo) solo *dopo* il primo pass di hydration lato client.
	const [hasHydrated, setHasHydrated] = useState(false);

	useEffect(() => {
		setHasHydrated(true);
	}, []);

	// Carica le statistiche SPANCO per l'utente autenticato, usando il token dall'auth context.
	useEffect(() => {
		if (!auth?.token) {
			setSpancoStats(null);
			setSpancoError(null);
			setIsSpancoLoading(false);
			return;
		}

		let isCancelled = false;

		setIsSpancoLoading(true);
		setSpancoError(null);

		getNegotiationsSpancoStatistics(auth.token).then((result) => {
			if (isCancelled) {
				return;
			}

			if ("error" in result) {
				setSpancoStats(null);
				setSpancoError(result.error);
			} else {
				setSpancoStats(result.data);
				setSpancoError(null);
			}
			setIsSpancoLoading(false);
		});

		return () => {
			isCancelled = true;
		};
	}, [auth?.token]);

	// Carica le statistiche trattative (total_open, conclusion %, amounts, confronti mensili)
	// per popolare la griglia delle card sotto il grafico SPANCO.
	useEffect(() => {
		if (!auth?.token) {
			setNegotiationsStats(null);
			setNegotiationsError(null);
			setIsNegotiationsLoading(false);
			return;
		}

		let isCancelled = false;

		setIsNegotiationsLoading(true);
		setNegotiationsError(null);

		getNegotiationsStatistics(auth.token).then((result) => {
			if (isCancelled) {
				return;
			}

			if ("error" in result) {
				setNegotiationsStats(null);
				setNegotiationsError(result.error);
			} else {
				setNegotiationsStats(result.data);
				setNegotiationsError(null);
			}
			setIsNegotiationsLoading(false);
		});

		return () => {
			isCancelled = true;
		};
	}, [auth?.token]);

	// Show loader until we know auth state; then nothing while redirecting.
	if (!(mounted && isLoaded)) {
		return <Loader />;
	}
	if (!auth?.user) {
		return null; // Redirecting to login
	}

	// Show card skeletons when negotiations stats are loading or pending.
	const showStatsCardSkeletons =
		isNegotiationsLoading ||
		(Boolean(auth?.token) && negotiationsStats === null && !negotiationsError);

	// Build 6 cards from GET /api/statistics/negotiations for the summary grid.
	// Each card links to the relevant trattative list (aperte, concluse, tutte).
	const statsCards: NegotiationsStatsCard[] = negotiationsStats
		? [
				{
					id: "total-open",
					title: "Trattative aperte",
					value: negotiationsStats.total_open_negotiations,
					href: TRATTATIVE_APERTE_HREF,
				},
				{
					id: "total-open-amount",
					title: "Importo totale trattative aperte",
					...currencyCardValue(Number(negotiationsStats.total_open_amount)),
					href: TRATTATIVE_APERTE_HREF,
				},
				{
					id: "average-open-amount",
					title: "Importo medio trattative aperte",
					...currencyCardValue(negotiationsStats.average_open_amount),
					href: TRATTATIVE_APERTE_HREF,
				},
				{
					id: "conclusion-pct",
					title: "Percentuale di conclusione",
					value: negotiationsStats.conclusion_percentage.toFixed(1),
					valueSuffix: "%",
					href: TRATTATIVE_CONCLUSE_HREF,
				},
				{
					id: "average-closing-days",
					title: "Tempo medio chiusura",
					value: negotiationsStats.average_closing_days,
					valueSuffix: " giorni",
					href: TRATTATIVE_CONCLUSE_HREF,
				},
				{
					id: "average-concluded-amount",
					title: "Importo medio trattative concluse",
					...currencyCardValue(negotiationsStats.average_concluded_amount),
					href: TRATTATIVE_CONCLUSE_HREF,
				},
			]
		: [];

	return (
		<main className="m-2.5 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto rounded-3xl bg-card px-9 pt-6 pb-10 font-medium">
			{/* Header */}
			<div className="relative flex w-full flex-col gap-4.5">
				<div className="flex items-center justify-between gap-2.5">
					<h1 className="flex items-center justify-center gap-3.5">
						<DashboardIcon aria-hidden="true" size={24} />
						<span>Dashboard</span>
					</h1>
				</div>
			</div>

			{/* Role-based content when logged in (mostrato solo dopo l'hydration per evitare mismatch SSR/CSR) */}
			{hasHydrated && isLoaded && isLoggedIn && role && (
				<section aria-labelledby="role-panel" className="flex flex-col gap-3">
					<h2 className="sr-only" id="role-panel">
						Pannello per ruolo
					</h2>
					<RoleDashboard role={role} />
				</section>
			)}

			{/* Grafico SPANCO: skeleton from first paint (same as cards); real chart only after hydration + auth + logged in. */}
			{(() => {
				const showChartSkeleton = !(hasHydrated && isLoaded);
				if (showChartSkeleton) {
					return <SpancoDonutChartSkeleton />;
				}
				if (isLoggedIn) {
					return (
						<SpancoDonutChart
							error={spancoError}
							isLoading={isSpancoLoading}
							stats={spancoStats}
						/>
					);
				}
				return null;
			})()}

			{/* Summary cards from GET /api/statistics/negotiations — skeleton when loading. */}
			<section
				aria-labelledby="practices-overview"
				className="flex flex-col gap-3"
			>
				<h2 className="sr-only" id="practices-overview">
					Statistiche trattative
				</h2>
				{negotiationsError && (
					<p className="text-destructive text-sm" role="alert">
						{negotiationsError}
					</p>
				)}
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{!hasHydrated || showStatsCardSkeletons
						? STATS_CARD_IDS.map((id) => (
								<div
									aria-hidden
									className="flex flex-col gap-5 rounded-4xl bg-background px-7 py-7"
									key={id}
								>
									<div className="flex items-center justify-between gap-3">
										<Skeleton className="h-4 w-32" />
									</div>
									<div className="flex items-baseline gap-2">
										<Skeleton className="h-12 w-24" />
									</div>
								</div>
							))
						: statsCards.map((card) => {
								let destinationLabel = "trattative aperte";
								if (card.href === TRATTATIVE_CONCLUSE_HREF) {
									destinationLabel = "trattative concluse";
								} else if (card.href === TRATTATIVE_TUTTE_HREF) {
									destinationLabel = "tutte le trattative";
								}
								return (
									<Link
										aria-label={`${card.title}: ${card.value}${card.valueSuffix ?? ""}, vai a ${destinationLabel}`}
										className="group relative flex flex-col gap-2 rounded-4xl bg-background px-7 py-7 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
										href={card.href as Parameters<typeof Link>[0]["href"]}
										key={card.id}
									>
										{/* Background icons per card — decorative, right-aligned. Opacity on wrapper div, not on icon. No <title> in icons to avoid a11y name concatenation with link. */}
										{card.id === "total-open" && (
											<div
												aria-hidden="true"
												className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 opacity-[0.18] dark:opacity-[0.22]"
											>
												<IconSuitcaseDollarFill18
													aria-hidden="true"
													className="text-sky-500 dark:text-sky-300"
													size={96}
												/>
											</div>
										)}
										{card.id === "conclusion-pct" && (
											<div
												aria-hidden="true"
												className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 opacity-[0.18] dark:opacity-[0.22]"
											>
												<IconTarget
													aria-hidden="true"
													className="text-amber-500 dark:text-amber-300"
													size={96}
												/>
											</div>
										)}
										{card.id === "average-open-amount" && (
											<div
												aria-hidden="true"
												className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 opacity-[0.18] dark:opacity-[0.22]"
											>
												<IconChartBarTrendUp
													aria-hidden="true"
													className="text-emerald-500 dark:text-emerald-300"
													size={96}
												/>
											</div>
										)}
										{card.id === "average-concluded-amount" && (
											<div
												aria-hidden="true"
												className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 opacity-[0.18] dark:opacity-[0.22]"
											>
												<IconVault3Fill18
													aria-hidden="true"
													className="text-indigo-500 dark:text-indigo-300"
													size={96}
												/>
											</div>
										)}
										{card.id === "total-open-amount" && (
											<div
												aria-hidden="true"
												className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 opacity-[0.18] dark:opacity-[0.22]"
											>
												<IconSackDollarFill18
													aria-hidden="true"
													className="text-sky-500 dark:text-sky-300"
													size={96}
												/>
											</div>
										)}
										{card.id === "average-closing-days" && (
											<div
												aria-hidden="true"
												className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 opacity-[0.18] dark:opacity-[0.22]"
											>
												<IconQuickstartFill18
													aria-hidden="true"
													className="text-emerald-500 dark:text-emerald-300"
													size={96}
												/>
											</div>
										)}
										<span className="truncate font-medium text-muted-foreground text-sm">
											{card.title}
										</span>
										<div className="flex items-baseline gap-2">
											{/* Value at full brightness; unit/suffix (€, %, giorni) with lower opacity. */}
											<span className="font-semibold text-5xl text-foreground">
												{card.value}
											</span>
											{card.valueSuffix != null && (
												<span
													aria-hidden="true"
													className="font-semibold text-5xl text-foreground opacity-70"
												>
													{card.valueSuffix}
												</span>
											)}
										</div>
										<ArrowUpRight
											aria-hidden="true"
											className="absolute top-6 right-3 shrink-0 text-foreground opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100"
											size={28}
										/>
									</Link>
								);
							})}
				</div>
			</section>
		</main>
	);
}
