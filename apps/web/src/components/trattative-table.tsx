"use client";

import { Select } from "@base-ui/react/select";
import { ChevronDown, Plus, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AnimateNumber } from "motion-plus/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	createNegotiation,
	listNegotiationsCompany,
	listNegotiationsMe,
	listNegotiationsMeAbandoned,
	listNegotiationsMeConcluded,
	updateNegotiation,
} from "@/lib/api/client";
import type {
	ApiNegotiation,
	CreateNegotiationBody,
	SpancoStage,
	UpdateNegotiationBody,
} from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import CircleXmarkFilled from "./icons/circle-xmark-filled";
import IconDeleteLeftFill18 from "./icons/delete-left-fill-18";
import { SignatureIcon } from "./icons/signature-icon";

/** Spanco stage display labels */
const SPANCO_LABELS: Record<SpancoStage, string> = {
	S: "S",
	P: "P",
	A: "A",
	N: "N",
	C: "C",
	O: "O",
};

const SPANCO_SORT_ORDER: Record<SpancoStage, number> = {
	S: 0,
	P: 1,
	A: 2,
	N: 3,
	C: 4,
	O: 5,
};

/** Base pill classes used to visually render the SPANCO stage as a readable status chip.
 *  Slightly smaller than the main Stato pill, but large enough to be easily tappable and scannable.
 */
const SPANCO_PILL_CLASSES =
	"inline-flex min-w-[2.75rem] items-center justify-center rounded-full px-3 py-1 text-sm font-semibold tabular-nums";

/**
 * Main color per SPANCO stage (oklch) for pills and progress bar fill.
 * For pills we mimic the Stato chips: text uses the main color at full opacity,
 * while the background uses the same oklch color with a much lower alpha for a soft tint.
 */
const SPANCO_STAGE_COLORS: Record<
	SpancoStage,
	{ main: string; softBg: string }
> = {
	P: {
		// Prospect
		main: "oklch(0.6994 0.1754 51.79)",
		softBg: "oklch(0.6994 0.1754 51.79 / 0.12)",
	},
	S: {
		// Suspect
		main: "oklch(0.5575 0.0165 244.89)",
		softBg: "oklch(0.5575 0.0165 244.89 / 0.12)",
	},
	A: {
		// Approach
		main: "oklch(0.8114 0.1654 84.92)",
		softBg: "oklch(0.8114 0.1654 84.92 / 0.12)",
	},
	C: {
		// Close
		main: "oklch(0.5915 0.202 21.24)",
		softBg: "oklch(0.5915 0.202 21.24 / 0.12)",
	},
	O: {
		// Order
		main: "oklch(0.5315 0.1179 157.23)",
		softBg: "oklch(0.5315 0.1179 157.23 / 0.12)",
	},
	N: {
		// Negotiation
		main: "oklch(0.5782 0.2282 260.03)",
		softBg: "oklch(0.5782 0.2282 260.03 / 0.12)",
	},
};

/** Shared capsule-style container for dialog form fields so label text and control
 *  sit on the same horizontal row while sharing a single rounded background,
 *  consistent with header filters and the search pill.
 */
const DIALOG_FIELD_CONTAINER_CLASSES =
	"flex items-center justify-between gap-2 rounded-2xl bg-table-header px-3.75 py-2.25";

/** Text styling for field labels inside dialog pills.
 *  Slightly smaller than values to establish hierarchy; muted color for secondary
 *  status so the user's eye goes first to the editable value area.
 *  Uses text-base so labels (ID Cliente, Referente, Spanco, Importo, Percentuale avanzamento, Note)
 *  are clearly readable in the create/update trattativa dialog rows.
 */
const DIALOG_FIELD_LABEL_TEXT_CLASSES =
	"w-fit flex-0 whitespace-nowrap text-base font-medium text-stats-title leading-none";

/** Base classes for text/number inputs inside dialog pills: visually flat, right-aligned.
 *  cursor-text signals editability so the affordance is obvious at a glance.
 *  text-base (and md:text-base) override the default Input component's text-xs/md:text-xs
 *  so ID Cliente, Referente, Importo, Note match label size in the dialog rows.
 */
const DIALOG_FIELD_INPUT_BASE_CLASSES =
	"flex-1 w-full cursor-text border-none bg-transparent! px-0 py-0 text-right text-base font-medium shadow-none focus-visible:outline-none focus-visible:ring-0 md:text-base";

/** Base classes for select inside dialog pills: dropdown caret + pointer cursor
 *  make the affordance clearly distinct from text inputs.
 *  text-base matches labels and inputs for consistent dialog row typography.
 */
const DIALOG_FIELD_SELECT_BASE_CLASSES =
	"flex-1 w-full cursor-pointer appearance-none border-none bg-transparent py-0 pl-0 pr-6 text-right text-base font-medium shadow-none focus-visible:outline-none focus-visible:ring-0";

type SortColumn = "importo" | "percentuale" | "spanco";

const OPEN_STATUS_CLASSES =
	"bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400";
const COMPLETED_STATUS_CLASSES =
	"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
const ABANDONED_STATUS_CLASSES =
	"bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";

const isNegotiationCompleted = (negotiation: ApiNegotiation): boolean =>
	negotiation.spanco === "O" || negotiation.percentuale === 100;

const isNegotiationAbandoned = (negotiation: ApiNegotiation): boolean =>
	negotiation.abbandonata;

const isNegotiationOpen = (negotiation: ApiNegotiation): boolean =>
	!(isNegotiationAbandoned(negotiation) || isNegotiationCompleted(negotiation));

function getNegotiationStatusUi(negotiation: ApiNegotiation): {
	classes: string;
	label: string;
	icon: "check" | "close";
} {
	if (isNegotiationAbandoned(negotiation)) {
		return {
			classes: ABANDONED_STATUS_CLASSES,
			label: "Abbandonata",
			icon: "close",
		};
	}
	if (isNegotiationCompleted(negotiation)) {
		return {
			classes: COMPLETED_STATUS_CLASSES,
			label: "Conclusa",
			icon: "check",
		};
	}
	return {
		classes: OPEN_STATUS_CLASSES,
		label: "Aperta",
		icon: "check",
	};
}

function getSortAriaLabel(
	column: SortColumn,
	direction: "asc" | "desc" | null
): string {
	if (column === "importo") {
		if (direction === "desc") {
			return "Ordinato per importo dal valore più alto. Passa a ordine crescente.";
		}
		if (direction === "asc") {
			return "Ordinato per importo dal valore più basso. Rimuovi ordinamento.";
		}
		return "Ordina per importo dal valore più alto";
	}
	if (column === "percentuale") {
		if (direction === "desc") {
			return "Ordinato per percentuale dalla più alta. Passa a ordine crescente.";
		}
		if (direction === "asc") {
			return "Ordinato per percentuale dalla più bassa. Rimuovi ordinamento.";
		}
		return "Ordina per percentuale dalla più alta";
	}
	// column === "spanco"
	if (direction === "desc") {
		return "Ordinato per stato SPANCO dal più avanzato (O). Passa all'ordine iniziale.";
	}
	if (direction === "asc") {
		return "Ordinato per stato SPANCO S → P → A → N → C → O. Rimuovi ordinamento.";
	}
	return "Ordina per stato SPANCO S → P → A → N → C → O";
}

/** Valid percentuale values: 0–100 in 20% steps */
const PERCENTUALE_OPTIONS = [0, 20, 40, 60, 80, 100] as const;

/** How far (in %) the slider handle stays from the start of the track (min position). */
const SLIDER_HANDLE_INSET_START_PERCENT = 4;
/** How far (in %) the handle stays from the end of the track (max position, 100 - this = cap). */
const SLIDER_HANDLE_INSET_END_PERCENT = 100;
/** Pixel offset from the fill edge so the handle does not sit exactly on the end. */
const SLIDER_HANDLE_INSET_END_PX = 12;
/** When the handle position is at or below this %, it shrinks/fades to avoid the left label. */
const SLIDER_HANDLE_SHRINK_NEAR_LEFT_PERCENT = 35;
/** When the handle position is at or above this %, it shrinks/fades to avoid the right value text. */
const SLIDER_HANDLE_SHRINK_NEAR_RIGHT_PERCENT = 82;
/** Handle height (in px) in its default state. */
const SLIDER_HANDLE_HEIGHT_NORMAL_PX = 26;
/** Handle height (in px) when it is overlapping/hovering a label area. */
const SLIDER_HANDLE_HEIGHT_NEAR_LABEL_PX = 20;
/** Opacity to apply when the handle is overlapping a label so it visually fades over the text. */
const SLIDER_HANDLE_FADE_OPACITY_NEAR_LABEL = 0.5;

/** Static hash ticks used on the percentuale slider track so we can assign
 *  stable, non-index-based React keys to each mark. We align them with the
 *  same 0–100 in 20% steps used by the slider itself so ogni tacchetta
 *  coincide con una posizione valida del controllo.
 */
const PERCENTUALE_HASH_TICKS = [0, 20, 40, 60, 80, 100] as const;

/**
 * Clamp a percentuale value to the valid 0–100 range.
 * This keeps the visual progress "slider" from overflowing when the backend sends
 * an unexpected value, and also normalises NaN to 0 for safety.
 */
function clampPercentuale(value: number): number {
	if (Number.isNaN(value)) {
		return 0;
	}
	return Math.min(100, Math.max(0, value));
}

function formatImporto(value: number): string {
	return new Intl.NumberFormat("it-IT", {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}

function getClientDisplay(n: ApiNegotiation): string {
	return n.client?.ragione_sociale ?? `Cliente #${n.client_id}`;
}

interface CreateNegotiationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

function CreateNegotiationDialog({
	open,
	onOpenChange,
	onSuccess,
}: CreateNegotiationDialogProps) {
	const { token } = useAuth();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [form, setForm] = useState<CreateNegotiationBody>({
		client_id: 1,
		referente: "",
		spanco: "S",
		importo: 0,
		percentuale: 0,
		note: "",
	});

	// Track + input refs for the "Percentuale avanzamento" slider so we can
	// translate pointer movements on the decorative handle into a concrete
	// range value (keeping the native input as the single source of truth).
	const percentTrackRef = useRef<HTMLDivElement | null>(null);
	const percentInputRef = useRef<HTMLInputElement | null>(null);
	const isDraggingPercentRef = useRef(false);

	// Given a pointer X coordinate, compute the corresponding percentage on
	// the slider track and snap it to the closest allowed step defined in
	// PERCENTUALE_OPTIONS (0–100 in 20% increments).
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
				(previous, current) =>
					Math.abs(current - raw) < Math.abs(previous - raw)
						? current
						: previous,
				PERCENTUALE_OPTIONS[0]
			);
			setForm((previous) => ({
				...previous,
				percentuale: nearest as (typeof PERCENTUALE_OPTIONS)[number],
			}));
		},
		[setForm]
	);

	// Pointer handlers bound to the whole percentuale track (including the
	// decorative handle). We keep the native range input focused and in sync
	// for keyboard accessibility, but route pointer movements through our own
	// logic so that grabbing the visible handle feels like the primary affordance.
	const handlePercentTrackPointerDown = useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			event.preventDefault();
			event.stopPropagation();
			if (percentInputRef.current) {
				percentInputRef.current.focus();
			}
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

	// Slider UX helpers: clamp handle position using configurable insets from start/end.
	const clampedHandlePercent = Math.min(
		SLIDER_HANDLE_INSET_END_PERCENT,
		Math.max(form.percentuale, SLIDER_HANDLE_INSET_START_PERCENT)
	);
	// Shrink/fade handle when near the left label or the right value text.
	const isHandleNearLeft =
		clampedHandlePercent <= SLIDER_HANDLE_SHRINK_NEAR_LEFT_PERCENT;
	const isHandleNearRight =
		clampedHandlePercent >= SLIDER_HANDLE_SHRINK_NEAR_RIGHT_PERCENT;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!token) {
			return;
		}
		setIsSubmitting(true);
		setError(null);
		const result = await createNegotiation(token, {
			...form,
			note: form.note || undefined,
		});
		setIsSubmitting(false);
		if ("error" in result) {
			setError(result.error);
			return;
		}
		onSuccess();
		onOpenChange(false);
		setForm({
			client_id: 1,
			referente: "",
			spanco: "S",
			importo: 0,
			percentuale: 0,
			note: "",
		});
	};

	if (!open) {
		return null;
	}

	return (
		<div
			/* Backdrop: clicking outside the card closes the dialog so the user
			 * is never trapped if a control inside becomes hard to reach.
			 */
			aria-labelledby="create-negotiation-title"
			aria-modal="true"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			onClick={() => onOpenChange(false)}
			role="dialog"
		>
			{/* Dialog container: stop click propagation so interactions inside
			 * (form submit, slider drag, buttons) do not accidentally close the
			 * dialog when the user clicks within the card.
			 * Slightly larger and more rounded to mirror main card shells.
			 */}
			<div
				className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-card px-6 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.55)]"
				onClick={(event) => event.stopPropagation()}
			>
				{/* Centered title with more visual weight and spacing from the form below. */}
				<h2
					className="mb-8 text-center font-bold text-2xl text-foreground tracking-tight"
					id="create-negotiation-title"
				>
					Nuova trattativa
				</h2>
				<form
					className="grid grid-cols-2 gap-x-4 gap-y-4"
					onSubmit={handleSubmit}
				>
					{/* ID Cliente field: wrap label text and control in a single pill so the whole area is clickable. */}
					<label
						className={DIALOG_FIELD_CONTAINER_CLASSES}
						htmlFor="create-client-id"
					>
						<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>ID Cliente</span>
						<Input
							className={DIALOG_FIELD_INPUT_BASE_CLASSES}
							id="create-client-id"
							min={1}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									client_id: Number.parseInt(e.target.value, 10) || 1,
								}))
							}
							required
							type="number"
							value={form.client_id}
						/>
					</label>
					<label
						className={DIALOG_FIELD_CONTAINER_CLASSES}
						htmlFor="create-referente"
					>
						<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>Referente</span>
						<Input
							className={DIALOG_FIELD_INPUT_BASE_CLASSES}
							id="create-referente"
							onChange={(e) =>
								setForm((prev) => ({ ...prev, referente: e.target.value }))
							}
							placeholder="Mr. Smith"
							required
							value={form.referente}
						/>
					</label>
					{/* Spanco: use same Base UI Select dropdown as table filters for consistent UX. */}
					<label
						className={DIALOG_FIELD_CONTAINER_CLASSES}
						htmlFor="create-spanco"
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
									// Make the trigger shrink to fit its content instead of
									// stretching across the whole pill, mirroring table filters.
									"flex h-9 w-fit flex-none items-center justify-end gap-2"
								)}
								id="create-spanco"
							>
								<Select.Value className="min-w-0 flex-1 text-right">
									{(value: SpancoStage) => SPANCO_LABELS[value]}
								</Select.Value>
								<Select.Icon className="shrink-0 text-muted-foreground">
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
					<label
						className={DIALOG_FIELD_CONTAINER_CLASSES}
						htmlFor="create-importo"
					>
						<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>Importo (€)</span>
						<Input
							className={DIALOG_FIELD_INPUT_BASE_CLASSES}
							id="create-importo"
							min={0}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									importo: Number.parseInt(e.target.value, 10) || 0,
								}))
							}
							required
							step={100}
							type="number"
							value={form.importo || ""}
						/>
					</label>
					{/* Percentuale slider spans full width for comfortable drag interaction. */}
					<label className="col-span-2" htmlFor="create-percentuale">
						{/* Full-bleed percentuale slider: the entire pill acts as the track,
						 * with label (left) and current value (right) rendered as overlays.
						 * The invisible range input spans the whole surface so any click/drag
						 * interaction feels generous and predictable.
						 *
						 * We also render a subtle "drag handle" that appears on hover/active,
						 * inset slightly from the fill edge so the boundary between filled and
						 * unfilled zones feels softer and more crafted instead of harsh.
						 */}
						{/* Vertical padding (py-2.25) matches other dialog field rows for visual consistency. */}
						<div
							className="group relative flex w-full cursor-grab items-center overflow-hidden rounded-2xl bg-table-header px-3.75 py-2.25 active:cursor-grabbing"
							onPointerDown={handlePercentTrackPointerDown}
							onPointerMove={handlePercentTrackPointerMove}
							onPointerUp={handlePercentTrackPointerUp}
							ref={percentTrackRef}
						>
							{/* Static track: keep the base pill background and overlay a slightly
							 * brighter neutral wash so the control feels like "una versione più
							 * luminosa" dello sfondo invece di introdurre un colore forte
							 * scollegato dal resto del dialog.
							 */}
							<div
								aria-hidden
								className="absolute inset-0 rounded-2xl bg-white/3 transition-colors duration-150 group-hover:bg-white/5 group-active:bg-white/7"
							/>
							{/* Dynamic fill: a brighter pass of the same neutral overlay that
							 * simply aumenta la luminosità del background man mano che si
							 * avanza con la percentuale, senza cambiare tinta rispetto al
							 * contesto del dialog.
							 */}
							<div
								aria-hidden
								className="absolute inset-0 left-0 rounded-2xl bg-white/14 transition-[width,background-color] duration-150 group-hover:bg-white/18 group-active:bg-white/22"
								style={{
									width: `${form.percentuale}%`,
								}}
							/>
							{/* Hash marks: show a set of subtle ticks only on hover/drag to give
							 * the user spatial awareness without cluttering the resting state.
							 */}
							<div
								// Make the hash ticks span the full slider width so each mark
								// lines up precisely with the 0–100% track (every 20% step).
								className="pointer-events-none absolute inset-y-2 right-0 left-0 z-10 flex items-center justify-between opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-active:opacity-100"
							>
								{PERCENTUALE_HASH_TICKS.map((tick) => (
									<div
										// Using the index as key is fine here because the list is static.
										className="h-[9px] w-px rounded-full bg-white/18"
										key={tick}
									/>
								))}
							</div>
							{/* Drag handle: purely decorative affordance, positioned at the fill
							 * edge (inset via constants). Shrinks/fades when near left label or right value.
							 */}
							<div
								aria-hidden
								className={cn(
									"absolute top-1/2 z-20 w-[5px] origin-center -translate-y-1/2 scale-x-0 rounded-full bg-white/90 opacity-0 shadow-[0_0_0_1px_rgba(15,23,42,0.35)] transition-opacity transition-transform duration-150 group-hover:scale-x-100 group-hover:opacity-100 group-active:scale-x-100 group-active:opacity-100",
									// When the handle gets close to either label/value text,
									// make it slightly smaller so it feels tucked under the copy.
									(isHandleNearLeft || isHandleNearRight) && "scale-75"
								)}
								style={{
									// Horizontal position derived from the clamped percentage plus a
									// small inset so the handle does not sit exactly on the edge.
									left: `calc(${clampedHandlePercent}% - ${SLIDER_HANDLE_INSET_END_PX}px)`,
									// Height is driven by constants so it is easy to tune.
									height: `${
										isHandleNearLeft || isHandleNearRight
											? SLIDER_HANDLE_HEIGHT_NEAR_LABEL_PX
											: SLIDER_HANDLE_HEIGHT_NORMAL_PX
									}px`,
									// When overlapping either label, fade the handle so the text
									// remains readable underneath.
									opacity:
										isHandleNearLeft || isHandleNearRight
											? SLIDER_HANDLE_FADE_OPACITY_NEAR_LABEL
											: undefined,
								}}
							/>
							{/* Label sits on the left as a standard caption, while the numeric
							 * value is rendered in a separate absolutely positioned span that
							 * hugs the right edge of the pill. This makes the percentage feel
							 * visually anchored to the end of the row regardless of the slider
							 * thumb position.
							 */}
							<div className="pointer-events-none relative z-10 flex w-full items-center">
								<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>
									Percentuale avanzamento
								</span>
							</div>
							<span className="pointer-events-none absolute inset-y-0 right-3.75 flex items-center text-right font-mono font-semibold text-base text-foreground tabular-nums">
								{form.percentuale}%
							</span>
							{/* Range input: visually transparent, but covers the whole pill so the
							 * user can drag anywhere on the track. We keep step aligned with
							 * PERCENTUALE_OPTIONS (0–100 in 20% increments).
							 */}
							<input
								aria-label="Percentuale avanzamento trattativa"
								className="pointer-events-none relative z-8 h-8 w-full appearance-none bg-transparent focus-visible:outline-none focus-visible:ring-0"
								id="create-percentuale"
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
					{/* Note field spans full width so the label + input row has room. */}
					<label
						className={cn(DIALOG_FIELD_CONTAINER_CLASSES, "col-span-2")}
						htmlFor="create-note"
					>
						<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>Note</span>
						<Input
							className={DIALOG_FIELD_INPUT_BASE_CLASSES}
							id="create-note"
							onChange={(e) =>
								setForm((prev) => ({ ...prev, note: e.target.value }))
							}
							placeholder="Note opzionali"
							value={form.note ?? ""}
						/>
					</label>
					{error && (
						<p className="col-span-2 text-destructive text-sm" role="alert">
							{error}
						</p>
					)}
					{/* Actions: cancel left, primary submit right; rounded and larger to match dialog design (rounded-2xl fields, text-base). */}
					<div className="col-span-2 mt-2 flex justify-between gap-3">
						<Button
							className="h-10 min-w-26 rounded-xl text-sm"
							disabled={isSubmitting}
							onClick={() => onOpenChange(false)}
							type="button"
							variant="outline"
						>
							Annulla
						</Button>
						<Button
							className="h-10 min-w-32 rounded-xl text-sm"
							disabled={isSubmitting}
							type="submit"
						>
							{isSubmitting ? "Creazione…" : "Crea trattativa"}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}

interface UpdateNegotiationDialogProps {
	negotiation: ApiNegotiation | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

function UpdateNegotiationDialog({
	negotiation,
	open,
	onOpenChange,
	onSuccess,
}: UpdateNegotiationDialogProps) {
	const { token } = useAuth();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [form, setForm] = useState<UpdateNegotiationBody>({
		spanco: "S",
		percentuale: 0,
		importo: 0,
		abbandonata: false,
	});

	// Sync form when negotiation changes
	useEffect(() => {
		if (negotiation) {
			setForm({
				spanco: negotiation.spanco,
				percentuale: negotiation.percentuale,
				importo: negotiation.importo,
				abbandonata: negotiation.abbandonata,
			});
		}
	}, [negotiation]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!(token && negotiation)) {
			return;
		}
		setIsSubmitting(true);
		setError(null);
		const result = await updateNegotiation(token, negotiation.id, form);
		setIsSubmitting(false);
		if ("error" in result) {
			setError(result.error);
			return;
		}
		onSuccess();
		onOpenChange(false);
	};

	if (!(open && negotiation)) {
		return null;
	}

	return (
		<div
			/* Backdrop for update dialog: clicking outside the card closes it,
			 * matching the behaviour of the creation dialog and avoiding traps.
			 */
			aria-labelledby="update-negotiation-title"
			aria-modal="true"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			onClick={() => onOpenChange(false)}
			role="dialog"
		>
			{/* Dialog container: keep styling in sync with creation dialog for a coherent experience.
			 * Stop propagation so internal clicks do not bubble to the backdrop.
			 */}
			<div
				className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-card px-6 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.55)]"
				onClick={(event) => event.stopPropagation()}
			>
				<h2
					className="mb-5 font-bold text-foreground text-xl tracking-tight"
					id="update-negotiation-title"
				>
					Aggiorna trattativa #{negotiation.id}
				</h2>
				<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
					<label
						className={DIALOG_FIELD_CONTAINER_CLASSES}
						htmlFor="update-spanco"
					>
						<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>Spanco</span>
						<span className="relative flex flex-1 flex-row items-center justify-end">
							<select
								className={cn(DIALOG_FIELD_SELECT_BASE_CLASSES, "h-9")}
								id="update-spanco"
								onChange={(e) =>
									setForm((prev) => ({
										...prev,
										spanco: e.target.value as SpancoStage,
									}))
								}
								value={form.spanco}
							>
								{(Object.keys(SPANCO_LABELS) as SpancoStage[]).map((k) => (
									<option key={k} value={k}>
										{SPANCO_LABELS[k]}
									</option>
								))}
							</select>
							<ChevronDown
								aria-hidden
								className="pointer-events-none absolute right-0 size-4 shrink-0 text-muted-foreground"
							/>
						</span>
					</label>
					<label
						className={DIALOG_FIELD_CONTAINER_CLASSES}
						htmlFor="update-percentuale"
					>
						<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>
							Percentuale avanzamento
						</span>
						<span className="relative flex flex-1 flex-row items-center justify-end">
							<select
								className={cn(DIALOG_FIELD_SELECT_BASE_CLASSES, "h-9")}
								id="update-percentuale"
								onChange={(e) =>
									setForm((prev) => ({
										...prev,
										percentuale: Number(e.target.value),
									}))
								}
								value={form.percentuale}
							>
								{PERCENTUALE_OPTIONS.map((p) => (
									<option key={p} value={p}>
										{p}%
									</option>
								))}
							</select>
							<ChevronDown
								aria-hidden
								className="pointer-events-none absolute right-0 size-4 shrink-0 text-muted-foreground"
							/>
						</span>
					</label>
					<label
						className={DIALOG_FIELD_CONTAINER_CLASSES}
						htmlFor="update-importo"
					>
						<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>Importo (€)</span>
						<Input
							className={DIALOG_FIELD_INPUT_BASE_CLASSES}
							id="update-importo"
							min={0}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									importo: Number.parseInt(e.target.value, 10) || 0,
								}))
							}
							step={100}
							type="number"
							value={form.importo ?? ""}
						/>
					</label>
					{/* Abbandonata toggle: render checkbox and label inside a shared pill so the hit area is generous and consistent. */}
					<label
						className="flex cursor-pointer items-center gap-2 rounded-2xl bg-table-header px-3.75 py-2.75"
						htmlFor="update-abbandonata"
					>
						<input
							checked={form.abbandonata ?? false}
							className="size-4 shrink-0 cursor-pointer rounded border border-checkbox-border bg-transparent text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
							id="update-abbandonata"
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									abbandonata: e.target.checked,
								}))
							}
							type="checkbox"
						/>
						<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>Abbandonata</span>
					</label>
					{error && (
						<p className="text-destructive text-sm" role="alert">
							{error}
						</p>
					)}
					{/* Same button pattern as Create dialog: rounded, larger, justify-between. */}
					<div className="mt-2 flex justify-between gap-3">
						<Button
							className="h-10 min-w-26 rounded-xl text-sm"
							disabled={isSubmitting}
							onClick={() => onOpenChange(false)}
							type="button"
							variant="outline"
						>
							Annulla
						</Button>
						<Button
							className="h-10 min-w-26 rounded-xl text-sm"
							disabled={isSubmitting}
							type="submit"
						>
							{isSubmitting ? "Salvataggio…" : "Salva"}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}

/** Filter for which negotiations to show: all, only completed (spanco C), or only abandoned. */
export type TrattativeFilter = "all" | "concluse" | "abbandonate" | "aperte";

interface TrattativeTableProps {
	/** When set, filter displayed negotiations by status (concluse = spanco C, abbandonate = abbandonata). */
	filter?: TrattativeFilter;
}

export default function TrattativeTable({
	filter = "all",
}: TrattativeTableProps) {
	const { token, role } = useAuth();
	const [negotiations, setNegotiations] = useState<ApiNegotiation[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	// Keep an explicit ref to the search input so that the clear icon can
	// both reset the value and immediately return focus to the field.
	const searchInputRef = useRef<HTMLInputElement | null>(null);
	// Controls the animated width of the search input container (motion.label).
	const [isSearchFocused, setIsSearchFocused] = useState(false);
	// Local SPANCO filter: lets the user restrict visible rows to a single SPANCO stage or see them all.
	const [spancoFilter, setSpancoFilter] = useState<SpancoStage | "all">("all");
	// Local stato filter: lets the user restrict visible rows to Aperta, Conclusa, or Abbandonata.
	const [statoFilter, setStatoFilter] = useState<
		"all" | "aperta" | "conclusa" | "abbandonata"
	>("all");
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [updateTarget, setUpdateTarget] = useState<ApiNegotiation | null>(null);
	const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
	const [sortState, setSortState] = useState<{
		column: SortColumn;
		direction: "asc" | "desc";
	} | null>(null);

	// Header filters visibility:
	// - SPANCO filter is available on all views except "concluse" (where every row is già in stato finale).
	// - Stato filter (Aperta/Conclusa/Abbandonata) è significativo solo nella vista "tutte", dove coesistono tutti gli stati.
	const showSpancoFilter = filter !== "concluse";
	const showStatoFilter = filter === "all";
	// When at least one header filter is visible we keep the two-row header layout;
	// if no filters are shown (e.g. pagina "concluse") we inline the search next to the primary action button.
	const hasHeaderFilters = showSpancoFilter || showStatoFilter;

	// Direttore Vendite: /company (tutta l'azienda). Venditore: /me, /me/abandoned, /me/concluded.
	// Per il direttore usiamo /company e filtriamo lato client per concluse/abbandonate (l'API non espone /company/open ecc.).
	const fetchNegotiations = useCallback(async () => {
		if (!token) {
			return;
		}
		setLoading(true);
		setError(null);
		const isDirector = role === "director";
		let fetcher: typeof listNegotiationsMe;
		if (isDirector) {
			fetcher = listNegotiationsCompany;
		} else if (filter === "concluse") {
			fetcher = listNegotiationsMeConcluded;
		} else if (filter === "abbandonate") {
			fetcher = listNegotiationsMeAbandoned;
		} else {
			fetcher = listNegotiationsMe;
		}
		// We currently fetch all negotiations for the chosen scope and apply SPANCO/search filters client-side.
		const result = await fetcher(token, undefined);
		setLoading(false);
		if ("error" in result) {
			setError(result.error);
			setNegotiations([]);
			return;
		}
		setNegotiations(result.data);
	}, [token, filter, role]);

	useEffect(() => {
		fetchNegotiations();
	}, [fetchNegotiations]);

	const filteredNegotiations = negotiations.filter((n) => {
		// Filtro di stato per pagina dedicata
		if (filter === "concluse" && !isNegotiationCompleted(n)) {
			return false;
		}
		if (filter === "abbandonate" && !isNegotiationAbandoned(n)) {
			return false;
		}
		if (filter === "aperte" && !isNegotiationOpen(n)) {
			return false;
		}
		// SPANCO filter: when a specific stage is selected, show only negotiations with that SPANCO value.
		if (spancoFilter !== "all" && n.spanco !== spancoFilter) {
			return false;
		}
		// Stato filter: when a specific status is selected, show only negotiations with that stato.
		if (statoFilter !== "all") {
			if (statoFilter === "aperta" && !isNegotiationOpen(n)) {
				return false;
			}
			if (statoFilter === "conclusa" && !isNegotiationCompleted(n)) {
				return false;
			}
			if (statoFilter === "abbandonata" && !isNegotiationAbandoned(n)) {
				return false;
			}
		}
		const normalized = searchTerm.trim().toLowerCase();
		if (!normalized) {
			return true;
		}
		const clientName = getClientDisplay(n).toLowerCase();
		const referente = n.referente.toLowerCase();
		const note = (n.note ?? "").toLowerCase();
		return (
			clientName.includes(normalized) ||
			referente.includes(normalized) ||
			note.includes(normalized)
		);
	});

	// Statistiche di riepilogo: aperte, concluse, abbandonate in base alle regole sopra.
	const openCount = filteredNegotiations.filter((n) =>
		isNegotiationOpen(n)
	).length;
	const abandonedCount = filteredNegotiations.filter((n) =>
		isNegotiationAbandoned(n)
	).length;

	// Concluded = Spanco 'O' OR % = 100 (per doc)
	const completedCount = filteredNegotiations.filter((n) =>
		isNegotiationCompleted(n)
	).length;
	const handleToggleSort = useCallback((column: SortColumn) => {
		setSortState((previous) => {
			if (!previous || previous.column !== column) {
				// Spanco: first click shows S → P → A → N → C → O (asc). Others: desc.
				const initialDir = column === "spanco" ? "asc" : "desc";
				return { column, direction: initialDir };
			}
			// Spanco cycle: asc → desc → null. Others: desc → asc → null.
			if (column === "spanco") {
				if (previous.direction === "asc") {
					return { column, direction: "desc" };
				}
				return null;
			}
			if (previous.direction === "desc") {
				return { column, direction: "asc" };
			}
			return null;
		});
	}, []);
	const sortedNegotiations = useMemo(() => {
		if (!sortState) {
			return filteredNegotiations;
		}
		const next = [...filteredNegotiations];
		next.sort((a, b) => {
			let comparison = 0;
			if (sortState.column === "importo") {
				comparison = a.importo - b.importo;
			} else if (sortState.column === "percentuale") {
				comparison = a.percentuale - b.percentuale;
			} else {
				comparison = SPANCO_SORT_ORDER[a.spanco] - SPANCO_SORT_ORDER[b.spanco];
			}
			return sortState.direction === "asc" ? comparison : -comparison;
		});
		return next;
	}, [filteredNegotiations, sortState]);
	const importSortDirection =
		sortState?.column === "importo" ? sortState.direction : null;
	const percentSortDirection =
		sortState?.column === "percentuale" ? sortState.direction : null;
	const spancoSortDirection =
		sortState?.column === "spanco" ? sortState.direction : null;
	const importSortAriaLabel = getSortAriaLabel("importo", importSortDirection);
	const percentSortAriaLabel = getSortAriaLabel(
		"percentuale",
		percentSortDirection
	);
	const spancoSortAriaLabel = getSortAriaLabel("spanco", spancoSortDirection);
	const handleOpenUpdate = (n: ApiNegotiation) => {
		setUpdateTarget(n);
		setIsUpdateDialogOpen(true);
	};

	// Reusable search field element so we can place it either on its own row
	// (when filters are present) or inline accanto al bottone "Aggiungi"
	// quando non ci sono filtri header (es. pagina "Trattative concluse").
	const searchField = (
		<div className="flex items-center justify-center">
			<motion.label
				/* Search bar background follows table buttons color for consistency. */
				animate={{
					width: isSearchFocused ? "21rem" : "15rem",
				}}
				className="flex items-center justify-between rounded-full bg-table-buttons px-3.75 py-1.75 text-sm shadow-[-18px_0px_14px_var(--color-card)]"
				htmlFor="trattative-search"
				initial={false}
				transition={{ duration: 0.5, ease: [0.541, 0.232, 0.226, 1.002] }}
			>
				<input
					className="w-full truncate placeholder:text-search-placeholder focus:outline-none"
					id="trattative-search"
					onBlur={() => setIsSearchFocused(false)}
					onChange={(event) => setSearchTerm(event.target.value)}
					onFocus={() => setIsSearchFocused(true)}
					placeholder="Cerca cliente, referente..."
					ref={searchInputRef}
					value={searchTerm}
				/>
				{/* Animated icon swap between search and clear icons for clearer feedback when the field has content. */}
				<div className="ml-2 flex items-center justify-center">
					<AnimatePresence initial={false} mode="wait">
						{searchTerm ? (
							<motion.button
								animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
								// Clear the current search term and keep focus in the input so the user can immediately type again.
								aria-label="Cancella ricerca"
								className="flex items-center justify-center rounded-full text-search-placeholder transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
								exit={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
								initial={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
								// Simple, quick scale + fade + blur to keep the interaction feeling light.
								key="clear"
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									setSearchTerm("");
									searchInputRef.current?.focus();
								}}
								transition={{
									duration: 0.16,
									ease: [0.22, 0.61, 0.36, 1],
								}}
								type="button"
								whileTap={{ scale: 0.9 }}
							>
								<IconDeleteLeftFill18
									className={cn(
										"transition-colors duration-150",
										isSearchFocused
											? "text-foreground"
											: "text-search-placeholder"
									)}
									size="18px"
								/>
							</motion.button>
						) : (
							<motion.div
								animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
								aria-hidden
								className="flex items-center justify-center"
								// Mirror the same subtle scale + fade + blur when the search icon appears.
								exit={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
								initial={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
								key="search"
								transition={{
									duration: 0.16,
									ease: [0.22, 0.61, 0.36, 1],
								}}
							>
								<Search
									aria-hidden
									className={cn(
										"size-4 transition-colors duration-150",
										isSearchFocused
											? "text-foreground"
											: "text-search-placeholder"
									)}
								/>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</motion.label>
		</div>
	);

	return (
		<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
			{/* Header */}
			<div className="relative flex w-full flex-col gap-4.5">
				{/* Header - title and primary action */}
				<div className="flex items-center justify-between gap-2.5">
					<h1 className="flex items-center justify-center gap-3.5">
						<SignatureIcon aria-hidden size={24} />
						<span>
							{filter === "all" && "Tutte le trattative"}
							{filter === "aperte" && "Trattative aperte"}
							{filter === "concluse" && "Trattative concluse"}
							{filter === "abbandonate" && "Trattative abbandonate"}
						</span>
					</h1>
					<div className="flex items-center justify-center gap-2.5">
						{/* When there are no header filters (e.g. pagina "concluse"),
						 * keep search and primary action on the same line: search to the
						 * left, "Aggiungi" button to the right.
						 */}
						{!hasHeaderFilters && searchField}
						<button
							/* Use table buttons token for primary table actions */
							className="flex cursor-pointer items-center justify-center gap-2.5 rounded-full bg-table-buttons py-1.75 pr-2.5 pl-3.75 text-sm"
							onClick={() => setIsCreateDialogOpen(true)}
							type="button"
						>
							Aggiungi
							<Plus className="size-4 text-button-secondary" />
						</button>
					</div>
				</div>
				{/* Header - filters & search row placed on its own line for chiarezza
				 * quando sono presenti filtri header. Se non ci sono filtri, la search
				 * viene mostrata accanto al bottone "Aggiungi" nella riga sopra.
				 */}
				{hasHeaderFilters && (
					<div className="flex items-center justify-between gap-2">
						{/* Header - left side filters (local, client-side).
						 * We only show:
						 * - SPANCO filter on all views except "concluse"
						 * - Stato filter (Aperta/Conclusa/Abbandonata) exclusively on "tutte"
						 */}
						{(showSpancoFilter || showStatoFilter) && (
							<div className="flex w-full items-center justify-start gap-1.25">
								{showSpancoFilter && (
									<Select.Root
										onValueChange={(value) => {
											// When value is null we treat it as "all" phases; otherwise cast to a valid SPANCO stage.
											if (value === null) {
												setSpancoFilter("all");
												return;
											}
											setSpancoFilter(value as SpancoStage);
										}}
										value={spancoFilter === "all" ? null : spancoFilter}
									>
										<Select.Trigger
											// Use the same background token as the search input to keep header controls visually consistent.
											className="flex w-fit items-center justify-between gap-2 whitespace-nowrap rounded-full border-0 bg-table-buttons px-3.75 py-1.75 font-normal text-sm outline-none transition-colors focus-visible:outline-none data-popup-open:bg-table-buttons"
											id="trattative-spanco-filter"
										>
											<Select.Value
												className="data-placeholder:text-stats-title"
												placeholder="Tutte le fasi SPANCO"
											>
												{(value: SpancoStage | null) =>
													value
														? `Solo ${SPANCO_LABELS[value]}`
														: "Tutte le fasi SPANCO"
												}
											</Select.Value>
											<Select.Icon className="text-button-secondary">
												<ChevronDown aria-hidden className="size-3.5" />
											</Select.Icon>
										</Select.Trigger>
										<Select.Portal>
											<Select.Positioner
												/* Use content-height dropdown with a reasonable max height instead of stretching to the viewport. */
												alignItemWithTrigger={false}
												className="z-50 max-h-80 min-w-32 rounded-2xl text-popover-foreground shadow-xl"
												sideOffset={8}
											>
												<Select.Popup className="max-h-80 overflow-y-auto rounded-2xl bg-popover p-1">
													<Select.List className="flex h-fit flex-col gap-1">
														<Select.Item
															className="relative flex cursor-default select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-foreground data-selected:text-foreground"
															value={null}
														>
															<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
																<CheckIcon aria-hidden className="size-4" />
															</Select.ItemIndicator>
															<Select.ItemText>
																Tutte le fasi SPANCO
															</Select.ItemText>
														</Select.Item>
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
																		{`Solo ${SPANCO_LABELS[stage]}`}
																	</Select.ItemText>
																</Select.Item>
															)
														)}
													</Select.List>
												</Select.Popup>
											</Select.Positioner>
										</Select.Portal>
									</Select.Root>
								)}
								{showStatoFilter && (
									<Select.Root
										onValueChange={(value) => {
											if (value === null) {
												setStatoFilter("all");
												return;
											}
											setStatoFilter(
												value as "aperta" | "conclusa" | "abbandonata"
											);
										}}
										value={statoFilter === "all" ? null : statoFilter}
									>
										<Select.Trigger
											// Match the search input background token so all header filters share the same visual weight.
											className="flex w-fit items-center justify-between gap-2 whitespace-nowrap rounded-full border-0 bg-table-buttons px-3.75 py-1.75 font-normal text-sm outline-none transition-colors focus-visible:outline-none data-popup-open:bg-table-buttons"
											id="trattative-stato-filter"
										>
											<Select.Value
												className="data-placeholder:text-stats-title"
												placeholder="Tutti gli stati"
											>
												{(
													value: "aperta" | "conclusa" | "abbandonata" | null
												) => {
													if (!value) {
														return "Tutti gli stati";
													}
													if (value === "aperta") {
														return "Solo Aperte";
													}
													if (value === "conclusa") {
														return "Solo Concluse";
													}
													return "Solo Abbandonate";
												}}
											</Select.Value>
											<Select.Icon className="text-button-secondary">
												<ChevronDown aria-hidden className="size-3.5" />
											</Select.Icon>
										</Select.Trigger>
										<Select.Portal>
											<Select.Positioner
												alignItemWithTrigger={false}
												className="z-50 max-h-80 min-w-32 rounded-2xl text-popover-foreground shadow-xl"
												sideOffset={8}
											>
												<Select.Popup className="max-h-80 overflow-y-auto rounded-2xl bg-popover p-1">
													<Select.List className="flex h-fit flex-col gap-1">
														<Select.Item
															className="relative flex cursor-default select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-foreground data-selected:text-foreground"
															value={null}
														>
															<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
																<CheckIcon aria-hidden className="size-4" />
															</Select.ItemIndicator>
															<Select.ItemText>Tutti gli stati</Select.ItemText>
														</Select.Item>
														<Select.Item
															className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-foreground data-selected:text-foreground"
															value="aperta"
														>
															<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
																<CheckIcon aria-hidden className="size-4" />
															</Select.ItemIndicator>
															<Select.ItemText>Solo Aperte</Select.ItemText>
														</Select.Item>
														<Select.Item
															className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-foreground data-selected:text-foreground"
															value="conclusa"
														>
															<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
																<CheckIcon aria-hidden className="size-4" />
															</Select.ItemIndicator>
															<Select.ItemText>Solo Concluse</Select.ItemText>
														</Select.Item>
														<Select.Item
															className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-foreground data-selected:text-foreground"
															value="abbandonata"
														>
															<Select.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
																<CheckIcon aria-hidden className="size-4" />
															</Select.ItemIndicator>
															<Select.ItemText>
																Solo Abbandonate
															</Select.ItemText>
														</Select.Item>
													</Select.List>
												</Select.Popup>
											</Select.Positioner>
										</Select.Portal>
									</Select.Root>
								)}
							</div>
						)}
						{/* Header - search input aligned to the right, on its own row.
						 * We use motion.label to animate the width smoothly instead of a pure CSS transition.
						 */}
						{searchField}
					</div>
				)}
			</div>

			{/* Body: use table container background token for the shell */}
			<div className="table-container-bg flex min-h-0 flex-1 flex-col gap-6.25 rounded-t-3xl px-5.5 pt-6.25">
				{/* Stats: show only the relevant stat per page; all three on "tutte".
				 * We wrap every value in AnimateNumber so all counters share the same
				 * subtle entrance animation instead of only the last one.
				 */}
				<div className="flex items-start gap-3.75">
					{(filter === "all" || filter === "aperte") && (
						<div className="flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75">
							<h3 className="font-medium text-sm text-stats-title leading-none">
								Trattative aperte
							</h3>
							<div className="flex items-center justify-start">
								<AnimateNumber className="text-xl tabular-nums leading-none">
									{openCount}
								</AnimateNumber>
							</div>
						</div>
					)}
					{(filter === "all" || filter === "concluse") && (
						<div className="flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75">
							<h3 className="font-medium text-sm text-stats-title leading-none">
								Trattative concluse
							</h3>
							<div className="flex items-center justify-start">
								<AnimateNumber className="text-xl tabular-nums leading-none">
									{completedCount}
								</AnimateNumber>
							</div>
						</div>
					)}
					{(filter === "all" || filter === "abbandonate") && (
						<div className="flex flex-col items-start justify-center gap-3.75 rounded-xl bg-table-header p-3.75">
							<h3 className="font-medium text-sm text-stats-title leading-none">
								Trattative abbandonate
							</h3>
							<div className="flex items-center justify-start">
								<AnimateNumber className="text-xl tabular-nums leading-none">
									{abandonedCount}
								</AnimateNumber>
							</div>
						</div>
					)}
				</div>

				{/* Table */}
				<div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
					{/* Header: align background with table container using the same CSS variable */}
					<div className="table-header-bg shrink-0 rounded-xl px-3 py-2.25">
						<div className="grid grid-cols-[minmax(80px,1fr)_minmax(120px,1fr)_minmax(60px,0.5fr)_minmax(80px,0.5fr)_minmax(80px,0.9fr)_minmax(140px,1.2fr)_minmax(100px,0.8fr)] items-center gap-4 font-medium text-sm text-table-header-foreground">
							<div>Cliente</div>
							<div>Referente</div>
							<button
								aria-label={spancoSortAriaLabel}
								aria-pressed={spancoSortDirection !== null}
								className={cn(
									"group flex items-center justify-start gap-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
									spancoSortDirection !== null && "text-primary"
								)}
								onClick={() => handleToggleSort("spanco")}
								type="button"
							>
								<span className="font-medium">Spanco</span>
								<ChevronDown
									aria-hidden
									className={cn(
										"size-3.5 transition-transform",
										spancoSortDirection === "asc" && "-rotate-180",
										spancoSortDirection === null ? "opacity-40" : "opacity-100"
									)}
								/>
							</button>
							{/* Align importo sort control to the start to match requested layout */}
							<button
								aria-label={importSortAriaLabel}
								aria-pressed={importSortDirection !== null}
								className={cn(
									"group flex items-center justify-start gap-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
									importSortDirection !== null && "text-primary"
								)}
								onClick={() => handleToggleSort("importo")}
								type="button"
							>
								<span className="font-medium">Importo</span>
								<ChevronDown
									aria-hidden
									className={cn(
										"size-3.5 transition-transform",
										importSortDirection === "asc" && "-rotate-180",
										importSortDirection === null ? "opacity-40" : "opacity-100"
									)}
								/>
							</button>
							<button
								aria-label={percentSortAriaLabel}
								aria-pressed={percentSortDirection !== null}
								className={cn(
									"group flex items-center justify-start gap-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
									percentSortDirection !== null && "text-primary"
								)}
								onClick={() => handleToggleSort("percentuale")}
								type="button"
							>
								<span className="font-medium">Percentuale</span>
								<ChevronDown
									aria-hidden
									className={cn(
										"size-3.5 transition-transform",
										percentSortDirection === "asc" && "-rotate-180",
										percentSortDirection === null ? "opacity-40" : "opacity-100"
									)}
								/>
							</button>
							<div>Note</div>
							<div>Stato</div>
						</div>
					</div>
					<div className="scroll-fade-y flex h-full min-h-0 flex-1 flex-col overflow-scroll">
						{loading && (
							<div className="flex h-full items-center justify-center p-8">
								<p className="text-stats-title">Caricamento...</p>
							</div>
						)}
						{!loading && error && (
							<div className="flex h-full items-center justify-center p-8">
								<p className="text-center text-destructive">{error}</p>
							</div>
						)}
						{!(loading || error) && filteredNegotiations.length === 0 && (
							<div className="flex h-full items-center justify-center p-8">
								<p className="text-center text-stats-title">
									Nessuna trattativa trovata
								</p>
							</div>
						)}
						{!(loading || error) &&
							sortedNegotiations.length > 0 &&
							sortedNegotiations.map((n) => {
								const statusUi = getNegotiationStatusUi(n);
								// Clamp percentuale defensively to keep the progress "slider" within 0-100%
								const clampedPercent = clampPercentuale(n.percentuale);
								return (
									<button
										aria-label={`Trattativa ${n.id} - ${getClientDisplay(n)}`}
										/* Row hover uses dedicated table hover token */
										className="w-full cursor-pointer border-checkbox-border/70 border-b bg-transparent px-3 py-5 text-left font-medium transition-colors last:border-b-0 hover:bg-table-hover"
										key={n.id}
										onClick={() => handleOpenUpdate(n)}
										type="button"
									>
										<div className="grid grid-cols-[minmax(80px,1fr)_minmax(120px,1fr)_minmax(60px,0.5fr)_minmax(80px,0.5fr)_minmax(80px,0.9fr)_minmax(140px,1.2fr)_minmax(100px,0.8fr)] items-center gap-4 text-base">
											<div className="truncate">{getClientDisplay(n)}</div>
											<div className="truncate">{n.referente}</div>
											<div className="truncate">
												<span
													className={SPANCO_PILL_CLASSES}
													style={{
														// Text uses the solid main color, background uses a soft tint of the same color
														backgroundColor:
															SPANCO_STAGE_COLORS[n.spanco].softBg,
														color: SPANCO_STAGE_COLORS[n.spanco].main,
													}}
												>
													{SPANCO_LABELS[n.spanco]}
												</span>
											</div>
											<div className="truncate tabular-nums">
												{formatImporto(n.importo)}
											</div>
											<div className="flex items-center">
												{/* Visual progress bar: track uses soft tint, fill uses main color (same as SPANCO pills) */}
												<div
													aria-label={`Avanzamento trattativa al ${clampedPercent}%`}
													className="relative flex h-6 w-full items-center justify-center overflow-hidden rounded-full"
													role="img"
													style={{
														backgroundColor:
															SPANCO_STAGE_COLORS[n.spanco].softBg,
													}}
												>
													<div
														className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-150"
														style={{
															width: `${clampedPercent}%`,
															backgroundColor:
																SPANCO_STAGE_COLORS[n.spanco].main,
														}}
													/>
													<span className="relative z-10 block w-full px-2 text-center font-medium text-foreground text-xs tabular-nums">
														{clampedPercent}%
													</span>
												</div>
											</div>
											<div className="truncate">
												{n.note ? (
													<span
														className="block w-full truncate text-left"
														title={n.note}
													>
														{n.note}
													</span>
												) : (
													<span className="text-stats-title">ÔÇö</span>
												)}
											</div>
											<div>
												<span
													className={cn(
														"inline-flex items-center justify-center gap-2 rounded-full py-1.25 pr-3 pl-2.5 font-medium text-base",
														statusUi.classes
													)}
												>
													{statusUi.icon === "close" ? (
														<CircleXmarkFilled aria-hidden size={16} />
													) : (
														<CheckIcon aria-hidden size={16} />
													)}
													{statusUi.label}
												</span>
											</div>
										</div>
									</button>
								);
							})}
					</div>
				</div>
			</div>

			<CreateNegotiationDialog
				onOpenChange={setIsCreateDialogOpen}
				onSuccess={fetchNegotiations}
				open={isCreateDialogOpen}
			/>
			<UpdateNegotiationDialog
				negotiation={updateTarget}
				onOpenChange={setIsUpdateDialogOpen}
				onSuccess={fetchNegotiations}
				open={isUpdateDialogOpen}
			/>
		</main>
	);
}
