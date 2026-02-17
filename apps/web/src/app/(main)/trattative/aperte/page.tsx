"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Loader from "@/components/loader";
import TrattativeTable from "@/components/trattative-table";
import { useAuthOptional } from "@/lib/auth/auth-context";

/**
 * Trattative aperte - shows only active negotiations
 * (non concluse e non abbandonate).
 * Requires authentication; redirects to login if not logged in.
 *
 * URL params new_negotiation=1 and client_id=X (from cmdk "Clienti senza trattative"):
 * opens "Nuova trattativa" modal with client pre-selected, then clears URL.
 */
export default function TrattativeApertePage() {
	const auth = useAuthOptional();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [mounted, setMounted] = useState(false);

	// Parse URL params for "open new negotiation with client pre-selected" (cmdk flow)
	const { openCreateDialogInitially, initialClientId } = useMemo(() => {
		const newNeg = searchParams.get("new_negotiation") === "1";
		const clientIdStr = searchParams.get("client_id");
		const clientId =
			clientIdStr != null ? Number.parseInt(clientIdStr, 10) : Number.NaN;
		const validClientId =
			Number.isInteger(clientId) && clientId > 0 ? clientId : undefined;
		return {
			openCreateDialogInitially: newNeg && validClientId != null,
			initialClientId: validClientId,
		};
	}, [searchParams]);

	// Clear URL params after passing to TrattativeTable so refresh doesn't re-open dialog
	useEffect(() => {
		if (openCreateDialogInitially && initialClientId != null) {
			router.replace("/trattative/aperte");
		}
	}, [openCreateDialogInitially, initialClientId, router]);

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
	return (
		<TrattativeTable
			filter="aperte"
			initialClientIdForNewNegotiation={initialClientId}
			openCreateDialogInitially={openCreateDialogInitially}
		/>
	);
}
