"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Loader from "@/components/loader";
import { TeamsView } from "@/components/teams-view";
import { useAuthOptional } from "@/lib/auth/auth-context";

/**
 * Team page — shows team list for directors, "my teams" for sellers.
 * Requires authentication; redirects to login if not logged in.
 */
export default function TeamPage() {
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

	if (!(mounted && auth?.isLoaded)) {
		return <Loader />;
	}
	if (!auth?.user) {
		return null;
	}
	return <TeamsView />;
}
