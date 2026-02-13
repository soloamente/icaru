"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import LoginForm from "@/components/login-form";
import { useAuthOptional } from "@/lib/auth/auth-context";

/**
 * Login page: full-bleed background, logo top-left, right panel with form.
 * Similar layout to reference; uses gradient background (no images).
 * If already logged in, redirects to home.
 */
export default function LoginPage() {
	const router = useRouter();
	const auth = useAuthOptional();

	// If already logged in, redirect to home
	useEffect(() => {
		if (auth?.isLoaded && auth?.user) {
			router.replace("/");
		}
	}, [auth?.isLoaded, auth?.user, router]);

	if (auth?.isLoaded && auth?.user) {
		return null; // Redirecting
	}

	return (
		<main
			aria-label="Pagina di login"
			className="relative flex min-h-svh w-full items-center justify-center gap-2 bg-center bg-cover bg-linear-to-br from-muted/80 via-background to-muted transition-all duration-500 md:justify-end"
		>
			{/* Logo / brand at top left */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="absolute top-6 left-6 z-10"
				initial={{ opacity: 0, y: -10 }}
				transition={{ duration: 0.4, ease: "easeOut" }}
			>
				<Image
					alt="Logo Icaru"
					className="h-16 w-auto object-contain md:h-20"
					height={80}
					priority
					src="/images/logo_positivo.png"
					width={300}
				/>
			</motion.div>

			{/* Right panel with login form */}
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
						<h1 className="font-semibold text-4xl leading-none">
							Benvenuto su Icaru
						</h1>
						<p className="font-normal text-muted-foreground text-sm">
							Inserisci le tue credenziali per accedere al tuo account
						</p>
					</motion.header>

					<LoginForm />
				</div>
			</motion.div>
		</main>
	);
}
