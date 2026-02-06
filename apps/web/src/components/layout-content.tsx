"use client";

import { usePathname } from "next/navigation";

import Sidebar from "./sidebar";

/** Paths where sidebar is shown (main app routes). */
const SIDEBAR_PATHS = ["/", "/dashboard"];

function shouldShowSidebar(pathname: string): boolean {
	return SIDEBAR_PATHS.some(
		(path) => pathname === path || pathname.startsWith(`${path}/`)
	);
}

/**
 * Layout wrapper: sidebar + main content. Sidebar is shown on main app routes.
 */
export default function LayoutContent({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const pathname = usePathname();
	const showSidebar = shouldShowSidebar(pathname);

	return (
		<div className="flex h-svh overflow-hidden">
			{showSidebar && <Sidebar />}
			<main className="flex min-w-0 flex-1 flex-col overflow-auto">
				{children}
			</main>
		</div>
	);
}
