"use client";

import {
	ArrowLeft,
	Check,
	ChevronDown,
	Crown,
	Plus,
	Trash2,
	Users,
	X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AnimateNumber } from "motion-plus/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Skeleton } from "./ui/skeleton";

interface TeamOrgChartProps {
	teamId: number;
}

/**
 * TeamOrgChart — Organization chart for a single team.
 *
 * Layout:
 * - Creator node at the top center (with crown badge, participates toggle)
 * - Vertical connector line
 * - Member nodes in a responsive grid below
 * - "Add member" skeleton placeholder with + icon
 * - Stats section at the bottom (pipeline, concluded, abandoned)
 */
export function TeamOrgChart({ teamId }: TeamOrgChartProps) {
	const { token, role } = useAuth();
	const router = useRouter();
	const isDirector = role === "director";

	const [team, setTeam] = useState<ApiTeam | null>(null);
	const [stats, setStats] = useState<ApiTeamStats | null>(null);
	const [availableMembers, setAvailableMembers] = useState<
		ApiAvailableMember[]
	>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	// Controls the "add member" dropdown
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [addingMemberId, setAddingMemberId] = useState<number | null>(null);
	const [removingUserId, setRemovingUserId] = useState<number | null>(null);
	const [togglingParticipates, setTogglingParticipates] = useState(false);
	// Ref for click-outside on add member dropdown
	const addDropdownRef = useRef<HTMLDivElement>(null);

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
				setError(result.error);
				return;
			}
			setTeam(result.data);
			setIsAddOpen(false);
			// Refresh stats and available members after adding
			fetchStats();
			fetchAvailableMembers();
		},
		[token, teamId, fetchStats, fetchAvailableMembers]
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
				setError(result.error);
				return;
			}
			setTeam(result.data);
			fetchStats();
			fetchAvailableMembers();
		},
		[token, teamId, fetchStats, fetchAvailableMembers]
	);

	const handleToggleCreatorParticipates = useCallback(async () => {
		if (!(token && team)) {
			return;
		}
		setTogglingParticipates(true);
		const result = await updateTeam(token, teamId, {
			creator_participates: !team.creator_participates,
		});
		setTogglingParticipates(false);
		if ("error" in result) {
			setError(result.error);
			return;
		}
		setTeam(result.data);
		fetchStats();
	}, [token, team, teamId, fetchStats]);

	// Filter available members: exclude those already in team
	const currentMemberIds = new Set(
		(team?.users ?? []).map((u: ApiTeamUser) => u.id)
	);
	const filteredAvailable = availableMembers.filter(
		(m) => !currentMemberIds.has(m.id)
	);

	/** Format currency for stats display */
	function formatCurrency(value: number): string {
		return new Intl.NumberFormat("it-IT", {
			style: "currency",
			currency: "EUR",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(value);
	}

	// Loading skeleton
	if (loading) {
		return (
			<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
				<div className="flex items-center gap-3.5">
					<Skeleton className="size-6 rounded" />
					<Skeleton className="h-6 w-48" />
				</div>
				<div className="table-container-bg flex min-h-0 flex-1 flex-col gap-8 rounded-t-3xl px-5.5 pt-6.25">
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
			<main className="m-2.5 flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
				<p className="text-destructive">{error}</p>
				<button
					className="rounded-lg px-4 py-2 text-sm hover:bg-muted"
					onClick={() => router.back()}
					type="button"
				>
					Torna indietro
				</button>
			</main>
		);
	}

	if (!team) {
		return null;
	}

	const members = team.users ?? [];

	return (
		<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
			{/* Header */}
			<div className="relative flex w-full items-center justify-between gap-4.5">
				<div className="flex items-center gap-3.5">
					<button
						aria-label="Torna alla lista team"
						className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
						onClick={() => router.back()}
						type="button"
					>
						<ArrowLeft className="size-5" />
					</button>
					<h1 className="flex items-center justify-center gap-3.5">
						<Users aria-hidden size={24} />
						<span>{team.nome}</span>
					</h1>
				</div>
				{team.description && (
					<span className="truncate text-muted-foreground text-sm">
						{team.description}
					</span>
				)}
			</div>

			{/* Org Chart body */}
			<div className="table-container-bg flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto rounded-t-3xl px-5.5 pt-6.25 pb-8">
				{/* Error banner */}
				{error && (
					<div className="mb-4 rounded-lg bg-destructive/10 px-4 py-2 text-center text-destructive text-sm">
						{error}
					</div>
				)}

				{/* ─── ORG CHART ─── */}
				<div className="flex flex-col items-center gap-0">
					{/* Creator node */}
					<CreatorNode
						creator={team.creator}
						creatorParticipates={team.creator_participates}
						isDirector={isDirector}
						isToggling={togglingParticipates}
						onToggleParticipates={handleToggleCreatorParticipates}
					/>

					{/* Vertical connector from creator to members row */}
					{(members.length > 0 ||
						(isDirector && filteredAvailable.length > 0)) && (
						<div className="flex flex-col items-center">
							<div className="h-8 w-px bg-border" />
							{/* Horizontal rail that spans the width of the member grid */}
							<div className="h-px w-full max-w-[calc(100%-4rem)] bg-border" />
						</div>
					)}

					{/* Members grid + add skeleton */}
					<div className="mt-0 flex flex-wrap items-start justify-center gap-6 pt-2">
						{members.map((member) => (
							<div className="flex flex-col items-center gap-0" key={member.id}>
								{/* Vertical connector from rail to node */}
								<div className="h-4 w-px bg-border" />
								<MemberNode
									isDirector={isDirector}
									isRemoving={removingUserId === member.id}
									member={member}
									onRemove={() => handleRemoveMember(member.id)}
								/>
							</div>
						))}

						{/* "Add member" skeleton placeholder — only for directors with available members */}
						{isDirector && filteredAvailable.length > 0 && (
							<div
								className="flex flex-col items-center gap-0"
								ref={addDropdownRef}
							>
								<div className="h-4 w-px bg-border" />
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
				</div>

				{/* ─── STATS ─── */}
				{isDirector && stats && (
					<div className="mt-10 flex flex-col gap-4">
						<h2 className="font-medium text-muted-foreground text-sm">
							Statistiche team
						</h2>
						<div className="flex flex-wrap items-start gap-3.75">
							<StatCard
								count={stats.pipeline.count}
								importo={formatCurrency(stats.pipeline.total_importo)}
								title="Pipeline"
								variant="sky"
							/>
							<StatCard
								count={stats.concluded.count}
								importo={formatCurrency(stats.concluded.total_importo)}
								title="Concluse"
								variant="green"
							/>
							<StatCard
								count={stats.abandoned.count}
								importo={formatCurrency(stats.abandoned.total_importo)}
								title="Abbandonate"
								variant="red"
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
					</div>
				)}
			</div>
		</main>
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
			className="relative flex w-60 flex-col items-center gap-2 rounded-2xl border-2 border-amber-300/50 bg-linear-to-b from-amber-50 to-amber-100/30 px-4 py-5 shadow-sm dark:border-amber-700/40 dark:from-amber-950/30 dark:to-amber-900/10"
			initial={{ opacity: 0, y: -10 }}
			transition={{ duration: 0.2, ease: "easeOut" }}
		>
			{/* Crown badge */}
			<div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-amber-200 px-2 py-0.5 text-amber-800 text-xs dark:bg-amber-800/60 dark:text-amber-200">
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
			className="group relative flex w-48 flex-col items-center gap-1.5 rounded-2xl border border-border bg-background px-3 py-4 shadow-sm transition-shadow hover:shadow-md"
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

			{/* Remove button — visible on hover (directors only) */}
			{isDirector && (
				<button
					aria-label={`Rimuovi ${fullName} dal team`}
					className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow-sm transition-opacity disabled:opacity-30 group-hover:opacity-100"
					disabled={isRemoving}
					onClick={onRemove}
					type="button"
				>
					<Trash2 className="size-3" />
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
				animate={{
					borderColor: isOpen ? "var(--color-primary)" : "var(--color-border)",
				}}
				aria-expanded={isOpen}
				aria-label="Aggiungi membro al team"
				className="flex w-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-muted/30 px-3 py-6 transition-colors hover:bg-muted/60"
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
						className="absolute top-full right-0 left-0 z-30 mt-2 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg"
						exit={{ opacity: 0, y: -4 }}
						initial={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.15 }}
					>
						{availableMembers.length === 0 ? (
							<div className="p-3 text-center text-muted-foreground text-sm">
								Nessun membro disponibile
							</div>
						) : (
							availableMembers.map((member) => (
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
									<div className="flex min-w-0 flex-1 flex-col">
										<span className="truncate font-medium">
											{member.nome} {member.cognome}
										</span>
										<span className="truncate text-muted-foreground text-xs">
											{member.role.nome}
										</span>
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
	variant: "sky" | "green" | "red";
}

/** Stat card for team statistics (pipeline, concluded, abandoned). */
function StatCard({ title, count, importo, variant }: StatCardProps) {
	const variantStyles = {
		sky: "bg-sky-50 dark:bg-sky-950/20",
		green: "bg-green-50 dark:bg-green-950/20",
		red: "bg-red-50 dark:bg-red-950/20",
	};

	return (
		<div
			className={`flex flex-col items-start justify-center gap-2 rounded-xl p-3.75 ${variantStyles[variant]}`}
		>
			<h3 className="font-medium text-sm text-stats-title leading-none">
				{title}
			</h3>
			<div className="flex items-baseline gap-2">
				<AnimateNumber className="text-xl tabular-nums leading-none">
					{count}
				</AnimateNumber>
				<span className="text-muted-foreground text-sm">trattative</span>
			</div>
			<span className="font-medium text-sm tabular-nums">{importo}</span>
		</div>
	);
}
