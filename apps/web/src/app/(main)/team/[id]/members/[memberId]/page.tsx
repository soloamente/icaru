"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Select } from "@base-ui/react/select";
import { format as formatDate } from "date-fns";
import { ChevronDown, Search, X } from "lucide-react";
import { AnimateNumber } from "motion-plus/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { DateRange as DayPickerDateRange } from "react-day-picker";
import { Drawer } from "vaul";
import { DateRangeFilter } from "@/components/date-range-filter";
import {
	CheckIcon,
	IconChartBarTrendUp,
	IconCirclePlusFilled,
	IconFilePlusFill18,
	IconQuickstartFill18,
	IconSackDollarFill18,
	IconTarget,
	IconUTurnToLeft,
	IconVault3Fill18,
} from "@/components/icons";
import CircleXmarkFilled from "@/components/icons/circle-xmark-filled";
import Loader from "@/components/loader";
import { TeamMemberNegotiationsMap } from "@/components/negotiations-map";
import { SpancoDonutChart } from "@/components/spanco-donut-chart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
	getTeam,
	getTeamMemberSpancoStatistics,
	getTeamMemberStatistics,
	listTeamMemberNegotiations,
} from "@/lib/api/client";
import type {
	ApiNegotiation,
	ApiTeam,
	SpancoStage,
	SpancoStatistics,
	TeamMemberStatistics,
} from "@/lib/api/types";
import { useAuthOptional } from "@/lib/auth/auth-context";
import {
	GREEN_STATUS_PILL_LIGHT_CLASSES,
	RED_STATUS_PILL_LIGHT_CLASSES,
	SKY_STATUS_PILL_LIGHT_CLASSES,
} from "@/lib/pill-surface-classes";
import {
	isNegotiationAbandoned,
	isNegotiationCompleted,
} from "@/lib/trattative-utils";
import { cn } from "@/lib/utils";

/** SPANCO stage colors for the percentuale progress bar (track + fill). Matches trattative-table. */
const SPANCO_STAGE_COLORS: Record<
	SpancoStage,
	{ main: string; softBg: string }
> = {
	P: {
		main: "oklch(0.6994 0.1754 51.79)",
		softBg: "oklch(0.6994 0.1754 51.79 / 0.12)",
	},
	S: {
		main: "oklch(0.5575 0.0165 244.89)",
		softBg: "oklch(0.5575 0.0165 244.89 / 0.12)",
	},
	A: {
		main: "oklch(0.8114 0.1654 84.92)",
		softBg: "oklch(0.8114 0.1654 84.92 / 0.12)",
	},
	C: {
		main: "oklch(0.5915 0.202 21.24)",
		softBg: "oklch(0.5915 0.202 21.24 / 0.12)",
	},
	O: {
		main: "oklch(0.5315 0.1179 157.23)",
		softBg: "oklch(0.5315 0.1179 157.23 / 0.12)",
	},
	N: {
		main: "oklch(0.5782 0.2282 260.03)",
		softBg: "oklch(0.5782 0.2282 260.03 / 0.12)",
	},
};

/** SPANCO stage labels for filter dropdown. */
const SPANCO_LABELS: Record<SpancoStage, string> = {
	S: "S",
	P: "P",
	A: "A",
	N: "N",
	C: "C",
	O: "O",
};

/** Extracts YYYY-MM-DD from date string for robust comparison. */
function toDateOnlyString(dateStr: string | undefined): string | null {
	if (!dateStr) {
		return null;
	}
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) {
		return null;
	}
	return formatDate(d, "yyyy-MM-dd");
}

/** Checks if date falls within range (date-only comparison). Both from and to required to apply filter. */
function isDateInRange(
	dateStr: string | undefined,
	range: DayPickerDateRange | undefined
): boolean {
	if (!(range?.from && range?.to)) {
		return true;
	}
	const dateOnly = toDateOnlyString(dateStr);
	if (!dateOnly) {
		return false;
	}
	const fromStr = formatDate(range.from, "yyyy-MM-dd");
	const toStr = formatDate(range.to, "yyyy-MM-dd");
	return dateOnly >= fromStr && dateOnly <= toStr;
}

/** Member supervision shows all states; date filters: apertura (all), chiusura (concluse only), abbandono (abbandonate only). */
function negotiationMatchesDateFilters(
	n: ApiNegotiation,
	dateRangeApertura: DayPickerDateRange | undefined,
	dateRangeChiusura: DayPickerDateRange | undefined,
	dateRangeAbbandono: DayPickerDateRange | undefined
): boolean {
	const apertura = n.data_apertura ?? n.created_at ?? undefined;
	const chiusura = n.data_chiusura ?? n.updated_at ?? undefined;
	const abbandono = n.data_abbandono ?? n.updated_at ?? undefined;

	if (
		dateRangeApertura?.from &&
		dateRangeApertura?.to &&
		!isDateInRange(apertura, dateRangeApertura)
	) {
		return false;
	}
	// Chiusura: only applies to concluded negotiations
	if (
		isNegotiationCompleted(n) &&
		dateRangeChiusura?.from &&
		dateRangeChiusura?.to &&
		!isDateInRange(chiusura, dateRangeChiusura)
	) {
		return false;
	}
	// Abbandono: only applies to abandoned negotiations
	if (
		isNegotiationAbandoned(n) &&
		dateRangeAbbandono?.from &&
		dateRangeAbbandono?.to &&
		!isDateInRange(abbandono, dateRangeAbbandono)
	) {
		return false;
	}
	return true;
}

function passesSpancoFilter(
	n: ApiNegotiation,
	spancoFilter: SpancoStage | "all"
): boolean {
	return spancoFilter === "all" || n.spanco === spancoFilter;
}

const isNegotiationOpen = (n: ApiNegotiation): boolean =>
	!(isNegotiationAbandoned(n) || isNegotiationCompleted(n));

function passesStatoFilter(
	n: ApiNegotiation,
	statoFilter: "all" | "aperta" | "conclusa" | "abbandonata"
): boolean {
	if (statoFilter === "all") {
		return true;
	}
	if (statoFilter === "aperta") {
		return isNegotiationOpen(n);
	}
	if (statoFilter === "conclusa") {
		return isNegotiationCompleted(n);
	}
	if (statoFilter === "abbandonata") {
		return isNegotiationAbandoned(n);
	}
	return true;
}

/** Simple EUR formatter reused for KPI and table values. */
function formatCurrency(value: number): string {
	return new Intl.NumberFormat("it-IT", {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}

/** Clamp percentuale value to the 0–100 range defensively. */
function clampPercentuale(value: number | null | undefined): number {
	if (value == null || Number.isNaN(value)) {
		return 0;
	}
	return Math.min(100, Math.max(0, value));
}

/** Format ISO date into short it-IT date, with fallback. */
function formatNegotiationDate(date: string | undefined): string {
	if (!date) {
		return "—";
	}
	const parsed = new Date(date);
	if (Number.isNaN(parsed.getTime())) {
		return date;
	}
	return parsed.toLocaleDateString("it-IT");
}

/** Derived UI status for a negotiation (open / concluded / abandoned). Matches trattative-table pill icons. */
function getNegotiationStatus(negotiation: ApiNegotiation): {
	label: string;
	classes: string;
	icon: "check" | "close" | "circle-plus";
} {
	const isAbandoned = negotiation.abbandonata;
	const isCompleted =
		negotiation.spanco === "O" || negotiation.percentuale === 100;

	if (isAbandoned) {
		return {
			label: "Abbandonata",
			classes: RED_STATUS_PILL_LIGHT_CLASSES,
			icon: "close",
		};
	}
	if (isCompleted) {
		return {
			label: "Conclusa",
			classes: GREEN_STATUS_PILL_LIGHT_CLASSES,
			icon: "check",
		};
	}
	return {
		label: "Aperta",
		classes: SKY_STATUS_PILL_LIGHT_CLASSES,
		icon: "circle-plus",
	};
}

/** Main supervision page for a single team member (venditore). */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: page-level component with KPI, map, SPANCO chart, table and dialog
export default function TeamMemberSupervisionPage() {
	const auth = useAuthOptional();
	const router = useRouter();
	const params = useParams();
	const isMobile = useIsMobile();

	const [mounted, setMounted] = useState(false);

	// Dynamic segments: Next uses [id] for team (same as team/[id] detail page).
	const teamId = typeof params?.id === "string" ? Number(params.id) : null;
	const memberId =
		typeof params?.memberId === "string" ? Number(params.memberId) : null;

	const [team, setTeam] = useState<ApiTeam | null>(null);
	const [memberStats, setMemberStats] = useState<TeamMemberStatistics | null>(
		null
	);
	const [memberStatsError, setMemberStatsError] = useState<string | null>(null);
	const [isMemberStatsLoading, setIsMemberStatsLoading] = useState(false);

	const [spancoStats, setSpancoStats] = useState<SpancoStatistics | null>(null);
	const [spancoError, setSpancoError] = useState<string | null>(null);
	const [isSpancoLoading, setIsSpancoLoading] = useState(false);

	const [negotiations, setNegotiations] = useState<ApiNegotiation[]>([]);
	const [negotiationsError, setNegotiationsError] = useState<string | null>(
		null
	);
	const [isNegotiationsLoading, setIsNegotiationsLoading] = useState(false);
	// Local search term for filtering the member's negotiations table.
	const [searchTerm, setSearchTerm] = useState("");
	// Filters: date ranges, SPANCO, stato (same pattern as trattative page).
	const [dateRangeApertura, setDateRangeApertura] = useState<
		DayPickerDateRange | undefined
	>(undefined);
	const [dateRangeChiusura, setDateRangeChiusura] = useState<
		DayPickerDateRange | undefined
	>(undefined);
	const [dateRangeAbbandono, setDateRangeAbbandono] = useState<
		DayPickerDateRange | undefined
	>(undefined);
	const [spancoFilter, setSpancoFilter] = useState<SpancoStage | "all">("all");
	const [statoFilter, setStatoFilter] = useState<
		"all" | "aperta" | "conclusa" | "abbandonata"
	>("all");

	// Read-only detail dialog: director views negotiation in a dialog instead of navigating to edit page.
	const [selectedNegotiation, setSelectedNegotiation] =
		useState<ApiNegotiation | null>(null);
	const [detailDialogOpen, setDetailDialogOpen] = useState(false);

	// Single page-level error for hard failures (es. 403 supervisione).
	const [pageError, setPageError] = useState<string | null>(null);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Redirect unauthenticated users to login like other main pages.
	useEffect(() => {
		if (auth?.isLoaded && !auth?.user) {
			router.replace("/login");
		}
	}, [auth?.isLoaded, auth?.user, router]);

	// Basic guards on route params.
	useEffect(() => {
		if (teamId == null || Number.isNaN(teamId)) {
			router.replace("/team");
		}
		if (memberId == null || Number.isNaN(memberId)) {
			router.replace("/team");
		}
	}, [teamId, memberId, router]);

	// Fetch team to derive member name for header (fallback when stats payload
	// does not include user profile fields).
	useEffect(() => {
		if (!(auth?.token && teamId != null && !Number.isNaN(teamId))) {
			return;
		}
		let cancelled = false;

		getTeam(auth.token, teamId).then((result) => {
			if (cancelled) {
				return;
			}
			if ("error" in result) {
				// Non blocchiamo l'intera pagina qui: l'utente può comunque
				// vedere le statistiche del membro se le API di supervisione funzionano.
				return;
			}
			setTeam(result.data);
		});

		return () => {
			cancelled = true;
		};
	}, [auth?.token, teamId]);

	// Fetch KPI statistics for the member.
	useEffect(() => {
		if (
			!(auth?.token && teamId != null && memberId != null) ||
			Number.isNaN(teamId) ||
			Number.isNaN(memberId)
		) {
			return;
		}
		let cancelled = false;
		setIsMemberStatsLoading(true);
		setMemberStatsError(null);
		setPageError(null);

		getTeamMemberStatistics(auth.token, teamId, memberId).then((result) => {
			if (cancelled) {
				return;
			}
			setIsMemberStatsLoading(false);
			if ("error" in result) {
				setMemberStats(null);
				// Conserviamo errori generici in un banner dedicato, ma se il
				// backend restituisce un 403 (es. venditore non nel team) il
				// messaggio sarà già esplicito.
				setMemberStatsError(result.error);
				if (result.error.toLowerCase().includes("403")) {
					setPageError(result.error);
				}
			} else {
				setMemberStats(result.data);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [auth?.token, teamId, memberId]);

	const backHref = `/team/${teamId}`;

	const memberFromTeam = useMemo(() => {
		if (!team) {
			return null;
		}
		return team.users?.find((u) => u.id === memberId) ?? null;
	}, [team, memberId]);

	const memberFullName =
		memberFromTeam != null
			? `${memberFromTeam.nome} ${memberFromTeam.cognome}`
			: "Venditore";

	// Fetch SPANCO statistics for the member.
	useEffect(() => {
		if (
			!(auth?.token && teamId != null && memberId != null) ||
			Number.isNaN(teamId) ||
			Number.isNaN(memberId)
		) {
			return;
		}
		let cancelled = false;
		setIsSpancoLoading(true);
		setSpancoError(null);

		getTeamMemberSpancoStatistics(auth.token, teamId, memberId).then(
			(result) => {
				if (cancelled) {
					return;
				}
				setIsSpancoLoading(false);
				if ("error" in result) {
					setSpancoStats(null);
					setSpancoError(result.error);
				} else {
					setSpancoStats(result.data);
				}
			}
		);

		return () => {
			cancelled = true;
		};
	}, [auth?.token, teamId, memberId]);

	// Fetch negotiations list for the member.
	useEffect(() => {
		if (
			!(auth?.token && teamId != null && memberId != null) ||
			Number.isNaN(teamId) ||
			Number.isNaN(memberId)
		) {
			return;
		}
		let cancelled = false;
		setIsNegotiationsLoading(true);
		setNegotiationsError(null);

		listTeamMemberNegotiations(auth.token, teamId, memberId).then((result) => {
			if (cancelled) {
				return;
			}
			setIsNegotiationsLoading(false);
			if ("error" in result) {
				setNegotiations([]);
				setNegotiationsError(result.error);
			} else {
				setNegotiations(result.data);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [auth?.token, teamId, memberId]);

	if (!(mounted && auth?.isLoaded)) {
		return <Loader />;
	}
	if (!auth?.user) {
		return null;
	}
	if (
		teamId == null ||
		memberId == null ||
		Number.isNaN(teamId) ||
		Number.isNaN(memberId)
	) {
		return null;
	}

	// Apply filters (date, SPANCO, stato, search) client-side to match trattative page behavior.
	const normalizedSearch = searchTerm.trim().toLowerCase();
	const visibleNegotiations = negotiations.filter((n) => {
		if (
			!negotiationMatchesDateFilters(
				n,
				dateRangeApertura,
				dateRangeChiusura,
				dateRangeAbbandono
			)
		) {
			return false;
		}
		if (!passesSpancoFilter(n, spancoFilter)) {
			return false;
		}
		if (!passesStatoFilter(n, statoFilter)) {
			return false;
		}
		if (normalizedSearch === "") {
			return true;
		}
		const clientName = n.client?.ragione_sociale ?? `Cliente #${n.client_id}`;
		const status = getNegotiationStatus(n).label;
		const fields = [
			clientName,
			n.referente ?? "",
			formatNegotiationDate(n.data_apertura ?? n.created_at ?? undefined),
			formatCurrency(n.importo),
			`${clampPercentuale(n.percentuale)}%`,
			status,
		];
		return fields.some((field) =>
			field.toLowerCase().includes(normalizedSearch)
		);
	});

	return (
		<main
			className={cn(
				"flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card pt-6 font-medium sm:m-2.5",
				isMobile ? "m-2 overflow-y-scroll px-4" : "m-3 overflow-y-hidden px-9"
			)}
		>
			{/* Header: back + title */}
			<div className="relative flex w-full flex-col gap-4.5">
				<div className="flex items-center justify-between gap-2.5">
					<div className="flex min-w-0 flex-1 items-center justify-start gap-1">
						<button
							aria-label="Torna al team"
							className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							onClick={() => {
								// biome-ignore lint/suspicious/noExplicitAny: dynamic route string not assignable to Next.js RouteImpl
								router.push(backHref as any);
							}}
							type="button"
						>
							<IconUTurnToLeft
								aria-hidden
								className="size-5 shrink-0"
								size={20}
							/>
						</button>
						<h1
							className="min-w-0 truncate font-medium text-card-foreground text-xl tracking-tight"
							id="team-member-supervision-title"
						>
							Venditore {memberFullName}
						</h1>
					</div>
				</div>
			</div>

			{/* Body shell */}
			<div className="table-container-bg flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-t-3xl px-5.5 pt-6.25 pb-6.25">
				<div className="scroll-fade-y flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
					{/* Page-level error (es. 403) */}
					{pageError && (
						<div className="rounded-lg bg-destructive/10 px-4 py-2 text-center text-destructive text-sm">
							{pageError}
						</div>
					)}

					{/* KPI cards from TeamMemberStatistics — 4 on top row, 2 on bottom for better distribution. */}
					<section
						aria-label="Statistiche trattative del venditore"
						className="flex w-full flex-col gap-3.75"
					>
						{isMemberStatsLoading && !memberStats && (
							<>
								<div className="flex w-full flex-wrap items-stretch gap-3.75">
									{Array.from({ length: 4 }).map((_, i) => (
										<div
											aria-hidden
											className="stat-card-bg flex w-full flex-col gap-2 rounded-4xl bg-card px-7 py-7 sm:flex-1"
											key={`member-stat-skeleton-top-${String(i)}`}
										>
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-8 w-20" />
										</div>
									))}
								</div>
								<div className="flex w-full flex-wrap items-stretch gap-3.75">
									{Array.from({ length: 2 }).map((_, i) => (
										<div
											aria-hidden
											className="stat-card-bg flex w-full flex-col gap-2 rounded-4xl bg-card px-7 py-7 sm:flex-1"
											key={`member-stat-skeleton-bottom-${String(i)}`}
										>
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-8 w-20" />
										</div>
									))}
								</div>
							</>
						)}
						{memberStats && (
							<>
								<div className="flex w-full flex-wrap items-stretch gap-3.75">
									<MemberStatCard
										label="Trattative aperte"
										value={memberStats.total_open_negotiations}
										variant="total-open"
									/>
									<MemberStatCard
										label="Importo totale aperte"
										value={formatCurrency(
											Number(memberStats.total_open_amount)
										)}
										variant="total-open-amount"
									/>
									<MemberStatCard
										label="Importo medio aperte"
										value={formatCurrency(memberStats.average_open_amount)}
										variant="average-open-amount"
									/>
									<MemberStatCard
										label="% conclusione"
										value={`${memberStats.conclusion_percentage.toFixed(1)}%`}
										variant="conclusion-pct"
									/>
								</div>
								<div className="flex w-full flex-wrap items-stretch gap-3.75">
									<MemberStatCard
										label="Giorni medi chiusura"
										value={memberStats.average_closing_days}
										variant="average-closing-days"
									/>
									<MemberStatCard
										label="Importo medio concluse"
										value={formatCurrency(memberStats.average_concluded_amount)}
										variant="average-concluded-amount"
									/>
								</div>
							</>
						)}
						{memberStatsError && !memberStats && (
							<p className="text-destructive text-sm" role="alert">
								{memberStatsError}
							</p>
						)}
					</section>

					{/* SPANCO donut chart for this member */}
					<section className="grid w-full grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
						<div className="flex min-h-0 min-w-0 flex-1 flex-col items-start py-6">
							<TeamMemberNegotiationsMap
								memberId={memberId}
								onNegotiationClick={(n) => {
									setSelectedNegotiation(n);
									setDetailDialogOpen(true);
								}}
								teamId={teamId}
							/>
						</div>
						<div className="flex min-h-0 min-w-0 flex-1 flex-col">
							<SpancoDonutChart
								error={spancoError}
								isLoading={isSpancoLoading}
								stats={spancoStats}
							/>
						</div>
					</section>

					{/* Negotiations table — same layout as trattative page: title on row 1, filters + search on row 2 with justify-between */}
					<section
						aria-label="Trattative del venditore"
						className="flex w-full flex-col gap-2"
					>
						{/* Row 1: title + count on the same line (right aligned) */}
						<div className="flex w-full items-center justify-between gap-4">
							<h2 className="font-medium text-xl">Trattative del venditore</h2>
							{!isNegotiationsLoading && negotiations.length > 0 && (
								<span className="shrink-0 text-muted-foreground text-sm">
									<AnimateNumber className="tabular-nums">
										{visibleNegotiations.length}
									</AnimateNumber>{" "}
									trattative trovate
								</span>
							)}
						</div>
						{/* Row 2: filters (left) + search overlaying on top so it opens above filters (z-index) */}
						<div className="relative flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
							{/* Filters: date apertura, chiusura, abbandono, SPANCO, stato — same pill style as trattative */}
							<div className="scroll-fade-x flex w-full items-center justify-start gap-1.25 overflow-x-auto sm:overflow-visible">
								<DateRangeFilter
									align="start"
									dateRange={dateRangeApertura}
									label="Filtra per data apertura"
									onDateRangeChange={setDateRangeApertura}
									variant="table"
								/>
								<DateRangeFilter
									align="start"
									dateRange={dateRangeChiusura}
									label="Filtra per data chiusura"
									onDateRangeChange={setDateRangeChiusura}
									variant="table"
								/>
								<DateRangeFilter
									align="start"
									dateRange={dateRangeAbbandono}
									label="Filtra per data abbandono"
									onDateRangeChange={setDateRangeAbbandono}
									variant="table"
								/>
								<Select.Root
									onValueChange={(value) => {
										if (value === null) {
											setSpancoFilter("all");
											return;
										}
										setSpancoFilter(value as SpancoStage);
									}}
									value={spancoFilter === "all" ? null : spancoFilter}
								>
									<Select.Trigger
										className="flex w-fit shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-full border-0 bg-card px-3.75 py-1.75 font-normal text-sm outline-none transition-colors focus-visible:outline-none data-popup-open:bg-card sm:shrink-0"
										id="member-neg-spanco-filter"
									>
										<Select.Value
											className="data-placeholder:text-stats-title"
											placeholder="Filtra per SPANCO"
										>
											{(value: SpancoStage | null) =>
												value
													? `Solo ${SPANCO_LABELS[value]}`
													: "Filtra per SPANCO"
											}
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
													<Select.Item
														className="relative flex cursor-default select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-accent-foreground data-selected:text-accent-foreground"
														value={null}
													>
														<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
															<CheckIcon aria-hidden className="size-4" />
														</Select.ItemIndicator>
														<Select.ItemText>
															Tutte le fasi SPANCO
														</Select.ItemText>
													</Select.Item>
													{(Object.keys(SPANCO_LABELS) as SpancoStage[]).map(
														(stage) => (
															<Select.Item
																className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-accent-foreground data-selected:text-accent-foreground"
																key={stage}
																value={stage}
															>
																<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
																	<CheckIcon aria-hidden className="size-4" />
																</Select.ItemIndicator>
																<Select.ItemText>
																	{`Solo ${SPANCO_LABELS[stage]}`}
																</Select.ItemText>
															</Select.Item>
														)
													)}
												</Select.List>
											</Select.Popup>
										</Select.Positioner>
									</Select.Portal>
								</Select.Root>
								<Select.Root
									onValueChange={(value) => {
										if (value === null) {
											setStatoFilter("all");
											return;
										}
										setStatoFilter(
											value as "aperta" | "conclusa" | "abbandonata"
										);
									}}
									value={statoFilter === "all" ? null : statoFilter}
								>
									<Select.Trigger
										className="flex w-fit shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-full border-0 bg-card px-3.75 py-1.75 font-normal text-sm outline-none transition-colors focus-visible:outline-none data-popup-open:bg-card"
										id="member-neg-stato-filter"
									>
										<Select.Value
											className="data-placeholder:text-stats-title"
											placeholder="Filtra per stato"
										>
											{(
												value: "aperta" | "conclusa" | "abbandonata" | null
											) => {
												if (!value) {
													return "Filtra per stato";
												}
												if (value === "aperta") {
													return "Solo Aperte";
												}
												if (value === "conclusa") {
													return "Solo Concluse";
												}
												return "Solo Abbandonate";
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
													<Select.Item
														className="relative flex cursor-default select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-accent-foreground data-selected:text-accent-foreground"
														value={null}
													>
														<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
															<CheckIcon aria-hidden className="size-4" />
														</Select.ItemIndicator>
														<Select.ItemText>Tutti gli stati</Select.ItemText>
													</Select.Item>
													<Select.Item
														className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-accent-foreground data-selected:text-accent-foreground"
														value="aperta"
													>
														<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
															<CheckIcon aria-hidden className="size-4" />
														</Select.ItemIndicator>
														<Select.ItemText>Solo Aperte</Select.ItemText>
													</Select.Item>
													<Select.Item
														className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-accent-foreground data-selected:text-accent-foreground"
														value="conclusa"
													>
														<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
															<CheckIcon aria-hidden className="size-4" />
														</Select.ItemIndicator>
														<Select.ItemText>Solo Concluse</Select.ItemText>
													</Select.Item>
													<Select.Item
														className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-accent-foreground data-selected:text-accent-foreground"
														value="abbandonata"
													>
														<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
															<CheckIcon aria-hidden className="size-4" />
														</Select.ItemIndicator>
														<Select.ItemText>Solo Abbandonate</Select.ItemText>
													</Select.Item>
												</Select.List>
											</Select.Popup>
										</Select.Positioner>
									</Select.Portal>
								</Select.Root>
							</div>
							{/* Search bar: absolutely positioned on top of the filter row so it opens above filters (not pushed right) */}
							<div className="absolute top-0 right-0 z-20 flex items-center sm:top-1/2 sm:-translate-y-1/2">
								<label className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between rounded-full bg-card px-4 py-2.5 text-sm shadow-[-18px_0px_14px_var(--table-container-background)] transition-[width] duration-300 ease-out sm:min-h-[40px] sm:w-60 sm:flex-initial sm:px-3.75 sm:py-1.75 sm:focus-within:w-80">
									<input
										className="w-full truncate bg-transparent placeholder:text-search-placeholder focus-visible:outline-none"
										onChange={(event) => {
											setSearchTerm(event.target.value);
										}}
										placeholder="Cerca cliente, referente..."
										type="search"
										value={searchTerm}
									/>
									<div className="ml-2 flex items-center justify-center">
										<Search
											aria-hidden
											className="size-4 text-search-placeholder"
										/>
									</div>
								</label>
							</div>
						</div>

						<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
							<div className="flex h-full min-h-0 flex-1 flex-col overflow-auto">
								<div className="flex min-w-max flex-col">
									<div className="table-header-bg sticky top-0 z-10 shrink-0 rounded-xl px-3 py-2.25">
										<div className="grid grid-cols-[minmax(140px,1.3fr)_minmax(120px,1fr)_minmax(90px,0.7fr)_minmax(80px,0.6fr)_minmax(80px,0.6fr)_minmax(90px,0.7fr)] items-center gap-4 font-medium text-sm text-table-header-foreground">
											<div>Cliente</div>
											<div>Referente</div>
											<div>Data apertura</div>
											<div>Importo</div>
											<div>Percentuale</div>
											<div>Stato</div>
										</div>
									</div>
									<div className="scroll-fade-y flex min-h-0 flex-1 flex-col">
										{isNegotiationsLoading && (
											<div className="flex h-full items-center justify-center p-8">
												<p className="text-stats-title">Caricamento…</p>
											</div>
										)}
										{!isNegotiationsLoading && negotiationsError && (
											<div className="flex h-full items-center justify-center p-8">
												<p className="text-center text-destructive">
													{negotiationsError}
												</p>
											</div>
										)}
										{!(isNegotiationsLoading || negotiationsError) &&
											visibleNegotiations.length === 0 && (
												<div className="flex h-full items-center justify-center p-8">
													<p className="text-muted-foreground text-sm">
														Nessuna trattativa trovata per questo venditore.
													</p>
												</div>
											)}
										{!(isNegotiationsLoading || negotiationsError) &&
											visibleNegotiations.length > 0 &&
											visibleNegotiations.map((n) => {
												const status = getNegotiationStatus(n);
												const clamped = clampPercentuale(n.percentuale);
												const clientName =
													n.client?.ragione_sociale ??
													`Cliente #${n.client_id}`;
												return (
													// biome-ignore lint/a11y/useSemanticElements: clickable row with inner button-like content; role/button + keydown for accessibility.
													<div
														className="w-full cursor-pointer border-checkbox-border/70 border-b bg-transparent px-3 py-5 text-left font-medium last:border-b-0 hover:bg-table-hover"
														key={n.id}
														onClick={() => {
															setSelectedNegotiation(n);
															setDetailDialogOpen(true);
														}}
														onKeyDown={(event) => {
															if (event.key === "Enter" || event.key === " ") {
																event.preventDefault();
																setSelectedNegotiation(n);
																setDetailDialogOpen(true);
															}
														}}
														role="button"
														tabIndex={0}
													>
														<div className="grid grid-cols-[minmax(140px,1.3fr)_minmax(120px,1fr)_minmax(90px,0.7fr)_minmax(80px,0.6fr)_minmax(80px,0.6fr)_minmax(90px,0.7fr)] items-center gap-4 text-base">
															<div className="truncate">{clientName}</div>
															<div className="truncate">{n.referente}</div>
															<div className="truncate tabular-nums">
																{formatNegotiationDate(
																	n.data_apertura ?? n.created_at ?? undefined
																)}
															</div>
															<div className="truncate tabular-nums">
																{formatCurrency(n.importo)}
															</div>
															<div className="flex items-center">
																<div
																	aria-label={`Avanzamento trattativa al ${clamped}%`}
																	className="relative flex h-6 w-full items-center justify-center overflow-hidden rounded-full"
																	role="img"
																	style={{
																		backgroundColor:
																			SPANCO_STAGE_COLORS[n.spanco].softBg,
																	}}
																>
																	<div
																		aria-hidden
																		className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-150"
																		style={{
																			width: `${clamped}%`,
																			backgroundColor:
																				SPANCO_STAGE_COLORS[n.spanco].main,
																		}}
																	/>
																	<span className="relative z-10 block w-full px-2 text-center font-medium text-card-foreground text-xs tabular-nums">
																		{clamped}%
																	</span>
																</div>
															</div>
															<div>
																<span
																	className={cn(
																		"inline-flex items-center justify-center gap-2 rounded-full py-1.25 pr-3 pl-2.5 font-medium text-base",
																		status.classes
																	)}
																>
																	{status.icon === "close" && (
																		<CircleXmarkFilled aria-hidden size={18} />
																	)}
																	{status.icon === "circle-plus" && (
																		<IconCirclePlusFilled
																			aria-hidden
																			size={18}
																		/>
																	)}
																	{status.icon === "check" && (
																		<CheckIcon aria-hidden size={18} />
																	)}
																	{status.label}
																</span>
															</div>
														</div>
													</div>
												);
											})}
									</div>
								</div>
							</div>
						</div>
					</section>
				</div>
			</div>

			{/* Read-only negotiation detail dialog: director views only, no link to edit page. */}
			{selectedNegotiation && (
				<NegotiationDetailDialog
					isOpen={detailDialogOpen}
					negotiation={selectedNegotiation}
					onClose={() => {
						setDetailDialogOpen(false);
						setSelectedNegotiation(null);
					}}
				/>
			)}
		</main>
	);
}

/** Read-only field row for the supervision negotiation dialog (label left, value right). */
const DETAIL_FIELD_CLASSES =
	"flex items-center justify-between gap-2 rounded-2xl bg-table-header px-3.75 py-4.25 leading-none";
const DETAIL_LABEL_CLASSES =
	"w-fit flex-0 whitespace-nowrap text-base font-medium text-stats-title leading-none";

interface NegotiationDetailDialogProps {
	negotiation: ApiNegotiation;
	isOpen: boolean;
	onClose: () => void;
}

/**
 * Read-only dialog showing negotiation details. Used on the team member supervision page
 * so the director can view a trattativa without being sent to the edit page (where they could modify it).
 * Desktop: Base UI Dialog; mobile: Vaul Drawer.
 */
function NegotiationDetailDialog({
	negotiation,
	isOpen,
	onClose,
}: NegotiationDetailDialogProps) {
	const [layoutReady, setLayoutReady] = useState(false);
	const [isDesktop, setIsDesktop] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const mql = window.matchMedia("(max-width: 767px)");
		const handleChange = () => setIsDesktop(!mql.matches);
		handleChange();
		setLayoutReady(true);
		mql.addEventListener("change", handleChange);
		return () => mql.removeEventListener("change", handleChange);
	}, []);

	const clientName =
		negotiation.client?.ragione_sociale ?? `Cliente #${negotiation.client_id}`;
	const telefonoDisplay = negotiation.client?.telefono?.trim() ?? "—";
	const dataAperturaDisplay = formatNegotiationDate(
		negotiation.data_apertura ?? negotiation.created_at ?? undefined
	);
	const status = getNegotiationStatus(negotiation);
	const clamped = clampPercentuale(negotiation.percentuale);

	const body = (
		<>
			<div className="flex items-center justify-between gap-3 pb-6">
				<h2 className="font-bold text-2xl text-card-foreground tracking-tight">
					Dettaglio trattativa
				</h2>
				<button
					aria-label="Chiudi"
					className="flex size-8 shrink-0 items-center justify-center rounded-full bg-table-header text-card-foreground transition-transform hover:bg-table-hover focus:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
					onClick={onClose}
					type="button"
				>
					<X aria-hidden className="size-4" />
				</button>
			</div>

			{/* Dati trattativa — read-only, same order as update form. Su desktop in 2 colonne con Stato e avanzamento. */}
			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
				<section
					aria-labelledby="detail-dati-heading"
					className="flex flex-col gap-2"
				>
					<h3
						className="font-medium text-lg text-stats-title"
						id="detail-dati-heading"
					>
						Dati trattativa
					</h3>
					<div className={DETAIL_FIELD_CLASSES}>
						<span className={DETAIL_LABEL_CLASSES}>Ragione sociale</span>
						<span className="min-w-0 flex-1 truncate text-right font-medium text-base">
							{clientName}
						</span>
					</div>
					<div className={DETAIL_FIELD_CLASSES}>
						<span className={DETAIL_LABEL_CLASSES}>Telefono</span>
						<span className="min-w-0 flex-1 truncate text-right font-medium text-base">
							{telefonoDisplay}
						</span>
					</div>
					<div className={DETAIL_FIELD_CLASSES}>
						<span className={DETAIL_LABEL_CLASSES}>Data apertura</span>
						<span className="min-w-0 flex-1 truncate text-right font-medium text-base">
							{dataAperturaDisplay}
						</span>
					</div>
					{isNegotiationAbandoned(negotiation) && (
						<div className={DETAIL_FIELD_CLASSES}>
							<span className={DETAIL_LABEL_CLASSES}>Data abbandono</span>
							<span className="min-w-0 flex-1 truncate text-right font-medium text-base">
								{formatNegotiationDate(
									negotiation.data_abbandono ?? negotiation.updated_at
								)}
							</span>
						</div>
					)}
					{!isNegotiationAbandoned(negotiation) &&
						isNegotiationCompleted(negotiation) && (
							<div className={DETAIL_FIELD_CLASSES}>
								<span className={DETAIL_LABEL_CLASSES}>Data chiusura</span>
								<span className="min-w-0 flex-1 truncate text-right font-medium text-base">
									{formatNegotiationDate(
										negotiation.data_chiusura ?? negotiation.updated_at
									)}
								</span>
							</div>
						)}
					<div className={DETAIL_FIELD_CLASSES}>
						<span className={DETAIL_LABEL_CLASSES}>Referente</span>
						<span className="min-w-0 flex-1 truncate text-right font-medium text-base">
							{negotiation.referente ?? "—"}
						</span>
					</div>
					<div className={cn(DETAIL_FIELD_CLASSES, "items-start")}>
						<span className={DETAIL_LABEL_CLASSES}>Note</span>
						<span className="min-w-0 flex-1 text-right font-medium text-base">
							{negotiation.note?.trim() || "—"}
						</span>
					</div>
				</section>

				{/* Stato e avanzamento — seconda colonna su desktop. */}
				<section
					aria-labelledby="detail-stato-heading"
					className="flex flex-col gap-2 sm:mt-0"
				>
					<h3
						className="font-medium text-lg text-stats-title"
						id="detail-stato-heading"
					>
						Stato e avanzamento
					</h3>
					<div className={DETAIL_FIELD_CLASSES}>
						<span className={DETAIL_LABEL_CLASSES}>Importo</span>
						<span className="font-medium text-base tabular-nums">
							{formatCurrency(negotiation.importo)}
						</span>
					</div>
					<div className={DETAIL_FIELD_CLASSES}>
						<span className={DETAIL_LABEL_CLASSES}>Percentuale</span>
						<span className="font-medium text-base tabular-nums">
							{clamped}%
						</span>
					</div>
					<div className={DETAIL_FIELD_CLASSES}>
						<span className={DETAIL_LABEL_CLASSES}>SPANCO</span>
						<span
							className="rounded-full px-2.5 py-1 font-medium text-sm tabular-nums"
							style={{
								backgroundColor: SPANCO_STAGE_COLORS[negotiation.spanco].softBg,
								color: SPANCO_STAGE_COLORS[negotiation.spanco].main,
							}}
						>
							{negotiation.spanco}
						</span>
					</div>
					<div className={DETAIL_FIELD_CLASSES}>
						<span className={DETAIL_LABEL_CLASSES}>Stato</span>
						<span
							className={cn(
								"inline-flex items-center gap-2 rounded-full py-1.25 pr-3 pl-2.5 font-medium text-base",
								status.classes
							)}
						>
							{status.icon === "close" && (
								<CircleXmarkFilled aria-hidden size={18} />
							)}
							{status.icon === "circle-plus" && (
								<IconCirclePlusFilled aria-hidden size={18} />
							)}
							{status.icon === "check" && <CheckIcon aria-hidden size={18} />}
							{status.label}
						</span>
					</div>
				</section>
			</div>

			<div className="mt-6 flex justify-end">
				<Button
					className="h-10 min-w-26 rounded-xl text-sm"
					onClick={onClose}
					type="button"
				>
					Chiudi
				</Button>
			</div>
		</>
	);

	if (!layoutReady) {
		return null;
	}

	if (isDesktop) {
		return (
			<Dialog.Root
				disablePointerDismissal={false}
				onOpenChange={(open) => {
					if (!open) {
						onClose();
					}
				}}
				open={isOpen}
			>
				<Dialog.Portal>
					<Dialog.Backdrop
						aria-hidden
						className="data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/50 data-closed:animate-out data-open:animate-in"
					/>
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
						<Dialog.Popup
							aria-describedby="negotiation-detail-desc"
							aria-labelledby="negotiation-detail-title"
							className="data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-card px-6 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.55)] outline-none data-closed:animate-out data-open:animate-in"
						>
							<Dialog.Title className="sr-only" id="negotiation-detail-title">
								Dettaglio trattativa (sola lettura)
							</Dialog.Title>
							<p className="sr-only" id="negotiation-detail-desc">
								Dati e stato della trattativa in sola lettura. Il direttore può
								solo visualizzare, non modificare.
							</p>
							<div className="overflow-y-auto">{body}</div>
						</Dialog.Popup>
					</div>
				</Dialog.Portal>
			</Dialog.Root>
		);
	}

	return (
		<Drawer.Root
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
			open={isOpen}
		>
			<Drawer.Portal>
				<Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
				<Drawer.Content className="fixed inset-x-[10px] bottom-[10px] z-50 flex max-h-[90vh] flex-col rounded-[36px] bg-card px-6 py-5 text-card-foreground outline-none drop-shadow-[0_18px_45px_rgba(15,23,42,0.55)]">
					<Drawer.Title className="sr-only">Dettaglio trattativa</Drawer.Title>
					<Drawer.Description className="sr-only">
						Dati e stato della trattativa in sola lettura.
					</Drawer.Description>
					<div className="mx-auto mt-0.5 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />
					<div className="min-h-0 flex-1 overflow-y-auto pt-2">{body}</div>
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	);
}

interface MemberStatCardProps {
	label: string;
	value: number | string;
	variant?:
		| "total-open"
		| "total-open-amount"
		| "average-open-amount"
		| "average-concluded-amount"
		| "conclusion-pct"
		| "average-closing-days";
}

/**
 * Stat card for member KPI — same visual shell as the dashboard / team KPI cards:
 * full-width on mobile, equal columns on desktop, bg-card, big number,
 * and a decorative icon anchored bottom-right.
 */
function MemberStatCard({ label, value, variant }: MemberStatCardProps) {
	const isNumber = typeof value === "number";
	return (
		<div className="stat-card-bg relative flex w-full flex-col gap-2 rounded-4xl bg-card px-7 py-7 sm:flex-1">
			{/* Decorative icon bottom-right — mirrored from other KPI cards */}
			{variant === "total-open" && (
				<div
					aria-hidden="true"
					className="pointer-events-none absolute right-2 bottom-2 opacity-[0.18] dark:opacity-[0.22]"
				>
					{/* Same icon as sidebar "Aperte" (Trattative → Aperte). */}
					<IconFilePlusFill18
						aria-hidden="true"
						className="text-sky-500 dark:text-sky-300"
						size={96}
					/>
				</div>
			)}
			{variant === "total-open-amount" && (
				<div
					aria-hidden="true"
					className="pointer-events-none absolute right-2 bottom-2 opacity-[0.18] dark:opacity-[0.22]"
				>
					<IconSackDollarFill18
						aria-hidden="true"
						className="text-sky-500 dark:text-sky-300"
						size={96}
					/>
				</div>
			)}
			{variant === "average-open-amount" && (
				<div
					aria-hidden="true"
					className="pointer-events-none absolute right-2 bottom-2 opacity-[0.18] dark:opacity-[0.22]"
				>
					<IconChartBarTrendUp
						aria-hidden="true"
						className="text-emerald-500 dark:text-emerald-300"
						size={96}
					/>
				</div>
			)}
			{variant === "average-concluded-amount" && (
				<div
					aria-hidden="true"
					className="pointer-events-none absolute right-2 bottom-2 opacity-[0.18] dark:opacity-[0.22]"
				>
					<IconVault3Fill18
						aria-hidden="true"
						className="text-indigo-500 dark:text-indigo-300"
						size={96}
					/>
				</div>
			)}
			{variant === "conclusion-pct" && (
				<div
					aria-hidden="true"
					className="pointer-events-none absolute right-2 bottom-2 opacity-[0.18] dark:opacity-[0.22]"
				>
					<IconTarget
						aria-hidden="true"
						className="text-amber-500 dark:text-amber-300"
						size={96}
					/>
				</div>
			)}
			{variant === "average-closing-days" && (
				<div
					aria-hidden="true"
					className="pointer-events-none absolute right-2 bottom-2 opacity-[0.18] dark:opacity-[0.22]"
				>
					<IconQuickstartFill18
						aria-hidden="true"
						className="text-emerald-500 dark:text-emerald-300"
						size={96}
					/>
				</div>
			)}

			<h3 className="stat-card-text truncate font-medium text-muted-foreground text-sm">
				{label}
			</h3>
			<div className="flex items-baseline gap-2">
				{/* Usiamo card-foreground per il valore per avere il massimo contrasto su bg-card, in linea con le stat cards team/dashboard. */}
				{isNumber ? (
					<AnimateNumber className="stat-card-text font-semibold text-5xl text-card-foreground tabular-nums leading-none">
						{value as number}
					</AnimateNumber>
				) : (
					<span className="stat-card-text font-semibold text-5xl text-card-foreground tabular-nums leading-none">
						{value}
					</span>
				)}
			</div>
		</div>
	);
}
