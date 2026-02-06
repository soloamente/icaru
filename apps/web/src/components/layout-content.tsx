"use client";

import { usePathname } from "next/navigation";
import { useAuthOptional } from "@/lib/auth/auth-context";
import Sidebar from "./sidebar";

/**
 * LayoutContent Component (Client Component)
 *
 * Handles pathname-based conditional rendering of sidebar and preferences.
 * Uses auth context for user data (loaded on mount and after login).
 */
export default function LayoutContent({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const pathname = usePathname();
	const auth = useAuthOptional();
	const user = auth?.user ?? null;

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

	return (
		<div className="flex h-screen overflow-hidden">
			{shouldShowSidebar && <Sidebar user={user} />}
			{children}
		</div>
	);
}
