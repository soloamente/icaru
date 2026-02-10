"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Drawer } from "vaul";
import { PreferencesContent } from "@/components/preferences-content";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface PreferencesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * Preferences UI: on mobile uses Vaul Drawer (bottom sheet), on desktop uses Base UI Dialog.
 * Same content (theme, accent, font) in both.
 */
export function PreferencesDialog({
	open,
	onOpenChange,
}: PreferencesDialogProps) {
	const isMobile = useIsMobile();

	if (isMobile) {
		return (
			<Drawer.Root onOpenChange={onOpenChange} open={open}>
				<Drawer.Portal>
					<Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
					<Drawer.Content className="fixed right-0 bottom-0 left-0 z-50 flex max-h-[90vh] flex-col rounded-t-xl bg-card text-card-foreground outline-none">
						{/* Drag handle for accessibility / affordance */}
						<div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />
						<div className="overflow-y-auto p-6 pb-8">
							<h2 className="mb-6 font-semibold text-foreground text-xl">
								Preferenze
							</h2>
							<p className="sr-only">
								Personalizza tema, colore di accento e stile del carattere.
							</p>
							<PreferencesContent />
						</div>
					</Drawer.Content>
				</Drawer.Portal>
			</Drawer.Root>
		);
	}

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
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<Dialog.Popup
						aria-describedby="preferences-dialog-desc"
						aria-labelledby="preferences-dialog-title"
						className="data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95 w-full max-w-3xl overflow-hidden rounded-4xl bg-card text-card-foreground shadow-lg outline-none duration-200 data-closed:animate-out data-open:animate-in"
					>
						<div className="max-h-[85vh] overflow-y-auto p-6">
							<h2
								className="mb-6 font-semibold text-foreground text-xl"
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
