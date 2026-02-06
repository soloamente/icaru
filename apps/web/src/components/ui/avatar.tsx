"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const WHITESPACE_REGEX = /\s+/;

/**
 * Avatar container - rounded circle for user profile images.
 */
function Avatar({
	className,
	children,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			className={cn(
				"inline-flex size-8 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-muted align-middle font-medium text-xs",
				className
			)}
			{...props}
		>
			{children}
		</span>
	);
}

interface AvatarFallbackProps {
	children?: ReactNode;
	/** Used to derive initials when children not provided (e.g. user name or email). */
	placeholderSeed?: string;
	className?: string;
}

/**
 * Fallback content when no image - shows initials from placeholderSeed or children.
 */
function AvatarFallback({
	children,
	placeholderSeed,
	className,
}: AvatarFallbackProps) {
	const display =
		children ?? (placeholderSeed ? getInitials(placeholderSeed) : null);

	return (
		<span
			className={cn(
				"flex size-full items-center justify-center rounded-full text-muted-foreground",
				className
			)}
		>
			{display ?? "?"}
		</span>
	);
}

/** Derive 1–2 letter initials from a string (name or email). */
function getInitials(seed: string): string {
	const s = seed.trim();
	if (!s) {
		return "?";
	}
	// If it looks like an email, use first letter of local part
	const at = s.indexOf("@");
	if (at > 0) {
		return (s[0] ?? "?").toUpperCase();
	}
	// Otherwise use first letters of first two "words"
	const parts = s.split(WHITESPACE_REGEX).filter(Boolean);
	if (parts.length >= 2) {
		const a = parts[0]?.[0] ?? "";
		const b = parts[1]?.[0] ?? "";
		return (a + b).toUpperCase().slice(0, 2);
	}
	return s.slice(0, 2).toUpperCase();
}

export { Avatar, AvatarFallback };
