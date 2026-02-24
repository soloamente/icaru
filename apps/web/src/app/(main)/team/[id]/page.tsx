"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Loader from "@/components/loader";
import { TeamOrgChart } from "@/components/team-org-chart";
import { useAuthOptional } from "@/lib/auth/auth-context";

/**
 * Team detail page — org chart view with members, stats, and member management.
 * Only accessible to Direttore Vendite.
 */
export default function TeamDetailPage() {
	const auth = useAuthOptional();
	const router = useRouter();
	const params = useParams();
	const [mounted, setMounted] = useState(false);

	const teamId = typeof params?.id === "string" ? Number(params.id) : null;

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
	if (teamId === null || Number.isNaN(teamId)) {
		router.replace("/team");
		return null;
	}

	return <TeamOrgChart teamId={teamId} />;
}
