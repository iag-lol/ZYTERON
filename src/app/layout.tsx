import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { analyticsConfig } from "@/config/analytics";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteConfig } from "@/config/site";
import { AppShell } from "@/components/layout/app-shell";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { JsonLd } from "@/components/seo/json-ld";
import { IconSprite } from "@/components/ui/icon-sprite";
import { PwaRegister } from "@/components/pwa-register";
import { buildOrganizationGraph, buildPrimaryOgImageUrl } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.legalName, url: siteConfig.url }],
  creator: siteConfig.legalName,
  publisher: siteConfig.legalName,
  category: "technology",
  title: {
    default: "Zyteron | Desarrollo web y sistemas para empresas en Santiago y Chile",
    template: "%s | Zyteron",
  },
  description: siteConfig.description,
  alternates: {
    canonical: siteConfig.url,
    types: {
      "application/rss+xml": `${siteConfig.url}/rss.xml`,
    },
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale.replace("-", "_"),
    url: siteConfig.url,
    title: "Zyteron | Desarrollo web y sistemas para empresas en Santiago y Chile",
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: buildPrimaryOgImageUrl(),
        width: 1200,
        height: 630,
        alt: "Zyteron - Desarrollo web, sistemas y soporte TI para empresas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zyteron | Desarrollo web y sistemas para empresas en Santiago y Chile",
    description: siteConfig.description,
    images: [
      {
        url: buildPrimaryOgImageUrl(),
        alt: "Zyteron - Desarrollo web, sistemas y soporte TI para empresas",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  verification: analyticsConfig.googleSiteVerification
    ? {
        google: analyticsConfig.googleSiteVerification,
      }
    : undefined,
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: ["/logo.svg"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zyteron",
  },
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CL" className={cn(geistSans.variable, geistMono.variable, "h-full antialiased")}>
      <head></head>
      <body className="min-h-full bg-white text-slate-900">
        <TooltipProvider>
          <IconSprite />
          <JsonLd id="zyteron-organization-schema" data={buildOrganizationGraph()} />
          <PwaRegister />
          <AppShell header={<SiteHeader />} footer={<SiteFooter />}>
            {children}
          </AppShell>
        </TooltipProvider>
      </body>
    </html>
  );
}
