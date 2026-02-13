"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { ArrowUpRight, DashboardIcon } from "@/components/icons";
import Loader from "@/components/loader";
import {
	SpancoDonutChart,
	SpancoDonutChartSkeleton,
} from "@/components/spanco-donut-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { getNegotiationsSpancoStatistics } from "@/lib/api/client";
import type { SpancoStage, SpancoStatistics } from "@/lib/api/types";
import { useAuthOptional } from "@/lib/auth/auth-context";

/** Trattative aperte: section linked from each SPANCO card. */
const TRATTATIVE_APERTE_HREF = "/trattative/aperte" as const;

/** Labels and colors for the 6 SPANCO stages (from API). Used for cards and visual consistency. */
const SPANCO_STAGE_CONFIG: {
	stage: SpancoStage;
	label: string;
	/** Background color for the small status dot (e.g. bg-chart-1). */
	dotClassName: string;
}[] = [
	{ stage: "S", label: "Fase Suspect", dotClassName: "bg-chart-1" },
	{ stage: "P", label: "Fase Prospect", dotClassName: "bg-chart-4" },
	{ stage: "A", label: "Fase Approach", dotClassName: "bg-chart-5" },
	{ stage: "N", label: "Fase Negotiation", dotClassName: "bg-chart-2" },
	{ stage: "C", label: "Fase Closing", dotClassName: "bg-chart-3" },
	{ stage: "O", label: "Fase Order", dotClassName: "bg-muted-foreground" },
];

interface DashboardCard {
	id: string;
	/** Label with acronym, e.g. "S Suspect". */
	title: string;
	value: ReactNode;
	dotClassName: string;
	/** Link to section (trattative aperte) for the card. */
	href: typeof TRATTATIVE_APERTE_HREF;
}

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

	// Show loader until we know auth state; then nothing while redirecting.
	if (!(mounted && isLoaded)) {
		return <Loader />;
	}
	if (!auth?.user) {
		return null; // Redirecting to login
	}

	// Show card skeletons when data is loading or pending (has token but no response yet).
	const showCardSkeletons =
		isSpancoLoading ||
		(Boolean(auth?.token) && spancoStats === null && !spancoError);

	// Format value for display: null/error → "Nessun dato", 0 → "0", else number.
	// (When loading we render skeleton cards instead, so we never show "Nessun dato" during load.)
	function formatCardValue(value: number | null): ReactNode {
		if (value === null) {
			return "Nessun dato";
		}
		return String(value);
	}

	// Build 6 cards from API SPANCO fields (S, P, A, N, C, O); each card links to trattative aperte.
	const dashboardCards: DashboardCard[] = SPANCO_STAGE_CONFIG.map((config) => ({
		id: config.stage,
		title: `${config.stage} ${config.label}`,
		value: formatCardValue(spancoStats?.[config.stage] ?? null),
		dotClassName: config.dotClassName,
		href: TRATTATIVE_APERTE_HREF,
	}));

	return (
		<main className="m-2.5 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto rounded-3xl bg-card px-9 pt-6 font-medium">
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

			{/* Summary cards - skeleton grid when loading, otherwise cards with drill-down links.
			    We gate the skeletons vs links switch behind hasHydrated to avoid hydration mismatch:
			    auth/loading state can differ between server and client, so we render a stable
			    placeholder (skeletons) until hydration completes, then switch based on real state. */}
			<section
				aria-labelledby="practices-overview"
				className="flex flex-col gap-3"
			>
				<h2 className="sr-only" id="practices-overview">
					Riepilogo
				</h2>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{/* Before hydration: always show skeletons so server and client markup match */}
					{!hasHydrated || showCardSkeletons
						? SPANCO_STAGE_CONFIG.map((config) => (
								<div
									aria-hidden
									className="flex flex-col gap-5 rounded-4xl bg-background px-7 py-7"
									key={config.stage}
								>
									<div className="flex items-center justify-between gap-3">
										<div className="flex min-w-0 items-center gap-2">
											<Skeleton className="size-6 shrink-0 rounded-full" />
											<Skeleton className="h-4 w-20" />
										</div>
									</div>
									<div className="flex items-baseline gap-2">
										<Skeleton className="h-12 w-16" />
									</div>
								</div>
							))
						: dashboardCards.map((card) => (
								<Link
									aria-label={`${card.title}, vai a trattative aperte`}
									className="group relative flex flex-col gap-5 rounded-4xl bg-background px-7 py-7 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									href={card.href}
									key={card.id}
								>
									{/* Top row: acronym in circle (bright) + full label, arrow on right */}
									<div className="flex items-center justify-between gap-3">
										<div className="flex min-w-0 items-center gap-2">
											<span
												aria-hidden="true"
												className={`flex size-6 shrink-0 items-center justify-center rounded-full font-semibold text-[10px] text-white ${card.dotClassName}`}
											>
												{card.id}
											</span>
											<span className="truncate font-medium text-muted-foreground text-sm">
												{SPANCO_STAGE_CONFIG.find((c) => c.stage === card.id)
													?.label ?? card.title}
											</span>
										</div>
										<ArrowUpRight
											aria-hidden="true"
											className="absolute top-6 right-3 shrink-0 text-foreground opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100"
											size={28}
										/>
									</div>
									<div className="flex items-baseline gap-2">
										<span className="font-semibold text-5xl">{card.value}</span>
									</div>
								</Link>
							))}
				</div>
			</section>
		</main>
	);
}
