"use client";

import { Building2, Users, UserCheck, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Loader from "@/components/loader";
import { listCompanies, listUsers } from "@/lib/api/client";
import type { ApiCompany, ApiUserAdmin } from "@/lib/api/types";
import { useAuthOptional } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

function StatCard({
	label,
	value,
	icon: Icon,
	iconBg,
	iconColor,
	valueClass,
}: {
	label: string;
	value: number;
	icon: React.ElementType;
	iconBg: string;
	iconColor: string;
	valueClass?: string;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-2xl bg-table-header px-3.75 py-4.25">
			<div className="flex items-center justify-between">
				<span className="text-xs font-semibold uppercase tracking-wider text-stats-title">
					{label}
				</span>
				<div className={cn("flex size-8 items-center justify-center rounded-xl", iconBg)}>
					<Icon className={cn("size-4", iconColor)} />
				</div>
			</div>
			<span className={cn("font-bold text-3xl tabular-nums", valueClass)}>{value}</span>
		</div>
	);
}

export default function AdminDashboardPage() {
	const auth = useAuthOptional();
	const router = useRouter();
	const [mounted, setMounted] = useState(false);
	const [users, setUsers] = useState<ApiUserAdmin[]>([]);
	const [companies, setCompanies] = useState<ApiCompany[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (auth?.isLoaded && !auth?.user) {
			router.replace("/login");
			return;
		}
		if (auth?.isLoaded && auth?.role !== "admin") {
			router.replace("/dashboard");
		}
	}, [auth?.isLoaded, auth?.user, auth?.role, router]);

	useEffect(() => {
		if (!auth?.token || auth?.role !== "admin") return;
		Promise.all([listUsers(auth.token), listCompanies(auth.token)]).then(
			([usersRes, companiesRes]) => {
				if ("data" in usersRes) setUsers(usersRes.data);
				if ("data" in companiesRes) setCompanies(companiesRes.data);
				setLoading(false);
			}
		);
	}, [auth?.token, auth?.role]);

	if (!mounted || !auth?.isLoaded) return <Loader />;
	if (!auth?.user || auth?.role !== "admin") return null;

	const activeUsers = users.filter((u) => !u.sospeso).length;
	const suspendedUsers = users.filter((u) => u.sospeso).length;
	const byRole = users.reduce<Record<string, number>>((acc, u) => {
		const name = u.role?.nome ?? "—";
		acc[name] = (acc[name] ?? 0) + 1;
		return acc;
	}, {});
	const maxRoleCount = Math.max(...Object.values(byRole), 1);

	return (
		<main className="m-2 flex h-dvh flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card pt-6 font-medium sm:m-2.5">
			<div className="shrink-0 px-6 pb-2 md:px-9">
				<h1 className="font-semibold text-2xl tracking-tight">Dashboard</h1>
				<p className="mt-0.5 text-muted-foreground text-sm">
					Panoramica del sistema
				</p>
			</div>

			<div className="table-container-bg flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-3xl">
				{loading ? (
					<div className="flex flex-1 items-center justify-center py-16">
						<Loader />
					</div>
				) : (
					<div className="flex-1 overflow-y-auto px-5.5 pt-5.5 pb-6">
						<div className="flex flex-col gap-4">
							{/* Stat cards */}
							<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
								<StatCard
									icon={Users}
									iconBg="bg-primary/10"
									iconColor="text-primary"
									label="Utenti totali"
									value={users.length}
								/>
								<StatCard
									icon={UserCheck}
									iconBg="bg-status-completed-background"
									iconColor="text-status-completed-accent"
									label="Attivi"
									value={activeUsers}
									valueClass="text-[color:var(--status-completed-accent)]"
								/>
								<StatCard
									icon={UserX}
									iconBg="bg-destructive/10"
									iconColor="text-destructive"
									label="Sospesi"
									value={suspendedUsers}
									valueClass="text-destructive"
								/>
								<StatCard
									icon={Building2}
									iconBg="bg-primary/10"
									iconColor="text-primary"
									label="Aziende"
									value={companies.length}
								/>
							</div>

							{/* Role breakdown */}
							<div className="rounded-2xl bg-table-header px-3.75 py-4.25">
								<h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stats-title">
									Utenti per ruolo
								</h2>
								<div className="flex flex-col gap-3.5">
									{Object.entries(byRole).map(([role, count]) => (
										<div key={role} className="flex flex-col gap-1.5">
											<div className="flex items-center justify-between">
												<span className="text-sm font-medium">{role}</span>
												<span className="tabular-nums text-sm font-semibold">
													{count}
												</span>
											</div>
											<div className="h-1.5 w-full overflow-hidden rounded-full bg-card">
												<div
													className="h-full rounded-full bg-primary transition-[width] duration-300"
													style={{
														width: `${(count / maxRoleCount) * 100}%`,
													}}
												/>
											</div>
										</div>
									))}
									{Object.keys(byRole).length === 0 && (
										<span className="text-muted-foreground text-sm">
											Nessun utente trovato
										</span>
									)}
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</main>
	);
}
