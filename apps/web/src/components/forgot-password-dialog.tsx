"use client";

import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion } from "motion/react";
import { type FormEvent, useState } from "react";
import { Drawer } from "vaul";
import { z } from "zod";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { requestPasswordReset } from "@/lib/api/client";

import { Spinner } from "./ui/spinner";

interface ForgotPasswordDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Email eventualmente già digitata nel form di login, usata per precompilare il campo. */
	initialEmail?: string;
}

/** Schema di validazione per l'email della procedura "Password dimenticata". */
const forgotPasswordSchema = z.object({
	email: z.string().min(1, "L'email è obbligatoria").email("Email non valida"),
});

/**
 * Dialog / bottom sheet "Password dimenticata?".
 *
 * - Chiede l'email dell'utente.
 * - Chiama POST /forgot-password tramite `requestPasswordReset`.
 * - Gestisce il caso di rate limit (429) mostrando un messaggio esplicito.
 * - Su mobile usa un Drawer (Vaul), su desktop un Dialog (Base UI), mantenendo lo stesso contenuto.
 */
export function ForgotPasswordDialog({
	open,
	onOpenChange,
	initialEmail,
}: ForgotPasswordDialogProps) {
	const isMobile = useIsMobile();

	// Stato interno del form (email + feedback utente)
	const [email, setEmail] = useState(initialEmail ?? "");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	/** Gestisce l'invio del form di "password dimenticata". */
	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		event.stopPropagation();

		setError(null);
		setSuccess(null);

		// Validazione lato client per fornire feedback immediato
		const result = forgotPasswordSchema.safeParse({ email });
		if (!result.success) {
			const firstError =
				result.error.issues[0]?.message ?? "Email non valida o mancante.";
			setError(firstError);
			return;
		}

		setIsSubmitting(true);
		const response = await requestPasswordReset(result.data.email.trim());
		setIsSubmitting(false);

		if (!response.ok) {
			// Caso specifico: rate limit superato (429 Too Many Requests)
			if ("rateLimited" in response && response.rateLimited) {
				setError(
					response.error ||
						"Troppe richieste di reset. Attendi qualche minuto prima di riprovare."
				);
				return;
			}

			setError(
				response.error ||
					"Si è verificato un errore durante l'invio del link di reset."
			);
			return;
		}

		setSuccess(
			response.message ||
				"Se l'email è presente nei nostri sistemi, ti abbiamo inviato un link per reimpostare la password."
		);
	};

	/** Contenuto riutilizzato sia dal Dialog desktop che dal Drawer mobile. */
	const content = (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className="w-full max-w-md"
			initial={{ opacity: 0, y: 8 }}
			transition={{ duration: 0.2 }}
		>
			<header className="mb-4">
				<h2 className="font-semibold text-foreground text-lg">
					Password dimenticata?
				</h2>
				<p className="mt-1 text-muted-foreground text-sm">
					Inserisci la tua email: ti invieremo un link per reimpostare la
					password, se l&apos;indirizzo è presente nei nostri sistemi.
				</p>
			</header>

			<form className="space-y-4" onSubmit={handleSubmit}>
				<div>
					<label
						className="mb-1 block font-medium text-foreground text-sm"
						htmlFor="forgot-password-email"
					>
						Email
					</label>
					<motion.input
						autoComplete="email"
						className="w-full rounded-2xl bg-background px-3.75 py-3.25 leading-none transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						id="forgot-password-email"
						name="email"
						onChange={(event) => setEmail(event.target.value)}
						placeholder="nome@azienda.it"
						type="email"
						value={email}
						whileFocus={{ scale: 1.01 }}
					/>
				</div>

				<AnimatePresence mode="wait">
					{error && (
						<motion.p
							animate={{ opacity: 1 }}
							className="text-destructive text-sm"
							exit={{ opacity: 0 }}
							initial={{ opacity: 0 }}
							transition={{ duration: 0.15 }}
						>
							{error}
						</motion.p>
					)}
					{!error && success && (
						<motion.p
							animate={{ opacity: 1 }}
							className="text-emerald-500 text-sm"
							exit={{ opacity: 0 }}
							initial={{ opacity: 0 }}
							transition={{ duration: 0.15 }}
						>
							{success}
						</motion.p>
					)}
				</AnimatePresence>

				<div className="flex justify-end gap-2 pt-2">
					<button
						className="rounded-xl border border-border px-3.5 py-2 font-medium text-foreground text-sm transition-colors hover:bg-muted"
						onClick={() => onOpenChange(false)}
						type="button"
					>
						Annulla
					</button>
					<button
						className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3.5 py-2 font-medium text-primary-foreground text-sm transition-opacity hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={isSubmitting}
						type="submit"
					>
						{isSubmitting ? (
							<>
								<Spinner className="text-primary-foreground" size="sm" />
								<span>Invio in corso...</span>
							</>
						) : (
							<span>Invia link</span>
						)}
					</button>
				</div>
			</form>
		</motion.div>
	);

	if (isMobile) {
		return (
			<Drawer.Root onOpenChange={onOpenChange} open={open}>
				<Drawer.Portal>
					<Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
					<Drawer.Content className="fixed right-0 bottom-0 left-0 z-50 flex max-h-[90vh] flex-col rounded-t-xl bg-card text-card-foreground outline-none">
						<div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />
						<div className="overflow-y-auto p-6 pb-8">{content}</div>
					</Drawer.Content>
				</Drawer.Portal>
			</Drawer.Root>
		);
	}

	return (
		<Dialog.Root
			disablePointerDismissal={false}
			onOpenChange={onOpenChange}
			open={open}
		>
			<Dialog.Portal>
				<Dialog.Backdrop
					aria-hidden
					className="data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/50 data-closed:animate-out data-open:animate-in"
				/>
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<Dialog.Popup
						aria-describedby="forgot-password-dialog-desc"
						aria-labelledby="forgot-password-dialog-title"
						className="data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95 w-full max-w-lg overflow-hidden rounded-3xl bg-card text-card-foreground shadow-lg outline-none duration-200 data-closed:animate-out data-open:animate-in"
					>
						<div className="max-h-[85vh] overflow-y-auto p-6">
							<h2 className="sr-only" id="forgot-password-dialog-title">
								Password dimenticata
							</h2>
							<p className="sr-only" id="forgot-password-dialog-desc">
								Inserisci la tua email per ricevere un link di reset della
								password.
							</p>
							{content}
						</div>
					</Dialog.Popup>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
