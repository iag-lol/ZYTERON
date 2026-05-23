import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { CredentialRevealButton } from "@/components/portal/panel/credential-reveal-button";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { getClientPortalSnapshot } from "@/lib/portal/data";

function formatDate(value: Date) {
  return value.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function PortalCredencialesPage() {
  const session = await requirePortalSession();
  const snapshot = await getClientPortalSnapshot(session.user.id);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-900">Credenciales y accesos</h2>
        <p className="mt-1 text-sm text-slate-600">
          Información de acceso asociada a tus proyectos, protegida y auditada.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          El acceso a secretos se registra en auditoría.
        </div>
      </div>

      {snapshot.credentials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500">
          <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          No tienes credenciales registradas en este momento.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.credentials.map((credential) => (
            <article key={credential.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{credential.serviceName}</p>
                  <p className="text-xs text-slate-500">
                    {credential.project?.title || "Sin proyecto vinculado"}
                  </p>
                </div>
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  {credential.isSensitive ? "Sensible" : "General"}
                </span>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                <p>
                  <span className="font-semibold">Usuario:</span> {credential.username || "—"}
                </p>
                <p>
                  <span className="font-semibold">Secreto:</span> {credential.secretMasked || "No registrado"}
                </p>
                {credential.url ? (
                  <Link
                    href={credential.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex font-semibold text-blue-700 hover:text-blue-800"
                  >
                    Ir al servicio
                  </Link>
                ) : null}
                <p className="text-[11px] text-slate-500">Actualizado: {formatDate(credential.updatedAt)}</p>
              </div>
              {credential.secretMasked ? <div className="mt-3"><CredentialRevealButton credentialId={credential.id} /></div> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

