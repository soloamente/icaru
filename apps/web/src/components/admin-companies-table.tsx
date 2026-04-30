"use client";

import { Building2, Pencil, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
	createCompany,
	listCompanies,
	listUsers,
	updateCompany,
} from "@/lib/api/client";
import type { ApiCompany, ApiUserAdmin } from "@/lib/api/types";
import { useAuthOptional } from "@/lib/auth/auth-context";
import { TRATTATIVE_HEADER_FILTER_BG } from "@/lib/trattative-header-filter-classes";
import { cn } from "@/lib/utils";

const COMPANIES_TABLE_GRID =
	"grid grid-cols-[minmax(200px,2fr)_minmax(80px,0.6fr)_minmax(100px,0.8fr)_minmax(48px,0.4fr)]";

const FIELD_CONTAINER =
	"flex items-center justify-between gap-2 rounded-2xl bg-table-header px-3.75 py-3 leading-none";
const FIELD_LABEL =
	"w-fit shrink-0 whitespace-nowrap text-sm font-medium text-stats-title leading-none";
const FIELD_INPUT =
	"flex-1 w-full cursor-text border-none bg-transparent! px-0! py-0! text-right text-sm font-medium shadow-none focus-visible:outline-none focus-visible:ring-0 outline-none h-auto";

interface CompanyForm {
	ragione_sociale: string;
	attiva: boolean;
}

const EMPTY_FORM: CompanyForm = { ragione_sociale: "", attiva: true };

export default function AdminCompaniesTable() {
	const auth = useAuthOptional();
	const [companies, setCompanies] = useState<ApiCompany[]>([]);
	const [users, setUsers] = useState<ApiUserAdmin[]>([]);
	const [loading, setLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState<CompanyForm>(EMPTY_FORM);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const token = auth?.token ?? null;

	async function fetchData() {
		if (!token) return;
		const [companiesRes, usersRes] = await Promise.all([
			listCompanies(token),
			listUsers(token),
		]);
		if ("data" in companiesRes) setCompanies(companiesRes.data);
		if ("data" in usersRes) setUsers(usersRes.data);
		setLoading(false);
	}

	useEffect(() => {
		if (!token) return;
		void fetchData();
	}, [token]);

	function userCountForCompany(companyId: number): number {
		return users.filter((u) => u.company?.id === companyId).length;
	}

	function openCreate() {
		setEditingId(null);
		setForm(EMPTY_FORM);
		setFormError(null);
		setModalOpen(true);
	}

	function openEdit(company: ApiCompany) {
		setEditingId(company.id);
		setForm({
			ragione_sociale: company.ragione_sociale,
			attiva: company.attiva !== false && company.attiva !== 0,
		});
		setFormError(null);
		setModalOpen(true);
	}

	function closeModal() {
		setModalOpen(false);
		setFormError(null);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!token) return;
		if (!form.ragione_sociale.trim()) {
			setFormError("La ragione sociale è obbligatoria.");
			return;
		}
		setSubmitting(true);
		setFormError(null);

		const res =
			editingId !== null
				? await updateCompany(token, editingId, {
						ragione_sociale: form.ragione_sociale.trim(),
						attiva: form.attiva,
					})
				: await createCompany(token, {
						ragione_sociale: form.ragione_sociale.trim(),
					});

		setSubmitting(false);
		if ("error" in res) {
			setFormError(res.error);
			return;
		}
		toast.success(
			editingId !== null ? "Azienda aggiornata." : "Azienda creata."
		);
		closeModal();
		await fetchData();
	}

	return (
		<main className="m-2 flex h-dvh flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card pt-6 font-medium sm:m-2.5">
			{/* Header */}
			<div className="flex shrink-0 items-center justify-between gap-4 px-6 pb-2 md:px-9">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">Aziende</h1>
					<p className="mt-0.5 text-muted-foreground text-sm">
						Gestisci le aziende del sistema
					</p>
				</div>
				<button
					className={cn(
						"flex min-h-[48px] min-w-[48px] cursor-pointer items-center justify-center gap-2.5 rounded-full p-3 text-sm sm:min-h-0 sm:min-w-0 sm:px-3.75 sm:py-1.75",
						TRATTATIVE_HEADER_FILTER_BG
					)}
					onClick={openCreate}
					type="button"
				>
					<span className="hidden sm:inline">Nuova azienda</span>
					<Plus className="size-4 shrink-0 text-button-secondary" />
				</button>
			</div>

			{/* Table area */}
			<div className="table-container-bg flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-3xl">
				{loading ? (
					<div className="flex flex-1 items-center justify-center py-16">
						<Spinner size="md" />
					</div>
				) : (
					<div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto px-5.5 pt-4">
						<div
							className={cn(
								"table-header-bg sticky top-0 z-10 shrink-0 rounded-xl px-3 py-2.25 font-semibold text-muted-foreground text-xs uppercase tracking-wider",
								COMPANIES_TABLE_GRID
							)}
						>
							<span className="px-2">Ragione Sociale</span>
							<span className="px-2">Stato</span>
							<span className="px-2">Utenti</span>
							<span />
						</div>

						{companies.length === 0 ? (
							<div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
								Nessuna azienda trovata
							</div>
						) : (
							companies.map((c) => {
								const count = userCountForCompany(c.id);
								const isActive = c.attiva !== false && c.attiva !== 0;
								return (
									<div
										className={cn(
											"border-border/50 border-b px-3 py-3.5 text-sm transition-colors last:border-0 hover:bg-table-hover",
											COMPANIES_TABLE_GRID
										)}
										key={c.id}
									>
										<span className="flex items-center gap-2.5 truncate px-2 font-medium">
											<Building2 className="size-4 shrink-0 text-muted-foreground" />
											{c.ragione_sociale}
										</span>
										<span className="px-2">
											<span
												className={cn(
													"inline-flex rounded-full px-2.5 py-0.5 font-medium text-xs",
													isActive
														? "bg-status-completed-background text-status-completed-accent"
														: "bg-status-suspended-background text-status-suspended-accent"
												)}
											>
												{isActive ? "Attiva" : "Inattiva"}
											</span>
										</span>
										<span className="px-2 text-muted-foreground tabular-nums">
											{count} {count === 1 ? "utente" : "utenti"}
										</span>
										<span className="flex items-center px-2">
											<button
												aria-label={`Modifica ${c.ragione_sociale}`}
												className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
												onClick={() => openEdit(c)}
												title="Modifica"
												type="button"
											>
												<Pencil className="size-3.5" />
											</button>
										</span>
									</div>
								);
							})
						)}
					</div>
				)}
			</div>

			{/* Create / edit modal */}
			{modalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						aria-hidden
						className="absolute inset-0 bg-black/50"
						onClick={closeModal}
					/>
					<div className="relative z-10 w-full max-w-sm rounded-3xl bg-card px-6 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.55)] outline-none">
						<div className="mb-5 flex items-center justify-between">
							<h2 className="font-semibold text-lg">
								{editingId !== null ? "Modifica azienda" : "Nuova azienda"}
							</h2>
							<button
								aria-label="Chiudi"
								className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
								onClick={closeModal}
								type="button"
							>
								<X className="size-4" />
							</button>
						</div>

						<form className="flex flex-col gap-3" onSubmit={handleSubmit}>
							<div className={FIELD_CONTAINER}>
								<label className={FIELD_LABEL} htmlFor="ragione_sociale">
									Ragione sociale
								</label>
								<Input
									autoFocus
									className={FIELD_INPUT}
									id="ragione_sociale"
									onChange={(e) =>
										setForm((f) => ({ ...f, ragione_sociale: e.target.value }))
									}
									placeholder="Acme S.r.l."
									required
									value={form.ragione_sociale}
								/>
							</div>

							{editingId !== null && (
								<div
									className={cn(FIELD_CONTAINER, "cursor-pointer")}
									onClick={() => setForm((f) => ({ ...f, attiva: !f.attiva }))}
								>
									<label
										className={cn(FIELD_LABEL, "cursor-pointer")}
										htmlFor="attiva"
									>
										Stato
									</label>
									<div className="flex items-center gap-2">
										<span
											className={cn(
												"inline-flex rounded-full px-2.5 py-0.5 font-medium text-xs",
												form.attiva
													? "bg-status-completed-background text-status-completed-accent"
													: "bg-status-suspended-background text-status-suspended-accent"
											)}
										>
											{form.attiva ? "Attiva" : "Inattiva"}
										</span>
										<input
											checked={form.attiva}
											className="sr-only"
											id="attiva"
											onChange={(e) =>
												setForm((f) => ({ ...f, attiva: e.target.checked }))
											}
											type="checkbox"
										/>
									</div>
								</div>
							)}

							{formError && (
								<p className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive text-xs">
									{formError}
								</p>
							)}

							<div className="mt-1 flex justify-end gap-2">
								<Button onClick={closeModal} type="button" variant="outline">
									Annulla
								</Button>
								<Button disabled={submitting} type="submit">
									{submitting && <Spinner className="size-3.5" />}
									{editingId !== null ? "Salva" : "Crea azienda"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}
		</main>
	);
}
