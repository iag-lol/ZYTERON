import type { Metadata } from "next";
import { CommercialHub } from "@/components/admin/commercial-hub";

export const metadata: Metadata = {
  title: "Comercial · Partners · Zyteron Admin",
  robots: { index: false, follow: false },
};

export default async function ComercialPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const query = await searchParams;
  return <CommercialHub initialTab={query?.tab} />;
}
