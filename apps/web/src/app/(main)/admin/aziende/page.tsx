"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminCompaniesTable from "@/components/admin-companies-table";
import Loader from "@/components/loader";
import { useAuthOptional } from "@/lib/auth/auth-context";

export default function AdminAziendePage() {
	const auth = useAuthOptional();
	const router = useRouter();
	const [mounted, setMounted] = useState(false);

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

	if (!mounted || !auth?.isLoaded) return <Loader />;
	if (!auth?.user || auth?.role !== "admin") return null;

	return <AdminCompaniesTable />;
}
