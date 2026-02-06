"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Loader from "@/components/loader";

/**
 * Trattative index - redirects to Trattative aperte as default view.
 */
export default function TrattativePage() {
	const router = useRouter();
	useEffect(() => {
		router.replace("/trattative/aperte");
	}, [router]);
	return <Loader />;
}
