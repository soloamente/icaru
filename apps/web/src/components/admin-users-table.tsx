"use client";

import { Plus, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImportClientsDialog } from "@/components/import-clients-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
	createUser,
	listCompanies,
	listRoles,
	listUsers,
} from "@/lib/api/client";
import type {
	ApiCompany,
	ApiRole,
	ApiUserAdmin,
	CreateUserBody,
} from "@/lib/api/types";
import { useAuthOptional } from "@/lib/auth/auth-context";
import { TRATTATIVE_HEADER_FILTER_BG } from "@/lib/trattative-header-filter-classes";
import { cn } from "@/lib/utils";

const USERS_TABLE_GRID =
	"grid grid-cols-[minmax(150px,1.5fr)_minmax(180px,2fr)_minmax(120px,1fr)_minmax(150px,1.5fr)_minmax(80px,0.6fr)_minmax(48px,0.4fr)]";

const FIELD_CONTAINER =
	"flex items-center justify-between gap-2 rounded-2xl bg-table-header px-3.75 py-3 leading-none";
const FIELD_LABEL =
	"w-fit shrink-0 whitespace-nowrap text-sm font-medium text-stats-title leading-none";
const FIELD_INPUT =
	"flex-1 w-full cursor-text border-none bg-transparent! px-0! py-0! text-right text-sm font-medium shadow-none focus-visible:outline-none focus-visible:ring-0 outline-none h-auto";
const FIELD_SELECT =
	"flex-1 w-full cursor-pointer appearance-none border-none bg-transparent py-0 pl-0 pr-0 text-right text-sm font-medium focus:outline-none";

const EMPTY_FORM: CreateUserBody = {
	nome: "",
	cognome: "",
	email: "",
	company_id: 0,
	role_id: 0,
};

export default function AdminUsersTable() {
	const auth = useAuthOptional();
	const [users, setUsers] = useState<ApiUserAdmin[]>([]);
	const [companies, setCompanies] = useState<ApiCompany[]>([]);
	const [roles, setRoles] = useState<ApiRole[]>([]);
	const [loading, setLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [form, setForm] = useState<CreateUserBody>(EMPTY_FORM);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [importUserId, setImportUserId] = useState<number | null>(null);

	const token = auth?.token ?? null;

	async function fetchUsers() {
		if (!token) return;
		const res = await listUsers(token);
		if ("data" in res) setUsers(res.data);
	}

	useEffect(() => {
		if (!token) return;
		setLoading(true);
		Promise.all([
			listUsers(token),
			listCompanies(token),
			listRoles(token),
		]).then(([usersRes, companiesRes, rolesRes]) => {
			if ("data" in usersRes) setUsers(usersRes.data);
			if ("data" in companiesRes) setCompanies(companiesRes.data);
			if ("data" in rolesRes) {
				setRoles(rolesRes.data);
			} else {
				toast.error("Impossibile caricare i ruoli: " + rolesRes.error);
			}
			setLoading(false);
		});
	}, [token]);

	function openModal() {
		setForm(EMPTY_FORM);
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
		if (!(form.nome.trim() && form.cognome.trim() && form.email.trim())) {
			setFormError("Nome, cognome ed email sono obbligatori.");
			return;
		}
		if (!(form.company_id && form.role_id)) {
			setFormError("Seleziona azienda e ruolo.");
			return;
		}
		setSubmitting(true);
		setFormError(null);
		const res = await createUser(token, form);
		setSubmitting(false);
		if ("error" in res) {
			setFormError(res.error);
			return;
		}
		toast.success(
			"Utente creato. Le credenziali sono state inviate via email."
		);
		closeModal();
		await fetchUsers();
	}

	return (
		<main className="m-2 flex h-dvh flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card pt-6 font-medium sm:m-2.5">
			{/* Header */}
			<div className="flex shrink-0 items-center justify-between gap-4 px-6 pb-2 md:px-9">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">Utenti</h1>
					<p className="mt-0.5 text-muted-foreground text-sm">
						Gestisci gli utenti del sistema
					</p>
				</div>
				<button
					className={cn(
						"flex min-h-[48px] min-w-[48px] cursor-pointer items-center justify-center gap-2.5 rounded-full p-3 text-sm sm:min-h-0 sm:min-w-0 sm:px-3.75 sm:py-1.75",
						TRATTATIVE_HEADER_FILTER_BG
					)}
					onClick={openModal}
					type="button"
				>
					<span className="hidden sm:inline">Nuovo utente</span>
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
								USERS_TABLE_GRID
							)}
						>
							<span className="px-2">Nome</span>
							<span className="px-2">Email</span>
							<span className="px-2">Ruolo</span>
							<span className="px-2">Azienda</span>
							<span className="px-2">Stato</span>
							<span />
						</div>

						{users.length === 0 ? (
							<div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
								Nessun utente trovato
							</div>
						) : (
							users.map((u) => (
								<div
									className={cn(
										"border-border/50 border-b px-3 py-3.5 text-sm transition-colors last:border-0 hover:bg-table-hover",
										USERS_TABLE_GRID
									)}
									key={u.id}
								>
									<span className="truncate px-2 font-medium">
										{u.nome} {u.cognome}
									</span>
									<span className="truncate px-2 text-muted-foreground">
										{u.email}
									</span>
									<span className="truncate px-2">{u.role?.nome ?? "—"}</span>
									<span className="truncate px-2">
										{u.company?.ragione_sociale ?? "—"}
									</span>
									<span className="px-2">
										<span
											className={cn(
												"inline-flex rounded-full px-2.5 py-0.5 font-medium text-xs",
												u.sospeso
													? "bg-status-suspended-background text-status-suspended-accent"
													: "bg-status-completed-background text-status-completed-accent"
											)}
										>
											{u.sospeso ? "Sospeso" : "Attivo"}
										</span>
									</span>
									<span className="flex items-center px-2">
										<button
											aria-label={`Importa clienti per ${u.nome} ${u.cognome}`}
											className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
											onClick={() => setImportUserId(u.id)}
											title="Importa clienti"
											type="button"
										>
											<Upload className="size-3.5" />
										</button>
									</span>
								</div>
							))
						)}
					</div>
				)}
			</div>

			{/* Import clients dialog */}
			<ImportClientsDialog
				onOpenChange={(open) => {
					if (!open) setImportUserId(null);
				}}
				onSuccess={fetchUsers}
				open={importUserId !== null}
				targetUserId={importUserId ?? undefined}
			/>

			{/* Create user modal */}
			{modalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						aria-hidden
						className="absolute inset-0 bg-black/50"
						onClick={closeModal}
					/>
					<div className="relative z-10 w-full max-w-md rounded-3xl bg-card px-6 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.55)] outline-none">
						<div className="mb-5 flex items-center justify-between">
							<h2 className="font-semibold text-lg">Nuovo utente</h2>
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
							<div className="grid grid-cols-2 gap-3">
								<div className={FIELD_CONTAINER}>
									<label className={FIELD_LABEL} htmlFor="nome">
										Nome
									</label>
									<Input
										className={FIELD_INPUT}
										id="nome"
										onChange={(e) =>
											setForm((f) => ({ ...f, nome: e.target.value }))
										}
										placeholder="Mario"
										required
										value={form.nome}
									/>
								</div>
								<div className={FIELD_CONTAINER}>
									<label className={FIELD_LABEL} htmlFor="cognome">
										Cognome
									</label>
									<Input
										className={FIELD_INPUT}
										id="cognome"
										onChange={(e) =>
											setForm((f) => ({ ...f, cognome: e.target.value }))
										}
										placeholder="Rossi"
										required
										value={form.cognome}
									/>
								</div>
							</div>

							<div className={FIELD_CONTAINER}>
								<label className={FIELD_LABEL} htmlFor="email">
									Email
								</label>
								<Input
									className={FIELD_INPUT}
									id="email"
									onChange={(e) =>
										setForm((f) => ({ ...f, email: e.target.value }))
									}
									placeholder="mario.rossi@azienda.it"
									required
									type="email"
									value={form.email}
								/>
							</div>

							<div className={FIELD_CONTAINER}>
								<label className={FIELD_LABEL} htmlFor="company">
									Azienda
								</label>
								<select
									className={FIELD_SELECT}
									id="company"
									onChange={(e) =>
										setForm((f) => ({
											...f,
											company_id: Number(e.target.value),
										}))
									}
									value={form.company_id || ""}
								>
									<option disabled value="">
										Seleziona…
									</option>
									{companies.map((c) => (
										<option key={c.id} value={c.id}>
											{c.ragione_sociale}
										</option>
									))}
								</select>
							</div>

							<div className={FIELD_CONTAINER}>
								<label className={FIELD_LABEL} htmlFor="role">
									Ruolo
								</label>
								{roles.length === 0 ? (
									<span className="flex-1 text-right text-muted-foreground text-xs">
										Nessun ruolo disponibile
									</span>
								) : (
									<select
										className={FIELD_SELECT}
										id="role"
										onChange={(e) =>
											setForm((f) => ({
												...f,
												role_id: Number(e.target.value),
											}))
										}
										value={form.role_id || ""}
									>
										<option disabled value="">
											Seleziona…
										</option>
										{roles.map((r) => (
											<option key={r.id} value={r.id}>
												{r.nome}
											</option>
										))}
									</select>
								)}
							</div>

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
									Crea utente
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}
		</main>
	);
}
