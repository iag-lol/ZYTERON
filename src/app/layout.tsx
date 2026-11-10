import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
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
import { PublicAnalytics } from "@/components/analytics/public-analytics";
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

// Tipografía del sitio público (scope .public-site). Admin y portal siguen con Geist.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  preload: true,
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.legalName, url: siteConfig.url }],
  creator: siteConfig.legalName,
  publisher: siteConfig.legalName,
  category: "technology",
  title: {
    default: "Desarrollo de Software y Soluciones Digitales en Chile | Zyteron",
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
    title: "Desarrollo de Software y Soluciones Digitales en Chile | Zyteron",
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: buildPrimaryOgImageUrl(),
        width: 1200,
        height: 630,
        alt: "Zyteron - Software y soluciones digitales a medida",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Desarrollo de Software y Soluciones Digitales en Chile | Zyteron",
    description: siteConfig.description,
    images: [
      {
        url: buildPrimaryOgImageUrl(),
        alt: "Zyteron - Software y soluciones digitales a medida",
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
    <html lang="es-CL" className={cn(
        geistSans.variable,
        geistMono.variable,
        plexSans.variable,
        plexMono.variable,
        "h-full antialiased",
      )}>
      <head></head>
      <body className="min-h-full bg-white text-slate-900">
        <TooltipProvider>
          <IconSprite />
          <JsonLd id="zyteron-organization-schema" data={buildOrganizationGraph()} />
          <PwaRegister />
          <PublicAnalytics />
          <AppShell header={<SiteHeader />} footer={<SiteFooter />}>
            {children}
          </AppShell>
        </TooltipProvider>
      </body>
    </html>
  );
}
