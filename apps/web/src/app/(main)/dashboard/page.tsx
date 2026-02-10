"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { CheckIcon, DashboardIcon, FileTextIcon } from "@/components/icons";
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

			{/* Role-based content when logged in */}
			{isLoaded && isLoggedIn && role && (
				<section aria-labelledby="role-panel" className="flex flex-col gap-3">
					<h2 className="sr-only" id="role-panel">
						Pannello per ruolo
					</h2>
					<RoleDashboard role={role} />
				</section>
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
