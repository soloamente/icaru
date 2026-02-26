"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Check, ChevronDown, Crown, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AnimateNumber } from "motion-plus/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "vaul";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
	addTeamMembers,
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
} from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { registerUnsavedNavigationListener } from "@/lib/unsaved-navigation";
import { cn } from "@/lib/utils";
import { IconUTurnToLeft } from "./icons";
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

	// Loading skeleton — same shell as other detail pages
	if (loading) {
		return (
			<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
				<div className="flex items-center gap-3.5">
					<Skeleton className="size-6 rounded" />
					<Skeleton className="h-6 w-48" />
				</div>
				<div className="table-container-bg flex min-h-0 flex-1 flex-col gap-8 rounded-t-3xl px-5.5 pt-6.25">
					{/* Form section skeleton */}
					<div className="flex w-full gap-3 rounded-2xl bg-card px-7.5 py-10">
						<Skeleton className="h-6 w-32" />
						<div className="flex w-full flex-col gap-2">
							<Skeleton className="h-14 w-full rounded-2xl" />
							<Skeleton className="h-14 w-full rounded-2xl" />
						</div>
					</div>
					{/* Creator skeleton */}
					<div className="flex flex-col items-center gap-4">
						<Skeleton className="h-24 w-56 rounded-2xl" />
						<Skeleton className="h-px w-px rounded-full" />
					</div>
					{/* Members skeleton grid */}
					<div className="flex flex-wrap justify-center gap-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton
								className="h-20 w-48 rounded-2xl"
								key={`ms-${String(i)}`}
							/>
						))}
					</div>
				</div>
			</main>
		);
	}

	if (error && !team) {
		return (
			<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
				<div className="relative flex w-full flex-col gap-4.5">
					<div className="flex items-center justify-start gap-2.5">
						<button
							aria-label="Torna alla lista team"
							className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
		<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
			{/* Header: back + title on left, Cancel + Save on right — same pattern as /clienti/[id] */}
			<div className="relative flex w-full flex-col gap-4.5">
				<div className="flex items-center justify-between gap-2.5">
					<div className="flex min-w-0 flex-1 items-center justify-start gap-1">
						<button
							aria-label="Torna alla lista team"
							className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
					{/* Stats cards — at the very top, same pattern as /team list page */}
					{isDirector && stats && (
						<div className="flex flex-wrap items-start gap-3.75">
							<StatCard
								count={stats.pipeline.count}
								importo={formatCurrency(stats.pipeline.total_importo)}
								title="Pipeline"
							/>
							<StatCard
								count={stats.concluded.count}
								importo={formatCurrency(stats.concluded.total_importo)}
								title="Concluse"
							/>
							<StatCard
								count={stats.abandoned.count}
								importo={formatCurrency(stats.abandoned.total_importo)}
								title="Abbandonate"
							/>
							<div className="flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75">
								<h3 className="font-medium text-sm text-stats-title leading-none">
									Membri effettivi
								</h3>
								<AnimateNumber className="text-xl tabular-nums leading-none">
									{stats.effective_members_count}
								</AnimateNumber>
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
	const { token } = useAuth();
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [addingMemberId, setAddingMemberId] = useState<number | null>(null);
	const [removingUserId, setRemovingUserId] = useState<number | null>(null);
	const [togglingParticipates, setTogglingParticipates] = useState(false);
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

	const members = team.users ?? [];
	const currentMemberIds = new Set(members.map((u: ApiTeamUser) => u.id));
	const filteredAvailable = availableMembers.filter(
		(m) => !currentMemberIds.has(m.id)
	);
	// Whether the "add member" skeleton is shown, and total items in the member row
	const hasAddSkeleton = isDirector && filteredAvailable.length > 0;
	const totalOrgItems = members.length + (hasAddSkeleton ? 1 : 0);

	return (
		<>
			{/* Org chart card — same container as "Dati team" */}
			<section className={`${SECTION_CARD_CLASSES} flex-col items-center`}>
				<CreatorNode
					creator={team.creator}
					creatorParticipates={team.creator_participates}
					isDirector={isDirector}
					isToggling={togglingParticipates}
					onToggleParticipates={handleToggleCreatorParticipates}
				/>

				{/* Connector lines + member cards */}
				{totalOrgItems > 0 && (
					<>
						{/* Vertical stem from creator down to the horizontal bar */}
						<div className="h-8 w-px bg-muted-foreground/20" />

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
			</section>
		</>
	);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface CreatorNodeProps {
	creator: { id: number; nome: string; cognome: string };
	creatorParticipates: boolean;
	isDirector: boolean;
	isToggling: boolean;
	onToggleParticipates: () => void;
}

/** Creator card — top of the org chart with crown badge and participates toggle. */
function CreatorNode({
	creator,
	creatorParticipates,
	isDirector,
	isToggling,
	onToggleParticipates,
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
				<Crown className="size-3" />
				<span>Creatore</span>
			</div>

			<Avatar className="size-11">
				<AvatarFallback placeholderSeed={fullName} />
			</Avatar>
			<span className="text-center font-medium text-sm leading-tight">
				{fullName}
			</span>
			<span className="text-center text-muted-foreground text-xs">
				Direttore Vendite
			</span>

			{/* Participates toggle (only directors can toggle) */}
			{isDirector && (
				<button
					className={`mt-1 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
						creatorParticipates
							? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
							: "bg-muted text-muted-foreground"
					} ${isToggling ? "opacity-50" : "hover:opacity-80"}`}
					disabled={isToggling}
					onClick={onToggleParticipates}
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
}

/** Member card in the org chart grid. */
function MemberNode({
	member,
	isDirector,
	isRemoving,
	onRemove,
}: MemberNodeProps) {
	const fullName = `${member.nome} ${member.cognome}`;

	return (
		<motion.div
			animate={{ opacity: 1, scale: 1 }}
			className="group relative flex w-48 flex-col items-center gap-1.5 rounded-2xl bg-table-header px-3 py-4 transition-colors hover:bg-table-hover"
			exit={{ opacity: 0, scale: 0.9 }}
			initial={{ opacity: 0, scale: 0.95 }}
			layout
			transition={{ duration: 0.15 }}
		>
			<Avatar className="size-9">
				<AvatarFallback placeholderSeed={fullName} />
			</Avatar>
			<span className="text-center font-medium text-sm leading-tight">
				{fullName}
			</span>
			<span className="max-w-full truncate text-center text-muted-foreground text-xs">
				{member.email}
			</span>

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
					"flex w-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl bg-table-header px-3 py-6 transition-colors hover:bg-table-hover",
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
					className={`size-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
				/>
			</motion.button>

			{/* Dropdown with available members */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="absolute top-full right-0 left-0 z-30 mt-2 max-h-56 overflow-y-auto rounded-xl bg-popover shadow-lg"
						exit={{ opacity: 0, y: -4 }}
						initial={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.15 }}
					>
						{availableMembers.length === 0 ? (
							<div className="p-3 text-center text-muted-foreground text-sm">
								Nessun membro disponibile
							</div>
						) : (
							availableMembers
								.filter(
									(m): m is ApiAvailableMember =>
										m != null &&
										typeof m.nome === "string" &&
										typeof m.id === "number"
								)
								.map((member) => (
									<button
										className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-muted disabled:opacity-50"
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
											<span className="truncate font-medium">
												{member.nome} {member.cognome}
											</span>
											<span className="truncate text-muted-foreground text-xs">
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
								))
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

interface StatCardProps {
	title: string;
	count: number;
	importo: string;
}

/** Stat card for team statistics — same bg-table-header style as /team list page. */
function StatCard({ title, count, importo }: StatCardProps) {
	return (
		<div className="flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75">
			<h3 className="font-medium text-sm text-stats-title leading-none">
				{title}
			</h3>
			<div className="flex items-center gap-2">
				<AnimateNumber className="text-xl tabular-nums leading-none">
					{count}
				</AnimateNumber>
				<span className="text-muted-foreground text-sm leading-none">
					trattative
				</span>
				<div className="h-4 w-[2px] rounded-full bg-muted-foreground/25" />
				<span className="font-medium text-sm tabular-nums leading-none">
					{importo}
				</span>
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
