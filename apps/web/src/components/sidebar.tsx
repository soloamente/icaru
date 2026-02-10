"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ComponentType, type SVGProps, useEffect, useState } from "react";
import {
	DashboardIcon,
	GearIcon,
	HelpIcon,
	OpenRectArrowOutIcon,
} from "@/components/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthOptional } from "@/lib/auth/auth-context";
import {
	type NavigationPositionId,
	usePreferences,
} from "@/lib/preferences/preferences-context";
import { cn } from "@/lib/utils";
import FileXmark from "./file-xmark";
import FolderOpen from "./folder-open";
import AwardCertificate from "./icons/award-certificate";
import { SignatureIcon } from "./icons/signature-icon";
import { UserGroupIcon } from "./icons/user-group";
import { PreferencesDialog } from "./preferences-dialog";

type IconComponent = ComponentType<
	SVGProps<SVGSVGElement> & { size?: number; className?: string }
>;

/** Valid app routes for typed Link href. */
type AppRoute =
	| "/"
	| "/dashboard"
	| "/login"
	| "/trattative"
	| "/trattative/tutte"
	| "/trattative/aperte"
	| "/trattative/concluse"
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
	/** Where the nav is placed: left/right sidebar (vertical) or top/bottom bar (horizontal). */
	variant?: NavigationPositionId;
}

const DEFAULT_VARIANT: NavigationPositionId = "sidebar-left";

// Single component handles both horizontal (top/bottom) and vertical (left/right) layouts; complexity from shared nav data and two layout branches.
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: layout variants and shared nav config
export default function Sidebar({
	user: userProp,
	variant = DEFAULT_VARIANT,
}: SidebarProps) {
	const pathname = usePathname();
	const router = useRouter();
	const auth = useAuthOptional();
	const { colorScheme } = usePreferences();
	const user = userProp ?? auth?.user ?? null;
	const isRichColors: boolean = colorScheme === "rich";

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

	// Trattative group with expandable sub-pages (tutte, aperte, concluse, abbandonate)
	const trattativeGroup: NavigationGroup = {
		icon: SignatureIcon as IconComponent,
		label: "Trattative",
		children: [
			{
				icon: FolderOpen,
				label: "Tutte",
				href: "/trattative/tutte",
			},
			{
				// Per le trattative aperte riutilizziamo l'icona cartella aperta
				// per coerenza visiva con "Tutte".
				icon: FolderOpen,
				label: "Aperte",
				href: "/trattative/aperte",
			},
			{
				icon: AwardCertificate,
				label: "Concluse",
				href: "/trattative/concluse",
			},
			{
				icon: FileXmark,
				label: "Abbandonate",
				href: "/trattative/abbandonate",
			},
		],
	};

	// Doc: Admin non ha accesso a trattative/clienti (403). Solo Direttore Vendite e Venditore.
	const canSeeTrattative = auth?.role === "director" || auth?.role === "seller";
	const canSeeClienti = auth?.role === "director" || auth?.role === "seller";
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

	// Preferences dialog: open from footer "Preferenze" button
	const [preferencesOpen, setPreferencesOpen] = useState(false);

	const navFooter: FooterItem[] = [
		{
			icon: HelpIcon as IconComponent,
			label: "Supporto",
		},
		{
			icon: GearIcon as IconComponent,
			label: "Preferenze",
			onClick: () => setPreferencesOpen(true),
		},
	];

	function isActiveItem(itemHref: string): boolean {
		return pathname === itemHref;
	}

	// Role labels per api_documentaion.md: Admin, Direttore Vendite, Venditore
	function getRoleLabel(role: string | null | undefined): string {
		if (!role) {
			return "—";
		}
		if (role === "admin") {
			return "Admin";
		}
		if (role === "director") {
			return "Direttore Vendite";
		}
		if (role === "seller") {
			return "Venditore";
		}
		return role;
	}

	const isHorizontal = variant === "top" || variant === "bottom";

	// Horizontal bar (top or bottom): single row, compact nav with Trattative as dropdown
	if (isHorizontal) {
		return (
			<>
				<aside
					aria-label="Barra di navigazione"
					className={cn(
						"flex w-full shrink-0 items-center gap-6 px-4 py-3 font-medium",
						isRichColors
							? "bg-sidebar text-sidebar-foreground"
							: "bg-background"
					)}
				>
					{/* User block (compact) + bottone Esci (OpenRectArrowOutIcon) */}
					<div
						className={cn(
							"flex items-center gap-2 rounded-xl px-2 py-1.5 pl-1.5",
							isRichColors ? "bg-sidebar-accent/80" : "bg-muted/50"
						)}
					>
						<Avatar className="size-8 shrink-0 rounded-md!">
							<AvatarFallback
								className="rounded-md!"
								placeholderSeed={mounted ? (user?.email ?? "User") : undefined}
							/>
						</Avatar>
						{mounted && user && (
							<div className="flex min-w-0 flex-col truncate leading-none">
								<span
									className={cn(
										"truncate text-xs",
										isRichColors ? "text-sidebar-foreground" : "text-foreground"
									)}
								>
									{user.email}
								</span>
								<span
									className={cn(
										"truncate text-[10px]",
										isRichColors
											? "text-sidebar-secondary"
											: "text-muted-foreground"
									)}
								>
									{getRoleLabel(auth?.role ?? undefined)}
								</span>
							</div>
						)}
						<button
							aria-label="Esci"
							className={cn(
								"flex shrink-0 items-center justify-center rounded-lg p-1.5 focus:outline-none focus-visible:ring-2",
								isRichColors
									? "text-red-500 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-sidebar-ring"
									: "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring"
							)}
							onClick={() => void auth?.logout?.()}
							type="button"
						>
							<OpenRectArrowOutIcon className="size-5" />
						</button>
					</div>

					{/* Nav links in a row */}
					<nav
						aria-label="Navigazione principale"
						className="flex flex-1 items-center gap-1"
					>
						{flatNavItems
							.filter(
								(item) => item.href !== "/clienti" || (mounted && canSeeClienti)
							)
							.map((item) => (
								<Link
									className={cn(
										"flex items-center gap-2 rounded-lg px-3 py-2 text-sm leading-none",
										isRichColors
											? "text-sidebar-secondary hover:bg-sidebar-accent hover:text-sidebar-primary focus-visible:ring-sidebar-ring"
											: "text-muted-foreground hover:bg-muted hover:text-foreground",
										isActiveItem(item.href) &&
											(isRichColors
												? "bg-sidebar-accent text-sidebar-primary"
												: "bg-muted text-foreground")
									)}
									href={item.href as Parameters<typeof Link>[0]["href"]}
									key={item.href}
								>
									<item.icon size={20} />
									{item.label}
								</Link>
							))}
						{/* Trattative as dropdown when horizontal */}
						{mounted && canSeeTrattative && (
							<DropdownMenu>
								<DropdownMenuTrigger
									className={cn(
										"flex items-center gap-2 rounded-lg px-3 py-2 text-sm leading-none focus:outline-none focus-visible:ring-2",
										isRichColors
											? "text-sidebar-secondary hover:bg-sidebar-accent hover:text-sidebar-primary focus-visible:ring-sidebar-ring"
											: "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring",
										isTrattativePath &&
											(isRichColors
												? "bg-sidebar-accent text-sidebar-primary"
												: "bg-muted text-foreground")
									)}
								>
									<trattativeGroup.icon size={20} />
									{trattativeGroup.label}
									<ChevronDown aria-hidden className="size-3.5 opacity-70" />
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="start"
									side={variant === "top" ? "bottom" : "top"}
								>
									{trattativeGroup.children.map((child) => (
										<DropdownMenuItem
											className={cn(
												"flex cursor-pointer items-center gap-2",
												isActiveItem(child.href) && "bg-muted"
											)}
											key={child.href}
											onClick={() => router.push(child.href)}
										>
											<child.icon size={18} />
											{child.label}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</nav>

					{/* Footer actions in same row */}
					<div className="flex items-center gap-1">
						{navFooter.map((item) => (
							<button
								aria-label={item.label}
								className={cn(
									"flex items-center gap-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2",
									isRichColors
										? "text-sidebar-secondary hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-sidebar-ring"
										: "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring"
								)}
								key={item.label}
								onClick={item.onClick}
								type="button"
							>
								<item.icon size={20} />
								<span className="hidden sm:inline">{item.label}</span>
							</button>
						))}
					</div>
				</aside>
				<PreferencesDialog
					onOpenChange={setPreferencesOpen}
					open={preferencesOpen}
				/>
			</>
		);
	}

	// Vertical sidebar (left or right)
	return (
		<aside
			aria-label="Sidebar"
			className={cn(
				"h-full w-full min-w-60.5 flex-0 px-6.5 py-6 font-medium",
				variant === "sidebar-right" && ""
			)}
		>
			<div className="flex h-full flex-col justify-between">
				{/* Navigation */}

				<div className="flex flex-col gap-6 pt-2">
					<div className="flex items-center gap-3.5 rounded-xl bg-sidebar-accent/80 px-2 py-1.5 pl-1.5">
						<Avatar className="size-9 rounded-md! bg-background text-sidebar-primary">
							<AvatarFallback
								className="rounded-md! bg-background text-sidebar-primary"
								placeholderSeed={mounted ? (user?.email ?? "User") : undefined}
							/>
						</Avatar>
						<div className="flex min-w-0 flex-1 flex-col gap-1 truncate">
							{/* Defer user-dependent content until after mount to avoid hydration mismatch (auth from localStorage). */}
							{(() => {
								if (!mounted) {
									return <span className="truncate leading-none">User</span>;
								}
								if (user) {
									return (
										<>
											{/* Nome/email dell'utente: usiamo il colore primario della sidebar
											   per evidenziarlo rispetto al resto del testo mantenendo il contrasto
											   sia in tema chiaro che scuro. */}
											<span className="truncate text-sidebar-primary leading-none">
												{user.email}
											</span>
											<span className="truncate text-sidebar-secondary text-xs leading-none">
												{getRoleLabel(auth?.role ?? undefined)}
											</span>
										</>
									);
								}
								return <span className="truncate leading-none">User</span>;
							})()}
						</div>
						<button
							aria-label="Esci"
							className={cn(
								"flex shrink-0 items-center justify-center rounded-lg p-1.5 text-sidebar-secondary hover:bg-sidebar-accent hover:text-sidebar-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
								isRichColors ? "text-red-500" : "text-muted-foreground"
							)}
							onClick={() => void auth?.logout?.()}
							type="button"
						>
							<OpenRectArrowOutIcon className="size-5" />
						</button>
					</div>
					<div className="flex flex-col gap-2.5">
						{/* Flat nav items: Dashboard per tutti; Clienti solo per Direttore Vendite / Venditore (Admin riceve 403). */}
						{flatNavItems
							.filter(
								(item) => item.href !== "/clienti" || (mounted && canSeeClienti)
							)
							.map((item) => (
								<Link
									className={cn(
										"flex items-center gap-3.5 rounded-lg px-3 py-2 text-sidebar-secondary leading-none hover:bg-sidebar-accent hover:text-sidebar-primary",
										isActiveItem(item.href) &&
											"bg-sidebar-accent text-sidebar-primary"
									)}
									href={item.href as Parameters<typeof Link>[0]["href"]}
									key={item.href}
								>
									<item.icon size={24} />
									{item.label}
								</Link>
							))}
						{/* Trattative: solo Direttore Vendite e Venditore (Admin riceve 403 sulle API). */}
						{mounted && canSeeTrattative && (
							<div className="flex flex-col gap-1">
								<button
									aria-expanded={trattativeExpanded}
									aria-label={
										trattativeExpanded
											? "Chiudi sottomenu Trattative"
											: "Apri sottomenu Trattative"
									}
									className={cn(
										"flex w-full items-center gap-3.5 rounded-lg px-3 py-2 text-left text-sidebar-secondary leading-none hover:bg-sidebar-accent hover:text-sidebar-primary",
										isTrattativePath && "bg-sidebar-accent text-sidebar-primary"
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
								<AnimatePresence initial={false}>
									{trattativeExpanded && (
										<motion.div
											animate={{ opacity: 1, height: "auto" }}
											className="mt-1 ml-6 flex flex-col gap-2.5 overflow-hidden"
											exit={{ opacity: 0, height: 0 }}
											initial={{ opacity: 0, height: 0 }}
											transition={{
												duration: 0.18,
												ease: [0.25, 0.46, 0.45, 0.94],
											}}
										>
											{trattativeGroup.children.map((child, index) => (
												<motion.div
													animate={{ opacity: 1, x: 0 }}
													initial={{ opacity: 0, x: -8 }}
													key={child.href}
													transition={{
														delay: index * 0.025,
														duration: 0.14,
														ease: "easeOut",
													}}
												>
													<Link
														className={cn(
															"flex items-center gap-3.5 rounded-lg py-2 pl-3 text-sidebar-secondary leading-none hover:bg-sidebar-accent hover:text-sidebar-primary",
															isActiveItem(child.href) &&
																"border-sidebar-primary bg-sidebar-accent text-sidebar-primary"
														)}
														href={
															child.href as Parameters<typeof Link>[0]["href"]
														}
													>
														<child.icon size={24} />
														{child.label}
													</Link>
												</motion.div>
											))}
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						)}
					</div>
				</div>

				{/* Footer: Support, Logout, User */}
				<div className="flex flex-col gap-2.5 pb-2">
					{navFooter.map((item) => (
						<button
							className="flex cursor-pointer items-center gap-3.5 rounded-lg px-3 py-2 text-sidebar-secondary hover:bg-sidebar-accent hover:text-sidebar-primary"
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

			{/* Preferences dialog: theme, accent color, font style */}
			<PreferencesDialog
				onOpenChange={setPreferencesOpen}
				open={preferencesOpen}
			/>
		</aside>
	);
}
