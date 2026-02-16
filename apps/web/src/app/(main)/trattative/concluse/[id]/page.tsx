"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import UpdateNegotiationForm, {
	UPDATE_NEGOTIATION_FORM_ID,
} from "@/components/update-negotiation-form";
import { getNegotiation } from "@/lib/api/client";
import type { ApiNegotiation } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import {
	getNegotiationStatoSegment,
	STATO_LABELS,
} from "@/lib/trattative-utils";

/**
 * Edit page for a concluded negotiation (trattative concluse).
 * Route: /trattative/concluse/[id]
 */
export default function TrattativeConcluseEditPage() {
	const router = useRouter();
	const params = useParams();
	const { token, isLoaded, user } = useAuth();
	const id =
		typeof params.id === "string" ? Number.parseInt(params.id, 10) : Number.NaN;
	const [negotiation, setNegotiation] = useState<ApiNegotiation | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isDirty, setIsDirty] = useState(false);

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

	if (!(isLoaded && user)) {
		return <Loader />;
	}
	if (loading) {
		return <Loader />;
	}
	if (error || !negotiation) {
		return (
			<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
				<div className="relative flex w-full flex-col gap-4.5">
					<div className="flex items-center justify-start gap-2.5">
						<Link
							aria-label={`Torna a ${STATO_LABELS.concluse}`}
							className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							href={
								"/trattative/concluse" as Parameters<typeof Link>[0]["href"]
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

	const backHref = "/trattative/concluse" as Parameters<typeof Link>[0]["href"];

	return (
		<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
			{/* Header: back + title on left, Annulla + Salva on right (same line as list page "Aggiungi") */}
			<div className="relative flex w-full flex-col gap-4.5">
				<div className="flex items-center justify-between gap-2.5">
					<div className="flex min-w-0 flex-1 items-center justify-start gap-2.5">
						<Link
							aria-label={`Torna a ${STATO_LABELS.concluse}`}
							className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							href={backHref}
						>
							<ChevronLeft aria-hidden className="size-5 shrink-0" />
						</Link>
						<h1
							className="min-w-0 truncate font-medium text-foreground text-xl tracking-tight"
							id="update-negotiation-title"
						>
							Aggiorna trattativa di{" "}
							{negotiation.client?.ragione_sociale ??
								`Cliente #${negotiation.client_id}`}
						</h1>
					</div>
					{/* Actions appear only when form is dirty or submitting; they hide again when the user reverts all edits to initial values. Minimal smooth animation (per interface-craft). */}
					<div
						aria-hidden={!(isDirty || isSubmitting)}
						className={
							isDirty || isSubmitting
								? "flex shrink-0 scale-100 items-center justify-center gap-2.5 opacity-100 transition-[opacity,transform] duration-200 ease-out"
								: "pointer-events-none flex shrink-0 scale-[0.98] items-center justify-center gap-2.5 opacity-0 transition-[opacity,transform] duration-200 ease-out"
						}
					>
						{isSubmitting ? (
							<span className="inline-flex h-10 min-w-26 cursor-not-allowed items-center justify-center rounded-xl border border-border bg-background font-medium text-sm opacity-50">
								Annulla
							</span>
						) : (
							<Link
								className="inline-flex h-10 min-w-26 items-center justify-center rounded-xl border border-border bg-background font-medium text-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								href={backHref}
								tabIndex={isDirty ? 0 : -1}
							>
								Annulla
							</Link>
						)}
						<Button
							className="h-10 min-w-26 rounded-xl text-sm"
							disabled={isSubmitting}
							form={UPDATE_NEGOTIATION_FORM_ID}
							tabIndex={isDirty || isSubmitting ? 0 : -1}
							type="submit"
						>
							{isSubmitting ? "Salvataggio…" : "Salva"}
						</Button>
					</div>
				</div>
			</div>
			{/* Inner body: table-container-bg takes all remaining space (like list page); form fills and scrolls inside. */}
			<div className="table-container-bg flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-t-3xl px-5.5 pt-6.25 pb-6.25">
				<UpdateNegotiationForm
					negotiation={negotiation}
					onDirtyChange={setIsDirty}
					onFilesUploaded={fetchNegotiation}
					onSubmittingChange={setIsSubmitting}
					onSuccess={handleSuccess}
					renderActionsInHeader
					stato="concluse"
				/>
			</div>
		</main>
	);
}
