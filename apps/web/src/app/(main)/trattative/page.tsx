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
	return <Loader />;
}
