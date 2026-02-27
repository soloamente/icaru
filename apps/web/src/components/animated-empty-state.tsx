"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — Animated Empty State
 *
 * Read top-to-bottom. Each `at` value is ms after mount.
 *
 *    0ms   mount trigger
 *  100ms   icon disc fades in, scale 0.85 → 1.0
 *  300ms   heading text fades in, slides up 8px
 *  450ms   subtitle text fades in, slides up 6px
 *  600ms   CTA button fades in, slides up 6px (optional)
 * ───────────────────────────────────────────────────────── */

const TIMING = {
	iconDisc: 100, // icon disc fades in and scales up
	heading: 300, // heading text appears
	subtitle: 450, // subtitle text appears
	cta: 600, // CTA button appears (optional)
};

/* Icon disc — smooth settle entrance */
const ICON = {
	initialScale: 0.85, // scale before appearing
	finalScale: 1.0, // resting scale
	spring: { type: "spring" as const, stiffness: 300, damping: 30 },
};

/* Text elements — balanced slide entrance */
const TEXT = {
	offsetY: 8, // px text slides up from
	spring: { type: "spring" as const, stiffness: 350, damping: 28 },
};

/* CTA button — balanced slide entrance */
const CTA = {
	offsetY: 6, // px button slides up from
	spring: { type: "spring" as const, stiffness: 350, damping: 28 },
};

interface AnimatedEmptyStateProps {
	/** Icon rendered inside the circular disc */
	icon: ReactNode;
	/** Primary heading text */
	heading: string;
	/** Secondary descriptive text */
	subtitle: string;
	/** Optional call-to-action button */
	cta?: {
		label: string;
		icon?: ReactNode;
		onClick: () => void;
	};
}

/**
 * Reusable animated empty state with a staged entrance animation.
 * Shows an icon disc, heading, subtitle, and optional CTA button
 * that fade/slide in sequentially using spring physics.
 */
export function AnimatedEmptyState({
	icon,
	heading,
	subtitle,
	cta,
}: AnimatedEmptyStateProps) {
	const [stage, setStage] = useState(0);

	useEffect(() => {
		const timers: NodeJS.Timeout[] = [];
		timers.push(setTimeout(() => setStage(1), TIMING.iconDisc));
		timers.push(setTimeout(() => setStage(2), TIMING.heading));
		timers.push(setTimeout(() => setStage(3), TIMING.subtitle));
		timers.push(setTimeout(() => setStage(4), TIMING.cta));
		return () => timers.forEach(clearTimeout);
	}, []);

	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 p-8">
			{/* Icon disc — soft circular background */}
			<motion.div
				animate={{
					opacity: stage >= 1 ? 1 : 0,
					scale: stage >= 1 ? ICON.finalScale : ICON.initialScale,
				}}
				className="mb-4 flex items-center justify-center rounded-full"
				initial={{ opacity: 0, scale: ICON.initialScale }}
				transition={ICON.spring}
			>
				{icon}
			</motion.div>

			{/* Heading */}
			<motion.p
				animate={{
					opacity: stage >= 2 ? 1 : 0,
					y: stage >= 2 ? 0 : TEXT.offsetY,
				}}
				className="text-center font-medium text-base text-foreground leading-none"
				initial={{ opacity: 0, y: TEXT.offsetY }}
				transition={TEXT.spring}
			>
				{heading}
			</motion.p>

			{/* Subtitle */}
			<motion.p
				animate={{
					opacity: stage >= 3 ? 1 : 0,
					y: stage >= 3 ? 0 : TEXT.offsetY,
				}}
				className="-mt-1 max-w-xs text-center text-sm text-stats-title"
				initial={{ opacity: 0, y: TEXT.offsetY }}
				transition={TEXT.spring}
			>
				{subtitle}
			</motion.p>

			{/* CTA — renders only when provided */}
			{cta && (
				<motion.button
					animate={{
						opacity: stage >= 4 ? 1 : 0,
						y: stage >= 4 ? 0 : CTA.offsetY,
					}}
					className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-full bg-sky-100 py-1.5 pr-3.5 pl-2.5 font-medium text-sky-800 text-sm transition-colors hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 dark:bg-sky-900/30 dark:text-sky-400 dark:hover:bg-sky-900/40"
					initial={{ opacity: 0, y: CTA.offsetY }}
					onClick={cta.onClick}
					transition={CTA.spring}
					type="button"
				>
					{cta.icon}
					<span>{cta.label}</span>
				</motion.button>
			)}
		</div>
	);
}
