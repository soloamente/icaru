"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Select } from "@base-ui/react/select";
import { ChevronDown, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Bar,
	BarChart,
	LabelList,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";
import {
	CheckIcon,
	IconDesignFileDownloadFill18,
	IconFileDownloadFill18,
	IconPinFill18,
} from "@/components/icons";
import {
	BAR_CHART_TOOLTIP_CURSOR,
	ChartTooltipContent,
	formatDesktopAmountAxisLabel,
	MobileMonthlySingleSeriesColumns,
	type MonthlyChartDatum,
} from "@/components/statistiche-monthly-charts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
	downloadTeamNegotiationsExportExcel,
	downloadTeamNegotiationsExportMap,
	downloadTeamStatisticsExportPdf,
	getTeamMonthlyStatistics,
} from "@/lib/api/client";
import type {
	MonthlyNegotiationDatum,
	NegotiationsMapFilters,
	SpancoStage,
	TeamMonthlyMember,
	TeamMonthlyStatistics,
} from "@/lib/api/types";
import { EXPORT_ACTION_PILL_BUTTON_CLASS } from "@/lib/export-action-pill-button-class";
import {
	TRATTATIVE_HEADER_FILTER_BG,
	TRATTATIVE_HEADER_FILTER_BG_POPUP_OPEN,
} from "@/lib/trattative-header-filter-classes";
import { cn } from "@/lib/utils";

/** Valore selector anno = aggregato storico (stessa convenzione delle statistiche personali). */
const STORICO_VALUE = "storico";

/** Colori richiesti per i grafici team: aperte arancio, concluse verde. */
const TEAM_OPEN_FILL = "#F97316";
const TEAM_CONCLUDED_FILL = "#22C55E";

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

const SPANCO_FILTER_LABELS: Record<SpancoStage, string> = {
	S: "S · Sospetto",
	P: "P · Prospetto",
	A: "A · Approccio",
	N: "N · Negoziazione",
	C: "C · Chiusura",
	O: "O · Ordine",
};

const SPANCO_OPTIONS: SpancoStage[] = ["S", "P", "A", "N", "C", "O"];

const PERCENTUALE_MAP_OPTIONS: { value: string; label: string }[] = [
	{ value: "", label: "Tutti" },
	{ value: "0", label: "0%" },
	{ value: "20", label: "20%" },
	{ value: "40", label: "40%" },
	{ value: "60", label: "60%" },
	{ value: "80", label: "80%" },
	{ value: "100", label: "100%" },
];

function formatAmount(value: number): string {
	return new Intl.NumberFormat("it-IT", {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}

interface TeamDetailMonthlySectionProps {
	teamId: number;
	accessToken: string;
}

/**
 * Statistiche mensili team (due bar chart), filtri venditore/anno, export PDF/Excel/Mappa HTML.
 * Solo Direttore: il genitore deve renderizzare solo se `isDirector`.
 */
export function TeamDetailMonthlySection({
	teamId,
	accessToken,
}: TeamDetailMonthlySectionProps) {
	const [stats, setStats] = useState<TeamMonthlyStatistics | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const [selectedYear, setSelectedYear] = useState<string>(STORICO_VALUE);
	const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

	const [spancoSelected, setSpancoSelected] = useState<SpancoStage[]>([]);
	const [percentualeMap, setPercentualeMap] = useState("");
	const [importoMinMap, setImportoMinMap] = useState("");
	const [importoMaxMap, setImportoMaxMap] = useState("");

	const mapExportFilters: NegotiationsMapFilters | undefined = useMemo(() => {
		const hasSpanco = spancoSelected.length > 0;
		const hasPercentuale = percentualeMap !== "";
		const hasMin = importoMinMap !== "" && !Number.isNaN(Number(importoMinMap));
		const hasMax = importoMaxMap !== "" && !Number.isNaN(Number(importoMaxMap));
		if (!(hasSpanco || hasPercentuale || hasMin || hasMax)) {
			return undefined;
		}
		return {
			...(hasSpanco && { spanco: spancoSelected }),
			...(hasPercentuale && { percentuale: Number(percentualeMap) }),
			...(hasMin && { importo_min: Number(importoMinMap) }),
			...(hasMax && { importo_max: Number(importoMaxMap) }),
		};
	}, [spancoSelected, percentualeMap, importoMinMap, importoMaxMap]);

	const userIdParam =
		selectedMemberId != null && selectedMemberId !== ""
			? Number(selectedMemberId)
			: undefined;

	const fetchKeyRef = useRef(0);
	/** Aggiorna l'anno di default al primo load e quando cambia il venditore selezionato. */
	const memberScopeRef = useRef<number | "all" | null>(null);

	useEffect(() => {
		let cancelled = false;
		const seq = ++fetchKeyRef.current;
		setLoading(true);
		setError(null);

		getTeamMonthlyStatistics(accessToken, teamId, {
			user_id: userIdParam,
		}).then((result) => {
			if (cancelled || seq !== fetchKeyRef.current) {
				return;
			}
			setLoading(false);
			if ("error" in result) {
				setStats(null);
				setError(result.error);
				return;
			}
			setStats(result.data);
			setError(null);
			const scope: number | "all" = userIdParam ?? "all";
			const memberFilterChanged =
				memberScopeRef.current === null || memberScopeRef.current !== scope;
			memberScopeRef.current = scope;

			const years = result.data.years ?? [];
			let nextYear = STORICO_VALUE;
			if (years.length === 0) {
				nextYear = STORICO_VALUE;
			} else {
				const sorted = [...years].sort((a, b) => a - b);
				const lastYear = sorted.at(-1);
				nextYear = lastYear != null ? String(lastYear) : STORICO_VALUE;
			}
			if (memberFilterChanged) {
				setSelectedYear(nextYear);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [accessToken, teamId, userIdParam]);

	const chartData: MonthlyChartDatum[] = useMemo(() => {
		if (!stats) {
			return [];
		}
		const raw: MonthlyNegotiationDatum[] =
			selectedYear === STORICO_VALUE
				? stats.storico
				: (stats.data[selectedYear] ?? stats.storico);
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

	const yearOptions = useMemo(() => {
		if (!stats?.years) {
			return [];
		}
		const opts = [...stats.years]
			.sort((a, b) => b - a)
			.map((y) => ({ value: String(y), label: String(y) }));
		opts.push({ value: STORICO_VALUE, label: "Storico" });
		return opts;
	}, [stats?.years]);

	const handleSpancoToggle = useCallback((stage: SpancoStage) => {
		setSpancoSelected((prev) =>
			prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
		);
	}, []);

	const [exportBusy, setExportBusy] = useState<null | "pdf" | "excel" | "map">(
		null
	);
	/** Filtri export mappa: dialog desktop / sheet mobile (stesso pattern di Aggiungi cliente). */
	const [mapExportDialogOpen, setMapExportDialogOpen] = useState(false);

	const isMobile = useIsMobile();

	const runExport = useCallback(
		async (kind: "pdf" | "excel" | "map"): Promise<boolean> => {
			setExportBusy(kind);
			let result:
				| { ok: true }
				| {
						error: string;
				  };
			if (kind === "pdf") {
				result = await downloadTeamStatisticsExportPdf(accessToken, teamId, {
					year: selectedYear === STORICO_VALUE ? undefined : selectedYear,
					user_id: userIdParam,
				});
			} else if (kind === "excel") {
				result = await downloadTeamNegotiationsExportExcel(
					accessToken,
					teamId,
					{
						user_id: userIdParam,
					}
				);
			} else {
				result = await downloadTeamNegotiationsExportMap(accessToken, teamId, {
					user_id: userIdParam,
					filters: mapExportFilters,
				});
			}
			setExportBusy(null);
			if ("error" in result) {
				toast.error(result.error);
				return false;
			}
			toast.success("Download avviato");
			return true;
		},
		[accessToken, teamId, selectedYear, userIdParam, mapExportFilters]
	);

	/** Chiude il foglio filtri mappa solo dopo export riuscito; durante download non si chiude dal backdrop. */
	const handleMapExportDialogOpenChange = useCallback(
		(open: boolean) => {
			if (!open && exportBusy === "map") {
				return;
			}
			setMapExportDialogOpen(open);
		},
		[exportBusy]
	);

	const handleConfirmMapExport = useCallback(async () => {
		const ok = await runExport("map");
		if (ok) {
			setMapExportDialogOpen(false);
		}
	}, [runExport]);

	const yearCaption = selectedYear === STORICO_VALUE ? "Storico" : selectedYear;

	if (loading && !stats) {
		return (
			<section
				aria-busy="true"
				aria-label="Statistiche mensili team"
				className="flex min-w-0 flex-col gap-4 rounded-2xl bg-card px-7.5 py-10"
			>
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-10 w-full max-w-md" />
				<div className="flex flex-col gap-4 md:hidden">
					{[1, 2, 3, 4].map((key) => (
						<Skeleton className="h-[220px] rounded-2xl" key={key} />
					))}
				</div>
				<div className="hidden grid-cols-2 gap-4 md:grid">
					<Skeleton className="h-[280px] rounded-2xl" />
					<Skeleton className="h-[280px] rounded-2xl" />
				</div>
			</section>
		);
	}

	if (error) {
		return (
			<section
				aria-label="Statistiche mensili team"
				className="flex min-w-0 flex-col gap-2 rounded-2xl bg-card px-7.5 py-10"
			>
				<p className="text-destructive text-sm" role="alert">
					{error}
				</p>
			</section>
		);
	}

	if (!stats) {
		return null;
	}

	return (
		<section
			aria-label="Statistiche mensili e export team"
			className="flex min-w-0 flex-col gap-4 rounded-2xl bg-card px-7.5 py-10"
		>
			<h2 className="font-medium text-2xl text-card-foreground">
				Andamento mensile team
			</h2>

			<div className="flex flex-wrap items-center gap-2">
				<Select.Root
					onValueChange={(value) => {
						setSelectedMemberId(value);
					}}
					value={selectedMemberId}
				>
					<Select.Trigger
						aria-label="Filtra per venditore"
						className={cn(
							"flex h-10 w-fit min-w-40 items-center justify-between gap-2 rounded-full border-0 px-3.75 py-1.75 font-normal text-sm outline-none transition-colors focus-visible:outline-none",
							TRATTATIVE_HEADER_FILTER_BG,
							TRATTATIVE_HEADER_FILTER_BG_POPUP_OPEN
						)}
					>
						<span className="font-medium text-muted-foreground text-sm">
							Venditore
						</span>
						<Select.Value placeholder="Tutti">
							{(value: string | null) => {
								if (value === null) {
									return "Tutti";
								}
								const m = (stats.members ?? []).find(
									(mem: TeamMonthlyMember) => String(mem.id) === value
								);
								return m ? `${m.nome} ${m.cognome}`.trim() : "Tutti";
							}}
						</Select.Value>
						<Select.Icon className="text-button-secondary">
							<ChevronDown aria-hidden className="size-3.5" />
						</Select.Icon>
					</Select.Trigger>
					<Select.Portal>
						<Select.Positioner
							alignItemWithTrigger={false}
							className="z-50 max-h-80 min-w-48 rounded-2xl text-popover-foreground shadow-xl"
							sideOffset={8}
						>
							<Select.Popup className="max-h-80 overflow-y-auto rounded-2xl bg-popover p-1">
								<Select.List className="flex flex-col gap-1">
									<Select.Item
										className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent"
										value={null}
									>
										<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
											<CheckIcon aria-hidden className="size-4" />
										</Select.ItemIndicator>
										<Select.ItemText>Tutti</Select.ItemText>
									</Select.Item>
									{(stats.members ?? []).map((mem: TeamMonthlyMember) => (
										<Select.Item
											className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent"
											key={mem.id}
											value={String(mem.id)}
										>
											<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
												<CheckIcon aria-hidden className="size-4" />
											</Select.ItemIndicator>
											<Select.ItemText>
												{`${mem.nome} ${mem.cognome}`.trim()}
											</Select.ItemText>
										</Select.Item>
									))}
								</Select.List>
							</Select.Popup>
						</Select.Positioner>
					</Select.Portal>
				</Select.Root>

				<Select.Root
					onValueChange={(v) => {
						if (v !== null) {
							setSelectedYear(v);
						}
					}}
					value={selectedYear}
				>
					<Select.Trigger
						aria-label="Seleziona anno"
						className={cn(
							"flex h-10 w-fit items-center justify-between gap-2 rounded-full border-0 px-3.75 py-1.75 font-normal text-sm outline-none transition-colors focus-visible:outline-none",
							TRATTATIVE_HEADER_FILTER_BG,
							TRATTATIVE_HEADER_FILTER_BG_POPUP_OPEN
						)}
					>
						<span className="font-medium text-muted-foreground text-sm">
							Anno
						</span>
						<Select.Value placeholder="—">
							{(value: string | null) => {
								if (!value) {
									return "—";
								}
								const o = yearOptions.find((x) => x.value === value);
								return o?.label ?? value;
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
								<Select.List className="flex flex-col gap-1">
									{yearOptions.map((opt) => (
										<Select.Item
											className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent"
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
			</div>

			<div className="flex flex-wrap gap-2">
				<button
					aria-busy={exportBusy === "pdf"}
					className={EXPORT_ACTION_PILL_BUTTON_CLASS}
					disabled={exportBusy !== null}
					onClick={async () => {
						await runExport("pdf");
					}}
					type="button"
				>
					{exportBusy === "pdf" ? (
						<Spinner className="shrink-0 text-card-foreground" size="sm" />
					) : (
						<IconDesignFileDownloadFill18 className="size-4 shrink-0 text-button-secondary" />
					)}
					Esporta PDF
				</button>
				<button
					aria-busy={exportBusy === "excel"}
					className={EXPORT_ACTION_PILL_BUTTON_CLASS}
					disabled={exportBusy !== null}
					onClick={async () => {
						await runExport("excel");
					}}
					type="button"
				>
					{exportBusy === "excel" ? (
						<Spinner className="shrink-0 text-card-foreground" size="sm" />
					) : (
						<IconFileDownloadFill18 className="size-4 shrink-0 text-button-secondary" />
					)}
					Esporta Excel
				</button>
				<button
					className={EXPORT_ACTION_PILL_BUTTON_CLASS}
					disabled={exportBusy !== null}
					onClick={() => setMapExportDialogOpen(true)}
					type="button"
				>
					<IconPinFill18 className="size-4 shrink-0 text-button-secondary" />
					Esporta Mappa
				</button>
			</div>

			{/* Filtri opzionali map export: solo dopo tap su “Esporta mappa”; sheet su mobile, dialog su desktop. */}
			<Dialog.Root
				disablePointerDismissal={exportBusy === "map"}
				onOpenChange={handleMapExportDialogOpenChange}
				open={mapExportDialogOpen}
			>
				<Dialog.Portal>
					<Dialog.Backdrop
						aria-hidden
						className="data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/50 data-closed:animate-out data-open:animate-in"
					/>
					<div
						className={cn(
							"fixed inset-0 z-50 flex p-4",
							isMobile
								? "items-end justify-center"
								: "items-center justify-center"
						)}
					>
						<Dialog.Popup
							aria-describedby="team-map-export-dialog-desc"
							aria-labelledby="team-map-export-dialog-title"
							className={cn(
								"flex max-h-[90vh] flex-col overflow-hidden bg-card text-card-foreground shadow-[0_18px_45px_rgba(15,23,42,0.55)] outline-none data-closed:animate-out data-open:animate-in",
								isMobile
									? "data-closed:fade-out-0 data-closed:slide-out-to-bottom-4 data-open:fade-in-0 data-open:slide-in-from-bottom-4 fixed inset-x-[10px] bottom-[10px] max-w-none rounded-[36px] px-6 py-5"
									: "data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95 w-full max-w-lg rounded-3xl px-6 py-5"
							)}
						>
							<Dialog.Title
								className="sr-only"
								id="team-map-export-dialog-title"
							>
								Filtri export mappa
							</Dialog.Title>
							<p className="sr-only" id="team-map-export-dialog-desc">
								Opzionali: Spanco, percentuale e fascia di importo; poi scarica
								la mappa HTML.
							</p>
							<div
								className={cn(
									isMobile
										? "min-h-0 flex-1 overflow-y-auto"
										: "overflow-y-auto"
								)}
							>
								<div className="flex items-center justify-between gap-3 pb-4">
									<h2 className="font-bold text-2xl text-card-foreground tracking-tight">
										Esporta Mappa
									</h2>
									<Dialog.Close
										aria-label="Chiudi"
										className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-table-header text-card-foreground transition-transform hover:bg-table-hover focus:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:pointer-events-none disabled:opacity-50"
										disabled={exportBusy === "map"}
										type="button"
									>
										<X aria-hidden className="size-4" />
									</Dialog.Close>
								</div>
								<div className="flex flex-col gap-3">
									<div className="flex flex-col gap-1.5 rounded-2xl bg-input px-3 py-2">
										<span className="font-medium text-sm text-stats-title">
											Spanco
										</span>
										<div className="flex flex-col gap-1">
											{SPANCO_OPTIONS.map((stage) => (
												<label
													className="flex cursor-pointer items-center gap-2 text-sm"
													key={stage}
												>
													<input
														checked={spancoSelected.includes(stage)}
														className="h-4 w-4 rounded border-input"
														onChange={() => handleSpancoToggle(stage)}
														type="checkbox"
													/>
													{SPANCO_FILTER_LABELS[stage]}
												</label>
											))}
										</div>
									</div>
									<div className="flex flex-col gap-1">
										<span className="font-medium text-sm text-stats-title">
											Percentuale
										</span>
										<Select.Root
											onValueChange={(value) =>
												setPercentualeMap(value === null ? "" : String(value))
											}
											value={percentualeMap === "" ? null : percentualeMap}
										>
											<Select.Trigger className="flex h-10 w-full items-center justify-between gap-2 rounded-full border-0 bg-input px-3.75 py-1.75 text-sm outline-none">
												<Select.Value placeholder="Tutti">
													{(v: string | null) => (v ? `${v}%` : "Tutti")}
												</Select.Value>
												<ChevronDown aria-hidden className="size-3.5" />
											</Select.Trigger>
											<Select.Portal>
												<Select.Positioner
													className="z-[60] rounded-2xl bg-popover p-1 shadow-xl"
													sideOffset={6}
												>
													<Select.Popup>
														<Select.List>
															{PERCENTUALE_MAP_OPTIONS.map((o) => (
																<Select.Item
																	className="cursor-pointer rounded-lg px-3 py-2 text-sm data-highlighted:bg-accent"
																	key={o.value || "all"}
																	value={o.value === "" ? null : o.value}
																>
																	<Select.ItemText>{o.label}</Select.ItemText>
																</Select.Item>
															))}
														</Select.List>
													</Select.Popup>
												</Select.Positioner>
											</Select.Portal>
										</Select.Root>
									</div>
									<div className="flex flex-wrap gap-2">
										<label
											className="flex flex-1 flex-col gap-1 text-sm"
											htmlFor="team-map-imin"
										>
											Da €
											<Input
												className="bg-input"
												id="team-map-imin"
												inputMode="decimal"
												onChange={(e) => setImportoMinMap(e.target.value)}
												placeholder="Min"
												type="number"
												value={importoMinMap}
											/>
										</label>
										<label
											className="flex flex-1 flex-col gap-1 text-sm"
											htmlFor="team-map-imax"
										>
											A €
											<Input
												className="bg-input"
												id="team-map-imax"
												inputMode="decimal"
												onChange={(e) => setImportoMaxMap(e.target.value)}
												placeholder="Max"
												type="number"
												value={importoMaxMap}
											/>
										</label>
									</div>
									<div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
										<Button
											className="h-10 rounded-xl text-sm"
											disabled={exportBusy === "map"}
											onClick={() => {
												setSpancoSelected([]);
												setPercentualeMap("");
												setImportoMinMap("");
												setImportoMaxMap("");
											}}
											type="button"
											variant="outline"
										>
											Reimposta filtri
										</Button>
										<Button
											className="h-10 min-w-[8.5rem] rounded-2xl text-sm sm:min-w-[10rem]"
											disabled={exportBusy !== null}
											onClick={async () => {
												await handleConfirmMapExport();
											}}
											type="button"
										>
											<span className="flex h-5 items-center justify-center gap-2">
												{exportBusy === "map" ? (
													<Spinner
														className="shrink-0 text-primary-foreground"
														size="sm"
													/>
												) : null}
												<span>Scarica mappa</span>
											</span>
										</Button>
									</div>
								</div>
							</div>
						</Dialog.Popup>
					</div>
				</Dialog.Portal>
			</Dialog.Root>

			<div className="flex flex-col gap-4 md:hidden">
				<div className="stat-card-bg flex min-w-0 flex-col gap-2 rounded-2xl bg-background p-4">
					<h3 className="font-medium text-card-foreground text-sm">
						Importo aperte (€)
					</h3>
					<div className="min-h-[200px] min-w-0 py-1">
						<MobileMonthlySingleSeriesColumns
							barColor={TEAM_OPEN_FILL}
							chartData={chartData}
							formatValue={formatAmount}
							getValue={(row) => row.open_amount}
							seriesLabel="Importo aperte"
							sheetDescription="Importo delle trattative aperte nel mese."
							yearCaption={yearCaption}
							yMax={yMaxOpenAmount}
						/>
					</div>
				</div>
				<div className="stat-card-bg flex min-w-0 flex-col gap-2 rounded-2xl bg-background p-4">
					<h3 className="font-medium text-card-foreground text-sm">
						Importo concluse (€)
					</h3>
					<div className="min-h-[200px] min-w-0 py-1">
						<MobileMonthlySingleSeriesColumns
							barColor={TEAM_CONCLUDED_FILL}
							chartData={chartData}
							formatValue={formatAmount}
							getValue={(row) => row.concluded_amount}
							seriesLabel="Importo concluse"
							sheetDescription="Importo delle trattative concluse nel mese."
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
							barColor={TEAM_OPEN_FILL}
							chartData={chartData}
							formatValue={(v) => String(v)}
							getValue={(row) => row.open_count}
							integerScale
							seriesLabel="N. aperte"
							sheetDescription="Conteggio trattative aperte nel mese."
							yearCaption={yearCaption}
							yMax={yMaxOpenCount}
						/>
					</div>
				</div>
				<div className="stat-card-bg flex min-w-0 flex-col gap-2 rounded-2xl bg-background p-4">
					<h3 className="font-medium text-card-foreground text-sm">
						Numero trattative concluse
					</h3>
					<div className="min-h-[200px] min-w-0 py-1">
						<MobileMonthlySingleSeriesColumns
							barColor={TEAM_CONCLUDED_FILL}
							chartData={chartData}
							formatValue={(v) => String(v)}
							getValue={(row) => row.concluded_count}
							integerScale
							seriesLabel="N. concluse"
							sheetDescription="Conteggio trattative concluse nel mese."
							yearCaption={yearCaption}
							yMax={yMaxConcludedCount}
						/>
					</div>
				</div>
			</div>

			<div className="hidden grid-cols-2 gap-4 md:grid">
				<div className="stat-card-bg flex min-w-0 flex-col gap-2 rounded-2xl bg-background p-4">
					<h3 className="font-medium text-card-foreground text-sm">
						Importo mensile (€) — aperte vs concluse
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
									axisLine={false}
									tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
									tickFormatter={(value) =>
										formatDesktopAmountAxisLabel(Number(value))
									}
									tickLine={false}
									width={44}
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
									fill={TEAM_OPEN_FILL}
									fillOpacity={0.9}
									name="Aperte"
									radius={[8, 8, 8, 8]}
								>
									<LabelList
										className="font-semibold text-[10px] text-card-foreground tabular-nums"
										dataKey="open_amount"
										formatter={(value) =>
											formatDesktopAmountAxisLabel(Number(value ?? 0))
										}
										position="top"
									/>
								</Bar>
								<Bar
									dataKey="concluded_amount"
									fill={TEAM_CONCLUDED_FILL}
									fillOpacity={0.9}
									name="Concluse"
									radius={[8, 8, 8, 8]}
								>
									<LabelList
										className="font-semibold text-[10px] text-card-foreground tabular-nums"
										dataKey="concluded_amount"
										formatter={(value) =>
											formatDesktopAmountAxisLabel(Number(value ?? 0))
										}
										position="top"
									/>
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
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
								<YAxis
									axisLine={false}
									tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
									tickFormatter={(value) => String(Math.round(Number(value)))}
									tickLine={false}
									width={38}
								/>
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
									fill={TEAM_OPEN_FILL}
									fillOpacity={0.9}
									name="Aperte"
									radius={[8, 8, 8, 8]}
								>
									<LabelList
										className="font-semibold text-[10px] text-card-foreground tabular-nums"
										dataKey="open_count"
										formatter={(value) =>
											String(Math.round(Number(value ?? 0)))
										}
										position="top"
									/>
								</Bar>
								<Bar
									dataKey="concluded_count"
									fill={TEAM_CONCLUDED_FILL}
									fillOpacity={0.9}
									name="Concluse"
									radius={[8, 8, 8, 8]}
								>
									<LabelList
										className="font-semibold text-[10px] text-card-foreground tabular-nums"
										dataKey="concluded_count"
										formatter={(value) =>
											String(Math.round(Number(value ?? 0)))
										}
										position="top"
									/>
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>
		</section>
	);
}
