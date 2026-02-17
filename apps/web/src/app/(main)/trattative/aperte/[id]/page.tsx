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
import UpdateNegotiationForm, {
	UPDATE_NEGOTIATION_FORM_ID,
} from "@/components/update-negotiation-form";
import { getNegotiation } from "@/lib/api/client";
import type { ApiNegotiation } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
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
			<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
				<div className="relative flex w-full flex-col gap-4.5">
					<div className="flex items-center justify-start gap-2.5">
						<Link
							aria-label={`Torna a ${STATO_LABELS.aperte}`}
							className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
				<div className="table-container-bg flex min-h-0 flex-1 flex-col overflow-auto rounded-t-3xl px-5.5 pt-6.25">
					<p className="text-destructive text-sm" role="alert">
						{error ?? "Trattativa non trovata"}
					</p>
				</div>
			</main>
		);
	}

	return (
		<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
			{/* Header: back + title on left, Annulla + Salva on right (same line as list page "Aggiungi") */}
			<div className="relative flex w-full flex-col gap-4.5">
				<div className="flex items-center justify-between gap-2.5">
					<div className="flex min-w-0 flex-1 items-center justify-start gap-1">
						<button
							aria-label={`Torna a ${STATO_LABELS.aperte}`}
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
							id="update-negotiation-title"
						>
							Aggiorna trattativa di{" "}
							{negotiation.client?.ragione_sociale ??
								`Cliente #${negotiation.client_id}`}
						</h1>
					</div>
					{/* Actions appear only when form is dirty or submitting; they hide again when the user reverts all edits to initial values. Minimal smooth animation (per interface-craft). */}
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
								onClick={() => setResetTrigger((c) => c + 1)}
								tabIndex={isDirty ? 0 : -1}
								type="button"
							>
								Annulla
							</button>
						)}
						<Button
							className="h-10 min-w-26 rounded-xl text-sm"
							disabled={isSubmitting}
							form={UPDATE_NEGOTIATION_FORM_ID}
							tabIndex={isDirty || isSubmitting ? 0 : -1}
							type="submit"
						>
							{isSubmitting ? "Salvataggio…" : "Salva"}
						</Button>
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
									Conferma se vuoi uscire dalla pagina senza salvare le
									modifiche della trattativa.
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
			{/* Inner body: table-container-bg takes all remaining space (like list page); form fills and scrolls inside. */}
			<div className="table-container-bg flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-t-3xl px-5.5 pt-6.25 pb-6.25">
				<UpdateNegotiationForm
					negotiation={negotiation}
					onDirtyChange={setIsDirty}
					onFilesUploaded={fetchNegotiation}
					onSubmittingChange={setIsSubmitting}
					onSuccess={handleSuccess}
					renderActionsInHeader
					resetTrigger={resetTrigger}
					stato="aperte"
				/>
			</div>
		</main>
	);
}
