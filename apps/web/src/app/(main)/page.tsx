"use client";

import { redirect } from "next/navigation";
import Loader from "@/components/loader";
import { useAuthOptional } from "@/lib/auth/auth-context";

/**
 * Home page - redirects users to appropriate destination
 * Operators (role === "seller") → /mie-pratiche
 * Other authenticated users → dashboard
 * Unauthenticated users → login
 */
export default function Home() {
	const auth = useAuthOptional();

	// Wait for auth to load from localStorage before redirecting
	if (!auth?.isLoaded) {
		return <Loader />;
	}

	// Redirect authenticated users based on their role
	if (auth.user && auth.role) {
		if (auth.role === "seller") {
			redirect("/trattative");
		}
		redirect("/dashboard");
	}

	// Redirect unauthenticated users to login
	redirect("/login");
}
