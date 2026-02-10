"use client";

import { useEffect, useState } from "react";

/** Breakpoint below which we show Vaul drawer instead of dialog (e.g. phone/small tablet). */
const MOBILE_BREAKPOINT_PX = 768;

/**
 * Returns true when viewport width is below MOBILE_BREAKPOINT_PX.
 * Defaults to false to avoid hydration mismatch; updates after mount.
 */
export function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
		const handler = () => setIsMobile(mql.matches);
		handler(); // set initial value
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, []);

	return isMobile;
}
