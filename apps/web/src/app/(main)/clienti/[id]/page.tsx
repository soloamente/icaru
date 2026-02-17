"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { Drawer } from "vaul";
import { IconUTurnToLeft } from "@/components/icons";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import UpdateClientForm, {
	UPDATE_CLIENT_FORM_ID,
} from "@/components/update-client-form";
import { getClient } from "@/lib/api/client";
import type { ApiClient } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { registerUnsavedNavigationListener } from "@/lib/unsaved-navigation";

/**
 * Pagina di dettaglio/modifica cliente.
 * Route: /clienti/[id]
 *
 * La struttura replica quella delle pagine di edit trattativa:
 * - shell grafica con header + table-container-bg
 * - form con sezioni "Dati cliente" e "Sede"
 * - azioni Annulla / Salva nel header
 * - conferma "Modifiche non salvate" (dialog su desktop, drawer su mobile)
 *   integrata anche con la navigazione globale tramite `registerUnsavedNavigationListener`.
 */
export default function ClientiDettaglioPage() {
	const router = useRouter();
	const params = useParams();
	const { token, isLoaded, user } = useAuth();
	const id =
		typeof params.id === "string" ? Number.parseInt(params.id, 10) : Number.NaN;

	const [client, setClient] = useState<ApiClient | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isDirty, setIsDirty] = useState(false);
	// Stato del dialog di conferma uscita senza salvare.
	const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
	// Flag per decidere se usare Drawer (mobile) o Dialog (desktop) per la conferma.
	const [leaveDialogLayoutReady, setLeaveDialogLayoutReady] = useState(false);
	const [leaveDialogIsDesktop, setLeaveDialogIsDesktop] = useState(false);
	// Quando la richiesta di navigazione arriva da fuori (Sidebar, ecc.),
	// memorizziamo qui l'href di destinazione per usarlo dopo la conferma.
	const [pendingHref, setPendingHref] = useState<string | null>(null);
	// Contatore per resettare il form (usato dal pulsante "Annulla").
	const [resetTrigger, setResetTrigger] = useState(0);

	/**
	 * Carica il dettaglio del cliente dal backend usando l'endpoint
	 * GET /clients/{id}. In caso di errore espone il messaggio nella UI.
	 */
	const fetchClient = useCallback(async () => {
		if (!token || Number.isNaN(id)) {
			setLoading(false);
			setError("Cliente non valido");
			return;
		}
		setLoading(true);
		setError(null);
		const result = await getClient(token, id);
		setLoading(false);
		if ("error" in result) {
			setError(result.error);
			setClient(null);
			return;
		}
		setClient(result.data);
	}, [token, id]);

	// Se l'utente non è autenticato, reindirizziamo alla login (stesso pattern di altre pagine protette).
	useEffect(() => {
		if (isLoaded && !user) {
			router.replace("/login");
		}
	}, [isLoaded, user, router]);

	// Effettua il fetch dei dati cliente al mount e quando cambia id/token.
	useEffect(() => {
		// Silently ignore fetch errors; la UI mostra lo stato di errore.
		fetchClient().catch(() => undefined);
	}, [fetchClient]);

	// Rileva se siamo su viewport mobile o desktop per scegliere il layout
	// del dialog di conferma "Modifiche non salvate", allineato alle
	// pagine di edit trattativa (breakpoint 768px).
	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const mql = window.matchMedia("(max-width: 767px)");
		const handleChange = () => {
			setLeaveDialogIsDesktop(!mql.matches);
		};
		handleChange();
		setLeaveDialogLayoutReady(true);
		mql.addEventListener("change", handleChange);
		return () => {
			mql.removeEventListener("change", handleChange);
		};
	}, []);

	/** Aggiorna lo stato locale del cliente dopo un salvataggio riuscito. */
	const handleSuccess = useCallback((updated: ApiClient) => {
		setClient(updated);
	}, []);

	const backHref = "/clienti";

	/**
	 * Quando l'utente conferma di voler uscire senza salvare:
	 * - chiudiamo il dialog
	 * - navighiamo alla destinazione (lista clienti di default oppure href pendente).
	 */
	const handleConfirmLeave = useCallback(() => {
		const targetHref = pendingHref ?? backHref;
		setIsLeaveDialogOpen(false);
		setPendingHref(null);
		// biome-ignore lint/suspicious/noExplicitAny: cast string path su tipo Route interno di Next
		router.push(targetHref as any);
	}, [backHref, pendingHref, router]);

	/**
	 * Gestisce il click sul pulsante "Torna indietro" nell'header:
	 * - se ci sono modifiche non salvate e non stiamo inviando, mostra il dialog di conferma
	 * - altrimenti torna direttamente alla lista clienti.
	 */
	const handleBackClick = useCallback(() => {
		if (isDirty && !isSubmitting) {
			setIsLeaveDialogOpen(true);
			return;
		}
		// biome-ignore lint/suspicious/noExplicitAny: vedi nota in handleConfirmLeave
		router.push(backHref as any);
	}, [backHref, isDirty, isSubmitting, router]);

	// Integra la conferma "Modifiche non salvate" con la navigazione globale:
	// quando la Sidebar (o altri componenti) chiamano requestUnsavedNavigation,
	// questa pagina può bloccare la navigazione e mostrare prima il dialog.
	useEffect(() => {
		const unregister = registerUnsavedNavigationListener(({ href }) => {
			if (isDirty && !isSubmitting) {
				setPendingHref(href);
				setIsLeaveDialogOpen(true);
				return true;
			}
			// biome-ignore lint/suspicious/noExplicitAny: cast necessario per Route interno Next
			router.push(href as any);
			return true;
		});
		return unregister;
	}, [isDirty, isSubmitting, router]);

	/**
	 * Contenuto condiviso del dialog/drawer "Modifiche non salvate",
	 * riusato sia nella variante desktop (Dialog) sia mobile (Drawer).
	 */
	function renderLeaveDialogContent(closeButton: ReactNode) {
		return (
			<>
				<div className="flex items-center justify-between gap-3 pb-6">
					<h2 className="font-bold text-2xl text-card-foreground tracking-tight">
						Modifiche non salvate
					</h2>
					{closeButton}
				</div>
				<p className="text-muted-foreground text-sm">
					Hai apportato modifiche ai dati del cliente che non sono ancora state
					salvate. Sei sicuro di voler uscire senza salvare le modifiche?
				</p>
				<div className="mt-6 flex justify-between gap-3">
					<Button
						className="h-10 min-w-26 rounded-xl border-border bg-muted text-card-foreground text-sm hover:bg-muted/80 hover:text-card-foreground aria-expanded:bg-muted aria-expanded:text-card-foreground"
						onClick={() => setIsLeaveDialogOpen(false)}
						type="button"
						variant="outline"
					>
						Resta sulla pagina
					</Button>
					<Button
						className="h-10 min-w-32 rounded-xl text-sm"
						onClick={handleConfirmLeave}
						type="button"
						variant="destructive"
					>
						Esci senza salvare
					</Button>
				</div>
			</>
		);
	}

	// Stati di caricamento/autenticazione coerenti con le altre pagine protette.
	if (!(isLoaded && user)) {
		return <Loader />;
	}
	if (loading) {
		return <Loader />;
	}
	if (error || !client) {
		return (
			<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
				<div className="relative flex w-full flex-col gap-4.5">
					<div className="flex items-center justify-start gap-2.5">
						<Link
							aria-label="Torna alla lista clienti"
							className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							href={"/clienti" as Parameters<typeof Link>[0]["href"]}
						>
							<IconUTurnToLeft
								aria-hidden
								className="size-5 shrink-0"
								size={20}
							/>
						</Link>
					</div>
				</div>
				<div className="table-container-bg flex min-h-0 flex-1 flex-col overflow-auto rounded-t-3xl px-5.5 pt-6.25">
					<p className="text-destructive text-sm" role="alert">
						{error ?? "Cliente non trovato"}
					</p>
				</div>
			</main>
		);
	}

	return (
		<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
			{/* Header: pulsante back + titolo a sinistra; azioni Annulla/Salva a destra (stesso pattern pagine trattative). */}
			<div className="relative flex w-full flex-col gap-4.5">
				<div className="flex items-center justify-between gap-2.5">
					<div className="flex min-w-0 flex-1 items-center justify-start gap-1">
						<button
							aria-label="Torna alla lista clienti"
							className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							onClick={handleBackClick}
							type="button"
						>
							<IconUTurnToLeft
								aria-hidden
								className="size-5 shrink-0"
								size={20}
							/>
						</button>
						<h1
							className="min-w-0 truncate font-medium text-card-foreground text-xl tracking-tight"
							id="update-client-title"
						>
							Aggiorna cliente{" "}
							{client.ragione_sociale ?? `#${client.id.toString()}`}
						</h1>
					</div>
					{/* Azioni nel header: appaiono solo quando il form è sporco (o in submit) per
					    ridurre il rumore visivo e allinearsi al comportamento delle trattative. */}
					<div
						aria-hidden={!(isDirty || isSubmitting)}
						className={
							isDirty || isSubmitting
								? "flex shrink-0 scale-100 items-center justify-center gap-2.5 opacity-100 transition-[opacity,transform] duration-200 ease-out"
								: "pointer-events-none flex shrink-0 scale-[0.98] items-center justify-center gap-2.5 opacity-0 transition-[opacity,transform] duration-200 ease-out"
						}
					>
						{isSubmitting ? (
							<span className="inline-flex h-10 min-w-26 cursor-not-allowed items-center justify-center rounded-xl border border-border bg-secondary font-medium text-secondary-foreground text-sm opacity-50">
								Annulla
							</span>
						) : (
							<button
								className="inline-flex h-10 min-w-26 items-center justify-center rounded-xl border border-border bg-secondary font-medium text-secondary-foreground text-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								onClick={() => setResetTrigger((value) => value + 1)}
								tabIndex={isDirty ? 0 : -1}
								type="button"
							>
								Annulla
							</button>
						)}
						<Button
							className="h-10 min-w-26 rounded-xl text-sm"
							disabled={isSubmitting}
							form={UPDATE_CLIENT_FORM_ID}
							tabIndex={isDirty || isSubmitting ? 0 : -1}
							type="submit"
						>
							{isSubmitting ? "Salvataggio…" : "Salva"}
						</Button>
					</div>
				</div>
			</div>

			{/* Dialog/Dawn "Modifiche non salvate": Vaul Drawer su mobile, Base UI Dialog su desktop. */}
			{leaveDialogLayoutReady &&
				(leaveDialogIsDesktop ? (
					<Dialog.Root
						disablePointerDismissal={false}
						onOpenChange={setIsLeaveDialogOpen}
						open={isLeaveDialogOpen}
					>
						<Dialog.Portal>
							<Dialog.Backdrop
								aria-hidden
								className="data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/50 data-closed:animate-out data-open:animate-in"
							/>
							<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
								<Dialog.Popup
									aria-describedby="client-leave-without-save-desc"
									aria-labelledby="client-leave-without-save-title"
									className="data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-card px-6 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.55)] outline-none data-closed:animate-out data-open:animate-in"
								>
									<Dialog.Title
										className="sr-only"
										id="client-leave-without-save-title"
									>
										Modifiche non salvate
									</Dialog.Title>
									<p className="sr-only" id="client-leave-without-save-desc">
										Conferma se vuoi uscire dalla pagina cliente senza salvare
										le modifiche effettuate.
									</p>
									<div className="overflow-y-auto">
										{renderLeaveDialogContent(
											<Dialog.Close
												aria-label="Chiudi"
												className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform focus:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
											>
												<X aria-hidden className="size-4" />
											</Dialog.Close>
										)}
									</div>
								</Dialog.Popup>
							</div>
						</Dialog.Portal>
					</Dialog.Root>
				) : (
					<Drawer.Root
						onOpenChange={setIsLeaveDialogOpen}
						open={isLeaveDialogOpen}
					>
						<Drawer.Portal>
							<Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
							<Drawer.Content className="fixed inset-x-[10px] bottom-[10px] z-50 flex max-h-[90vh] flex-col rounded-[36px] bg-card px-6 py-5 text-card-foreground outline-none drop-shadow-[0_18px_45px_rgba(15,23,42,0.55)]">
								<Drawer.Title className="sr-only">
									Modifiche non salvate
								</Drawer.Title>
								<Drawer.Description className="sr-only">
									Conferma se vuoi uscire dalla pagina cliente senza salvare le
									modifiche effettuate.
								</Drawer.Description>
								<div className="mx-auto mt-0.5 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />
								<div className="min-h-0 flex-1 overflow-y-auto pt-2">
									{renderLeaveDialogContent(
										<button
											aria-label="Chiudi"
											className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform focus:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
											onClick={() => setIsLeaveDialogOpen(false)}
											type="button"
										>
											<X aria-hidden className="size-4" />
										</button>
									)}
								</div>
							</Drawer.Content>
						</Drawer.Portal>
					</Drawer.Root>
				))}

			{/* Corpo: shell table-container-bg condivisa con le liste, form cliente all'interno con scroll. */}
			<div className="table-container-bg flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-t-3xl px-5.5 pt-6.25 pb-6.25">
				<UpdateClientForm
					client={client}
					onDirtyChange={setIsDirty}
					onSubmittingChange={setIsSubmitting}
					onSuccess={handleSuccess}
					resetTrigger={resetTrigger}
				/>
			</div>
		</main>
	);
}
