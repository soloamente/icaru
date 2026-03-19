"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconChartBarTrendUp } from "@/components/icons";
import Loader from "@/components/loader";
import { NegotiationsMapWithFilters } from "@/components/negotiations-map";
import { SpancoDonutChart } from "@/components/spanco-donut-chart";
import { StatisticheMonthlyCharts } from "@/components/statistiche-monthly-charts";
import { getNegotiationsSpancoStatistics } from "@/lib/api/client";
import type { SpancoStatistics } from "@/lib/api/types";
import { useAuthOptional } from "@/lib/auth/auth-context";

/**
 * Statistiche page — grafici mensili, SPANCO e mappa con filtri.
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
		>
			{/* Header */}
			<div className="relative flex w-full flex-col gap-4.5">
				<div className="flex items-center justify-between gap-2.5">
					<h1 className="flex items-center gap-3.5">
						<IconChartBarTrendUp aria-hidden size={24} />
						<span>Statistiche</span>
					</h1>
				</div>
			</div>

			{/* Row 1: Donut SPANCO in cima */}
			<section
				aria-label="Distribuzione delle trattative per stato SPANCO"
				className="flex w-full flex-col gap-4"
			>
				<SpancoDonutChart
					error={spancoError}
					isLoading={isSpancoLoading}
					stats={spancoStats}
				/>
			</section>

			{/* Row 2: Grafici mensili — due bar chart in card affiancati */}
			<section
				aria-label="Grafici mensili trattative"
				className="flex w-full flex-col gap-4"
			>
				<StatisticheMonthlyCharts accessToken={auth.token ?? null} />
			</section>

			{/* Row 3: Mappa con filtri. Mobile: filtri sopra + mappa; sm+: overlay, altezza fissa. */}
			<section
				aria-label="Mappa trattative con filtri"
				className="flex w-full flex-col gap-4"
			>
				<div className="relative min-h-0 min-w-0 sm:h-[440px] md:h-[520px]">
					<NegotiationsMapWithFilters />
				</div>
			</section>
		</main>
	);
}
