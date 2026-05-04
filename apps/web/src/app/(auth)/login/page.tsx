"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import LoginForm from "@/components/login-form";
import { useAuthOptional } from "@/lib/auth/auth-context";

/** Background images to cycle through on the login page */
const BACKGROUND_ITEMS = [
	"/images/image.jpg",
	"/images/image2.png",
	"/images/image3.jpg",
	"/images/image4.jpg",
	"/images/image5.jpg",
	"/images/image6.jpg",
] as const;

/** Interval in ms between background image changes */
const BACKGROUND_INTERVAL_MS = 5000;

/**
 * Login page: full-bleed background (carousel immagini in public/images). Loghi su mobile centrati
 * in alto (`left-1/2 -translate-x-1/2`); da md in alto a sinistra. Pannello form a destra su md.
 * If already logged in, redirects to home.
 */
export default function LoginPage() {
	const router = useRouter();
	const auth = useAuthOptional();
	const [bgIndex, setBgIndex] = useState(0);

	// If already logged in, redirect to home
	useEffect(() => {
		if (auth?.isLoaded && auth?.user) {
			router.replace("/");
		}
	}, [auth?.isLoaded, auth?.user, router]);

	// Cycle through background images
	useEffect(() => {
		const id = setInterval(() => {
			setBgIndex((prev) => (prev + 1) % BACKGROUND_ITEMS.length);
		}, BACKGROUND_INTERVAL_MS);
		return () => clearInterval(id);
	}, []);

	if (auth?.isLoaded && auth?.user) {
		return null; // Redirecting
	}

	return (
		<main
			aria-label="Pagina di login"
			className="relative flex min-h-svh w-full items-center justify-center gap-2 bg-center bg-cover md:justify-end"
		>
			{/* Cycling background images. On mobile: instant swap (no transition) to avoid panel/input opacity glitches during crossfade. */}
			<div
				aria-hidden
				className="absolute inset-0 isolate z-0 overflow-hidden bg-center bg-cover"
				style={{ contain: "paint" }}
			>
				{[bgIndex, (bgIndex + 1) % BACKGROUND_ITEMS.length].map((i) => {
					const src = BACKGROUND_ITEMS[i];
					const isActive = i === bgIndex;
					return (
						<div
							className="absolute inset-0 bg-center bg-cover bg-no-repeat transition-opacity duration-1000 max-md:transition-none"
							key={`${i}-${src}`}
							style={{
								backgroundImage: `url(${src})`,
								opacity: isActive ? 1 : 0,
								zIndex: isActive ? 1 : 0,
							}}
						/>
					);
				})}
			</div>
			{/* Loghi: mobile centrati in orizzontale (translate); desktop alto-sinistra. */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="absolute isolate flex max-w-[calc(100vw-3rem)] flex-wrap items-center gap-4 max-md:pointer-events-none max-md:top-14 max-md:right-auto max-md:left-1/2 max-md:z-30 max-md:-translate-x-1/2 max-md:justify-center md:pointer-events-auto md:top-6 md:right-auto md:left-6 md:z-10 md:translate-x-0 md:justify-start md:gap-6"
				initial={{ opacity: 0, y: -10 }}
				transition={{ duration: 0.4, ease: "easeOut" }}
			>
				<Image
					alt="Logo Tracta Business"
					className="h-16 w-auto shrink-0 object-contain md:h-20"
					height={160}
					priority
					src="/images/Logo_Tracta.png"
					width={480}
				/>
				<Image
					alt="Logo DataWeb Group"
					className="h-16 w-auto shrink-0 object-contain md:h-20"
					height={160}
					priority
					src="/images/logo_positivo.png"
					width={300}
				/>
			</motion.div>

			{/* Right panel with login form. isolate prevents background crossfade from affecting panel compositing on mobile. */}
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
							Benvenuto su Tracta B
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
