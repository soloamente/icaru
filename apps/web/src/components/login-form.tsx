"use client";

import { useForm } from "@tanstack/react-form";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { login as apiLogin } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";

import { ForgotPasswordDialog } from "./forgot-password-dialog";
import { Spinner } from "./ui/spinner";

/** Login form: email + password, submits to Laravel POST /login, then redirects and stores auth. */
export default function LoginForm() {
	const router = useRouter();
	const { login: setAuth } = useAuth();
	const [serverError, setServerError] = useState<string | null>(null);
	const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			setServerError(null);
			const result = await apiLogin(value.email, value.password);

			if ("error" in result) {
				setServerError(result.error);
				return;
			}

			const { access_token, user } = result.data;
			setAuth(access_token, user);

			// Redirect after login; role-based content is handled on the home/dashboard page
			const redirectTo =
				typeof window !== "undefined"
					? new URLSearchParams(window.location.search).get("redirect")
					: null;
			// Use root path; typed routes require a known route (redirectTo from query is untrusted)
			router.push((redirectTo ?? "/") as "/");
			router.refresh();
		},
		validators: {
			onSubmit: z.object({
				email: z
					.string()
					.min(1, "L'email è obbligatoria")
					.email("Email non valida"),
				password: z.string().min(1, "La password è obbligatoria"),
			}),
		},
	});

	return (
		<motion.div
			animate={{ opacity: 1 }}
			className="mx-auto w-full max-w-sm"
			exit={{ opacity: 0 }}
			initial={{ opacity: 0 }}
			key="login-form"
			transition={{ duration: 0.2 }}
		>
			<form
				className="space-y-3"
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<div>
					<form.Field
						name="email"
						validators={{
							onChange: z
								.string()
								.min(1, "L'email è obbligatoria")
								.email("Email non valida"),
						}}
					>
						{(field) => (
							<div>
								<label className="sr-only" htmlFor={field.name}>
									Email
								</label>
								<motion.input
									autoComplete="email"
									className="w-full rounded-2xl bg-background px-3.75 py-3.25 leading-none transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										field.handleChange(e.target.value)
									}
									placeholder="Email"
									style={{ willChange: "transform" }}
									transition={{ duration: 0.2 }}
									type="email"
									value={field.state.value}
									whileFocus={{ scale: 1.01 }}
								/>
								<AnimatePresence mode="wait">
									{field.state.meta.errors.length > 0 && (
										<motion.div
											animate={{ opacity: 1, height: "auto", marginTop: 4 }}
											className="overflow-hidden"
											exit={{ opacity: 0, height: 0, marginTop: 0 }}
											initial={{ opacity: 0, height: 0, marginTop: 0 }}
											transition={{ duration: 0.2 }}
										>
											<motion.p
												animate={{ opacity: 1 }}
												className="text-destructive text-sm"
												exit={{ opacity: 0 }}
												initial={{ opacity: 0 }}
												transition={{ duration: 0.15 }}
											>
												{field.state.meta.errors[0]?.message}
											</motion.p>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						)}
					</form.Field>
				</div>

				<div>
					<form.Field
						name="password"
						validators={{
							onChange: z.string().min(1, "La password è obbligatoria"),
						}}
					>
						{(field) => (
							<div>
								<label className="sr-only" htmlFor={field.name}>
									Password
								</label>
								<motion.input
									autoComplete="current-password"
									className="w-full rounded-2xl bg-background px-3.75 py-3.25 leading-none transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										field.handleChange(e.target.value)
									}
									placeholder="Password"
									style={{ willChange: "transform" }}
									transition={{ duration: 0.2 }}
									type="password"
									value={field.state.value}
									whileFocus={{ scale: 1.01 }}
								/>
								<AnimatePresence mode="wait">
									{field.state.meta.errors.length > 0 && (
										<motion.div
											animate={{ opacity: 1, height: "auto", marginTop: 4 }}
											className="overflow-hidden"
											exit={{ opacity: 0, height: 0, marginTop: 0 }}
											initial={{ opacity: 0, height: 0, marginTop: 0 }}
											transition={{ duration: 0.2 }}
										>
											<motion.p
												animate={{ opacity: 1 }}
												className="text-destructive text-sm"
												exit={{ opacity: 0 }}
												initial={{ opacity: 0 }}
												transition={{ duration: 0.15 }}
											>
												{field.state.meta.errors[0]?.message}
											</motion.p>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						)}
					</form.Field>
				</div>

				<AnimatePresence mode="wait">
					{serverError && (
						<motion.div
							animate={{ opacity: 1, height: "auto", marginTop: 4 }}
							className="overflow-hidden"
							exit={{ opacity: 0, height: 0, marginTop: 0 }}
							initial={{ opacity: 0, height: 0, marginTop: 0 }}
							transition={{ duration: 0.2 }}
						>
							<motion.p
								animate={{ opacity: 1 }}
								className="text-center text-destructive text-sm"
								exit={{ opacity: 0 }}
								initial={{ opacity: 0 }}
								transition={{ duration: 0.15 }}
							>
								{serverError}
							</motion.p>
						</motion.div>
					)}
				</AnimatePresence>

				<form.Subscribe>
					{(state) => {
						const isEmailEmpty =
							!state.values.email || state.values.email.trim() === "";
						const isPasswordEmpty =
							!state.values.password || state.values.password.trim() === "";
						const isDisabled =
							state.isSubmitting || isEmailEmpty || isPasswordEmpty;

						return (
							<>
								<motion.button
									className="flex w-full cursor-pointer items-center justify-center rounded-2xl bg-primary px-4 py-2.75 font-medium text-primary-foreground transition-opacity duration-300 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
									disabled={isDisabled}
									style={{ willChange: "transform" }}
									transition={{ duration: 0.2 }}
									type="submit"
									whileHover={isDisabled ? undefined : { scale: 1.01 }}
									whileTap={isDisabled ? undefined : { scale: 0.98 }}
								>
									<div className="flex h-5 items-center justify-center">
										<AnimatePresence initial={false} mode="wait">
											{state.isSubmitting ? (
												<motion.div
													animate={{ opacity: 1, scale: 1 }}
													className="flex items-center justify-center"
													exit={{ opacity: 0, scale: 0.8 }}
													initial={{ opacity: 0, scale: 0.8 }}
													key="spinner"
													transition={{ duration: 0.2 }}
												>
													<Spinner
														className="text-primary-foreground"
														size="sm"
													/>
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
													Accedi
												</motion.span>
											)}
										</AnimatePresence>
									</div>
								</motion.button>

								{/* Link per aprire il flusso di "Password dimenticata?" */}
								<div className="flex justify-end pt-2">
									<button
										className="text-muted-foreground text-xs underline-offset-2 hover:text-foreground hover:underline"
										onClick={() => setIsForgotPasswordOpen(true)}
										type="button"
									>
										Password dimenticata?
									</button>
								</div>
							</>
						);
					}}
				</form.Subscribe>
			</form>

			{/* Dialog per la richiesta di reset password (forgot password). */}
			<ForgotPasswordDialog
				initialEmail={form.state.values.email}
				onOpenChange={setIsForgotPasswordOpen}
				open={isForgotPasswordOpen}
			/>
		</motion.div>
	);
}
