"use client";

import { Select } from "@base-ui/react/select";
import { ChevronDown, X } from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
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
import { Drawer } from "vaul";
import { CheckIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { getNegotiationsMonthlyStatistics } from "@/lib/api/client";
import type {
	MonthlyNegotiationDatum,
	MonthlyNegotiationsStatistics,
} from "@/lib/api/types";
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
function ChartTooltipContent({
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

interface MonthlyChartDatum {
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

const MOBILE_PILL_MIN_PX = 5;

/** Titolo drawer: nome mese esteso in italiano + contesto anno / Storico. */
function formatMonthDrawerTitle(month: number, yearCaption: string): string {
	const raw = new Intl.DateTimeFormat("it-IT", { month: "long" }).format(
		new Date(2000, month - 1, 1)
	);
	const capitalized = raw.charAt(0).toUpperCase() + raw.slice(1);
	return `${capitalized} · ${yearCaption}`;
}

/** Pesi flex per pillole proporzionali ai valori (vs yMax); Concluse sopra, Aperte sotto. */
function mobilePillFlexWeights(
	aperte: number,
	concluse: number,
	yMax: number
): { flexAperte: number; flexConcluse: number } {
	if (yMax <= 0) {
		return { flexAperte: 0, flexConcluse: 0 };
	}
	const wA = Math.max(0, aperte / yMax);
	const wC = Math.max(0, concluse / yMax);
	const sum = wA + wC;
	if (sum <= 0) {
		return { flexAperte: 0, flexConcluse: 0 };
	}
	return { flexAperte: wA / sum, flexConcluse: wC / sum };
}

/**
 * Mobile: colonna stretta per mese — pillole colorate separate (gap = sfondo card),
 * niente wrapper grigio attorno alla colonna; mese sotto in maiuscolo.
 * Tap sulla colonna apre un bottom sheet (Vaul) con gli stessi valori del tooltip desktop.
 */
function MobileMonthlyPillColumns({
	chartData,
	formatValue,
	getAperte,
	getConcluse,
	sheetKind,
	yearCaption,
	yMax,
}: {
	chartData: MonthlyChartDatum[];
	formatValue: (value: number) => string;
	getAperte: (d: MonthlyChartDatum) => number;
	getConcluse: (d: MonthlyChartDatum) => number;
	/** Usato solo per testo accessibile nel drawer. */
	sheetKind: "amount" | "count";
	yearCaption: string;
	yMax: number;
}) {
	/** Mese selezionato per il foglio: tiene il datum fino a chiusura (animazione Vaul + coerenza contenuto). */
	const [sheetDatum, setSheetDatum] = useState<MonthlyChartDatum | null>(null);

	// Cambio anno o nuovi dati (nuovo array da useMemo): chiudi il foglio per evitare valori obsoleti.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `chartData` è la dipendenza voluta (identity da useMemo quando cambiano anno o stats).
	useEffect(() => {
		setSheetDatum(null);
	}, [chartData]);

	const handleMonthActivate = (month: number) => {
		setSheetDatum((prev) => {
			// Secondo tap sullo stesso mese chiude il foglio.
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

	const sheetDescription =
		sheetKind === "amount"
			? "Importi delle trattative aperte e concluse per il mese selezionato."
			: "Numero di trattative aperte e concluse per il mese selezionato.";

	return (
		<>
			{/*
			 * scroll-fade-x (table.css): fade ai bordi quando c’è overflow orizzontale,
			 * come filtri clienti / trattative — stesso pattern di scroll(self inline).
			 */}
			<ul className="scroll-fade-x flex w-full min-w-0 touch-pan-x list-none gap-1 overflow-x-auto overflow-y-hidden p-0 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				{chartData.map((d) => {
					const aperte = getAperte(d);
					const concluse = getConcluse(d);
					const { flexAperte, flexConcluse } = mobilePillFlexWeights(
						aperte,
						concluse,
						yMax
					);
					const label = d.monthLabel.toUpperCase();
					const aria = `${label}: Aperte ${formatValue(aperte)}, Concluse ${formatValue(concluse)}. Tocca per i dettagli.`;
					return (
						<li className="shrink-0 list-none" key={d.month}>
							{/*
							 * Button: area tocco ~44px (linee guida touch) con pillole visive al centro (w-6).
							 * `touch-action: manipulation` evita doppio-tap zoom su iOS sul controllo.
							 */}
							<button
								aria-label={aria}
								className="flex min-h-[44px] min-w-[44px] touch-manipulation flex-col items-center gap-0.5 rounded-lg py-1 [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								onClick={() => handleMonthActivate(d.month)}
								type="button"
							>
								{/* Solo layout flex (nessun bg): il gap tra le pillole mostra lo sfondo della card. */}
								<div className="flex h-[160px] w-6 flex-col">
									<div className="flex min-h-0 flex-1 flex-col justify-end gap-1">
										{concluse > 0 && (
											<div
												aria-hidden
												className="min-h-0 w-full rounded-md opacity-85"
												style={{
													backgroundColor: SERIE_CONCLUSE_FILL,
													flex: `${flexConcluse} 1 0px`,
													minHeight: MOBILE_PILL_MIN_PX,
												}}
											/>
										)}
										{aperte > 0 && (
											<div
												aria-hidden
												className="min-h-0 w-full rounded-md opacity-85"
												style={{
													backgroundColor: SERIE_APERTE_FILL,
													flex: `${flexAperte} 1 0px`,
													minHeight: MOBILE_PILL_MIN_PX,
												}}
											/>
										)}
									</div>
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
								<div
									className="flex flex-col gap-2 text-base"
									style={{ fontSize: "1rem" }}
								>
									<MonthlySeriesRows
										entries={[
											{
												name: "Aperte",
												value: getAperte(sheetDatum),
												color: SERIE_APERTE_FILL,
											},
											{
												name: "Concluse",
												value: getConcluse(sheetDatum),
												color: SERIE_CONCLUSE_FILL,
											},
										]}
										formatValue={formatValue}
										variant="card"
									/>
								</div>
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
 * Grafici mensili: importo (aperte vs concluse) e numero trattative (aperte vs concluse).
 * Condivide il selector anno (anni specifici + "Storico").
 */
export function StatisticheMonthlyCharts({
	accessToken,
}: StatisticheMonthlyChartsProps): ReactNode {
	const [stats, setStats] = useState<MonthlyNegotiationsStatistics | null>(
		null
	);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const currentYear = new Date().getFullYear();
	const [selectedYear, setSelectedYear] = useState<string>(STORICO_VALUE);
	const isMobile = useIsMobile();

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
				// Imposta default anno al primo caricamente
				if (result.data.years?.includes(currentYear)) {
					setSelectedYear(String(currentYear));
				} else {
					setSelectedYear(STORICO_VALUE);
				}
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

	/** Stessa scala Y per le due righe di barre su mobile (confronto Aperte vs Concluse). */
	const yMaxAmount = useMemo(() => {
		const max = Math.max(
			...chartData.flatMap((d) => [d.open_amount, d.concluded_amount]),
			1
		);
		return max * 1.08;
	}, [chartData]);

	const yMaxCount = useMemo(() => {
		const max = Math.max(
			...chartData.flatMap((d) => [d.open_count, d.concluded_count]),
			1
		);
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
		}
	}, []);

	if (isLoading || !(stats || error)) {
		return (
			<div className="flex min-h-0 min-w-0 flex-col gap-4">
				<div className="flex h-10 w-full max-w-xs">
					<Skeleton className="h-full w-full rounded-lg" />
				</div>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="h-[280px] min-w-0 rounded-2xl bg-background p-4">
						<Skeleton className="h-full w-full rounded-xl" />
					</div>
					<div className="h-[280px] min-w-0 rounded-2xl bg-background p-4">
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
		<div className="flex min-h-0 min-w-0 flex-col gap-4">
			{/* Selector anno: label e valore dentro il trigger */}
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
			{/* Due bar chart affiancati, ciascuno in una card */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{/* Card 1: Importo mensile (Aperte vs Concluse) */}
				<div className="flex min-w-0 flex-col gap-2 rounded-2xl bg-background p-4">
					<h3 className="font-medium text-card-foreground text-sm">
						Importo mensile trattative (€)
					</h3>
					{/* Mobile: colonne tipo mockup — contenitore muted, pillole separate con gap, mese sotto. */}
					{isMobile ? (
						<div className="min-h-[200px] min-w-0 py-1">
							<MobileMonthlyPillColumns
								chartData={chartData}
								formatValue={formatAmount}
								getAperte={(row) => row.open_amount}
								getConcluse={(row) => row.concluded_amount}
								sheetKind="amount"
								yearCaption={yearCaption}
								yMax={yMaxAmount}
							/>
							<p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-card-foreground text-xs">
								<span className="inline-flex items-center gap-1">
									<span
										className="size-2 shrink-0 rounded-full opacity-85"
										style={{ backgroundColor: SERIE_APERTE_FILL }}
									/>
									Aperte
								</span>
								<span className="inline-flex items-center gap-1">
									<span
										className="size-2 shrink-0 rounded-full opacity-85"
										style={{ backgroundColor: SERIE_CONCLUSE_FILL }}
									/>
									Concluse
								</span>
							</p>
						</div>
					) : (
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
										cursor={{ fill: "var(--muted)", fillOpacity: 0.2 }}
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
					)}
				</div>
				{/* Card 2: Numero trattative mensili (Aperte vs Concluse) */}
				<div className="flex min-w-0 flex-col gap-2 rounded-2xl bg-background p-4">
					<h3 className="font-medium text-card-foreground text-sm">
						Numero trattative mensili
					</h3>
					{isMobile ? (
						<div className="min-h-[200px] min-w-0 py-1">
							<MobileMonthlyPillColumns
								chartData={chartData}
								formatValue={(v) => String(v)}
								getAperte={(row) => row.open_count}
								getConcluse={(row) => row.concluded_count}
								sheetKind="count"
								yearCaption={yearCaption}
								yMax={yMaxCount}
							/>
							<p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-card-foreground text-xs">
								<span className="inline-flex items-center gap-1">
									<span
										className="size-2 shrink-0 rounded-full opacity-85"
										style={{ backgroundColor: SERIE_APERTE_FILL }}
									/>
									Aperte
								</span>
								<span className="inline-flex items-center gap-1">
									<span
										className="size-2 shrink-0 rounded-full opacity-85"
										style={{ backgroundColor: SERIE_CONCLUSE_FILL }}
									/>
									Concluse
								</span>
							</p>
						</div>
					) : (
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
										cursor={{ fill: "var(--muted)", fillOpacity: 0.2 }}
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
					)}
				</div>
			</div>
		</div>
	);
}
