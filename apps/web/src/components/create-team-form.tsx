"use client";

import { ArrowLeft, Check, Plus, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createTeam, listAvailableMembers } from "@/lib/api/client";
import type { ApiAvailableMember } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Skeleton } from "./ui/skeleton";

/**
 * CreateTeamForm — Form for directors to create a new team.
 *
 * Fields: nome, description, creator_participates toggle, multi-select members.
 * On submit → POST /api/teams, then redirect to team detail page.
 */
export function CreateTeamForm() {
	const { token } = useAuth();
	const router = useRouter();

	const [nome, setNome] = useState("");
	const [description, setDescription] = useState("");
	const [creatorParticipates, setCreatorParticipates] = useState(false);
	const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(
		new Set()
	);

	const [availableMembers, setAvailableMembers] = useState<
		ApiAvailableMember[]
	>([]);
	const [loadingMembers, setLoadingMembers] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchAvailable = useCallback(async () => {
		if (!token) {
			return;
		}
		setLoadingMembers(true);
		const result = await listAvailableMembers(token);
		setLoadingMembers(false);
		if (!("error" in result)) {
			setAvailableMembers(result.data);
		}
	}, [token]);

	useEffect(() => {
		fetchAvailable();
	}, [fetchAvailable]);

	const toggleMember = (id: number) => {
		setSelectedMemberIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!(token && nome.trim())) {
			return;
		}
		setSubmitting(true);
		setError(null);

		const result = await createTeam(token, {
			nome: nome.trim(),
			description: description.trim() || undefined,
			creator_participates: creatorParticipates,
			members: Array.from(selectedMemberIds),
		});

		setSubmitting(false);

		if ("error" in result) {
			setError(result.error);
			return;
		}

		// biome-ignore lint/suspicious/noExplicitAny: dynamic route path
		router.push(`/team/${result.data.id}` as any);
	};

	return (
		<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
			{/* Header */}
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
					<span>Crea Team</span>
				</h1>
			</div>

			{/* Form */}
			<div className="table-container-bg flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto rounded-t-3xl px-5.5 pt-6.25 pb-8">
				<form className="flex max-w-2xl flex-col gap-6" onSubmit={handleSubmit}>
					{/* Error */}
					{error && (
						<div className="rounded-lg bg-destructive/10 px-4 py-2 text-destructive text-sm">
							{error}
						</div>
					)}

					{/* Nome */}
					<div className="flex flex-col gap-2">
						<label className="font-medium text-sm" htmlFor="team-nome">
							Nome del team *
						</label>
						<input
							autoFocus
							className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							id="team-nome"
							maxLength={255}
							onChange={(e) => setNome(e.target.value)}
							placeholder="es. Team Nord Italia"
							required
							value={nome}
						/>
					</div>

					{/* Descrizione */}
					<div className="flex flex-col gap-2">
						<label className="font-medium text-sm" htmlFor="team-desc">
							Descrizione
						</label>
						<textarea
							className="min-h-20 resize-y rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							id="team-desc"
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Descrizione opzionale del team"
							value={description}
						/>
					</div>

					{/* Creator participates toggle */}
					<div className="flex items-center gap-3">
						<button
							className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ${
								creatorParticipates
									? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
									: "bg-muted text-muted-foreground"
							}`}
							onClick={() => setCreatorParticipates(!creatorParticipates)}
							type="button"
						>
							{creatorParticipates ? (
								<Check className="size-3.5" />
							) : (
								<X className="size-3.5" />
							)}
							<span>
								{creatorParticipates
									? "Partecipo come membro"
									: "Non partecipo come membro"}
							</span>
						</button>
					</div>

					{/* Members multi-select */}
					<div className="flex flex-col gap-3">
						<h3 className="font-medium text-sm">
							Membri ({selectedMemberIds.size} selezionati)
						</h3>

						{loadingMembers && (
							<div className="flex flex-col gap-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton
										className="h-12 w-full rounded-xl"
										key={`skel-${String(i)}`}
									/>
								))}
							</div>
						)}

						{!loadingMembers && availableMembers.length === 0 && (
							<p className="text-muted-foreground text-sm">
								Nessun membro disponibile nella company
							</p>
						)}

						{!loadingMembers && availableMembers.length > 0 && (
							<div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-xl border border-border p-1">
								{availableMembers.map((member) => {
									const isSelected = selectedMemberIds.has(member.id);
									return (
										<button
											className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
												isSelected
													? "bg-primary/10 text-primary"
													: "hover:bg-muted"
											}`}
											key={member.id}
											onClick={() => toggleMember(member.id)}
											type="button"
										>
											<Avatar className="size-8">
												<AvatarFallback
													placeholderSeed={`${member.nome} ${member.cognome}`}
												/>
											</Avatar>
											<div className="flex min-w-0 flex-1 flex-col">
												<span className="truncate font-medium">
													{member.nome} {member.cognome}
												</span>
												<span className="truncate text-muted-foreground text-xs">
													{member.role.nome} · {member.email}
												</span>
											</div>
											{isSelected && (
												<Check className="size-4 shrink-0 text-primary" />
											)}
										</button>
									);
								})}
							</div>
						)}
					</div>

					{/* Submit */}
					<div className="flex items-center gap-3">
						<button
							className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
							disabled={submitting || !nome.trim()}
							type="submit"
						>
							{submitting ? "Creazione…" : "Crea Team"}
							<Plus className="size-4" />
						</button>
						<button
							className="rounded-full px-4 py-2.5 text-muted-foreground text-sm hover:bg-muted hover:text-foreground"
							onClick={() => router.back()}
							type="button"
						>
							Annulla
						</button>
					</div>
				</form>
			</div>
		</main>
	);
}
