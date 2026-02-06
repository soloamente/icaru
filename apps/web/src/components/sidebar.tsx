"use client";

import { ChevronDown, ChevronRight, CircleCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentType, type SVGProps, useEffect, useState } from "react";
import {
	DashboardIcon,
	GearIcon,
	HelpIcon,
	OpenRectArrowOutIcon,
} from "@/components/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthOptional } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import { SignatureIcon } from "./icons/signature-icon";
import { UserGroupIcon } from "./icons/user-group";

type IconComponent = ComponentType<
	SVGProps<SVGSVGElement> & { size?: number; className?: string }
>;

/** Valid app routes for typed Link href. */
type AppRoute =
	| "/"
	| "/dashboard"
	| "/login"
	| "/trattative"
	| "/trattative/aperte"
	| "/trattative/abbandonate"
	| "/clienti";

interface NavigationItem {
	icon: IconComponent;
	label: string;
	href: AppRoute;
}

/** Navigation group with expandable sub-items. */
interface NavigationGroup {
	icon: IconComponent;
	label: string;
	children: { icon: IconComponent; label: string; href: AppRoute }[];
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

	// Avoid hydration mismatch: auth user is restored from localStorage in useEffect,
	// so server and first client paint can differ. Defer user-dependent avatar
	// until after mount so both render the same placeholder.
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	// Flat navigation items (single links)
	const flatNavItems: NavigationItem[] = [
		{
			icon: DashboardIcon,
			label: "Dashboard",
			href: "/dashboard",
		},
		{
			icon: UserGroupIcon as IconComponent,
			label: "Clienti",
			href: "/clienti",
		},
	];

	// Trattative group with expandable sub-pages (aperte, abbandonate)
	const trattativeGroup: NavigationGroup = {
		icon: SignatureIcon as IconComponent,
		label: "Trattative",
		children: [
			{
				icon: CircleCheck,
				label: "Trattative aperte",
				href: "/trattative/aperte",
			},
			{
				icon: XCircle,
				label: "Trattative abbandonate",
				href: "/trattative/abbandonate",
			},
		],
	};

	// Expand Trattative when current path is under /trattative
	const isTrattativePath =
		pathname === "/trattative" || pathname.startsWith("/trattative/");
	// Track expand state; auto-expand when navigating to trattative section
	const [trattativeExpanded, setTrattativeExpanded] =
		useState(isTrattativePath);
	useEffect(() => {
		if (isTrattativePath) {
			setTrattativeExpanded(true);
		}
	}, [isTrattativePath]);

	const navFooter: FooterItem[] = [
		{
			icon: HelpIcon as IconComponent,
			label: "Supporto",
		},
		{
			icon: GearIcon as IconComponent,
			label: "Preferenze",
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
			className="h-full w-full min-w-60.5 flex-0 px-6.5 py-6 font-medium"
		>
			<div className="flex h-full flex-col justify-between">
				{/* Navigation */}

				<div className="flex flex-col gap-6 pt-2">
					<div className="flex cursor-pointer items-center gap-3.5 rounded-full bg-background">
						<Avatar className="size-9">
							<AvatarFallback
								placeholderSeed={mounted ? (user?.email ?? "User") : undefined}
							/>
						</Avatar>
						<div className="flex flex-col gap-1 truncate">
							{/* Defer user-dependent content until after mount to avoid hydration mismatch (auth from localStorage). */}
							{mounted ? (
								user ? (
									<>
										<span className="truncate leading-none">{user.email}</span>
										<span className="text-sidebar-secondary text-xs leading-none">
											{getRoleLabel(auth?.role ?? undefined)}
										</span>
									</>
								) : (
									<span className="truncate leading-none">User</span>
								)
							) : (
								<span className="truncate leading-none">User</span>
							)}
						</div>
						<div className="flex items-center justify-center">
							<OpenRectArrowOutIcon className="" />
						</div>
					</div>
					<div className="flex flex-col gap-7">
						{/* Flat nav items */}
						{flatNavItems.map((item) => (
							<Link
								className={cn(
									"flex items-center gap-3.5 text-sidebar-secondary leading-none hover:text-sidebar-primary",
									isActiveItem(item.href) && "text-sidebar-primary"
								)}
								href={item.href as Parameters<typeof Link>[0]["href"]}
								key={item.href}
							>
								<item.icon size={24} />
								{item.label}
							</Link>
						))}
						{/* Trattative expandable group */}
						<div className="flex flex-col gap-1">
							<button
								aria-expanded={trattativeExpanded}
								aria-label={
									trattativeExpanded
										? "Chiudi sottomenu Trattative"
										: "Apri sottomenu Trattative"
								}
								className={cn(
									"flex w-full items-center gap-3.5 text-left text-sidebar-secondary leading-none hover:text-sidebar-primary",
									isTrattativePath && "text-sidebar-primary"
								)}
								onClick={() => setTrattativeExpanded(!trattativeExpanded)}
								type="button"
							>
								<trattativeGroup.icon size={24} />
								<span className="flex-1">{trattativeGroup.label}</span>
								{trattativeExpanded ? (
									<ChevronDown aria-hidden className="size-4 shrink-0" />
								) : (
									<ChevronRight aria-hidden className="size-4 shrink-0" />
								)}
							</button>
							{trattativeExpanded && (
								<div className="mt-7 ml-8 flex flex-col gap-7">
									{trattativeGroup.children.map((child) => (
										<Link
											className={cn(
												"flex items-center gap-3.5 text-sidebar-secondary leading-none hover:text-sidebar-primary",
												isActiveItem(child.href) && "text-sidebar-primary"
											)}
											href={child.href as Parameters<typeof Link>[0]["href"]}
											key={child.href}
										>
											<child.icon size={24} />
											{child.label}
										</Link>
									))}
								</div>
							)}
						</div>
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
				</div>
			</div>
		</aside>
	);
}
