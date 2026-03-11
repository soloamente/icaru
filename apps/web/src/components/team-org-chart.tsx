"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ArrowUpRight, Check, ChevronDown, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AnimateNumber } from "motion-plus/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "vaul";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
	addTeamMembers,
	getNegotiationsStatistics,
	getTeam,
	getTeamStats,
	listAvailableMembers,
	removeTeamMember,
	updateTeam,
} from "@/lib/api/client";
import type {
	ApiAvailableMember,
	ApiTeam,
	ApiTeamStats,
	ApiTeamUser,
	NegotiationsStatistics,
} from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { registerUnsavedNavigationListener } from "@/lib/unsaved-navigation";
import { cn } from "@/lib/utils";
import {
	IconChartBarTrendUp,
	IconCrown2Fill18,
	IconFilePlusFill18,
	IconPeople,
	IconQuickstartFill18,
	IconSackDollarFill18,
	IconTarget,
	IconUTurnToLeft,
	IconVault3Fill18,
} from "./icons";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

/** Form id for the team update form, so the header Save button can trigger submit. */
export const UPDATE_TEAM_FORM_ID = "update-team-form";

/** Pill field container — same style as UpdateClientForm / UpdateNegotiationForm. */
const FIELD_CONTAINER_CLASSES =
	"flex items-center justify-between gap-2 rounded-2xl bg-table-header px-3.75 py-4.25 leading-none";

/** Field label text — consistent with other update forms. */
const FIELD_LABEL_TEXT_CLASSES =
	"w-fit flex-0 whitespace-nowrap text-base flex font-medium items-start text-stats-title leading-none";

/** Flat input base — aligned right, transparent, consistent with other forms. */
const FIELD_INPUT_BASE_CLASSES =
	"flex-1 w-full leading-none cursor-text border-none bg-transparent! px-0! py-0! text-right text-base font-medium shadow-none focus-visible:outline-none focus-visible:ring-0 outline-none rounded md:text-base";

/** Section card — wraps a group of fields, same as client/negotiation forms. */
const SECTION_CARD_CLASSES =
	"flex min-w-0 w-full gap-3 rounded-2xl bg-card px-7.5 py-10";

interface TeamOrgChartProps {
	teamId: number;
}

/** Form state for the editable team fields (name + description). */
interface TeamFormState {
	nome: string;
	description: string;
}

/** Checks whether the team form has been modified compared to the API data. */
function isTeamFormDirty(form: TeamFormState, team: ApiTeam): boolean {
	const normalize = (v: unknown): string => {
		if (typeof v === "string") {
			return v.trim();
		}
		if (v == null) {
			return "";
		}
		return String(v).trim();
	};
	return (
		normalize(form.nome) !== normalize(team.nome) ||
		normalize(form.description) !== normalize(team.description)
	);
}

/**
 * TeamOrgChart — Team detail page component.
 *
 * Follows the same shell pattern as /clienti/[id] and /trattative/aperte/[id]:
 * - Header with back button, title, and Save/Cancel actions (visible when dirty)
 * - table-container-bg body with:
 *   - Editable form section for team name and description
 *   - Org chart: creator node, connector lines, member nodes, add-member skeleton
 *   - Stats section (pipeline, concluded, abandoned)
 * - Unsaved changes confirmation dialog (desktop Dialog, mobile Drawer)
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: page-level detail component with form, org chart, and member management
export function TeamOrgChart({ teamId }: TeamOrgChartProps) {
	const { token, role } = useAuth();
	const router = useRouter();
	const isMobile = useIsMobile();
	const isDirector = role === "director";

	// On mobile, section cards stack vertically (flex-col); matches UpdateClientForm / UpdateNegotiationForm.
	const sectionCardClasses = cn(SECTION_CARD_CLASSES, isMobile && "flex-col");

	const [team, setTeam] = useState<ApiTeam | null>(null);
	const [stats, setStats] = useState<ApiTeamStats | null>(null);
	const [availableMembers, setAvailableMembers] = useState<
		ApiAvailableMember[]
	>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	// Editable form state for team name + description
	const [form, setForm] = useState<TeamFormState>({
		nome: "",
		description: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [nomeError, setNomeError] = useState<string | null>(null);
	// Leave-without-saving dialog state
	const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
	const [pendingHref, setPendingHref] = useState<string | null>(null);
	// Counter to reset the form when user clicks "Annulla"
	const [resetTrigger, setResetTrigger] = useState(0);

	const backHref = "/team";

	const fetchTeam = useCallback(async () => {
		if (!token) {
			return;
		}
		setLoading(true);
		setError(null);
		const result = await getTeam(token, teamId);
		setLoading(false);
		if ("error" in result) {
			setError(result.error);
			setTeam(null);
			return;
		}
		setTeam(result.data);
		setForm({
			nome: result.data.nome ?? "",
			description: result.data.description ?? "",
		});
	}, [token, teamId]);

	const fetchStats = useCallback(async () => {
		if (!(token && isDirector)) {
			return;
		}
		const result = await getTeamStats(token, teamId);
		if (!("error" in result)) {
			setStats(result.data);
		}
	}, [token, teamId, isDirector]);

	const fetchAvailableMembers = useCallback(async () => {
		if (!(token && isDirector)) {
			return;
		}
		const result = await listAvailableMembers(token);
		if (!("error" in result)) {
			setAvailableMembers(result.data);
		}
	}, [token, isDirector]);

	useEffect(() => {
		fetchTeam();
	}, [fetchTeam]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	useEffect(() => {
		fetchAvailableMembers();
	}, [fetchAvailableMembers]);

	// Sync form state when team data changes or when reset is requested
	// biome-ignore lint/correctness/useExhaustiveDependencies: resetTrigger is the explicit signal for reset
	useEffect(() => {
		if (team) {
			setForm({
				nome: team.nome ?? "",
				description: team.description ?? "",
			});
		}
	}, [team, resetTrigger]);

	// Dirty state: true when the form diverges from the API data
	const isDirty = team ? isTeamFormDirty(form, team) : false;

	// Integrate unsaved-changes guard with global navigation (Sidebar links, etc.)
	useEffect(() => {
		const unregister = registerUnsavedNavigationListener(({ href }) => {
			if (isDirty && !isSubmitting) {
				setPendingHref(href);
				setIsLeaveDialogOpen(true);
				return true;
			}
			// biome-ignore lint/suspicious/noExplicitAny: bridge between Route type and string
			router.push(href as any);
			return true;
		});
		return unregister;
	}, [isDirty, isSubmitting, router]);

	/** Handle the form submit: update team name and description via the API. */
	const handleSubmit = useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
			if (!(token && team)) {
				return;
			}
			const trimmedNome = form.nome.trim();
			if (!trimmedNome) {
				setNomeError("Il nome del team è obbligatorio");
				return;
			}
			setNomeError(null);
			setIsSubmitting(true);
			setError(null);

			const result = await updateTeam(token, teamId, {
				nome: trimmedNome,
				description: form.description.trim() || null,
			});
			setIsSubmitting(false);

			if ("error" in result) {
				setError(result.error);
				toast.error(result.error);
				return;
			}
			setTeam(result.data);
			toast.success("Team aggiornato");
		},
		[token, team, teamId, form]
	);

	/** Programmatically trigger the form submit from the header Save button. */
	const handleSaveClick = useCallback(() => {
		if (isSubmitting) {
			return;
		}
		const el = document.getElementById(
			UPDATE_TEAM_FORM_ID
		) as HTMLFormElement | null;
		el?.requestSubmit?.();
	}, [isSubmitting]);

	/** When user confirms leaving without saving, navigate to target. */
	const handleConfirmLeave = useCallback(() => {
		const targetHref = pendingHref ?? backHref;
		setIsLeaveDialogOpen(false);
		setPendingHref(null);
		// biome-ignore lint/suspicious/noExplicitAny: bridge between Route type and string
		router.push(targetHref as any);
	}, [backHref, pendingHref, router]);

	/** Handle the back button: show leave dialog if dirty, otherwise navigate. */
	const handleBackClick = useCallback(() => {
		if (isDirty && !isSubmitting) {
			setIsLeaveDialogOpen(true);
			return;
		}
		// biome-ignore lint/suspicious/noExplicitAny: bridge between Route type and string
		router.push(backHref as any);
	}, [backHref, isDirty, isSubmitting, router]);

	// Loading skeleton — mirrors the detail page layout: header, stats (director), form, org chart.
	if (loading) {
		return (
			<main
				className={cn(
					"flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card pt-6 font-medium sm:m-2.5",
					isMobile ? "m-2 overflow-y-scroll px-4" : "m-3 overflow-y-hidden px-9"
				)}
			>
				{/* Header: back button + title */}
				<div className="flex items-center gap-3.5">
					<Skeleton aria-hidden className="size-11 shrink-0 rounded-lg" />
					<Skeleton className="h-7 w-48" />
				</div>
				<div className="table-container-bg flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-t-3xl px-5.5 pt-6.25 pb-6.25">
					<div className="scroll-fade-y flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 overflow-y-auto">
						{/* Stats cards skeleton — 4 on top, 3 on bottom (matches loaded state). */}
						{isDirector && (
							<div className="flex flex-col gap-3.75">
								<div className="flex flex-wrap items-start gap-3.75">
									{Array.from({ length: 4 }).map((_, i) => (
										<div
											aria-hidden
											className="relative flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75"
											key={`stat-skeleton-top-${String(i)}`}
										>
											<Skeleton className="h-4 w-20" />
											<Skeleton className="h-7 w-16" />
										</div>
									))}
								</div>
								<div className="flex flex-wrap items-start gap-3.75">
									{Array.from({ length: 3 }).map((_, i) => (
										<div
											aria-hidden
											className="relative flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75"
											key={`stat-skeleton-bottom-${String(i)}`}
										>
											<Skeleton className="h-4 w-20" />
											<Skeleton className="h-7 w-16" />
										</div>
									))}
								</div>
							</div>
						)}

						{/* Form section skeleton — Dati team with Nome and Descrizione fields */}
						<section
							aria-hidden
							className={cn(SECTION_CARD_CLASSES, isMobile && "flex-col")}
						>
							<div className="flex w-full min-w-0">
								<Skeleton className="h-8 w-32" />
							</div>
							<div className="flex w-full min-w-0 flex-col gap-2">
								{/* Two field rows: label left, value right */}
								<div aria-hidden className={FIELD_CONTAINER_CLASSES}>
									<Skeleton className="h-4 w-16" />
									<Skeleton className="h-4 w-32" />
								</div>
								<div aria-hidden className={FIELD_CONTAINER_CLASSES}>
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-4 w-40" />
								</div>
							</div>
						</section>

						{/* Org chart skeleton — creator node + connector + member nodes */}
						<section
							aria-hidden
							className={cn(SECTION_CARD_CLASSES, "flex-col items-center")}
						>
							<Skeleton className="h-32 w-60 rounded-2xl" />
							<div className="h-8 w-px bg-muted-foreground/20" />
							<div className="relative flex flex-wrap items-start justify-center gap-x-8 gap-y-6">
								{Array.from({ length: 4 }).map((_, i) => (
									<div
										className="flex flex-col items-center"
										key={`member-skeleton-${String(i)}`}
									>
										<div className="h-5 w-px bg-muted-foreground/20" />
										<Skeleton aria-hidden className="h-20 w-48 rounded-2xl" />
									</div>
								))}
							</div>
						</section>
					</div>
				</div>
			</main>
		);
	}

	if (error && !team) {
		return (
			<main
				className={cn(
					"flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card pt-6 font-medium sm:m-2.5",
					isMobile ? "m-2 overflow-y-scroll px-4" : "m-3 overflow-y-hidden px-9"
				)}
			>
				<div className="relative flex w-full flex-col gap-4.5">
					<div className="flex items-center justify-start gap-2.5">
						<button
							aria-label="Torna alla lista team"
							className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							onClick={() => {
								// biome-ignore lint/suspicious/noExplicitAny: dynamic route
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
					</div>
				</div>
				<div className="table-container-bg flex min-h-0 flex-1 flex-col overflow-auto rounded-t-3xl px-5.5 pt-6.25">
					<p className="text-destructive text-sm" role="alert">
						{error}
					</p>
				</div>
			</main>
		);
	}

	if (!team) {
		return null;
	}

	return (
		<main
			className={cn(
				"flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card pt-6 font-medium sm:m-2.5",
				isMobile ? "m-2 overflow-y-scroll px-4" : "m-3 overflow-y-hidden px-9"
			)}
		>
			{/* Header: back + title on left, Cancel + Save on right — same pattern as /clienti/[id] */}
			<div className="relative flex w-full flex-col gap-4.5">
				<div className="flex items-center justify-between gap-2.5">
					<div className="flex min-w-0 flex-1 items-center justify-start gap-1">
						<button
							aria-label="Torna alla lista team"
							className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							onClick={handleBackClick}
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
							id="update-team-title"
						>
							Team {team.nome}
						</h1>
					</div>
					{/* Actions: appear only when the form is dirty or submitting */}
					{isDirector && (
						<div
							aria-hidden={!(isDirty || isSubmitting)}
							className={
								isDirty || isSubmitting
									? "flex shrink-0 scale-100 items-center justify-center gap-2.5 opacity-100 transition-[opacity,transform] duration-200 ease-out"
									: "pointer-events-none flex shrink-0 scale-[0.98] items-center justify-center gap-2.5 opacity-0 transition-[opacity,transform] duration-200 ease-out"
							}
						>
							{isSubmitting ? (
								<span className="inline-flex h-10 min-w-26 cursor-not-allowed items-center justify-center rounded-xl border border-border bg-secondary font-medium text-secondary-foreground text-sm opacity-50">
									Annulla
								</span>
							) : (
								<button
									className="inline-flex h-10 min-w-26 items-center justify-center rounded-xl border border-border bg-secondary font-medium text-secondary-foreground text-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									onClick={() => setResetTrigger((c) => c + 1)}
									tabIndex={isDirty ? 0 : -1}
									type="button"
								>
									Annulla
								</button>
							)}
							<Button
								className="h-10 min-w-26 rounded-xl text-sm"
								disabled={isSubmitting}
								onClick={handleSaveClick}
								tabIndex={isDirty || isSubmitting ? 0 : -1}
								type="button"
							>
								{isSubmitting ? "Salvataggio…" : "Salva"}
							</Button>
						</div>
					)}
				</div>
			</div>

			{/* Leave-without-saving confirmation: Vaul Drawer on mobile, Base UI Dialog on desktop. */}
			<TeamLeaveDialog
				isOpen={isLeaveDialogOpen}
				onClose={() => setIsLeaveDialogOpen(false)}
				onConfirm={handleConfirmLeave}
			/>

			{/* Body: table-container-bg, scrollable, holds the form + org chart + stats */}
			<div className="table-container-bg flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-t-3xl px-5.5 pt-6.25 pb-6.25">
				{/* Scroll container with gap-2.5 between sections — aligned with UpdateClientForm / UpdateNegotiationForm. */}
				<div className="scroll-fade-y flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 overflow-y-auto">
					{/* Stats cards — 4 on top row, 3 on bottom row (same gap and stretch as before). */}
					{isDirector && stats && (
						<div className="flex w-full flex-col gap-3.75">
							<div className="flex w-full flex-wrap items-stretch gap-3.75">
								<StatCard
									primaryLabel="Trattative aperte"
									primaryValue={stats.total_open_negotiations}
									title="Trattative aperte"
									variant="total-open"
								/>
								<StatCard
									primaryLabel="Totale importo aperte"
									primaryValue={Number(stats.total_open_amount)}
									title="Valore pipeline"
									variant="total-open-amount"
								/>
								<StatCard
									primaryLabel="Importo medio aperte"
									primaryValue={stats.average_open_amount}
									title="Importo medio"
									variant="average-open-amount"
								/>
								<StatCard
									primaryLabel="Importo medio concluse"
									primaryValue={stats.average_concluded_amount}
									title="Importo medio concluse"
									variant="average-concluded-amount"
								/>
							</div>
							<div className="flex w-full flex-wrap items-stretch gap-3.75">
								<StatCard
									primaryLabel="Percentuale conclusione"
									primaryValue={stats.conclusion_percentage}
									title="Performance chiusura"
									variant="conclusion-pct"
								/>
								<StatCard
									primaryLabel="Giorni medi chiusura"
									primaryValue={stats.average_closing_days}
									title="Tempo medio chiusura"
									variant="average-closing-days"
								/>
								<StatCard
									primaryLabel="Membri effettivi"
									primaryValue={stats.effective_members_count}
									title="Membri effettivi"
									variant="members"
								/>
							</div>
						</div>
					)}

					{/* Error banner */}
					{error && (
						<div className="rounded-lg bg-destructive/10 px-4 py-2 text-center text-destructive text-sm">
							{error}
						</div>
					)}

					{/* ─── EDITABLE FORM: Team Name + Description ─── */}
					{isDirector && (
						<form
							className="flex w-full min-w-0 flex-col gap-2.5"
							id={UPDATE_TEAM_FORM_ID}
							onSubmit={handleSubmit}
						>
							<section
								aria-labelledby="team-info-heading"
								className={sectionCardClasses}
							>
								<div className="flex w-full min-w-0">
									<h2 className="font-medium text-2xl" id="team-info-heading">
										Dati team
									</h2>
								</div>
								<div className="flex w-full min-w-0 flex-col gap-2">
									<label
										className={`${FIELD_CONTAINER_CLASSES}${nomeError ? "ring-1 ring-destructive ring-offset-2 ring-offset-background" : ""}`}
										htmlFor="update-team-nome"
									>
										<span className={FIELD_LABEL_TEXT_CLASSES}>Nome</span>
										<input
											aria-describedby={
												nomeError ? "update-team-nome-error" : undefined
											}
											aria-invalid={!!nomeError}
											className={FIELD_INPUT_BASE_CLASSES}
											id="update-team-nome"
											name="nome"
											onChange={(event) => {
												setNomeError(null);
												setForm((prev) => ({
													...prev,
													nome: event.target.value,
												}));
											}}
											type="text"
											value={form.nome}
										/>
									</label>
									{nomeError && (
										<p
											className="text-destructive text-sm"
											id="update-team-nome-error"
											role="alert"
										>
											{nomeError}
										</p>
									)}

									<label
										className={FIELD_CONTAINER_CLASSES}
										htmlFor="update-team-description"
									>
										<span className={FIELD_LABEL_TEXT_CLASSES}>
											Descrizione
										</span>
										<input
											className={FIELD_INPUT_BASE_CLASSES}
											id="update-team-description"
											name="description"
											onChange={(event) =>
												setForm((prev) => ({
													...prev,
													description: event.target.value,
												}))
											}
											placeholder="Nessuna descrizione"
											type="text"
											value={form.description}
										/>
									</label>
								</div>
							</section>
						</form>
					)}

					{/* Read-only team info for non-directors — same layout as editable section. */}
					{!isDirector && (
						<section className={sectionCardClasses}>
							<div className="flex w-full min-w-0">
								<h2 className="font-medium text-2xl">Dati team</h2>
							</div>
							<div className="flex w-full min-w-0 flex-col gap-2">
								<div className={FIELD_CONTAINER_CLASSES}>
									<span className={FIELD_LABEL_TEXT_CLASSES}>Nome</span>
									<span className="flex-1 text-right font-medium text-base">
										{team.nome}
									</span>
								</div>
								<div className={FIELD_CONTAINER_CLASSES}>
									<span className={FIELD_LABEL_TEXT_CLASSES}>Descrizione</span>
									<span className="flex-1 text-right font-medium text-base text-muted-foreground">
										{team.description?.trim() || "Nessuna descrizione"}
									</span>
								</div>
							</div>
						</section>
					)}

					{/* ─── ORG CHART + STATS ─── */}
					<OrgChartSection
						availableMembers={availableMembers}
						isDirector={isDirector}
						onError={setError}
						onTeamUpdate={(updated) => {
							setTeam(updated);
							fetchStats();
							fetchAvailableMembers();
						}}
						team={team}
						teamId={teamId}
					/>
				</div>
			</div>
		</main>
	);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format a numeric value as EUR currency for stats display. */
function formatCurrency(value: number): string {
	return new Intl.NumberFormat("it-IT", {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}

// ─── OrgChartSection ─────────────────────────────────────────────────────────

interface OrgChartSectionProps {
	team: ApiTeam;
	teamId: number;
	isDirector: boolean;
	availableMembers: ApiAvailableMember[];
	onTeamUpdate: (team: ApiTeam) => void;
	onError: (error: string) => void;
}

/**
 * Self-contained org chart section with member management.
 * Handles add/remove members, toggle creator_participates, and stats display.
 */
function OrgChartSection({
	team,
	teamId,
	isDirector,
	availableMembers,
	onTeamUpdate,
	onError,
}: OrgChartSectionProps) {
	const router = useRouter();
	const { token, user } = useAuth();
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [addingMemberId, setAddingMemberId] = useState<number | null>(null);
	const [removingUserId, setRemovingUserId] = useState<number | null>(null);
	const [togglingParticipates, setTogglingParticipates] = useState(false);
	// Local UI state for creator participation UX: tooltip (join) and confirm dialog (leave).
	const [isJoinTooltipOpen, setIsJoinTooltipOpen] = useState(false);
	const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
	// Cached personal statistics of the current user so we can show how many "stats"
	// are added/removed from the team when the creator toggles participation.
	const [personalStats, setPersonalStats] =
		useState<NegotiationsStatistics | null>(null);
	const [loadingPersonalStats, setLoadingPersonalStats] = useState(false);
	const [personalStatsError, setPersonalStatsError] = useState<string | null>(
		null
	);
	const addDropdownRef = useRef<HTMLDivElement>(null);

	// Close add-member dropdown on click outside
	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (
				addDropdownRef.current &&
				!addDropdownRef.current.contains(e.target as Node)
			) {
				setIsAddOpen(false);
			}
		}
		if (isAddOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isAddOpen]);

	/**
	 * Lazily load the personal KPI statistics for the logged-in user.
	 * These stats are used to explain how many "stats" are added/removed
	 * from the team when the creator participates or leaves.
	 */
	const ensurePersonalStats = useCallback(async () => {
		if (!token || personalStats || loadingPersonalStats) {
			return;
		}
		setLoadingPersonalStats(true);
		setPersonalStatsError(null);
		const result = await getNegotiationsStatistics(token);
		setLoadingPersonalStats(false);
		if ("error" in result) {
			setPersonalStatsError(result.error);
			return;
		}
		setPersonalStats(result.data);
	}, [token, personalStats, loadingPersonalStats]);

	const handleAddMember = useCallback(
		async (userId: number) => {
			if (!token) {
				return;
			}
			setAddingMemberId(userId);
			const result = await addTeamMembers(token, teamId, {
				members: [userId],
			});
			setAddingMemberId(null);
			if ("error" in result) {
				onError(result.error);
				return;
			}
			onTeamUpdate(result.data);
			setIsAddOpen(false);
		},
		[token, teamId, onTeamUpdate, onError]
	);

	const handleRemoveMember = useCallback(
		async (userId: number) => {
			if (!token) {
				return;
			}
			setRemovingUserId(userId);
			const result = await removeTeamMember(token, teamId, userId);
			setRemovingUserId(null);
			if ("error" in result) {
				onError(result.error);
				return;
			}
			onTeamUpdate(result.data);
		},
		[token, teamId, onTeamUpdate, onError]
	);

	const handleToggleCreatorParticipates = useCallback(async () => {
		if (!token) {
			return;
		}
		setTogglingParticipates(true);
		const result = await updateTeam(token, teamId, {
			creator_participates: !team.creator_participates,
		});
		setTogglingParticipates(false);
		if ("error" in result) {
			onError(result.error);
			return;
		}
		onTeamUpdate(result.data);
	}, [token, team, teamId, onTeamUpdate, onError]);

	/**
	 * Entry point for clicking the "Partecipa / Non partecipa" pill.
	 * - Quando il creatore NON partecipa ancora: attiva subito la partecipazione
	 *   ma mostra anche un tooltip esplicativo con i KPI personali che vengono aggiunti al team.
	 * - Quando il creatore partecipa già: apre un dialog di conferma prima di rimuovere
	 *   la partecipazione, mostrando quanti "stats" verranno tolti dal team.
	 */
	const handleCreatorToggleClick = useCallback(async () => {
		if (!token) {
			return;
		}

		if (!team.creator_participates) {
			setIsJoinTooltipOpen(true);
			ensurePersonalStats();
			await handleToggleCreatorParticipates();
			return;
		}

		setIsLeaveDialogOpen(true);
		ensurePersonalStats();
	}, [
		token,
		team.creator_participates,
		handleToggleCreatorParticipates,
		ensurePersonalStats,
	]);

	/** Confirm removal of creator participation after the dialog. */
	const handleConfirmLeaveParticipation = useCallback(async () => {
		setIsLeaveDialogOpen(false);
		await handleToggleCreatorParticipates();
	}, [handleToggleCreatorParticipates]);

	/** Navigate to the supervisione venditore page for the given member. */
	const handleOpenMemberDetails = useCallback(
		(memberId: number) => {
			// biome-ignore lint/suspicious/noExplicitAny: dynamic segment path
			router.push(`/team/${teamId}/members/${memberId}` as any);
		},
		[router, teamId]
	);

	const members = team.users ?? [];
	const currentMemberIds = new Set(members.map((u: ApiTeamUser) => u.id));
	const filteredAvailable = availableMembers.filter(
		(m) => !currentMemberIds.has(m.id)
	);
	// Il backend dovrebbe sempre includere l'oggetto `creator`, ma per sicurezza
	// gestiamo anche il caso in cui arrivi solo `creator_id` così da non rompere
	// il rendering dell'organigramma in presenza di risposte parziali.
	const safeCreator =
		team.creator ??
		({
			id: team.creator_id,
			nome: "Creatore",
			cognome: "",
		} as const);
	// Solo il creatore del team può modificare il flag creator_participates.
	const isCreatorDirector =
		isDirector && user != null && user.id === safeCreator.id;
	// Whether the "add member" skeleton is shown, and total items in the member row
	const hasAddSkeleton = isDirector && filteredAvailable.length > 0;
	const totalOrgItems = members.length + (hasAddSkeleton ? 1 : 0);

	return (
		<>
			{/* Org chart card — same container as "Dati team" */}
			<section className={`${SECTION_CARD_CLASSES} flex-col items-center`}>
				{/* Tree group: no gap so connector lines actually touch creator ↔ stem ↔ row */}
				<div className="relative flex flex-col items-center">
					<CreatorNode
						canToggleParticipates={isCreatorDirector}
						creator={safeCreator}
						creatorParticipates={team.creator_participates}
						isDirector={isDirector}
						isToggling={togglingParticipates}
						onHoverParticipateTooltip={(open) => {
							setIsJoinTooltipOpen(open);
							if (open) {
								ensurePersonalStats();
							}
						}}
						onToggleParticipates={handleCreatorToggleClick}
					/>

					{/* Tooltip shown immediately after opting in to participate, explaining the effect. */}
					<AnimatePresence>
						{isJoinTooltipOpen && (
							<CreatorParticipationTooltip
								error={personalStatsError}
								isLoading={loadingPersonalStats}
								onClose={() => setIsJoinTooltipOpen(false)}
								personalStats={personalStats}
							/>
						)}
					</AnimatePresence>

					{/* Connector lines + member cards */}
					{totalOrgItems > 0 && (
						<>
							{/* Vertical stem from creator down to the horizontal bar — flush, no gap */}
							<div className="h-8 w-px shrink-0 bg-muted-foreground/20" />

							{/* Member row — relative so the horizontal connector can be positioned absolutely */}
							<div className="relative flex flex-wrap items-start justify-center gap-x-8 gap-y-6">
								{/* Horizontal bar from center-of-first → center-of-last (inset = w-48 / 2 = 6rem) */}
								{totalOrgItems > 1 && (
									<div className="pointer-events-none absolute inset-x-24 top-0 h-px bg-muted-foreground/20" />
								)}

								{members.map((member) => (
									<div className="flex flex-col items-center" key={member.id}>
										<div className="h-5 w-px bg-muted-foreground/20" />
										<MemberNode
											isDirector={isDirector}
											isRemoving={removingUserId === member.id}
											member={member}
											onOpenDetails={() => handleOpenMemberDetails(member.id)}
											onRemove={() => handleRemoveMember(member.id)}
										/>
									</div>
								))}

								{hasAddSkeleton && (
									<div
										className="flex flex-col items-center"
										ref={addDropdownRef}
									>
										<div className="h-5 w-px bg-muted-foreground/20" />
										<AddMemberSkeleton
											addingMemberId={addingMemberId}
											availableMembers={filteredAvailable}
											isOpen={isAddOpen}
											onAdd={handleAddMember}
											onToggle={() => setIsAddOpen(!isAddOpen)}
										/>
									</div>
								)}
							</div>
						</>
					)}
				</div>
			</section>

			{/* Confirm dialog when the creator disables participation. Mirrors other confirmation dialogs. */}
			<CreatorParticipationDialog
				error={personalStatsError}
				isLoading={loadingPersonalStats}
				isOpen={isLeaveDialogOpen}
				onClose={() => setIsLeaveDialogOpen(false)}
				onConfirm={handleConfirmLeaveParticipation}
				personalStats={personalStats}
			/>
		</>
	);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface CreatorNodeProps {
	creator: { id: number; nome: string; cognome: string };
	creatorParticipates: boolean;
	canToggleParticipates: boolean;
	isDirector: boolean;
	isToggling: boolean;
	onToggleParticipates: () => void;
	/** Optional hover handler so the parent can show a tooltip when hovering the participate button. */
	onHoverParticipateTooltip?: (isOpen: boolean) => void;
}

/** Creator card — top of the org chart with crown badge and participates toggle. */
function CreatorNode({
	creator,
	creatorParticipates,
	canToggleParticipates,
	isDirector,
	isToggling,
	onToggleParticipates,
	onHoverParticipateTooltip,
}: CreatorNodeProps) {
	const fullName = `${creator.nome} ${creator.cognome}`;

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className="relative flex w-60 flex-col items-center gap-2 rounded-2xl bg-amber-50/70 px-4 py-5 dark:bg-amber-950/20"
			initial={{ opacity: 0, y: -10 }}
			transition={{ duration: 0.2, ease: "easeOut" }}
		>
			{/* Crown badge */}
			<div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 text-xs dark:bg-amber-900/50 dark:text-amber-300">
				<IconCrown2Fill18 size={12} />
				<span>Creatore</span>
			</div>

			<Avatar className="size-11">
				<AvatarFallback placeholderSeed={fullName} />
			</Avatar>
			<span className="text-center font-medium text-sm leading-none">
				{fullName}
			</span>
			<span className="text-center text-muted-foreground text-xs leading-none">
				Direttore Vendite
			</span>

			{/* Participates toggle — solo il creatore del team (direttore) può modificarlo. */}
			{isDirector && canToggleParticipates && (
				<button
					className={`mt-1 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
						creatorParticipates
							? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
							: "bg-muted text-muted-foreground"
					} ${isToggling ? "opacity-50" : "hover:opacity-80"}`}
					disabled={isToggling}
					onBlur={() => {
						if (onHoverParticipateTooltip) {
							onHoverParticipateTooltip(false);
						}
					}}
					onClick={onToggleParticipates}
					onFocus={() => {
						if (!creatorParticipates && onHoverParticipateTooltip) {
							onHoverParticipateTooltip(true);
						}
					}}
					onMouseEnter={() => {
						if (!creatorParticipates && onHoverParticipateTooltip) {
							onHoverParticipateTooltip(true);
						}
					}}
					onMouseLeave={() => {
						if (onHoverParticipateTooltip) {
							onHoverParticipateTooltip(false);
						}
					}}
					type="button"
				>
					{creatorParticipates ? (
						<Check className="size-3" />
					) : (
						<X className="size-3" />
					)}
					<span>{creatorParticipates ? "Partecipa" : "Non partecipa"}</span>
				</button>
			)}
		</motion.div>
	);
}

interface MemberNodeProps {
	member: ApiTeamUser;
	isDirector: boolean;
	isRemoving: boolean;
	onRemove: () => void;
	/** Open the supervision page for this member (stats + SPANCO + mappa + trattative). */
	onOpenDetails: () => void;
}

/** Member card in the org chart grid. */
function MemberNode({
	member,
	isDirector,
	isRemoving,
	onRemove,
	onOpenDetails,
}: MemberNodeProps) {
	const fullName = `${member.nome} ${member.cognome}`;

	return (
		<motion.div
			animate={{ opacity: 1, scale: 1 }}
			className="group relative flex w-48 flex-col items-center gap-1.5 rounded-2xl bg-table-header px-3 py-4 transition-colors duration-150 ease-out hover:bg-table-hover"
			exit={{ opacity: 0, scale: 0.9 }}
			initial={{ opacity: 0, scale: 0.95 }}
			layout
			transition={{ duration: 0.15 }}
		>
			<Avatar className="size-9">
				<AvatarFallback placeholderSeed={fullName} />
			</Avatar>
			<span className="mt-2 text-center font-medium text-sm leading-none">
				{fullName}
			</span>
			<span className="max-w-full truncate text-center text-muted-foreground text-xs leading-none">
				{member.email}
			</span>

			{/* Dettagli venditore: CTA visibile a tutti, separata dal bottone di rimozione. */}
			<button
				aria-label={`Visualizza i dettagli delle trattative di ${fullName}`}
				className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-background/60 px-2.5 py-1 font-medium text-[11px] text-stats-title transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
				onClick={onOpenDetails}
				type="button"
			>
				<span>Dettagli venditore</span>
				<ArrowUpRight aria-hidden className="size-3.5" />
			</button>

			{/* Remove button (directors only) */}
			{isDirector && (
				<button
					aria-label={`Rimuovi ${fullName} dal team`}
					className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-destructive hover:text-white disabled:opacity-30"
					disabled={isRemoving}
					onClick={onRemove}
					type="button"
				>
					<X className="size-3.5" />
				</button>
			)}
		</motion.div>
	);
}

interface AddMemberSkeletonProps {
	isOpen: boolean;
	onToggle: () => void;
	availableMembers: ApiAvailableMember[];
	onAdd: (userId: number) => void;
	addingMemberId: number | null;
}

/**
 * Skeleton placeholder card for adding a new member.
 * Dashed border, pulsing animation, "+" icon.
 * Clicking opens a dropdown with available members.
 */
function AddMemberSkeleton({
	isOpen,
	onToggle,
	availableMembers,
	onAdd,
	addingMemberId,
}: AddMemberSkeletonProps) {
	return (
		<div className="relative">
			<motion.button
				aria-expanded={isOpen}
				aria-label="Aggiungi membro al team"
				className={cn(
					"group relative flex w-48 cursor-pointer flex-col items-center gap-1.5 rounded-2xl bg-table-header px-3 py-4 transition-colors duration-150 ease-out hover:bg-table-hover",
					isOpen && "bg-table-hover"
				)}
				onClick={onToggle}
				type="button"
				whileHover={{ scale: 1.02 }}
				whileTap={{ scale: 0.98 }}
			>
				<div className="flex size-9 items-center justify-center rounded-full bg-muted">
					<Plus className="size-5 text-muted-foreground" />
				</div>
				<span className="font-medium text-muted-foreground text-sm">
					Aggiungi membro
				</span>
				<ChevronDown
					className={`size-3.5 text-muted-foreground transition-transform duration-150 ease-out ${isOpen ? "rotate-180" : ""}`}
				/>
			</motion.button>

			{/* Dropdown with available members */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="absolute top-full right-0 left-0 z-30 mt-2 rounded-xl bg-popover shadow-lg"
						exit={{ opacity: 0, y: -4 }}
						initial={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.15 }}
					>
						{availableMembers.length === 0 ? (
							<div className="p-3 text-center text-muted-foreground text-sm">
								Nessun membro disponibile
							</div>
						) : (
							<div className="scroll-fade-y max-h-56 overflow-y-auto">
								{availableMembers
									.filter(
										(m): m is ApiAvailableMember =>
											m != null &&
											typeof m.nome === "string" &&
											typeof m.id === "number"
									)
									.map((member) => (
										<button
											className="flex w-full select-none items-center gap-3 px-3 py-2.5 text-left text-sm transition-[background-color,color,transform] duration-150 ease-out first:rounded-t-xl last:rounded-b-xl hover:bg-muted active:scale-[0.99] disabled:opacity-50"
											disabled={addingMemberId === member.id}
											key={member.id}
											onClick={() => onAdd(member.id)}
											type="button"
										>
											<Avatar className="size-7">
												<AvatarFallback
													placeholderSeed={`${member.nome} ${member.cognome}`}
												/>
											</Avatar>
											<div className="flex min-w-0 flex-1 flex-col gap-0.5">
												<span className="truncate font-medium leading-none">
													{member.nome} {member.cognome}
												</span>
												<span className="truncate text-muted-foreground text-xs leading-none">
													{member.email ?? "—"}
												</span>
												{/* <span className="truncate text-muted-foreground text-xs">
												{member.role?.nome ?? "—"}
											</span> */}
											</div>
											{addingMemberId === member.id && (
												<span className="shrink-0 text-muted-foreground text-xs">
													Aggiunta…
												</span>
											)}
										</button>
									))}
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

interface StatCardProps {
	title: string;
	primaryLabel: string;
	primaryValue: number;
	secondaryLabel?: string;
	secondaryValue?: number;
	variant?:
		| "total-open"
		| "total-open-amount"
		| "average-open-amount"
		| "average-concluded-amount"
		| "conclusion-pct"
		| "average-closing-days"
		| "members";
}

/**
 * Stat card for team statistics.
 * Uses the same visual shell (spacing, typography, background) as the dashboard stat cards
 * so that the KPI cards on the team detail page look and feel consistent with the dashboard.
 */
function StatCard({
	title,
	primaryLabel,
	primaryValue,
	secondaryLabel,
	secondaryValue,
	variant,
}: StatCardProps) {
	return (
		<div className="stat-card-bg relative flex w-full flex-col gap-2 rounded-4xl bg-card px-7 py-7 sm:flex-1">
			{/* Decorative background icons — riusiamo le stesse icone delle altre sezioni (clienti, trattative). */}
			{variant === "total-open" && (
				<div
					aria-hidden="true"
					className="pointer-events-none absolute right-2 bottom-2 opacity-[0.18] dark:opacity-[0.22]"
				>
					{/* Icona "Aperte": stessa della sidebar (voce Trattative → Aperte). */}
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
			{variant === "members" && (
				<div
					aria-hidden="true"
					className="pointer-events-none absolute right-2 bottom-2 opacity-[0.18] dark:opacity-[0.22]"
				>
					{/* Icona condivisa con la sezione Clienti per rappresentare persone/membri. */}
					<IconPeople
						aria-hidden="true"
						className="text-sky-500 dark:text-sky-300"
						size={96}
					/>
				</div>
			)}

			{/* Main title on top of the card uses the primary label text,
				so KPI labels like "importo medio concluse" compaiono come titolo principale. */}
			<h3 className="stat-card-text truncate font-medium text-muted-foreground text-sm">
				{primaryLabel || title}
			</h3>
			<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
				<AnimateNumber className="stat-card-text font-semibold text-5xl text-foreground tabular-nums leading-none">
					{Number.isFinite(primaryValue) ? primaryValue : 0}
				</AnimateNumber>
				{secondaryValue != null &&
					Number.isFinite(secondaryValue) &&
					secondaryLabel && (
						<div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
							<div className="h-4 w-[2px] rounded-full bg-muted-foreground/25" />
							<span className="stat-card-text font-semibold text-base text-foreground tabular-nums leading-none">
								{secondaryValue}
							</span>
							<span className="stat-card-text text-muted-foreground text-xs leading-none">
								{secondaryLabel}
							</span>
						</div>
					)}
			</div>
		</div>
	);
}

// ─── Leave-without-saving dialog ─────────────────────────────────────────────

interface TeamLeaveDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

/**
 * Extracted "leave without saving" confirmation dialog.
 * Renders a Vaul Drawer on mobile and a Base UI Dialog on desktop,
 * identical to the pattern in /clienti/[id] and /trattative/aperte/[id].
 */
function TeamLeaveDialog({ isOpen, onClose, onConfirm }: TeamLeaveDialogProps) {
	const [layoutReady, setLayoutReady] = useState(false);
	const [isDesktop, setIsDesktop] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const mql = window.matchMedia("(max-width: 767px)");
		const handleChange = () => {
			setIsDesktop(!mql.matches);
		};
		handleChange();
		setLayoutReady(true);
		mql.addEventListener("change", handleChange);
		return () => {
			mql.removeEventListener("change", handleChange);
		};
	}, []);

	const dialogBody = (
		<>
			<div className="flex items-center justify-between gap-3 pb-6">
				<h2 className="font-bold text-2xl text-card-foreground tracking-tight">
					Modifiche non salvate
				</h2>
				<button
					aria-label="Chiudi"
					className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform focus:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
					onClick={onClose}
					type="button"
				>
					<X aria-hidden className="size-4" />
				</button>
			</div>
			<p className="text-muted-foreground text-sm">
				Hai apportato modifiche ai dati del team che non sono ancora state
				salvate. Sei sicuro di voler uscire senza salvare le modifiche?
			</p>
			<div className="mt-6 flex justify-between gap-3">
				<Button
					className="h-10 min-w-26 rounded-xl border-border bg-muted text-card-foreground text-sm hover:bg-muted/80 hover:text-card-foreground aria-expanded:bg-muted aria-expanded:text-card-foreground"
					onClick={onClose}
					type="button"
					variant="outline"
				>
					Resta sulla pagina
				</Button>
				<Button
					className="h-10 min-w-32 rounded-xl text-sm"
					onClick={onConfirm}
					type="button"
					variant="destructive"
				>
					Esci senza salvare
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
							aria-describedby="team-leave-desc"
							aria-labelledby="team-leave-title"
							className="data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-card px-6 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.55)] outline-none data-closed:animate-out data-open:animate-in"
						>
							<Dialog.Title className="sr-only" id="team-leave-title">
								Modifiche non salvate
							</Dialog.Title>
							<p className="sr-only" id="team-leave-desc">
								Conferma se vuoi uscire dalla pagina del team senza salvare le
								modifiche.
							</p>
							<div className="overflow-y-auto">{dialogBody}</div>
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
					<Drawer.Title className="sr-only">Modifiche non salvate</Drawer.Title>
					<Drawer.Description className="sr-only">
						Conferma se vuoi uscire dalla pagina del team senza salvare le
						modifiche.
					</Drawer.Description>
					<div className="mx-auto mt-0.5 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />
					<div className="min-h-0 flex-1 overflow-y-auto pt-2">
						{dialogBody}
					</div>
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	);
}

// ─── Creator participation tooltip & confirm dialog ──────────────────────────

interface CreatorParticipationTooltipProps {
	personalStats: NegotiationsStatistics | null;
	isLoading: boolean;
	error: string | null;
	onClose: () => void;
}

/**
 * Small tooltip below the "Partecipa" pill that explains what the action implies
 * and shows the personal KPI stats that are now contributing to the team.
 */
function CreatorParticipationTooltip({
	personalStats,
	isLoading,
	error,
	onClose,
}: CreatorParticipationTooltipProps) {
	const conclusionLabel =
		personalStats != null
			? `${new Intl.NumberFormat("it-IT", {
					maximumFractionDigits: 1,
				}).format(personalStats.conclusion_percentage)}%`
			: null;

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className="pointer-events-auto absolute top-[46%] left-1/2 z-20 w-80 -translate-x-1/2 rounded-2xl bg-popover px-3.5 py-3.25 text-left text-popover-foreground text-xs shadow-lg"
			exit={{ opacity: 0, y: -4 }}
			initial={{ opacity: 0, y: -6 }}
			role="status"
		>
			<div className="flex items-start justify-between gap-2">
				<div className="space-y-1">
					<p className="font-medium leading-snug">
						Partecipando al team, le tue statistiche personali vengono sommate a
						quelle del team.
					</p>
					<p className="text-[11px] text-muted-foreground leading-snug">
						Questo ti permette di confrontare facilmente le performance del team
						con il tuo contributo individuale. Puoi cambiare questa opzione in
						qualsiasi momento.
					</p>
				</div>
				<button
					aria-label="Chiudi il dettaglio della partecipazione"
					className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
					onClick={onClose}
					type="button"
				>
					<X aria-hidden className="size-3.5" />
				</button>
			</div>

			<div className="mt-2.5 rounded-xl bg-background px-2.5 py-2.25">
				{isLoading && (
					<p className="text-[11px] text-muted-foreground leading-snug">
						Caricamento delle tue statistiche personali…
					</p>
				)}

				{!isLoading && error && (
					<p className="text-[11px] text-destructive leading-snug">
						Impossibile recuperare le tue statistiche personali: {error}
					</p>
				)}

				{!(isLoading || error) && personalStats && (
					<dl className="space-y-1.5 text-[11px]">
						<div className="flex items-center justify-between gap-2">
							<dt className="text-muted-foreground">Trattative aperte</dt>
							<dd className="tabular-nums">
								{personalStats.total_open_negotiations}
							</dd>
						</div>
						<div className="flex items-center justify-between gap-2">
							<dt className="text-muted-foreground">% conclusione</dt>
							<dd className="tabular-nums">{conclusionLabel}</dd>
						</div>
						<div className="flex items-center justify-between gap-2">
							<dt className="text-muted-foreground">
								Importo medio aperte (tu)
							</dt>
							<dd className="tabular-nums">
								{formatCurrency(personalStats.average_open_amount)}
							</dd>
						</div>
						<div className="flex items-center justify-between gap-2">
							<dt className="text-muted-foreground">
								Importo medio concluse (tu)
							</dt>
							<dd className="tabular-nums">
								{formatCurrency(personalStats.average_concluded_amount)}
							</dd>
						</div>
					</dl>
				)}

				{!(isLoading || error || personalStats) && (
					<p className="text-[11px] text-muted-foreground leading-snug">
						Non siamo riusciti a recuperare le tue statistiche personali, ma la
						tua partecipazione verrà comunque conteggiata nelle statistiche del
						team.
					</p>
				)}
			</div>
		</motion.div>
	);
}

interface CreatorParticipationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	personalStats: NegotiationsStatistics | null;
	isLoading: boolean;
	error: string | null;
}

/**
 * Dialog di conferma mostrato quando il creatore disattiva la partecipazione al team.
 * Usa lo stesso pattern di TeamLeaveDialog (Dialog su desktop, Drawer su mobile) e
 * visualizza anche i KPI personali che verranno rimossi dalle statistiche del team.
 */
function CreatorParticipationDialog({
	isOpen,
	onClose,
	onConfirm,
	personalStats,
	isLoading,
	error,
}: CreatorParticipationDialogProps) {
	const [layoutReady, setLayoutReady] = useState(false);
	const [isDesktop, setIsDesktop] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const mql = window.matchMedia("(max-width: 767px)");
		const handleChange = () => {
			setIsDesktop(!mql.matches);
		};
		handleChange();
		setLayoutReady(true);
		mql.addEventListener("change", handleChange);
		return () => {
			mql.removeEventListener("change", handleChange);
		};
	}, []);

	const conclusionLabel =
		personalStats != null
			? `${new Intl.NumberFormat("it-IT", {
					maximumFractionDigits: 1,
				}).format(personalStats.conclusion_percentage)}%`
			: null;

	const body = (
		<>
			<div className="relative flex items-center justify-between gap-3 pb-4">
				<h2 className="pr-10 font-bold text-2xl text-card-foreground tracking-tight">
					Smettere di partecipare al team?
				</h2>
				<button
					aria-label="Chiudi"
					className="absolute top-0 right-0 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
					onClick={onClose}
					type="button"
				>
					<X aria-hidden className="size-4" />
				</button>
			</div>
			<p className="text-balance text-muted-foreground text-sm">
				<span className="text-foreground">
					Se non partecipi al team, le tue trattative personali non verranno più
					conteggiate nelle statistiche del team.
				</span>{" "}
				<br />
				<br />{" "}
				<span className="text-foreground">
					Questo può modificare le statistiche aggregate
				</span>{" "}
				(numero trattative aperte, percentuale di conclusione, importi medi,
				giorni medi di chiusura).
			</p>
			<div className="mt-4 rounded-xl bg-table-header px-3 py-3">
				<h3 className="mb-2 font-medium text-stats-title text-xs leading-none">
					Le tue statistiche che verranno rimosse dal team
				</h3>
				{isLoading && (
					<p className="text-[11px] text-muted-foreground leading-snug">
						Caricamento delle tue statistiche personali…
					</p>
				)}
				{!isLoading && error && (
					<p className="text-[11px] text-destructive leading-snug">
						Impossibile recuperare le tue statistiche personali: {error}
					</p>
				)}
				{!(isLoading || error) && personalStats && (
					<dl className="space-y-1.5 text-[11px]">
						<div className="flex items-center justify-between gap-2">
							<dt className="text-muted-foreground">Trattative aperte</dt>
							<dd className="tabular-nums">
								{personalStats.total_open_negotiations}
							</dd>
						</div>
						<div className="flex items-center justify-between gap-2">
							<dt className="text-muted-foreground">% conclusione</dt>
							<dd className="tabular-nums">{conclusionLabel}</dd>
						</div>
						<div className="flex items-center justify-between gap-2">
							<dt className="text-muted-foreground">
								Importo medio aperte (tu)
							</dt>
							<dd className="tabular-nums">
								{formatCurrency(personalStats.average_open_amount)}
							</dd>
						</div>
						<div className="flex items-center justify-between gap-2">
							<dt className="text-muted-foreground">
								Importo medio concluse (tu)
							</dt>
							<dd className="tabular-nums">
								{formatCurrency(personalStats.average_concluded_amount)}
							</dd>
						</div>
					</dl>
				)}
				{!(isLoading || error || personalStats) && (
					<p className="text-[11px] text-muted-foreground leading-snug">
						Non siamo riusciti a recuperare le tue statistiche personali, ma la
						tua partecipazione verrà comunque rimossa dal team.
					</p>
				)}
			</div>
			<div className="mt-6 flex justify-between gap-3">
				<Button
					className="h-10 min-w-26 rounded-xl border-border bg-muted text-card-foreground text-sm hover:bg-muted/80 hover:text-card-foreground aria-expanded:bg-muted aria-expanded:text-card-foreground"
					onClick={onClose}
					type="button"
					variant="outline"
				>
					Annulla
				</Button>
				<Button
					className="h-10 min-w-32 rounded-xl text-sm"
					onClick={onConfirm}
					type="button"
					variant="destructive"
				>
					Conferma: non partecipo
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
							aria-describedby="creator-participation-desc"
							aria-labelledby="creator-participation-title"
							className="data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-card px-6 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.55)] outline-none data-closed:animate-out data-open:animate-in"
						>
							<Dialog.Title
								className="sr-only"
								id="creator-participation-title"
							>
								Conferma rimozione partecipazione dal team
							</Dialog.Title>
							<p className="sr-only" id="creator-participation-desc">
								Conferma se vuoi smettere di partecipare a questo team e
								rimuovere le tue statistiche personali dal team.
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
					<Drawer.Title className="sr-only">
						Conferma rimozione partecipazione dal team
					</Drawer.Title>
					<Drawer.Description className="sr-only">
						Conferma se vuoi smettere di partecipare a questo team e rimuovere
						le tue statistiche personali dal team.
					</Drawer.Description>
					<div className="mx-auto mt-0.5 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />
					<div className="min-h-0 flex-1 overflow-y-auto pt-2">{body}</div>
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	);
}
