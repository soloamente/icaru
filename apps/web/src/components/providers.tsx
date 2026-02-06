"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { AuthProvider } from "@/lib/auth/auth-context";
import { queryClient } from "@/utils/trpc";

import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			disableTransitionOnChange
			enableSystem
		>
			<QueryClientProvider client={queryClient}>
				<AuthProvider>
					{children}
					<ReactQueryDevtools />
				</AuthProvider>
			</QueryClientProvider>
			<Toaster richColors />
		</ThemeProvider>
	);
}
