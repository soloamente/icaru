"use client";

import { useDialKit } from "dialkit";
import { Menu } from "lucide-react";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useAuthOptional } from "@/lib/auth/auth-context";
import type { NavigationPositionId } from "@/lib/preferences/preferences-context";
import { usePreferences } from "@/lib/preferences/preferences-context";
import {
	SidebarOpenProvider,
	useSidebarOpen,
} from "@/lib/sidebar/sidebar-open-context";
import GlobalSearchCommand from "./global-search-command";
import Sidebar from "./sidebar";

/* ─────────────────────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — Sidebar open/close
 *
 * Sidebar stays in the background (no extra container). Content panel animates
 * over it so when closed the content takes full width and visually covers the sidebar.
 * On phone, sidebar is closed by default so page content is visible.
 *
 *    0ms   toggle: content panel starts moving (left position)
 *  ~300ms  content panel settles (spring); when closing, panel covers sidebar
 * ───────────────────────────────────────────────────────────────────────── */

/** Single constant: sidebar width when open; the right-hand content container width = viewport minus this (scaled by font size). */
const SIDEBAR_OPEN_WIDTH_PX = 238;

/** Default spring for content panel (used when DialKit not available). */
const CONTENT_PANEL_SPRING_DEFAULT = {
	type: "spring" as const,
	stiffness: 200,
	damping: 52,
	mass: 2.67,
};

/** DialKit controls for sidebar content panel timing/spring (tune in dev). */
function useSidebarPanelDialKit() {
	return useDialKit("Sidebar open/close", {
		content: {
			openLeft: [SIDEBAR_OPEN_WIDTH_PX, 0, 400],
			spring: {
				type: "spring",
				stiffness: 200,
				damping: 52,
				mass: 2.67,
				__mode: "advanced",
			},
		},
	});
}

/**
 * Left sidebar layout: sidebar positioned in background, content panel animates left/right
 * to reveal or cover it. Toggle opens/closes; on phone sidebar is closed by default.
 */
function SidebarLeftAnimatedLayout({
	user,
	children,
}: {
	user: { email: string } | null;
	children: React.ReactNode;
}) {
	const sidebarOpen = useSidebarOpen();
	const dialParams = useSidebarPanelDialKit();
	const { fontSize } = usePreferences();

	// Scale the open offset of the content panel based on the font size preference,
	// so that when the user selects "Grande" the sidebar has more horizontal space
	// and labels are not cramped or truncated.
	let fontSizeScale = 1;
	if (fontSize === "large") {
		fontSizeScale = 1.125;
	} else if (fontSize === "small") {
		fontSizeScale = 0.875;
	}

	if (!sidebarOpen) {
		return (
			<div className="flex h-screen overflow-hidden">
				<Sidebar user={user} variant="sidebar-left" />
				{children}
			</div>
		);
	}

	const isOpen = sidebarOpen.isOpen;
	const baseOpenLeft = dialParams?.content?.openLeft ?? SIDEBAR_OPEN_WIDTH_PX;
	const openLeft = baseOpenLeft * fontSizeScale;
	const sidebarWidthPx = SIDEBAR_OPEN_WIDTH_PX * fontSizeScale;
	const spring = dialParams?.content?.spring ?? CONTENT_PANEL_SPRING_DEFAULT;

	return (
		<div className="relative h-screen overflow-hidden">
			{/* Sidebar: width from SIDEBAR_OPEN_WIDTH_PX so the right-hand content container gets smaller by that amount */}
			<div
				className="absolute top-0 left-0 z-0 h-full shrink-0"
				style={{ width: sidebarWidthPx }}
			>
				<Sidebar
					className="h-full w-full min-w-0"
					user={user}
					variant="sidebar-left"
				/>
			</div>
			{/* Content panel: transparent background; animates left to reveal (open) or cover (closed) the sidebar. */}
			<motion.div
				animate={{ left: isOpen ? openLeft : 0 }}
				className="absolute top-0 right-0 bottom-0 z-10 flex min-h-0 flex-col bg-transparent"
				initial={false}
				onClick={() => {
					if (sidebarOpen.isMobile && isOpen) {
						sidebarOpen.setOpen(false);
					}
				}}
				transition={spring}
			>
				{/* Toggle: when sidebar is closed, show menu button so user can open it */}
				{!isOpen && (
					<button
						aria-label="Apri menu"
						className="absolute top-2 left-2 z-20 flex size-10 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						onClick={sidebarOpen.toggle}
						type="button"
					>
						<Menu aria-hidden className="size-5" />
					</button>
				)}
				{children}
			</motion.div>
		</div>
	);
}

/**
 * LayoutContent Component (Client Component)
 *
 * Handles pathname-based conditional rendering of sidebar and preferences.
 * Uses auth context for user data (loaded on mount and after login).
 * Respects user preference for nav position: sidebar left/right, top bar, or bottom navbar.
 */
export default function LayoutContent({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const pathname = usePathname();
	const auth = useAuthOptional();
	const user = auth?.user ?? null;
	const { navigationPosition } = usePreferences();

	// List of paths where the sidebar should be hidden
	const hideSidebarPaths: string[] = [];

	// List of paths where the sidebar should be visible
	const visibleSidebarPaths = ["/dashboard", "/trattative", "/clienti"];

	// Check if current pathname matches any hide patterns
	const shouldHideSidebar = hideSidebarPaths.some((path) =>
		pathname.startsWith(path)
	);

	// Check if current pathname matches any visible patterns
	const matchesVisiblePath = visibleSidebarPaths.some(
		(path) => pathname === path || pathname.startsWith(`${path}/`)
	);

	// Show sidebar if it matches visible paths AND is not in the hide list
	const shouldShowSidebar = matchesVisiblePath && !shouldHideSidebar;

	// Map preference to Sidebar variant for layout and styling
	const navVariant: NavigationPositionId = navigationPosition;

	if (!shouldShowSidebar) {
		return (
			<>
				<GlobalSearchCommand />
				<div className="flex h-screen overflow-hidden">{children}</div>
			</>
		);
	}

	// Sidebar on the left (default): sidebar in background, content panel animates over it (open/close with storyboard + DialKit)
	if (navVariant === "sidebar-left") {
		return (
			<>
				<GlobalSearchCommand />
				<SidebarOpenProvider>
					<SidebarLeftAnimatedLayout user={user}>
						{children}
					</SidebarLeftAnimatedLayout>
				</SidebarOpenProvider>
			</>
		);
	}

	// Sidebar on the right: row layout, content first then nav
	if (navVariant === "sidebar-right") {
		return (
			<>
				<GlobalSearchCommand />
				<div className="flex h-screen overflow-hidden">
					{children}
					<Sidebar user={user} variant="sidebar-right" />
				</div>
			</>
		);
	}

	// Top bar: column layout, nav bar first then content. Container in viewport, solo il contenuto interno (es. tabella) scrolla.
	if (navVariant === "top") {
		return (
			<>
				<GlobalSearchCommand />
				<div className="flex h-screen flex-col overflow-hidden">
					<Sidebar user={user} variant="top" />
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
						{children}
					</div>
				</div>
			</>
		);
	}

	// Bottom navbar: column layout, content first then nav bar. Stesso comportamento scroll.
	if (navVariant === "bottom") {
		return (
			<>
				<GlobalSearchCommand />
				<div className="flex h-screen flex-col overflow-hidden">
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
						{children}
					</div>
					<Sidebar user={user} variant="bottom" />
				</div>
			</>
		);
	}

	// Fallback (e.g. invalid stored value)
	return (
		<>
			<GlobalSearchCommand />
			<div className="flex h-screen overflow-hidden">
				<Sidebar user={user} variant="sidebar-left" />
				{children}
			</div>
		</>
	);
}
