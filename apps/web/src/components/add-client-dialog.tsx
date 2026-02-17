"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { createClient } from "@/lib/api/client";
import type { CreateClientBody } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";

/** Field styling aligned with UpdateClientForm / clients table. */
const ADD_CLIENT_FIELD_CONTAINER =
	"flex items-center justify-between gap-2 rounded-2xl bg-table-header px-3.75 py-4.25 leading-none";
const ADD_CLIENT_FIELD_LABEL =
	"w-fit flex-0 whitespace-nowrap text-base flex font-medium items-start text-stats-title leading-none";
const ADD_CLIENT_FIELD_INPUT =
	"flex-1 w-full leading-none cursor-text border-none bg-transparent! px-0! py-0! text-right text-base font-medium shadow-none focus-visible:outline-none focus-visible:ring-0 outline-none rounded md:text-base";

const INITIAL_FORM: CreateClientBody = {
	ragione_sociale: "",
	p_iva: "",
	email: "",
	telefono: "",
	tipologia: "",
	indirizzo: "",
	citta: "",
	cap: "",
	provincia: "",
	regione: "",
};

export interface AddClientDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Called after a client is created so the parent can refetch lists. */
	onSuccess?: () => void;
}

/**
 * Dialog to create a new client via POST /clients.
 * Form fields: ragione_sociale (required), p_iva, email, telefono, tipologia, indirizzo, citta, cap, provincia, regione.
 */
export function AddClientDialog({
	open,
	onOpenChange,
	onSuccess,
}: AddClientDialogProps) {
	const { token } = useAuth();
	const isMobile = useIsMobile();
	const [form, setForm] = useState<CreateClientBody>(INITIAL_FORM);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [ragioneError, setRagioneError] = useState<string | null>(null);

	const resetForm = useCallback(() => {
		setForm(INITIAL_FORM);
		setError(null);
		setRagioneError(null);
	}, []);

	const handleOpenChange = useCallback(
		(next: boolean) => {
			if (!next) {
				resetForm();
			}
			onOpenChange(next);
		},
		[onOpenChange, resetForm]
	);

	const handleSubmit = useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
			if (!token) {
				return;
			}
			const ragione = (form.ragione_sociale ?? "").trim();
			const ragioneErr = ragione ? null : "Inserisci una ragione sociale";
			setRagioneError(ragioneErr);
			if (ragioneErr) {
				return;
			}
			setError(null);
			setSubmitting(true);
			const trimOrNull = (v: string | null | undefined): string | null => {
				const t = (v ?? "").trim();
				return t.length > 0 ? t : null;
			};
			const body: CreateClientBody = {
				ragione_sociale: ragione,
				p_iva: trimOrNull(form.p_iva),
				email: trimOrNull(form.email),
				telefono: trimOrNull(form.telefono),
				tipologia: trimOrNull(form.tipologia),
				indirizzo: trimOrNull(form.indirizzo),
				citta: trimOrNull(form.citta),
				cap: trimOrNull(form.cap),
				provincia: trimOrNull(form.provincia),
				regione: trimOrNull(form.regione),
			};
			const result = await createClient(token, body);
			setSubmitting(false);
			if ("error" in result) {
				setError(result.error);
				return;
			}
			toast.success("Cliente creato");
			handleOpenChange(false);
			onSuccess?.();
		},
		[token, form, handleOpenChange, onSuccess]
	);

	const setField = useCallback(
		<K extends keyof CreateClientBody>(key: K, value: string) => {
			setForm((prev: CreateClientBody) => ({ ...prev, [key]: value }));
		},
		[]
	);

	return (
		<Dialog.Root
			disablePointerDismissal={false}
			onOpenChange={handleOpenChange}
			open={open}
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
								: "data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95 w-full max-w-2xl rounded-3xl px-6 py-5"
						)}
					>
						<Dialog.Title className="sr-only" id="add-client-dialog-title">
							Aggiungi cliente
						</Dialog.Title>
						<p className="sr-only" id="add-client-dialog-desc">
							Inserisci i dati del nuovo cliente (ragione sociale obbligatoria).
						</p>
						<div
							className={cn(
								isMobile ? "min-h-0 flex-1 overflow-y-auto" : "overflow-y-auto"
							)}
						>
							<div className="flex items-center justify-between gap-3 pb-4">
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
							<form
								className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6"
								onSubmit={handleSubmit}
							>
								<section
									aria-labelledby="add-client-dati-heading"
									className="flex min-w-0 flex-col gap-2 rounded-2xl bg-card px-0 py-0"
								>
									<h3
										className="font-medium text-card-foreground text-lg"
										id="add-client-dati-heading"
									>
										Dati cliente
									</h3>
									<label
										className={cn(
											ADD_CLIENT_FIELD_CONTAINER,
											ragioneError &&
												"ring-1 ring-destructive ring-offset-2 ring-offset-background"
										)}
										htmlFor="add-client-ragione-sociale"
									>
										<span className={ADD_CLIENT_FIELD_LABEL}>
											Ragione sociale
										</span>
										<input
											aria-describedby={
												ragioneError ? "add-client-ragione-error" : undefined
											}
											aria-invalid={!!ragioneError}
											className={ADD_CLIENT_FIELD_INPUT}
											id="add-client-ragione-sociale"
											name="ragione_sociale"
											onChange={(e) => {
												setRagioneError(null);
												setField("ragione_sociale", e.target.value);
											}}
											required
											type="text"
											value={form.ragione_sociale ?? ""}
										/>
									</label>
									{ragioneError && (
										<p
											className="text-destructive text-sm"
											id="add-client-ragione-error"
											role="alert"
										>
											{ragioneError}
										</p>
									)}
									<label
										className={ADD_CLIENT_FIELD_CONTAINER}
										htmlFor="add-client-email"
									>
										<span className={ADD_CLIENT_FIELD_LABEL}>Email</span>
										<input
											className={ADD_CLIENT_FIELD_INPUT}
											id="add-client-email"
											inputMode="email"
											name="email"
											onChange={(e) => setField("email", e.target.value)}
											type="email"
											value={form.email ?? ""}
										/>
									</label>
									<label
										className={ADD_CLIENT_FIELD_CONTAINER}
										htmlFor="add-client-telefono"
									>
										<span className={ADD_CLIENT_FIELD_LABEL}>Telefono</span>
										<input
											className={ADD_CLIENT_FIELD_INPUT}
											id="add-client-telefono"
											inputMode="tel"
											name="telefono"
											onChange={(e) => setField("telefono", e.target.value)}
											type="tel"
											value={form.telefono ?? ""}
										/>
									</label>
									<label
										className={ADD_CLIENT_FIELD_CONTAINER}
										htmlFor="add-client-piva"
									>
										<span className={ADD_CLIENT_FIELD_LABEL}>P.IVA</span>
										<input
											className={ADD_CLIENT_FIELD_INPUT}
											id="add-client-piva"
											inputMode="numeric"
											name="p_iva"
											onChange={(e) => setField("p_iva", e.target.value)}
											type="text"
											value={form.p_iva ?? ""}
										/>
									</label>
									<label
										className={ADD_CLIENT_FIELD_CONTAINER}
										htmlFor="add-client-tipologia"
									>
										<span className={ADD_CLIENT_FIELD_LABEL}>Tipologia</span>
										<input
											className={ADD_CLIENT_FIELD_INPUT}
											id="add-client-tipologia"
											name="tipologia"
											onChange={(e) => setField("tipologia", e.target.value)}
											type="text"
											value={form.tipologia ?? ""}
										/>
									</label>
								</section>
								<section
									aria-labelledby="add-client-sede-heading"
									className="flex min-w-0 flex-col gap-2 rounded-2xl bg-card px-0 py-0"
								>
									<h3
										className="font-medium text-card-foreground text-lg"
										id="add-client-sede-heading"
									>
										Sede
									</h3>
									<label
										className={ADD_CLIENT_FIELD_CONTAINER}
										htmlFor="add-client-indirizzo"
									>
										<span className={ADD_CLIENT_FIELD_LABEL}>Indirizzo</span>
										<input
											className={ADD_CLIENT_FIELD_INPUT}
											id="add-client-indirizzo"
											name="indirizzo"
											onChange={(e) => setField("indirizzo", e.target.value)}
											type="text"
											value={form.indirizzo ?? ""}
										/>
									</label>
									<label
										className={ADD_CLIENT_FIELD_CONTAINER}
										htmlFor="add-client-citta"
									>
										<span className={ADD_CLIENT_FIELD_LABEL}>Città</span>
										<input
											className={ADD_CLIENT_FIELD_INPUT}
											id="add-client-citta"
											name="citta"
											onChange={(e) => setField("citta", e.target.value)}
											type="text"
											value={form.citta ?? ""}
										/>
									</label>
									<label
										className={ADD_CLIENT_FIELD_CONTAINER}
										htmlFor="add-client-cap"
									>
										<span className={ADD_CLIENT_FIELD_LABEL}>CAP</span>
										<input
											className={ADD_CLIENT_FIELD_INPUT}
											id="add-client-cap"
											inputMode="numeric"
											name="cap"
											onChange={(e) => setField("cap", e.target.value)}
											type="text"
											value={form.cap ?? ""}
										/>
									</label>
									<label
										className={ADD_CLIENT_FIELD_CONTAINER}
										htmlFor="add-client-provincia"
									>
										<span className={ADD_CLIENT_FIELD_LABEL}>Provincia</span>
										<input
											className={ADD_CLIENT_FIELD_INPUT}
											id="add-client-provincia"
											maxLength={2}
											name="provincia"
											onChange={(e) => setField("provincia", e.target.value)}
											type="text"
											value={form.provincia ?? ""}
										/>
									</label>
									<label
										className={ADD_CLIENT_FIELD_CONTAINER}
										htmlFor="add-client-regione"
									>
										<span className={ADD_CLIENT_FIELD_LABEL}>Regione</span>
										<input
											className={ADD_CLIENT_FIELD_INPUT}
											id="add-client-regione"
											name="regione"
											onChange={(e) => setField("regione", e.target.value)}
											type="text"
											value={form.regione ?? ""}
										/>
									</label>
								</section>
								{error && (
									<p
										className="text-destructive text-sm md:col-span-2"
										role="alert"
									>
										{error}
									</p>
								)}
								<Button
									className="h-10 w-full rounded-xl text-sm md:col-span-2"
									disabled={submitting}
									type="submit"
								>
									{submitting ? (
										<>
											<Spinner aria-hidden className="size-4" />
											Salvataggio…
										</>
									) : (
										"Crea cliente"
									)}
								</Button>
							</form>
						</div>
					</Dialog.Popup>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
