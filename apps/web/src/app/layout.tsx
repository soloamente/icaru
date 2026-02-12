import "@/styles/globals.css";
import "dialkit/styles.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { Suspense } from "react";
import LayoutContent from "@/components/layout-content";
import Loader from "@/components/loader";
import Providers from "@/components/providers";

export const metadata: Metadata = {
	title: "ICARU",
	description: "ICARU",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const sfProRounded = localFont({
	variable: "--font-sf-pro-rounded",
	src: [
		{
			path: "../../public/fonts/SF Pro/SF-Pro-Rounded-Ultralight.otf",
			weight: "100",
		},
		{
			path: "../../public/fonts/SF Pro/SF-Pro-Rounded-Thin.otf",
			weight: "200",
		},
		{
			path: "../../public/fonts/SF Pro/SF-Pro-Rounded-Light.otf",
			weight: "300",
		},
		{
			path: "../../public/fonts/SF Pro/SF-Pro-Rounded-Regular.otf",
			weight: "400",
		},
		{
			path: "../../public/fonts/SF Pro/SF-Pro-Rounded-Medium.otf",
			weight: "500",
		},
		{
			path: "../../public/fonts/SF Pro/SF-Pro-Rounded-Semibold.otf",
			weight: "600",
		},
		{
			path: "../../public/fonts/SF Pro/SF-Pro-Rounded-Bold.otf",
			weight: "700",
		},
		{
			path: "../../public/fonts/SF Pro/SF-Pro-Rounded-Heavy.otf",
			weight: "800",
		},
		{
			path: "../../public/fonts/SF Pro/SF-Pro-Rounded-Black.otf",
			weight: "900",
		},
	],
	display: "swap",
});
const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html
			className={`${inter.variable} ${sfProRounded.variable} h-full overflow-hidden font-sf-pro-rounded`}
			lang="en"
			suppressHydrationWarning
		>
			<head>
				{process.env.NODE_ENV === "development" && (
					<Script
						crossOrigin="anonymous"
						data-enabled="true"
						src="//unpkg.com/react-grab/dist/index.global.js"
						strategy="beforeInteractive"
					/>
				)}
			</head>
			<body className="h-full overflow-hidden">
				<Providers>
					{/* Keep the main app shell (sidebar + content chrome) visible while
					 * routes and data are loading so the Loader appears inside the same
					 * containers as normal page content, instead of as a bare full-screen
					 * spinner on the raw background.
					 */}
					<Suspense
						fallback={
							<LayoutContent>
								{/* Generic page chrome: mirrors the main app pages so that
								 * when a route is streaming or being code-split, the user
								 * still sees the usual card + table-container background
								 * with the spinner centered inside.
								 */}
								<main className="m-2.5 flex flex-1 flex-col gap-2.5 overflow-hidden rounded-3xl bg-card px-9 pt-6 font-medium">
									<div className="table-container-bg flex min-h-0 flex-1 flex-col items-center overflow-auto rounded-t-3xl px-5.5 pt-6.25">
										<Loader />
									</div>
								</main>
							</LayoutContent>
						}
					>
						<LayoutContent>{children}</LayoutContent>
					</Suspense>
				</Providers>
			</body>
		</html>
	);
}
