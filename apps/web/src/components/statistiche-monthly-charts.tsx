"use client";

import { Select } from "@base-ui/react/select";
import { ChevronDown } from "lucide-react";
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
import { CheckIcon } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { getNegotiationsMonthlyStatistics } from "@/lib/api/client";
import type {
	MonthlyNegotiationDatum,
	MonthlyNegotiationsStatistics,
} from "@/lib/api/types";

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

/** Custom tooltip: font più grande, gap ridotto tra Aperte e Concluse. */
function ChartTooltipContent({
	formatValue,
	label,
	payload,
}: {
	formatValue: (value: number) => string;
	label?: string;
	payload?: Array<{
		name?: string;
		value: number;
		color: string;
		dataKey?: string;
	}>;
}) {
	const visiblePayload = payload?.filter(
		(entry) => entry.name && !String(entry.dataKey).startsWith("gap_")
	);
	if (!visiblePayload?.length) {
		return null;
	}
	return (
		<div
			className="flex flex-col gap-0.5 rounded-lg border border-border bg-popover px-3 py-2 shadow-lg"
			style={{ fontSize: "1rem" }}
		>
			{label && <span className="text-popover-foreground">{label}</span>}
			<div className="flex flex-col gap-0.5">
				{visiblePayload.map((entry) => (
					<div
						className="flex items-center gap-1 font-normal text-popover-foreground"
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
		</div>
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
	}, [accessToken]);

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
		const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
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
		// Gap tra le barre impilate su mobile: ~12% del max per separare visivamente Aperte e Concluse
		const maxAmount = Math.max(
			...rows.flatMap((r) => [r.open_amount, r.concluded_amount]),
			1
		);
		const maxCount = Math.max(
			...rows.flatMap((r) => [r.open_count, r.concluded_count]),
			1
		);
		const gapAmount = maxAmount * 0.12;
		const gapCount = Math.max(1, maxCount * 0.15);
		return rows.map((r) => ({
			...r,
			gap_amount: gapAmount,
			gap_count: gapCount,
		}));
	}, [stats, selectedYear]);

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
									fill="oklch(0.72 0.19 55)"
									fillOpacity={0.85}
									name="Aperte"
									radius={isMobile ? [0, 0, 8, 8] : [8, 8, 8, 8]}
									stackId={isMobile ? "amount" : undefined}
								/>
								{/* Gap bar: crea spazio visivo tra Aperte e Concluse su mobile (non hide, altrimenti le barre appaiono unite) */}
								{isMobile && (
									<Bar
										dataKey="gap_amount"
										fill="var(--background)"
										radius={[0, 0, 0, 0]}
										stackId="amount"
									/>
								)}
								<Bar
									dataKey="concluded_amount"
									fill="oklch(0.5315 0.1179 157.23)"
									fillOpacity={0.85}
									name="Concluse"
									radius={isMobile ? [8, 8, 0, 0] : [8, 8, 8, 8]}
									stackId={isMobile ? "amount" : undefined}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
				{/* Card 2: Numero trattative mensili (Aperte vs Concluse) */}
				<div className="flex min-w-0 flex-col gap-2 rounded-2xl bg-background p-4">
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
									cursor={{ fill: "var(--muted)", fillOpacity: 0.2 }}
								/>
								<Bar
									dataKey="open_count"
									fill="oklch(0.72 0.19 55)"
									fillOpacity={0.85}
									name="Aperte"
									radius={isMobile ? [0, 0, 8, 8] : [8, 8, 8, 8]}
									stackId={isMobile ? "count" : undefined}
								/>
								{/* Gap bar: crea spazio visivo tra Aperte e Concluse su mobile (non hide, altrimenti le barre appaiono unite) */}
								{isMobile && (
									<Bar
										dataKey="gap_count"
										fill="var(--background)"
										radius={[0, 0, 0, 0]}
										stackId="count"
									/>
								)}
								<Bar
									dataKey="concluded_count"
									fill="oklch(0.5315 0.1179 157.23)"
									fillOpacity={0.85}
									name="Concluse"
									radius={isMobile ? [8, 8, 0, 0] : [8, 8, 8, 8]}
									stackId={isMobile ? "count" : undefined}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>
		</div>
	);
}
