"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Loader from "@/components/loader";
import TrattativeTable from "@/components/trattative-table";
import { useAuthOptional } from "@/lib/auth/auth-context";

/**
 * Trattative tutte - shows all negotiations (no status filter).
 * Requires authentication; redirects to login if not logged in.
 */
export default function TrattativeTuttePage() {
	const auth = useAuthOptional();
	const router = useRouter();
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (auth?.isLoaded && !auth?.user) {
			router.replace("/login");
		}
	}, [auth?.isLoaded, auth?.user, router]);

	if (!mounted) {
		return <Loader />;
	}
	if (!auth?.isLoaded) {
		return <Loader />;
	}
	if (!auth?.user) {
		return null;
	}
	return <TrattativeTable filter="all" />;
}
