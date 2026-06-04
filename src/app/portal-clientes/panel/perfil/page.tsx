import { Activity, BadgeCheck, Clock, Key, LogIn, Mail, Shield, ShieldCheck, UserRound } from "lucide-react";
import { ProfileSettingsForm } from "@/components/portal/panel/profile-settings-form";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { prisma } from "@/lib/prisma";

function formatDate(value?: Date | null) {
  if (!value) return "—";
  return value.toLocaleString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Justo ahora";
  if (minutes < 60) return `Hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days}d`;
  return formatDate(date);
}

function getAuditActionLabel(action: string) {
  const map: Record<string, string> = {
    SUPPORT_TICKET_CREATED: "Creó ticket de soporte",
    PORTAL_REQUEST_CREATED: "Creó solicitud",
    COMMUNICATION_SENT: "Envió comunicación",
    CREDENTIAL_REVEAL: "Reveló credencial",
    PROFILE_UPDATED: "Actualizó perfil",
    PASSWORD_CHANGED: "Cambió contraseña",
    ADMIN_COMMUNICATION_SENT: "Recibió comunicación de Zyteron",
    ADMIN_NOTIFICATION_SENT: "Recibió notificación de Zyteron",
  };
  return map[action] || action;
}

export default async function PortalPerfilPage() {
  const session = await requirePortalSession();
  const [user, auditLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        company: true,
        phone: true,
        emailVerifiedAt: true,
        createdAt: true,
        lastLoginAt: true,
        accountStatus: true,
        authProvider: true,
      },
    }),
    prisma.clientAuditLog.findMany({
      where: { targetUserId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, action: true, entityType: true, createdAt: true },
    }),
  ]);
  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <section className="portal-card-premium p-5">
        <h2 className="text-lg font-extrabold text-slate-900">Mi perfil</h2>
        <p className="mt-1 text-sm text-slate-600">
          Administra tus datos básicos y seguridad de acceso al portal.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Correo</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Mail className="h-4 w-4 text-blue-700" />
              {user.email}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Verificación</p>
            <p className={`mt-1 flex items-center gap-1.5 text-sm font-semibold ${user.emailVerifiedAt ? "text-emerald-700" : "text-amber-700"}`}>
              <BadgeCheck className={`h-4 w-4 ${user.emailVerifiedAt ? "animate-pulse-badge" : ""}`} />
              {user.emailVerifiedAt ? "Verificado" : "Pendiente"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Estado cuenta</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Shield className="h-4 w-4 text-blue-700" />
              {user.accountStatus}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Último acceso</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(user.lastLoginAt)}</p>
          </div>
        </div>
      </section>

      <ProfileSettingsForm
        initial={{
          firstName: user.firstName || user.name.split(" ")[0] || "",
          lastName: user.lastName || user.name.split(" ").slice(1).join(" ") || "",
          company: user.company || "",
          phone: user.phone || "",
        }}
      />

      {/* Security Section */}
      <section className="portal-card-premium overflow-hidden">
        <div className="portal-hero-gradient px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-200" />
            <h3 className="text-base font-bold text-white">Seguridad de tu cuenta</h3>
          </div>
          <p className="mt-1 text-xs text-blue-200/80">
            Tu información está protegida por múltiples capas de seguridad.
          </p>
        </div>
        <div className="p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <LogIn className="h-4 w-4 text-blue-600" />
                Método de acceso
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {user.authProvider === "GOOGLE" ? "Google OAuth 2.0" : "Credenciales locales (bcrypt)"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Clock className="h-4 w-4 text-blue-600" />
                Sesión activa
              </div>
              <p className="mt-1 text-xs text-slate-500">
                JWT con expiración 12 horas · Validación por middleware
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Key className="h-4 w-4 text-blue-600" />
                Cifrado
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Credenciales: AES-256-GCM · Contraseña: bcrypt 12 rounds
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <UserRound className="h-4 w-4 text-blue-600" />
                Aislamiento de datos
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Cada consulta filtra por tu userId — imposible ver datos de otro cliente
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
                Verificación email
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {user.emailVerifiedAt ? `Verificado el ${formatDate(user.emailVerifiedAt)}` : "Pendiente de verificación"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Activity className="h-4 w-4 text-blue-600" />
                Auditoría
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Todas tus acciones quedan registradas en un log inmutable
              </p>
            </div>
          </div>

          {/* Activity Log */}
          <div className="mt-5">
            <h4 className="text-sm font-bold text-slate-900">Actividad reciente de tu cuenta</h4>
            <div className="mt-3 space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
                      <Activity className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{getAuditActionLabel(log.action)}</p>
                      <p className="text-[11px] text-slate-500">{log.entityType}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400">{timeAgo(log.createdAt)}</span>
                </div>
              ))}
              {auditLogs.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-4">Sin actividad registrada.</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
