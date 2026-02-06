import "@/styles/globals.css";

import { type Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";

import Providers from "@/components/providers";
import Script from "next/script";
import LayoutContent from "@/components/layout-content";
import { Suspense } from "react";
import Loader from "@/components/loader";

export const metadata: Metadata = {
  title: "Nuova interfaccia",
  description: "Nuova interfaccia",
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
      lang="en"
      className={`${inter.variable} ${sfProRounded.variable} font-sf-pro-rounded h-full overflow-hidden`}
      suppressHydrationWarning
    >
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
            data-enabled="true"
          />
        )}
      </head>
      <body className="h-full overflow-hidden">
        <Providers>
          <Suspense fallback={<Loader />}>
            <LayoutContent>{children}</LayoutContent>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
