"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Loader from "@/components/loader";

/**
 * Trattative index - redirects to "Tutte" (all) as default view.
 */
export default function TrattativePage() {
	const router = useRouter();
	useEffect(() => {
		router.replace("/trattative/tutte");
	}, [router]);
	// While we redirect to the default "Tutte" view, center the loader in the
	// available viewport area so the UI feels stable and balanced.
	return (
		<main className="flex min-h-screen items-center justify-center">
			<Loader />
		</main>
	);
}
