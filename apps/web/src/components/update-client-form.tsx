"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { updateClient } from "@/lib/api/client";
import type { ApiClient, UpdateClientBody } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

/**
 * Id del form di update cliente, così possiamo collegare il bottone
 * "Salva" nel header della pagina usando l'attributo `form="..."`,
 * esattamente come fatto per `UPDATE_NEGOTIATION_FORM_ID`.
 */
export const UPDATE_CLIENT_FORM_ID = "update-client-form";

/** Wrapper card per le sezioni (Dati cliente, Sede), allineato allo stile dei form trattative. */
const SECTION_CARD_CLASSES =
	"flex min-w-0 w-full gap-3 rounded-2xl bg-card px-7.5 py-10";

/** Contenitore pill per singolo campo (label + input) coerente con `UpdateNegotiationForm`. */
const FIELD_CONTAINER_CLASSES =
	"flex items-center justify-between gap-2 rounded-2xl bg-table-header px-3.75 py-4.25 leading-none";

/** Stile comune per le label dei campi dentro le pill. */
const FIELD_LABEL_TEXT_CLASSES =
	"w-fit flex-0 whitespace-nowrap text-base flex font-medium items-start text-stats-title leading-none";

/** Stile base per gli input flat, allineati a destra, con focus ring accessibile. */
const FIELD_INPUT_BASE_CLASSES =
	"flex-1 w-full leading-none cursor-text border-none bg-transparent! px-0! py-0! text-right text-base font-medium shadow-none focus-visible:outline-none focus-visible:ring-0 outline-none rounded md:text-base";

/** Corpo form normalizzato a partire dall'oggetto `ApiClient` della risposta API. */
function clientToFormBody(client: ApiClient): UpdateClientBody {
	return {
		ragione_sociale: client.ragione_sociale ?? "",
		email: client.email ?? "",
		telefono: client.telefono ?? "",
		p_iva: client.p_iva ?? "",
		tipologia: client.tipologia ?? "",
		indirizzo: client.address?.indirizzo ?? "",
		citta: client.address?.citta ?? "",
		cap: client.address?.CAP ?? "",
		provincia: client.address?.provincia ?? "",
		regione: client.address?.regione ?? "",
	};
}

/** Normalizza un campo stringa opzionale: trim e converte stringhe vuote in `null`. */
function normalizeOptional(value: string | null | undefined): string | null {
	const trimmed = (value ?? "").trim();
	return trimmed.length > 0 ? trimmed : null;
}

/**
 * Determina se il form di update cliente è "sporco": cioè se almeno
 * un campo differisce dai valori attuali del cliente provenienti
 * dal backend. Usiamo normalizzazione whitespace per evitare falsi
 * positivi dovuti solo a spazi iniziali/finali.
 */
function isUpdateClientFormDirty(
	form: UpdateClientBody,
	client: ApiClient
): boolean {
	/**
	 * Normalizza un valore generico in stringa per il confronto:
	 * - converte `null`/`undefined` in stringa vuota
	 * - se è già una stringa, applica solo `trim()`
	 * - per altri tipi (es. numeri restituiti dall'API) usa `String(...)`
	 *   prima del `trim` così non chiamiamo mai `.trim()` su un non‑string.
	 */
	const normalize = (value: unknown): string => {
		if (typeof value === "string") {
			return value.trim();
		}
		if (value == null) {
			return "";
		}
		return String(value).trim();
	};

	const addr = client.address;

	return (
		normalize(form.ragione_sociale) !== normalize(client.ragione_sociale) ||
		normalize(form.email) !== normalize(client.email) ||
		normalize(form.telefono) !== normalize(client.telefono) ||
		normalize(form.p_iva) !== normalize(client.p_iva) ||
		normalize(form.tipologia) !== normalize(client.tipologia) ||
		normalize(form.indirizzo) !== normalize(addr?.indirizzo) ||
		normalize(form.citta) !== normalize(addr?.citta) ||
		normalize(form.cap) !== normalize(addr?.CAP) ||
		normalize(form.provincia) !== normalize(addr?.provincia) ||
		normalize(form.regione) !== normalize(addr?.regione)
	);
}

interface UpdateClientFormProps {
	client: ApiClient;
	/**
	 * Chiamata dopo un salvataggio avvenuto con successo, passando
	 * il cliente aggiornato così che la pagina possa aggiornare lo
	 * stato locale (header, form, ecc.).
	 */
	onSuccess: (updated: ApiClient) => void;
	/** Notifica il parent quando inizia/termina il submit (per il bottone Salva nel header). */
	onSubmittingChange?: (submitting: boolean) => void;
	/**
	 * Notifica il parent quando il form passa da "pulito" a "sporco" e viceversa,
	 * così la pagina può mostrare o nascondere le azioni nel header e integrare
	 * la conferma di uscita (Modifiche non salvate).
	 */
	onDirtyChange?: (dirty: boolean) => void;
	/**
	 * Quando questo valore cambia, il form viene resettato ai valori correnti
	 * del cliente. Il parent può incrementare questo contatore quando l'utente
	 * clicca "Annulla" per scartare le modifiche locali.
	 */
	resetTrigger?: number;
}

/**
 * Form di modifica per i dati anagrafici del cliente e la sede.
 * Usa la stessa shell visiva dei form trattative (card per sezione,
 * pill per i campi) e delega la conferma di uscita alla pagina tramite
 * `onDirtyChange`.
 */
export function UpdateClientForm({
	client,
	onSuccess,
	onSubmittingChange,
	onDirtyChange,
	resetTrigger,
}: UpdateClientFormProps) {
	const { token } = useAuth();
	const isMobile = useIsMobile();
	const [form, setForm] = useState<UpdateClientBody>(() =>
		clientToFormBody(client)
	);
	const [error, setError] = useState<string | null>(null);
	const [ragioneSocialeError, setRagioneSocialeError] = useState<string | null>(
		null
	);

	// Se il client cambia (es. dopo un refetch o un salvataggio) oppure quando
	// il parent richiede un reset esplicito, riallineiamo lo stato del form.
	// biome-ignore lint/correctness/useExhaustiveDependencies: resetTrigger è il segnale esplicito per il reset
	useEffect(() => {
		setForm(clientToFormBody(client));
	}, [client, resetTrigger]);

	// Calcola e notifica al parent lo stato di "sporco" del form, così
	// la pagina può decidere se mostrare le azioni e se attivare la
	// conferma di uscita senza salvare.
	const isDirty = isUpdateClientFormDirty(form, client);
	useEffect(() => {
		onDirtyChange?.(isDirty);
	}, [isDirty, onDirtyChange]);

	/** Validazione minimale: la ragione sociale è obbligatoria. */
	const validateRagioneSociale = useCallback(
		(value: string | null | undefined): string | null => {
			const trimmed = (value ?? "").trim();
			if (!trimmed) {
				return "Inserisci una ragione sociale";
			}
			return null;
		},
		[]
	);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!token) {
			return;
		}
		const ragioneErr = validateRagioneSociale(form.ragione_sociale);
		setRagioneSocialeError(ragioneErr);
		if (ragioneErr) {
			return;
		}
		setError(null);
		onSubmittingChange?.(true);

		const body: UpdateClientBody = {
			ragione_sociale: (form.ragione_sociale ?? "").trim(),
			email: normalizeOptional(form.email),
			telefono: normalizeOptional(form.telefono),
			p_iva: normalizeOptional(form.p_iva),
			tipologia: normalizeOptional(form.tipologia),
			indirizzo: normalizeOptional(form.indirizzo),
			citta: normalizeOptional(form.citta),
			cap: normalizeOptional(form.cap),
			provincia: normalizeOptional(form.provincia),
			regione: normalizeOptional(form.regione),
		};

		const result = await updateClient(token, client.id, body);
		onSubmittingChange?.(false);

		if ("error" in result) {
			setError(result.error);
			return;
		}

		toast.success("Cliente aggiornato");
		onSuccess(result.data);
	};

	const sectionCardClasses = cn(SECTION_CARD_CLASSES, isMobile && "flex-col");

	return (
		<div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
			<form
				className="scroll-fade-y flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 overflow-auto"
				id={UPDATE_CLIENT_FORM_ID}
				onSubmit={handleSubmit}
			>
				<section
					aria-labelledby="clienti-dati-anagrafici-heading"
					className={sectionCardClasses}
				>
					<div className="flex w-full min-w-0">
						<h2
							className="font-medium text-2xl"
							id="clienti-dati-anagrafici-heading"
						>
							Dati cliente
						</h2>
					</div>
					<div className="flex w-full min-w-0 flex-col gap-2">
						<label
							className={cn(
								FIELD_CONTAINER_CLASSES,
								ragioneSocialeError &&
									"ring-1 ring-destructive ring-offset-2 ring-offset-background"
							)}
							htmlFor="update-client-ragione-sociale"
						>
							<span className={FIELD_LABEL_TEXT_CLASSES}>Ragione sociale</span>
							<input
								aria-describedby={
									ragioneSocialeError
										? "update-client-ragione-sociale-error"
										: undefined
								}
								aria-invalid={!!ragioneSocialeError}
								className={FIELD_INPUT_BASE_CLASSES}
								id="update-client-ragione-sociale"
								name="ragione_sociale"
								onChange={(event) => {
									setRagioneSocialeError(null);
									setForm((prev) => ({
										...prev,
										ragione_sociale: event.target.value,
									}));
								}}
								type="text"
								value={form.ragione_sociale ?? ""}
							/>
						</label>
						{ragioneSocialeError && (
							<p
								className="text-destructive text-sm"
								id="update-client-ragione-sociale-error"
								role="alert"
							>
								{ragioneSocialeError}
							</p>
						)}

						<label
							className={FIELD_CONTAINER_CLASSES}
							htmlFor="update-client-email"
						>
							<span className={FIELD_LABEL_TEXT_CLASSES}>Email</span>
							<input
								className={FIELD_INPUT_BASE_CLASSES}
								id="update-client-email"
								inputMode="email"
								name="email"
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										email: event.target.value,
									}))
								}
								type="email"
								value={form.email ?? ""}
							/>
						</label>

						<label
							className={FIELD_CONTAINER_CLASSES}
							htmlFor="update-client-telefono"
						>
							<span className={FIELD_LABEL_TEXT_CLASSES}>Telefono</span>
							<input
								className={FIELD_INPUT_BASE_CLASSES}
								id="update-client-telefono"
								inputMode="tel"
								name="telefono"
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										telefono: event.target.value,
									}))
								}
								type="tel"
								value={form.telefono ?? ""}
							/>
						</label>

						<label
							className={FIELD_CONTAINER_CLASSES}
							htmlFor="update-client-piva"
						>
							<span className={FIELD_LABEL_TEXT_CLASSES}>P.IVA</span>
							<input
								className={FIELD_INPUT_BASE_CLASSES}
								id="update-client-piva"
								inputMode="numeric"
								name="p_iva"
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										p_iva: event.target.value,
									}))
								}
								type="text"
								value={form.p_iva ?? ""}
							/>
						</label>

						<label
							className={FIELD_CONTAINER_CLASSES}
							htmlFor="update-client-tipologia"
						>
							<span className={FIELD_LABEL_TEXT_CLASSES}>Tipologia</span>
							<input
								className={FIELD_INPUT_BASE_CLASSES}
								id="update-client-tipologia"
								name="tipologia"
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										tipologia: event.target.value,
									}))
								}
								type="text"
								value={form.tipologia ?? ""}
							/>
						</label>
					</div>
				</section>

				<section
					aria-labelledby="clienti-sede-heading"
					className={sectionCardClasses}
				>
					<div className="flex w-full min-w-0">
						<h2 className="font-medium text-2xl" id="clienti-sede-heading">
							Sede
						</h2>
					</div>
					<div className="flex w-full min-w-0 flex-col gap-2">
						<label
							className={FIELD_CONTAINER_CLASSES}
							htmlFor="update-client-indirizzo"
						>
							<span className={FIELD_LABEL_TEXT_CLASSES}>Indirizzo</span>
							<input
								className={FIELD_INPUT_BASE_CLASSES}
								id="update-client-indirizzo"
								name="indirizzo"
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										indirizzo: event.target.value,
									}))
								}
								type="text"
								value={form.indirizzo ?? ""}
							/>
						</label>

						<label
							className={FIELD_CONTAINER_CLASSES}
							htmlFor="update-client-citta"
						>
							<span className={FIELD_LABEL_TEXT_CLASSES}>Città</span>
							<input
								className={FIELD_INPUT_BASE_CLASSES}
								id="update-client-citta"
								name="citta"
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										citta: event.target.value,
									}))
								}
								type="text"
								value={form.citta ?? ""}
							/>
						</label>

						<label
							className={FIELD_CONTAINER_CLASSES}
							htmlFor="update-client-cap"
						>
							<span className={FIELD_LABEL_TEXT_CLASSES}>CAP</span>
							<input
								className={FIELD_INPUT_BASE_CLASSES}
								id="update-client-cap"
								inputMode="numeric"
								name="cap"
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										cap: event.target.value,
									}))
								}
								type="text"
								value={form.cap ?? ""}
							/>
						</label>

						<label
							className={FIELD_CONTAINER_CLASSES}
							htmlFor="update-client-provincia"
						>
							<span className={FIELD_LABEL_TEXT_CLASSES}>Provincia</span>
							<input
								className={FIELD_INPUT_BASE_CLASSES}
								id="update-client-provincia"
								maxLength={2}
								name="provincia"
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										provincia: event.target.value,
									}))
								}
								type="text"
								value={form.provincia ?? ""}
							/>
						</label>

						<label
							className={FIELD_CONTAINER_CLASSES}
							htmlFor="update-client-regione"
						>
							<span className={FIELD_LABEL_TEXT_CLASSES}>Regione</span>
							<input
								className={FIELD_INPUT_BASE_CLASSES}
								id="update-client-regione"
								name="regione"
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										regione: event.target.value,
									}))
								}
								type="text"
								value={form.regione ?? ""}
							/>
						</label>
					</div>
				</section>

				{error && (
					<p className="text-destructive text-sm" role="alert">
						{error}
					</p>
				)}
			</form>

			{/* Fallback action row nel caso in cui la pagina non voglia rendere i pulsanti nel header.
			    Per la pagina `/clienti/[id]` useremo invece i pulsanti nel titolo (Annulla/Salva),
			    quindi lasciamo solo un'uscita minimale per eventuali riutilizzi futuri. */}
			{false}
		</div>
	);
}

export default UpdateClientForm;
