"use client";

import { Search, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { listClientsCompany, listClientsMe } from "@/lib/api/client";
import type { ApiClient } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";

/** Debounce delay (ms) for search input before calling API */
const SEARCH_DEBOUNCE_MS = 300;

function getClientDisplay(c: ApiClient): string {
	return c.ragione_sociale || `Cliente #${c.id}`;
}

export default function ClientsTable() {
	const { token, role } = useAuth();
	const [clients, setClients] = useState<ApiClient[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	// Debounce search term before calling API
	useEffect(() => {
		const timer = window.setTimeout(() => {
			setDebouncedSearch(searchTerm.trim());
		}, SEARCH_DEBOUNCE_MS);
		return () => window.clearTimeout(timer);
	}, [searchTerm]);

	// Direttore Vendite: /company (tutta l'azienda). Venditore: /me (clienti assegnati).
	const fetchClients = useCallback(async () => {
		if (!token) {
			return;
		}
		setLoading(true);
		setError(null);
		const listClients =
			role === "director" ? listClientsCompany : listClientsMe;
		const result = await listClients(token, {
			search: debouncedSearch || undefined,
		});
		setLoading(false);
		if ("error" in result) {
			setError(result.error);
			setClients([]);
			return;
		}
		setClients(result.data);
	}, [token, debouncedSearch, role]);

	useEffect(() => {
		fetchClients();
	}, [fetchClients]);

	return (
		<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
			{/* Header */}
			<div className="relative flex w-full flex-col gap-4.5">
				<div className="flex items-center justify-between gap-2.5">
					<h1 className="flex items-center justify-center gap-3.5">
						<Users aria-hidden size={24} />
						<span>Clienti</span>
					</h1>
				</div>
				<div className="flex items-center justify-end gap-2">
					<label
						/* Search bar background follows table buttons color for consistency */
						className="flex w-60 items-center justify-between rounded-full bg-table-buttons px-3.75 py-1.75 text-sm shadow-[-18px_0px_14px_var(--color-card)]"
						htmlFor="clients-search"
					>
						<input
							className="w-full truncate placeholder:text-search-placeholder focus:outline-none"
							id="clients-search"
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder="Cerca per nome o P.IVA..."
							value={searchTerm}
						/>
						<Search className="size-4 text-search-placeholder" />
					</label>
				</div>
			</div>

			{/* Body: use table container background token for the shell */}
			<div className="table-container-bg flex min-h-0 flex-1 flex-col gap-6.25 rounded-t-3xl px-5.5 pt-6.25">
				{/* Stats */}
				<div className="flex items-start gap-3.75">
					<div className="flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75">
						<h3 className="font-medium text-sm text-stats-title leading-none">
							Totale clienti
						</h3>
						<div className="flex items-center justify-start">
							<span className="text-xl tabular-nums leading-none">
								{clients.length}
							</span>
						</div>
					</div>
				</div>

				{/* Table */}
				<div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
					{/* Header: align background with table container using the same CSS variable */}
					<div className="table-header-bg shrink-0 rounded-xl px-3 py-2.25">
						<div className="grid grid-cols-[minmax(80px,0.5fr)_minmax(200px,1.5fr)_minmax(120px,1fr)] items-center gap-4 font-medium text-sm text-table-header-foreground">
							<div>ID</div>
							<div>Ragione sociale</div>
							<div>Partita IVA</div>
						</div>
					</div>
					<div className="scroll-fade-y flex h-full min-h-0 flex-1 flex-col overflow-scroll">
						{loading && (
							<div className="flex h-full items-center justify-center p-8">
								<p className="text-stats-title">Caricamento…</p>
							</div>
						)}
						{!loading && error && (
							<div className="flex h-full items-center justify-center p-8">
								<p className="text-center text-destructive">{error}</p>
							</div>
						)}
						{!(loading || error) && clients.length === 0 && (
							<div className="flex h-full items-center justify-center p-8">
								<p className="text-center text-stats-title">
									Nessun cliente trovato
								</p>
							</div>
						)}
						{!(loading || error) &&
							clients.length > 0 &&
							clients.map((c) => (
								<div
									/* Row hover uses dedicated table hover token */
									className="w-full border-checkbox-border/70 border-b bg-transparent px-3 py-5 font-medium last:border-b-0 hover:bg-table-hover"
									key={c.id}
								>
									<div className="grid grid-cols-[minmax(80px,0.5fr)_minmax(200px,1.5fr)_minmax(120px,1fr)] items-center gap-4 text-base">
										<div className="truncate tabular-nums">{c.id}</div>
										<div className="flex items-center gap-2 truncate">
											<Avatar aria-hidden className="size-8 bg-background">
												<AvatarFallback placeholderSeed={getClientDisplay(c)} />
											</Avatar>
											<span className="truncate">{getClientDisplay(c)}</span>
										</div>
										<div className="truncate tabular-nums">
											{c.partita_iva ? (
												c.partita_iva
											) : (
												<span className="text-stats-title">—</span>
											)}
										</div>
									</div>
								</div>
							))}
					</div>
				</div>
			</div>
		</main>
	);
}
