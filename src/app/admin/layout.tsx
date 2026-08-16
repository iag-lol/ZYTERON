import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  // El admin conserva su manifest instalable propio (start_url /admin);
  // el resto del sitio usa /site.webmanifest.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    title: "Zyteron Admin",
  },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
