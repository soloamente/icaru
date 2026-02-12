"use client";

/**
 * Global command palette (⌘K / Ctrl+K) for searching clients and trattative (negotiations).
 * Uses POST /api/search; results are grouped: clients with negotiations, referents, clients without negotiations.
 * Filtering is done server-side; cmdk shouldFilter is false.
 * Uses Base UI Dialog (not Radix) for accessibility and consistency with the rest of the app.
 */

import { Dialog } from "@base-ui/react/dialog";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	listClientsCompany,
	listClientsMe,
	listNegotiationsCompany,
	listNegotiationsMe,
	search,
} from "@/lib/api/client";
import type {
	ApiClient,
	ApiNegotiation,
	SearchClientResult,
	SearchReferentResult,
	SearchResponse,
} from "@/lib/api/types";
import { roleFromApi } from "@/lib/api/types";
import { useAuthOptional } from "@/lib/auth/auth-context";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

/** Build SearchResponse from clients + negotiations (when search is empty). */
function buildSearchResponseFromLists(
	clients: ApiClient[],
	negotiations: ApiNegotiation[]
): SearchResponse {
	const clientIdsWithNegotiations = new Set(
		negotiations.map((n) => n.client_id)
	);
	const toSearchClient = (c: ApiClient): SearchClientResult => ({
		id: c.id,
		ragione_sociale: c.ragione_sociale,
		p_iva: c.partita_iva ?? null,
		email: (c.email as string) ?? null,
		telefono: (c.telefono as string) ?? null,
		tipologia: (c.tipologia as string) ?? null,
	});
	const clientsWithNegotiations = clients
		.filter((c) => clientIdsWithNegotiations.has(c.id))
		.map(toSearchClient);
	const clientsWithoutNegotiations = clients
		.filter((c) => !clientIdsWithNegotiations.has(c.id))
		.map(toSearchClient);
	const referents: SearchReferentResult[] = negotiations.map((n) => ({
		id: n.id,
		referente: n.referente,
		client_id: n.client_id,
		data_apertura: n.created_at ?? "",
		spanco: n.spanco,
		client: {
			ragione_sociale: n.client?.ragione_sociale ?? "",
		},
	}));
	return {
		clients_with_negotiations: clientsWithNegotiations,
		referents,
		clients_without_negotiations: clientsWithoutNegotiations,
	};
}

export default function GlobalSearchCommand() {
	const router = useRouter();
	const auth = useAuthOptional();
	const token = auth?.token ?? null;

	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState<SearchResponse | null>(null);
	const [error, setError] = useState<string | null>(null);

	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	// Toggle command palette on ⌘K / Ctrl+K
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	// Reset state when dialog closes
	useEffect(() => {
		if (!open) {
			setSearchValue("");
			setResults(null);
			setError(null);
		}
	}, [open]);

	// Fetch results: when search empty → list all; when 2+ chars → search API
	useEffect(() => {
		const trimmed = searchValue.trim();

		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
			debounceRef.current = null;
		}

		if (!(token && auth)) {
			if (trimmed.length < MIN_QUERY_LENGTH) {
				setResults(null);
				setError(null);
			}
			return;
		}

		// Empty search: fetch all when dialog is open (no debounce)
		if (trimmed.length === 0 && open) {
			setLoading(true);
			setError(null);
			const role = roleFromApi(auth.user?.role);
			const listClients =
				role === "director" ? listClientsCompany : listClientsMe;
			const listNegotiations =
				role === "director" ? listNegotiationsCompany : listNegotiationsMe;
			Promise.all([listClients(token), listNegotiations(token)])
				.then(([clientsRes, negsRes]) => {
					if ("error" in clientsRes) {
						setError(clientsRes.error);
						setResults(null);
						return;
					}
					if ("error" in negsRes) {
						setError(negsRes.error);
						setResults(null);
						return;
					}
					const data = buildSearchResponseFromLists(
						clientsRes.data,
						negsRes.data
					);
					setResults(data);
					setError(null);
				})
				.finally(() => {
					setLoading(false);
				});
			return;
		}

		// 1 char: clear results, no fetch
		if (trimmed.length < MIN_QUERY_LENGTH) {
			setResults(null);
			setError(null);
			return;
		}

		// 2+ chars: debounced search
		debounceRef.current = setTimeout(() => {
			debounceRef.current = null;
			if (abortRef.current) {
				abortRef.current.abort();
			}
			abortRef.current = new AbortController();

			setLoading(true);
			setError(null);
			search(token, trimmed)
				.then((out) => {
					if ("error" in out) {
						setError(out.error);
						setResults(null);
					} else {
						setResults(out.data);
						setError(null);
					}
				})
				.finally(() => {
					setLoading(false);
					abortRef.current = null;
				});
		}, DEBOUNCE_MS);

		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [searchValue, token, auth, open]);

	const handleOpenChange = useCallback((next: boolean) => {
		setOpen(next);
	}, []);

	// Navigate to negotiation detail; detail page redirects to correct stato (aperte/concluse/abbandonate)
	const handleSelectReferent = useCallback(
		(r: SearchReferentResult) => {
			setOpen(false);
			router.push(`/trattative/aperte/${r.id}`);
		},
		[router]
	);

	// Navigate to clienti list (no client detail route yet)
	const handleSelectClient = useCallback(
		(_c: SearchClientResult) => {
			setOpen(false);
			router.push("/clienti");
		},
		[router]
	);

	const hasResults = useMemo(() => {
		if (!results) {
			return false;
		}
		const {
			clients_with_negotiations,
			referents,
			clients_without_negotiations,
		} = results;
		return (
			clients_with_negotiations.length > 0 ||
			referents.length > 0 ||
			clients_without_negotiations.length > 0
		);
	}, [results]);

	// Only render when we have auth (command is for authenticated users; Admin gets 403 from API)
	if (!auth) {
		return null;
	}

	return (
		<Dialog.Root
			disablePointerDismissal={false}
			onOpenChange={handleOpenChange}
			open={open}
		>
			<Dialog.Portal>
				<Dialog.Backdrop aria-hidden className="global-search-overlay" />
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<Dialog.Popup
						aria-describedby="global-search-hint"
						aria-labelledby="global-search-title"
						className="global-search-dialog"
					>
						{/* Visually hidden title for screen readers (Base UI Dialog accessibility) */}
						<Dialog.Title className="sr-only" id="global-search-title">
							Ricerca globale: clienti e trattative
						</Dialog.Title>
						<Command label="Ricerca globale" shouldFilter={false}>
							{/* Wrapper for floating-style input: padding from dialog, no bottom border */}
							<div className="global-search-input-wrap">
								<Command.Input
									aria-describedby="global-search-hint"
									autoComplete="off"
									className="global-search-input"
									onValueChange={setSearchValue}
									placeholder="Cerca o lascia vuoto per vedere tutto..."
									value={searchValue}
								/>
							</div>
							<p className="sr-only" id="global-search-hint">
								Risultati aggiornati mentre digiti. Usa i tasti freccia per
								spostarti, Invio per aprire.
							</p>

							<Command.List
								aria-label="Risultati ricerca"
								className="global-search-list scroll-fade-y"
							>
								{/* Hint only when 1 character (0 = show all, 2+ = search) */}
								{!loading && searchValue.trim().length === 1 && (
									<div className="global-search-empty">
										Digita almeno 2 caratteri per filtrare
									</div>
								)}

								{loading && (
									<Command.Loading className="global-search-loading">
										Ricerca in corso…
									</Command.Loading>
								)}

								{!loading &&
									searchValue.trim().length >= MIN_QUERY_LENGTH &&
									error && (
										<div className="global-search-error" role="alert">
											{error}
										</div>
									)}

								{!loading &&
									searchValue.trim().length >= MIN_QUERY_LENGTH &&
									!error &&
									!hasResults && (
										<Command.Empty className="global-search-empty">
											Nessun risultato per &quot;{searchValue.trim()}&quot;
										</Command.Empty>
									)}

								{!loading && results && hasResults && (
									<>
										{results.clients_with_negotiations.length > 0 && (
											<Command.Group
												className="global-search-group"
												heading="Clienti con trattative"
											>
												{results.clients_with_negotiations.map((c) => (
													<Command.Item
														className="global-search-item"
														key={`client-with-${c.id}`}
														onSelect={() => handleSelectClient(c)}
														value={`client-with-${c.id}-${c.ragione_sociale}`}
													>
														<span className="font-medium">
															{c.ragione_sociale}
														</span>
														{c.p_iva && (
															<span className="text-muted-foreground">
																{" "}
																P.IVA {c.p_iva}
															</span>
														)}
													</Command.Item>
												))}
											</Command.Group>
										)}

										{results.referents.length > 0 && (
											<Command.Group
												className="global-search-group"
												heading="Referenti / Trattative"
											>
												{results.referents.map((r) => (
													<Command.Item
														className="global-search-item"
														key={`ref-${r.id}`}
														onSelect={() => handleSelectReferent(r)}
														value={`ref-${r.id}-${r.referente}-${r.client.ragione_sociale}`}
													>
														<span className="font-medium">{r.referente}</span>
														<span className="text-muted-foreground">
															{" "}
															— {r.client.ragione_sociale} · Trattativa #{r.id}
														</span>
													</Command.Item>
												))}
											</Command.Group>
										)}

										{results.clients_without_negotiations.length > 0 && (
											<Command.Group
												className="global-search-group"
												heading="Clienti senza trattative"
											>
												{results.clients_without_negotiations.map((c) => (
													<Command.Item
														className="global-search-item"
														key={`client-no-${c.id}`}
														onSelect={() => handleSelectClient(c)}
														value={`client-no-${c.id}-${c.ragione_sociale}`}
													>
														<span className="font-medium">
															{c.ragione_sociale}
														</span>
														{c.p_iva && (
															<span className="text-muted-foreground">
																{" "}
																P.IVA {c.p_iva}
															</span>
														)}
													</Command.Item>
												))}
											</Command.Group>
										)}
									</>
								)}
							</Command.List>
						</Command>
					</Dialog.Popup>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
