"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { changePassword } from "@/lib/api/client";
import { useAuth, useAuthOptional } from "@/lib/auth/auth-context";

/**
 * Forced first-login password change page.
 * Accessible only when primo_accesso = true.
 * After success, updates auth state and redirects to /.
 */
export default function ChangePasswordPage() {
	const router = useRouter();
	const auth = useAuthOptional();
	const { setUser } = useAuth();

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const mustChange =
		auth?.isLoaded &&
		auth.user &&
		(auth.user.primo_accesso === true || auth.user.primo_accesso === 1);

	useEffect(() => {
		if (!auth?.isLoaded) return;
		// Not logged in → login
		if (!auth.user) {
			router.replace("/login");
			return;
		}
		// Already changed password → dashboard
		if (!mustChange) {
			router.replace("/");
		}
	}, [auth?.isLoaded, auth?.user, mustChange, router]);

	if (!(auth?.isLoaded && auth.user && mustChange)) return null;

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		if (newPassword.length < 8) {
			setError("La nuova password deve essere di almeno 8 caratteri.");
			return;
		}
		if (newPassword !== confirmPassword) {
			setError("Le password non coincidono.");
			return;
		}

		if (!auth?.token) return;
		setSubmitting(true);

		const res = await changePassword(auth.token, {
			current_password: currentPassword,
			new_password: newPassword,
			new_password_confirmation: confirmPassword,
		});

		setSubmitting(false);

		if ("error" in res) {
			setError(res.error);
			return;
		}

		// Update local auth state so primo_accesso is cleared
		if (auth.user) {
			setUser({ ...auth.user, primo_accesso: false });
		}
		router.replace("/");
	}

	const inputClass =
		"w-full rounded-2xl bg-input px-3.75 py-3.25 leading-none transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

	return (
		<main className="relative flex min-h-svh w-full items-center justify-center bg-center bg-cover md:justify-end">
			{/* Background */}
			<div
				aria-hidden
				className="absolute inset-0 z-0 bg-center bg-cover bg-no-repeat"
				style={{ backgroundImage: "url(/images/image.jpg)" }}
			/>

			{/* Logo */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="absolute top-6 left-6 isolate z-10"
				initial={{ opacity: 0, y: -10 }}
				transition={{ duration: 0.4, ease: "easeOut" }}
			>
				<Image
					alt="Logo Tracta Business"
					className="h-16 w-auto object-contain md:h-20"
					height={160}
					priority
					src="/images/Logo_Tracta.png"
					width={480}
				/>
			</motion.div>

			{/* Panel */}
			<motion.div
				animate={{ opacity: 1, x: 0 }}
				className="relative isolate z-10 m-2.5 flex h-[calc(100vh-1.25rem)] w-full flex-col items-center justify-center overflow-hidden rounded-3xl bg-card font-medium shadow-lg md:w-1/2"
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
						<h1 className="font-semibold text-4xl leading-none">
							Cambia password
						</h1>
						<p className="font-normal text-muted-foreground text-sm">
							Per continuare devi impostare una nuova password per il tuo
							account.
						</p>
					</motion.header>

					<motion.form
						animate={{ opacity: 1 }}
						className="space-y-3"
						initial={{ opacity: 0 }}
						onSubmit={handleSubmit}
						transition={{ duration: 0.2, delay: 0.4 }}
					>
						<div>
							<label className="sr-only" htmlFor="current_password">
								Password attuale
							</label>
							<input
								autoComplete="current-password"
								className={inputClass}
								id="current_password"
								onChange={(e) => setCurrentPassword(e.target.value)}
								placeholder="Password attuale"
								required
								type="password"
								value={currentPassword}
							/>
						</div>

						<div>
							<label className="sr-only" htmlFor="new_password">
								Nuova password
							</label>
							<input
								autoComplete="new-password"
								className={inputClass}
								id="new_password"
								onChange={(e) => setNewPassword(e.target.value)}
								placeholder="Nuova password (min. 8 caratteri)"
								required
								type="password"
								value={newPassword}
							/>
						</div>

						<div>
							<label className="sr-only" htmlFor="confirm_password">
								Conferma nuova password
							</label>
							<input
								autoComplete="new-password"
								className={inputClass}
								id="confirm_password"
								onChange={(e) => setConfirmPassword(e.target.value)}
								placeholder="Conferma nuova password"
								required
								type="password"
								value={confirmPassword}
							/>
						</div>

						<AnimatePresence mode="wait">
							{error && (
								<motion.p
									animate={{ opacity: 1, height: "auto" }}
									className="overflow-hidden text-center text-destructive text-sm"
									exit={{ opacity: 0, height: 0 }}
									initial={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.2 }}
								>
									{error}
								</motion.p>
							)}
						</AnimatePresence>

						<motion.button
							className="flex w-full cursor-pointer items-center justify-center rounded-2xl bg-primary px-4 py-2.75 font-medium text-primary-foreground transition-opacity duration-300 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={
								submitting ||
								!currentPassword ||
								!newPassword ||
								!confirmPassword
							}
							style={{ willChange: "transform" }}
							transition={{ duration: 0.2 }}
							type="submit"
							whileHover={{ scale: 1.01 }}
							whileTap={{ scale: 0.98 }}
						>
							<div className="flex h-5 items-center justify-center">
								<AnimatePresence initial={false} mode="wait">
									{submitting ? (
										<motion.div
											animate={{ opacity: 1, scale: 1 }}
											exit={{ opacity: 0, scale: 0.8 }}
											initial={{ opacity: 0, scale: 0.8 }}
											key="spinner"
											transition={{ duration: 0.2 }}
										>
											<Spinner className="text-primary-foreground" size="sm" />
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
											Imposta nuova password
										</motion.span>
									)}
								</AnimatePresence>
							</div>
						</motion.button>
					</motion.form>
				</div>
			</motion.div>
		</main>
	);
}
