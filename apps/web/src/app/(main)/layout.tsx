"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthOptional } from "@/lib/auth/auth-context";

/**
 * Guard layout for all (main) pages.
 * If the user has primo_accesso = true (first login), redirect to /change-password
 * and block access to all app pages until the password is changed.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
	const auth = useAuthOptional();
	const router = useRouter();

	const mustChange =
		auth?.isLoaded &&
		auth.user &&
		(auth.user.primo_accesso === true || auth.user.primo_accesso === 1);

	useEffect(() => {
		if (mustChange) {
			router.replace("/change-password");
		}
	}, [mustChange, router]);

	if (mustChange) return null;

	return <>{children}</>;
}
