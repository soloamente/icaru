import LayoutContent from "@/components/layout-content";

/**
 * Main app layout: sidebar + main content. Used for dashboard/home, not for auth pages.
 */
export default function MainLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return <LayoutContent>{children}</LayoutContent>;
}
