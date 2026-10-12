import type { Metadata } from "next";
import "@/components/client-experience/experience.css";
import "@/components/connected-portal/connected.css";

export const metadata: Metadata = {
  title: { default: "Portal Cliente · Zyteron", template: "%s · Zyteron" },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function PortalClientesRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="zy-experience">{children}</div>;
}
