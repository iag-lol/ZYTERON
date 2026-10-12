import { notFound } from "next/navigation";
import { ConnectedControlView } from "@/components/connected-control/view";
const allowed = new Set([
  "inicio",
  "clientes",
  "contactos",
  "cotizaciones",
  "entradas",
  "proyectos",
  "finanzas",
  "documentos",
  "servicios",
  "agenda",
  "conversaciones",
  "asistencia",
  "actividad",
  "auditoria",
]);
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ id?: string; buscar?: string; accion?: string }>;
}) {
  const p = await params,
    q = await searchParams,
    s = p.section?.[0] || "inicio";
  if (!allowed.has(s) || (p.section?.length || 0) > 1) notFound();
  return (
    <ConnectedControlView
      section={s}
      id={q.id || ""}
      search={q.buscar || ""}
      action={
        q.accion === "nuevo" && ["clientes", "cotizaciones", "proyectos"].includes(s) ? "nuevo" : ""
      }
    />
  );
}
