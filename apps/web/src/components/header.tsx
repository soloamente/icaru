"use client";

import Link from "next/link";
import { useState } from "react";

import { useAuthOptional } from "@/lib/auth/auth-context";

import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";

export default function Header() {
	const auth = useAuthOptional();

	const links = [{ to: "/", label: "Home" }] as const;

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					{links.map(({ to, label }) => {
						return (
							<Link href={to} key={to}>
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="flex items-center gap-2">
					{auth?.isLoaded && !auth?.user && (
						<Link href="/login">
							<Button size="sm" variant="outline">
								Accedi
							</Button>
						</Link>
					)}
					{auth?.isLoaded && auth?.user && (
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<span className="hidden sm:inline">{auth.user.email}</span>
							<span className="rounded bg-muted px-1.5 py-0.5 text-xs capitalize">
								{auth.role ?? "—"}
							</span>
							<LogoutButton />
						</div>
					)}
					<ModeToggle />
				</div>
			</div>
			<hr />
		</div>
	);
}

function LogoutButton() {
	const auth = useAuthOptional();
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	const handleLogout = async () => {
		if (!auth?.logout || isLoggingOut) {
			return;
		}
		setIsLoggingOut(true);
		await auth.logout();
		setIsLoggingOut(false);
	};

	return (
		<Button
			aria-label="Esci"
			disabled={isLoggingOut}
			onClick={() => {
				handleLogout();
			}}
			size="sm"
			variant="ghost"
		>
			{isLoggingOut ? "..." : "Esci"}
		</Button>
	);
}
