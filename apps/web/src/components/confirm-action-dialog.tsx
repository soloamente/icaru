"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";

export interface ConfirmActionDialogProps {
	/** Controlled open state for the confirm dialog / drawer. */
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Main heading (e.g. "Eliminare questa trattativa?"). */
	title: string;
	/** Explanatory copy; can include emphasis or the entity name. */
	description: ReactNode;
	/**
	 * Primary destructive (or other) action — caller runs side effects
	 * (e.g. DELETE request) and closes the dialog on success.
	 */
	onConfirm: () => void | Promise<void>;
	/** Disables the confirm button while a request is in flight. */
	isConfirming?: boolean;
	/** Label for the primary button (default: "Elimina"). */
	confirmLabel?: string;
	/** Label for cancel (default: "Annulla"). */
	cancelLabel?: string;
}

/**
 * Conferma un'azione critica (es. eliminazione) con lo stesso pattern UX delle
 * altre modali: Dialog centrato su desktop, Vaul Drawer su mobile (breakpoint 768px),
 * allineato a "Modifiche non salvate" e ai dialog cliente/trattative.
 */
export function ConfirmActionDialog({
	open,
	onOpenChange,
	title,
	description,
	onConfirm,
	isConfirming = false,
	confirmLabel = "Elimina",
	cancelLabel = "Annulla",
}: ConfirmActionDialogProps) {
	const baseId = useId();
	const titleId = `${baseId}-confirm-title`;
	const descId = `${baseId}-confirm-desc`;
	const [layoutReady, setLayoutReady] = useState(false);
	const [isDesktop, setIsDesktop] = useState(false);

	// Stesso breakpoint delle pagine dettaglio: drawer sotto 768px, dialog da md in su.
	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const mql = window.matchMedia("(max-width: 767px)");
		const apply = () => {
			setIsDesktop(!mql.matches);
		};
		apply();
		setLayoutReady(true);
		mql.addEventListener("change", apply);
		return () => {
			mql.removeEventListener("change", apply);
		};
	}, []);

	const renderBody = (closeButton: ReactNode) => (
		<>
			<div className="flex items-center justify-between gap-3 pb-6">
				<h2
					className="font-bold text-2xl text-card-foreground tracking-tight"
					id={titleId}
				>
					{title}
				</h2>
				{closeButton}
			</div>
			<p className="text-muted-foreground text-sm" id={descId}>
				{description}
			</p>
			<div className="mt-6 flex justify-between gap-3">
				<Button
					className="h-10 min-w-26 rounded-xl border-border bg-muted text-card-foreground text-sm hover:bg-muted/80 hover:text-card-foreground"
					disabled={isConfirming}
					onClick={() => onOpenChange(false)}
					type="button"
					variant="outline"
				>
					{cancelLabel}
				</Button>
				<Button
					className="h-10 min-w-32 rounded-xl text-sm"
					disabled={isConfirming}
					onClick={async () => {
						await onConfirm();
					}}
					type="button"
					variant="destructive"
				>
					{isConfirming ? "Attendere…" : confirmLabel}
				</Button>
			</div>
		</>
	);

	if (!layoutReady) {
		return null;
	}

	return isDesktop ? (
		<Dialog.Root
			disablePointerDismissal={false}
			onOpenChange={onOpenChange}
			open={open}
		>
			<Dialog.Portal>
				<Dialog.Backdrop
					aria-hidden
					className="data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/50 data-closed:animate-out data-open:animate-in"
				/>
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<Dialog.Popup
						aria-describedby={descId}
						aria-labelledby={titleId}
						className="data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-card px-6 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.55)] outline-none data-closed:animate-out data-open:animate-in"
					>
						{/* Il titolo visibile è l\'h2 in renderBody, con `id` per aria-labelledby. */}
						<div className="overflow-y-auto">
							{renderBody(
								<Dialog.Close
									aria-label="Chiudi"
									className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-table-header text-card-foreground transition-transform hover:bg-table-hover focus:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
									disabled={isConfirming}
								>
									<X aria-hidden className="size-4" />
								</Dialog.Close>
							)}
						</div>
					</Dialog.Popup>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	) : (
		<Drawer.Root onOpenChange={onOpenChange} open={open}>
			<Drawer.Portal>
				<Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
				<Drawer.Content className="fixed inset-x-[10px] bottom-[10px] z-50 flex max-h-[90vh] flex-col rounded-[36px] bg-card px-6 py-5 text-card-foreground outline-none drop-shadow-[0_18px_45px_rgba(15,23,42,0.55)]">
					<Drawer.Title className="sr-only">{title}</Drawer.Title>
					<Drawer.Description className="sr-only">
						{typeof description === "string" ? description : title}
					</Drawer.Description>
					<div className="mx-auto mt-0.5 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />
					<div className="min-h-0 flex-1 overflow-y-auto pt-2">
						{renderBody(
							<button
								aria-label="Chiudi"
								className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-table-header text-card-foreground transition-transform hover:bg-table-hover focus:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
								disabled={isConfirming}
								onClick={() => onOpenChange(false)}
								type="button"
							>
								<X aria-hidden className="size-4" />
							</button>
						)}
					</div>
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	);
}
