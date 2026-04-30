"use client";

import { Confetti } from "@neoconfetti/react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import {
	type CSSProperties,
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { dispatchCompleteTour } from "@/lib/onborda/tour-events";
import { cn } from "@/lib/utils";

interface OnbordaTourStep {
	title?: ReactNode;
	content?: ReactNode;
	icon?: ReactNode;
	selector?: string;
	side?: string;
	pointerPadding?: number;
	pointerRadius?: number;
}

export interface OnbordaTourCardProps {
	step?: OnbordaTourStep;
	currentStep?: number;
	totalSteps?: number;
	nextStep?: () => void;
	prevStep?: () => void;
	closeOnborda?: () => void;
	className?: string;
}

const normalizeStepNumber = (
	currentStep: number | undefined,
	totalSteps: number | undefined
) => {
	const safeTotal =
		typeof totalSteps === "number" && totalSteps > 0 ? totalSteps : 1;
	// Onborda exposes the current step as a zero-based index, so display it as 1-based.
	const displayStep =
		typeof currentStep === "number" && Number.isFinite(currentStep)
			? currentStep + 1
			: 1;

	return Math.min(Math.max(displayStep, 1), safeTotal);
};

const CARD_GAP_PX = 16;
const VIEWPORT_MARGIN_PX = 16;
const DEFAULT_CARD_WIDTH_PX = 352;
const DEFAULT_CARD_HEIGHT_PX = 220;
const SPOTLIGHT_Z_INDEX = 1050;
const TOUR_CARD_Z_INDEX = 1100;
const TOUR_CONFETTI_Z_INDEX = 1200;
const TOUR_CONFETTI_DURATION_MS = 3600;
const TOUR_CONFETTI_COLORS: string[] = [
	"#ff004c",
	"#ff7a00",
	"#ffd400",
	"#21d07a",
	"#00b8ff",
	"#5b5cff",
	"#b624ff",
	"#ff4fd8",
];

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

const getCenteredCardPosition = (
	targetRect: DOMRect,
	cardWidth: number,
	cardHeight: number
) => ({
	left: targetRect.left + targetRect.width / 2 - cardWidth / 2,
	top: targetRect.top + targetRect.height / 2 - cardHeight / 2,
});

const getCardPositionForSide = (
	targetRect: DOMRect,
	cardWidth: number,
	cardHeight: number,
	side: string,
	maxLeft: number,
	maxTop: number
) => {
	const centered = getCenteredCardPosition(targetRect, cardWidth, cardHeight);

	if (side.startsWith("top")) {
		const preferredTop = targetRect.top - cardHeight - CARD_GAP_PX;
		return {
			left: centered.left,
			top:
				preferredTop < VIEWPORT_MARGIN_PX
					? targetRect.bottom + CARD_GAP_PX
					: preferredTop,
		};
	}

	if (side.startsWith("left")) {
		const preferredLeft = targetRect.left - cardWidth - CARD_GAP_PX;
		return {
			left:
				preferredLeft < VIEWPORT_MARGIN_PX
					? targetRect.right + CARD_GAP_PX
					: preferredLeft,
			top: centered.top,
		};
	}

	if (side.startsWith("right")) {
		const preferredLeft = targetRect.right + CARD_GAP_PX;
		return {
			left:
				preferredLeft > maxLeft
					? targetRect.left - cardWidth - CARD_GAP_PX
					: preferredLeft,
			top: centered.top,
		};
	}

	const preferredTop = targetRect.bottom + CARD_GAP_PX;
	return {
		left: centered.left,
		top:
			preferredTop > maxTop
				? targetRect.top - cardHeight - CARD_GAP_PX
				: preferredTop,
	};
};

const disableOnbordaSpotlight = (): void => {
	const overlay = document.querySelector<HTMLElement>(
		'[data-name="onborda-overlay"]'
	);
	const pointer = document.querySelector<HTMLElement>(
		'[data-name="onborda-pointer"]'
	);

	if (overlay) {
		// We render our own viewport-anchored spotlight below. Hide Onborda's
		// transform-based spotlight so it cannot drift inside scroll containers.
		overlay.style.opacity = "0";
		overlay.style.pointerEvents = "none";
	}

	if (pointer) {
		pointer.style.opacity = "0";
		pointer.style.pointerEvents = "none";
	}
};

const getSpotlightStyle = (
	targetRect: DOMRect,
	step: OnbordaTourStep
): CSSProperties => {
	const pointerPadding = step.pointerPadding ?? 30;
	const pointerPadOffset = pointerPadding / 2;
	const pointerRadius = step.pointerRadius ?? 28;
	const left = Math.max(VIEWPORT_MARGIN_PX, targetRect.left - pointerPadOffset);
	const top = Math.max(VIEWPORT_MARGIN_PX, targetRect.top - pointerPadOffset);
	const right = Math.min(
		window.innerWidth - VIEWPORT_MARGIN_PX,
		targetRect.right + pointerPadOffset
	);
	const bottom = Math.min(
		window.innerHeight - VIEWPORT_MARGIN_PX,
		targetRect.bottom + pointerPadOffset
	);

	return {
		position: "fixed",
		left,
		top,
		width: Math.max(0, right - left),
		height: Math.max(0, bottom - top),
		borderRadius: pointerRadius,
		boxShadow: "0 0 200vw 200vh rgba(0, 0, 0, 0.42)",
		pointerEvents: "none",
		zIndex: SPOTLIGHT_Z_INDEX,
	};
};

const launchTourConfetti = (): void => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		return;
	}

	const confettiHost = document.createElement("div");
	confettiHost.setAttribute("aria-hidden", "true");
	confettiHost.style.position = "fixed";
	confettiHost.style.inset = "0";
	confettiHost.style.pointerEvents = "none";
	confettiHost.style.zIndex = String(TOUR_CONFETTI_Z_INDEX);
	document.body.appendChild(confettiHost);

	const root = createRoot(confettiHost);

	// NeoConfetti is rendered in a throwaway React root so the celebration keeps
	// playing even after the tour card closes and Onborda unmounts its content.
	root.render(
		<div
			style={{
				left: "50%",
				position: "fixed",
				top: 0,
				transform: "translateX(-50%)",
			}}
		>
			<Confetti
				colors={TOUR_CONFETTI_COLORS}
				destroyAfterDone
				duration={TOUR_CONFETTI_DURATION_MS}
				force={0.82}
				particleCount={320}
				particleShape="mix"
				particleSize={12}
				stageHeight={window.innerHeight * 1.1}
				stageWidth={window.innerWidth * 1.15}
			/>
		</div>
	);

	window.setTimeout(() => {
		root.unmount();
		confettiHost.remove();
	}, TOUR_CONFETTI_DURATION_MS + 500);
};

export function OnbordaTourCard({
	step,
	currentStep,
	totalSteps,
	nextStep,
	prevStep,
	closeOnborda,
	className,
}: OnbordaTourCardProps) {
	const [hasMounted, setHasMounted] = useState(false);
	const [cardStyle, setCardStyle] = useState<CSSProperties>({
		bottom: VIEWPORT_MARGIN_PX,
		right: VIEWPORT_MARGIN_PX,
	});
	const [spotlightStyle, setSpotlightStyle] = useState<CSSProperties | null>(
		null
	);
	const cardRef = useRef<HTMLElement | null>(null);
	const displayStep = normalizeStepNumber(currentStep, totalSteps);
	const safeTotal =
		typeof totalSteps === "number" && totalSteps > 0 ? totalSteps : 1;
	const isFirstStep = displayStep <= 1;
	const isLastStep = displayStep >= safeTotal;
	const primaryLabel = isLastStep ? "Fine" : "Avanti";
	const canGoBack = !isFirstStep && typeof prevStep === "function";
	const canUsePrimary = isLastStep
		? typeof closeOnborda === "function"
		: typeof nextStep === "function";

	const handlePrimaryClick = () => {
		if (isLastStep) {
			launchTourConfetti();
			// Only the final primary action marks the tour as completed; X remains a plain close.
			dispatchCompleteTour();
			closeOnborda?.();
			return;
		}

		nextStep?.();
	};

	const updateCardPosition = useCallback(() => {
		if (!step?.selector) {
			setCardStyle({
				bottom: VIEWPORT_MARGIN_PX,
				right: VIEWPORT_MARGIN_PX,
			});
			return;
		}

		const target = document.querySelector(step.selector);
		if (!target) {
			return;
		}

		const targetRect = target.getBoundingClientRect();
		disableOnbordaSpotlight();
		setSpotlightStyle(getSpotlightStyle(targetRect, step));

		const cardRect = cardRef.current?.getBoundingClientRect();
		const cardWidth = cardRect?.width ?? DEFAULT_CARD_WIDTH_PX;
		const cardHeight = cardRect?.height ?? DEFAULT_CARD_HEIGHT_PX;
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const maxLeft = viewportWidth - cardWidth - VIEWPORT_MARGIN_PX;
		const maxTop = viewportHeight - cardHeight - VIEWPORT_MARGIN_PX;
		const side = step.side ?? "bottom";
		const { left, top } = getCardPositionForSide(
			targetRect,
			cardWidth,
			cardHeight,
			side,
			maxLeft,
			maxTop
		);

		setCardStyle({
			left: clamp(
				left,
				VIEWPORT_MARGIN_PX,
				Math.max(VIEWPORT_MARGIN_PX, maxLeft)
			),
			top: clamp(top, VIEWPORT_MARGIN_PX, Math.max(VIEWPORT_MARGIN_PX, maxTop)),
		});
	}, [step?.selector, step?.side]);

	useEffect(() => {
		setHasMounted(true);
	}, []);

	useLayoutEffect(() => {
		if (!hasMounted) {
			return;
		}

		updateCardPosition();
	}, [hasMounted, updateCardPosition]);

	useEffect(() => {
		if (!hasMounted) {
			return;
		}

		let animationFrame = 0;

		const schedulePositionUpdate = () => {
			window.cancelAnimationFrame(animationFrame);
			animationFrame = window.requestAnimationFrame(updateCardPosition);
		};

		window.addEventListener("resize", schedulePositionUpdate);
		window.addEventListener("scroll", schedulePositionUpdate, true);

		return () => {
			window.cancelAnimationFrame(animationFrame);
			window.removeEventListener("resize", schedulePositionUpdate);
			window.removeEventListener("scroll", schedulePositionUpdate, true);
		};
	}, [hasMounted, updateCardPosition]);

	const card = (
		<aside
			aria-label="Tour guidato ICARU"
			className={cn(
				"fixed w-[min(22rem,calc(100vw-2rem))] rounded-3xl bg-popover p-4 text-popover-foreground shadow-[0_18px_45px_rgba(15,23,42,0.22)] ring-1 ring-border/50 transition-[top,left] duration-200 ease-out motion-reduce:transition-none",
				className
			)}
			ref={cardRef}
			style={{ ...cardStyle, zIndex: TOUR_CARD_Z_INDEX }}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 items-start gap-3">
					{step?.icon ? (
						<div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-table-header text-card-foreground">
							{step.icon}
						</div>
					) : null}
					<div className="min-w-0">
						<p className="font-medium text-muted-foreground text-xs">
							Passo {displayStep} di {safeTotal}
						</p>
						<h2 className="mt-1 font-semibold text-card-foreground text-lg leading-tight">
							{step?.title ?? "Tour ICARU"}
						</h2>
					</div>
				</div>
				{closeOnborda ? (
					<button
						aria-label="Chiudi tour"
						className="flex size-8 shrink-0 items-center justify-center rounded-full bg-table-header text-card-foreground transition-transform hover:bg-table-hover focus:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
						onClick={closeOnborda}
						type="button"
					>
						<X aria-hidden className="size-4" />
					</button>
				) : null}
			</div>

			<div className="mt-3 text-muted-foreground text-sm leading-6">
				{step?.content ??
					"Segui i passaggi per scoprire le aree principali della piattaforma."}
			</div>

			<div className="mt-4 flex items-center justify-between gap-3">
				<button
					className={cn(
						"inline-flex h-10 items-center justify-center gap-2 rounded-full bg-table-header px-4 font-medium text-card-foreground text-sm transition-colors hover:bg-table-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45",
						isFirstStep && "text-muted-foreground"
					)}
					disabled={!canGoBack}
					onClick={prevStep}
					type="button"
				>
					<ArrowLeft aria-hidden className="size-4" />
					Indietro
				</button>
				<button
					className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-card-foreground px-4 font-semibold text-card text-sm transition-colors hover:bg-card-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45"
					disabled={!canUsePrimary}
					onClick={handlePrimaryClick}
					type="button"
				>
					{primaryLabel}
					{isLastStep ? null : <ArrowRight aria-hidden className="size-4" />}
				</button>
			</div>
		</aside>
	);

	// Onborda renders custom cards inside a transformed pointer wrapper. Portaling
	// the actual card to body keeps it above app cards and scrollable containers.
	return hasMounted
		? createPortal(
				<>
					{spotlightStyle ? (
						<div
							aria-hidden
							className="transition-[top,left,width,height] duration-200 ease-out motion-reduce:transition-none"
							style={spotlightStyle}
						/>
					) : null}
					{card}
				</>,
				document.body
			)
		: null;
}
