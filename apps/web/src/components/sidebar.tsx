"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import {
	DashboardIcon,
	HelpIcon,
	OpenRectArrowOutIcon,
	UserCircleIcon,
} from "@/components/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthOptional } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

type IconComponent = ComponentType<
	SVGProps<SVGSVGElement> & { size?: number; className?: string }
>;

/** Valid app routes for typed Link href. */
type AppRoute = "/" | "/dashboard" | "/login";

interface NavigationItem {
	icon: IconComponent;
	label: string;
	href: AppRoute;
}

interface FooterItem {
	icon: IconComponent;
	label: string;
	onClick?: () => void;
}

interface SidebarProps {
	/** Optional: pass user for display; if not provided, sidebar uses useAuthOptional internally. */
	user?: { email: string } | null;
}

export default function Sidebar({ user: userProp }: SidebarProps) {
	const pathname = usePathname();
	const auth = useAuthOptional();
	const user = userProp ?? auth?.user ?? null;

	// Navigation items - add more as routes are created
	const navigationItems: NavigationItem[] = [
		{
			icon: DashboardIcon,
			label: "Dashboard",
			href: "/dashboard",
		},
		{
			icon: UserCircleIcon as IconComponent,
			label: "Home",
			href: "/",
		},
	];

	const navFooter: FooterItem[] = [
		{
			icon: HelpIcon as IconComponent,
			label: "Supporto",
		},
		{
			icon: OpenRectArrowOutIcon as IconComponent,
			label: "Esci dall'account",
			onClick: () => {
				auth?.logout?.();
			},
		},
	];

	function isActiveItem(itemHref: string): boolean {
		return pathname === itemHref;
	}

	function getRoleLabel(role: string | null | undefined): string {
		if (!role) {
			return "—";
		}
		if (role === "admin") {
			return "Admin";
		}
		if (role === "director") {
			return "Direttore";
		}
		if (role === "seller") {
			return "Venditore";
		}
		return role;
	}

	return (
		<aside
			aria-label="Sidebar"
			className="flex h-full w-full min-w-60 flex-0 flex-col border-sidebar-border border-r bg-sidebar px-6 py-6 font-medium"
		>
			<div className="flex h-full flex-col justify-between">
				{/* Navigation */}
				<div className="flex flex-col gap-6 pt-2">
					<div className="flex flex-col gap-7">
						{navigationItems.map((item) => (
							<Link
								className={cn(
									"flex items-center gap-3.5 text-sidebar-secondary hover:text-sidebar-primary",
									isActiveItem(item.href) && "text-sidebar-primary"
								)}
								href={item.href}
								key={item.href}
							>
								<item.icon size={24} />
								{item.label}
							</Link>
						))}
					</div>
				</div>

				{/* Footer: Support, Logout, User */}
				<div className="flex flex-col gap-6 pb-2">
					{navFooter.map((item) => (
						<button
							className="flex cursor-pointer items-center gap-3.5 text-sidebar-secondary hover:text-sidebar-primary"
							key={item.label}
							onClick={item.onClick}
							type="button"
						>
							<item.icon size={24} />
							{item.label}
						</button>
					))}

					<div className="flex cursor-pointer items-center gap-3.5 rounded-full hover:bg-sidebar-accent">
						<Avatar className="size-9">
							<AvatarFallback placeholderSeed={user?.email ?? "User"} />
						</Avatar>
						<div className="flex flex-col gap-1 truncate">
							{user ? (
								<>
									<span className="truncate leading-none">{user.email}</span>
									<span className="text-sidebar-secondary text-xs leading-none">
										{getRoleLabel(auth?.role ?? undefined)}
									</span>
								</>
							) : (
								<span>User</span>
							)}
						</div>
					</div>
				</div>
			</div>
		</aside>
	);
}
