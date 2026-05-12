import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Casos de éxito",
  description: "Sección de casos de éxito de ZYTERON.",
  path: "/casos-exito",
  noIndex: true,
});

export default function CasosExitoPage() {
  redirect("/productos");
}
