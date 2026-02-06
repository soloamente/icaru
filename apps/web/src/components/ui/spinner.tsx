"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface SpinnerProps {
	size?: "sm" | "md" | "lg";
	className?: string;
}

const sizeClasses = {
	sm: "size-4",
	md: "size-6",
	lg: "size-8",
};

/** Loading spinner using lucide Loader2, for buttons and inline states. */
export function Spinner({ size = "sm", className }: SpinnerProps) {
	return (
		<Loader2
			aria-hidden
			className={cn("animate-spin", sizeClasses[size], className)}
		/>
	);
}
