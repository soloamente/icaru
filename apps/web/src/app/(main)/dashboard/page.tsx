"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { CheckIcon, DashboardIcon, FileTextIcon } from "@/components/icons";
import { SpancoDonutChart } from "@/components/spanco-donut-chart";
import { getNegotiationsSpancoStatistics } from "@/lib/api/client";
import type { SpancoStatistics } from "@/lib/api/types";
import { useAuthOptional } from "@/lib/auth/auth-context";

interface DashboardCard {
	id: string;
	title: string;
	value: string;
	description: string;
	icon: ReactNode;
	iconClassName: string;
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

export default function DashboardPage() {
	const auth = useAuthOptional();
	const isLoaded = auth?.isLoaded ?? false;
	const isLoggedIn = Boolean(auth?.user && auth?.token);
	const role = auth?.role ?? null;

	// Stato per il grafico SPANCO: contiene le statistiche, l'errore e il flag di caricamento.
	const [spancoStats, setSpancoStats] = useState<SpancoStatistics | null>(null);
	const [spancoError, setSpancoError] = useState<string | null>(null);
	const [isSpancoLoading, setIsSpancoLoading] = useState(false);

	// Hydration guard: vogliamo rendere l'UI dipendente dall'autenticazione
	// (come il pannello ruolo) solo *dopo* il primo pass di hydration lato client.
	// In questo modo il markup generato dal server combacia con il primo render
	// del client ed evitiamo warning/rigenerazioni di React durante l'hydration.
	const [hasHydrated, setHasHydrated] = useState(false);

	useEffect(() => {
		setHasHydrated(true);
	}, []);

	// Carica le statistiche SPANCO per l'utente autenticato, usando il token dall'auth context.
	useEffect(() => {
		if (!auth?.token) {
			// Se non c'è token (utente non loggato), azzeriamo lo stato del grafico.
			setSpancoStats(null);
			setSpancoError(null);
			setIsSpancoLoading(false);
			return;
		}

		let isCancelled = false;

		setIsSpancoLoading(true);
		setSpancoError(null);

		void getNegotiationsSpancoStatistics(auth.token).then((result) => {
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

	// Placeholder cards - replace with real data when API is available
	const dashboardCards: DashboardCard[] = [
		{
			id: "negotiations",
			title: "Negoziazioni attive",
			value: "—",
			description: "In corso",
			icon: <FileTextIcon aria-hidden="true" size={18} />,
			iconClassName: "text-chart-1",
		},
		{
			id: "completed",
			title: "Concluse",
			value: "—",
			description: "Totale",
			icon: <CheckIcon aria-hidden="true" size={18} />,
			iconClassName: "text-green-600 dark:text-green-500",
		},
		{
			id: "clients",
			title: "Clienti",
			value: "—",
			description: "Totale",
			icon: <FileTextIcon aria-hidden="true" size={18} />,
			iconClassName: "text-foreground",
		},
		{
			id: "total",
			title: "Totale",
			value: "—",
			description: "Riepilogo",
			icon: <FileTextIcon aria-hidden="true" size={18} />,
			iconClassName: "text-muted-foreground",
		},
	];

	return (
		<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
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

			{/* Grafico SPANCO ad anello: mostra le trattative attive per stato SPANCO. */}
			{isLoaded && isLoggedIn && (
				<SpancoDonutChart
					error={spancoError}
					isLoading={isSpancoLoading}
					stats={spancoStats}
				/>
			)}

			{/* Not logged in */}
			{isLoaded && !isLoggedIn && (
				<section
					aria-labelledby="login-cta"
					className="rounded-lg border border-border p-4"
				>
					<h2 className="mb-2 font-medium" id="login-cta">
						Accedi
					</h2>
					<p className="text-muted-foreground text-sm">
						Accedi al tuo account per gestire clienti e negoziazioni.
					</p>
					<Link
						className="mt-2 inline-block text-primary underline underline-offset-2 hover:no-underline"
						href="/login"
					>
						Vai al login
					</Link>
				</section>
			)}

			{/* Summary cards - same layout as reference dashboard */}
			<section
				aria-labelledby="practices-overview"
				className="flex flex-col gap-3"
			>
				<h2 className="sr-only" id="practices-overview">
					Riepilogo
				</h2>
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2">
					{dashboardCards.map((card) => (
						<div
							className="flex flex-col gap-3 rounded-4xl bg-background p-5"
							key={card.id}
						>
							<div className="flex items-center justify-between gap-3">
								<span className="font-medium text-muted-foreground text-sm">
									{card.title}
								</span>
								<span
									aria-hidden="true"
									className={`flex size-9 items-center justify-center rounded-full bg-muted ${card.iconClassName}`}
								>
									{card.icon}
								</span>
							</div>
							<div className="flex items-baseline gap-2">
								<span className="font-semibold text-4xl">{card.value}</span>
							</div>
							<p className="text-muted-foreground text-sm">
								{card.description}
							</p>
						</div>
					))}
				</div>
			</section>
		</main>
	);
}
