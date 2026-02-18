"use client";

import { type ReactNode, useMemo } from "react";
import {
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	type TooltipProps,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { SpancoStage, SpancoStatistics } from "@/lib/api/types";

interface SpancoDonutChartProps {
	/** Statistiche SPANCO restituite dall'API, una entry per lettera. */
	stats: SpancoStatistics | null;
	/** Flag di caricamento per mostrare uno stato di loading chiaro all'utente. */
	isLoading: boolean;
	/** Eventuale errore restituito dall'API o dalla rete. */
	error: string | null;
}

interface SpancoChartDatum {
	stage: SpancoStage;
	label: string;
	value: number;
	color: string;
}

/**
 * Colori SPANCO allineati alle pill della tabella trattative (trattative-table.tsx:
 * SPANCO_STAGE_COLORS). Stesso ordine e stessi valori main per coerenza visiva.
 */
const SPANCO_CHART_COLORS: Record<SpancoStage, string> = {
	S: "oklch(0.5575 0.0165 244.89)", // Suspect
	P: "oklch(0.6994 0.1754 51.79)", // Prospect
	A: "oklch(0.8114 0.1654 84.92)", // Approach
	N: "oklch(0.5782 0.2282 260.03)", // Negotiation
	C: "oklch(0.5915 0.202 21.24)", // Closing
	O: "oklch(0.5315 0.1179 157.23)", // Order
};

/**
 * Configurazione statica per ogni lettera SPANCO:
 * - label in italiano (legenda e tooltip)
 * - colore uguale a quello delle pill spanco in tabella e form.
 */
const STAGE_CONFIG: { stage: SpancoStage; label: string; color: string }[] = [
	{ stage: "S", label: "Sospetto", color: SPANCO_CHART_COLORS.S },
	{ stage: "P", label: "Prospetto", color: SPANCO_CHART_COLORS.P },
	{ stage: "A", label: "Approccio", color: SPANCO_CHART_COLORS.A },
	{ stage: "N", label: "Negoziazione", color: SPANCO_CHART_COLORS.N },
	{ stage: "C", label: "Chiusura", color: SPANCO_CHART_COLORS.C },
	{ stage: "O", label: "Ordine", color: SPANCO_CHART_COLORS.O },
];

function buildChartData(stats: SpancoStatistics | null): SpancoChartDatum[] {
	if (!stats) {
		return [];
	}

	// Normalizziamo l'oggetto in un array ordinato secondo STAGE_CONFIG.
	return STAGE_CONFIG.map((config) => ({
		stage: config.stage,
		label: config.label,
		value: stats[config.stage] ?? 0,
		color: config.color,
	})).filter((item) => item.value > 0);
}

function computeTotal(stats: SpancoStatistics | null): number {
	if (!stats) {
		return 0;
	}
	return Object.values(stats).reduce(
		(accumulator: number, value: number | undefined) =>
			accumulator + (value ?? 0),
		0
	);
}

// Estendiamo esplicitamente i props del Tooltip di Recharts per includere `payload`.
// In alcune versioni di `recharts` il tipo generato non dichiara `payload`,
// ma a runtime viene comunque passato dal grafico: modelliamo quindi la forma reale.
type SpancoTooltipProps = TooltipProps<number, string> & {
	payload?: {
		payload: SpancoChartDatum;
		value?: number | string;
	}[];
};

/**
 * Tooltip personalizzato per il grafico SPANCO.
 *
 * Mostra:
 * - lettera e label in italiano (es. "S · Sospetto")
 * - numero di trattative per quello stato.
 */
function SpancoTooltip({
	active,
	payload,
}: SpancoTooltipProps): ReactNode | null {
	if (!(active && payload && payload.length > 0)) {
		return null;
	}

	// Il payload[0] contiene i dati del segmento attualmente hoverato.
	const entry = payload[0];
	const datum = entry.payload as SpancoChartDatum;
	const value = (entry.value as number | undefined) ?? datum.value;

	return (
		<div className="rounded-md bg-card px-3 py-2 text-xs shadow-lg ring-1 ring-border">
			<div className="flex items-center gap-2">
				<span
					aria-hidden="true"
					className="inline-block size-2.5 rounded-full"
					style={{ backgroundColor: datum.color }}
				/>
				<span className="font-medium text-foreground">
					{datum.stage} · {datum.label}
				</span>
			</div>
			<p className="mt-1 text-muted-foreground">
				{value} trattativa{value === 1 ? "" : "e"}
			</p>
		</div>
	);
}

/** Fixed height used by both skeleton and chart so layout doesn't shift. */
const CHART_CONTAINER_CLASS =
	"relative h-[360px] w-full max-w-[580px] sm:h-[440px] sm:max-w-[660px] md:h-[520px] md:max-w-[760px]";

/**
 * Donut chart skeleton: same dimensions as the real chart.
 * Rendered from first paint (before hydration/auth) so it appears immediately with card skeletons.
 */
export function SpancoDonutChartSkeleton(): ReactNode {
	return (
		<section
			aria-busy="true"
			aria-label="Distribuzione delle trattative per stato SPANCO"
			className="flex w-full flex-col items-center justify-center py-6"
		>
			<div className={CHART_CONTAINER_CLASS}>
				<div className="flex h-full flex-col items-center justify-center">
					<div className="relative size-[min(100%,--spacing(80))] min-h-[280px] min-w-[280px] sm:min-h-[340px] sm:min-w-[340px] md:min-h-[400px] md:min-w-[400px]">
						<Skeleton className="absolute inset-0 rounded-full" />
						<div className="absolute inset-[18%] rounded-full bg-background" />
						<div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
							<Skeleton className="h-14 w-16" />
							<Skeleton className="h-4 w-28" />
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

/** Grafico SPANCO ad anello grande, simile all'esempio fornito nella richiesta. */
export function SpancoDonutChart({
	stats,
	isLoading,
	error,
}: SpancoDonutChartProps): ReactNode {
	const chartData = useMemo(() => buildChartData(stats), [stats]);
	const total = useMemo(() => computeTotal(stats), [stats]);

	// Show skeleton when explicitly loading OR when we have no data and no error yet
	// (avoids delay on reload: chart mounts with stats=null, isLoading still false until effect runs).
	const showSkeleton = isLoading || (stats === null && error === null);

	if (showSkeleton) {
		return <SpancoDonutChartSkeleton />;
	}

	if (error) {
		return (
			<section
				aria-label="Distribuzione delle trattative per stato SPANCO"
				className="flex w-full flex-col items-center justify-center py-6"
			>
				<div className={CHART_CONTAINER_CLASS}>
					<div className="flex h-full items-center justify-center">
						<p className="max-w-md text-center text-destructive text-sm">
							Impossibile caricare le statistiche SPANCO: {error}
						</p>
					</div>
				</div>
			</section>
		);
	}

	if (!stats || total === 0 || chartData.length === 0) {
		return (
			<section
				aria-label="Distribuzione delle trattative per stato SPANCO"
				className="flex w-full flex-col items-center justify-center py-6"
			>
				<div className={CHART_CONTAINER_CLASS}>
					<div className="flex h-full items-center justify-center">
						<p className="text-muted-foreground text-sm">
							Nessuna trattativa attiva da mostrare nel grafico SPANCO.
						</p>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section
			aria-label="Distribuzione delle trattative per stato SPANCO"
			className="flex w-full flex-col items-center justify-center py-6"
		>
			{/* Same fixed dimensions as loading/error so cards below don't move. */}
			<div
				className={`${CHART_CONTAINER_CLASS} [&_*:focus]:outline-none [&_*:focus]:ring-0`}
			>
				<ResponsiveContainer height="100%" width="100%">
					<PieChart>
						{/* Tooltip flottante che segue il puntatore quando si passa sopra ai segmenti. */}
						<Tooltip
							// Disable position animation so the tooltip doesn't "fly" from (0,0)
							// when hovering a different sector; it appears directly at the cursor.
							animationDuration={0}
							// Cursor trasparente: evitiamo l'overlay grigio di default e lasciamo
							// solo il tooltip personalizzato.
							content={<SpancoTooltip />}
							cursor={{ fill: "transparent" }}
						/>
						<Pie
							cornerRadius={999}
							data={chartData}
							dataKey="value"
							innerRadius="75%"
							isAnimationActive
							nameKey="stage"
							outerRadius="95%"
							paddingAngle={10}
							stroke="var(--background)"
							strokeWidth={6}
						>
							{chartData.map((entry) => (
								<Cell
									// Cursor help sui segmenti che mostrano il tooltip all’hover.
									className="cursor-help"
									// Usiamo stage come chiave stabile per evitare warning React.
									fill={entry.color}
									key={entry.stage}
								/>
							))}
						</Pie>
					</PieChart>
				</ResponsiveContainer>

				{/* Centrale: totale più grande e label "Trattative attive" più leggibile.
				    Usa text-card-foreground così in dataweb light (sfondo card chiaro) il testo
				    resta scuro e leggibile; in dataweb dark il testo resta chiaro. */}
				<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
					<span className="font-semibold text-5xl text-card-foreground sm:text-6xl md:text-7xl">
						{total}
					</span>
					<span className="mt-1.5 text-muted-foreground text-sm sm:text-base md:text-lg">
						Trattative attive
					</span>
				</div>
			</div>

			{/* Legenda: tutti gli stadi SPANCO con colore, label e conteggio per leggibilità e accessibilità. */}
			<ul
				aria-label="Stati SPANCO"
				className="mt-4 flex w-full max-w-[580px] flex-wrap justify-center gap-x-6 gap-y-2 sm:max-w-[660px] md:max-w-[760px]"
			>
				{STAGE_CONFIG.map(({ stage, label, color }) => {
					const count = stats?.[stage] ?? 0;
					return (
						<li
							className="flex items-center gap-2 text-card-foreground text-sm"
							key={stage}
						>
							<span
								aria-hidden
								className="inline-block size-3 shrink-0 rounded-full"
								style={{ backgroundColor: color }}
							/>
							<span>
								{stage} · {label}
							</span>
							<span className="text-muted-foreground tabular-nums">
								({count})
							</span>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
