import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteConfig } from "@/config/site";
import { RootProviders } from "@/components/root-providers";
import { AppShell } from "@/components/layout/app-shell";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Zyteron | Soluciones web y tecnología para empresas",
    template: "%s | Zyteron",
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    title: "Zyteron | Soluciones web y tecnología para empresas",
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title: "Zyteron | Soluciones web y tecnología para empresas",
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={cn(geistSans.variable, geistMono.variable, "antialiased h-full")}
    >
      <body className="min-h-full bg-white text-slate-900">
        <TooltipProvider>
          <RootProviders>
            <AppShell>{children}</AppShell>
          </RootProviders>
        </TooltipProvider>
      </body>
    </html>
  );
}
