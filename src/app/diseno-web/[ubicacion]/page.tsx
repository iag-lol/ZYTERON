import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalServiceLanding } from "@/components/services/local-service-landing";
import { getUbicacionBySlug, ubicaciones } from "@/data/ubicaciones";
import { buildLocalServicePageModel, localServiceDefinitions } from "@/lib/local-service-pages";
import { createPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ ubicacion: string }>;
};

export function generateStaticParams() {
  return ubicaciones.map((ubicacion) => ({ ubicacion: ubicacion.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ubicacion } = await params;
  const city = getUbicacionBySlug(ubicacion);
  if (!city) {
    return createPageMetadata({
      title: "Ubicación no encontrada",
      description: "La landing local solicitada no existe.",
      path: `/diseno-web/${ubicacion}`,
      noIndex: true,
    });
  }

  const page = buildLocalServicePageModel(localServiceDefinitions["diseno-web"], city);
  return createPageMetadata({
    title: page.metaTitle,
    description: page.metaDescription,
    path: page.path,
  });
}

export default async function DisenoWebUbicacionPage({ params }: Props) {
  const { ubicacion } = await params;
  const city = getUbicacionBySlug(ubicacion);
  if (!city) notFound();
  const page = buildLocalServicePageModel(localServiceDefinitions["diseno-web"], city);
  return <LocalServiceLanding page={page} />;
}
