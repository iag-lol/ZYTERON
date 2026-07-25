import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { AdminUiProvider } from "@/components/admin/admin-ui-context";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const isProd = process.env.NODE_ENV === "production";

  return (
    <AdminUiProvider>
      <div className="min-h-screen bg-slate-50">
        <div className="flex min-h-screen">
          <AdminSidebar />

          <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-64">
            <AdminTopbar isProd={isProd} />

            <main className="flex-1 px-4 py-5 sm:px-5 sm:py-7 lg:px-8 lg:py-8">
              <div className="mx-auto min-w-0 max-w-[1600px]">{children}</div>
            </main>

            <footer className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-center sm:gap-4">
                <p className="text-[11px] text-slate-400">
                  Zyteron Admin Panel · Datos en tiempo real vía Supabase
                </p>
                <p className="hidden text-[11px] capitalize text-slate-400 sm:block">
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
    </AdminUiProvider>
  );
}
