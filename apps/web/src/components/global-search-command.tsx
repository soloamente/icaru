"use client";

/**
 * Global command palette (⌘K / Ctrl+K) for searching clients, trattative (negotiations), and teams.
 * Uses POST /api/search; results are grouped: clients with negotiations, referents, clients without negotiations.
 * Teams are fetched via listTeams/listMyTeams and filtered client-side by nome, description, creator.
 * Filtering for clients/referents is done server-side; cmdk shouldFilter is false.
 * Uses Base UI Dialog (not Radix) for accessibility and consistency with the rest of the app.
 */

import { Dialog } from "@base-ui/react/dialog";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	getNegotiation,
	listMyTeams,
	listNegotiationsMe,
	listTeams,
	search,
} from "@/lib/api/client";
import type {
	ApiNegotiation,
	ApiTeam,
	ApiTeamMinimal,
	SearchClientResult,
	SearchReferentResult,
	SearchResponse,
} from "@/lib/api/types";
import { useAuthOptional } from "@/lib/auth/auth-context";
import { getNegotiationStatoSegment } from "@/lib/trattative-utils";

const DEBOUNCE_MS = 300;

/** Sort negotiations by relevance: aperte first, then concluse, then abbandonate. */
function sortNegotiationsByRelevance(list: ApiNegotiation[]): ApiNegotiation[] {
	const order = { aperte: 0, concluse: 1, abbandonate: 2 } as const;
	return [...list].sort((a, b) => {
		const statoA = getNegotiationStatoSegment(a);
		const statoB = getNegotiationStatoSegment(b);
		return (order[statoA] ?? 2) - (order[statoB] ?? 2);
	});
}

/** Resolve href for a client's negotiation when no referent in search results. */
async function resolveClientNegotiationHref(
	token: string,
	clientId: number,
	listFn: typeof listNegotiationsMe
): Promise<string | null> {
	const result = await listFn(token, { client_id: clientId });
	if ("error" in result || result.data.length === 0) {
		return null;
	}
	// Filter by client_id: backend may ignore the client_id query param, so we
	// defensively filter to ensure we only pick a negotiation for this client.
	const forClient = result.data.filter((n) => n.client_id === clientId);
	if (forClient.length === 0) {
		return null;
	}
	const sorted = sortNegotiationsByRelevance(forClient);
	const chosen = sorted[0];
	if (!chosen) {
		return null;
	}
	const hasRoutingInfo =
		(typeof chosen.spanco === "string" ||
			typeof chosen.percentuale === "number") &&
		typeof chosen.abbandonata === "boolean";
	let neg = chosen;
	if (!hasRoutingInfo) {
		const full = await getNegotiation(token, chosen.id);
		neg = "error" in full ? chosen : full.data;
	}
	return `/trattative/${getNegotiationStatoSegment(neg)}/${neg.id}`;
}

/** Minimum characters to run search API; below this we show section navigation cards. */
const MIN_CHARS_FOR_SEARCH = 3;

/** Section cards shown when search has fewer than MIN_CHARS_FOR_SEARCH characters. */
const SECTION_NAV_ITEMS = [
	{ label: "Visualizza clienti", href: "/clienti", value: "nav-clienti" },
	{
		label: "Visualizza trattative aperte",
		href: "/trattative/aperte",
		value: "nav-trattative-aperte",
	},
	{
		label: "Visualizza tutte le trattative",
		href: "/trattative/tutte",
		value: "nav-trattative-tutte",
	},
	{ label: "Visualizza team", href: "/team", value: "nav-team" },
] as const;

/** Union type for team search results (ApiTeam from listTeams, ApiTeamMinimal from listMyTeams). */
type SearchTeamResult = ApiTeam | ApiTeamMinimal;

/** Normalize string for case-insensitive matching (trim + lowercase). */
function normalizeForMatch(s: string): string {
	return s.trim().toLowerCase();
}

/**
 * Filter teams by search query — matches nome, description (ApiTeam), creator_name (ApiTeamMinimal).
 * Both types have id and nome; ApiTeam has creator.nome/cognome, ApiTeamMinimal has creator_name.
 */
function filterTeamsByQuery(
	teams: SearchTeamResult[],
	query: string
): SearchTeamResult[] {
	const q = normalizeForMatch(query);
	if (!q) {
		return teams;
	}
	return teams.filter((t) => {
		if (normalizeForMatch(t.nome).includes(q)) {
			return true;
		}
		if (
			"description" in t &&
			t.description &&
			normalizeForMatch(t.description).includes(q)
		) {
			return true;
		}
		if ("creator" in t && t.creator) {
			const creatorStr = `${t.creator.nome} ${t.creator.cognome}`;
			if (normalizeForMatch(creatorStr).includes(q)) {
				return true;
			}
		}
		if (
			"creator_name" in t &&
			t.creator_name &&
			normalizeForMatch(t.creator_name).includes(q)
		) {
			return true;
		}
		return false;
	});
}

export default function GlobalSearchCommand() {
	const router = useRouter();
	const auth = useAuthOptional();
	const token = auth?.token ?? null;
	const isDirector = auth?.role === "director";

	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState<SearchResponse | null>(null);
	const [teamsResults, setTeamsResults] = useState<SearchTeamResult[] | null>(
		null
	);
	const [error, setError] = useState<string | null>(null);

	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	// Keep latest results in ref so handlers get current data even when setOpen(false)
	// triggers useEffect that clears results before navigation completes.
	const resultsRef = useRef<SearchResponse | null>(null);
	resultsRef.current = results;

	// Allow other components (e.g. Sidebar "Ricerca rapida" button) to open the
	// command palette programmatically by dispatching a custom DOM event.
	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const handleExternalOpen = () => {
			setOpen(true);
		};
		window.addEventListener("icr-global-search-open", handleExternalOpen);
		return () => {
			window.removeEventListener("icr-global-search-open", handleExternalOpen);
		};
	}, []);

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
			setTeamsResults(null);
			setError(null);
		}
	}, [open]);

	// Fetch results: when query has 3+ chars → search API; below 3 → section cards only
	useEffect(() => {
		const trimmed = searchValue.trim();

		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
			debounceRef.current = null;
		}

		if (!(token && auth)) {
			if (trimmed.length < MIN_CHARS_FOR_SEARCH) {
				setResults(null);
				setError(null);
			}
			return;
		}

		// Below 3 chars: show section cards only, no API fetch; clear loading so
		// section cards are visible again if user backspaces from 3+ chars
		if (trimmed.length < MIN_CHARS_FOR_SEARCH) {
			setResults(null);
			setError(null);
			setLoading(false);
			return;
		}

		// 3+ chars: show loading immediately so section cards are replaced by
		// "Ricerca in corso…" instead of an empty area during debounce + API call
		setLoading(true);
		setError(null);

		debounceRef.current = setTimeout(() => {
			debounceRef.current = null;
			if (abortRef.current) {
				abortRef.current.abort();
			}
			abortRef.current = new AbortController();

			// Fetch main search (clients/referents) and teams in parallel.
			// Teams: director → listTeams, seller → listMyTeams; filter client-side.
			const teamsPromise = isDirector ? listTeams(token) : listMyTeams(token);

			Promise.all([search(token, trimmed), teamsPromise])
				.then(([searchOut, teamsOut]) => {
					if ("error" in searchOut) {
						setError(searchOut.error);
						setResults(null);
					} else {
						setResults(searchOut.data);
						setError(null);
					}
					if ("error" in teamsOut) {
						// Don't block main results; teams fetch may 403 for Admin
						setTeamsResults([]);
					} else {
						const filtered = filterTeamsByQuery(
							teamsOut.data as SearchTeamResult[],
							trimmed
						);
						setTeamsResults(filtered);
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
	}, [searchValue, token, auth, isDirector]);

	const handleOpenChange = useCallback((next: boolean) => {
		setOpen(next);
	}, []);

	// Navigate to negotiation detail (referente = trattativa; aperte route works for any stato)
	const handleSelectReferent = useCallback(
		(r: SearchReferentResult) => {
			setOpen(false);
			router.push(`/trattative/aperte/${r.id}`);
		},
		[router]
	);

	// Clienti con trattative: go to negotiation detail. First try to find a referent
	// in search results (works when empty search or when referent matches query).
	// When searching, the API may filter referents by query so the client appears
	// in clients_with_negotiations but no matching referent exists — in that case
	// we fetch negotiations, prefer aperte over concluse over abbandonate, and use
	// GET /negotiations/{id} if list data is incomplete (per Alessandro's suggestion).
	const handleSelectClientWithNegotiations = useCallback(
		async (c: SearchClientResult) => {
			if (!(token && auth)) {
				return;
			}
			setOpen(false);
			const currentResults = resultsRef.current;
			const firstReferent =
				currentResults?.referents.find((r) => r.client_id === c.id) ?? null;
			if (firstReferent) {
				router.push(`/trattative/aperte/${firstReferent.id}`);
				return;
			}
			const href = await resolveClientNegotiationHref(
				token,
				c.id,
				listNegotiationsMe
			);
			// biome-ignore lint/suspicious/noExplicitAny: dynamic path built from API; bridge to RouteImpl
			router.push((href ?? `/trattative/aperte?client_id=${c.id}`) as any);
		},
		[auth, router, token]
	);

	// Clienti senza trattative: go to trattative section and open "Nuova trattativa"
	// modal with this client pre-selected (same as "Aggiungi" on clients table)
	const handleSelectClientWithoutNegotiations = useCallback(
		(c: SearchClientResult) => {
			setOpen(false);
			router.push(`/trattative/aperte?new_negotiation=1&client_id=${c.id}`);
		},
		[router]
	);

	// Team select: navigate to team detail page
	const handleSelectTeam = useCallback(
		(team: SearchTeamResult) => {
			setOpen(false);
			// biome-ignore lint/suspicious/noExplicitAny: dynamic route path
			router.push(`/team/${team.id}` as any);
		},
		[router]
	);

	const hasResults = useMemo(() => {
		const hasSearch =
			results &&
			(results.clients_with_negotiations.length > 0 ||
				results.referents.length > 0 ||
				results.clients_without_negotiations.length > 0);
		const hasTeams = teamsResults && teamsResults.length > 0;
		return Boolean(hasSearch || hasTeams);
	}, [results, teamsResults]);

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
							Ricerca globale: clienti, trattative e team
						</Dialog.Title>
						<div className="global-search-command">
							<Command label="Ricerca globale" shouldFilter={false}>
								{/* Input bar: reference style — rounded-2xl border, icon + input (like Label in reference) */}
								<div className="global-search-input-wrap">
									<div className="global-search-input-bar">
										<Search aria-hidden className="global-search-input-icon" />
										<Command.Input
											aria-describedby="global-search-hint"
											autoComplete="off"
											className="global-search-input"
											onValueChange={setSearchValue}
											placeholder="Cerca clienti, trattative e team (min. 3 caratteri)..."
											value={searchValue}
										/>
									</div>
								</div>
								<p className="sr-only" id="global-search-hint">
									Risultati aggiornati mentre digiti. Usa i tasti freccia per
									spostarti, Invio per aprire.
								</p>

								<Command.List
									aria-label="Risultati ricerca"
									className="global-search-list scroll-fade-y p-2"
								>
									{/* Section navigation cards when query has fewer than 3 characters */}
									{!loading &&
										searchValue.trim().length < MIN_CHARS_FOR_SEARCH && (
											<ul
												aria-label="Vai a sezione"
												className="global-search-section-cards"
											>
												{SECTION_NAV_ITEMS.map((item) => (
													<li key={item.value}>
														<Command.Item
															aria-label={`Vai a ${item.label}`}
															className="global-search-section-card group select-none rounded-xl px-3 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
															onSelect={() => {
																setOpen(false);
																router.push(item.href);
															}}
															value={item.value}
														>
															<span className="global-search-section-card-label">
																{item.label}
															</span>
														</Command.Item>
													</li>
												))}
											</ul>
										)}

									{loading && (
										<Command.Loading className="global-search-loading">
											Ricerca in corso…
										</Command.Loading>
									)}

									{!loading &&
										searchValue.trim().length >= MIN_CHARS_FOR_SEARCH &&
										error && (
											<div className="global-search-error" role="alert">
												{error}
											</div>
										)}

									{!loading &&
										searchValue.trim().length >= MIN_CHARS_FOR_SEARCH &&
										!error &&
										!hasResults && (
											<Command.Empty className="global-search-empty">
												Nessun risultato per &quot;{searchValue.trim()}&quot;
											</Command.Empty>
										)}

									{!loading && hasResults && (
										<>
											{results?.clients_with_negotiations &&
												results.clients_with_negotiations.length > 0 && (
													<Command.Group
														className="global-search-group"
														heading="Clienti con trattative"
													>
														{results.clients_with_negotiations.map((c) => (
															<Command.Item
																className="global-search-item group flex cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
																key={`client-with-${c.id}`}
																onSelect={() =>
																	handleSelectClientWithNegotiations(c)
																}
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

											{results?.referents && results.referents.length > 0 && (
												<Command.Group
													className="global-search-group"
													heading="Referenti / Trattative"
												>
													{results.referents.map((r) => (
														<Command.Item
															className="global-search-item group flex cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
															key={`ref-${r.id}`}
															onSelect={() => handleSelectReferent(r)}
															value={`ref-${r.id}-${r.referente}-${r.client.ragione_sociale}`}
														>
															<span className="font-medium">{r.referente}</span>
															<span className="text-muted-foreground">
																{" "}
																— {r.client.ragione_sociale} · Trattativa #
																{r.id}
															</span>
														</Command.Item>
													))}
												</Command.Group>
											)}

											{results?.clients_without_negotiations &&
												results.clients_without_negotiations.length > 0 && (
													<Command.Group
														className="global-search-group"
														heading="Clienti senza trattative"
													>
														{results.clients_without_negotiations.map((c) => (
															<Command.Item
																className="global-search-item group flex cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
																key={`client-no-${c.id}`}
																onSelect={() =>
																	handleSelectClientWithoutNegotiations(c)
																}
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

											{teamsResults && teamsResults.length > 0 && (
												<Command.Group
													className="global-search-group"
													heading="Team"
												>
													{teamsResults.map((t) => (
														<Command.Item
															className="global-search-item group flex cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
															key={`team-${t.id}`}
															onSelect={() => handleSelectTeam(t)}
															value={`team-${t.id}-${t.nome}`}
														>
															<span className="font-medium">{t.nome}</span>
															<span className="text-muted-foreground">
																{" "}
																—{" "}
																{"creator_name" in t
																	? t.creator_name
																	: `${t.creator.nome} ${t.creator.cognome}`}
															</span>
														</Command.Item>
													))}
												</Command.Group>
											)}
										</>
									)}
								</Command.List>
								{/* Footer with keyboard hints (reference style) */}
								<footer className="global-search-footer">
									<span className="global-search-footer-hint">
										<kbd className="global-search-kbd">esc</kbd> per chiudere
									</span>
									<span className="global-search-footer-hint">
										<kbd className="global-search-kbd">↑</kbd>
										<kbd className="global-search-kbd">↓</kbd> per navigare
									</span>
									<span className="global-search-footer-hint">
										<kbd className="global-search-kbd">invio</kbd> per aprire
									</span>
								</footer>
							</Command>
						</div>
					</Dialog.Popup>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
