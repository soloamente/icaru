"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ClientsTable from "@/components/clients-table";
import Loader from "@/components/loader";
import { useAuthOptional } from "@/lib/auth/auth-context";

/**
 * Clienti page - shows clients table.
 * Sellers see only own clients; Directors see all company clients.
 * Requires authentication; redirects to login if not logged in.
 */
export default function ClientiPage() {
	const auth = useAuthOptional();
	const router = useRouter();
	// Avoid hydration mismatch: auth is restored from localStorage in AuthProvider's
	// useEffect, so server and first client paint differ. Show Loader until mounted.
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
		return null; // Redirecting to login
	}
	return <ClientsTable />;
}
