import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock4,
  Gift,
  LayoutGrid,
  Megaphone,
  Plus,
  Scale,
  Store,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { InstagramIcon } from "@/components/ui/instagram-icon";
import { getBecasDashboardData } from "@/lib/becas/admin-metrics";
import { BecasHeader } from "./_components/becas-nav";
import { StatCard } from "./_components/stat-card";
import { ScholarshipStatusBadge } from "./_components/status-badge";
import {
  DailyColumns,
  FunnelSteps,
  ProgressMeter,
  RankedBars,
  StackedStatusBar,
  TrendSparkline,
} from "./_components/becas-charts";

export const metadata: Metadata = {
  title: "Becas Web Pyme | Admin",
};

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("es-CL");
const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const dateFmt = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(value: string | null) {
  return value ? dateFmt.format(new Date(value)) : "—";
}

function CardTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

export default async function AdminBecasPage() {
  const data = await getBecasDashboardData();
  const { campaign, totals, winners, profiles } = data;

  const validationRate =
    totals.validated + totals.rejected + totals.observed > 0
      ? Math.round((totals.validated / (totals.validated + totals.rejected + totals.observed)) * 100)
      : null;

  const sparkValues = data.perDay.slice(-14).map((point) => point.value);
  const windowProgress = campaign?.windowProgress ?? null;

  return (
    <div className="space-y-6">
      <BecasHeader
        active="resumen"
        title="Centro de control"
        description="Estado general del programa: campaña, postulaciones, vitrina y selección."
        actions={
          <>
            <Link
              href="/admin/becas/participantes"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <Users className="h-4 w-4" /> Ver postulaciones
            </Link>
            <Link
              href="/admin/becas/campanas/nueva"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" /> Nueva campaña
            </Link>
          </>
        }
      />

      {campaign ? (
        <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
          {/* Campaña actual */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600">
                  Campaña actual
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-slate-900">{campaign.title}</h2>
                <p className="mt-0.5 text-xs text-slate-400">/{campaign.slug}</p>
              </div>
              <ScholarshipStatusBadge status={campaign.status} />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <CalendarClock className="h-3.5 w-3.5" /> Ventana de postulación
                </div>
                <p className="mt-1.5 text-sm font-bold text-slate-900">
                  {formatDate(campaign.startsAt)} → {formatDate(campaign.endsAt)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Gift className="h-3.5 w-3.5" /> Beneficio
                </div>
                <p className="mt-1.5 text-sm font-bold text-slate-900">
                  {campaign.benefitValueClp ? clp.format(campaign.benefitValueClp) : campaign.benefitTitle ?? "—"}
                  <span className="ml-1 font-semibold text-slate-400">
                    × {nf.format(campaign.benefitsQuantity)}
                  </span>
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Megaphone className="h-3.5 w-3.5" /> Anuncio de resultados
                </div>
                <p className="mt-1.5 text-sm font-bold text-slate-900">
                  {formatDate(campaign.announcementAt)}
                </p>
              </div>
            </div>

            {windowProgress ? (
              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500">Avance de la ventana</span>
                  <span className="font-bold text-slate-900">
                    {windowProgress.daysLeft > 0
                      ? `${nf.format(windowProgress.daysLeft)} días restantes`
                      : "Ventana finalizada"}
                  </span>
                </div>
                <ProgressMeter pct={windowProgress.pct} />
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <Link
                href={`/admin/becas/campanas/${campaign.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Editar campaña <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href={`/admin/becas/campanas/${campaign.id}/legal`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Scale className="h-3.5 w-3.5" /> Bases legales
              </Link>
              <Link
                href="/becas-web-pyme"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Ver página pública <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Embudo */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <CardTitle
              title="Embudo del programa"
              subtitle="Desde postulación hasta ganador confirmado"
            />
            <FunnelSteps steps={data.funnel} />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ClipboardList className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">Aún no hay campañas</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Crea tu primera campaña de Becas Web Pyme para comenzar a recibir postulaciones y ver
            métricas en este panel.
          </p>
          <Link
            href="/admin/becas/campanas/nueva"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" /> Crear campaña
          </Link>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Postulaciones totales"
          value={totals.total}
          hint="Campaña actual"
          icon={<Users className="h-4.5 w-4.5" />}
          trend={<TrendSparkline values={sparkValues} />}
        />
        <StatCard
          label="En revisión"
          value={totals.inReview}
          hint="Recibidas + en evaluación"
          icon={<Clock4 className="h-4.5 w-4.5" />}
          iconClass="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Validadas"
          value={totals.validated}
          hint={validationRate !== null ? `Tasa de validación ${validationRate}%` : undefined}
          icon={<CheckCircle2 className="h-4.5 w-4.5" />}
          iconClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Rechazadas"
          value={totals.rejected}
          hint="Incluye no seleccionadas"
          icon={<XCircle className="h-4.5 w-4.5" />}
          iconClass="bg-rose-50 text-rose-600"
        />
        <StatCard
          label="Vitrina autorizada"
          value={totals.galleryConsent}
          hint={`${nf.format(profiles.published)} publicadas`}
          icon={<Store className="h-4.5 w-4.5" />}
          iconClass="bg-violet-50 text-violet-600"
        />
      </div>

      {/* Serie temporal + distribución */}
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <CardTitle title="Postulaciones por día" subtitle="Últimos 30 días · hora de Chile" />
          <DailyColumns points={data.perDay} />
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <CardTitle title="Distribución por estado" />
            <StackedStatusBar segments={data.statusSegments} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <CardTitle title="Consentimientos declarados" />
            <div className="space-y-3">
              {[
                { label: "Sigue el Instagram oficial", value: totals.followsInstagram, icon: <InstagramIcon className="h-3.5 w-3.5" /> },
                { label: "Vitrina pública", value: totals.galleryConsent, icon: <Store className="h-3.5 w-3.5" /> },
                { label: "Comunicaciones comerciales", value: totals.marketingConsent, icon: <Megaphone className="h-3.5 w-3.5" /> },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="text-slate-400">{row.icon}</span>
                    {row.label}
                  </span>
                  <span className="font-bold tabular-nums text-slate-900">
                    {nf.format(row.value)}
                    {totals.total > 0 ? (
                      <span className="ml-1.5 text-xs font-semibold text-slate-400">
                        {Math.round((row.value / totals.total) * 100)}%
                      </span>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Segmentación + moderación */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <CardTitle title="Top regiones" subtitle="Origen de las postulaciones" />
          <RankedBars items={data.topRegions} color="#2a78d6" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <CardTitle title="Top rubros" subtitle="Industria declarada del negocio" />
          <RankedBars items={data.topIndustries} color="#1baf7a" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2 xl:col-span-1">
          <CardTitle title="Moderación y selección" />
          <div className="space-y-2.5">
            {[
              { label: "Perfiles pendientes de aprobación", value: profiles.pending, href: "/admin/becas/vitrina", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
              { label: "Perfiles publicados en vitrina", value: profiles.published, href: "/admin/becas/vitrina", icon: <Store className="h-3.5 w-3.5" /> },
              { label: "Ganadores registrados", value: winners.total, href: "/admin/becas/seleccion", icon: <Trophy className="h-3.5 w-3.5" /> },
              { label: "Aceptaciones pendientes", value: winners.pending, href: "/admin/becas/seleccion", icon: <Clock4 className="h-3.5 w-3.5" /> },
            ].map((row) => (
              <Link
                key={row.label}
                href={row.href}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-sm transition-colors hover:border-blue-200 hover:bg-blue-50/50"
              >
                <span className="flex items-center gap-2 font-medium text-slate-600">
                  <span className="text-slate-400">{row.icon}</span>
                  {row.label}
                </span>
                <span className="flex items-center gap-1 font-bold tabular-nums text-slate-900">
                  {nf.format(row.value)} <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Últimas postulaciones */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Últimas postulaciones</h2>
            <p className="mt-0.5 text-xs text-slate-500">Las 6 más recientes de la campaña actual</p>
          </div>
          <Link
            href="/admin/becas/participantes"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-500"
          >
            Ver todas <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {data.recent.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.recent.map((app) => (
              <div key={app.id} className="flex items-center gap-4 px-6 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-extrabold text-blue-700">
                  {app.businessName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{app.businessName}</p>
                  <p className="truncate text-xs text-slate-500">
                    {app.fullName} · {app.region}
                  </p>
                </div>
                <span className="hidden font-mono text-[11px] text-slate-400 sm:block">{app.code}</span>
                <ScholarshipStatusBadge status={app.status} />
                <span className="hidden w-20 text-right text-xs text-slate-400 md:block">
                  {formatDate(app.submittedAt)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-slate-400">
            Aún no se registran postulaciones en esta campaña.
          </p>
        )}
      </div>
    </div>
  );
}
