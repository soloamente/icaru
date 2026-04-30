"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
	BarChart3,
	HelpCircle,
	LayoutDashboard,
	Signature,
	Users,
	X,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { dispatchStartTour } from "@/lib/onborda/tour-events";
import {
	CLIENTS_TOUR_NAME,
	MAIN_TOUR_NAME,
	NEGOTIATIONS_TOUR_NAME,
	STATS_TOUR_NAME,
	TEAM_TOUR_NAME,
	type TourName,
} from "@/lib/onborda/tour-storage";
import { cn } from "@/lib/utils";

interface HowItWorksDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	canSeeCommercialTopics: boolean;
	canSeeTeam: boolean;
	canSeeStats: boolean;
}

interface TourTopic {
	tourName: TourName;
	title: string;
	description: string;
	icon: typeof HelpCircle;
	available: boolean;
}

export function HowItWorksDialog({
	open,
	onOpenChange,
	canSeeCommercialTopics,
	canSeeTeam,
	canSeeStats,
}: HowItWorksDialogProps) {
	const isMobile = useIsMobile();
	const topics: TourTopic[] = [
		{
			tourName: MAIN_TOUR_NAME,
			title: "Panoramica completa",
			description:
				"Un giro generale tra dashboard, clienti, trattative, team e statistiche.",
			icon: LayoutDashboard,
			available: true,
		},
		{
			tourName: CLIENTS_TOUR_NAME,
			title: "Clienti",
			description:
				"Come cercare, aggiungere, modificare clienti e creare trattative collegate.",
			icon: Users,
			available: canSeeCommercialTopics,
		},
		{
			tourName: NEGOTIATIONS_TOUR_NAME,
			title: "Trattative",
			description:
				"Come usare filtri, creare una trattativa e modificarne stato, importo e allegati.",
			icon: Signature,
			available: canSeeCommercialTopics,
		},
		{
			tourName: TEAM_TOUR_NAME,
			title: "Team",
			description:
				"Come leggere e usare la sezione team in base ai tuoi permessi.",
			icon: Users,
			available: canSeeTeam,
		},
		{
			tourName: STATS_TOUR_NAME,
			title: "Statistiche",
			description:
				"Come interpretare mappa, grafici mensili e distribuzione SPANCO.",
			icon: BarChart3,
			available: canSeeStats,
		},
	];

	const handleTopicClick = (tourName: TourName) => {
		onOpenChange(false);
		dispatchStartTour(tourName);
	};

	return (
		<Dialog.Root
			disablePointerDismissal={false}
			onOpenChange={onOpenChange}
			open={open}
		>
			<Dialog.Portal>
				<Dialog.Backdrop
					aria-hidden
					className="data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-100 bg-black/50 data-closed:animate-out data-open:animate-in"
				/>
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
						aria-describedby="how-it-works-dialog-desc"
						aria-labelledby="how-it-works-dialog-title"
						className={cn(
							"flex w-full flex-col overflow-hidden bg-card text-card-foreground shadow-xl outline-none data-closed:animate-out data-open:animate-in",
							isMobile
								? "data-closed:fade-out-0 data-closed:slide-out-to-bottom-4 data-open:fade-in-0 data-open:slide-in-from-bottom-4 max-h-[88vh] rounded-t-3xl"
								: "data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95 max-h-[85vh] max-w-2xl rounded-3xl"
						)}
					>
						<div className="flex shrink-0 flex-col gap-3 px-6 pt-4 pb-0">
							{isMobile ? (
								<div
									aria-hidden
									className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/30"
								/>
							) : null}
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0">
									<div className="mb-3 inline-flex items-center gap-2 rounded-full bg-table-header px-3 py-1 font-medium text-card-foreground text-xs">
										<HelpCircle aria-hidden className="size-3.5" />
										Guida rapida
									</div>
									<Dialog.Title
										className="font-semibold text-2xl text-card-foreground tracking-tight"
										id="how-it-works-dialog-title"
									>
										Come funziona?
									</Dialog.Title>
									<p
										className="mt-2 text-muted-foreground text-sm leading-6"
										id="how-it-works-dialog-desc"
									>
										Scegli cosa vuoi imparare: partirà un tour guidato solo per
										quell'area.
									</p>
								</div>
								<Dialog.Close
									aria-label="Chiudi"
									className="flex size-9 shrink-0 items-center justify-center rounded-full bg-table-header text-card-foreground transition-colors hover:bg-table-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									<X aria-hidden className="size-4" />
								</Dialog.Close>
							</div>
						</div>
						<div className="grid min-h-0 gap-3 overflow-y-auto p-4 sm:grid-cols-2">
							{topics
								.filter((topic) => topic.available)
								.map((topic) => (
									<button
										className="group flex items-start gap-3 rounded-3xl bg-table-header px-4 pt-4 pb-3 text-left transition-colors hover:bg-table-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										key={topic.tourName}
										onClick={() => handleTopicClick(topic.tourName)}
										type="button"
									>
										<span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-card text-card-foreground">
											<topic.icon aria-hidden className="size-5" />
										</span>
										<span className="min-w-0">
											<span className="block font-semibold text-base text-card-foreground">
												{topic.title}
											</span>
											<span className="mt-1 block text-card-foreground/80 text-sm leading-5">
												{topic.description}
											</span>
										</span>
									</button>
								))}
						</div>
					</Dialog.Popup>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
