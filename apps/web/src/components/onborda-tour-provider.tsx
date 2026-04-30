"use client";

import { usePathname, useRouter } from "next/navigation";
import {
	type CardComponentProps,
	Onborda,
	type OnbordaProps,
	OnbordaProvider,
	type Step,
	useOnborda,
} from "onborda";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useAuthOptional } from "@/lib/auth/auth-context";
import {
	dispatchRedoTour as dispatchRedoTourEvent,
	ONBORDA_TOUR_COMPLETED_EVENT,
	ONBORDA_TOUR_REDO_EVENT,
	ONBORDA_TOUR_START_EVENT,
} from "@/lib/onborda/tour-events";
import {
	type IcaruTourStep,
	prepareAllToursForRuntime,
} from "@/lib/onborda/tour-steps";
import {
	CLIENTS_TOUR_NAME,
	getTourStorageKey,
	MAIN_TOUR_NAME,
	NEGOTIATIONS_TOUR_NAME,
	readTourState,
	STATS_TOUR_NAME,
	TEAM_TOUR_NAME,
	TOUR_TEAMS_UPDATED_EVENT,
	type TourName,
	writeTourState,
} from "@/lib/onborda/tour-storage";
import { OnbordaStartDialog } from "./onborda-start-dialog";
import { OnbordaTourCard } from "./onborda-tour-card";

const FIRST_TOUR_SELECTOR = "#tour-dashboard-shell";
const MAX_TOUR_START_FRAMES = 120;
type TourStartRoute =
	| "/dashboard"
	| "/clienti"
	| "/trattative/tutte"
	| "/team"
	| "/statistiche";

const TOUR_START_CONFIG: Record<
	TourName,
	{ route: TourStartRoute; selector: string }
> = {
	[MAIN_TOUR_NAME]: { route: "/dashboard", selector: FIRST_TOUR_SELECTOR },
	[CLIENTS_TOUR_NAME]: { route: "/clienti", selector: "#tour-clienti-shell" },
	[NEGOTIATIONS_TOUR_NAME]: {
		route: "/trattative/tutte",
		selector: "#tour-trattative-shell",
	},
	[TEAM_TOUR_NAME]: { route: "/team", selector: "#tour-team-shell" },
	[STATS_TOUR_NAME]: {
		route: "/statistiche",
		selector: "#tour-statistiche-shell",
	},
};

const isLoginPath = (pathname: string | null): boolean =>
	pathname === "/login" || pathname?.startsWith("/login/") === true;

type OnbordaTours = OnbordaProps["steps"];

/** Passa solo i campi supportati da Onborda `Step` (esclude metadati ruolo/sessione). */
const normalizeTours = (
	tours: ReturnType<typeof prepareAllToursForRuntime>
): OnbordaTours =>
	tours.map((tour) => ({
		tour: tour.tour,
		steps: tour.steps.map(
			(step: IcaruTourStep): Step => ({
				icon: step.icon ?? null,
				title: step.title,
				content: step.content,
				selector: step.selector,
				side: step.side,
				showControls: step.showControls,
				pointerPadding: step.pointerPadding,
				pointerRadius: step.pointerRadius,
				nextRoute: step.nextRoute,
				prevRoute: step.prevRoute,
			})
		),
	}));

function OnbordaTourCardAdapter({
	currentStep,
	nextStep,
	prevStep,
	step,
	totalSteps,
}: CardComponentProps) {
	const { closeOnborda } = useOnborda();

	return (
		<OnbordaTourCard
			closeOnborda={closeOnborda}
			currentStep={currentStep}
			nextStep={nextStep}
			prevStep={prevStep}
			step={step}
			totalSteps={totalSteps}
		/>
	);
}

function OnbordaTourController({ children }: { children: ReactNode }) {
	const auth = useAuthOptional();
	const pathname = usePathname();
	const router = useRouter();
	const { closeOnborda, startOnborda } = useOnborda();
	const isMobile = useIsMobile();
	const [hasMounted, setHasMounted] = useState(false);
	const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
	const [handledPromptKey, setHandledPromptKey] = useState<string | null>(null);
	const [pendingStart, setPendingStart] = useState<{
		tourName: TourName;
	} | null>(null);
	const [tourTeamsEpoch, setTourTeamsEpoch] = useState(0);
	const startFrameRef = useRef<number | null>(null);

	useEffect(() => {
		const onTeamsUpdated = (): void => {
			setTourTeamsEpoch((n) => n + 1);
		};
		window.addEventListener(TOUR_TEAMS_UPDATED_EVENT, onTeamsUpdated);
		return () => {
			window.removeEventListener(TOUR_TEAMS_UPDATED_EVENT, onTeamsUpdated);
		};
	}, []);

	// `tourTeamsEpoch` forza il ricalcolo quando TeamsView aggiorna sessionStorage (id primo team) per nextRoute dinamiche.
	// biome-ignore lint/correctness/useExhaustiveDependencies: epoch è dipendenza intenzionale per rigenerare gli step del tour
	const tours = useMemo(
		() => normalizeTours(prepareAllToursForRuntime(auth?.role)),
		[auth?.role, tourTeamsEpoch]
	);
	const storageKey = useMemo(
		() =>
			getTourStorageKey({
				email: auth?.user?.email,
				role: auth?.role,
			}),
		[auth?.role, auth?.user?.email]
	);

	const cancelPendingStart = useCallback(() => {
		if (startFrameRef.current !== null) {
			window.cancelAnimationFrame(startFrameRef.current);
			startFrameRef.current = null;
		}
		setPendingStart(null);
	}, []);

	const requestTourStart = useCallback(
		(tourName: TourName = MAIN_TOUR_NAME) => {
			if (isMobile) {
				// Mobile has no guided tour: avoid opening prompts or navigating the user
				// into a tour flow from the sidebar/help events.
				setHandledPromptKey(storageKey);
				setIsStartDialogOpen(false);
				cancelPendingStart();
				closeOnborda();
				return;
			}

			const config = TOUR_START_CONFIG[tourName];
			setHandledPromptKey(storageKey);
			setIsStartDialogOpen(false);
			setPendingStart({ tourName });

			if (pathname !== config.route) {
				router.push(config.route);
			}
		},
		[cancelPendingStart, closeOnborda, isMobile, pathname, router, storageKey]
	);

	const handleStart = useCallback(() => {
		requestTourStart(MAIN_TOUR_NAME);
	}, [requestTourStart]);

	const handleSkip = useCallback(() => {
		writeTourState(storageKey, "skipped");
		setHandledPromptKey(storageKey);
		setIsStartDialogOpen(false);
		cancelPendingStart();
		closeOnborda();
	}, [cancelPendingStart, closeOnborda, storageKey]);

	useEffect(() => {
		setHasMounted(true);
	}, []);

	useEffect(() => {
		if (!hasMounted || auth?.isLoaded !== true) {
			return;
		}

		if (isMobile || !auth.user || isLoginPath(pathname)) {
			setIsStartDialogOpen(false);
			cancelPendingStart();
			closeOnborda();
			return;
		}

		setIsStartDialogOpen(
			handledPromptKey !== storageKey && readTourState(storageKey) === null
		);
	}, [
		auth?.isLoaded,
		auth?.user,
		cancelPendingStart,
		closeOnborda,
		handledPromptKey,
		hasMounted,
		isMobile,
		pathname,
		storageKey,
	]);

	useEffect(() => {
		const handleRedoTour = () => {
			requestTourStart(MAIN_TOUR_NAME);
		};

		window.addEventListener(ONBORDA_TOUR_REDO_EVENT, handleRedoTour);

		return () => {
			window.removeEventListener(ONBORDA_TOUR_REDO_EVENT, handleRedoTour);
		};
	}, [requestTourStart]);

	useEffect(() => {
		const handleStartTour = (event: Event) => {
			const tourName =
				event instanceof CustomEvent && event.detail?.tourName
					? (event.detail.tourName as TourName)
					: MAIN_TOUR_NAME;
			requestTourStart(tourName);
		};

		window.addEventListener(ONBORDA_TOUR_START_EVENT, handleStartTour);

		return () => {
			window.removeEventListener(ONBORDA_TOUR_START_EVENT, handleStartTour);
		};
	}, [requestTourStart]);

	useEffect(() => {
		const handleCompleteTour = () => {
			// Completion is only persisted from the final-card action event, not from generic close/X actions.
			writeTourState(storageKey, "completed");
			setHandledPromptKey(storageKey);
			setIsStartDialogOpen(false);
			cancelPendingStart();
		};

		window.addEventListener(ONBORDA_TOUR_COMPLETED_EVENT, handleCompleteTour);

		return () => {
			window.removeEventListener(
				ONBORDA_TOUR_COMPLETED_EVENT,
				handleCompleteTour
			);
		};
	}, [cancelPendingStart, storageKey]);

	useEffect(() => {
		if (!pendingStart) {
			return;
		}

		if (isMobile) {
			cancelPendingStart();
			closeOnborda();
			return;
		}

		const config = TOUR_START_CONFIG[pendingStart.tourName];
		if (pathname !== config.route) {
			return;
		}

		let frameCount = 0;
		let isCancelled = false;

		const waitForDashboardTarget = () => {
			if (isCancelled) {
				return;
			}

			if (document.querySelector(config.selector)) {
				startFrameRef.current = null;
				const tourName = pendingStart.tourName;
				setPendingStart(null);
				startOnborda(tourName);
				return;
			}

			frameCount += 1;
			if (frameCount >= MAX_TOUR_START_FRAMES) {
				startFrameRef.current = null;
				setPendingStart(null);
				return;
			}

			startFrameRef.current = window.requestAnimationFrame(
				waitForDashboardTarget
			);
		};

		startFrameRef.current = window.requestAnimationFrame(
			waitForDashboardTarget
		);

		return () => {
			isCancelled = true;
			if (startFrameRef.current !== null) {
				window.cancelAnimationFrame(startFrameRef.current);
				startFrameRef.current = null;
			}
		};
	}, [
		cancelPendingStart,
		closeOnborda,
		isMobile,
		pathname,
		pendingStart,
		startOnborda,
	]);

	return (
		<>
			<Onborda cardComponent={OnbordaTourCardAdapter} steps={tours}>
				{children}
			</Onborda>
			<OnbordaStartDialog
				onSkip={handleSkip}
				onStart={handleStart}
				open={isStartDialogOpen}
			/>
		</>
	);
}

export function OnbordaTourProvider({ children }: { children: ReactNode }) {
	return (
		<OnbordaProvider>
			<OnbordaTourController>{children}</OnbordaTourController>
		</OnbordaProvider>
	);
}

export const dispatchRedoTour = (): void => {
	dispatchRedoTourEvent();
};
