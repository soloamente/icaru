"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CreateTeamForm } from "@/components/create-team-form";
import Loader from "@/components/loader";
import { useAuthOptional } from "@/lib/auth/auth-context";

/**
 * Create team page — form for directors to create a new team.
 * Redirects to login if not authenticated, to /team if not director.
 */
export default function CreateTeamPage() {
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
		// Only directors can create teams
		if (auth?.isLoaded && auth?.user && auth?.role !== "director") {
			router.replace("/team");
		}
	}, [auth?.isLoaded, auth?.user, auth?.role, router]);

	if (!(mounted && auth?.isLoaded)) {
		return <Loader />;
	}
	if (!auth?.user || auth?.role !== "director") {
		return null;
	}
	return <CreateTeamForm />;
}
