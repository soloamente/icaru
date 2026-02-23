"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import LoginForm from "@/components/login-form";
import { useAuthOptional } from "@/lib/auth/auth-context";

/** Background media to cycle through (images + video from public/images) */
const BACKGROUND_ITEMS = [
	"/images/image.jpg",
	"/images/image2.jpg",
	"/images/image3.jpg",
	"/images/image4.jpg",
	"/images/image5.jpg",
	"/images/image6.jpg",
	"/images/video1.mp4",
] as const;

/** Interval in ms between background media changes */
const BACKGROUND_INTERVAL_MS = 5000;

/**
 * Login page: full-bleed background, logo top-left, right panel with form.
 * Background cycles through images and video1.mp4 from public/images at full brightness.
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

	// Cycle through background media (images + video)
	useEffect(() => {
		const id = setInterval(() => {
			setBgIndex((prev) => (prev + 1) % BACKGROUND_ITEMS.length);
		}, BACKGROUND_INTERVAL_MS);
		return () => clearInterval(id);
	}, []);

	// Ref map for video elements to control play/pause when cycling
	const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

	// Play active video and pause others when bgIndex changes
	useEffect(() => {
		const src = BACKGROUND_ITEMS[bgIndex];
		const isVideo = src.endsWith(".mp4");
		videoRefs.current.forEach((video, i) => {
			if (i === bgIndex && isVideo) {
				video.play().catch(() => {
					// Autoplay may be blocked; ignore
				});
			} else {
				video.pause();
				video.currentTime = 0;
			}
		});
	}, [bgIndex]);

	if (auth?.isLoaded && auth?.user) {
		return null; // Redirecting
	}

	return (
		<main
			aria-label="Pagina di login"
			className="relative flex min-h-svh w-full items-center justify-center gap-2 bg-center bg-cover transition-all duration-500 md:justify-end"
		>
			{/* Cycling background media (images + video) at full brightness */}
			<div aria-hidden className="absolute inset-0 z-0 bg-center bg-cover">
				{BACKGROUND_ITEMS.map((src, i) => {
					const isVideo = src.endsWith(".mp4");
					const isActive = i === bgIndex;

					if (isVideo) {
						return (
							<video
								aria-hidden
								className="absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000"
								key={src}
								loop
								muted
								playsInline
								ref={(el) => {
									if (el) videoRefs.current.set(i, el);
								}}
								src={src}
								style={{
									opacity: isActive ? 1 : 0,
									zIndex: isActive ? 1 : 0,
								}}
							/>
						);
					}

					return (
						<div
							className="absolute inset-0 bg-center bg-cover bg-no-repeat transition-opacity duration-1000"
							key={src}
							style={{
								backgroundImage: `url(${src})`,
								opacity: isActive ? 1 : 0,
								zIndex: isActive ? 1 : 0,
							}}
						/>
					);
				})}
			</div>
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
				className="relative z-10 m-2.5 flex h-[calc(100vh-1.25rem)] w-full flex-col items-center justify-center overflow-hidden rounded-3xl bg-card font-medium shadow-lg md:w-1/2"
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
