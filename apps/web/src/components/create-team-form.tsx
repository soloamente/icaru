"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { createTeam, listAvailableMembers } from "@/lib/api/client";
import type { ApiAvailableMember } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import { IconCheck3, IconUTurnToLeft } from "./icons";
import { UserGroupIcon } from "./icons/user-group";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

/** Form id for external submit button in header (same pattern as UpdateClientForm/UpdateNegotiationForm). */
export const CREATE_TEAM_FORM_ID = "create-team-form";

/** Section card wrapper: full-width card with title + content (aligned with dettagli trattative/clienti). */
const SECTION_CARD_CLASSES =
	"flex min-w-0 w-full gap-3 rounded-2xl bg-card px-7.5 py-10";

/** Pill-style container for fields (label + input), aligned with UpdateClientForm/UpdateNegotiationForm. */
const FIELD_CONTAINER_CLASSES =
	"flex items-center justify-between gap-2 rounded-2xl bg-table-header px-3.75 py-4.25 leading-none";

/** Label styling inside field pills. */
const FIELD_LABEL_TEXT_CLASSES =
	"w-fit flex-0 whitespace-nowrap text-base flex font-medium items-start text-stats-title leading-none";

/** Base classes for text inputs: flat, right-aligned, accessible focus (aligned with dettagli form). */
const FIELD_INPUT_BASE_CLASSES =
	"flex-1 w-full leading-none cursor-text border-none bg-transparent! px-0! py-0! text-right text-base font-medium shadow-none focus-visible:outline-none focus-visible:ring-0 outline-none rounded md:text-base";

/**
 * CreateTeamForm — Form for directors to create a new team.
 *
 * Design aligned with dettagli trattative/clienti pages:
 * - Shell: main > header (back + title + actions) > table-container-bg body
 * - Section cards with pill-style fields
 * - scroll-fade-y on form for consistent scroll UX
 *
 * Fields: nome, description, creator_participates toggle, multi-select members.
 * On submit → POST /api/teams, then redirect to team detail page.
 */
export function CreateTeamForm() {
	const { token } = useAuth();
	const router = useRouter();
	const isMobile = useIsMobile();

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

	const handleBackClick = () => {
		router.back();
	};

	const sectionCardClasses = cn(SECTION_CARD_CLASSES, isMobile && "flex-col");

	return (
		<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
			{/* Header: back + title on left, Annulla + Crea Team on right (same pattern as dettagli trattative/clienti). */}
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
							className="flex min-w-0 items-center gap-2 truncate font-medium text-card-foreground text-xl tracking-tight"
							id="create-team-title"
						>
							<UserGroupIcon aria-hidden size={24} />
							<span>Crea Team</span>
						</h1>
					</div>
					{/* Actions in header: Annulla + Crea Team (same layout as Salva + Annulla in dettagli). */}
					<div className="flex shrink-0 items-center justify-center gap-2.5">
						<button
							className="inline-flex h-10 min-w-26 items-center justify-center rounded-xl border border-border bg-secondary font-medium text-secondary-foreground text-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							onClick={handleBackClick}
							type="button"
						>
							Annulla
						</button>
						<Button
							className="h-10 min-w-26 rounded-xl text-sm"
							disabled={submitting || !nome.trim()}
							form={CREATE_TEAM_FORM_ID}
							type="submit"
						>
							{submitting ? "Creazione…" : "Crea Team"}
						</Button>
					</div>
				</div>
			</div>

			{/* Body: table-container-bg shell with overflow-hidden; form scrolls inside (like dettagli trattative/clienti). */}
			<div className="table-container-bg flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-t-3xl px-5.5 pt-6.25 pb-6.25">
				<div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
					<form
						className="scroll-fade-y flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 overflow-auto"
						id={CREATE_TEAM_FORM_ID}
						onSubmit={handleSubmit}
					>
						{/* Error message */}
						{error && (
							<p className="text-destructive text-sm" role="alert">
								{error}
							</p>
						)}

						{/* Section: Dati team */}
						<section
							aria-labelledby="create-team-dati-heading"
							className={sectionCardClasses}
						>
							<div className="flex w-full min-w-0">
								<h2
									className="font-medium text-2xl"
									id="create-team-dati-heading"
								>
									Dati team
								</h2>
							</div>
							<div className="flex w-full min-w-0 flex-col gap-2">
								<label className={FIELD_CONTAINER_CLASSES} htmlFor="team-nome">
									<span className={FIELD_LABEL_TEXT_CLASSES}>
										Nome del team *
									</span>
									<input
										autoFocus
										className={FIELD_INPUT_BASE_CLASSES}
										id="team-nome"
										maxLength={255}
										onChange={(e) => setNome(e.target.value)}
										placeholder="es. Team Nord Italia"
										required
										value={nome}
									/>
								</label>
								{/* Descrizione: textarea in pill container (like Note in UpdateNegotiationForm). */}
								<div className={cn(FIELD_CONTAINER_CLASSES, "items-stretch")}>
									<label
										className={FIELD_LABEL_TEXT_CLASSES}
										htmlFor="team-desc"
									>
										Descrizione
									</label>
									<textarea
										className={cn(
											FIELD_INPUT_BASE_CLASSES,
											"min-h-20 resize-y text-end"
										)}
										id="team-desc"
										onChange={(e) => setDescription(e.target.value)}
										placeholder="Descrizione opzionale"
										rows={3}
										value={description}
									/>
								</div>
							</div>
						</section>

						{/* Section: Configurazione (creator participates toggle, same pill pattern as Abbandonata in trattative). */}
						<section
							aria-labelledby="create-team-config-heading"
							className={sectionCardClasses}
						>
							<div className="flex w-full min-w-0">
								<h2
									className="font-medium text-2xl"
									id="create-team-config-heading"
								>
									Configurazione
								</h2>
							</div>
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-2 py-2.5">
									<label
										className={cn(FIELD_LABEL_TEXT_CLASSES, "flex-1")}
										htmlFor="creator-participates-no"
									>
										Partecipo come membro
									</label>
									<div className="flex shrink-0 overflow-hidden rounded-xl border border-border bg-muted/50">
										<button
											aria-pressed={!creatorParticipates}
											className={cn(
												"inline-flex min-w-11 items-center justify-center rounded-full px-3 py-1 font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
												creatorParticipates
													? "text-muted-foreground hover:text-card-foreground"
													: "bg-primary text-primary-foreground"
											)}
											id="creator-participates-no"
											onClick={() => setCreatorParticipates(false)}
											type="button"
										>
											No
										</button>
										<button
											aria-pressed={creatorParticipates}
											className={cn(
												"inline-flex min-w-11 items-center justify-center rounded-full px-3 py-1 font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
												creatorParticipates
													? "bg-primary text-primary-foreground"
													: "text-muted-foreground hover:text-card-foreground"
											)}
											onClick={() => setCreatorParticipates(true)}
											type="button"
										>
											Sì
										</button>
									</div>
								</div>
							</div>
						</section>

						{/* Section: Membri */}
						<section
							aria-labelledby="create-team-membri-heading"
							className={sectionCardClasses}
						>
							<div className="flex w-full min-w-0">
								<h2
									className="font-medium text-2xl"
									id="create-team-membri-heading"
								>
									Membri ({selectedMemberIds.size} selezionati)
								</h2>
							</div>
							<div className="flex w-full min-w-0 flex-col gap-2">
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
									<div className="flex max-h-64 flex-col overflow-hidden rounded-2xl bg-table-header/50">
										<div className="scroll-fade-y flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-1">
											{availableMembers
												.filter(
													(m): m is ApiAvailableMember =>
														m != null &&
														typeof m.id === "number" &&
														typeof m.nome === "string"
												)
												.map((member) => {
													const isSelected = selectedMemberIds.has(member.id);
													return (
														<button
															className={cn(
																"flex w-full select-none items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.99]",
																isSelected
																	? "bg-primary/10 text-primary"
																	: "hover:bg-table-hover"
															)}
															key={member.id}
															onClick={() => toggleMember(member.id)}
															type="button"
														>
															<Avatar className="size-8 shrink-0">
																<AvatarFallback
																	placeholderSeed={`${member.nome} ${member.cognome}`}
																/>
															</Avatar>
															<div className="flex min-w-0 flex-1 flex-col">
																<span className="truncate font-medium">
																	{member.nome} {member.cognome}
																</span>
																<span className="truncate text-muted-foreground text-xs">
																	{member.email ?? ""}
																</span>
															</div>
															{isSelected && (
																<IconCheck3
																	aria-hidden
																	className="size-4 shrink-0 text-primary"
																/>
															)}
														</button>
													);
												})}
										</div>
									</div>
								)}
							</div>
						</section>
					</form>
				</div>
			</div>
		</main>
	);
}
