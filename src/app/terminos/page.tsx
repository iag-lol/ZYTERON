import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Terminos y condiciones",
  description: "Terminos y condiciones de Zyteron.",
  path: "/terminos",
});

export default function TerminosPage() {
  return (
    <main className="bg-white py-16">
      <Container className="max-w-3xl space-y-6">
        <h1 className="text-3xl font-extrabold text-slate-900">Terminos y condiciones</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          Al contratar servicios de Zyteron, ambas partes acuerdan alcance, plazos y entregables por
          escrito antes de iniciar el proyecto.
        </p>
        <h2 className="text-xl font-bold text-slate-900">Alcance y cambios</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Todo cambio fuera del alcance original se evalua y cotiza por separado para mantener control
          de calidad y fechas comprometidas.
        </p>
        <h2 className="text-xl font-bold text-slate-900">Propiedad intelectual</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          El cliente conserva propiedad sobre sus contenidos y marca. El codigo y entregables se
          transfieren segun lo pactado en la propuesta comercial.
        </p>
        <h2 className="text-xl font-bold text-slate-900">Soporte</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Cada proyecto incluye soporte inicial. Servicios de mantencion continua se contratan en plan
          mensual aparte.
        </p>
      </Container>
    </main>
  );
}
