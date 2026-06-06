import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const isProd = process.env.NODE_ENV === "production";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <div className="ml-64 flex min-h-screen flex-1 flex-col">
          <AdminTopbar isProd={isProd} />

          <main className="flex-1 px-5 py-7 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-[1600px]">{children}</div>
          </main>

          <footer className="border-t border-slate-200 bg-white px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[11px] text-slate-400">
                Zyteron Admin Panel · Datos en tiempo real vía Supabase
              </p>
              <p className="text-[11px] capitalize text-slate-400">
                {new Date().toLocaleDateString("es-CL", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
