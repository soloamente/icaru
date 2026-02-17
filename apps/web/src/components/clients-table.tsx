"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Plus, Search, X } from "lucide-react";
import { motion } from "motion/react";
import { AnimateNumber } from "motion-plus/react";
import { useCallback, useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { listClientsCompany, listClientsMe } from "@/lib/api/client";
import type { ApiClient, ApiClientAddress } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import Download4 from "./icons/download-4";
import { UserGroupIcon } from "./icons/user-group";
import { ImportClientsDialog } from "./import-clients-dialog";

/** Debounce delay (ms) for search input before calling API */
const SEARCH_DEBOUNCE_MS = 300;

function getClientDisplay(c: ApiClient): string {
	return c.ragione_sociale || `Cliente #${c.id}`;
}

/**
 * Formatta indirizzo per la colonna Sede: indirizzo, CAP citta (provincia).
 * Ignora campi null/undefined per evitare stringhe "null" in output (es. "test, null null, (test)").
 */
function formatAddress(addr: ApiClientAddress | null | undefined): string {
	if (!addr) {
		return "";
	}
	const parts: string[] = [];
	const indirizzo =
		addr.indirizzo != null && String(addr.indirizzo).trim() !== ""
			? String(addr.indirizzo).trim()
			: null;
	const cap =
		addr.CAP != null && String(addr.CAP).trim() !== ""
			? String(addr.CAP).trim()
			: null;
	const citta =
		addr.citta != null && String(addr.citta).trim() !== ""
			? String(addr.citta).trim()
			: null;
	const provincia =
		addr.provincia != null && String(addr.provincia).trim() !== ""
			? String(addr.provincia).trim()
			: null;
	if (indirizzo) {
		parts.push(indirizzo);
	}
	const capCitta = [cap, citta].filter(Boolean).join(" ").trim();
	if (capCitta) {
		parts.push(capCitta);
	}
	if (provincia) {
		parts.push(`(${provincia})`);
	}
	return parts.join(", ");
}

export default function ClientsTable() {
	const { token, role } = useAuth();
	const [clients, setClients] = useState<ApiClient[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
	/** Opens dialog to add a single client (placeholder until AddClientDialog exists). */
	const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
	const isMobile = useIsMobile();
	// Controls animated width of the search pill (expand on focus, like trattative page).
	const [isSearchFocused, setIsSearchFocused] = useState(false);

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

	/**
	 * Local, defensive filtering so that the search input always works even if
	 * the backend ignores or only partially supports the `search` query param.
	 * Match by ragione sociale, email, P.IVA, telefono, tipologia, indirizzo (case-insensitive).
	 */
	const normalizedSearch = debouncedSearch.toLowerCase();
	const visibleClients =
		normalizedSearch.length > 0
			? clients.filter((client) => {
					const name = getClientDisplay(client).toLowerCase();
					const pIva = client.p_iva?.toLowerCase() ?? "";
					const email = client.email?.toLowerCase() ?? "";
					const telefono = client.telefono ?? "";
					const tipologia = client.tipologia?.toLowerCase() ?? "";
					const sede = formatAddress(client.address).toLowerCase();
					return (
						name.includes(normalizedSearch) ||
						pIva.includes(normalizedSearch) ||
						email.includes(normalizedSearch) ||
						telefono.includes(normalizedSearch) ||
						tipologia.includes(normalizedSearch) ||
						sede.includes(normalizedSearch)
					);
				})
			: clients;

	return (
		<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
			{/* Header: title on the left, search + Import button aligned to the right on the same row */}
			<div className="relative flex w-full items-center justify-between gap-4.5">
				<h1 className="flex items-center justify-center gap-3.5">
					{/* Usiamo la stessa icona della voce "Clienti" nella Sidebar per coerenza visiva. */}
					<UserGroupIcon aria-hidden size={24} />
					<span>Clienti</span>
				</h1>
				<div className="flex items-center justify-end gap-2">
					{/* Search pill expands on focus (same behavior as trattative page). */}
					<motion.label
						animate={{
							width: isSearchFocused ? "21rem" : "15rem",
						}}
						className="flex items-center justify-between rounded-full bg-table-buttons px-3.75 py-1.75 text-sm shadow-[-18px_0px_14px_var(--color-card)]"
						htmlFor="clients-search"
						initial={false}
						transition={{
							duration: 0.5,
							ease: [0.541, 0.232, 0.226, 1.002],
						}}
					>
						<input
							className="w-full truncate placeholder:text-search-placeholder focus:outline-none"
							id="clients-search"
							onBlur={() => setIsSearchFocused(false)}
							onChange={(e) => setSearchTerm(e.target.value)}
							onFocus={() => setIsSearchFocused(true)}
							placeholder="Cerca per nome, email, P.IVA, telefono, tipologia, sede..."
							value={searchTerm}
						/>
						<Search className="size-4 shrink-0 text-search-placeholder" />
					</motion.label>
					{/* Primary action: add a single client (same pill style as trattative "Aggiungi"). */}
					<button
						aria-label="Aggiungi cliente"
						className="flex cursor-pointer items-center justify-center gap-2.5 rounded-full bg-table-buttons px-3.75 py-1.75 text-sm"
						onClick={() => setIsAddClientDialogOpen(true)}
						type="button"
					>
						Aggiungi
						<Plus className="size-4 text-button-secondary" />
					</button>
					{/* Import from Excel/CSV; same pill style, placed to the right of Aggiungi. */}
					<button
						aria-label="Importa clienti"
						className="flex cursor-pointer items-center justify-center gap-2.5 rounded-full bg-table-buttons px-3.75 py-1.75 text-sm"
						onClick={() => setIsImportDialogOpen(true)}
						type="button"
					>
						Importa
						<Download4 className="size-4 text-button-secondary" />
					</button>
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
							{/* Animated counter so the total reacts smoothly to search changes */}
							<AnimateNumber className="text-xl tabular-nums leading-none">
								{visibleClients.length}
							</AnimateNumber>
						</div>
					</div>
				</div>

				{/* Table */}
				<div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
					{/* Header: align background with table container using the same CSS variable */}
					<div className="table-header-bg shrink-0 rounded-xl px-3 py-2.25">
						<div className="grid grid-cols-[minmax(180px,1.25fr)_minmax(160px,1fr)_minmax(100px,0.75fr)_minmax(100px,0.75fr)_minmax(90px,0.5fr)_minmax(240px,1.9fr)] items-center gap-4 font-medium text-sm text-table-header-foreground">
							<div>Ragione sociale</div>
							<div>Email</div>
							<div>P.IVA</div>
							<div>Telefono</div>
							<div>Tipologia</div>
							<div>Sede</div>
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
						{!(loading || error) && visibleClients.length === 0 && (
							<div className="flex h-full items-center justify-center p-8">
								<p className="text-center text-stats-title">
									Nessun cliente trovato
								</p>
							</div>
						)}
						{!(loading || error) &&
							visibleClients.length > 0 &&
							visibleClients.map((c) => (
								<div
									/* Row hover uses dedicated table hover token */
									className="w-full border-checkbox-border/70 border-b bg-transparent px-3 py-5 font-medium last:border-b-0 hover:bg-table-hover"
									key={c.id}
								>
									<div className="grid grid-cols-[minmax(180px,1.25fr)_minmax(160px,1fr)_minmax(100px,0.75fr)_minmax(100px,0.75fr)_minmax(90px,0.5fr)_minmax(240px,1.9fr)] items-center gap-4 text-base">
										<div className="truncate">{getClientDisplay(c)}</div>
										<div className="truncate">
											{c.email ? (
												c.email
											) : (
												<span className="text-stats-title">—</span>
											)}
										</div>
										<div className="truncate tabular-nums">
											{c.p_iva ? (
												c.p_iva
											) : (
												<span className="text-stats-title">—</span>
											)}
										</div>
										<div className="truncate tabular-nums">
											{c.telefono ? (
												c.telefono
											) : (
												<span className="text-stats-title">—</span>
											)}
										</div>
										<div className="truncate">
											{c.tipologia ? (
												c.tipologia
											) : (
												<span className="text-stats-title">—</span>
											)}
										</div>
										<div
											className="truncate"
											title={formatAddress(c.address) || undefined}
										>
											{formatAddress(c.address) || (
												<span className="text-stats-title">—</span>
											)}
										</div>
									</div>
								</div>
							))}
					</div>
				</div>
			</div>

			<ImportClientsDialog
				onOpenChange={setIsImportDialogOpen}
				onSuccess={fetchClients}
				open={isImportDialogOpen}
			/>

			{/* Placeholder dialog "Aggiungi cliente": solo Base UI Dialog (come import-clients), stile bottom sheet su mobile e centrato su desktop. Nessun Radix/Vaul. */}
			<Dialog.Root
				disablePointerDismissal={false}
				onOpenChange={setIsAddClientDialogOpen}
				open={isAddClientDialogOpen}
			>
				<Dialog.Portal>
					<Dialog.Backdrop
						aria-hidden
						className="data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/50 data-closed:animate-out data-open:animate-in"
					/>
					<div
						className={cn(
							"fixed inset-0 z-50 flex p-4",
							isMobile
								? "items-end justify-center"
								: "items-center justify-center"
						)}
					>
						<Dialog.Popup
							aria-describedby="add-client-dialog-desc"
							aria-labelledby="add-client-dialog-title"
							className={cn(
								"flex max-h-[90vh] flex-col overflow-hidden bg-card shadow-[0_18px_45px_rgba(15,23,42,0.55)] outline-none data-closed:animate-out data-open:animate-in",
								isMobile
									? "data-closed:fade-out-0 data-closed:slide-out-to-bottom-4 data-open:fade-in-0 data-open:slide-in-from-bottom-4 fixed inset-x-[10px] bottom-[10px] max-w-none rounded-[36px] px-6 py-5"
									: "data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95 w-full max-w-md rounded-3xl px-6 py-5"
							)}
						>
							<Dialog.Title className="sr-only" id="add-client-dialog-title">
								Aggiungi cliente
							</Dialog.Title>
							<p className="sr-only" id="add-client-dialog-desc">
								Funzionalità in arrivo. Qui sarà possibile inserire un nuovo
								cliente manualmente.
							</p>
							<div
								className={cn(
									isMobile
										? "min-h-0 flex-1 overflow-y-auto"
										: "overflow-y-auto"
								)}
							>
								<div className="flex items-center justify-between gap-3 pb-6">
									{/* Use card-foreground so dialog title is readable in dataweb light (card is light, foreground is light there). */}
									<h2 className="font-bold text-2xl text-card-foreground tracking-tight">
										Aggiungi cliente
									</h2>
									<Dialog.Close
										aria-label="Chiudi"
										className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform focus:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
									>
										<X aria-hidden className="size-4" />
									</Dialog.Close>
								</div>
								<p className="text-muted-foreground text-sm">
									Funzionalità in arrivo. Qui sarà possibile inserire un nuovo
									cliente manualmente.
								</p>
							</div>
						</Dialog.Popup>
					</div>
				</Dialog.Portal>
			</Dialog.Root>
		</main>
	);
}
