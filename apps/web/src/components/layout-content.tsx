"use client";

import { usePathname } from "next/navigation";
import { useAuthOptional } from "@/lib/auth/auth-context";
import type { NavigationPositionId } from "@/lib/preferences/preferences-context";
import { usePreferences } from "@/lib/preferences/preferences-context";
import Sidebar from "./sidebar";

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
		return <div className="flex h-screen overflow-hidden">{children}</div>;
	}

	// Sidebar on the left (default): row layout, nav first
	if (navVariant === "sidebar-left") {
		return (
			<div className="flex h-screen overflow-hidden">
				<Sidebar user={user} variant="sidebar-left" />
				{children}
			</div>
		);
	}

	// Sidebar on the right: row layout, content first then nav
	if (navVariant === "sidebar-right") {
		return (
			<div className="flex h-screen overflow-hidden">
				{children}
				<Sidebar user={user} variant="sidebar-right" />
			</div>
		);
	}

	// Top bar: column layout, nav bar first then content. Container in viewport, solo il contenuto interno (es. tabella) scrolla.
	if (navVariant === "top") {
		return (
			<div className="flex h-screen flex-col overflow-hidden">
				<Sidebar user={user} variant="top" />
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					{children}
				</div>
			</div>
		);
	}

	// Bottom navbar: column layout, content first then nav bar. Stesso comportamento scroll.
	if (navVariant === "bottom") {
		return (
			<div className="flex h-screen flex-col overflow-hidden">
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					{children}
				</div>
				<Sidebar user={user} variant="bottom" />
			</div>
		);
	}

	// Fallback (e.g. invalid stored value)
	return (
		<div className="flex h-screen overflow-hidden">
			<Sidebar user={user} variant="sidebar-left" />
			{children}
		</div>
	);
}
