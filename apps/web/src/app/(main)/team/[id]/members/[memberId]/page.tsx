"use client";

import { AnimateNumber } from "motion-plus/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
	CheckIcon,
	IconCirclePlusFilled,
	IconUTurnToLeft,
} from "@/components/icons";
import CircleXmarkFilled from "@/components/icons/circle-xmark-filled";
import Loader from "@/components/loader";
import { TeamMemberNegotiationsMap } from "@/components/negotiations-map";
import { SpancoDonutChart } from "@/components/spanco-donut-chart";
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
	SpancoStatistics,
	TeamMemberStatistics,
} from "@/lib/api/types";
import { useAuthOptional } from "@/lib/auth/auth-context";
import { getNegotiationStatoSegment } from "@/lib/trattative-utils";
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
			classes: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
			icon: "close",
		};
	}
	if (isCompleted) {
		return {
			label: "Conclusa",
			classes:
				"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
			icon: "check",
		};
	}
	return {
		label: "Aperta",
		classes: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
		icon: "circle-plus",
	};
}

/** Main supervision page for a single team member (venditore). */
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
								router.push(backHref);
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

					{/* KPI cards from TeamMemberStatistics */}
					<section
						aria-label="Statistiche trattative del venditore"
						className="flex flex-wrap items-start gap-2 sm:gap-3.75"
					>
						{isMemberStatsLoading &&
							!memberStats &&
							Array.from({ length: 4 }).map((_, index) => (
								<div
									aria-hidden
									className="stat-card-bg flex flex-col gap-2 rounded-xl bg-table-header p-2.5 sm:gap-3.75 sm:p-3.75"
									key={`member-stat-skeleton-${String(index)}`}
								>
									<Skeleton className="h-3.5 w-24 sm:h-4 sm:w-28" />
									<Skeleton className="h-6 w-14 sm:h-7 sm:w-16" />
								</div>
							))}
						{memberStats && (
							<>
								<MemberStatCard
									label="Trattative aperte"
									value={memberStats.total_open_negotiations}
								/>
								<MemberStatCard
									label="Importo totale aperte"
									value={formatCurrency(Number(memberStats.total_open_amount))}
								/>
								<MemberStatCard
									label="Importo medio aperte"
									value={formatCurrency(memberStats.average_open_amount)}
								/>
								<MemberStatCard
									label="% conclusione"
									value={`${memberStats.conclusion_percentage.toFixed(1)}%`}
								/>
								<MemberStatCard
									label="Giorni medi chiusura"
									value={memberStats.average_closing_days}
								/>
								<MemberStatCard
									label="Importo medio concluse"
									value={formatCurrency(memberStats.average_concluded_amount)}
								/>
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
							<TeamMemberNegotiationsMap memberId={memberId} teamId={teamId} />
						</div>
						<div className="flex min-h-0 min-w-0 flex-1 flex-col">
							<SpancoDonutChart
								error={spancoError}
								isLoading={isSpancoLoading}
								stats={spancoStats}
							/>
						</div>
					</section>

					{/* Negotiations table */}
					<section
						aria-label="Trattative del venditore"
						className="flex w-full flex-col gap-2"
					>
						<div className="flex items-center justify-between gap-2">
							<h2 className="font-medium text-2xl">Trattative del venditore</h2>
							{!isNegotiationsLoading && negotiations.length > 0 && (
								<span className="text-muted-foreground text-sm">
									<AnimateNumber className="tabular-nums">
										{negotiations.length}
									</AnimateNumber>{" "}
									trattative totali
								</span>
							)}
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
											negotiations.length === 0 && (
												<div className="flex h-full items-center justify-center p-8">
													<p className="text-muted-foreground text-sm">
														Nessuna trattativa per questo venditore.
													</p>
												</div>
											)}
										{!(isNegotiationsLoading || negotiationsError) &&
											negotiations.length > 0 &&
											negotiations.map((n) => {
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
															const stato = getNegotiationStatoSegment(n);
															router.push(`/trattative/${stato}/${n.id}`);
														}}
														onKeyDown={(event) => {
															if (event.key === "Enter" || event.key === " ") {
																event.preventDefault();
																const stato = getNegotiationStatoSegment(n);
																router.push(`/trattative/${stato}/${n.id}`);
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
		</main>
	);
}

interface MemberStatCardProps {
	label: string;
	value: number | string;
}

/** Small stat card for member KPI, aligned with dashboard style. Smaller on mobile. */
function MemberStatCard({ label, value }: MemberStatCardProps) {
	const isNumber = typeof value === "number";
	return (
		<div className="stat-card-bg flex flex-col items-start justify-center gap-2 rounded-xl bg-table-header p-2.5 sm:gap-3.75 sm:p-3.75">
			<h3 className="font-medium text-stats-title text-xs leading-none sm:text-sm">
				{label}
			</h3>
			<div className="flex items-baseline gap-2">
				{isNumber ? (
					<AnimateNumber className="text-lg tabular-nums leading-none sm:text-xl">
						{value as number}
					</AnimateNumber>
				) : (
					<span className="text-lg tabular-nums leading-none sm:text-xl">
						{value}
					</span>
				)}
			</div>
		</div>
	);
}
