"use client";

import { Popover } from "@base-ui/react/popover";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Check, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
	DayPicker,
	type DateRange as DayPickerDateRange,
} from "react-day-picker";
import { cn } from "@/lib/utils";

/** Preset rapido: calcola from/to e label. */
interface QuickPreset {
	label: string;
	value: string;
	getDates: () => [Date, Date];
}

const QUICK_DATE_PRESETS: QuickPreset[] = [
	{
		label: "7 giorni",
		value: "last7days",
		getDates: (): [Date, Date] => {
			const end = new Date();
			const start = new Date();
			start.setDate(start.getDate() - 6);
			return [start, end];
		},
	},
	{
		label: "30 giorni",
		value: "last30days",
		getDates: (): [Date, Date] => {
			const end = new Date();
			const start = new Date();
			start.setDate(start.getDate() - 29);
			return [start, end];
		},
	},
	{
		label: "3 mesi",
		value: "last3months",
		getDates: (): [Date, Date] => {
			const now = new Date();
			const end = new Date();
			const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
			return [start, end];
		},
	},
	{
		label: "6 mesi",
		value: "last6months",
		getDates: (): [Date, Date] => {
			const now = new Date();
			const end = new Date();
			const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
			return [start, end];
		},
	},
	{
		label: "1 anno",
		value: "last12months",
		getDates: (): [Date, Date] => {
			const now = new Date();
			const end = new Date();
			const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
			return [start, end];
		},
	},
	{
		label: "Totale",
		value: "total",
		getDates: (): [Date, Date] => {
			const end = new Date();
			const start = new Date(1970, 0, 1);
			return [start, end];
		},
	},
];

export interface DateRangeFilterProps {
	/** Range corrente (undefined = nessun filtro / Totale). */
	dateRange: DayPickerDateRange | undefined;
	/** Callback quando il range cambia. */
	onDateRangeChange: (range: DayPickerDateRange | undefined) => void;
	/** Classi aggiuntive per il wrapper. */
	className?: string;
	/** Allineamento del popover rispetto al trigger. */
	align?: "start" | "center" | "end";
	/** Stile pill compatibile con i filtri tabella (bg-table-buttons). */
	variant?: "default" | "table";
}

export function DateRangeFilter({
	dateRange,
	onDateRangeChange,
	className,
	align = "end",
	variant = "table",
}: DateRangeFilterProps) {
	const [open, setOpen] = useState(false);

	const getDateFilterDisplay = useCallback(() => {
		if (dateRange?.from && dateRange?.to) {
			if (
				format(dateRange.from, "yyyy-MM-dd") ===
				format(dateRange.to, "yyyy-MM-dd")
			) {
				return format(dateRange.from, "dd MMM yyyy", { locale: it });
			}
			return `${format(dateRange.from, "dd MMM", { locale: it })} - ${format(dateRange.to, "dd MMM yyyy", { locale: it })}`;
		}
		if (dateRange?.from) {
			return `Da ${format(dateRange.from, "dd MMM yyyy", { locale: it })}`;
		}
		if (dateRange?.to) {
			return `A ${format(dateRange.to, "dd MMM yyyy", { locale: it })}`;
		}
		return "Filtra per data";
	}, [dateRange]);

	const handleQuickPreset = useCallback(
		(preset: QuickPreset) => {
			if (preset.value === "total") {
				onDateRangeChange(undefined);
				setOpen(false);
				return;
			}
			const [start, end] = preset.getDates();
			onDateRangeChange({ from: start, to: end });
			setOpen(false);
		},
		[onDateRangeChange]
	);

	const activePreset = useMemo(() => {
		if (!(dateRange?.from && dateRange?.to)) {
			return QUICK_DATE_PRESETS.find((p) => p.value === "total") ?? null;
		}
		return (
			QUICK_DATE_PRESETS.find((preset) => {
				const [presetStart, presetEnd] = preset.getDates();
				return (
					dateRange.from?.toDateString() === presetStart.toDateString() &&
					dateRange.to?.toDateString() === presetEnd.toDateString()
				);
			}) ?? null
		);
	}, [dateRange]);

	const triggerLabel =
		activePreset?.value === "total"
			? "Filtra per data"
			: (activePreset?.label ?? getDateFilterDisplay());

	const hasRange = Boolean(dateRange?.from ?? dateRange?.to);

	// Pill container: un unico elemento visivo con due zone cliccabili (trigger + clear)
	const pillClassName = cn(
		"inline-flex items-center overflow-hidden rounded-full",
		variant === "table" ? "bg-table-buttons" : "bg-card ring-1 ring-border",
		hasRange && variant === "default" && "bg-primary/10 ring-2 ring-primary/40"
	);

	return (
		<div className={cn("group relative", className)}>
			<Popover.Root onOpenChange={setOpen} open={open}>
				<div className={pillClassName}>
					<Popover.Trigger
						aria-label={`Filtro data: ${triggerLabel}`}
						className={cn(
							"border-none bg-transparent px-3.75 py-1.75 font-normal text-sm outline-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
							hasRange && variant === "default" && "text-primary"
						)}
					>
						<span className="whitespace-nowrap">{triggerLabel}</span>
					</Popover.Trigger>
					{hasRange && (
						<button
							aria-label="Cancella filtro data"
							className="flex h-8 min-w-8 shrink-0 cursor-pointer items-center justify-center border-none bg-transparent pr-2 outline-none transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 dark:hover:bg-white/5"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onDateRangeChange(undefined);
							}}
							type="button"
						>
							<X aria-hidden className="size-4 text-muted-foreground/60" />
						</button>
					)}
				</div>
				<Popover.Portal>
					<Popover.Positioner
						align={align}
						className="z-50"
						side="bottom"
						sideOffset={8}
					>
						<Popover.Popup className="w-[calc(100vw-2rem)] max-w-md rounded-3xl bg-card p-3 shadow-xl ring-1 ring-border md:w-96">
							<div className="flex flex-col gap-3">
								{/* Preset Rapidi: stile preferences (border-primary bg-primary/5 selezionato, border-border bg-muted/30 non selezionato) */}
								<div className="rounded-2xl bg-background p-2 ring-1 ring-border">
									<p className="mb-2 flex justify-center font-medium text-muted-foreground text-sm uppercase">
										Preset Rapidi
									</p>
									<div className="grid grid-cols-2 gap-2">
										{QUICK_DATE_PRESETS.map((preset) => (
											<button
												aria-pressed={activePreset?.value === preset.value}
												className={cn(
													"flex items-center justify-center gap-1.5 rounded-lg border-2 py-2 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
													activePreset?.value === preset.value
														? "border-primary bg-primary/5 text-card-foreground"
														: "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30"
												)}
												key={preset.value}
												onClick={() => handleQuickPreset(preset)}
												type="button"
											>
												{preset.label}
												{activePreset?.value === preset.value && (
													<Check className="size-3.5" />
												)}
											</button>
										))}
									</div>
								</div>
								{/* Range date: calendario per selezione personalizzata */}
								<div className="rounded-2xl bg-background p-2 ring-1 ring-border">
									<p className="mb-2 flex justify-center font-medium text-muted-foreground text-sm uppercase">
										Seleziona range
									</p>
									<div className="date-range-filter-calendar flex justify-center">
										<DayPicker
											classNames={{
												/* Arrotonda sinistra per range_start, destra per range_end */
												range_start: "rdp-range_start !rounded-l-full",
												range_end: "rdp-range_end !rounded-r-full",
											}}
											locale={it}
											mode="range"
											numberOfMonths={1}
											onSelect={(range) => {
												onDateRangeChange(range);
											}}
											selected={dateRange}
											showOutsideDays
										/>
									</div>
								</div>
							</div>
						</Popover.Popup>
					</Popover.Positioner>
				</Popover.Portal>
			</Popover.Root>
		</div>
	);
}
