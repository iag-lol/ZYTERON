import Link from "next/link";

export function PortalAuthShell({
  title,
  subtitle,
  children,
  footer,
  minimal = false,
  hideBackLink = false,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  minimal?: boolean;
  hideBackLink?: boolean;
}) {
  if (minimal) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#020d2f]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.38),transparent_58%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-blue-500/20 to-transparent" />
        <div className="pointer-events-none absolute left-1/2 top-14 h-56 w-56 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-[110px]" />

        <main className="relative mx-auto flex min-h-screen max-w-lg items-center px-4 py-12">
          <section className="w-full rounded-3xl border border-white/15 bg-white/95 p-7 shadow-2xl shadow-blue-950/35 backdrop-blur sm:p-9">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">Zyteron Secure Access</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">{title}</h2>
              <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
            </div>
            <div className="mt-7">{children}</div>
            {footer ? <div className="mt-6 text-sm text-slate-500">{footer}</div> : null}
            {!hideBackLink ? (
              <div className="mt-6 border-t border-slate-200 pt-5">
                <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-700">
                  Volver al sitio Zyteron
                </Link>
              </div>
            ) : null}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.3),transparent_56%)]" />
      <div className="pointer-events-none absolute -left-40 top-1/3 h-80 w-80 rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 top-10 h-80 w-80 rounded-full bg-cyan-400/15 blur-[120px]" />

      <main className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-12">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="hidden rounded-3xl border border-white/10 bg-white/[0.02] p-8 lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Zyteron</p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-white">
              Portal de Clientes
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300">
              Una zona privada segura para gestionar proyectos, cotizaciones, boletas,
              soporte y comunicación con nuestro equipo.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Acceso protegido",
                "Datos segmentados por cliente",
                "Historial centralizado",
                "Gestión ágil de solicitudes",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white px-6 py-7 shadow-2xl shadow-blue-900/20 sm:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Acceso privado</p>
              <h2 className="mt-1.5 text-2xl font-extrabold text-slate-900">{title}</h2>
              <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
            </div>
            <div className="mt-6">{children}</div>
            {footer ? <div className="mt-6 text-sm text-slate-500">{footer}</div> : null}
            {!hideBackLink ? (
              <div className="mt-6 border-t border-slate-200 pt-5">
                <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-700">
                  Volver al sitio Zyteron
                </Link>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
