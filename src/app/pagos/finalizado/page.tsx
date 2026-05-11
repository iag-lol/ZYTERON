import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, CreditCard } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

function resolveStatus(flowStatus: number, mode: string) {
  if (mode === "subscription" && flowStatus >= 1) {
    return {
      title: "Suscripción procesada",
      description:
        "La activación de suscripción fue procesada. Verifica tu correo para confirmación y próximos pasos.",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
      icon: CheckCircle2,
    };
  }

  if (flowStatus === 2) {
    return {
      title: "Pago aprobado",
      description: "Tu pago fue confirmado correctamente.",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
      icon: CheckCircle2,
    };
  }

  if (flowStatus === 3 || flowStatus === 4) {
    return {
      title: "Pago rechazado o anulado",
      description: "Puedes intentar nuevamente o solicitar apoyo por WhatsApp.",
      tone: "border-rose-200 bg-rose-50 text-rose-900",
      icon: AlertTriangle,
    };
  }

  return {
    title: "Estado en validación",
    description: "Estamos validando el resultado de tu operación.",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    icon: Clock3,
  };
}

export default async function PaymentFinalizedPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const mode = typeof params.mode === "string" ? params.mode : "service";
  const flowStatus = Number.parseInt(typeof params.flowStatus === "string" ? params.flowStatus : "0", 10);
  const flowLabel = typeof params.flowLabel === "string" ? params.flowLabel : "";
  const order = typeof params.order === "string" ? params.order : "";
  const message = typeof params.message === "string" ? params.message : "";

  const status = resolveStatus(Number.isFinite(flowStatus) ? flowStatus : 0, mode);
  const Icon = status.icon;

  return (
    <main className="bg-slate-50 py-16">
      <Container className="max-w-3xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className={`rounded-2xl border p-5 ${status.tone}`}>
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-6 w-6" />
              <div>
                <h1 className="text-2xl font-extrabold">{status.title}</h1>
                <p className="mt-2 text-sm">{status.description}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Operación</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{order || "Sin identificador"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Estado</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-900">
                <CreditCard className="h-4 w-4 text-blue-700" />
                {flowLabel || "Sin estado"} ({Number.isFinite(flowStatus) ? flowStatus : 0})
              </p>
            </div>
          </div>

          {message ? (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">{message}</div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="bg-blue-700 text-white hover:bg-blue-800">
              <Link href="/planes">Volver a planes</Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/paquetes">Volver al cotizador</Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/contacto">Contactar soporte</Link>
            </Button>
          </div>
        </div>
      </Container>
    </main>
  );
}
