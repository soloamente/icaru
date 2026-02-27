"use client";

import { Plus, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AnimateNumber } from "motion-plus/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	CheckIcon,
	IconCirclePlusFilled,
	IconPeople,
} from "@/components/icons";
import {
	listClientsMe,
	listClientsWithoutNegotiations,
	listNegotiationsMe,
} from "@/lib/api/client";
import type { ApiClient, ApiClientAddress } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { getNegotiationStatoSegment } from "@/lib/trattative-utils";
import { cn } from "@/lib/utils";
import { AddClientDialog } from "./add-client-dialog";
import { AnimatedEmptyState } from "./animated-empty-state";
import IconDeleteLeftFill18 from "./icons/delete-left-fill-18";
import Download4 from "./icons/download-4";
import IconEarthAlertFill18 from "./icons/icon-earth-alert-fill-18";
import IconEyeFill12 from "./icons/icon-eye-fill-12";
import IconFrame69 from "./icons/icon-frame-69";
import IconTriangleWarningFill18 from "./icons/icon-triangle-warning-fill-18";
import { ImportClientsDialog } from "./import-clients-dialog";
import { CreateNegotiationDialog } from "./trattative-table";

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
	const { token } = useAuth();
	const router = useRouter();
	const [clients, setClients] = useState<ApiClient[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
	/** Opens dialog to add a single client. */
	const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
	/** When set, "Nuova trattativa" dialog is open with this client pre-selected (from row "Aggiungi"). */
	const [clientIdForNewNegotiation, setClientIdForNewNegotiation] = useState<
		number | null
	>(null);
	// Controls animated width of the search pill (expand on focus, like trattative page).
	const [isSearchFocused, setIsSearchFocused] = useState(false);
	// Ref for the search input so the clear icon can return focus to the field after clearing.
	const searchInputRef = useRef<HTMLInputElement | null>(null);
	/**
	 * Keep track of which clients currently have **no** negotiations using the
	 * dedicated backend helper `/api/clients/without-negotiations`. We only
	 * need the ids here so we can render a clear "Aggiungi trattativa" call‑to‑action
	 * in the table when a client is still completely untouched.
	 */
	const [clientsWithoutNegotiationsIds, setClientsWithoutNegotiationsIds] =
		useState<Set<number>>(new Set());

	// Debounce search term before calling API
	useEffect(() => {
		const timer = window.setTimeout(() => {
			setDebouncedSearch(searchTerm.trim());
		}, SEARCH_DEBOUNCE_MS);
		return () => window.clearTimeout(timer);
	}, [searchTerm]);

	// API Clienti: tutti i ruoli → GET /api/clients/me (solo clienti personali, ordinati per ragione sociale).
	// Modificato: il direttore vendite non vede più tutta l'azienda, solo i propri clienti.
	const fetchClients = useCallback(async () => {
		if (!token) {
			return;
		}
		setLoading(true);
		setError(null);
		const result = await listClientsMe(token, {
			search: debouncedSearch || undefined,
		});
		setLoading(false);
		if ("error" in result) {
			setError(result.error);
			setClients([]);
			return;
		}
		setClients(result.data);
	}, [token, debouncedSearch]);

	/**
	 * Load once the list of clients that have **no** negotiations yet. We keep
	 * this decoupled from the main clients fetch so search queries do not spam
	 * the `/clients/without-negotiations` endpoint; the membership is global
	 * for the current user/company, while the main list is filtered by search.
	 */
	const fetchClientsWithoutNegotiations = useCallback(async () => {
		if (!token) {
			return;
		}
		const result = await listClientsWithoutNegotiations(token);
		if ("error" in result) {
			// If this helper fails we silently fall back to treating all clients
			// as "with potential trattative" so the main table keeps working.
			return;
		}
		setClientsWithoutNegotiationsIds(
			new Set(result.data.map((client) => client.id))
		);
	}, [token]);

	/**
	 * Naviga alla pagina di dettaglio del cliente `/clienti/[id]`.
	 * Manteniamo questa funzione separata così da poterla riutilizzare sia
	 * sul click della riga intera sia sul bottone "Ragione sociale" nella
	 * prima colonna, riducendo duplicazioni e facilitando future modifiche
	 * al percorso di routing.
	 */
	const handleOpenClientDetail = useCallback(
		(clientId: number) => {
			// biome-ignore lint/suspicious/noExplicitAny: cast string path su tipo Route interno di Next
			router.push(`/clienti/${clientId}` as any);
		},
		[router]
	);

	/**
	 * When a client already has at least one negotiation, clicking the
	 * "Ha trattative" pill should take the user directly to a relevant
	 * trattativa detail page. We:
	 * - Fetch negotiations for that client (solo proprie trattative).
	 * - If at least one exists, derive the correct stato segment and route
	 *   to `/trattative/{stato}/{id}` using the first match.
	 * - If for any reason none are returned, fall back to the list view
	 *   filtered by `client_id` so the user still lands in the right context.
	 */
	const handleOpenClientNegotiation = useCallback(
		async (clientId: number) => {
			if (!token) {
				return;
			}
			const result = await listNegotiationsMe(token, {
				client_id: clientId,
			});
			if ("error" in result) {
				// Reuse the table-level error surface so the user sees a clear message
				// instead of failing silently when the navigation cannot be resolved.
				setError(result.error);
				return;
			}
			// Filter by client_id: backend may ignore the client_id query param
			const forClient = result.data.filter((n) => n.client_id === clientId);
			// Prefer aperte over concluse over abbandonate
			const order = { aperte: 0, concluse: 1, abbandonate: 2 } as const;
			const sorted = [...forClient].sort((a, b) => {
				const sa = getNegotiationStatoSegment(a);
				const sb = getNegotiationStatoSegment(b);
				return (order[sa] ?? 2) - (order[sb] ?? 2);
			});
			const [first] = sorted;
			if (!first) {
				// Defensive fallback: if no negotiations are found, send the user to
				// the open negotiations list filtered by this client so they can
				// create or inspect trattative in the right place.
				router.push(`/trattative/aperte?client_id=${clientId}`);
				return;
			}
			const stato = getNegotiationStatoSegment(first);
			router.push(`/trattative/${stato}/${first.id}`);
		},
		[router, token]
	);

	useEffect(() => {
		fetchClients();
	}, [fetchClients]);

	useEffect(() => {
		// Fire-and-forget: we do not block the main table on this enrichment.
		fetchClientsWithoutNegotiations();
	}, [fetchClientsWithoutNegotiations]);

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

	// Stats per le card: totale visibili, senza trattativa (in lista without-negotiations), con almeno una trattativa.
	const clientsWithoutCount = visibleClients.filter((c) =>
		clientsWithoutNegotiationsIds.has(c.id)
	).length;
	const clientsWithCount = visibleClients.length - clientsWithoutCount;

	return (
		<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
			{/* Header: title on the left, search + Import button aligned to the right on the same row */}
			<div className="relative flex w-full items-center justify-between gap-4.5">
				<h1 className="flex items-center justify-center gap-3.5">
					{/* Usiamo la stessa icona della voce "Clienti" nella Sidebar per coerenza visiva. */}
					<IconPeople aria-hidden size={24} />
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
							ref={searchInputRef}
							value={searchTerm}
						/>
						{/* Swap search icon ↔ clear button based on input content. Appearance matches trattative page search bar. */}
						<div className="ml-2 flex items-center justify-center">
							<AnimatePresence initial={false} mode="wait">
								{searchTerm.length > 0 ? (
									<motion.button
										animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
										aria-label="Cancella ricerca"
										className="flex items-center justify-center rounded-full text-search-placeholder transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
										exit={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
										initial={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
										key="clear"
										onClick={(event) => {
											event.preventDefault();
											event.stopPropagation();
											setSearchTerm("");
											searchInputRef.current?.focus();
										}}
										transition={{
											duration: 0.16,
											ease: [0.22, 0.61, 0.36, 1],
										}}
										type="button"
										whileTap={{ scale: 0.9 }}
									>
										<IconDeleteLeftFill18
											className={cn(
												"transition-colors duration-150",
												isSearchFocused
													? "text-foreground"
													: "text-search-placeholder"
											)}
											size="18px"
										/>
									</motion.button>
								) : (
									<motion.div
										animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
										aria-hidden
										className="flex items-center justify-center"
										exit={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
										initial={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
										key="search"
										transition={{
											duration: 0.16,
											ease: [0.22, 0.61, 0.36, 1],
										}}
									>
										<Search
											aria-hidden
											className={cn(
												"size-4 transition-colors duration-150",
												isSearchFocused
													? "text-foreground"
													: "text-search-placeholder"
											)}
										/>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
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
				{/* Stats: stessa pattern della pagina trattative — icona fill in bg (bottom-right, opacity bassa sul wrapper div, non sull'icona), AnimateNumber per tutti i numeri. */}
				<div className="flex flex-wrap items-start gap-3.75">
					<div className="relative flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75">
						<div
							aria-hidden
							className="pointer-events-none absolute right-0 bottom-0 opacity-[0.08]"
						>
							<IconPeople
								aria-hidden
								className="text-black dark:text-white"
								size={56}
							/>
						</div>
						<h3 className="font-medium text-sm text-stats-title leading-none">
							Totale clienti
						</h3>
						<div className="flex items-center justify-start">
							<AnimateNumber className="text-xl tabular-nums leading-none">
								{visibleClients.length}
							</AnimateNumber>
						</div>
					</div>
					<div className="relative flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75">
						<div
							aria-hidden
							className="pointer-events-none absolute right-0 bottom-0 opacity-[0.08]"
						>
							<IconCirclePlusFilled
								aria-hidden
								className="text-black dark:text-white"
								size={56}
							/>
						</div>
						<h3 className="font-medium text-sm text-stats-title leading-none">
							Clienti senza trattativa
						</h3>
						<div className="flex items-center justify-start">
							<AnimateNumber className="text-xl tabular-nums leading-none">
								{clientsWithoutCount}
							</AnimateNumber>
						</div>
					</div>
					<div className="relative flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75">
						<div
							aria-hidden
							className="pointer-events-none absolute right-0 bottom-0 opacity-[0.08]"
						>
							<CheckIcon
								aria-hidden
								className="text-black dark:text-white"
								size={56}
							/>
						</div>
						<h3 className="font-medium text-sm text-stats-title leading-none">
							Clienti con trattativa
						</h3>
						<div className="flex items-center justify-start">
							<AnimateNumber className="text-xl tabular-nums leading-none">
								{clientsWithCount}
							</AnimateNumber>
						</div>
					</div>
				</div>

				{/* Table */}
				<div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
					{/* Header: align background with table container using the same CSS variable */}
					<div className="table-header-bg shrink-0 rounded-xl px-3 py-2.25">
						<div className="grid grid-cols-[minmax(180px,1.25fr)_minmax(160px,1fr)_minmax(100px,0.75fr)_minmax(100px,0.75fr)_minmax(90px,0.5fr)_minmax(210px,1.5fr)_minmax(130px,0.9fr)] items-center gap-4 font-medium text-sm text-table-header-foreground">
							<div>Ragione sociale</div>
							<div>Email</div>
							<div>P.IVA</div>
							<div>Telefono</div>
							<div>Tipologia</div>
							<div>Sede</div>
							<div>Trattativa</div>
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
							<AnimatedEmptyState
								cta={
									debouncedSearch.length > 0
										? undefined
										: {
												label: "Aggiungi cliente",
												icon: <IconCirclePlusFilled aria-hidden size={16} />,
												onClick: () => setIsAddClientDialogOpen(true),
											}
								}
								heading={
									debouncedSearch.length > 0
										? "Nessun risultato"
										: "Non hai ancora clienti"
								}
								icon={
									debouncedSearch.length > 0 ? (
										<div className="opacity-50">
											<Search className="text-muted-foreground" size={64} />
										</div>
									) : (
										<div className="opacity-50">
											<IconPeople
												aria-hidden
												className="text-muted-foreground"
												size={64}
											/>
										</div>
									)
								}
								subtitle={
									debouncedSearch.length > 0
										? "Prova con un altro termine di ricerca"
										: "Aggiungi il tuo primo cliente per iniziare"
								}
							/>
						)}
						{!(loading || error) &&
							visibleClients.length > 0 &&
							visibleClients.map((c) => {
								// A client is considered "senza trattative" when its id appears in the
								// dedicated helper list. Everyone else is grouped under "ha almeno una
								// trattativa" so we can show a simple, binary status pill.
								const hasNoNegotiations =
									clientsWithoutNegotiationsIds.size > 0 &&
									clientsWithoutNegotiationsIds.has(c.id);

								return (
									// biome-ignore lint/a11y/useSemanticElements: row contains inner buttons (Aggiungi/Ha trattativa); native <button> would be invalid HTML (nested interactive).
									<div
										/* Riga tabellare con hover visivo; l'intera riga è cliccabile
										   per aprire la pagina di dettaglio cliente. Non usiamo un
										   `<button>` per la riga perché conterrebbe altri pulsanti
										   (Aggiungi / Ha trattativa), nesting invalido in HTML che
										   fa sì che il click sulla pill animi anche la riga. Qui
										   usiamo div + role="button" + stopPropagation sui pulsanti
										   della colonna "Trattativa" così solo la riga reagisce al
										   click sulle celle, non sulle pill. */
										className="w-full cursor-pointer border-checkbox-border/70 border-b bg-transparent px-3 py-5 font-medium last:border-b-0 hover:bg-table-hover"
										key={c.id}
										onClick={() => handleOpenClientDetail(c.id)}
										onKeyDown={(event) => {
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												handleOpenClientDetail(c.id);
											}
										}}
										role="button"
										tabIndex={0}
									>
										<div className="grid grid-cols-[minmax(180px,1.25fr)_minmax(160px,1fr)_minmax(100px,0.75fr)_minmax(100px,0.75fr)_minmax(90px,0.5fr)_minmax(210px,1.5fr)_minmax(130px,0.9fr)] items-center gap-4 text-base">
											<div className="truncate">
												<span className="w-full truncate text-left">
													{getClientDisplay(c)}
												</span>
											</div>
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
												className="flex min-w-0 items-center gap-2"
												title={formatAddress(c.address) || undefined}
											>
												<span className="min-w-0 truncate">
													{formatAddress(c.address) || (
														<span className="text-stats-title">—</span>
													)}
												</span>
												{/* Geocoding failed: show warning pill so user knows client won't appear on map. */}
												{c.address?.geocoding_failed && (
													<div className="group relative shrink-0">
														<span
															aria-label="Indirizzo errato / incompleto, il cliente non verrà visualizzato sulla mappa"
															className="inline-flex items-center justify-center rounded-full bg-geocoding-trigger-bg px-2 py-1 text-geocoding-trigger-text"
															role="img"
														>
															<IconEarthAlertFill18 size="18px" />
														</span>
														<span
															aria-live="polite"
															className="xl pointer-events-none absolute top-full left-1/2 z-20 mt-4 flex w-[350px] -translate-x-1/2 flex-col rounded-3xl bg-geocoding-tooltip-bg px-3.5 py-3.5 text-left opacity-0 shadow-lg ring-1 ring-geocoding-tooltip-ring/80 ring-inset transition-opacity duration-200 ease-out group-hover:opacity-100"
														>
															{/* "Attenzione" pill overlapping the top edge. */}
															<span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-geocoding-attention-bg px-2 py-1 text-geocoding-attention-text text-xs">
																<IconTriangleWarningFill18 size="14px" />
																Attenzione
															</span>
															{/* Content: icon + text, horizontal layout. */}
															<div className="flex items-center gap-3">
																<IconFrame69 size="40px" />

																<span className="min-w-0 flex-1 leading-none">
																	<span className="text-geocoding-title text-md leading-none">
																		Indirizzo errato o incompleto
																	</span>
																	<span className="mt-1 block text-balance font-normal text-geocoding-desc text-sm leading-none">
																		Il cliente non verrà visualizzato sulla
																		mappa.
																	</span>
																</span>
															</div>
														</span>
													</div>
												)}
											</div>
											<div className="flex items-center justify-start">
												{hasNoNegotiations ? (
													<button
														// CTA: apri il dialog "Nuova trattativa" qui con il cliente già selezionato
														// invece di navigare a /trattative/aperte.
														// Padding, gap e tipografia allineati alle pill di stato della tabella trattative
														// (py-1.25, pr-3, pl-2.5, gap-2, font-medium, text-base) per coerenza visiva.
														className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-100 py-1.25 pr-3 pl-2.5 font-medium text-base text-sky-800 transition-colors hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 dark:bg-sky-900/30 dark:text-sky-400 dark:hover:bg-sky-900/40"
														onClick={(event) => {
															event.stopPropagation();
															setClientIdForNewNegotiation(c.id);
														}}
														type="button"
													>
														{/* Same plus icon as header "Aggiungi" and as trattative table (IconCirclePlusFilled). */}
														<IconCirclePlusFilled aria-hidden size={18} />
														<span>Aggiungi</span>
													</button>
												) : (
													// Wrapper "group" per mostrare un tooltip custom al passaggio del mouse sulla pill "Ha trattativa".
													<div className="group relative inline-flex">
														<button
															// Usa il verde delle pill "Conclusa" per indicare visivamente che esiste già almeno una trattativa collegata.
															// Padding, gap e tipografia allineati alle pill di stato della tabella trattative
															// così che "Ha trattativa" appaia come uno stato concluso coerente.
															className="inline-flex items-center justify-center gap-2 rounded-full bg-green-100 py-1.25 pr-3 pl-2.5 font-medium text-base text-green-800 transition-colors hover:bg-green-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/70 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/40"
															// Manteniamo anche il title per avere un fallback nativo su browser/touch.
															onClick={(event) => {
																// Anche qui blocchiamo la propagazione per evitare
																// che la riga cliccabile porti al dettaglio cliente
																// quando l'utente vuole aprire direttamente la trattativa.
																event.stopPropagation();
																handleOpenClientNegotiation(c.id);
															}}
															title="Clicca per visualizzare la trattativa"
															type="button"
														>
															{/* Small "eye" icon to indicate that at least one trattativa can be viewed for this client. */}
															<IconEyeFill12 />
															<span>Mostra trattativa</span>
														</button>
														{/* Tooltip leggero che segue la linea guida: niente contenuto interattivo, solo testo descrittivo. */}
														<span
															aria-live="polite"
															className="pointer-events-none absolute top-full left-1/2 z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-popover-foreground text-xs opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
														>
															Clicca per visualizzare la trattativa
														</span>
													</div>
												)}
											</div>
										</div>
									</div>
								);
							})}
					</div>
				</div>
			</div>

			<ImportClientsDialog
				onOpenChange={setIsImportDialogOpen}
				onSuccess={fetchClients}
				open={isImportDialogOpen}
			/>

			<AddClientDialog
				onOpenChange={setIsAddClientDialogOpen}
				onSuccess={() => {
					fetchClients();
					fetchClientsWithoutNegotiations();
				}}
				open={isAddClientDialogOpen}
			/>

			{/* "Nuova trattativa" dialog opened from row "Aggiungi": client is pre-selected so user stays on /clienti. */}
			<CreateNegotiationDialog
				initialClientId={clientIdForNewNegotiation ?? undefined}
				onOpenChange={(open: boolean) => {
					if (!open) {
						setClientIdForNewNegotiation(null);
					}
				}}
				onSuccess={() => {
					fetchClientsWithoutNegotiations();
					setClientIdForNewNegotiation(null);
				}}
				open={clientIdForNewNegotiation != null}
			/>
		</main>
	);
}
