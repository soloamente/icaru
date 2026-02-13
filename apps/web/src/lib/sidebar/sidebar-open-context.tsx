"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface SidebarOpenContextValue {
	/** Whether the sidebar is open (visible). On mobile, false by default so content is visible. */
	isOpen: boolean;
	setOpen: (open: boolean) => void;
	toggle: () => void;
	/** True when viewport is below mobile breakpoint (e.g. phone). */
	isMobile: boolean;
}

const SidebarOpenContext = createContext<SidebarOpenContextValue | null>(null);

/**
 * Provider for sidebar open/close state. On mobile, sidebar starts closed so page content is visible.
 * Wrap the layout that contains Sidebar + content (e.g. in LayoutContent).
 */
export function SidebarOpenProvider({ children }: { children: ReactNode }) {
	const isMobile = useIsMobile();
	// On phone: closed by default. On desktop: open by default.
	const [isOpen, setOpenState] = useState(false);

	// After mount we know isMobile; set initial open state (closed on mobile, open on desktop).
	useEffect(() => {
		setOpenState(!isMobile);
	}, [isMobile]);

	const setOpen = useCallback((open: boolean) => {
		setOpenState(open);
	}, []);

	const toggle = useCallback(() => {
		setOpenState((prev) => !prev);
	}, []);

	const value: SidebarOpenContextValue = {
		isOpen,
		isMobile,
		setOpen,
		toggle,
	};

	return (
		<SidebarOpenContext.Provider value={value}>
			{children}
		</SidebarOpenContext.Provider>
	);
}

export function useSidebarOpen(): SidebarOpenContextValue | null {
	return useContext(SidebarOpenContext);
}
