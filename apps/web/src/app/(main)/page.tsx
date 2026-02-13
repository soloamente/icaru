"use client";

import { redirect } from "next/navigation";
import Loader from "@/components/loader";
import { useAuthOptional } from "@/lib/auth/auth-context";

/**
 * Home page - redirects users to appropriate destination.
 * After login the first page shown is always Dashboard.
 * Unauthenticated users → login.
 */
export default function Home() {
	const auth = useAuthOptional();

	// Wait for auth to load from localStorage before redirecting
	if (!auth?.isLoaded) {
		return (
			<main className="flex min-h-screen items-center justify-center">
				<Loader />
			</main>
		);
	}

	// Redirect all authenticated users to Dashboard (first page after login)
	if (auth.user && auth.role) {
		redirect("/dashboard");
	}

	// Redirect unauthenticated users to login
	redirect("/login");
}
