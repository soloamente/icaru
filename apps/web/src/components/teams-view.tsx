"use client";

import { Plus } from "lucide-react";
import { AnimateNumber } from "motion-plus/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { listMyTeams, listTeams } from "@/lib/api/client";
import type { ApiTeam, ApiTeamMinimal } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { AnimatedEmptyState } from "./animated-empty-state";
import { IconArrowUpRightFill12 } from "./icons/icon-arrow-up-right-fill-12";
import { UserGroupIcon } from "./icons/user-group";
import { Avatar, AvatarFallback } from "./ui/avatar";
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
	 * Loading skeleton for Director team cards.
	 * Mirrors the real card layout: avatar, name, description, Creatore pill, Membri pill.
	 */
	const directorCardsSkeleton = (
		<div className="flex flex-wrap gap-4">
			{Array.from({ length: 6 }).map((_, i) => (
				<div
					className="flex min-h-fit min-w-0 max-w-md flex-[1_1_100%] flex-col justify-between gap-8 rounded-4xl bg-table-header p-5 md:flex-[1_1_calc(50%-0.5rem)] xl:flex-[1_1_calc(33.333%-0.67rem)]"
					key={`team-card-skeleton-${String(i)}`}
				>
					<div className="flex items-start justify-between gap-3">
						<div className="flex min-w-0 items-center gap-3">
							<Skeleton aria-hidden className="size-10 shrink-0 rounded-full" />
							<div className="flex min-w-0 flex-col gap-1">
								<Skeleton className="h-5 w-36" />
								<Skeleton className="h-4 w-40" />
							</div>
						</div>
						<Skeleton aria-hidden className="size-4 shrink-0" />
					</div>
					<div className="flex w-full flex-wrap items-stretch gap-2">
						{/* Creatore card placeholder */}
						<div className="flex min-w-0 flex-2 flex-col items-start justify-center gap-2 rounded-2xl bg-team-info-card px-2.5 py-2.5 pr-4">
							<div className="flex items-center gap-2">
								<Skeleton
									aria-hidden
									className="size-8 shrink-0 rounded-full"
								/>
								<div className="flex flex-col gap-1">
									<Skeleton className="h-3 w-14" />
									<Skeleton className="h-4 w-24" />
								</div>
							</div>
						</div>
						{/* Membri card placeholder */}
						<div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-1.5 rounded-2xl bg-team-info-card px-2.5 py-2.5 pr-4">
							<Skeleton className="h-3 w-12" />
							<Skeleton className="h-4 w-8" />
						</div>
					</div>
				</div>
			))}
		</div>
	);

	/**
	 * Loading skeleton for Seller "I miei team" cards.
	 * Titolo + Creatore pill only (no descrizione, no Membri — non presenti nell'API).
	 */
	const sellerCardsSkeleton = (
		<div className="flex flex-wrap gap-4">
			{Array.from({ length: 6 }).map((_, i) => (
				<div
					className="flex min-h-fit min-w-0 max-w-md flex-[1_1_100%] flex-col justify-between gap-4 rounded-4xl bg-table-header p-5 md:flex-[1_1_calc(50%-0.5rem)] xl:flex-[1_1_calc(33.333%-0.67rem)]"
					key={`team-card-skeleton-${String(i)}`}
				>
					<div className="flex items-start justify-between gap-3">
						<div className="flex min-w-0 items-center gap-3">
							<Skeleton aria-hidden className="size-10 shrink-0 rounded-full" />
							<Skeleton className="h-5 w-36" />
						</div>
					</div>
					{/* Creatore card placeholder */}
					<div className="flex min-w-0 flex-col items-start justify-center gap-2 rounded-2xl bg-team-info-card px-2.5 py-2.5 pr-4">
						<div className="flex items-center gap-2">
							<Skeleton aria-hidden className="size-8 shrink-0 rounded-full" />
							<div className="flex flex-col gap-1">
								<Skeleton className="h-3 w-14" />
								<Skeleton className="h-4 w-24" />
							</div>
						</div>
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
						<span>I miei team</span>
					</h1>
				</div>

				<div className="table-container-bg flex min-h-0 flex-1 flex-col gap-6.25 rounded-t-3xl px-5.5 pt-6.25">
					{loading && sellerCardsSkeleton}

					{!loading && error && (
						<div className="flex h-full items-center justify-center p-8">
							<p className="text-center text-destructive">{error}</p>
						</div>
					)}

					{!(loading || error) && myTeams.length === 0 && (
						<AnimatedEmptyState
							heading="Non sei assegnato a nessun team"
							icon={
								<div className="opacity-50">
									<UserGroupIcon
										aria-hidden
										className="text-muted-foreground"
										size={64}
									/>
								</div>
							}
							subtitle="Contatta il direttore per essere aggiunto a un team"
						/>
					)}

					{!(loading || error) && myTeams.length > 0 && (
						<div className="scroll-fade-y min-h-0 flex-1 overflow-y-auto pb-5">
							<div className="flex flex-wrap gap-4">
								{/* Card venditori: titolo + Creatore. Non cliccabile (nessun redirect). */}
								{myTeams.map((team) => (
									<div
										className="flex min-h-fit min-w-0 max-w-md flex-[1_1_100%] flex-col justify-between gap-4 rounded-4xl bg-table-header p-5 md:flex-[1_1_calc(50%-0.5rem)] xl:flex-[1_1_calc(33.333%-0.67rem)]"
										key={team.id}
									>
										{/* Titolo: solo nome team, senza descrizione. */}
										<div className="flex items-start justify-between gap-3">
											<div className="flex min-w-0 items-center gap-3">
												<Avatar aria-hidden className="mt-0.5 size-10 shrink-0">
													<AvatarFallback placeholderSeed={team.nome} />
												</Avatar>
												<h3 className="truncate leading-none">{team.nome}</h3>
											</div>
										</div>
										{/* Creatore — unica info extra dall'API. bg-team-info-card per contrasto. */}
										<div className="flex min-w-0 flex-col items-start justify-center rounded-2xl bg-team-info-card px-2.5 py-2.5 pr-4 font-medium text-muted-foreground text-xs leading-none">
											<div className="flex items-center gap-2">
												<Avatar aria-hidden>
													<AvatarFallback
														className="bg-card"
														placeholderSeed={team.creator_name}
													/>
												</Avatar>
												<div className="flex flex-col gap-1">
													<h4 className="font-medium text-stats-title leading-none">
														Creatore
													</h4>
													<span className="text-card-foreground text-sm leading-none">
														{team.creator_name}
													</span>
												</div>
											</div>
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
					{loading && directorCardsSkeleton}
					{!loading && error && (
						<div className="flex h-full items-center justify-center p-8">
							<p className="text-center text-destructive">{error}</p>
						</div>
					)}
					{!(loading || error) && teams.length === 0 && (
						<AnimatedEmptyState
							cta={{
								label: "Crea team",
								icon: <Plus aria-hidden className="size-4" />,
								onClick: () => {
									// biome-ignore lint/suspicious/noExplicitAny: dynamic route path
									router.push("/team/crea" as any);
								},
							}}
							heading="Nessun team creato"
							icon={
								<div className="opacity-50">
									<UserGroupIcon
										aria-hidden
										className="text-muted-foreground"
										size={64}
									/>
								</div>
							}
							subtitle="Crea il tuo primo team per iniziare"
						/>
					)}
					{!(loading || error) && teams.length > 0 && (
						<div className="flex flex-wrap gap-4">
							{teams.map((team) => {
								// Use effective count when available, else users_count or users array length
								const memberCount =
									team.effective_members_count ??
									team.users_count ??
									team.users?.length ??
									0;

								return (
									// biome-ignore lint/a11y/useSemanticElements: card contains nested action buttons
									<div
										className="group flex min-h-fit min-w-0 max-w-md flex-[1_1_100%] cursor-pointer flex-col justify-between gap-8 rounded-4xl bg-table-header p-5 transition-colors duration-200 hover:bg-table-hover md:flex-[1_1_calc(50%-0.5rem)] xl:flex-[1_1_calc(33.333%-0.67rem)]"
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
											<IconArrowUpRightFill12 className="size-4 shrink-0 text-muted-foreground transition-colors duration-200 group-hover:text-foreground" />
										</div>
										<div className="flex w-full flex-wrap items-stretch gap-2">
											{/* Creatore — wrapper with title (more width). bg-team-info-card: Dataweb light uses pure white for contrast. */}
											<div className="flex min-w-0 flex-2 flex-col items-start justify-center rounded-2xl bg-team-info-card px-2.5 py-2.5 pr-4 font-medium text-muted-foreground text-xs leading-none">
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
														<span className="text-card-foreground text-sm leading-none">
															{team.creator.nome} {team.creator.cognome}
														</span>
													</div>
												</div>
											</div>
											{/* Membri — shows only the count. bg-team-info-card: Dataweb light uses pure white for contrast. */}
											<div className="flex min-w-0 flex-1 flex-col items-start justify-center rounded-2xl bg-team-info-card px-2.5 py-2.5 pr-4 font-medium text-muted-foreground text-xs leading-none">
												<h4 className="font-medium text-stats-title leading-none">
													Membri
												</h4>
												<span className="mt-1.5 text-card-foreground text-sm tabular-nums leading-none">
													{memberCount}
												</span>
											</div>
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
