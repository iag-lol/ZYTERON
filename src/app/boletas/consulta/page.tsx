import type { Metadata } from "next";
import BoletaLookup from "./lookup";
export const metadata: Metadata = {
  title: "Consulta de boletas",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function BoletaLookupPage() {
  return <BoletaLookup />;
}
