"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { Spinner } from "@/components/ui/spinner";
import { type ResetPasswordBody, resetPassword } from "@/lib/api/client";

/** Schema di validazione lato client per il form di reset password. */
const resetPasswordSchema = z
	.object({
		password: z
			.string()
			.min(8, "La password deve contenere almeno 8 caratteri."),
		passwordConfirmation: z.string().min(1, "Conferma la nuova password."),
	})
	.refine((data) => data.password === data.passwordConfirmation, {
		path: ["passwordConfirmation"],
		message: "Le password non coincidono.",
	});

/**
 * Pagina `/reset-password`:
 * - legge `token` ed `email` dalla query string
 * - mostra un form per impostare la nuova password
 * - chiama POST /reset-password tramite `resetPassword`
 * - in caso di successo reindirizza l'utente alla pagina di login.
 */
export default function ResetPasswordPage() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const token = searchParams.get("token");
	const email = searchParams.get("email");

	// Stati locali del form
	const [password, setPassword] = useState("");
	const [passwordConfirmation, setPasswordConfirmation] = useState("");
	const [fieldErrors, setFieldErrors] = useState<{
		password?: string;
		passwordConfirmation?: string;
	}>({});
	const [serverError, setServerError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	/** Gestisce l'invio del form di reset password. */
	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		event.stopPropagation();

		setFieldErrors({});
		setServerError(null);
		setSuccessMessage(null);

		// Verifica preliminare: token ed email devono essere presenti nel link
		if (!(token && email)) {
			setServerError(
				"Il link di reset non è valido o è incompleto. Richiedi un nuovo link dalla pagina di login."
			);
			return;
		}

		// Validazione lato client
		const parsed = resetPasswordSchema.safeParse({
			password,
			passwordConfirmation,
		});

		if (!parsed.success) {
			const errors: {
				password?: string;
				passwordConfirmation?: string;
			} = {};

			for (const issue of parsed.error.issues) {
				const key = issue.path[0];
				if (key === "password" || key === "passwordConfirmation") {
					errors[key] = issue.message;
				}
			}

			setFieldErrors(errors);
			return;
		}

		setIsSubmitting(true);

		const payload: ResetPasswordBody = {
			token,
			email,
			password: parsed.data.password,
			passwordConfirmation: parsed.data.passwordConfirmation,
		};

		const response = await resetPassword(payload);
		setIsSubmitting(false);

		if (!response.ok) {
			// Errori di validazione dal backend (422)
			if (response.validationErrors) {
				const errorsFromBackend = response.validationErrors;
				const errors: {
					password?: string;
					passwordConfirmation?: string;
				} = {};

				if (errorsFromBackend.password?.[0]) {
					errors.password = errorsFromBackend.password[0];
				}
				if (errorsFromBackend.password_confirmation?.[0]) {
					errors.passwordConfirmation =
						errorsFromBackend.password_confirmation[0];
				}

				setFieldErrors(errors);
			}

			setServerError(
				response.error ||
					"Impossibile reimpostare la password. Verifica il link o riprova più tardi."
			);
			return;
		}

		setSuccessMessage(
			response.message ||
				"La tua password è stata reimpostata con successo. Verrai reindirizzato alla pagina di login."
		);

		// Dopo un breve delay, riportiamo l'utente al login.
		setTimeout(() => {
			router.replace("/login");
		}, 1500);
	};

	// Se token o email mancano mostriamo subito un messaggio esplicito
	const isLinkInvalid = !(token && email);

	return (
		<main
			aria-label="Pagina di reset della password"
			className="relative flex min-h-svh w-full items-center justify-center gap-2 bg-center bg-cover bg-linear-to-br from-muted/80 via-background to-muted transition-all duration-500 md:justify-end"
		>
			{/* Logo / brand in alto a sinistra per coerenza con la pagina di login */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="absolute top-6 left-6 z-10"
				initial={{ opacity: 0, y: -10 }}
				transition={{ duration: 0.4, ease: "easeOut" }}
			>
				<span className="font-semibold text-foreground text-xl">
					Compravendita
				</span>
			</motion.div>

			<motion.div
				animate={{ opacity: 1, x: 0 }}
				className="m-2.5 flex h-[calc(100vh-1.25rem)] w-full flex-col items-center justify-center overflow-hidden rounded-3xl bg-card font-medium shadow-lg md:w-1/2"
				initial={{ opacity: 0, x: 20 }}
				transition={{ duration: 0.5, ease: "easeOut" }}
			>
				<div className="flex w-full max-w-md flex-col space-y-8 p-8">
					<motion.header
						animate={{ opacity: 1, y: 0 }}
						className="flex flex-col gap-2 text-center"
						initial={{ opacity: 0, y: 10 }}
						transition={{ duration: 0.4, delay: 0.3 }}
					>
						<h1 className="font-semibold text-3xl leading-none">
							Reimposta la password
						</h1>
						<p className="font-normal text-muted-foreground text-sm">
							Scegli una nuova password per il tuo account.
						</p>
					</motion.header>

					{isLinkInvalid ? (
						<div className="space-y-4 text-center">
							<p className="text-destructive text-sm">
								Il link di reset non è valido o è scaduto. Richiedi un nuovo
								link dalla pagina di login.
							</p>
							<button
								className="mx-auto inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2.5 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
								onClick={() => router.replace("/login")}
								type="button"
							>
								Torna al login
							</button>
						</div>
					) : (
						<form className="space-y-4" onSubmit={handleSubmit}>
							{/* Campo Nuova Password */}
							<div>
								<label
									className="mb-1 block font-medium text-foreground text-sm"
									htmlFor="new-password"
								>
									Nuova password
								</label>
								<motion.input
									autoComplete="new-password"
									className="w-full rounded-2xl bg-background px-3.75 py-3.25 leading-none transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
									id="new-password"
									name="password"
									onChange={(event) => setPassword(event.target.value)}
									placeholder="Inserisci la nuova password"
									type="password"
									value={password}
									whileFocus={{ scale: 1.01 }}
								/>
								<AnimatePresence mode="wait">
									{fieldErrors.password && (
										<motion.p
											animate={{ opacity: 1 }}
											className="mt-1 text-destructive text-sm"
											exit={{ opacity: 0 }}
											initial={{ opacity: 0 }}
											transition={{ duration: 0.15 }}
										>
											{fieldErrors.password}
										</motion.p>
									)}
								</AnimatePresence>
							</div>

							{/* Campo Conferma Password */}
							<div>
								<label
									className="mb-1 block font-medium text-foreground text-sm"
									htmlFor="confirm-password"
								>
									Conferma password
								</label>
								<motion.input
									autoComplete="new-password"
									className="w-full rounded-2xl bg-background px-3.75 py-3.25 leading-none transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
									id="confirm-password"
									name="passwordConfirmation"
									onChange={(event) =>
										setPasswordConfirmation(event.target.value)
									}
									placeholder="Ripeti la nuova password"
									type="password"
									value={passwordConfirmation}
									whileFocus={{ scale: 1.01 }}
								/>
								<AnimatePresence mode="wait">
									{fieldErrors.passwordConfirmation && (
										<motion.p
											animate={{ opacity: 1 }}
											className="mt-1 text-destructive text-sm"
											exit={{ opacity: 0 }}
											initial={{ opacity: 0 }}
											transition={{ duration: 0.15 }}
										>
											{fieldErrors.passwordConfirmation}
										</motion.p>
									)}
								</AnimatePresence>
							</div>

							<AnimatePresence mode="wait">
								{serverError && (
									<motion.p
										animate={{ opacity: 1 }}
										className="text-center text-destructive text-sm"
										exit={{ opacity: 0 }}
										initial={{ opacity: 0 }}
										transition={{ duration: 0.15 }}
									>
										{serverError}
									</motion.p>
								)}
								{!serverError && successMessage && (
									<motion.p
										animate={{ opacity: 1 }}
										className="text-center text-emerald-500 text-sm"
										exit={{ opacity: 0 }}
										initial={{ opacity: 0 }}
										transition={{ duration: 0.15 }}
									>
										{successMessage}
									</motion.p>
								)}
							</AnimatePresence>

							<motion.button
								className="flex w-full cursor-pointer items-center justify-center rounded-2xl bg-primary px-4 py-2.75 font-medium text-primary-foreground transition-opacity duration-300 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={isSubmitting}
								style={{ willChange: "transform" }}
								transition={{ duration: 0.2 }}
								type="submit"
								whileHover={isSubmitting ? undefined : { scale: 1.01 }}
								whileTap={isSubmitting ? undefined : { scale: 0.98 }}
							>
								<div className="flex h-5 items-center justify-center">
									<AnimatePresence initial={false} mode="wait">
										{isSubmitting ? (
											<motion.div
												animate={{ opacity: 1, scale: 1 }}
												className="flex items-center justify-center gap-2"
												exit={{ opacity: 0, scale: 0.8 }}
												initial={{ opacity: 0, scale: 0.8 }}
												key="spinner"
												transition={{ duration: 0.2 }}
											>
												<Spinner
													className="text-primary-foreground"
													size="sm"
												/>
												<span className="leading-none">
													Salvataggio in corso...
												</span>
											</motion.div>
										) : (
											<motion.span
												animate={{ opacity: 1, scale: 1 }}
												className="leading-none"
												exit={{ opacity: 0, scale: 0.8 }}
												initial={{ opacity: 0, scale: 0.8 }}
												key="text"
												transition={{ duration: 0.2 }}
											>
												Salva nuova password
											</motion.span>
										)}
									</AnimatePresence>
								</div>
							</motion.button>
						</form>
					)}
				</div>
			</motion.div>
		</main>
	);
}
