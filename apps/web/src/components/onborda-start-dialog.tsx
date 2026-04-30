"use client";

import { useCallback, useEffect, useId } from "react";

export interface OnbordaStartDialogProps {
	open: boolean;
	onStart: () => void;
	onSkip: () => void;
}

export function OnbordaStartDialog({
	open,
	onStart,
	onSkip,
}: OnbordaStartDialogProps) {
	const baseId = useId();
	const titleId = `${baseId}-onborda-start-title`;
	const descriptionId = `${baseId}-onborda-start-description`;

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen) {
				onSkip();
			}
		},
		[onSkip]
	);

	useEffect(() => {
		if (!open) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onSkip();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [onSkip, open]);

	// This custom modal intentionally avoids Base UI Dialog so no library mutates
	// the app shell with inert/aria-hidden attributes while Next hydrates it.
	if (!open) {
		return null;
	}

	return (
		<div
			aria-describedby={descriptionId}
			aria-labelledby={titleId}
			aria-modal="true"
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			role="dialog"
		>
			<button
				aria-label="Salta il tour"
				className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-sm"
				onClick={() => handleOpenChange(false)}
				type="button"
			/>
			<div className="relative w-full max-w-md rounded-3xl bg-popover px-6 py-5 text-popover-foreground shadow-[0_18px_45px_rgba(15,23,42,0.36)] outline-none">
				<div className="mb-4 inline-flex rounded-full bg-table-header px-3 py-1 font-medium text-card-foreground text-xs">
					Guida iniziale
				</div>
				<h2
					className="font-semibold text-2xl text-card-foreground tracking-tight"
					id={titleId}
				>
					Vuoi fare un tour?
				</h2>
				<p
					className="mt-3 text-muted-foreground text-sm leading-6"
					id={descriptionId}
				>
					Ti accompagniamo tra Dashboard, Clienti, Trattative, Team e
					Statistiche in base alle sezioni disponibili per il tuo ruolo.
				</p>

				{/* Buttons close the controlled dialog through the parent tour flow. */}
				<div className="mt-6 flex items-center justify-between gap-3">
					<button
						className="inline-flex h-10 min-w-24 items-center justify-center rounded-full bg-table-header px-4 font-medium text-card-foreground text-sm transition-colors hover:bg-table-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
						onClick={onSkip}
						type="button"
					>
						Salta
					</button>
					<button
						autoFocus
						className="inline-flex h-10 min-w-32 items-center justify-center rounded-full bg-card-foreground px-4 font-semibold text-card text-sm transition-colors hover:bg-card-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
						onClick={onStart}
						type="button"
					>
						Inizia tour
					</button>
				</div>
			</div>
		</div>
	);
}
