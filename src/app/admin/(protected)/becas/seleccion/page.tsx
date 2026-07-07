import { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ClipboardCheck, Trophy, Users } from "lucide-react";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import { BecasHeader } from "../_components/becas-nav";
import { ScholarshipStatusBadge } from "../_components/status-badge";

export const metadata: Metadata = {
  title: "Selección | Becas Web Pyme",
};

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

type WinnerRow = {
  id: string;
  acceptance_status: string;
  created_at: string;
  application: { business_name: string; full_name?: string } | null;
};

const SELECTION_STEPS = [
  {
    icon: <Users className="h-4 w-4" />,
    title: "Validar postulaciones",
    description: "Revisa y valida las postulaciones elegibles en Participantes.",
  },
  {
    icon: <ClipboardCheck className="h-4 w-4" />,
    title: "Evaluar y preseleccionar",
    description: "Aplica los criterios de selección definidos en las bases de la campaña.",
  },
  {
    icon: <Trophy className="h-4 w-4" />,
    title: "Formalizar al ganador",
    description: "Registra al ganador, gestiona su aceptación y el acuerdo firmado.",
  },
  {
    icon: <CheckCircle2 className="h-4 w-4" />,
    title: "Publicar resultados",
    description: "Anuncia el resultado según la fecha comprometida en las bases.",
  },
];

export default async function AdminSeleccionPage() {
  const supabase = getBecasSupabaseClient();
  const { data } = await supabase
    .from("scholarship_winners")
    .select("id, acceptance_status, created_at, application:scholarship_applications(business_name, full_name)")
    .order("created_at", { ascending: false });

  const winners = (data as unknown as WinnerRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <BecasHeader
        active="seleccion"
        title="Selección y ganadores"
        description="Formaliza a los ganadores de cada campaña y gestiona su aceptación."
      />

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Ganadores registrados</h2>

          {winners.length > 0 ? (
            <div className="space-y-3">
              {winners.map((winner) => (
                <div
                  key={winner.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {winner.application?.business_name ?? "Postulación sin nombre"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {winner.application?.full_name ? `${winner.application.full_name} · ` : ""}
                        Registrado {dateFmt.format(new Date(winner.created_at))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-400">Aceptación:</span>
                    <ScholarshipStatusBadge status={winner.acceptance_status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <Trophy className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-600">
                Aún no se formaliza ningún ganador
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Cuando el proceso de evaluación termine, el ganador seleccionado aparecerá aquí con
                su estado de aceptación y acuerdo.
              </p>
              <Link
                href="/admin/becas/participantes?estado=validated"
                className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500"
              >
                Revisar postulaciones validadas
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Flujo de selección</h2>
          <ol className="space-y-4">
            {SELECTION_STEPS.map((step, idx) => (
              <li key={step.title} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  {step.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    <span className="mr-1.5 text-xs font-extrabold text-blue-600">{idx + 1}.</span>
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
