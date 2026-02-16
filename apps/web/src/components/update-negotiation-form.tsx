"use client";

import { Select } from "@base-ui/react/select";
import { ChevronDown, Paperclip } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CheckboxNative } from "@/components/ui/checkbox-native";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
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

/** Abbandonata checkbox row with optional helper text. Uses native checkbox + checkbox.css for consistent styling. */
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
			<div
				className={cn(
					"flex items-center gap-2",
					DIALOG_FIELD_CONTAINER_CLASSES
				)}
			>
				<CheckboxNative
					aria-describedby={
						helperText ? "update-abbandonata-helper" : undefined
					}
					aria-label="Abbandonata"
					checked={checked}
					id="update-abbandonata"
					label="Abbandonata"
					labelClassName={cn(DIALOG_FIELD_LABEL_TEXT_CLASSES, "flex-1")}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						onCheckedChange(e.target.checked)
					}
				/>
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

/** Base classes for select inside pills. Includes visible focus ring for accessibility (WCAG 2.4.7). */
const DIALOG_FIELD_SELECT_BASE_CLASSES =
	"flex-1 w-full cursor-pointer appearance-none border-none bg-transparent py-0 pl-0 text-right text-base font-medium shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded";

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
				{/* Ragione sociale: read-only (client is fixed for this negotiation). */}
				<div className={DIALOG_FIELD_CONTAINER_CLASSES}>
					<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>
						Ragione sociale
					</span>
					<span className="min-w-0 flex-1 truncate text-right font-medium text-base">
						{negotiation.client?.ragione_sociale ??
							`Cliente #${negotiation.client_id}`}
					</span>
				</div>
				{/* Referente: editable text input. */}
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
							"min-h-20 resize-y text-left"
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
	onFileInputChange,
	sectionClassName,
}: {
	files: ApiNegotiationFile[];
	isUploadingFiles: boolean;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onDownload: (file: ApiNegotiationFile) => void;
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
						{files.map((file) => (
							<li
								className="flex items-center justify-between gap-2"
								key={file.id}
							>
								<span
									className="min-w-0 flex-1 truncate font-medium text-base"
									title={file.filename ?? undefined}
								>
									{file.filename ?? `Allegato ${file.id}`}
								</span>
								<Button
									aria-label={`Scarica ${file.filename ?? `allegato ${file.id}`}`}
									className="h-8 rounded-lg text-sm"
									onClick={() => onDownload(file)}
									type="button"
									variant="secondary"
								>
									Scarica
								</Button>
							</li>
						))}
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

/** Returns true if any editable form field differs from the initial negotiation (used for header actions visibility). */
function isUpdateFormDirty(
	form: UpdateNegotiationBody,
	negotiation: ApiNegotiation
): boolean {
	return (
		form.spanco !== negotiation.spanco ||
		form.percentuale !== negotiation.percentuale ||
		(form.importo ?? 0) !== (negotiation.importo ?? 0) ||
		form.abbandonata !== negotiation.abbandonata ||
		(form.referente ?? negotiation.referente) !== negotiation.referente ||
		(form.note ?? "") !== (negotiation.note ?? "")
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
}: UpdateNegotiationFormProps) {
	const { token } = useAuth();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [importoError, setImportoError] = useState<string | null>(null);
	const [isUploadingFiles, setIsUploadingFiles] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [form, setForm] = useState<UpdateNegotiationBody>(() =>
		negotiationToFormBody(negotiation)
	);

	// Sync form when negotiation changes (e.g. after fetch)
	useEffect(() => {
		setForm(negotiationToFormBody(negotiation));
	}, [negotiation]);

	// Notify parent when form has unsaved changes (for header actions: show only when dirty).
	// When the user reverts all fields to the initial values, isDirty becomes false and the actions hide.
	const isDirty = isUpdateFormDirty(form, negotiation);
	useEffect(() => {
		onDirtyChange?.(isDirty);
	}, [isDirty, onDirtyChange]);

	// Track + input refs for the "Percentuale avanzamento" slider (mirror create dialog).
	const percentTrackRef = useRef<HTMLDivElement | null>(null);
	const percentInputRef = useRef<HTMLInputElement | null>(null);
	const isDraggingPercentRef = useRef(false);

	const updatePercentFromClientX = useCallback((clientX: number) => {
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
		setForm((prev) => ({ ...prev, percentuale: nearest }));
	}, []);

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

	/** Validates Importo: must be a non-negative number. Returns error message or null. */
	const validateImporto = (value: number | undefined | null): string | null => {
		if (value == null || Number.isNaN(value)) {
			return "Inserisci un importo valido";
		}
		if (value < 0) {
			return "L'importo non può essere negativo";
		}
		return null;
	};

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
			a.download = file.filename ?? `allegato-${file.id}`;
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

	const backHref = `/trattative/${stato}`;
	const files = negotiation.files ?? [];
	const isMobile = useIsMobile();
	// On mobile, section cards use flex-col so title and content stack vertically.
	const sectionCardClasses = cn(SECTION_CARD_CLASSES, isMobile && "flex-col");

	/* Form wrapper fills the table-container-bg so content uses all available space (like list/dashboard pages). Same gap as list page (gap-6.25) for visual consistency. */
	return (
		<div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
			<form
				className="scroll-fade-y flex min-h-0 min-w-0 flex-1 flex-col gap-6.25 overflow-auto"
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
					onDownload={handleDownloadFile}
					onFileInputChange={handleFileInputChange}
					sectionClassName={sectionCardClasses}
				/>

				{/* Stato e avanzamento: same card container as Dati trattativa and Allegati. */}
				<section
					aria-labelledby="stato-avanzamento-heading"
					className={sectionCardClasses}
				>
					<div className="flex w-full min-w-0">
						<h2 className="font-medium text-2xl" id="stato-avanzamento-heading">
							Stato e avanzamento
						</h2>
					</div>
					<div className="flex w-full min-w-0 flex-col gap-2">
						{/* Spanco: same Base UI Select dropdown as create dialog for consistent UX. */}
						<label
							className={DIALOG_FIELD_CONTAINER_CLASSES}
							htmlFor="update-spanco"
						>
							<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>Spanco</span>
							<Select.Root
								onValueChange={(value) => {
									if (value !== null) {
										setForm((prev) => ({ ...prev, spanco: value }));
									}
								}}
								value={form.spanco}
							>
								<Select.Trigger
									className={cn(
										DIALOG_FIELD_SELECT_BASE_CLASSES,
										"flex w-fit flex-none items-center justify-end gap-2 leading-none"
									)}
									id="update-spanco"
								>
									<Select.Value className="min-w-0 flex-1 text-right">
										{(value: SpancoStage) => SPANCO_LABELS[value]}
									</Select.Value>
									<Select.Icon className="text-muted-foreground">
										<ChevronDown aria-hidden className="size-4" />
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
															className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-foreground data-selected:text-foreground"
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
						{/* Percentuale slider: same full-bleed slider as create dialog. */}
						<label className="w-full" htmlFor="update-percentuale">
							<div
								className="group relative flex w-full cursor-grab items-center overflow-hidden rounded-2xl bg-table-header px-3.75 py-4.25 active:cursor-grabbing"
								onPointerDown={handlePercentTrackPointerDown}
								onPointerMove={handlePercentTrackPointerMove}
								onPointerUp={handlePercentTrackPointerUp}
								ref={percentTrackRef}
							>
								<div
									aria-hidden
									className="absolute inset-0 rounded-2xl bg-white/3 transition-colors duration-150 group-hover:bg-white/5 group-active:bg-white/7"
								/>
								<div
									aria-hidden
									className="absolute inset-0 left-0 rounded-2xl bg-white/14 transition-[width,background-color] duration-150 group-hover:bg-white/18 group-active:bg-white/22"
									style={{ width: `${form.percentuale}%` }}
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
									<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>
										Percentuale avanzamento
									</span>
								</div>
								<span className="pointer-events-none absolute inset-y-0 right-3.75 flex items-center text-right font-medium text-base text-foreground tabular-nums leading-none">
									{form.percentuale}%
								</span>
								<input
									aria-label="Percentuale avanzamento trattativa"
									className="pointer-events-none relative z-4.5 h-4.5 w-full appearance-none rounded bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									id="update-percentuale"
									max={100}
									min={0}
									onChange={(e) =>
										setForm((prev) => ({
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
						<div className="flex flex-col gap-1">
							<label
								className={cn(
									DIALOG_FIELD_CONTAINER_CLASSES,
									importoError &&
										"ring-1 ring-destructive ring-offset-2 ring-offset-background"
								)}
								htmlFor="update-importo"
							>
								<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>
									Importo (€)
								</span>
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
										setForm((prev) => ({
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
								setForm((prev) => ({ ...prev, abbandonata }))
							}
							stato={stato}
						/>
					</div>
				</section>
				{error && (
					<p className="text-destructive text-sm" role="alert">
						{error}
					</p>
				)}
			</form>
			{/* When actions are not in the page header, render them outside the scrollable form (like "Aggiungi" on the list page) so they stay visible below the container. */}
			{!renderActionsInHeader && (
				<div className="flex justify-between gap-3 pt-2">
					{isSubmitting ? (
						<span className="inline-flex h-10 min-w-26 cursor-not-allowed items-center justify-center rounded-xl border border-border bg-background font-medium text-sm opacity-50">
							Annulla
						</span>
					) : (
						<Link
							className="inline-flex h-10 min-w-26 items-center justify-center rounded-xl border border-border bg-background font-medium text-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
