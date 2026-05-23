import { BadgeCheck, Mail, Shield } from "lucide-react";
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

export default async function PortalPerfilPage() {
  const session = await requirePortalSession();
  const user = await prisma.user.findUnique({
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
    },
  });
  if (!user) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-900">Mi perfil</h2>
        <p className="mt-1 text-sm text-slate-600">
          Administra tus datos básicos y seguridad de acceso al portal.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Correo</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Mail className="h-4 w-4 text-blue-700" />
              {user.email}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Verificación</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
              <BadgeCheck className="h-4 w-4" />
              {user.emailVerifiedAt ? "Verificado" : "Pendiente"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Estado cuenta</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Shield className="h-4 w-4 text-blue-700" />
              {user.accountStatus}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
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
    </div>
  );
}

