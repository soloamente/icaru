"use client";

import { Select } from "@base-ui/react/select";
import { ChevronDown, Plus, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AnimateNumber } from "motion-plus/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	createNegotiation,
	listNegotiationsCompany,
	listNegotiationsMe,
	listNegotiationsMeAbandoned,
	listNegotiationsMeConcluded,
	updateNegotiation,
} from "@/lib/api/client";
import type {
	ApiNegotiation,
	CreateNegotiationBody,
	SpancoStage,
	UpdateNegotiationBody,
} from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import CircleXmarkFilled from "./icons/circle-xmark-filled";
import IconDeleteLeftFill18 from "./icons/delete-left-fill-18";
import { SignatureIcon } from "./icons/signature-icon";

/** Spanco stage display labels */
const SPANCO_LABELS: Record<SpancoStage, string> = {
	S: "S",
	P: "P",
	A: "A",
	N: "N",
	C: "C",
	O: "O",
};

const SPANCO_SORT_ORDER: Record<SpancoStage, number> = {
	S: 0,
	P: 1,
	A: 2,
	N: 3,
	C: 4,
	O: 5,
};

/** Base pill classes used to visually render the SPANCO stage as a readable status chip.
 *  Slightly smaller than the main Stato pill, but large enough to be easily tappable and scannable.
 */
const SPANCO_PILL_CLASSES =
	"inline-flex min-w-[2.75rem] items-center justify-center rounded-full px-3 py-1 text-sm font-semibold tabular-nums";

/**
 * Main color per SPANCO stage (oklch) for pills and progress bar fill.
 * For pills we mimic the Stato chips: text uses the main color at full opacity,
 * while the background uses the same oklch color with a much lower alpha for a soft tint.
 */
const SPANCO_STAGE_COLORS: Record<
	SpancoStage,
	{ main: string; softBg: string }
> = {
	P: {
		// Prospect
		main: "oklch(0.6994 0.1754 51.79)",
		softBg: "oklch(0.6994 0.1754 51.79 / 0.12)",
	},
	S: {
		// Suspect
		main: "oklch(0.5575 0.0165 244.89)",
		softBg: "oklch(0.5575 0.0165 244.89 / 0.12)",
	},
	A: {
		// Approach
		main: "oklch(0.8114 0.1654 84.92)",
		softBg: "oklch(0.8114 0.1654 84.92 / 0.12)",
	},
	C: {
		// Close
		main: "oklch(0.5915 0.202 21.24)",
		softBg: "oklch(0.5915 0.202 21.24 / 0.12)",
	},
	O: {
		// Order
		main: "oklch(0.5315 0.1179 157.23)",
		softBg: "oklch(0.5315 0.1179 157.23 / 0.12)",
	},
	N: {
		// Negotiation
		main: "oklch(0.5782 0.2282 260.03)",
		softBg: "oklch(0.5782 0.2282 260.03 / 0.12)",
	},
};

type SortColumn = "importo" | "percentuale" | "spanco";

const OPEN_STATUS_CLASSES =
	"bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400";
const COMPLETED_STATUS_CLASSES =
	"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
const ABANDONED_STATUS_CLASSES =
	"bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";

const isNegotiationCompleted = (negotiation: ApiNegotiation): boolean =>
	negotiation.spanco === "O" || negotiation.percentuale === 100;

const isNegotiationAbandoned = (negotiation: ApiNegotiation): boolean =>
	negotiation.abbandonata;

const isNegotiationOpen = (negotiation: ApiNegotiation): boolean =>
	!(isNegotiationAbandoned(negotiation) || isNegotiationCompleted(negotiation));

function getNegotiationStatusUi(negotiation: ApiNegotiation): {
	classes: string;
	label: string;
	icon: "check" | "close";
} {
	if (isNegotiationAbandoned(negotiation)) {
		return {
			classes: ABANDONED_STATUS_CLASSES,
			label: "Abbandonata",
			icon: "close",
		};
	}
	if (isNegotiationCompleted(negotiation)) {
		return {
			classes: COMPLETED_STATUS_CLASSES,
			label: "Conclusa",
			icon: "check",
		};
	}
	return {
		classes: OPEN_STATUS_CLASSES,
		label: "Aperta",
		icon: "check",
	};
}

function getSortAriaLabel(
	column: SortColumn,
	direction: "asc" | "desc" | null
): string {
	if (column === "importo") {
		if (direction === "desc") {
			return "Ordinato per importo dal valore più alto. Passa a ordine crescente.";
		}
		if (direction === "asc") {
			return "Ordinato per importo dal valore più basso. Rimuovi ordinamento.";
		}
		return "Ordina per importo dal valore più alto";
	}
	if (column === "percentuale") {
		if (direction === "desc") {
			return "Ordinato per percentuale dalla più alta. Passa a ordine crescente.";
		}
		if (direction === "asc") {
			return "Ordinato per percentuale dalla più bassa. Rimuovi ordinamento.";
		}
		return "Ordina per percentuale dalla più alta";
	}
	// column === "spanco"
	if (direction === "desc") {
		return "Ordinato per stato SPANCO dal più avanzato (O). Passa all'ordine iniziale.";
	}
	if (direction === "asc") {
		return "Ordinato per stato SPANCO S → P → A → N → C → O. Rimuovi ordinamento.";
	}
	return "Ordina per stato SPANCO S → P → A → N → C → O";
}

/** Valid percentuale values: 0ÔÇô100 in 20% steps */
const PERCENTUALE_OPTIONS = [0, 20, 40, 60, 80, 100] as const;

/**
 * Clamp a percentuale value to the valid 0–100 range.
 * This keeps the visual progress "slider" from overflowing when the backend sends
 * an unexpected value, and also normalises NaN to 0 for safety.
 */
function clampPercentuale(value: number): number {
	if (Number.isNaN(value)) {
		return 0;
	}
	return Math.min(100, Math.max(0, value));
}

function formatImporto(value: number): string {
	return new Intl.NumberFormat("it-IT", {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}

function getClientDisplay(n: ApiNegotiation): string {
	return n.client?.ragione_sociale ?? `Cliente #${n.client_id}`;
}

interface CreateNegotiationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

function CreateNegotiationDialog({
	open,
	onOpenChange,
	onSuccess,
}: CreateNegotiationDialogProps) {
	const { token } = useAuth();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [form, setForm] = useState<CreateNegotiationBody>({
		client_id: 1,
		referente: "",
		spanco: "S",
		importo: 0,
		percentuale: 0,
		note: "",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!token) {
			return;
		}
		setIsSubmitting(true);
		setError(null);
		const result = await createNegotiation(token, {
			...form,
			note: form.note || undefined,
		});
		setIsSubmitting(false);
		if ("error" in result) {
			setError(result.error);
			return;
		}
		onSuccess();
		onOpenChange(false);
		setForm({
			client_id: 1,
			referente: "",
			spanco: "S",
			importo: 0,
			percentuale: 0,
			note: "",
		});
	};

	if (!open) {
		return null;
	}

	return (
		<div
			aria-labelledby="create-negotiation-title"
			aria-modal="true"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			role="dialog"
		>
			<div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-card p-6 shadow-lg">
				<h2
					className="mb-4 font-semibold text-lg"
					id="create-negotiation-title"
				>
					Nuova trattativa
				</h2>
				<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
					<div>
						<Label htmlFor="create-client-id">ID Cliente</Label>
						<Input
							id="create-client-id"
							min={1}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									client_id: Number.parseInt(e.target.value, 10) || 1,
								}))
							}
							required
							type="number"
							value={form.client_id}
						/>
					</div>
					<div>
						<Label htmlFor="create-referente">Referente</Label>
						<Input
							id="create-referente"
							onChange={(e) =>
								setForm((prev) => ({ ...prev, referente: e.target.value }))
							}
							placeholder="Mr. Smith"
							required
							value={form.referente}
						/>
					</div>
					<div>
						<Label htmlFor="create-spanco">Spanco</Label>
						<select
							className="h-8 w-full rounded-none border border-input bg-background px-2.5 text-xs"
							id="create-spanco"
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									spanco: e.target.value as SpancoStage,
								}))
							}
							value={form.spanco}
						>
							{(Object.keys(SPANCO_LABELS) as SpancoStage[]).map((k) => (
								<option key={k} value={k}>
									{SPANCO_LABELS[k]}
								</option>
							))}
						</select>
					</div>
					<div>
						<Label htmlFor="create-importo">Importo (Ôé¼)</Label>
						<Input
							id="create-importo"
							min={0}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									importo: Number.parseInt(e.target.value, 10) || 0,
								}))
							}
							required
							step={100}
							type="number"
							value={form.importo || ""}
						/>
					</div>
					<div>
						<Label htmlFor="create-percentuale">Percentuale avanzamento</Label>
						<select
							className="h-8 w-full rounded-none border border-input bg-background px-2.5 text-xs"
							id="create-percentuale"
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									percentuale: Number(
										e.target.value
									) as (typeof PERCENTUALE_OPTIONS)[number],
								}))
							}
							value={form.percentuale}
						>
							{PERCENTUALE_OPTIONS.map((p) => (
								<option key={p} value={p}>
									{p}%
								</option>
							))}
						</select>
					</div>
					<div>
						<Label htmlFor="create-note">Note</Label>
						<Input
							id="create-note"
							onChange={(e) =>
								setForm((prev) => ({ ...prev, note: e.target.value }))
							}
							placeholder="Note opzionali"
							value={form.note ?? ""}
						/>
					</div>
					{error && (
						<p className="text-destructive text-sm" role="alert">
							{error}
						</p>
					)}
					<div className="flex justify-end gap-2">
						<Button
							disabled={isSubmitting}
							onClick={() => onOpenChange(false)}
							type="button"
							variant="outline"
						>
							Annulla
						</Button>
						<Button disabled={isSubmitting} type="submit">
							{isSubmitting ? "CreazioneÔÇª" : "Crea trattativa"}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}

interface UpdateNegotiationDialogProps {
	negotiation: ApiNegotiation | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

function UpdateNegotiationDialog({
	negotiation,
	open,
	onOpenChange,
	onSuccess,
}: UpdateNegotiationDialogProps) {
	const { token } = useAuth();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [form, setForm] = useState<UpdateNegotiationBody>({
		spanco: "S",
		percentuale: 0,
		importo: 0,
		abbandonata: false,
	});

	// Sync form when negotiation changes
	useEffect(() => {
		if (negotiation) {
			setForm({
				spanco: negotiation.spanco,
				percentuale: negotiation.percentuale,
				importo: negotiation.importo,
				abbandonata: negotiation.abbandonata,
			});
		}
	}, [negotiation]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!(token && negotiation)) {
			return;
		}
		setIsSubmitting(true);
		setError(null);
		const result = await updateNegotiation(token, negotiation.id, form);
		setIsSubmitting(false);
		if ("error" in result) {
			setError(result.error);
			return;
		}
		onSuccess();
		onOpenChange(false);
	};

	if (!(open && negotiation)) {
		return null;
	}

	return (
		<div
			aria-labelledby="update-negotiation-title"
			aria-modal="true"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			role="dialog"
		>
			<div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-card p-6 shadow-lg">
				<h2
					className="mb-4 font-semibold text-lg"
					id="update-negotiation-title"
				>
					Aggiorna trattativa #{negotiation.id}
				</h2>
				<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
					<div>
						<Label htmlFor="update-spanco">Spanco</Label>
						<select
							className="h-8 w-full rounded-none border border-input bg-background px-2.5 text-xs"
							id="update-spanco"
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									spanco: e.target.value as SpancoStage,
								}))
							}
							value={form.spanco}
						>
							{(Object.keys(SPANCO_LABELS) as SpancoStage[]).map((k) => (
								<option key={k} value={k}>
									{SPANCO_LABELS[k]}
								</option>
							))}
						</select>
					</div>
					<div>
						<Label htmlFor="update-percentuale">Percentuale avanzamento</Label>
						<select
							className="h-8 w-full rounded-none border border-input bg-background px-2.5 text-xs"
							id="update-percentuale"
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									percentuale: Number(e.target.value),
								}))
							}
							value={form.percentuale}
						>
							{PERCENTUALE_OPTIONS.map((p) => (
								<option key={p} value={p}>
									{p}%
								</option>
							))}
						</select>
					</div>
					<div>
						<Label htmlFor="update-importo">Importo (Ôé¼)</Label>
						<Input
							id="update-importo"
							min={0}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									importo: Number.parseInt(e.target.value, 10) || 0,
								}))
							}
							step={100}
							type="number"
							value={form.importo ?? ""}
						/>
					</div>
					<div className="flex items-center gap-2">
						<input
							checked={form.abbandonata ?? false}
							className="size-4 rounded border border-input"
							id="update-abbandonata"
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									abbandonata: e.target.checked,
								}))
							}
							type="checkbox"
						/>
						<Label htmlFor="update-abbandonata">Abbandonata</Label>
					</div>
					{error && (
						<p className="text-destructive text-sm" role="alert">
							{error}
						</p>
					)}
					<div className="flex justify-end gap-2">
						<Button
							disabled={isSubmitting}
							onClick={() => onOpenChange(false)}
							type="button"
							variant="outline"
						>
							Annulla
						</Button>
						<Button disabled={isSubmitting} type="submit">
							{isSubmitting ? "SalvataggioÔÇª" : "Salva"}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}

/** Filter for which negotiations to show: all, only completed (spanco C), or only abandoned. */
export type TrattativeFilter = "all" | "concluse" | "abbandonate" | "aperte";

interface TrattativeTableProps {
	/** When set, filter displayed negotiations by status (concluse = spanco C, abbandonate = abbandonata). */
	filter?: TrattativeFilter;
}

export default function TrattativeTable({
	filter = "all",
}: TrattativeTableProps) {
	const { token, role } = useAuth();
	const [negotiations, setNegotiations] = useState<ApiNegotiation[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	// Keep an explicit ref to the search input so that the clear icon can
	// both reset the value and immediately return focus to the field.
	const searchInputRef = useRef<HTMLInputElement | null>(null);
	// Controls the animated width of the search input container (motion.label).
	const [isSearchFocused, setIsSearchFocused] = useState(false);
	// Local SPANCO filter: lets the user restrict visible rows to a single SPANCO stage or see them all.
	const [spancoFilter, setSpancoFilter] = useState<SpancoStage | "all">("all");
	// Local stato filter: lets the user restrict visible rows to Aperta, Conclusa, or Abbandonata.
	const [statoFilter, setStatoFilter] = useState<
		"all" | "aperta" | "conclusa" | "abbandonata"
	>("all");
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [updateTarget, setUpdateTarget] = useState<ApiNegotiation | null>(null);
	const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
	const [sortState, setSortState] = useState<{
		column: SortColumn;
		direction: "asc" | "desc";
	} | null>(null);

	// Header filters visibility:
	// - SPANCO filter is available on all views except "concluse" (where every row is già in stato finale).
	// - Stato filter (Aperta/Conclusa/Abbandonata) è significativo solo nella vista "tutte", dove coesistono tutti gli stati.
	const showSpancoFilter = filter !== "concluse";
	const showStatoFilter = filter === "all";
	// When at least one header filter is visible we keep the two-row header layout;
	// if no filters are shown (e.g. pagina "concluse") we inline the search next to the primary action button.
	const hasHeaderFilters = showSpancoFilter || showStatoFilter;

	// Direttore Vendite: /company (tutta l'azienda). Venditore: /me, /me/abandoned, /me/concluded.
	// Per il direttore usiamo /company e filtriamo lato client per concluse/abbandonate (l'API non espone /company/open ecc.).
	const fetchNegotiations = useCallback(async () => {
		if (!token) {
			return;
		}
		setLoading(true);
		setError(null);
		const isDirector = role === "director";
		let fetcher: typeof listNegotiationsMe;
		if (isDirector) {
			fetcher = listNegotiationsCompany;
		} else if (filter === "concluse") {
			fetcher = listNegotiationsMeConcluded;
		} else if (filter === "abbandonate") {
			fetcher = listNegotiationsMeAbandoned;
		} else {
			fetcher = listNegotiationsMe;
		}
		// We currently fetch all negotiations for the chosen scope and apply SPANCO/search filters client-side.
		const result = await fetcher(token, undefined);
		setLoading(false);
		if ("error" in result) {
			setError(result.error);
			setNegotiations([]);
			return;
		}
		setNegotiations(result.data);
	}, [token, filter, role]);

	useEffect(() => {
		fetchNegotiations();
	}, [fetchNegotiations]);

	const filteredNegotiations = negotiations.filter((n) => {
		// Filtro di stato per pagina dedicata
		if (filter === "concluse" && !isNegotiationCompleted(n)) {
			return false;
		}
		if (filter === "abbandonate" && !isNegotiationAbandoned(n)) {
			return false;
		}
		if (filter === "aperte" && !isNegotiationOpen(n)) {
			return false;
		}
		// SPANCO filter: when a specific stage is selected, show only negotiations with that SPANCO value.
		if (spancoFilter !== "all" && n.spanco !== spancoFilter) {
			return false;
		}
		// Stato filter: when a specific status is selected, show only negotiations with that stato.
		if (statoFilter !== "all") {
			if (statoFilter === "aperta" && !isNegotiationOpen(n)) {
				return false;
			}
			if (statoFilter === "conclusa" && !isNegotiationCompleted(n)) {
				return false;
			}
			if (statoFilter === "abbandonata" && !isNegotiationAbandoned(n)) {
				return false;
			}
		}
		const normalized = searchTerm.trim().toLowerCase();
		if (!normalized) {
			return true;
		}
		const clientName = getClientDisplay(n).toLowerCase();
		const referente = n.referente.toLowerCase();
		const note = (n.note ?? "").toLowerCase();
		return (
			clientName.includes(normalized) ||
			referente.includes(normalized) ||
			note.includes(normalized)
		);
	});

	// Statistiche di riepilogo: aperte, concluse, abbandonate in base alle regole sopra.
	const openCount = filteredNegotiations.filter((n) =>
		isNegotiationOpen(n)
	).length;
	const abandonedCount = filteredNegotiations.filter((n) =>
		isNegotiationAbandoned(n)
	).length;

	// Concluded = Spanco 'O' OR % = 100 (per doc)
	const completedCount = filteredNegotiations.filter((n) =>
		isNegotiationCompleted(n)
	).length;
	const handleToggleSort = useCallback((column: SortColumn) => {
		setSortState((previous) => {
			if (!previous || previous.column !== column) {
				// Spanco: first click shows S → P → A → N → C → O (asc). Others: desc.
				const initialDir = column === "spanco" ? "asc" : "desc";
				return { column, direction: initialDir };
			}
			// Spanco cycle: asc → desc → null. Others: desc → asc → null.
			if (column === "spanco") {
				if (previous.direction === "asc") {
					return { column, direction: "desc" };
				}
				return null;
			}
			if (previous.direction === "desc") {
				return { column, direction: "asc" };
			}
			return null;
		});
	}, []);
	const sortedNegotiations = useMemo(() => {
		if (!sortState) {
			return filteredNegotiations;
		}
		const next = [...filteredNegotiations];
		next.sort((a, b) => {
			let comparison = 0;
			if (sortState.column === "importo") {
				comparison = a.importo - b.importo;
			} else if (sortState.column === "percentuale") {
				comparison = a.percentuale - b.percentuale;
			} else {
				comparison = SPANCO_SORT_ORDER[a.spanco] - SPANCO_SORT_ORDER[b.spanco];
			}
			return sortState.direction === "asc" ? comparison : -comparison;
		});
		return next;
	}, [filteredNegotiations, sortState]);
	const importSortDirection =
		sortState?.column === "importo" ? sortState.direction : null;
	const percentSortDirection =
		sortState?.column === "percentuale" ? sortState.direction : null;
	const spancoSortDirection =
		sortState?.column === "spanco" ? sortState.direction : null;
	const importSortAriaLabel = getSortAriaLabel("importo", importSortDirection);
	const percentSortAriaLabel = getSortAriaLabel(
		"percentuale",
		percentSortDirection
	);
	const spancoSortAriaLabel = getSortAriaLabel("spanco", spancoSortDirection);
	const handleOpenUpdate = (n: ApiNegotiation) => {
		setUpdateTarget(n);
		setIsUpdateDialogOpen(true);
	};

	// Reusable search field element so we can place it either on its own row
	// (when filters are present) or inline accanto al bottone "Aggiungi"
	// quando non ci sono filtri header (es. pagina "Trattative concluse").
	const searchField = (
		<div className="flex items-center justify-center">
			<motion.label
				/* Search bar background follows table buttons color for consistency. */
				animate={{
					width: isSearchFocused ? "21rem" : "15rem",
				}}
				className="flex items-center justify-between rounded-full bg-table-buttons px-3.75 py-1.75 text-sm shadow-[-18px_0px_14px_var(--color-card)]"
				htmlFor="trattative-search"
				initial={false}
				transition={{ duration: 0.5, ease: [0.541, 0.232, 0.226, 1.002] }}
			>
				<input
					className="w-full truncate placeholder:text-search-placeholder focus:outline-none"
					id="trattative-search"
					onBlur={() => setIsSearchFocused(false)}
					onChange={(event) => setSearchTerm(event.target.value)}
					onFocus={() => setIsSearchFocused(true)}
					placeholder="Cerca cliente, referente..."
					ref={searchInputRef}
					value={searchTerm}
				/>
				{/* Animated icon swap between search and clear icons for clearer feedback when the field has content. */}
				<div className="ml-2 flex items-center justify-center">
					<AnimatePresence initial={false} mode="wait">
						{searchTerm ? (
							<motion.button
								animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
								// Clear the current search term and keep focus in the input so the user can immediately type again.
								aria-label="Cancella ricerca"
								className="flex items-center justify-center rounded-full text-search-placeholder transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
								exit={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
								initial={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
								// Simple, quick scale + fade + blur to keep the interaction feeling light.
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
								// Mirror the same subtle scale + fade + blur when the search icon appears.
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
		</div>
	);

	return (
		<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
			{/* Header */}
			<div className="relative flex w-full flex-col gap-4.5">
				{/* Header - title and primary action */}
				<div className="flex items-center justify-between gap-2.5">
					<h1 className="flex items-center justify-center gap-3.5">
						<SignatureIcon aria-hidden size={24} />
						<span>
							{filter === "all" && "Tutte le trattative"}
							{filter === "aperte" && "Trattative aperte"}
							{filter === "concluse" && "Trattative concluse"}
							{filter === "abbandonate" && "Trattative abbandonate"}
						</span>
					</h1>
					<div className="flex items-center justify-center gap-2.5">
						{/* When there are no header filters (e.g. pagina "concluse"),
						 * keep search and primary action on the same line: search to the
						 * left, "Aggiungi" button to the right.
						 */}
						{!hasHeaderFilters && searchField}
						<button
							/* Use table buttons token for primary table actions */
							className="flex cursor-pointer items-center justify-center gap-2.5 rounded-full bg-table-buttons py-1.75 pr-2.5 pl-3.75 text-sm"
							onClick={() => setIsCreateDialogOpen(true)}
							type="button"
						>
							Aggiungi
							<Plus className="size-4 text-button-secondary" />
						</button>
					</div>
				</div>
				{/* Header - filters & search row placed on its own line for chiarezza
				 * quando sono presenti filtri header. Se non ci sono filtri, la search
				 * viene mostrata accanto al bottone "Aggiungi" nella riga sopra.
				 */}
				{hasHeaderFilters && (
					<div className="flex items-center justify-between gap-2">
						{/* Header - left side filters (local, client-side).
						 * We only show:
						 * - SPANCO filter on all views except "concluse"
						 * - Stato filter (Aperta/Conclusa/Abbandonata) exclusively on "tutte"
						 */}
						{(showSpancoFilter || showStatoFilter) && (
							<div className="flex w-full items-center justify-start gap-1.25">
								{showSpancoFilter && (
									<Select.Root
										onValueChange={(value) => {
											// When value is null we treat it as "all" phases; otherwise cast to a valid SPANCO stage.
											if (value === null) {
												setSpancoFilter("all");
												return;
											}
											setSpancoFilter(value as SpancoStage);
										}}
										value={spancoFilter === "all" ? null : spancoFilter}
									>
										<Select.Trigger
											// Use the same background token as the search input to keep header controls visually consistent.
											className="flex w-fit items-center justify-between gap-2 whitespace-nowrap rounded-full border-0 bg-table-buttons px-3.75 py-1.75 font-normal text-sm outline-none transition-colors focus-visible:outline-none data-popup-open:bg-table-buttons"
											id="trattative-spanco-filter"
										>
											<Select.Value
												className="data-placeholder:text-stats-title"
												placeholder="Tutte le fasi SPANCO"
											>
												{(value: SpancoStage | null) =>
													value
														? `Solo ${SPANCO_LABELS[value]}`
														: "Tutte le fasi SPANCO"
												}
											</Select.Value>
											<Select.Icon className="text-button-secondary">
												<ChevronDown aria-hidden className="size-3.5" />
											</Select.Icon>
										</Select.Trigger>
										<Select.Portal>
											<Select.Positioner
												/* Use content-height dropdown with a reasonable max height instead of stretching to the viewport. */
												alignItemWithTrigger={false}
												className="z-50 max-h-80 min-w-32 rounded-2xl text-popover-foreground shadow-xl"
												sideOffset={8}
											>
												<Select.Popup className="max-h-80 overflow-y-auto rounded-2xl bg-popover p-1">
													<Select.List className="flex h-fit flex-col gap-1">
														<Select.Item
															className="relative flex cursor-default select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-foreground data-selected:text-foreground"
															value={null}
														>
															<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
																<CheckIcon aria-hidden className="size-4" />
															</Select.ItemIndicator>
															<Select.ItemText>
																Tutte le fasi SPANCO
															</Select.ItemText>
														</Select.Item>
														{(Object.keys(SPANCO_LABELS) as SpancoStage[]).map(
															(stage) => (
																<Select.Item
																	className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-foreground data-selected:text-foreground"
																	key={stage}
																	value={stage}
																>
																	<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
																		<CheckIcon aria-hidden className="size-4" />
																	</Select.ItemIndicator>
																	<Select.ItemText>
																		{`Solo ${SPANCO_LABELS[stage]}`}
																	</Select.ItemText>
																</Select.Item>
															)
														)}
													</Select.List>
												</Select.Popup>
											</Select.Positioner>
										</Select.Portal>
									</Select.Root>
								)}
								{showStatoFilter && (
									<Select.Root
										onValueChange={(value) => {
											if (value === null) {
												setStatoFilter("all");
												return;
											}
											setStatoFilter(
												value as "aperta" | "conclusa" | "abbandonata"
											);
										}}
										value={statoFilter === "all" ? null : statoFilter}
									>
										<Select.Trigger
											// Match the search input background token so all header filters share the same visual weight.
											className="flex w-fit items-center justify-between gap-2 whitespace-nowrap rounded-full border-0 bg-table-buttons px-3.75 py-1.75 font-normal text-sm outline-none transition-colors focus-visible:outline-none data-popup-open:bg-table-buttons"
											id="trattative-stato-filter"
										>
											<Select.Value
												className="data-placeholder:text-stats-title"
												placeholder="Tutti gli stati"
											>
												{(
													value: "aperta" | "conclusa" | "abbandonata" | null
												) => {
													if (!value) {
														return "Tutti gli stati";
													}
													if (value === "aperta") {
														return "Solo Aperte";
													}
													if (value === "conclusa") {
														return "Solo Concluse";
													}
													return "Solo Abbandonate";
												}}
											</Select.Value>
											<Select.Icon className="text-button-secondary">
												<ChevronDown aria-hidden className="size-3.5" />
											</Select.Icon>
										</Select.Trigger>
										<Select.Portal>
											<Select.Positioner
												alignItemWithTrigger={false}
												className="z-50 max-h-80 min-w-32 rounded-2xl text-popover-foreground shadow-xl"
												sideOffset={8}
											>
												<Select.Popup className="max-h-80 overflow-y-auto rounded-2xl bg-popover p-1">
													<Select.List className="flex h-fit flex-col gap-1">
														<Select.Item
															className="relative flex cursor-default select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-foreground data-selected:text-foreground"
															value={null}
														>
															<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
																<CheckIcon aria-hidden className="size-4" />
															</Select.ItemIndicator>
															<Select.ItemText>Tutti gli stati</Select.ItemText>
														</Select.Item>
														<Select.Item
															className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-foreground data-selected:text-foreground"
															value="aperta"
														>
															<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
																<CheckIcon aria-hidden className="size-4" />
															</Select.ItemIndicator>
															<Select.ItemText>Solo Aperte</Select.ItemText>
														</Select.Item>
														<Select.Item
															className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-foreground data-selected:text-foreground"
															value="conclusa"
														>
															<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
																<CheckIcon aria-hidden className="size-4" />
															</Select.ItemIndicator>
															<Select.ItemText>Solo Concluse</Select.ItemText>
														</Select.Item>
														<Select.Item
															className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-foreground data-selected:text-foreground"
															value="abbandonata"
														>
															<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
																<CheckIcon aria-hidden className="size-4" />
															</Select.ItemIndicator>
															<Select.ItemText>
																Solo Abbandonate
															</Select.ItemText>
														</Select.Item>
													</Select.List>
												</Select.Popup>
											</Select.Positioner>
										</Select.Portal>
									</Select.Root>
								)}
							</div>
						)}
						{/* Header - search input aligned to the right, on its own row.
						 * We use motion.label to animate the width smoothly instead of a pure CSS transition.
						 */}
						{searchField}
					</div>
				)}
			</div>

			{/* Body: use table container background token for the shell */}
			<div className="table-container-bg flex min-h-0 flex-1 flex-col gap-6.25 rounded-t-3xl px-5.5 pt-6.25">
				{/* Stats: show only the relevant stat per page; all three on "tutte".
				 * We wrap every value in AnimateNumber so all counters share the same
				 * subtle entrance animation instead of only the last one.
				 */}
				<div className="flex items-start gap-3.75">
					{(filter === "all" || filter === "aperte") && (
						<div className="flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75">
							<h3 className="font-medium text-sm text-stats-title leading-none">
								Trattative aperte
							</h3>
							<div className="flex items-center justify-start">
								<AnimateNumber className="text-xl tabular-nums leading-none">
									{openCount}
								</AnimateNumber>
							</div>
						</div>
					)}
					{(filter === "all" || filter === "concluse") && (
						<div className="flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75">
							<h3 className="font-medium text-sm text-stats-title leading-none">
								Trattative concluse
							</h3>
							<div className="flex items-center justify-start">
								<AnimateNumber className="text-xl tabular-nums leading-none">
									{completedCount}
								</AnimateNumber>
							</div>
						</div>
					)}
					{(filter === "all" || filter === "abbandonate") && (
						<div className="flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75">
							<h3 className="font-medium text-sm text-stats-title leading-none">
								Trattative abbandonate
							</h3>
							<div className="flex items-center justify-start">
								<AnimateNumber className="text-xl tabular-nums leading-none">
									{abandonedCount}
								</AnimateNumber>
							</div>
						</div>
					)}
				</div>

				{/* Table */}
				<div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
					{/* Header: align background with table container using the same CSS variable */}
					<div className="table-header-bg shrink-0 rounded-xl px-3 py-2.25">
						<div className="grid grid-cols-[minmax(80px,1fr)_minmax(120px,1fr)_minmax(60px,0.5fr)_minmax(80px,0.5fr)_minmax(80px,0.9fr)_minmax(140px,1.2fr)_minmax(100px,0.8fr)] items-center gap-4 font-medium text-sm text-table-header-foreground">
							<div>Cliente</div>
							<div>Referente</div>
							<button
								aria-label={spancoSortAriaLabel}
								aria-pressed={spancoSortDirection !== null}
								className={cn(
									"group flex items-center justify-start gap-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
									spancoSortDirection !== null && "text-primary"
								)}
								onClick={() => handleToggleSort("spanco")}
								type="button"
							>
								<span className="font-medium">Spanco</span>
								<ChevronDown
									aria-hidden
									className={cn(
										"size-3.5 transition-transform",
										spancoSortDirection === "asc" && "-rotate-180",
										spancoSortDirection === null ? "opacity-40" : "opacity-100"
									)}
								/>
							</button>
							{/* Align importo sort control to the start to match requested layout */}
							<button
								aria-label={importSortAriaLabel}
								aria-pressed={importSortDirection !== null}
								className={cn(
									"group flex items-center justify-start gap-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
									importSortDirection !== null && "text-primary"
								)}
								onClick={() => handleToggleSort("importo")}
								type="button"
							>
								<span className="font-medium">Importo</span>
								<ChevronDown
									aria-hidden
									className={cn(
										"size-3.5 transition-transform",
										importSortDirection === "asc" && "-rotate-180",
										importSortDirection === null ? "opacity-40" : "opacity-100"
									)}
								/>
							</button>
							<button
								aria-label={percentSortAriaLabel}
								aria-pressed={percentSortDirection !== null}
								className={cn(
									"group flex items-center justify-start gap-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
									percentSortDirection !== null && "text-primary"
								)}
								onClick={() => handleToggleSort("percentuale")}
								type="button"
							>
								<span className="font-medium">Percentuale</span>
								<ChevronDown
									aria-hidden
									className={cn(
										"size-3.5 transition-transform",
										percentSortDirection === "asc" && "-rotate-180",
										percentSortDirection === null ? "opacity-40" : "opacity-100"
									)}
								/>
							</button>
							<div>Note</div>
							<div>Stato</div>
						</div>
					</div>
					<div className="scroll-fade-y flex h-full min-h-0 flex-1 flex-col overflow-scroll">
						{loading && (
							<div className="flex h-full items-center justify-center p-8">
								<p className="text-stats-title">Caricamento...</p>
							</div>
						)}
						{!loading && error && (
							<div className="flex h-full items-center justify-center p-8">
								<p className="text-center text-destructive">{error}</p>
							</div>
						)}
						{!(loading || error) && filteredNegotiations.length === 0 && (
							<div className="flex h-full items-center justify-center p-8">
								<p className="text-center text-stats-title">
									Nessuna trattativa trovata
								</p>
							</div>
						)}
						{!(loading || error) &&
							sortedNegotiations.length > 0 &&
							sortedNegotiations.map((n) => {
								const statusUi = getNegotiationStatusUi(n);
								// Clamp percentuale defensively to keep the progress "slider" within 0-100%
								const clampedPercent = clampPercentuale(n.percentuale);
								return (
									<button
										aria-label={`Trattativa ${n.id} - ${getClientDisplay(n)}`}
										/* Row hover uses dedicated table hover token */
										className="w-full cursor-pointer border-checkbox-border/70 border-b bg-transparent px-3 py-5 text-left font-medium transition-colors last:border-b-0 hover:bg-table-hover"
										key={n.id}
										onClick={() => handleOpenUpdate(n)}
										type="button"
									>
										<div className="grid grid-cols-[minmax(80px,1fr)_minmax(120px,1fr)_minmax(60px,0.5fr)_minmax(80px,0.5fr)_minmax(80px,0.9fr)_minmax(140px,1.2fr)_minmax(100px,0.8fr)] items-center gap-4 text-base">
											<div className="truncate">{getClientDisplay(n)}</div>
											<div className="truncate">{n.referente}</div>
											<div className="truncate">
												<span
													className={SPANCO_PILL_CLASSES}
													style={{
														// Text uses the solid main color, background uses a soft tint of the same color
														backgroundColor:
															SPANCO_STAGE_COLORS[n.spanco].softBg,
														color: SPANCO_STAGE_COLORS[n.spanco].main,
													}}
												>
													{SPANCO_LABELS[n.spanco]}
												</span>
											</div>
											<div className="truncate tabular-nums">
												{formatImporto(n.importo)}
											</div>
											<div className="flex items-center">
												{/* Visual progress bar: track uses soft tint, fill uses main color (same as SPANCO pills) */}
												<div
													aria-label={`Avanzamento trattativa al ${clampedPercent}%`}
													className="relative flex h-6 w-full items-center justify-center overflow-hidden rounded-full"
													role="img"
													style={{
														backgroundColor:
															SPANCO_STAGE_COLORS[n.spanco].softBg,
													}}
												>
													<div
														className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-150"
														style={{
															width: `${clampedPercent}%`,
															backgroundColor:
																SPANCO_STAGE_COLORS[n.spanco].main,
														}}
													/>
													<span className="relative z-10 block w-full px-2 text-center font-medium text-foreground text-xs tabular-nums">
														{clampedPercent}%
													</span>
												</div>
											</div>
											<div className="truncate">
												{n.note ? (
													<span
														className="block w-full truncate text-left"
														title={n.note}
													>
														{n.note}
													</span>
												) : (
													<span className="text-stats-title">ÔÇö</span>
												)}
											</div>
											<div>
												<span
													className={cn(
														"inline-flex items-center justify-center gap-2 rounded-full py-1.25 pr-3 pl-2.5 font-medium text-base",
														statusUi.classes
													)}
												>
													{statusUi.icon === "close" ? (
														<CircleXmarkFilled aria-hidden size={16} />
													) : (
														<CheckIcon aria-hidden size={16} />
													)}
													{statusUi.label}
												</span>
											</div>
										</div>
									</button>
								);
							})}
					</div>
				</div>
			</div>

			<CreateNegotiationDialog
				onOpenChange={setIsCreateDialogOpen}
				onSuccess={fetchNegotiations}
				open={isCreateDialogOpen}
			/>
			<UpdateNegotiationDialog
				negotiation={updateTarget}
				onOpenChange={setIsUpdateDialogOpen}
				onSuccess={fetchNegotiations}
				open={isUpdateDialogOpen}
			/>
		</main>
	);
}
