"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { PreferencesContent } from "@/components/preferences-content";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";

interface PreferencesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * Preferences bottom sheet / dialog. Rebuilt to avoid grey overlay:
 * - Base UI Dialog only (no Vaul)
 * - CSS-only theme preview on mobile (no images = no layout shift)
 * - Explicit stacking, close button, content containment
 */
export function PreferencesDialog({
	open,
	onOpenChange,
}: PreferencesDialogProps) {
	const isMobile = useIsMobile();

	return (
		<Dialog.Root
			disablePointerDismissal={false}
			onOpenChange={onOpenChange}
			open={open}
		>
			<Dialog.Portal>
				{/* Backdrop: separate layer, below content */}
				<Dialog.Backdrop
					aria-hidden
					className="data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-100 bg-black/50 data-closed:animate-out data-open:animate-in"
				/>
				{/* Sheet container: above backdrop */}
				<div
					aria-modal
					className={cn(
						"fixed z-101 flex w-full",
						isMobile
							? "inset-x-0 bottom-0 justify-center px-[10px] pb-[10px]"
							: "inset-0 items-center justify-center p-4"
					)}
					role="dialog"
				>
					<Dialog.Popup
						aria-describedby="preferences-dialog-desc"
						aria-labelledby="preferences-dialog-title"
						className={cn(
							"flex w-full flex-col overflow-hidden bg-card text-card-foreground shadow-xl outline-none data-closed:animate-out data-open:animate-in",
							isMobile
								? "data-closed:fade-out-0 data-closed:slide-out-to-bottom-4 data-open:fade-in-0 data-open:slide-in-from-bottom-4 max-h-[88vh] rounded-t-2xl"
								: "data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95 max-h-[85vh] max-w-3xl rounded-3xl"
						)}
					>
						{/* Header: drag handle (mobile) + close button */}
						<div className="flex shrink-0 flex-col gap-3 border-border border-b px-6 pt-4 pb-3">
							{isMobile && (
								<div
									aria-hidden
									className="mx-auto h-1 w-12 rounded-full bg-muted-foreground/40"
								/>
							)}
							<div className="flex items-center justify-between gap-3">
								<h2
									className="font-semibold text-card-foreground text-xl"
									id="preferences-dialog-title"
								>
									Preferenze
								</h2>
								<Dialog.Close
									aria-label="Chiudi"
									className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted/80 text-card-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									<X aria-hidden className="size-4" />
								</Dialog.Close>
							</div>
						</div>
						{/* Scrollable content: stesso raggio in basso del dialog (desktop) così la “cella” rispetta il rounded */}
						<div
							className={cn(
								"min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-5",
								// Allinea il raggio inferiore al foglio: mobile rounded-t-2xl → completamento coerente in basso
								isMobile ? "rounded-b-2xl" : "rounded-b-3xl"
							)}
							style={{ contain: "layout" }}
						>
							<p className="sr-only" id="preferences-dialog-desc">
								Personalizza tema, palette e stile del carattere.
							</p>
							<PreferencesContent isMobile={isMobile} />
						</div>
					</Dialog.Popup>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
