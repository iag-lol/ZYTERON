import type { Metadata } from "next";
import { DteModule } from "@/components/admin/dte/dte-module";

export const metadata: Metadata = {
  title: "Facturación Electrónica · Zyteron Admin",
  robots: { index: false, follow: false },
};

export default function FacturacionPage() {
  return <DteModule />;
}
