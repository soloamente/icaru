"use client";

import { Plus, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CheckIcon } from "@/components/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

/** Valid percentuale values: 0–100 in 20% steps */
const PERCENTUALE_OPTIONS = [0, 20, 40, 60, 80, 100] as const;

/** Regex for client_id filter - must be numeric */
const CLIENT_ID_REGEX = /^\d+$/;

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
						<Label htmlFor="create-importo">Importo (€)</Label>
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
							{isSubmitting ? "Creazione…" : "Crea trattativa"}
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
						<Label htmlFor="update-importo">Importo (€)</Label>
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
							{isSubmitting ? "Salvataggio…" : "Salva"}
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
	const [clientIdFilter, setClientIdFilter] = useState<string>("");
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [updateTarget, setUpdateTarget] = useState<ApiNegotiation | null>(null);
	const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

	// Direttore Vendite: /company (tutta l'azienda). Venditore: /me, /me/abandoned, /me/concluded.
	// Per il direttore usiamo /company e filtriamo lato client per concluse/abbandonate (l'API non espone /company/open ecc.).
	const fetchNegotiations = useCallback(async () => {
		if (!token) {
			return;
		}
		setLoading(true);
		setError(null);
		const params =
			clientIdFilter && CLIENT_ID_REGEX.test(clientIdFilter)
				? { client_id: Number.parseInt(clientIdFilter, 10) }
				: undefined;
		const isDirector = role === "director";
		const fetcher = isDirector
			? listNegotiationsCompany
			: filter === "concluse"
				? listNegotiationsMeConcluded
				: filter === "abbandonate"
					? listNegotiationsMeAbandoned
					: listNegotiationsMe;
		const result = await fetcher(token, params);
		setLoading(false);
		if ("error" in result) {
			setError(result.error);
			setNegotiations([]);
			return;
		}
		setNegotiations(result.data);
	}, [token, clientIdFilter, filter, role]);

	useEffect(() => {
		fetchNegotiations();
	}, [fetchNegotiations]);

	// Per il direttore: /company restituisce tutto, filtriamo lato client per concluse/abbandonate.
	// Per il venditore: l'API già filtra (/me, /me/abandoned, /me/concluded). In entrambi i casi applichiamo la ricerca lato client.
	const filteredNegotiations = negotiations.filter((n) => {
		if (role === "director") {
			if (filter === "concluse" && n.spanco !== "O" && n.percentuale !== 100) {
				return false;
			}
			if (filter === "abbandonate" && !n.abbandonata) {
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

	const activeCount = filteredNegotiations.filter((n) => !n.abbandonata).length;
	const abandonedCount = filteredNegotiations.filter(
		(n) => n.abbandonata
	).length;

	// Concluded = Spanco 'O' OR % = 100 (per doc)
	const completedCount = filteredNegotiations.filter(
		(n) => n.spanco === "O" || n.percentuale === 100
	).length;
	const handleOpenUpdate = (n: ApiNegotiation) => {
		setUpdateTarget(n);
		setIsUpdateDialogOpen(true);
	};

	return (
		<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
			{/* Header */}
			<div className="relative flex w-full flex-col gap-4.5">
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
						<label
							/* Search bar background follows table buttons color for consistency */
							className="flex w-60 items-center justify-between rounded-full bg-table-buttons px-3.75 py-1.75 text-sm shadow-[-18px_0px_14px_var(--color-card)]"
							htmlFor="trattative-search"
						>
							<input
								className="w-full truncate placeholder:text-search-placeholder focus:outline-none"
								id="trattative-search"
								onChange={(e) => setSearchTerm(e.target.value)}
								placeholder="Cerca cliente, referente..."
								value={searchTerm}
							/>
							<Search className="size-4 text-search-placeholder" />
						</label>
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
			</div>

			{/* Body: use table container background token for the shell */}
			<div className="table-container-bg flex min-h-0 flex-1 flex-col gap-6.25 rounded-t-3xl px-5.5 pt-6.25">
				{/* Stats: show only the relevant stat per page; all three on tutte */}
				<div className="flex items-start gap-3.75">
					{filter === "all" && (
						<div className="flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75">
							<h3 className="font-medium text-sm text-stats-title leading-none">
								Trattative aperte
							</h3>
							<div className="flex items-center justify-start">
								<span className="text-xl tabular-nums leading-none">
									{activeCount}
								</span>
							</div>
						</div>
					)}
					{(filter === "all" || filter === "concluse") && (
						<div className="flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75">
							<h3 className="font-medium text-sm text-stats-title leading-none">
								Trattative concluse
							</h3>
							<div className="flex items-center justify-start">
								<span className="text-xl tabular-nums leading-none">
									{completedCount}
								</span>
							</div>
						</div>
					)}
					{(filter === "all" || filter === "abbandonate") && (
						<div className="flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75">
							<h3 className="font-medium text-sm text-stats-title leading-none">
								Trattative abbandonate
							</h3>
							<div className="flex items-center justify-start">
								<span className="text-xl tabular-nums leading-none">
									{abandonedCount}
								</span>
							</div>
						</div>
					)}
				</div>

				{/* Table */}
				<div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
					{/* Header: align background with table container using the same CSS variable */}
					<div className="table-header-bg shrink-0 rounded-xl px-3 py-2.25">
						<div className="grid grid-cols-[minmax(80px,0.6fr)_minmax(120px,1fr)_minmax(60px,0.5fr)_minmax(100px,0.8fr)_minmax(80px,0.6fr)_minmax(140px,1fr)_minmax(100px,0.8fr)] items-center gap-4 font-medium text-sm text-table-header-foreground">
							<div>Cliente</div>
							<div>Referente</div>
							<div>Spanco</div>
							<div>Importo</div>
							<div>%</div>
							<div>Note</div>
							<div>Stato</div>
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
						{!(loading || error) && filteredNegotiations.length === 0 && (
							<div className="flex h-full items-center justify-center p-8">
								<p className="text-center text-stats-title">
									Nessuna trattativa trovata
								</p>
							</div>
						)}
						{!(loading || error) &&
							filteredNegotiations.length > 0 &&
							filteredNegotiations.map((n) => (
								<button
									aria-label={`Trattativa ${n.id} - ${getClientDisplay(n)}`}
									/* Row hover uses dedicated table hover token */
									className="w-full cursor-pointer border-checkbox-border/70 border-b bg-transparent px-3 py-5 text-left font-medium transition-colors last:border-b-0 hover:bg-table-hover"
									key={n.id}
									onClick={() => handleOpenUpdate(n)}
									type="button"
								>
									<div className="grid grid-cols-[minmax(80px,0.6fr)_minmax(120px,1fr)_minmax(60px,0.5fr)_minmax(100px,0.8fr)_minmax(80px,0.6fr)_minmax(140px,1fr)_minmax(100px,0.8fr)] items-center gap-4 text-base">
										<div className="flex items-center gap-2 truncate">
											<Avatar aria-hidden className="size-8 bg-background">
												<AvatarFallback placeholderSeed={getClientDisplay(n)} />
											</Avatar>
											<span className="truncate">{getClientDisplay(n)}</span>
										</div>
										<div className="truncate">{n.referente}</div>
										<div className="truncate">{SPANCO_LABELS[n.spanco]}</div>
										<div className="truncate tabular-nums">
											{formatImporto(n.importo)}
										</div>
										<div className="truncate tabular-nums">
											{n.percentuale}%
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
												<span className="text-stats-title">—</span>
											)}
										</div>
										<div>
											<span
												className={cn(
													"inline-flex items-center justify-center gap-2 rounded-full py-1.25 pr-3 pl-2.5 font-medium text-base",
													n.abbandonata
														? "bg-muted text-muted-foreground"
														: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
												)}
											>
												{n.abbandonata ? (
													<>
														<X aria-hidden size={16} />
														Abbandonata
													</>
												) : (
													<>
														<CheckIcon aria-hidden size={16} />
														Attiva
													</>
												)}
											</span>
										</div>
									</div>
								</button>
							))}
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
