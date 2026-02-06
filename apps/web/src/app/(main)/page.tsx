"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { useAuthOptional } from "@/lib/auth/auth-context";
import { trpc } from "@/utils/trpc";

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

/** Role-specific dashboard content (Admin / Director / Seller). */
function RoleDashboard({ role }: { role: "admin" | "director" | "seller" }) {
	if (role === "admin") {
		return (
			<section className="rounded-lg border p-4">
				<h2 className="mb-2 font-medium">Pannello Admin</h2>
				<p className="text-muted-foreground text-sm">
					Gestione aziende, utenti e configurazione. (Funzionalità in arrivo.)
				</p>
			</section>
		);
	}
	if (role === "director") {
		return (
			<section className="rounded-lg border p-4">
				<h2 className="mb-2 font-medium">Pannello Direttore</h2>
				<p className="text-muted-foreground text-sm">
					Gestione team, negoziazioni e clienti aziendali. (Funzionalità in
					arrivo.)
				</p>
			</section>
		);
	}
	return (
		<section className="rounded-lg border p-4">
			<h2 className="mb-2 font-medium">Pannello Venditore</h2>
			<p className="text-muted-foreground text-sm">
				I tuoi clienti e negoziazioni. (Funzionalità in arrivo.)
			</p>
		</section>
	);
}

export default function Home() {
	const auth = useAuthOptional();
	const healthCheck = useQuery(trpc.healthCheck.queryOptions());

	const isLoaded = auth?.isLoaded ?? false;
	const isLoggedIn = Boolean(auth?.user && auth?.token);
	const role = auth?.role ?? null;

	return (
		<div className="container mx-auto max-w-3xl px-4 py-2">
			<pre className="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>
			<div className="grid gap-6">
				{/* When not logged in: CTA to login */}
				{isLoaded && !isLoggedIn && (
					<section className="rounded-lg border p-4">
						<h2 className="mb-2 font-medium">Accedi</h2>
						<p className="mb-2 text-muted-foreground text-sm">
							Accedi al tuo account per gestire clienti e negoziazioni.
						</p>
						<Link
							className="text-primary underline underline-offset-2 hover:no-underline"
							href="/login"
						>
							Vai al login
						</Link>
					</section>
				)}

				{/* When logged in: role-based content */}
				{isLoaded && isLoggedIn && role && auth?.user && (
					<RoleDashboard role={role} />
				)}

				<section className="rounded-lg border p-4">
					<h2 className="mb-2 font-medium">API Status</h2>
					<div className="flex items-center gap-2">
						<div
							className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
						/>
						<span className="text-muted-foreground text-sm">
							{healthCheck.isLoading && "Checking..."}
							{!healthCheck.isLoading && healthCheck.data && "Connected"}
							{!(healthCheck.isLoading || healthCheck.data) && "Disconnected"}
						</span>
					</div>
				</section>
			</div>
		</div>
	);
}
