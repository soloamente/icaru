"use client";

import { Select } from "@base-ui/react/select";
import { ChevronDown, X } from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Bar,
	BarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";
import { Drawer } from "vaul";
import { CheckIcon, IconDesignFileDownloadFill18 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
	downloadStatisticsExportPdf,
	getNegotiationsMonthlyStatistics,
} from "@/lib/api/client";
import type {
	MonthlyNegotiationDatum,
	MonthlyNegotiationsStatistics,
} from "@/lib/api/types";
import { EXPORT_ACTION_PILL_BUTTON_CLASS } from "@/lib/export-action-pill-button-class";
import { cn } from "@/lib/utils";

/** Nomi brevi mesi in italiano per le label dell'asse X. */
const MONTH_LABELS: Record<number, string> = {
	1: "Gen",
	2: "Feb",
	3: "Mar",
	4: "Apr",
	5: "Mag",
	6: "Giu",
	7: "Lug",
	8: "Ago",
	9: "Set",
	10: "Ott",
	11: "Nov",
	12: "Dic",
};

/** Valore speciale per il selector anno: mostra dati aggregati storico. */
const STORICO_VALUE = "storico";

interface StatisticheMonthlyChartsProps {
	accessToken: string | null;
	/** Notifica il genitore (es. export PDF) quando l'anno selezionato cambia o viene impostato al primo load. */
	onSelectedYearChange?: (year: string) => void;
	/** Mostra il pulsante GET /statistics/export/pdf allineato all'anno selezionato. */
	showPersonalPdfExport?: boolean;
}

/** Formatta l'importo in EUR per tooltip e assi. */
function formatAmount(value: number): string {
	return new Intl.NumberFormat("it-IT", {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}

/** Voce serie Aperte/Concluse con colore (tooltip Recharts o sheet mobile). */
interface MonthlySeriesEntry {
	name: string;
	value: number;
	color: string;
}

/**
 * Righe Aperte/Concluse con pallini colore — condiviso tra tooltip desktop e drawer mobile.
 * `variant` imposta i token testo (popover vs superficie card nel bottom sheet).
 */
function MonthlySeriesRows({
	formatValue,
	heading,
	entries,
	variant = "popover",
}: {
	formatValue: (value: number) => string;
	heading?: string;
	entries: MonthlySeriesEntry[];
	variant?: "popover" | "card";
}) {
	const visible = entries.filter((entry) => entry.name);
	if (!visible.length) {
		return null;
	}
	const textClass =
		variant === "card" ? "text-card-foreground" : "text-popover-foreground";
	return (
		<>
			{heading ? (
				<span className={cn("font-medium", textClass)}>{heading}</span>
			) : null}
			<div className="flex flex-col gap-0.5">
				{visible.map((entry) => (
					<div
						className={cn("flex items-center gap-1 font-normal", textClass)}
						key={entry.name}
					>
						<span
							className="size-2.5 shrink-0 rounded-full"
							style={{ backgroundColor: entry.color }}
						/>
						<span>
							{entry.name}: {formatValue(entry.value)}
						</span>
					</div>
				))}
			</div>
		</>
	);
}

/** Custom tooltip: font più grande, gap ridotto tra Aperte e Concluse. */
export function ChartTooltipContent({
	formatValue,
	label,
	payload,
}: {
	formatValue: (value: number) => string;
	label?: string;
	payload?: Array<{ name?: string; value: number; color: string }>;
}) {
	const visiblePayload = payload?.filter((entry) => entry.name);
	if (!visiblePayload?.length) {
		return null;
	}
	const entries: MonthlySeriesEntry[] = visiblePayload.map((entry) => ({
		name: entry.name ?? "",
		value: entry.value,
		color: entry.color,
	}));
	return (
		<div
			className="flex flex-col gap-0.5 rounded-lg border border-border bg-popover px-3 py-2 shadow-lg"
			style={{ fontSize: "1rem" }}
		>
			<MonthlySeriesRows
				entries={entries}
				formatValue={formatValue}
				heading={label}
				variant="popover"
			/>
		</div>
	);
}

export interface MonthlyChartDatum {
	month: number;
	monthLabel: string;
	open_amount: number;
	concluded_amount: number;
	open_count: number;
	concluded_count: number;
}

/** Colori serie (stessi del BarChart desktop). */
const SERIE_APERTE_FILL = "oklch(0.72 0.19 55)";
const SERIE_CONCLUSE_FILL = "oklch(0.5315 0.1179 157.23)";

/**
 * Fascia hover verticale sul gruppo di barre: `muted` + bassa opacità si confonde con lo sfondo
 * stat-card in dataweb light. `card-foreground` è scuro in light e chiaro in dark → velo leggibile su entrambi.
 */
export const BAR_CHART_TOOLTIP_CURSOR = {
	fill: "var(--card-foreground)",
	fillOpacity: 0.14,
} as const;

const MOBILE_PILL_MIN_PX = 5;

/** Altezza area grafico colonne mensili su mobile (stessa baseline delle card dual-series). */
const MOBILE_CHART_COLUMN_PX = 160;

/** Titolo drawer: nome mese esteso in italiano + contesto anno / Storico. */
function formatMonthDrawerTitle(month: number, yearCaption: string): string {
	const raw = new Intl.DateTimeFormat("it-IT", { month: "long" }).format(
		new Date(2000, month - 1, 1)
	);
	const capitalized = raw.charAt(0).toUpperCase() + raw.slice(1);
	return `${capitalized} · ${yearCaption}`;
}

/**
 * Mobile: una serie per mese (es. solo importo aperte) — pillola singola proporzionale a yMax.
 * Stesso pattern scroll orizzontale + drawer del vecchio grafico combinato.
 */
export function MobileMonthlySingleSeriesColumns({
	barColor,
	chartData,
	formatValue,
	getValue,
	seriesLabel,
	sheetDescription,
	yearCaption,
	yMax,
}: {
	barColor: string;
	chartData: MonthlyChartDatum[];
	formatValue: (value: number) => string;
	getValue: (d: MonthlyChartDatum) => number;
	/** Titolo breve metrica (es. "Importo aperte") per aria e drawer. */
	seriesLabel: string;
	sheetDescription: string;
	yearCaption: string;
	yMax: number;
}) {
	const [sheetDatum, setSheetDatum] = useState<MonthlyChartDatum | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset foglio quando cambiano anno/dati (identity chartData da useMemo).
	useEffect(() => {
		setSheetDatum(null);
	}, [chartData]);

	const handleMonthActivate = (month: number) => {
		setSheetDatum((prev) => {
			if (prev?.month === month) {
				return null;
			}
			return chartData.find((row) => row.month === month) ?? null;
		});
	};

	const handleDrawerOpenChange = (open: boolean) => {
		if (!open) {
			setSheetDatum(null);
		}
	};

	const safeYMax = yMax > 0 ? yMax : 1;

	return (
		<>
			<ul className="scroll-fade-x flex w-full min-w-0 touch-pan-x list-none gap-1 overflow-x-auto overflow-y-hidden p-0 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				{chartData.map((d) => {
					const value = getValue(d);
					const label = d.monthLabel.toUpperCase();
					const pct =
						value > 0
							? Math.max(
									(value / safeYMax) * 100,
									(MOBILE_PILL_MIN_PX / MOBILE_CHART_COLUMN_PX) * 100
								)
							: 0;
					const aria = `${label}: ${seriesLabel} ${formatValue(value)}. Tocca per i dettagli.`;
					return (
						<li className="shrink-0 list-none" key={d.month}>
							<button
								aria-label={aria}
								className="flex min-h-[44px] min-w-[44px] touch-manipulation flex-col items-center gap-0.5 rounded-lg py-1 [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								onClick={() => handleMonthActivate(d.month)}
								type="button"
							>
								<div
									className="flex w-6 flex-col justify-end"
									style={{ height: MOBILE_CHART_COLUMN_PX }}
								>
									{value > 0 ? (
										<div
											aria-hidden
											className="w-full rounded-md opacity-85"
											style={{
												backgroundColor: barColor,
												minHeight: MOBILE_PILL_MIN_PX,
												height: `${pct}%`,
											}}
										/>
									) : null}
								</div>
								<span className="w-6 shrink-0 text-center font-medium text-[9px] text-card-foreground uppercase leading-tight tracking-tighter">
									{label}
								</span>
							</button>
						</li>
					);
				})}
			</ul>

			<Drawer.Root
				onOpenChange={handleDrawerOpenChange}
				open={sheetDatum !== null}
			>
				<Drawer.Portal>
					<Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
					<Drawer.Content className="fixed inset-x-[10px] bottom-[10px] z-50 flex max-h-[90vh] flex-col rounded-[36px] bg-card px-6 py-5 text-card-foreground outline-none drop-shadow-[0_18px_45px_rgba(15,23,42,0.55)]">
						{sheetDatum ? (
							<>
								<Drawer.Title className="sr-only">
									{formatMonthDrawerTitle(sheetDatum.month, yearCaption)}
								</Drawer.Title>
								<Drawer.Description className="sr-only">
									{sheetDescription}
								</Drawer.Description>
								<div className="mx-auto mt-0.5 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />
								<div className="flex items-start justify-between gap-3 pb-4">
									<h2 className="font-bold text-card-foreground text-xl tracking-tight">
										{formatMonthDrawerTitle(sheetDatum.month, yearCaption)}
									</h2>
									<button
										aria-label="Chiudi"
										className="flex size-8 shrink-0 items-center justify-center rounded-full bg-table-header text-card-foreground transition-transform hover:bg-table-hover focus:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
										onClick={() => setSheetDatum(null)}
										type="button"
									>
										<X aria-hidden className="size-4" />
									</button>
								</div>
								<p className="font-medium text-base text-card-foreground">
									<span className="text-card-foreground/80">
										{seriesLabel}:{" "}
									</span>
									{formatValue(getValue(sheetDatum))}
								</p>
								<div className="mt-6 flex justify-end">
									<Button
										className="h-10 min-w-26 rounded-xl text-sm"
										onClick={() => setSheetDatum(null)}
										type="button"
									>
										Chiudi
									</Button>
								</div>
							</>
						) : null}
					</Drawer.Content>
				</Drawer.Portal>
			</Drawer.Root>
		</>
	);
}

/**
 * Grafici mensili: importo e numero trattative (Aperte vs Concluse).
 * Sotto 768px (md): quattro grafici a serie singola in verticale; altrimenti due bar chart affiancati.
 * Condivide il selector anno (anni specifici + "Storico").
 */
export function StatisticheMonthlyCharts({
	accessToken,
	onSelectedYearChange,
	showPersonalPdfExport = false,
}: StatisticheMonthlyChartsProps): ReactNode {
	const [stats, setStats] = useState<MonthlyNegotiationsStatistics | null>(
		null
	);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const currentYear = new Date().getFullYear();
	const [selectedYear, setSelectedYear] = useState<string>(STORICO_VALUE);
	// Evita di rilanciare il fetch quando il genitore passa una callback inline instabile.
	const onYearChangeRef = useRef(onSelectedYearChange);
	onYearChangeRef.current = onSelectedYearChange;

	useEffect(() => {
		if (!accessToken) {
			setStats(null);
			setError(null);
			setIsLoading(false);
			return;
		}
		let cancelled = false;
		setIsLoading(true);
		setError(null);
		getNegotiationsMonthlyStatistics(accessToken).then((result) => {
			if (cancelled) {
				return;
			}
			if ("error" in result) {
				setStats(null);
				setError(result.error);
			} else {
				setStats(result.data);
				setError(null);
				// Imposta default anno al primo caricamento
				let nextYear = STORICO_VALUE;
				if (result.data.years?.includes(currentYear)) {
					nextYear = String(currentYear);
				} else {
					nextYear = STORICO_VALUE;
				}
				setSelectedYear(nextYear);
				onYearChangeRef.current?.(nextYear);
			}
			setIsLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [accessToken, currentYear]);

	// Dati per i grafici in base alla selezione anno
	const chartData = useMemo(() => {
		if (!stats) {
			return [];
		}
		const raw: MonthlyNegotiationDatum[] =
			selectedYear === STORICO_VALUE
				? stats.storico
				: (stats.data[selectedYear] ?? stats.storico);
		// Garantisce 12 mesi anche se l'API ne manda meno
		const byMonth: Record<number, MonthlyNegotiationDatum> = {};
		for (let m = 1; m <= 12; m++) {
			byMonth[m] = raw.find((d) => d.month === m) ?? {
				month: m,
				open_count: 0,
				open_amount: 0,
				concluded_count: 0,
				concluded_amount: 0,
			};
		}
		return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
			const d = byMonth[m];
			return {
				month: m,
				monthLabel: MONTH_LABELS[m] ?? String(m),
				open_amount: d.open_amount,
				concluded_amount: d.concluded_amount,
				open_count: d.open_count,
				concluded_count: d.concluded_count,
			};
		});
	}, [stats, selectedYear]);

	/** Scala Y per grafici mobile a serie singola (una pillola per mese). */
	const yMaxOpenAmount = useMemo(() => {
		const max = Math.max(...chartData.map((d) => d.open_amount), 1);
		return max * 1.08;
	}, [chartData]);

	const yMaxConcludedAmount = useMemo(() => {
		const max = Math.max(...chartData.map((d) => d.concluded_amount), 1);
		return max * 1.08;
	}, [chartData]);

	const yMaxOpenCount = useMemo(() => {
		const max = Math.max(...chartData.map((d) => d.open_count), 1);
		return max * 1.08;
	}, [chartData]);

	const yMaxConcludedCount = useMemo(() => {
		const max = Math.max(...chartData.map((d) => d.concluded_count), 1);
		return max * 1.08;
	}, [chartData]);

	const selectOptions = useMemo(() => {
		if (!stats?.years) {
			return [];
		}
		const opts: { value: string; label: string }[] = stats.years
			.sort((a, b) => b - a)
			.map((y) => ({ value: String(y), label: String(y) }));
		opts.push({ value: STORICO_VALUE, label: "Storico" });
		return opts;
	}, [stats?.years]);

	const handleYearChange = useCallback((value: string | null) => {
		if (value !== null) {
			setSelectedYear(value);
			onYearChangeRef.current?.(value);
		}
	}, []);

	const [isPdfExporting, setIsPdfExporting] = useState(false);

	const handleExportPersonalPdf = useCallback(async () => {
		if (!(accessToken && showPersonalPdfExport)) {
			return;
		}
		setIsPdfExporting(true);
		const result = await downloadStatisticsExportPdf(accessToken, {
			year: selectedYear === STORICO_VALUE ? undefined : selectedYear,
		});
		setIsPdfExporting(false);
		if ("error" in result) {
			toast.error(result.error);
			return;
		}
		toast.success("Download PDF avviato");
	}, [accessToken, selectedYear, showPersonalPdfExport]);

	if (isLoading || !(stats || error)) {
		return (
			<div className="flex min-h-0 min-w-0 flex-col gap-4">
				<div className="flex h-10 w-full max-w-xs">
					<Skeleton className="h-full w-full rounded-lg" />
				</div>
				{/* Mobile (sotto md / 768px): quattro skeleton; desktop: due card affiancate. */}
				<div className="flex flex-col gap-4 md:hidden">
					{[1, 2, 3, 4].map((key) => (
						<div
							className="stat-card-bg h-[220px] min-w-0 rounded-2xl bg-background p-4"
							key={key}
						>
							<Skeleton className="h-full w-full rounded-xl" />
						</div>
					))}
				</div>
				<div className="hidden grid-cols-2 gap-4 md:grid">
					<div className="stat-card-bg h-[280px] min-w-0 rounded-2xl bg-background p-4">
						<Skeleton className="h-full w-full rounded-xl" />
					</div>
					<div className="stat-card-bg h-[280px] min-w-0 rounded-2xl bg-background p-4">
						<Skeleton className="h-full w-full rounded-xl" />
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-0 min-w-0 flex-col gap-4">
				<p className="text-destructive text-sm" role="alert">
					Impossibile caricare le statistiche mensili: {error}
				</p>
			</div>
		);
	}

	if (!stats) {
		return (
			<div className="flex min-h-0 min-w-0 flex-col gap-4">
				<p className="text-muted-foreground text-sm">
					Nessun dato mensile disponibile.
				</p>
			</div>
		);
	}

	/** Etichetta contesto nel foglio mobile (anno scelto o aggregato storico). */
	const yearCaption = selectedYear === STORICO_VALUE ? "Storico" : selectedYear;

	return (
		<div className="flex min-h-0 min-w-0 flex-col gap-2">
			{/* Selector anno a sinistra, azioni PDF a destra (stessa riga su viewport larghi). */}
			<div className="flex w-full flex-wrap items-center justify-between gap-2">
				<Select.Root onValueChange={handleYearChange} value={selectedYear}>
					<Select.Trigger
						aria-label="Seleziona anno"
						className="flex h-10 w-fit items-center justify-between gap-2 rounded-full border-0 bg-table-buttons px-3.75 py-1.75 font-normal text-sm outline-none transition-colors focus-visible:outline-none data-popup-open:bg-table-buttons"
						id="statistiche-year-select"
					>
						<span className="font-medium text-muted-foreground text-sm">
							Anno
						</span>
						<Select.Value
							className="data-placeholder:text-muted-foreground"
							placeholder="—"
						>
							{(value: string | null) => {
								if (!value) {
									return "—";
								}
								const opt = selectOptions.find((o) => o.value === value);
								return opt?.label ?? value;
							}}
						</Select.Value>
						<Select.Icon className="text-button-secondary">
							<ChevronDown aria-hidden className="size-3.5" />
						</Select.Icon>
					</Select.Trigger>
					<Select.Portal>
						<Select.Positioner
							alignItemWithTrigger={false}
							className="z-50 max-h-80 min-w-32 rounded-2xl text-popover-foreground shadow-xl"
							sideOffset={8}
						>
							<Select.Popup className="max-h-80 overflow-y-auto rounded-2xl bg-popover p-1">
								<Select.List className="flex h-fit flex-col gap-1">
									{selectOptions.map((opt) => (
										<Select.Item
											className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-accent-foreground data-selected:text-accent-foreground"
											key={opt.value}
											value={opt.value}
										>
											<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
												<CheckIcon aria-hidden className="size-4" />
											</Select.ItemIndicator>
											<Select.ItemText>{opt.label}</Select.ItemText>
										</Select.Item>
									))}
								</Select.List>
							</Select.Popup>
						</Select.Positioner>
					</Select.Portal>
				</Select.Root>
				{showPersonalPdfExport ? (
					<button
						aria-busy={isPdfExporting}
						className={EXPORT_ACTION_PILL_BUTTON_CLASS}
						disabled={!accessToken || isPdfExporting}
						onClick={handleExportPersonalPdf}
						type="button"
					>
						{isPdfExporting ? (
							<Spinner className="shrink-0 text-card-foreground" size="sm" />
						) : (
							<IconDesignFileDownloadFill18 className="size-4 shrink-0 text-button-secondary" />
						)}
						Esporta PDF
					</button>
				) : null}
			</div>
			{/* Fascia grafici: gap interno tra le card invariato (gap-4). */}
			<div className="flex min-h-0 min-w-0 flex-col gap-4">
				{/*
				 * Mobile: quattro grafici verticali (ordine richiesto: importo aperte, importo chiuse, n. aperte, n. chiuse).
				 * md+ (768px): due bar chart affiancati (Aperte vs Concluse) come prima.
				 */}
				<div className="flex flex-col gap-4 md:hidden">
					<div className="stat-card-bg flex min-w-0 flex-col gap-2 rounded-2xl bg-background p-4">
						<h3 className="font-medium text-card-foreground text-sm">
							Importo aperte (€)
						</h3>
						<div className="min-h-[200px] min-w-0 py-1">
							<MobileMonthlySingleSeriesColumns
								barColor={SERIE_APERTE_FILL}
								chartData={chartData}
								formatValue={formatAmount}
								getValue={(row) => row.open_amount}
								seriesLabel="Importo aperte"
								sheetDescription="Importo delle trattative aperte nel mese selezionato."
								yearCaption={yearCaption}
								yMax={yMaxOpenAmount}
							/>
						</div>
					</div>
					<div className="stat-card-bg flex min-w-0 flex-col gap-2 rounded-2xl bg-background p-4">
						<h3 className="font-medium text-card-foreground text-sm">
							Importo chiuse (€)
						</h3>
						<div className="min-h-[200px] min-w-0 py-1">
							<MobileMonthlySingleSeriesColumns
								barColor={SERIE_CONCLUSE_FILL}
								chartData={chartData}
								formatValue={formatAmount}
								getValue={(row) => row.concluded_amount}
								seriesLabel="Importo chiuse"
								sheetDescription="Importo delle trattative concluse nel mese selezionato."
								yearCaption={yearCaption}
								yMax={yMaxConcludedAmount}
							/>
						</div>
					</div>
					<div className="stat-card-bg flex min-w-0 flex-col gap-2 rounded-2xl bg-background p-4">
						<h3 className="font-medium text-card-foreground text-sm">
							Numero trattative aperte
						</h3>
						<div className="min-h-[200px] min-w-0 py-1">
							<MobileMonthlySingleSeriesColumns
								barColor={SERIE_APERTE_FILL}
								chartData={chartData}
								formatValue={(v) => String(v)}
								getValue={(row) => row.open_count}
								seriesLabel="Numero aperte"
								sheetDescription="Numero di trattative aperte nel mese selezionato."
								yearCaption={yearCaption}
								yMax={yMaxOpenCount}
							/>
						</div>
					</div>
					<div className="stat-card-bg flex min-w-0 flex-col gap-2 rounded-2xl bg-background p-4">
						<h3 className="font-medium text-card-foreground text-sm">
							Numero trattative chiuse
						</h3>
						<div className="min-h-[200px] min-w-0 py-1">
							<MobileMonthlySingleSeriesColumns
								barColor={SERIE_CONCLUSE_FILL}
								chartData={chartData}
								formatValue={(v) => String(v)}
								getValue={(row) => row.concluded_count}
								seriesLabel="Numero chiuse"
								sheetDescription="Numero di trattative concluse nel mese selezionato."
								yearCaption={yearCaption}
								yMax={yMaxConcludedCount}
							/>
						</div>
					</div>
				</div>

				<div className="hidden grid-cols-2 gap-4 md:grid">
					{/* Card 1: Importo mensile (Aperte vs Concluse). */}
					<div className="stat-card-bg flex min-w-0 flex-col gap-2 rounded-2xl bg-background p-4">
						<h3 className="font-medium text-card-foreground text-sm">
							Importo mensile trattative (€)
						</h3>
						<div className="h-[240px] min-w-0">
							<ResponsiveContainer height="100%" width="100%">
								<BarChart
									barCategoryGap="20%"
									barSize={24}
									data={chartData}
									margin={{ top: 24, right: 8, left: 0, bottom: 0 }}
								>
									<XAxis
										axisLine={false}
										dataKey="monthLabel"
										tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
										tickLine={false}
									/>
									<YAxis
										hide
										tickFormatter={(v) =>
											v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
										}
										width={0}
									/>
									<Tooltip
										content={(props) =>
											props.active && props.payload?.length ? (
												<ChartTooltipContent
													formatValue={(v) => formatAmount(v)}
													label={props.label as string}
													payload={
														props.payload as Array<{
															name: string;
															value: number;
															color: string;
														}>
													}
												/>
											) : null
										}
										cursor={BAR_CHART_TOOLTIP_CURSOR}
									/>
									<Bar
										dataKey="open_amount"
										fill={SERIE_APERTE_FILL}
										fillOpacity={0.85}
										name="Aperte"
										radius={[8, 8, 8, 8]}
									/>
									<Bar
										dataKey="concluded_amount"
										fill={SERIE_CONCLUSE_FILL}
										fillOpacity={0.85}
										name="Concluse"
										radius={[8, 8, 8, 8]}
									/>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</div>
					{/* Card 2: Numero trattative mensili. */}
					<div className="stat-card-bg flex min-w-0 flex-col gap-2 rounded-2xl bg-background p-4">
						<h3 className="font-medium text-card-foreground text-sm">
							Numero trattative mensili
						</h3>
						<div className="h-[240px] min-w-0">
							<ResponsiveContainer height="100%" width="100%">
								<BarChart
									barCategoryGap="20%"
									barSize={24}
									data={chartData}
									margin={{ top: 24, right: 8, left: 0, bottom: 0 }}
								>
									<XAxis
										axisLine={false}
										dataKey="monthLabel"
										tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
										tickLine={false}
									/>
									<YAxis hide width={0} />
									<Tooltip
										content={(props) =>
											props.active && props.payload?.length ? (
												<ChartTooltipContent
													formatValue={(v) => String(v)}
													label={props.label as string}
													payload={
														props.payload as Array<{
															name: string;
															value: number;
															color: string;
														}>
													}
												/>
											) : null
										}
										cursor={BAR_CHART_TOOLTIP_CURSOR}
									/>
									<Bar
										dataKey="open_count"
										fill={SERIE_APERTE_FILL}
										fillOpacity={0.85}
										name="Aperte"
										radius={[8, 8, 8, 8]}
									/>
									<Bar
										dataKey="concluded_count"
										fill={SERIE_CONCLUSE_FILL}
										fillOpacity={0.85}
										name="Concluse"
										radius={[8, 8, 8, 8]}
									/>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
