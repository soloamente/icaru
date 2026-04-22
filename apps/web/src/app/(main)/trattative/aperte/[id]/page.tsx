"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "vaul";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { IconUTurnToLeft } from "@/components/icons";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import UpdateNegotiationForm, {
	UPDATE_NEGOTIATION_FORM_ID,
} from "@/components/update-negotiation-form";
import { deleteNegotiation, getNegotiation } from "@/lib/api/client";
import type { ApiNegotiation } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { DELETE_TINT_BUTTON_CLASSNAME } from "@/lib/delete-action-button-class";
import { STATO_LABELS } from "@/lib/trattative-utils";
import { registerUnsavedNavigationListener } from "@/lib/unsaved-navigation";

/**
 * Edit page for an open negotiation (trattative aperte).
 * Route: /trattative/aperte/[id]
 */
export default function TrattativeAperteEditPage() {
	const router = useRouter();
	const params = useParams();
	const { token, isLoaded, user } = useAuth();
	const id =
		typeof params.id === "string" ? Number.parseInt(params.id, 10) : Number.NaN;
	const [negotiation, setNegotiation] = useState<ApiNegotiation | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isDirty, setIsDirty] = useState(false);
	// Track whether the "leave without saving" confirmation dialog is open.
	const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
	// Layout flags for the leave dialog: use Vaul Drawer on mobile, Base UI Dialog on desktop.
	const [leaveDialogLayoutReady, setLeaveDialogLayoutReady] = useState(false);
	const [leaveDialogIsDesktop, setLeaveDialogIsDesktop] = useState(false);
	// When navigation is requested from outside (e.g. Sidebar), we store the target
	// here so that the confirmation dialog can decide dove andare dopo la conferma.
	const [pendingHref, setPendingHref] = useState<string | null>(null);
	const [resetTrigger, setResetTrigger] = useState(0);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isDeletingNegotiation, setIsDeletingNegotiation] = useState(false);

	const fetchNegotiation = useCallback(async () => {
		if (!token || Number.isNaN(id)) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		const result = await getNegotiation(token, id);
		setLoading(false);
		if ("error" in result) {
			setError(result.error);
			setNegotiation(null);
			return;
		}
		setNegotiation(result.data);
	}, [token, id]);

	useEffect(() => {
		if (isLoaded && !user) {
			router.replace("/login");
		}
	}, [isLoaded, user, router]);

	useEffect(() => {
		// Silently ignore fetch errors; error state is shown in UI
		fetchNegotiation().catch(() => undefined);
	}, [fetchNegotiation]);

	// Detect layout for the leave confirmation: align breakpoint with other drawers/dialogs (768px).
	// This ensures we use a Vaul Drawer on phone-sized viewports and a centered dialog on desktop.
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

	const handleSuccess = useCallback((updated: ApiNegotiation) => {
		// Stay on the edit page after save; update local state so the form and header reflect saved data
		setNegotiation(updated);
	}, []);

	const backHref = "/trattative/aperte";

	/**
	 * Dopo conferma, DELETE /api/negotiations/{id} e redirect alla lista nello
	 * stesso stato (aperte / concluse / abbandonate).
	 */
	const handleDeleteNegotiation = useCallback(async () => {
		if (!token || Number.isNaN(id)) {
			return;
		}
		setIsDeletingNegotiation(true);
		const result = await deleteNegotiation(token, id);
		setIsDeletingNegotiation(false);
		if ("error" in result) {
			toast.error(result.error);
			return;
		}
		toast.success("Trattativa eliminata");
		setIsDeleteDialogOpen(false);
		// biome-ignore lint/suspicious/noExplicitAny: vedi nota in handleConfirmLeave
		router.push(backHref as any);
		// backHref è costante per questa route; id/token/router determinano l'handler.
	}, [id, router, token]);

	// When the user confirms they want to leave without saving, close the dialog and navigate back.
	const handleConfirmLeave = useCallback(() => {
		const targetHref = pendingHref ?? backHref;
		setIsLeaveDialogOpen(false);
		setPendingHref(null);
		// Cast a string path to the router's expected Route type; in pratica
		// usiamo sempre percorsi interni noti ("/trattative/...").
		// biome-ignore lint/suspicious/noExplicitAny: bridge tra RouteImpl e string literal
		router.push(targetHref as any);
	}, [backHref, pendingHref, router]);

	// Handle click on the "Torna indietro" button:
	// - if there are unsaved changes and we are not currently submitting, show confirmation
	// - otherwise, navigate back immediately.
	const handleBackClick = useCallback(() => {
		if (isDirty && !isSubmitting) {
			// Back button uses the default list path; pendingHref resta null qui.
			setIsLeaveDialogOpen(true);
			return;
		}
		// biome-ignore lint/suspicious/noExplicitAny: vedi nota in handleConfirmLeave
		router.push(backHref as any);
	}, [backHref, isDirty, isSubmitting, router]);

	// Allow global navigation triggers (e.g. Sidebar nav links) to reuse the same
	// "Modifiche non salvate" UX. When una pagina registra questo listener:
	// - se il form è sporco: apre il dialog e salva l'href richiesto in pendingHref
	// - se non è sporco: esegue subito la navigazione.
	useEffect(() => {
		const unregister = registerUnsavedNavigationListener(({ href }) => {
			if (isDirty && !isSubmitting) {
				setPendingHref(href);
				setIsLeaveDialogOpen(true);
				return true;
			}
			// biome-ignore lint/suspicious/noExplicitAny: vedi nota in handleConfirmLeave
			router.push(href as any);
			return true;
		});
		return unregister;
	}, [isDirty, isSubmitting, router]);

	// Shared content for the "leave without saving" dialog, used by both Drawer (mobile)
	// and Dialog (desktop) so the experience is visually consistent with "Aggiungi cliente".
	function renderLeaveDialogContent(closeButton: ReactNode) {
		return (
			<>
				<div className="flex items-center justify-between gap-3 pb-6">
					{/* Use card-foreground so the dialog title is readable across themes and color schemes. */}
					<h2 className="font-bold text-2xl text-card-foreground tracking-tight">
						Modifiche non salvate
					</h2>
					{closeButton}
				</div>
				<p className="text-muted-foreground text-sm">
					Hai apportato modifiche a questa trattativa che non sono ancora state
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

	if (!(isLoaded && user)) {
		return <Loader />;
	}
	if (loading) {
		return <Loader />;
	}
	if (error || !negotiation) {
		return (
			<main className="m-1 flex flex-1 flex-col gap-2 overflow-hidden rounded-3xl bg-card px-3 pt-4 font-medium sm:m-2.5 sm:gap-2.5 sm:px-9 sm:pt-6">
				<div className="relative flex w-full flex-col gap-4.5">
					<div className="flex items-center justify-start gap-2.5">
						<Link
							aria-label={`Torna a ${STATO_LABELS.aperte}`}
							className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							href={"/trattative/aperte" as Parameters<typeof Link>[0]["href"]}
						>
							<IconUTurnToLeft
								aria-hidden
								className="size-5 shrink-0"
								size={20}
							/>
						</Link>
					</div>
				</div>
				{/* Padding interno ridotto su mobile per dare più spazio al form (stesso pattern dettaglio cliente). */}
				<div className="table-container-bg flex min-h-0 flex-1 flex-col overflow-auto rounded-t-3xl px-2.5 pt-3 sm:px-5.5 sm:pt-6.25">
					<p className="text-destructive text-sm" role="alert">
						{error ?? "Trattativa non trovata"}
					</p>
				</div>
			</main>
		);
	}

	return (
		<main className="m-1 flex flex-1 flex-col gap-2 overflow-hidden rounded-3xl bg-card px-3 pt-4 font-medium sm:m-2.5 sm:gap-2.5 sm:px-9 sm:pt-6">
			{/* Header: stesso indietro+titolo su tutti i viewport; su md+ anche Elimina/Annulla/Salva a destra. Su mobile stessa riga azioni sotto al form (form con `md:hidden` sulla riga). */}
			<div className="relative flex w-full flex-col gap-4.5">
				<div className="flex items-center justify-between gap-2.5">
					<div className="flex w-full min-w-0 flex-1 items-center justify-start gap-1">
						<button
							aria-label={`Torna a ${STATO_LABELS.aperte}`}
							className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
							className="w-full min-w-0 truncate font-medium text-card-foreground text-xl tracking-tight"
							id="update-negotiation-title"
						>
							Aggiorna trattativa di{" "}
							{negotiation.client?.ragione_sociale ??
								`Cliente #${negotiation.client_id}`}
						</h1>
					</div>
					<div className="hidden shrink-0 items-center justify-end gap-2.5 md:flex">
						<Button
							className={DELETE_TINT_BUTTON_CLASSNAME}
							disabled={isSubmitting}
							onClick={() => setIsDeleteDialogOpen(true)}
							type="button"
							variant="destructive"
						>
							Elimina
						</Button>
						<div
							aria-hidden={!(isDirty || isSubmitting)}
							className={
								isDirty || isSubmitting
									? "flex shrink-0 items-center justify-center gap-2.5"
									: "hidden"
							}
						>
							{isSubmitting ? (
								<span className="inline-flex h-10 min-w-26 cursor-not-allowed items-center justify-center rounded-xl border border-border bg-secondary font-medium text-secondary-foreground text-sm opacity-50">
									Annulla
								</span>
							) : (
								<button
									className="inline-flex h-10 min-w-26 items-center justify-center rounded-xl border border-border bg-secondary font-medium text-secondary-foreground text-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									onClick={() => setResetTrigger((c) => c + 1)}
									type="button"
								>
									Annulla
								</button>
							)}
							<Button
								className="h-10 min-w-26 rounded-xl text-sm"
								disabled={isSubmitting}
								form={UPDATE_NEGOTIATION_FORM_ID}
								type="submit"
							>
								{isSubmitting ? "Salvataggio…" : "Salva"}
							</Button>
						</div>
					</div>
				</div>
			</div>
			{/* Leave-without-saving confirmation: Vaul Drawer on mobile, Base UI Dialog on desktop. */}
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
									aria-describedby="leave-without-save-desc"
									aria-labelledby="leave-without-save-title"
									className="data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-card px-6 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.55)] outline-none data-closed:animate-out data-open:animate-in"
								>
									<Dialog.Title
										className="sr-only"
										id="leave-without-save-title"
									>
										Modifiche non salvate
									</Dialog.Title>
									<p className="sr-only" id="leave-without-save-desc">
										Conferma se vuoi uscire dalla pagina senza salvare le
										modifiche della trattativa.
									</p>
									<div className="overflow-y-auto">
										{renderLeaveDialogContent(
											<Dialog.Close
												aria-label="Chiudi"
												className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-table-header text-card-foreground transition-transform hover:bg-table-hover focus:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
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
									Conferma se vuoi uscire dalla pagina senza salvare le
									modifiche della trattativa.
								</Drawer.Description>
								<div className="mx-auto mt-0.5 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />
								<div className="min-h-0 flex-1 overflow-y-auto pt-2">
									{renderLeaveDialogContent(
										<button
											aria-label="Chiudi"
											className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-table-header text-card-foreground transition-transform hover:bg-table-hover focus:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
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

			<ConfirmActionDialog
				confirmLabel="Elimina trattativa"
				description="L'operazione non può essere annullata. Verrà eliminata definitivamente questa trattativa e i riferimenti collegati lato server."
				isConfirming={isDeletingNegotiation}
				onConfirm={handleDeleteNegotiation}
				onOpenChange={setIsDeleteDialogOpen}
				open={isDeleteDialogOpen}
				title="Eliminare questa trattativa?"
			/>
			{/* Corpo: form scrollabile; riga azioni in coda solo su viewport stretto (md:hidden sulla riga). Desktop: azioni nell’header. */}
			<div className="table-container-bg flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-t-3xl px-2.5 pt-3 pb-3 sm:px-5.5 sm:pt-6.25 sm:pb-6.25">
				<UpdateNegotiationForm
					actionsVisibleOnlyWhenDirty
					footerActionRowClassName="md:hidden"
					footerStartSlot={
						<Button
							className={DELETE_TINT_BUTTON_CLASSNAME}
							disabled={isSubmitting}
							onClick={() => setIsDeleteDialogOpen(true)}
							type="button"
							variant="destructive"
						>
							Elimina
						</Button>
					}
					negotiation={negotiation}
					onAnnullaDiscard={() => setResetTrigger((c) => c + 1)}
					onDirtyChange={setIsDirty}
					onFilesUploaded={fetchNegotiation}
					onSubmittingChange={setIsSubmitting}
					onSuccess={handleSuccess}
					resetTrigger={resetTrigger}
					stato="aperte"
				/>
			</div>
		</main>
	);
}
