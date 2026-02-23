"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Select } from "@base-ui/react/select";
import { ChevronDown, Paperclip, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckIcon, IconDownload4, IconTrashFill18 } from "@/components/icons";
import { IconCircleInfoSparkle } from "@/components/icons/icon-circle-info-sparkle";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
	deleteNegotiationFile,
	getFileDownload,
	updateNegotiation,
	uploadNegotiationFiles,
} from "@/lib/api/client";
import type {
	ApiNegotiation,
	ApiNegotiationFile,
	SpancoStage,
	UpdateNegotiationBody,
} from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import {
	isNegotiationAbandoned,
	isNegotiationCompleted,
} from "@/lib/trattative-utils";
import { cn } from "@/lib/utils";

/** Spanco stage display labels */
const SPANCO_LABELS: Record<SpancoStage, string> = {
	S: "S",
	P: "P",
	A: "A",
	N: "N",
	C: "C",
	O: "O",
};

/** Base pill classes for SPANCO trigger (matches table cell pills). */
const SPANCO_PILL_CLASSES =
	"inline-flex min-w-[2.75rem] items-center justify-center rounded-full px-3 py-1 text-sm font-semibold tabular-nums";

/** Per-stage colors for SPANCO pills (same as trattative-table). */
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

/** Valid percentuale values: 0–100 in 20% steps */
const PERCENTUALE_OPTIONS = [0, 20, 40, 60, 80, 100] as const;

/** Slider handle positioning constants (mirror create dialog). */
const SLIDER_HANDLE_INSET_START_PERCENT = 4;
const SLIDER_HANDLE_INSET_END_PERCENT = 100;
const SLIDER_HANDLE_INSET_END_PX = 12;
const SLIDER_HANDLE_SHRINK_NEAR_LEFT_PERCENT = 35;
const SLIDER_HANDLE_SHRINK_NEAR_RIGHT_PERCENT = 82;
const SLIDER_HANDLE_HEIGHT_NORMAL_PX = 26;
const SLIDER_HANDLE_HEIGHT_NEAR_LABEL_PX = 20;
const SLIDER_HANDLE_FADE_OPACITY_NEAR_LABEL = 0.5;

/** Static hash ticks for the percentuale slider track. */
const PERCENTUALE_HASH_TICKS = [0, 20, 40, 60, 80, 100] as const;

/** Helper: derive a user-friendly display name for an allegato. */
function getFileDisplayName(file: ApiNegotiationFile): string {
	// Prefer the original filename from the API; if it is missing or empty,
	// fall back to a neutral label based on the file id instead of "Allegato N".
	if (typeof file.file_name === "string" && file.file_name.trim().length > 0) {
		return file.file_name;
	}
	return `File #${file.id}`;
}

/** Context-aware helper text for the Abbandonata checkbox. */
function getAbbandonataHelperText(
	stato: TrattativeStato,
	isChecked: boolean
): string | null {
	if (stato === "abbandonate" && isChecked) {
		return "Deseleziona per riaprire la trattativa";
	}
	if ((stato === "aperte" || stato === "concluse") && !isChecked) {
		return "Seleziona per spostare nelle abbandonate";
	}
	return null;
}

/** Abbandonata row: label on the left, switch (No | Sì) on the right, with optional helper text. */
function AbbandonataCheckboxRow({
	stato,
	checked,
	onCheckedChange,
}: {
	stato: TrattativeStato;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}) {
	const helperText = getAbbandonataHelperText(stato, checked);
	return (
		<div className="flex flex-col gap-1">
			{/* Reduced py (py-2.5) so the switch row isn’t overly tall vs the switch height. */}
			<div
				className={cn(
					"flex items-center gap-2",
					DIALOG_FIELD_CONTAINER_CLASSES,
					"py-2.5"
				)}
			>
				<label
					className={cn(DIALOG_FIELD_LABEL_TEXT_CLASSES, "flex-1")}
					htmlFor="update-abbandonata-no"
				>
					Abbandonata
				</label>
				{/* Switch: No (left) / Sì (right); selected segment is highlighted. Focus ring uses box-shadow for radius (accessibility). */}
				<div
					aria-describedby={
						helperText ? "update-abbandonata-helper" : undefined
					}
					className="flex shrink-0 overflow-hidden rounded-xl border border-border bg-muted/50"
				>
					<button
						aria-pressed={!checked}
						className={cn(
							"min-w-14 px-3 py-2 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
							checked
								? "text-muted-foreground hover:text-foreground"
								: "bg-primary text-primary-foreground"
						)}
						id="update-abbandonata-no"
						onClick={() => onCheckedChange(false)}
						type="button"
					>
						No
					</button>
					<button
						aria-pressed={checked}
						className={cn(
							"min-w-14 px-3 py-2 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
							checked
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:text-foreground"
						)}
						onClick={() => onCheckedChange(true)}
						type="button"
					>
						Sì
					</button>
				</div>
			</div>
			{helperText && (
				<p
					className="text-muted-foreground text-sm"
					id="update-abbandonata-helper"
				>
					{helperText}
				</p>
			)}
		</div>
	);
}

/** Shared capsule-style container for form fields (consistent with create/update dialogs). */
const DIALOG_FIELD_CONTAINER_CLASSES =
	"flex items-center justify-between gap-2 rounded-2xl bg-table-header px-3.75 py-4.25 leading-none";

/** Shared section card wrapper: full-width card with title + content (same layout for Dati trattativa, Allegati, Stato e avanzamento). */
const SECTION_CARD_CLASSES =
	"flex min-w-0 w-full gap-3 rounded-2xl bg-card px-7.5 py-10";

/** Text styling for field labels inside pills. */
const DIALOG_FIELD_LABEL_TEXT_CLASSES =
	"w-fit flex-0 whitespace-nowrap text-base flex font-medium items-start text-stats-title leading-none";

/** Base classes for text/number inputs: flat, right-aligned. Includes visible focus ring for accessibility (WCAG 2.4.7). */
const DIALOG_FIELD_INPUT_BASE_CLASSES =
	"flex-1 w-full leading-none cursor-text border-none bg-transparent! px-0! py-0! text-right text-base font-medium shadow-none focus-visible:outline-none focus-visible:ring-0 outline-none rounded md:text-base";

/** Format a backend date string (ISO) as a short Italian date for display (or fallback gracefully). */
function formatNegotiationDate(
	date: string | number | null | undefined
): string {
	// If the backend did not send a date, or sent 0/"0" for empty values, show a neutral placeholder.
	if (date == null || date === "" || date === 0 || date === "0") {
		return "—";
	}
	const parsed = new Date(date);
	// Guard against unexpected formats: if parsing fails, show placeholder instead of "Invalid Date" or raw "0".
	if (Number.isNaN(parsed.getTime())) {
		return "—";
	}
	return parsed.toLocaleDateString("it-IT");
}

export type TrattativeStato = "aperte" | "concluse" | "abbandonate";

/** Form id for external submit button (e.g. in page header). Use with form="..." on a submit button. */
export const UPDATE_NEGOTIATION_FORM_ID = "update-negotiation-form";

/** Dati trattativa: Ragione sociale read-only; Referente and Note editable. Same card container as Allegati and Stato e avanzamento. */
function DatiTrattativaSection({
	negotiation,
	referente,
	note,
	onReferenteChange,
	onNoteChange,
	sectionClassName,
}: {
	negotiation: ApiNegotiation;
	referente: string;
	note: string;
	onReferenteChange: (value: string) => void;
	onNoteChange: (value: string) => void;
	/** When provided (e.g. from parent with isMobile), overrides SECTION_CARD_CLASSES for the section wrapper. */
	sectionClassName?: string;
}) {
	// Derive read-only helper fields from the negotiation so they stay in sync with backend data.
	const telefonoClient =
		typeof negotiation.client?.telefono === "string"
			? negotiation.client.telefono.trim()
			: "";
	const telefonoDisplay = telefonoClient.length > 0 ? telefonoClient : "—";
	// Preferiamo il campo esplicito `data_apertura` esposto dall'API; se mancante, facciamo fallback a `created_at`.
	const dataAperturaRaw =
		negotiation.data_apertura ?? negotiation.created_at ?? undefined;
	const dataAperturaDisplay = formatNegotiationDate(dataAperturaRaw);

	return (
		<section
			aria-labelledby="dati-trattativa-heading"
			className={sectionClassName ?? SECTION_CARD_CLASSES}
		>
			<div className="flex w-full min-w-0">
				<h2 className="font-medium text-2xl" id="dati-trattativa-heading">
					Dati trattativa
				</h2>
			</div>
			<div className="flex w-full min-w-0 flex-col gap-2">
				{/* Ragione sociale: read-only (client is fixed for this negotiation).
					We use a slightly dimmer background and a not-allowed cursor so it is visually obvious that this field cannot be edited. */}
				<div
					aria-disabled="true"
					className={cn(
						DIALOG_FIELD_CONTAINER_CLASSES,
						"cursor-not-allowed bg-table-header/30"
					)}
				>
					<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>
						Ragione sociale
					</span>
					<span className="min-w-0 flex-1 truncate text-right font-medium text-base">
						{negotiation.client?.ragione_sociale ??
							`Cliente #${negotiation.client_id}`}
					</span>
				</div>
				{/* Telefono: read-only, mostra il telefono del cliente associato alla trattativa quando disponibile.
					Come per Ragione sociale, applichiamo bg più tenue + cursor not-allowed per sottolineare che non è modificabile. */}
				<div
					aria-disabled="true"
					className={cn(
						DIALOG_FIELD_CONTAINER_CLASSES,
						"cursor-not-allowed bg-table-header/30"
					)}
				>
					<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>Telefono</span>
					<span className="min-w-0 flex-1 truncate text-right font-medium text-base">
						{telefonoDisplay}
					</span>
				</div>
				{/* Data apertura: read-only, derivata dal campo created_at della trattativa.
					Stessa affordance visiva dei campi di sola lettura sopra (bg attenuato + cursore di divieto). */}
				<div
					aria-disabled="true"
					className={cn(
						DIALOG_FIELD_CONTAINER_CLASSES,
						"cursor-not-allowed bg-table-header/30"
					)}
				>
					<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>Data apertura</span>
					<span className="min-w-0 flex-1 truncate text-right font-medium text-base">
						{dataAperturaDisplay}
					</span>
				</div>
				{/* Data di abbandono/chiusura: mostrata solo se la trattativa è abbandonata o conclusa.
					- Abbandonata: mostra "Data abbandono" (data_abbandono, fallback updated_at)
					- Conclusa (Spanco O o 100%): mostra "Data chiusura" (data_chiusura, fallback updated_at)
					- Altrimenti il campo non viene renderizzato. */}
				{isNegotiationAbandoned(negotiation) && (
					<div
						aria-disabled="true"
						className={cn(
							DIALOG_FIELD_CONTAINER_CLASSES,
							"cursor-not-allowed bg-table-header/30"
						)}
					>
						<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>
							Data abbandono
						</span>
						<span className="min-w-0 flex-1 truncate text-right font-medium text-base">
							{formatNegotiationDate(
								negotiation.data_abbandono ?? negotiation.updated_at
							)}
						</span>
					</div>
				)}
				{!isNegotiationAbandoned(negotiation) &&
					isNegotiationCompleted(negotiation) && (
						<div
							aria-disabled="true"
							className={cn(
								DIALOG_FIELD_CONTAINER_CLASSES,
								"cursor-not-allowed bg-table-header/30"
							)}
						>
							<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>
								Data chiusura
							</span>
							<span className="min-w-0 flex-1 truncate text-right font-medium text-base">
								{formatNegotiationDate(
									negotiation.data_chiusura ?? negotiation.updated_at
								)}
							</span>
						</div>
					)}
				{/* Referente: editable text input, posizionato dopo i campi di contesto (telefono e data apertura)
					così l'utente vede subito i riferimenti principali della trattativa nell'ordine richiesto dal feedback. */}
				<label
					className={DIALOG_FIELD_CONTAINER_CLASSES}
					htmlFor="update-referente"
				>
					<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>Referente</span>
					<input
						className={DIALOG_FIELD_INPUT_BASE_CLASSES}
						id="update-referente"
						name="referente"
						onChange={(e) => onReferenteChange(e.target.value)}
						type="text"
						value={referente}
					/>
				</label>
				{/* Note: editable textarea; always shown so user can add note if empty. */}
				<div className={cn(DIALOG_FIELD_CONTAINER_CLASSES, "items-stretch")}>
					<label
						className={cn(DIALOG_FIELD_LABEL_TEXT_CLASSES, "")}
						htmlFor="update-note"
					>
						Note
					</label>
					<textarea
						className={cn(
							DIALOG_FIELD_INPUT_BASE_CLASSES,
							"min-h-20 resize-y text-end"
						)}
						id="update-note"
						name="note"
						onChange={(e) => onNoteChange(e.target.value)}
						rows={3}
						value={note}
					/>
				</div>
			</div>
		</section>
	);
}

/** Allegati list + upload button. Same container style as DatiTrattativaSection. */
function AllegatiSection({
	files,
	isUploadingFiles,
	fileInputRef,
	onDownload,
	onDelete,
	onFileInputChange,
	sectionClassName,
}: {
	files: ApiNegotiationFile[];
	isUploadingFiles: boolean;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onDownload: (file: ApiNegotiationFile) => void;
	/** Called when the user wants to remove a file from the negotiation. */
	onDelete: (file: ApiNegotiationFile) => void;
	onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	/** When provided (e.g. from parent with isMobile), overrides SECTION_CARD_CLASSES for the section wrapper. */
	sectionClassName?: string;
}) {
	return (
		<section
			aria-labelledby="allegati-heading"
			className={sectionClassName ?? SECTION_CARD_CLASSES}
		>
			<div className="flex w-full min-w-0">
				<h2 className="font-medium text-2xl" id="allegati-heading">
					Allegati
				</h2>
			</div>
			<div className="flex w-full min-w-0 flex-col gap-2">
				{files.length > 0 ? (
					<ul className="flex flex-col gap-2 rounded-2xl bg-table-header px-3.75 py-4.25">
						{files.map((file) => {
							// Use shared helper so filename logic stays consistent between the
							// list and the delete confirmation dialog.
							const displayName = getFileDisplayName(file);

							return (
								<li
									className="flex items-center justify-between gap-2"
									key={file.id}
								>
									<span
										className="min-w-0 flex-1 truncate font-medium text-base"
										title={displayName}
									>
										{displayName}
									</span>
									<div className="flex items-center gap-1.5">
										{/* Download keeps the existing behavior so users can save a local copy, now with a small icon for visual consistency with the remove action. */}
										<Button
											aria-label={`Scarica ${displayName}`}
											className="h-8 min-w-8 gap-1.5 rounded-lg px-2 text-sm md:min-w-0"
											onClick={() => onDownload(file)}
											type="button"
											variant="secondary"
										>
											<IconDownload4
												aria-hidden
												className="size-3.5 shrink-0"
											/>
											<span className="hidden md:inline">Scarica</span>
										</Button>
										{/* Remove button triggers DELETE /files/{id} via the parent handler. */}
										<Button
											aria-label={`Rimuovi ${displayName} dalla trattativa`}
											className="h-8 min-w-8 gap-1.5 rounded-lg px-2 text-sm md:min-w-0"
											onClick={() => onDelete(file)}
											type="button"
											variant="destructive"
										>
											<IconTrashFill18
												aria-hidden
												className="size-3.5 shrink-0"
											/>
											<span className="hidden md:inline">Rimuovi</span>
										</Button>
									</div>
								</li>
							);
						})}
					</ul>
				) : (
					<p className="rounded-2xl bg-table-header px-3.75 py-4.25 text-muted-foreground text-sm">
						Nessun allegato.
					</p>
				)}
				<div className="flex items-center gap-2">
					<input
						accept="*/*"
						aria-label="Aggiungi allegati"
						className="hidden"
						multiple
						onChange={onFileInputChange}
						ref={fileInputRef}
						type="file"
					/>
					<Button
						aria-label="Aggiungi allegati alla trattativa"
						className="h-10 gap-2 rounded-xl text-sm"
						disabled={isUploadingFiles}
						onClick={() => fileInputRef.current?.click()}
						type="button"
						variant="outline"
					>
						<Paperclip aria-hidden className="size-4" />
						{isUploadingFiles ? "Caricamento…" : "Aggiungi allegati"}
					</Button>
				</div>
			</div>
		</section>
	);
}

/** Form update callback type: receives previous form state and returns updated state. */
type FormUpdater = (prev: UpdateNegotiationBody) => UpdateNegotiationBody;

/** Stato e avanzamento: Spanco, Percentuale, Importo, Abbandonata. Extracted to reduce main form complexity. */
function StatoEAvanzamentoSection({
	form,
	onFormChange,
	stato,
	importoError,
	setImportoError,
	sectionClassName,
}: {
	form: UpdateNegotiationBody;
	onFormChange: (updater: FormUpdater) => void;
	stato: TrattativeStato;
	importoError: string | null;
	setImportoError: (err: string | null) => void;
	sectionClassName: string;
}) {
	const percentTrackRef = useRef<HTMLDivElement | null>(null);
	const percentInputRef = useRef<HTMLInputElement | null>(null);
	const isDraggingPercentRef = useRef(false);

	const updatePercentFromClientX = useCallback(
		(clientX: number) => {
			const track = percentTrackRef.current;
			if (!track) {
				return;
			}
			const rect = track.getBoundingClientRect();
			if (!rect.width) {
				return;
			}
			const relative = (clientX - rect.left) / rect.width;
			const clampedRatio = Math.min(1, Math.max(0, relative));
			const raw = clampedRatio * 100;
			const nearest = PERCENTUALE_OPTIONS.reduce(
				(prev, curr) =>
					Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev,
				PERCENTUALE_OPTIONS[0]
			);
			onFormChange((prev) => ({ ...prev, percentuale: nearest }));
		},
		[onFormChange]
	);

	const handlePercentTrackPointerDown = useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			event.preventDefault();
			event.stopPropagation();
			percentInputRef.current?.focus();
			isDraggingPercentRef.current = true;
			updatePercentFromClientX(event.clientX);
			event.currentTarget.setPointerCapture?.(event.pointerId);
		},
		[updatePercentFromClientX]
	);

	const handlePercentTrackPointerMove = useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (!isDraggingPercentRef.current) {
				return;
			}
			updatePercentFromClientX(event.clientX);
		},
		[updatePercentFromClientX]
	);

	const handlePercentTrackPointerUp = useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (!isDraggingPercentRef.current) {
				return;
			}
			isDraggingPercentRef.current = false;
			event.currentTarget.releasePointerCapture?.(event.pointerId);
		},
		[]
	);

	const clampedHandlePercent = Math.min(
		SLIDER_HANDLE_INSET_END_PERCENT,
		Math.max(
			form.percentuale ?? SLIDER_HANDLE_INSET_START_PERCENT,
			SLIDER_HANDLE_INSET_START_PERCENT
		)
	);
	const isHandleNearLeft =
		clampedHandlePercent <= SLIDER_HANDLE_SHRINK_NEAR_LEFT_PERCENT;
	const isHandleNearRight =
		clampedHandlePercent >= SLIDER_HANDLE_SHRINK_NEAR_RIGHT_PERCENT;
	const spancoStage = form.spanco ?? "S";
	// When SPANCO reaches the final "O" stage, we treat the percent slider as read-only
	// and force it to 100%, matching the business rule for concluded negotiations.
	const isSpancoConcluded = spancoStage === "O";

	return (
		<section
			aria-labelledby="stato-avanzamento-heading"
			className={sectionClassName}
		>
			<div className="flex w-full min-w-0">
				<h2 className="font-medium text-2xl" id="stato-avanzamento-heading">
					Stato e avanzamento
				</h2>
			</div>
			<div className="flex w-full min-w-0 flex-col gap-2">
				<label
					className={DIALOG_FIELD_CONTAINER_CLASSES}
					htmlFor="update-spanco"
				>
					<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>Spanco</span>
					<Select.Root
						onValueChange={(value) => {
							if (value !== null) {
								// When the user sets SPANCO to "O" we force the progress to 100%
								// so the negotiation is always marked as fully concluded and the
								// percent slider (below) can be treated as read-only.
								onFormChange((prev) => ({
									...prev,
									spanco: value as SpancoStage,
									percentuale: value === "O" ? 100 : prev.percentuale,
								}));
							}
						}}
						value={form.spanco}
					>
						<Select.Trigger
							className={cn(
								SPANCO_PILL_CLASSES,
								"w-fit flex-none gap-1.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							)}
							id="update-spanco"
							style={{
								backgroundColor: SPANCO_STAGE_COLORS[spancoStage].softBg,
								color: SPANCO_STAGE_COLORS[spancoStage].main,
							}}
						>
							<Select.Value className="min-w-0">
								{(value: SpancoStage) => SPANCO_LABELS[value]}
							</Select.Value>
							<Select.Icon
								aria-hidden
								className="opacity-70"
								style={{ color: "inherit" }}
							>
								<ChevronDown className="size-4" />
							</Select.Icon>
						</Select.Trigger>
						<Select.Portal>
							<Select.Positioner
								alignItemWithTrigger={false}
								className="z-100 max-h-80 min-w-32 rounded-2xl text-popover-foreground shadow-xl"
								sideOffset={8}
							>
								<Select.Popup className="max-h-80 overflow-y-auto rounded-2xl bg-popover p-1">
									<Select.List className="flex h-fit flex-col gap-1">
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
														{SPANCO_LABELS[stage]}
													</Select.ItemText>
												</Select.Item>
											)
										)}
									</Select.List>
								</Select.Popup>
							</Select.Positioner>
						</Select.Portal>
					</Select.Root>
				</label>
				<label className="w-full" htmlFor="update-percentuale">
					<div
						aria-disabled={isSpancoConcluded}
						className={cn(
							"group relative flex w-full items-center overflow-hidden rounded-2xl bg-table-header px-3.75 py-4.25",
							isSpancoConcluded
								? "cursor-default"
								: "cursor-grab active:cursor-grabbing"
						)}
						onPointerDown={
							isSpancoConcluded ? undefined : handlePercentTrackPointerDown
						}
						onPointerMove={
							isSpancoConcluded ? undefined : handlePercentTrackPointerMove
						}
						onPointerUp={
							isSpancoConcluded ? undefined : handlePercentTrackPointerUp
						}
						ref={percentTrackRef}
					>
						<div
							aria-hidden
							className="absolute inset-0 rounded-2xl transition-opacity duration-150 group-hover:opacity-90 group-active:opacity-85"
							style={{
								backgroundColor: SPANCO_STAGE_COLORS[spancoStage].softBg,
							}}
						/>
						<div
							aria-hidden
							className="absolute inset-0 left-0 rounded-2xl transition-[width] duration-150"
							style={{
								width: `${form.percentuale}%`,
								backgroundColor: SPANCO_STAGE_COLORS[spancoStage].main,
							}}
						/>
						<div className="pointer-events-none absolute inset-y-2 right-0 left-0 z-10 flex items-center justify-between opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-active:opacity-100">
							{PERCENTUALE_HASH_TICKS.map((tick) => (
								<div
									className="h-[9px] w-px rounded-full bg-white/18"
									key={tick}
								/>
							))}
						</div>
						<div
							aria-hidden
							className={cn(
								"absolute top-1/2 z-20 w-[5px] origin-center -translate-y-1/2 scale-x-0 rounded-full bg-white/90 opacity-0 shadow-[0_0_0_1px_rgba(15,23,42,0.35)] transition-[opacity,transform] duration-150 group-hover:scale-x-100 group-hover:opacity-100 group-active:scale-x-100 group-active:opacity-100",
								(isHandleNearLeft || isHandleNearRight) && "scale-75"
							)}
							style={{
								left: `calc(${clampedHandlePercent}% - ${SLIDER_HANDLE_INSET_END_PX}px)`,
								height: `${
									isHandleNearLeft || isHandleNearRight
										? SLIDER_HANDLE_HEIGHT_NEAR_LABEL_PX
										: SLIDER_HANDLE_HEIGHT_NORMAL_PX
								}px`,
								opacity:
									isHandleNearLeft || isHandleNearRight
										? SLIDER_HANDLE_FADE_OPACITY_NEAR_LABEL
										: undefined,
							}}
						/>
						<div className="pointer-events-none relative z-10 flex w-full items-center">
							<span
								className={cn(
									DIALOG_FIELD_LABEL_TEXT_CLASSES,
									"text-card-foreground"
								)}
							>
								Percentuale avanzamento
							</span>
						</div>
						<span className="pointer-events-none absolute inset-y-0 right-3.75 flex items-center text-right font-medium text-base text-card-foreground tabular-nums leading-none">
							{form.percentuale}%
						</span>
						<input
							aria-label="Percentuale avanzamento trattativa"
							className="pointer-events-none relative z-4.5 h-4.5 w-full appearance-none rounded bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							disabled={isSpancoConcluded}
							id="update-percentuale"
							max={100}
							min={0}
							onChange={(e) =>
								onFormChange((prev) => ({
									...prev,
									percentuale: Number(
										e.target.value
									) as (typeof PERCENTUALE_OPTIONS)[number],
								}))
							}
							ref={percentInputRef}
							step={20}
							type="range"
							value={form.percentuale}
						/>
					</div>
				</label>
				{/* Spiega all'utente perché con Spanco O la percentuale è 100% e non è modificabile. */}
				{isSpancoConcluded && (
					<div className="flex items-start gap-2 text-muted-foreground text-sm">
						<IconCircleInfoSparkle
							aria-hidden
							className="mt-0.5 shrink-0 text-blue-600"
							size={18}
						/>
						<p>
							Con Spanco su Ordine (O) la trattativa è considerata conclusa: la
							percentuale resta al 100% e non è modificabile.
						</p>
					</div>
				)}
				<div className="flex flex-col gap-1">
					<label
						className={cn(
							DIALOG_FIELD_CONTAINER_CLASSES,
							importoError &&
								"ring-1 ring-destructive ring-offset-2 ring-offset-background"
						)}
						htmlFor="update-importo"
					>
						<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>Importo (€)</span>
						<input
							aria-describedby={
								importoError ? "update-importo-error" : undefined
							}
							aria-invalid={!!importoError}
							className={DIALOG_FIELD_INPUT_BASE_CLASSES}
							id="update-importo"
							min={0}
							onBlur={() => {
								const err = validateImporto(form.importo ?? 0);
								setImportoError(err);
							}}
							onChange={(e) => {
								setImportoError(null);
								const parsed = Number.parseInt(e.target.value, 10);
								onFormChange((prev) => ({
									...prev,
									importo: Number.isNaN(parsed) ? 0 : parsed,
								}));
							}}
							step={100}
							type="number"
							value={form.importo ?? ""}
						/>
					</label>
					{importoError && (
						<p
							className="text-destructive text-sm"
							id="update-importo-error"
							role="alert"
						>
							{importoError}
						</p>
					)}
				</div>
				<AbbandonataCheckboxRow
					checked={form.abbandonata ?? false}
					onCheckedChange={(abbandonata) =>
						onFormChange((prev) => ({ ...prev, abbandonata }))
					}
					stato={stato}
				/>
			</div>
		</section>
	);
}

/** Build initial/synced form state from negotiation (used for useState and useEffect sync). */
function negotiationToFormBody(
	negotiation: ApiNegotiation
): UpdateNegotiationBody {
	return {
		spanco: negotiation.spanco,
		percentuale: negotiation.percentuale,
		importo: negotiation.importo,
		abbandonata: negotiation.abbandonata,
		referente: negotiation.referente,
		note: negotiation.note ?? "",
	};
}

/** Validates Importo: must be a non-negative number. Returns error message or null. */
function validateImporto(value: number | undefined | null): string | null {
	if (value == null || Number.isNaN(value)) {
		return "Inserisci un importo valido";
	}
	if (value < 0) {
		return "L'importo non può essere negativo";
	}
	return null;
}

/** Returns true if any editable form field differs from the initial negotiation (used for header actions visibility).
 *  Normalizes empty string and null/undefined so manually reverting a field to its initial value clears dirty state. */
function isUpdateFormDirty(
	form: UpdateNegotiationBody,
	negotiation: ApiNegotiation
): boolean {
	const refForm = (form.referente ?? "").trim();
	const refInitial = (negotiation.referente ?? "").trim();
	const noteForm = (form.note ?? "").trim();
	const noteInitial = (negotiation.note ?? "").trim();
	return (
		form.spanco !== negotiation.spanco ||
		form.percentuale !== negotiation.percentuale ||
		(form.importo ?? 0) !== (negotiation.importo ?? 0) ||
		form.abbandonata !== negotiation.abbandonata ||
		refForm !== refInitial ||
		noteForm !== noteInitial
	);
}

interface UpdateNegotiationFormProps {
	negotiation: ApiNegotiation;
	stato: TrattativeStato;
	/** Called after successful save. Receives the updated negotiation so the page can redirect to the correct list. */
	onSuccess: (updated: ApiNegotiation) => void;
	/** Optional: called after files are uploaded so the parent can refetch and pass updated negotiation with files. */
	onFilesUploaded?: () => void;
	/** When true, actions (Annulla / Salva) are not rendered; parent should put them in the page header and use UPDATE_NEGOTIATION_FORM_ID for the submit button. */
	renderActionsInHeader?: boolean;
	/** Notify parent when submit starts/ends so header buttons can show loading state. */
	onSubmittingChange?: (submitting: boolean) => void;
	/** Notify parent when form has unsaved changes (any editable field differs from initial negotiation). Used to show header actions only when user has edited. */
	onDirtyChange?: (dirty: boolean) => void;
	/** When this value changes, form state is reset to the current negotiation (e.g. parent increments when user clicks "Annulla" to discard unsaved edits). */
	resetTrigger?: number;
}

/**
 * Form for editing a negotiation. Renders on a dedicated page (trattative/{stato}/[id])
 * with the same styling as the create/update dialogs for design consistency.
 */
export default function UpdateNegotiationForm({
	negotiation,
	stato,
	onSuccess,
	onFilesUploaded,
	renderActionsInHeader = false,
	onSubmittingChange,
	onDirtyChange,
	resetTrigger,
}: UpdateNegotiationFormProps) {
	const { token } = useAuth();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [importoError, setImportoError] = useState<string | null>(null);
	const [isUploadingFiles, setIsUploadingFiles] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	// Track which attachment the user is trying to remove so we can show
	// a confirmation dialog before calling the DELETE API.
	const [filePendingDelete, setFilePendingDelete] =
		useState<ApiNegotiationFile | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [form, setForm] = useState<UpdateNegotiationBody>(() =>
		negotiationToFormBody(negotiation)
	);

	// Sync form when negotiation changes (e.g. after fetch) or when parent requests reset (Annulla = discard unsaved changes).
	// biome-ignore lint/correctness/useExhaustiveDependencies: resetTrigger is intentional — parent increments it to signal "discard changes"
	useEffect(() => {
		setForm(negotiationToFormBody(negotiation));
	}, [negotiation, resetTrigger]);

	// Notify parent when form has unsaved changes (for header actions: show only when dirty).
	// When the user reverts all fields to the initial values, isDirty becomes false and the actions hide.
	const isDirty = isUpdateFormDirty(form, negotiation);
	useEffect(() => {
		onDirtyChange?.(isDirty);
	}, [isDirty, onDirtyChange]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!token) {
			return;
		}
		// Inline validation for Importo before submit
		const importoErr = validateImporto(form.importo ?? 0);
		setImportoError(importoErr);
		if (importoErr) {
			return;
		}
		setIsSubmitting(true);
		setError(null);
		onSubmittingChange?.(true);
		const result = await updateNegotiation(token, negotiation.id, form);
		setIsSubmitting(false);
		onSubmittingChange?.(false);
		if ("error" in result) {
			setError(result.error);
			return;
		}
		toast.success("Trattativa aggiornata");
		onSuccess(result.data);
	};

	/** Trigger browser download for an attachment using GET /files/{id}. */
	const handleDownloadFile = useCallback(
		async (file: ApiNegotiationFile) => {
			if (!token) {
				return;
			}
			const result = await getFileDownload(token, file.id);
			if ("error" in result) {
				toast.error(result.error);
				return;
			}
			const blob = result.data;
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = file.file_name ?? `allegato-${file.id}`;
			a.click();
			URL.revokeObjectURL(url);
		},
		[token]
	);

	/** Handle "Aggiungi allegati" file input change: upload files then notify parent to refetch. */
	const handleFileInputChange = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (!(token && files?.length)) {
				return;
			}
			setIsUploadingFiles(true);
			const result = await uploadNegotiationFiles(
				token,
				negotiation.id,
				Array.from(files)
			);
			setIsUploadingFiles(false);
			e.target.value = "";
			if ("error" in result) {
				toast.error(result.error);
				return;
			}
			toast.success("Allegati caricati");
			onFilesUploaded?.();
		},
		[token, negotiation.id, onFilesUploaded]
	);

	/** Handle removal of an attachment using DELETE /files/{id}. */
	const handleDeleteFile = useCallback(
		async (file: ApiNegotiationFile) => {
			if (!token) {
				return;
			}
			const result = await deleteNegotiationFile(token, file.id);
			if ("error" in result) {
				toast.error(result.error);
				return;
			}
			toast.success("File rimosso");
			// Reuse onFilesUploaded to let the parent refetch the negotiation
			// so the updated list of attachments is shown immediately.
			onFilesUploaded?.();
		},
		[token, onFilesUploaded]
	);

	/** Open the "Rimuovi allegato" confirmation dialog for the selected file. */
	const handleRequestDeleteFile = useCallback((file: ApiNegotiationFile) => {
		setFilePendingDelete(file);
		setIsDeleteDialogOpen(true);
	}, []);

	/** Confirm deletion from the dialog: call DELETE /files/{id} via handleDeleteFile. */
	const handleConfirmDeleteFile = useCallback(async () => {
		if (!filePendingDelete) {
			return;
		}
		const fileToDelete = filePendingDelete;
		setIsDeleteDialogOpen(false);
		setFilePendingDelete(null);
		// Delegate the actual API call + toast + refetch logic to the existing helper.
		await handleDeleteFile(fileToDelete);
	}, [filePendingDelete, handleDeleteFile]);

	const backHref = `/trattative/${stato}`;
	const files = negotiation.files ?? [];
	const isMobile = useIsMobile();
	// On mobile, section cards use flex-col so title and content stack vertically.
	const sectionCardClasses = cn(SECTION_CARD_CLASSES, isMobile && "flex-col");

	/* Form wrapper fills the table-container-bg so content uses all available space (like list/dashboard pages).
	   Usiamo un gap più compatto (gap-2.5) tra le card di sezione così che tutte le pagine di dettaglio
	   trattative/clienti risultino più dense e coerenti tra loro. */
	return (
		<div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
			<form
				className="scroll-fade-y flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 overflow-auto"
				id={UPDATE_NEGOTIATION_FORM_ID}
				onSubmit={handleSubmit}
			>
				<DatiTrattativaSection
					negotiation={negotiation}
					note={form.note ?? negotiation.note ?? ""}
					onNoteChange={(value) =>
						setForm((prev) => ({ ...prev, note: value }))
					}
					onReferenteChange={(value) =>
						setForm((prev) => ({ ...prev, referente: value }))
					}
					referente={form.referente ?? negotiation.referente}
					sectionClassName={sectionCardClasses}
				/>
				<AllegatiSection
					fileInputRef={fileInputRef}
					files={files}
					isUploadingFiles={isUploadingFiles}
					onDelete={handleRequestDeleteFile}
					onDownload={handleDownloadFile}
					onFileInputChange={handleFileInputChange}
					sectionClassName={sectionCardClasses}
				/>

				<StatoEAvanzamentoSection
					form={form}
					importoError={importoError}
					onFormChange={setForm}
					sectionClassName={sectionCardClasses}
					setImportoError={setImportoError}
					stato={stato}
				/>
				{error && (
					<p className="text-destructive text-sm" role="alert">
						{error}
					</p>
				)}
			</form>
			{/* Conferma "Rimuovi allegato": stile coerente con gli altri dialog (Aggiungi cliente, Nuova trattativa),
			    con bottom sheet compatto su mobile e popup centrato su desktop. */}
			{isDeleteDialogOpen &&
				filePendingDelete &&
				(isMobile ? (
					<Dialog.Root
						disablePointerDismissal={false}
						onOpenChange={setIsDeleteDialogOpen}
						open={isDeleteDialogOpen}
					>
						<Dialog.Portal>
							<Dialog.Backdrop
								aria-hidden
								className="data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/50 data-closed:animate-out data-open:animate-in"
							/>
							<div className="fixed inset-0 z-50 flex items-end justify-center p-4">
								<Dialog.Popup
									aria-describedby="delete-file-dialog-desc"
									aria-labelledby="delete-file-dialog-title"
									className="data-closed:fade-out-0 data-closed:slide-out-to-bottom-4 data-open:fade-in-0 data-open:slide-in-from-bottom-4 flex w-full max-w-md flex-col overflow-hidden rounded-[28px] bg-card px-6 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.55)] outline-none data-closed:animate-out data-open:animate-in"
								>
									<Dialog.Title
										className="sr-only"
										id="delete-file-dialog-title"
									>
										Rimuovi allegato
									</Dialog.Title>
									<p className="sr-only" id="delete-file-dialog-desc">
										Conferma se vuoi rimuovere in modo definitivo questo
										allegato dalla trattativa.
									</p>
									<div className="overflow-y-auto">
										<div className="flex items-center justify-between gap-3 pb-6">
											<h2 className="font-bold text-2xl text-card-foreground tracking-tight">
												Rimuovi allegato
											</h2>
											<Dialog.Close
												aria-label="Chiudi"
												className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform focus:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
											>
												<X aria-hidden className="size-4" />
											</Dialog.Close>
										</div>
										<p className="text-muted-foreground text-sm">
											Sei sicuro di voler rimuovere l&apos;allegato{" "}
											<span className="font-medium text-card-foreground">
												{getFileDisplayName(filePendingDelete)}
											</span>{" "}
											da questa trattativa? L&apos;operazione non può essere
											annullata.
										</p>
										<div className="mt-6 flex justify-between gap-3">
											<Button
												className="h-10 min-w-26 rounded-xl border-border bg-muted text-card-foreground text-sm hover:bg-muted/80 hover:text-card-foreground aria-expanded:bg-muted aria-expanded:text-card-foreground"
												onClick={() => setIsDeleteDialogOpen(false)}
												type="button"
												variant="outline"
											>
												Annulla
											</Button>
											<Button
												className="h-10 min-w-32 rounded-xl text-sm"
												onClick={handleConfirmDeleteFile}
												type="button"
												variant="destructive"
											>
												Rimuovi allegato
											</Button>
										</div>
									</div>
								</Dialog.Popup>
							</div>
						</Dialog.Portal>
					</Dialog.Root>
				) : (
					<Dialog.Root
						disablePointerDismissal={false}
						onOpenChange={setIsDeleteDialogOpen}
						open={isDeleteDialogOpen}
					>
						<Dialog.Portal>
							<Dialog.Backdrop
								aria-hidden
								className="data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/50 data-closed:animate-out data-open:animate-in"
							/>
							<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
								<Dialog.Popup
									aria-describedby="delete-file-dialog-desc"
									aria-labelledby="delete-file-dialog-title"
									className="data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-card px-6 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.55)] outline-none data-closed:animate-out data-open:animate-in"
								>
									<Dialog.Title
										className="sr-only"
										id="delete-file-dialog-title"
									>
										Rimuovi allegato
									</Dialog.Title>
									<p className="sr-only" id="delete-file-dialog-desc">
										Conferma se vuoi rimuovere in modo definitivo questo
										allegato dalla trattativa.
									</p>
									<div className="overflow-y-auto">
										<div className="flex items-center justify-between gap-3 pb-6">
											<h2 className="font-bold text-2xl text-card-foreground tracking-tight">
												Rimuovi allegato
											</h2>
											<Dialog.Close
												aria-label="Chiudi"
												className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform focus:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
											>
												<X aria-hidden className="size-4" />
											</Dialog.Close>
										</div>
										<p className="text-muted-foreground text-sm">
											Sei sicuro di voler rimuovere l&apos;allegato{" "}
											<span className="font-medium text-card-foreground">
												{getFileDisplayName(filePendingDelete)}
											</span>{" "}
											da questa trattativa? L&apos;operazione non può essere
											annullata.
										</p>
										<div className="mt-6 flex justify-between gap-3">
											<Button
												className="h-10 min-w-26 rounded-xl border-border bg-muted text-card-foreground text-sm hover:bg-muted/80 hover:text-card-foreground aria-expanded:bg-muted aria-expanded:text-card-foreground"
												onClick={() => setIsDeleteDialogOpen(false)}
												type="button"
												variant="outline"
											>
												Annulla
											</Button>
											<Button
												className="h-10 min-w-32 rounded-xl text-sm"
												onClick={handleConfirmDeleteFile}
												type="button"
												variant="destructive"
											>
												Rimuovi allegato
											</Button>
										</div>
									</div>
								</Dialog.Popup>
							</div>
						</Dialog.Portal>
					</Dialog.Root>
				))}
			{/* When actions are not in the page header, render them outside the scrollable form (like "Aggiungi" on the list page) so they stay visible below the container. */}
			{!renderActionsInHeader && (
				<div className="flex justify-between gap-3 pt-2">
					{isSubmitting ? (
						<span className="inline-flex h-10 min-w-26 cursor-not-allowed items-center justify-center rounded-xl border border-border bg-secondary font-medium text-secondary-foreground text-sm opacity-50">
							Annulla
						</span>
					) : (
						<Link
							className="inline-flex h-10 min-w-26 items-center justify-center rounded-xl border border-border bg-secondary font-medium text-secondary-foreground text-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							href={backHref as Parameters<typeof Link>[0]["href"]}
						>
							Annulla
						</Link>
					)}
					<Button
						className="h-10 min-w-26 rounded-xl text-sm"
						disabled={isSubmitting}
						form={UPDATE_NEGOTIATION_FORM_ID}
						type="submit"
					>
						{isSubmitting ? "Salvataggio…" : "Salva"}
					</Button>
				</div>
			)}
		</div>
	);
}
