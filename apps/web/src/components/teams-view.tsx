"use client";

import { ArrowRight, Plus } from "lucide-react";
import { AnimateNumber } from "motion-plus/react";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { listMyTeams, listTeams } from "@/lib/api/client";
import type { ApiTeam, ApiTeamMinimal } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { UserGroupIcon } from "./icons/user-group";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { AvatarGroup, AvatarGroupTooltip } from "./ui/avatar-group";
import { Skeleton } from "./ui/skeleton";

/**
 * TeamsView — Main component for /team page.
 * Director: full team list with stats and actions (create, detail).
 * Seller: minimal "I miei team" list (id, name, creator).
 */
export function TeamsView() {
	const { token, role } = useAuth();
	const router = useRouter();
	const isDirector = role === "director";

	// Director state: full team list
	const [teams, setTeams] = useState<ApiTeam[]>([]);
	// Seller state: minimal team list
	const [myTeams, setMyTeams] = useState<ApiTeamMinimal[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchTeams = useCallback(async () => {
		if (!token) {
			return;
		}
		setLoading(true);
		setError(null);

		if (isDirector) {
			const result = await listTeams(token);
			setLoading(false);
			if ("error" in result) {
				setError(result.error);
				setTeams([]);
				return;
			}
			setTeams(result.data);
		} else {
			const result = await listMyTeams(token);
			setLoading(false);
			if ("error" in result) {
				setError(result.error);
				setMyTeams([]);
				return;
			}
			setMyTeams(result.data);
		}
	}, [token, isDirector]);

	useEffect(() => {
		fetchTeams();
	}, [fetchTeams]);

	const handleOpenTeamDetail = useCallback(
		(teamId: number) => {
			// biome-ignore lint/suspicious/noExplicitAny: dynamic route path
			router.push(`/team/${teamId}` as any);
		},
		[router]
	);

	/**
	 * Shared loading state for team cards.
	 * Minimal skeleton with title, subtitle and two meta pills.
	 */
	const cardsSkeleton = (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
			{Array.from({ length: 6 }).map((_, i) => (
				<div
					className="flex min-h-40 flex-col justify-between rounded-4xl bg-table-header p-5"
					key={`team-card-skeleton-${String(i)}`}
				>
					<div className="flex flex-col gap-3">
						<div className="flex items-center justify-between gap-3">
							<Skeleton className="h-5 w-36" />
							<Skeleton className="h-5 w-20 rounded-full" />
						</div>
						<Skeleton className="h-4 w-52" />
					</div>
				</div>
			))}
		</div>
	);

	// Seller view: minimal "I miei team"
	if (!isDirector) {
		return (
			<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
				<div className="relative flex w-full items-center justify-between gap-4.5">
					<h1 className="flex items-center justify-center gap-3.5">
						<UserGroupIcon aria-hidden size={24} />
						<span>I miei Team</span>
					</h1>
				</div>

				<div className="table-container-bg flex min-h-0 flex-1 flex-col gap-6.25 rounded-t-3xl px-5.5 pt-6.25">
					{loading && cardsSkeleton}

					{!loading && error && (
						<div className="flex h-full items-center justify-center p-8">
							<p className="text-center text-destructive">{error}</p>
						</div>
					)}

					{!(loading || error) && myTeams.length === 0 && (
						<div className="flex h-full items-center justify-center p-8">
							<p className="text-center text-stats-title">
								Non sei assegnato a nessun team
							</p>
						</div>
					)}

					{!(loading || error) && myTeams.length > 0 && (
						<div className="scroll-fade-y min-h-0 flex-1 overflow-y-auto pb-5">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
								{myTeams.map((team) => (
									// biome-ignore lint/a11y/useSemanticElements: card contains nested button-like controls
									<div
										className="group flex min-h-40 cursor-pointer flex-col justify-between rounded-4xl bg-table-header p-5 transition-colors duration-200 hover:bg-table-hover"
										key={team.id}
										onClick={() => handleOpenTeamDetail(team.id)}
										onKeyDown={(event) => {
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												handleOpenTeamDetail(team.id);
											}
										}}
										role="button"
										tabIndex={0}
									>
										<div className="flex items-start justify-between gap-3">
											<div className="flex min-w-0 items-center gap-3">
												<Avatar aria-hidden className="size-10 shrink-0">
													<AvatarFallback placeholderSeed={team.nome} />
												</Avatar>
												<div className="min-w-0">
													<h3 className="truncate font-semibold text-base leading-none">
														{team.nome}
													</h3>
													<p className="mt-2 truncate text-muted-foreground text-sm">
														Creato da {team.creator_name}
													</p>
												</div>
											</div>
											<ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
										</div>
										<div className="mt-4 flex items-center gap-2">
											<span className="inline-flex items-center rounded-full bg-table-header px-2.5 py-1 font-medium text-muted-foreground text-xs">
												Vista assegnato
											</span>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</main>
		);
	}

	// Director view: full team list with stats and actions
	const totalMembers = teams.reduce(
		(sum, t) => sum + (t.effective_members_count ?? 0),
		0
	);

	return (
		<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
			{/* Header */}
			<div className="relative flex w-full items-center justify-between gap-4.5">
				<h1 className="flex items-center justify-center gap-3.5">
					<UserGroupIcon aria-hidden size={24} />
					<span>Team</span>
				</h1>
				<div className="flex items-center justify-end gap-2">
					<button
						aria-label="Crea team"
						className="flex cursor-pointer items-center justify-center gap-2.5 rounded-full bg-table-buttons px-3.75 py-1.75 text-sm"
						onClick={() => {
							// biome-ignore lint/suspicious/noExplicitAny: dynamic route path
							router.push("/team/crea" as any);
						}}
						type="button"
					>
						Crea team
						<Plus className="size-4 text-button-secondary" />
					</button>
				</div>
			</div>

			{/* Body */}
			<div className="table-container-bg flex min-h-0 flex-1 flex-col gap-6.25 rounded-t-3xl px-5.5 pt-6.25">
				{/* Stats cards */}
				<div className="flex flex-wrap items-start gap-3.75">
					<div className="relative flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75">
						<div
							aria-hidden
							className="pointer-events-none absolute right-0 bottom-0 opacity-[0.08]"
						>
							<UserGroupIcon
								aria-hidden
								className="text-black dark:text-white"
								size={56}
							/>
						</div>
						<h3 className="font-medium text-sm text-stats-title leading-none">
							Totale team
						</h3>
						<div className="flex items-center justify-start">
							<AnimateNumber className="text-xl tabular-nums leading-none">
								{teams.length}
							</AnimateNumber>
						</div>
					</div>
					<div className="relative flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75">
						<div
							aria-hidden
							className="pointer-events-none absolute right-0 bottom-0 opacity-[0.08]"
						>
							<UserGroupIcon
								aria-hidden
								className="text-black dark:text-white"
								size={56}
							/>
						</div>
						<h3 className="font-medium text-sm text-stats-title leading-none">
							Totale membri
						</h3>
						<div className="flex items-center justify-start">
							<AnimateNumber className="text-xl tabular-nums leading-none">
								{totalMembers}
							</AnimateNumber>
						</div>
					</div>
				</div>

				{/* Team cards */}
				<div className="scroll-fade-y min-h-0 flex-1 overflow-y-auto pb-5">
					{loading && cardsSkeleton}
					{!loading && error && (
						<div className="flex h-full items-center justify-center p-8">
							<p className="text-center text-destructive">{error}</p>
						</div>
					)}
					{!(loading || error) && teams.length === 0 && (
						<div className="flex h-full items-center justify-center p-8">
							<p className="text-center text-stats-title">Nessun team creato</p>
						</div>
					)}
					{!(loading || error) && teams.length > 0 && (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
							{teams.map((team) => {
								// When list API omits users array, show overflow count
								const overflowCount = team.users?.length
									? 0
									: Math.max(
											0,
											(team.effective_members_count ?? team.users_count ?? 1) -
												1
										);

								// Build avatar children for AvatarGroup
								let memberAvatars: React.ReactElement[] = [];
								if (team.users?.length) {
									memberAvatars = team.users.map((user) => (
										<Avatar
											className="size-8 border-2 border-background"
											key={user.id}
										>
											<AvatarFallback
												className="bg-card text-muted-foreground text-xs"
												placeholderSeed={`${user.nome} ${user.cognome}`}
											/>
											<AvatarGroupTooltip>
												<span>
													{user.nome} {user.cognome}
												</span>
											</AvatarGroupTooltip>
										</Avatar>
									));
								} else if (overflowCount > 0) {
									memberAvatars = [
										<Avatar
											className="size-8 border-2 border-background"
											key="overflow"
										>
											<AvatarFallback
												className="bg-card text-muted-foreground text-xs"
												placeholderSeed={`+${overflowCount}`}
											>
												+{overflowCount}
											</AvatarFallback>
											<AvatarGroupTooltip>
												<span>+{overflowCount} altri membri</span>
											</AvatarGroupTooltip>
										</Avatar>,
									];
								}

								return (
									// biome-ignore lint/a11y/useSemanticElements: card contains nested action buttons
									<div
										className="group flex min-h-fit max-w-md cursor-pointer flex-col justify-between gap-8 rounded-4xl bg-table-header p-5 transition-colors duration-200 hover:bg-table-hover"
										key={team.id}
										onClick={() => handleOpenTeamDetail(team.id)}
										onKeyDown={(event) => {
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												handleOpenTeamDetail(team.id);
											}
										}}
										role="button"
										tabIndex={0}
									>
										<div className="flex items-start justify-between gap-3">
											<div className="flex min-w-0 items-center gap-3">
												<Avatar aria-hidden className="mt-0.5 size-10 shrink-0">
													<AvatarFallback placeholderSeed={team.nome} />
												</Avatar>
												<div className="flex min-w-0 flex-col gap-1">
													<h3 className="truncate leading-none">{team.nome}</h3>
													<p className="text-muted-foreground text-sm leading-none">
														{team.description?.trim() ||
															"Nessuna descrizione disponibile"}
													</p>
												</div>
											</div>
											<ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
										</div>
										<div className="flex w-full flex-wrap items-stretch gap-2">
											{/* Creatore — wrapper with title (more width) */}
											<div className="flex min-w-0 flex-[2] flex-col items-start justify-center rounded-2xl bg-background px-2.5 py-2.5 pr-4 font-medium text-muted-foreground text-xs leading-none">
												<div className="flex items-center gap-2">
													<Avatar aria-hidden>
														<AvatarFallback
															className="bg-card"
															placeholderSeed={`${team.creator.nome} ${team.creator.cognome}`}
														/>
													</Avatar>
													<div className="flex flex-col gap-1">
														<h4 className="font-medium text-stats-title leading-none">
															Creatore
														</h4>
														<span className="text-foreground text-sm leading-none">
															{team.creator.nome} {team.creator.cognome}
														</span>
													</div>
												</div>
											</div>
											{/* Membri — wrapper with title for avatar group */}
											{memberAvatars.length > 0 ? (
												<div className="flex min-w-0 flex-1 flex-col items-start justify-center rounded-2xl bg-background px-2.5 py-2.5 pr-4 font-medium text-muted-foreground text-xs leading-none">
													<h4 className="font-medium text-stats-title leading-none">
														Membri
													</h4>
													<AvatarGroup className="mt-1.5 h-8 -space-x-2">
														{memberAvatars}
													</AvatarGroup>
												</div>
											) : null}
											{/* Partecipa — wrapper with title for creator participation badge (less width) */}
											{team.creator_participates && (
												<div className="flex min-w-0 flex-[1] flex-col items-start justify-center rounded-2xl bg-background px-2.5 py-2.5 pr-4 font-medium text-muted-foreground text-xs leading-none">
													<h4 className="font-medium text-stats-title leading-none">
														Stato
													</h4>
													<span className="mt-1.5 inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-800 text-xs dark:bg-green-900/30 dark:text-green-400">
														Partecipa
													</span>
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
