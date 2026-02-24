"use client";

import { Plus, Users } from "lucide-react";
import { AnimateNumber } from "motion-plus/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { deleteTeam, listMyTeams, listTeams } from "@/lib/api/client";
import type { ApiTeam, ApiTeamMinimal } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { Skeleton } from "./ui/skeleton";

/**
 * TeamsView — Main component for /team page.
 * Director: full team list with stats and actions (create, detail, edit, delete).
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
	// Track which team is being deleted to show loading state on that row
	const [deletingTeamId, setDeletingTeamId] = useState<number | null>(null);

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

	const handleDeleteTeam = useCallback(
		async (teamId: number) => {
			if (!token) {
				return;
			}
			setDeletingTeamId(teamId);
			const result = await deleteTeam(token, teamId);
			setDeletingTeamId(null);
			if ("error" in result) {
				setError(result.error);
				return;
			}
			// Remove from local state immediately
			setTeams((prev) => prev.filter((t) => t.id !== teamId));
		},
		[token]
	);

	const handleOpenTeamDetail = useCallback(
		(teamId: number) => {
			// biome-ignore lint/suspicious/noExplicitAny: dynamic route path
			router.push(`/team/${teamId}` as any);
		},
		[router]
	);

	// Seller view: minimal "I miei team"
	if (!isDirector) {
		return (
			<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
				<div className="relative flex w-full items-center justify-between gap-4.5">
					<h1 className="flex items-center justify-center gap-3.5">
						<Users aria-hidden size={24} />
						<span>I miei Team</span>
					</h1>
				</div>

				<div className="table-container-bg flex min-h-0 flex-1 flex-col gap-6.25 rounded-t-3xl px-5.5 pt-6.25">
					{loading && (
						<div className="flex flex-col gap-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<div
									className="flex items-center gap-4 rounded-xl bg-table-header p-4"
									key={`skeleton-${String(i)}`}
								>
									<Skeleton className="size-10 rounded-full" />
									<div className="flex flex-col gap-2">
										<Skeleton className="h-4 w-40" />
										<Skeleton className="h-3 w-24" />
									</div>
								</div>
							))}
						</div>
					)}

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

					{!(loading || error) &&
						myTeams.length > 0 &&
						myTeams.map((team) => (
							<div
								className="flex items-center gap-4 rounded-xl bg-table-header p-4"
								key={team.id}
							>
								<div className="flex size-10 items-center justify-center rounded-full bg-muted">
									<Users className="size-5 text-muted-foreground" />
								</div>
								<div className="flex flex-col gap-1">
									<span className="font-medium text-base leading-none">
										{team.nome}
									</span>
									<span className="text-muted-foreground text-sm leading-none">
										Creato da {team.creator_name}
									</span>
								</div>
							</div>
						))}
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
					<Users aria-hidden size={24} />
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
						Crea Team
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
							<Users
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
							<Users
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

				{/* Team table */}
				<div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
					<div className="table-header-bg shrink-0 rounded-xl px-3 py-2.25">
						<div className="grid grid-cols-[minmax(200px,1.5fr)_minmax(150px,1fr)_minmax(100px,0.6fr)_minmax(100px,0.6fr)_minmax(140px,0.8fr)] items-center gap-4 font-medium text-sm text-table-header-foreground">
							<div>Nome</div>
							<div>Creatore</div>
							<div>Membri</div>
							<div>Partecipa</div>
							<div>Azioni</div>
						</div>
					</div>
					<div className="scroll-fade-y flex h-full min-h-0 flex-1 flex-col overflow-scroll">
						{loading && (
							<div className="flex h-full items-center justify-center p-8">
								<p className="text-stats-title">Caricamento…</p>
							</div>
						)}
						{!loading && error && (
							<div className="flex h-full items-center justify-center p-8">
								<p className="text-center text-destructive">{error}</p>
							</div>
						)}
						{!(loading || error) && teams.length === 0 && (
							<div className="flex h-full items-center justify-center p-8">
								<p className="text-center text-stats-title">
									Nessun team creato
								</p>
							</div>
						)}
						{!(loading || error) &&
							teams.length > 0 &&
							teams.map((team) => (
								// biome-ignore lint/a11y/useSemanticElements: row contains inner buttons; native <button> would be invalid nested interactive HTML
								<div
									className="w-full cursor-pointer border-checkbox-border/70 border-b bg-transparent px-3 py-5 font-medium last:border-b-0 hover:bg-table-hover"
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
									<div className="grid grid-cols-[minmax(200px,1.5fr)_minmax(150px,1fr)_minmax(100px,0.6fr)_minmax(100px,0.6fr)_minmax(140px,0.8fr)] items-center gap-4 text-base">
										<div className="flex items-center gap-3">
											<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
												<Users className="size-4 text-muted-foreground" />
											</div>
											<div className="flex min-w-0 flex-col gap-0.5">
												<span className="truncate font-medium">
													{team.nome}
												</span>
												{team.description && (
													<span className="truncate text-muted-foreground text-xs">
														{team.description}
													</span>
												)}
											</div>
										</div>
										<div className="truncate">
											{team.creator.nome} {team.creator.cognome}
										</div>
										<div className="tabular-nums">
											{team.effective_members_count ?? team.users_count ?? 0}
										</div>
										<div>
											{team.creator_participates ? (
												<span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs dark:bg-green-900/30 dark:text-green-400">
													Sì
												</span>
											) : (
												<span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
													No
												</span>
											)}
										</div>
										<div className="flex items-center gap-2">
											<button
												className="rounded-lg px-2 py-1 text-muted-foreground text-sm hover:bg-muted hover:text-foreground"
												onClick={(e) => {
													e.stopPropagation();
													handleOpenTeamDetail(team.id);
												}}
												type="button"
											>
												Dettaglio
											</button>
											<button
												className="rounded-lg px-2 py-1 text-destructive text-sm hover:bg-destructive/10 disabled:opacity-50"
												disabled={deletingTeamId === team.id}
												onClick={(e) => {
													e.stopPropagation();
													handleDeleteTeam(team.id);
												}}
												type="button"
											>
												{deletingTeamId === team.id
													? "Eliminazione…"
													: "Elimina"}
											</button>
										</div>
									</div>
								</div>
							))}
					</div>
				</div>
			</div>
		</main>
	);
}
