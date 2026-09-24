import type { Metadata } from "next";
import { IBM_Plex_Mono, Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://charoofbot.vercel.app"),
  applicationName: "GCBot",
  title: {
    default: "GCBot",
    template: "%s · GCBot",
  },
  description:
    "GCBot, a GradedCalls product. The GC Scale reads authenticity: higher means more trustworthy. Fixture corpus and a paste bench. No API keys.",
  robots: "noindex",
  openGraph: {
    title: { absolute: "GCBot · GradedCalls" },
    siteName: "GradedCalls",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <a href="#content" className="skip">
          Skip to content
        </a>
        <Suspense fallback={<div className="h-14 border-b border-rule" />}>
          <SiteHeader />
        </Suspense>
        <main id="content" className="mx-auto w-full min-w-0 max-w-6xl flex-1 overflow-x-clip px-5 py-8 md:px-8">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
