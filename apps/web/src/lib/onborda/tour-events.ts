import { MAIN_TOUR_NAME, type TourName } from "./tour-storage";

export const ONBORDA_TOUR_COMPLETED_EVENT = "icr-onborda-completed-tour";
export const ONBORDA_TOUR_REDO_EVENT = "icr-onborda-redo-tour";
export const ONBORDA_TOUR_START_EVENT = "icr-onborda-start-tour";

const dispatchTourEvent = (eventName: string): void => {
	if (typeof window === "undefined") {
		return;
	}

	window.dispatchEvent(new Event(eventName));
};

export const dispatchCompleteTour = (): void => {
	dispatchTourEvent(ONBORDA_TOUR_COMPLETED_EVENT);
};

export const dispatchRedoTour = (): void => {
	dispatchTourEvent(ONBORDA_TOUR_REDO_EVENT);
};

export const dispatchStartTour = (
	tourName: TourName = MAIN_TOUR_NAME
): void => {
	if (typeof window === "undefined") {
		return;
	}

	window.dispatchEvent(
		new CustomEvent<{ tourName: TourName }>(ONBORDA_TOUR_START_EVENT, {
			detail: { tourName },
		})
	);
};
