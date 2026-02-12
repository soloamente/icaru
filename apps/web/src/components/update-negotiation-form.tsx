"use client";

import { Select } from "@base-ui/react/select";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { updateNegotiation } from "@/lib/api/client";
import type {
	ApiNegotiation,
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

/** Shared capsule-style container for form fields (consistent with create/update dialogs). */
const DIALOG_FIELD_CONTAINER_CLASSES =
	"flex items-center justify-between gap-2 rounded-2xl bg-table-header px-3.75 py-2.25";

/** Text styling for field labels inside pills. */
const DIALOG_FIELD_LABEL_TEXT_CLASSES =
	"w-fit flex-0 whitespace-nowrap text-base font-medium text-stats-title leading-none";

/** Base classes for text/number inputs: flat, right-aligned. Includes visible focus ring for accessibility (WCAG 2.4.7). */
const DIALOG_FIELD_INPUT_BASE_CLASSES =
	"flex-1 w-full cursor-text border-none bg-transparent! px-0 py-0 text-right text-base font-medium shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded md:text-base";

/** Base classes for select inside pills. Includes visible focus ring for accessibility (WCAG 2.4.7). */
const DIALOG_FIELD_SELECT_BASE_CLASSES =
	"flex-1 w-full cursor-pointer appearance-none border-none bg-transparent py-0 pl-0 pr-6 text-right text-base font-medium shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded";

export type TrattativeStato = "aperte" | "concluse" | "abbandonate";

interface UpdateNegotiationFormProps {
	negotiation: ApiNegotiation;
	stato: TrattativeStato;
	/** Called after successful save. Receives the updated negotiation so the page can redirect to the correct list. */
	onSuccess: (updated: ApiNegotiation) => void;
}

/**
 * Form for editing a negotiation. Renders on a dedicated page (trattative/{stato}/[id])
 * with the same styling as the create/update dialogs for design consistency.
 */
export default function UpdateNegotiationForm({
	negotiation,
	stato,
	onSuccess,
}: UpdateNegotiationFormProps) {
	const { token } = useAuth();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [importoError, setImportoError] = useState<string | null>(null);
	const [form, setForm] = useState<UpdateNegotiationBody>({
		spanco: negotiation.spanco,
		percentuale: negotiation.percentuale,
		importo: negotiation.importo,
		abbandonata: negotiation.abbandonata,
	});

	// Sync form when negotiation changes (e.g. after fetch)
	useEffect(() => {
		setForm({
			spanco: negotiation.spanco,
			percentuale: negotiation.percentuale,
			importo: negotiation.importo,
			abbandonata: negotiation.abbandonata,
		});
	}, [negotiation]);

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
		const result = await updateNegotiation(token, negotiation.id, form);
		setIsSubmitting(false);
		if ("error" in result) {
			setError(result.error);
			return;
		}
		toast.success("Trattativa aggiornata");
		onSuccess(result.data);
	};

	const backHref = `/trattative/${stato}`;

	return (
		<div className="flex w-full max-w-lg flex-col gap-6">
			<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
								"flex h-9 w-fit flex-none items-center justify-end gap-2"
							)}
							id="update-spanco"
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
				{/* Percentuale slider: same full-bleed slider as create dialog. */}
				<label className="w-full" htmlFor="update-percentuale">
					<div
						className="group relative flex w-full cursor-grab items-center overflow-hidden rounded-2xl bg-table-header px-3.75 py-2.25 active:cursor-grabbing"
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
						<span className="pointer-events-none absolute inset-y-0 right-3.75 flex items-center text-right font-mono font-semibold text-base text-foreground tabular-nums">
							{form.percentuale}%
						</span>
						<input
							aria-label="Percentuale avanzamento trattativa"
							className="pointer-events-none relative z-8 h-8 w-full appearance-none rounded bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
						<span className={DIALOG_FIELD_LABEL_TEXT_CLASSES}>Importo (€)</span>
						<Input
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
				<div className="flex flex-col gap-1">
					{/* Checkbox row: same padding (py-2.25) as other dialog fields for consistency. */}
					<div className="flex cursor-pointer items-center gap-2 rounded-2xl bg-table-header px-3.75 py-2.25">
						<Checkbox
							aria-describedby={
								getAbbandonataHelperText(stato, form.abbandonata ?? false)
									? "update-abbandonata-helper"
									: undefined
							}
							checked={form.abbandonata ?? false}
							id="update-abbandonata"
							onCheckedChange={(checked) =>
								setForm((prev) => ({
									...prev,
									abbandonata: checked === true,
								}))
							}
						/>
						<label
							className={cn(
								DIALOG_FIELD_LABEL_TEXT_CLASSES,
								"flex-1 cursor-pointer"
							)}
							htmlFor="update-abbandonata"
						>
							Abbandonata
						</label>
					</div>
					{getAbbandonataHelperText(stato, form.abbandonata ?? false) && (
						<p
							className="text-muted-foreground text-sm"
							id="update-abbandonata-helper"
						>
							{getAbbandonataHelperText(stato, form.abbandonata ?? false)}
						</p>
					)}
				</div>
				{error && (
					<p className="text-destructive text-sm" role="alert">
						{error}
					</p>
				)}
				<div className="mt-2 flex justify-between gap-3">
					{/* When submitting, render non-interactive span; Link doesn't support valid disabled semantics. */}
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
						type="submit"
					>
						{isSubmitting ? "Salvataggio…" : "Salva"}
					</Button>
				</div>
			</form>
		</div>
	);
}
