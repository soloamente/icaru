"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Loader from "@/components/loader";
import TrattativeTable from "@/components/trattative-table";
import { useAuthOptional } from "@/lib/auth/auth-context";

/**
 * Trattative aperte - shows only active negotiations
 * (non concluse e non abbandonate).
 * Requires authentication; redirects to login if not logged in.
 */
export default function TrattativeApertePage() {
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
	return <TrattativeTable filter="aperte" />;
}
