"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { IconChartBarTrendUp, IconPinFill18 } from "@/components/icons";
import Loader from "@/components/loader";
import { NegotiationsMapWithFilters } from "@/components/negotiations-map";
import { SpancoDonutChart } from "@/components/spanco-donut-chart";
import { StatisticheMonthlyCharts } from "@/components/statistiche-monthly-charts";
import { Spinner } from "@/components/ui/spinner";
import {
	downloadNegotiationsExportMap,
	getNegotiationsSpancoStatistics,
} from "@/lib/api/client";
import type { NegotiationsMapFilters, SpancoStatistics } from "@/lib/api/types";
import { useAuthOptional } from "@/lib/auth/auth-context";
import { EXPORT_ACTION_PILL_BUTTON_CLASS } from "@/lib/export-action-pill-button-class";

/**
 * Statistiche page — mappa con filtri, grafici mensili, donut SPANCO.
 * Solo Direttore Vendite e Venditore. Admin riceve redirect a dashboard.
 */
export default function StatistichePage() {
	const auth = useAuthOptional();
	const router = useRouter();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (auth?.isLoaded && !auth?.user) {
			router.replace("/login");
			return;
		}
		// Admin non ha accesso: redirect a dashboard (stesso pattern di Team).
		if (auth?.isLoaded && auth?.role === "admin") {
			router.replace("/dashboard");
		}
	}, [auth?.isLoaded, auth?.user, auth?.role, router]);

	// SPANCO: stesso endpoint e componente della dashboard.
	const [spancoStats, setSpancoStats] = useState<SpancoStatistics | null>(null);
	const [spancoError, setSpancoError] = useState<string | null>(null);
	const [isSpancoLoading, setIsSpancoLoading] = useState(false);

	useEffect(() => {
		if (!auth?.token) {
			setSpancoStats(null);
			setSpancoError(null);
			setIsSpancoLoading(false);
			return;
		}
		let cancelled = false;
		setIsSpancoLoading(true);
		setSpancoError(null);
		getNegotiationsSpancoStatistics(auth.token).then((result) => {
			if (cancelled) {
				return;
			}
			if ("error" in result) {
				setSpancoStats(null);
				setSpancoError(result.error);
			} else {
				setSpancoStats(result.data);
				setSpancoError(null);
			}
			setIsSpancoLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [auth?.token]);

	const [mapExportFilters, setMapExportFilters] = useState<
		NegotiationsMapFilters | undefined
	>();
	const [isMapExporting, setIsMapExporting] = useState(false);

	const handleExportStatisticheMap = useCallback(async () => {
		if (!auth?.token) {
			return;
		}
		setIsMapExporting(true);
		const result = await downloadNegotiationsExportMap(
			auth.token,
			mapExportFilters
		);
		setIsMapExporting(false);
		if ("error" in result) {
			toast.error(result.error);
			return;
		}
		toast.success("Download mappa avviato");
	}, [auth?.token, mapExportFilters]);

	if (!mounted) {
		return <Loader />;
	}
	if (!auth?.isLoaded) {
		return <Loader />;
	}
	if (!auth?.user) {
		return null; // Redirecting to login
	}
	if (auth?.role === "admin") {
		return null; // Redirecting to dashboard
	}

	return (
		<main
			className="m-2.5 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto rounded-3xl bg-card px-5 pt-6 pb-10 font-medium sm:px-9"
			data-statistiche
			id="tour-statistiche-shell"
		>
			{/* Header: titolo + Esporta Mappa sulla stessa riga da sm+ (come Team / Crea team).
			    Titolo leggermente piu grande con scala rem (rispetta le preferenze font-size globali). */}
			<div className="relative flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4.5">
				<h1 className="flex items-center justify-center gap-3.5 text-card-foreground text-xl sm:justify-start">
					{/* Stessa scala delle icone Esporta (size-4) sulla stessa pagina. */}
					<IconChartBarTrendUp aria-hidden className="size-4 shrink-0" />
					<span>Statistiche</span>
				</h1>
				<div className="flex items-center justify-center sm:justify-end">
					<button
						aria-busy={isMapExporting}
						className={EXPORT_ACTION_PILL_BUTTON_CLASS}
						disabled={!auth.token || isMapExporting}
						id="tour-statistiche-export-map"
						onClick={handleExportStatisticheMap}
						type="button"
					>
						{isMapExporting ? (
							<Spinner className="shrink-0 text-card-foreground" size="sm" />
						) : (
							<IconPinFill18 className="size-4 shrink-0 text-button-secondary" />
						)}
						Esporta Mappa
					</button>
				</div>
			</div>

			{/* Row 1: Mappa con filtri. Mobile: filtri sopra + mappa; sm+: overlay, altezza fissa. */}
			<section
				aria-label="Mappa trattative con filtri"
				className="flex w-full flex-col gap-4"
				id="tour-statistiche-map"
			>
				<div className="relative min-h-0 min-w-0 sm:h-[440px] md:h-[520px]">
					<NegotiationsMapWithFilters
						onActiveFiltersChange={setMapExportFilters}
					/>
				</div>
			</section>

			{/* Row 2: Grafici mensili — padding-top separa i controlli (anno / PDF) dalla mappa e li avvicina alle card sotto. */}
			<section
				aria-label="Grafici mensili trattative"
				className="flex w-full flex-col gap-4 pt-6 sm:pt-8"
				id="tour-statistiche-monthly"
			>
				<StatisticheMonthlyCharts
					accessToken={auth.token ?? null}
					showPersonalPdfExport
				/>
			</section>

			{/* Row 3: Donut SPANCO sotto i grafici mensili */}
			<section
				aria-label="Distribuzione delle trattative per stato SPANCO"
				className="flex w-full flex-col gap-4"
				id="tour-statistiche-spanco"
			>
				<SpancoDonutChart
					error={spancoError}
					isLoading={isSpancoLoading}
					stats={spancoStats}
				/>
			</section>
		</main>
	);
}
