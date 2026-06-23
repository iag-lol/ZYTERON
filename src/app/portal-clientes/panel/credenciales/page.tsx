import Link from "next/link";
import { AlertTriangle, ExternalLink, KeyRound, Lock, Shield, ShieldCheck } from "lucide-react";
import { CredentialSecretDisplay } from "@/components/portal/panel/credential-secret-display";
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

  const sensitiveCount = snapshot.credentials.filter((c) => c.isSensitive).length;

  return (
    <section className="space-y-4">
      <div className="portal-card-premium p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Credenciales y accesos</h2>
            <p className="mt-1 text-sm text-slate-600">
              Información de acceso asociada a tus proyectos, protegida con cifrado AES-256 y auditada.
            </p>
          </div>
          <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
            <Lock className="h-5 w-5 text-blue-700" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            Cada acceso queda registrado en auditoría
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
            <Shield className="h-3 w-3" />
            {snapshot.credentials.length} credenciales · {sensitiveCount} sensibles
          </span>
        </div>
      </div>

      {snapshot.credentials.length === 0 ? (
        <div className="portal-card-premium p-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Sin credenciales</p>
          <p className="mt-1 text-xs text-slate-500">
            No tienes credenciales registradas en este momento.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.credentials.map((credential) => (
            <article key={credential.id} className="portal-card-premium overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{credential.serviceName}</p>
                      <p className="text-xs text-slate-500">
                        {credential.project?.title || "Sin proyecto vinculado"}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                    credential.isSensitive
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}>
                    {credential.isSensitive ? "🔒 Sensible" : "General"}
                  </span>
                </div>

                <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Usuario</span>
                    <span className="font-mono text-slate-600">{credential.username || "—"}</span>
                  </div>
                  {/* The secret row is now handled completely by CredentialSecretDisplay */}
                  <CredentialSecretDisplay 
                    credentialId={credential.id}
                    secretMasked={credential.secretMasked}
                  />
                  {credential.url ? (
                    <Link
                      href={credential.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 transition"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ir al servicio
                    </Link>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[11px] text-slate-400">
                    Actualizado: {formatDate(credential.updatedAt)}
                  </p>
                </div>
              </div>

              {/* Security indicator */}
              <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                <Shield className="h-3 w-3" />
                Cifrado AES-256-GCM · Acceso auditado
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
