"use client";

import { Dialog } from "@base-ui/react/dialog";
import { PreferencesContent } from "@/components/preferences-content";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";

interface PreferencesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * Preferences UI: Base UI Dialog for both mobile and desktop.
 * On mobile styled as bottom sheet (avoids Vaul Drawer which caused grey overlay on image load).
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
				<Dialog.Backdrop
					aria-hidden
					className="data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/50 data-closed:animate-out data-open:animate-in"
				/>
				<div
					className={cn(
						"pointer-events-none fixed inset-0 z-60 flex p-4",
						isMobile
							? "items-end justify-center"
							: "items-center justify-center"
					)}
				>
					<Dialog.Popup
						aria-describedby="preferences-dialog-desc"
						aria-labelledby="preferences-dialog-title"
						className={cn(
							"pointer-events-auto w-full overflow-hidden bg-card text-card-foreground shadow-lg outline-none duration-200 data-closed:animate-out data-open:animate-in",
							isMobile
								? "data-closed:fade-out-0 data-closed:slide-out-to-bottom-4 data-open:fade-in-0 data-open:slide-in-from-bottom-4 fixed inset-x-[10px] bottom-[10px] flex max-h-[90vh] flex-col rounded-t-xl"
								: "data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95 max-w-3xl rounded-4xl"
						)}
					>
						{isMobile && (
							<div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />
						)}
						<div
							className={cn(
								"overflow-y-auto p-6",
								isMobile ? "min-h-0 flex-1 pb-8" : "max-h-[85vh]"
							)}
						>
							<h2
								className="mb-6 font-semibold text-card-foreground text-xl"
								id="preferences-dialog-title"
							>
								Preferenze
							</h2>
							<p className="sr-only" id="preferences-dialog-desc">
								Personalizza tema, colore di accento e stile del carattere.
							</p>
							<PreferencesContent />
						</div>
					</Dialog.Popup>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
