import type { Metadata } from "next";
import { CommercialUsersManager } from "@/components/admin/commercial-users-manager";

export const metadata: Metadata = {
  title: "Comercial · Partners · Zyteron Admin",
  robots: { index: false, follow: false },
};

export default function ComercialPage() {
  return <CommercialUsersManager />;
}
