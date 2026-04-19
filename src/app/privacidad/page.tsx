import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Politica de privacidad",
  description: "Politica de privacidad de Zyteron.",
  path: "/privacidad",
});

export default function PrivacidadPage() {
  return (
    <main className="bg-white py-16">
      <Container className="max-w-3xl space-y-6">
        <h1 className="text-3xl font-extrabold text-slate-900">Politica de privacidad</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          En Zyteron recopilamos solo los datos necesarios para responder solicitudes comerciales y
          entregar nuestros servicios. No vendemos informacion personal a terceros.
        </p>
        <h2 className="text-xl font-bold text-slate-900">Datos que podemos solicitar</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Nombre, correo, telefono, empresa y detalles del proyecto enviados mediante formularios o
          canales de contacto.
        </p>
        <h2 className="text-xl font-bold text-slate-900">Uso de la informacion</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Utilizamos la informacion para responder cotizaciones, coordinar reuniones, ejecutar
          proyectos y mejorar la experiencia del sitio.
        </p>
        <h2 className="text-xl font-bold text-slate-900">Contacto</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Para consultas sobre privacidad, escribenos a eduardo.avila@zyteron.cl.
        </p>
      </Container>
    </main>
  );
}
