"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Loader from "@/components/loader";
import UpdateNegotiationForm from "@/components/update-negotiation-form";
import { getNegotiation } from "@/lib/api/client";
import type { ApiNegotiation } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import {
	getNegotiationStatoSegment,
	STATO_LABELS,
} from "@/lib/trattative-utils";

/**
 * Edit page for an abandoned negotiation (trattative abbandonate).
 * Route: /trattative/abbandonate/[id]
 */
export default function TrattativeAbbandonateEditPage() {
	const router = useRouter();
	const params = useParams();
	const { token, isLoaded, user } = useAuth();
	const id =
		typeof params.id === "string" ? Number.parseInt(params.id, 10) : Number.NaN;
	const [negotiation, setNegotiation] = useState<ApiNegotiation | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchNegotiation = useCallback(async () => {
		if (!token || Number.isNaN(id)) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		const result = await getNegotiation(token, id);
		setLoading(false);
		if ("error" in result) {
			setError(result.error);
			setNegotiation(null);
			return;
		}
		setNegotiation(result.data);
	}, [token, id]);

	useEffect(() => {
		if (isLoaded && !user) {
			router.replace("/login");
		}
	}, [isLoaded, user, router]);

	useEffect(() => {
		// Silently ignore fetch errors; error state is shown in UI
		fetchNegotiation().catch(() => undefined);
	}, [fetchNegotiation]);

	const handleSuccess = useCallback(
		(updated: ApiNegotiation) => {
			const stato = getNegotiationStatoSegment(updated);
			router.push(`/trattative/${stato}`);
		},
		[router]
	);

	// While auth state or negotiation data are loading, keep the same shell
	// layout (card + table-container-bg) so the loader appears inside the
	// page container like the rest of the content, instead of floating on
	// a bare background. This keeps visual continuity with the listing views.
	if (!(isLoaded && user) || loading) {
		return (
			<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
				<div className="relative flex w-full flex-col gap-4.5">
					<div className="flex items-center justify-start gap-2.5">
						<Link
							aria-label={`Torna a ${STATO_LABELS.abbandonate}`}
							className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							href={
								"/trattative/abbandonate" as Parameters<typeof Link>[0]["href"]
							}
						>
							<ChevronLeft aria-hidden className="size-5 shrink-0" />
						</Link>
						<h1
							className="font-bold text-foreground text-xl tracking-tight"
							id="update-negotiation-title-loading"
						>
							Caricamento trattativa…
						</h1>
						<div className="size-8 shrink-0" />
					</div>
				</div>
				<div className="table-container-bg flex min-h-0 flex-1 flex-col items-center overflow-auto rounded-t-3xl px-5.5 pt-6.25">
					<Loader />
				</div>
			</main>
		);
	}
	if (error || !negotiation) {
		return (
			<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
				<div className="relative flex w-full flex-col gap-4.5">
					<div className="flex items-center justify-start gap-2.5">
						<Link
							aria-label={`Torna a ${STATO_LABELS.abbandonate}`}
							className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							href={
								"/trattative/abbandonate" as Parameters<typeof Link>[0]["href"]
							}
						>
							<ChevronLeft aria-hidden className="size-5 shrink-0" />
						</Link>
					</div>
				</div>
				<div className="table-container-bg flex min-h-0 flex-1 flex-col overflow-auto rounded-t-3xl px-5.5 pt-6.25">
					<p className="text-destructive text-sm" role="alert">
						{error ?? "Trattativa non trovata"}
					</p>
				</div>
			</main>
		);
	}

	return (
		<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
			<div className="relative flex w-full flex-col gap-4.5">
				<div className="flex items-center justify-start gap-2.5">
					<Link
						aria-label={`Torna a ${STATO_LABELS.abbandonate}`}
						className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						href={
							"/trattative/abbandonate" as Parameters<typeof Link>[0]["href"]
						}
					>
						<ChevronLeft aria-hidden className="size-5 shrink-0" />
					</Link>
					<h1
						className="font-bold text-foreground text-xl tracking-tight"
						id="update-negotiation-title"
					>
						Aggiorna trattativa #{negotiation.id}
					</h1>
					<div className="size-8 shrink-0" />
				</div>
			</div>
			{/* Centered form layout: constraint and balance the previously top-left-heavy design */}
			<div className="table-container-bg flex min-h-0 flex-1 flex-col items-center overflow-auto rounded-t-3xl px-5.5 pt-6.25">
				<UpdateNegotiationForm
					negotiation={negotiation}
					onSuccess={handleSuccess}
					stato="abbandonate"
				/>
			</div>
		</main>
	);
}
