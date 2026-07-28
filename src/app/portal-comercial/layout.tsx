import { requireCommercialUser } from "@/lib/commercial/session";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  executive: "Ejecutivo comercial",
  portfolio: "Gestor de cartera",
  partner: "Partner / Referidor",
};

export default async function PortalComercialLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCommercialUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-[13px] font-extrabold text-white">
              {user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
            </span>
            <div className="leading-tight">
              <p className="text-[13px] font-bold text-slate-900">{user.name}</p>
              <p className="text-[11px] text-slate-400">{ROLE_LABEL[user.role] ?? user.role} · {user.rut}</p>
            </div>
          </div>
          <form action="/api/comercial/logout" method="post">
            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-50">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
