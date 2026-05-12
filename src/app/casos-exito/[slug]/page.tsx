import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo";

type CaseDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: CaseDetailProps): Promise<Metadata> {
  const { slug } = await params;
  return createPageMetadata({
    title: "Caso no disponible",
    description: "El caso solicitado no está disponible.",
    path: `/casos-exito/${slug}`,
    noIndex: true,
  });
}

export default async function CaseDetailPage({ params }: CaseDetailProps) {
  await params;
  redirect("/productos");
}
