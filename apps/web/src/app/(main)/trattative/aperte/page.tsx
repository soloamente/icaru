"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Loader from "@/components/loader";

/**
 * Legacy route: "Trattative aperte" is replaced by "Tutte".
 * Redirects to /trattative/tutte for backward compatibility.
 */
export default function TrattativeApertePage() {
	const router = useRouter();
	useEffect(() => {
		// Typed routes may not include new segments until next build; redirect is valid.
		router.replace("/trattative/tutte" as Parameters<typeof router.replace>[0]);
	}, [router]);
	return <Loader />;
}
