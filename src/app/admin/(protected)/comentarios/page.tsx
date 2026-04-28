import { CheckCircle2, Clock3, MessageSquareText, ShieldX, Trash2 } from "lucide-react";
import Link from "next/link";
import { getClientReviews } from "@/lib/admin/repository";

type ReviewStatus = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

type PageProps = {
  searchParams?:
    | {
        status?: string;
        saved?: string;
        error?: string;
      }
    | Promise<{
        status?: string;
        saved?: string;
        error?: string;
      }>;
};

function normalizeStatus(value?: string | null): ReviewStatus {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "PENDING" || normalized === "APPROVED" || normalized === "REJECTED") return normalized;
  return "ALL";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusPill(status?: string | null) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "APPROVED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (normalized === "REJECTED") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function statusLabel(status?: string | null) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "APPROVED") return "Aprobado";
  if (normalized === "REJECTED") return "Rechazado";
  return "Pendiente";
}

export default async function ComentariosPage({ searchParams }: PageProps) {
  const query = await Promise.resolve(searchParams);
  const activeStatus = normalizeStatus(query?.status);
  const reviews = await getClientReviews();

  const sorted = reviews
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const filtered = activeStatus === "ALL"
    ? sorted
    : sorted.filter((item) => String(item.status || "").toUpperCase() === activeStatus);

  const totals = {
    all: sorted.length,
    pending: sorted.filter((item) => String(item.status || "").toUpperCase() === "PENDING").length,
    approved: sorted.filter((item) => String(item.status || "").toUpperCase() === "APPROVED").length,
    rejected: sorted.filter((item) => String(item.status || "").toUpperCase() === "REJECTED").length,
  };

  return (
    <div className="space-y-6">
      {query?.saved === "1" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Comentario actualizado correctamente.
        </div>
      ) : null}
      {query?.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {decodeURIComponent(query.error)}
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Moderación web</p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">Comentarios de clientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Aprueba o rechaza comentarios para controlar qué se muestra en Inicio.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Total</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{totals.all}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Pendientes</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-700">{totals.pending}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Aprobados</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700">{totals.approved}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Rechazados</p>
          <p className="mt-1 text-2xl font-extrabold text-rose-700">{totals.rejected}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "ALL", label: "Todos", count: totals.all },
            { key: "PENDING", label: "Pendientes", count: totals.pending },
            { key: "APPROVED", label: "Aprobados", count: totals.approved },
            { key: "REJECTED", label: "Rechazados", count: totals.rejected },
          ].map((filter) => {
            const href = filter.key === "ALL" ? "/admin/comentarios" : `/admin/comentarios?status=${filter.key}`;
            const active = activeStatus === filter.key;
            return (
              <Link
                key={filter.key}
                href={href}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  active
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {filter.label}
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-700 ring-1 ring-slate-200">
                  {filter.count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Bandeja de comentarios</h2>
            <p className="text-xs text-slate-400">Solo los aprobados se muestran en la home.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
            {filtered.length} registros
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-slate-500">No hay comentarios para este filtro.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((review) => {
              const status = String(review.status || "PENDING").toUpperCase();
              return (
                <article key={review.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{review.name}</p>
                      <p className="text-xs text-slate-500">
                        {review.company || "Sin empresa"} · {review.email || "Sin email"}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusPill(status)}`}>
                      {statusLabel(status)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>Servicio: {review.service || "No indicado"}</span>
                    <span>Calificación: {review.rating || 0}/5</span>
                    <span>Enviado: {formatDate(review.createdAt)}</span>
                    {review.approvedAt ? <span>Aprobado: {formatDate(review.approvedAt)}</span> : null}
                    {status === "APPROVED" ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        Visible en Inicio
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                    {review.comment || "Sin contenido"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={`/admin/comentarios/${review.id}/estado`} method="post">
                      <input type="hidden" name="status" value="APPROVED" />
                      <input type="hidden" name="redirectTo" value={activeStatus === "ALL" ? "/admin/comentarios" : `/admin/comentarios?status=${activeStatus}`} />
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Aprobar
                      </button>
                    </form>

                    <form action={`/admin/comentarios/${review.id}/estado`} method="post">
                      <input type="hidden" name="status" value="PENDING" />
                      <input type="hidden" name="redirectTo" value={activeStatus === "ALL" ? "/admin/comentarios" : `/admin/comentarios?status=${activeStatus}`} />
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                        <Clock3 className="h-3.5 w-3.5" /> Dejar pendiente
                      </button>
                    </form>

                    <form action={`/admin/comentarios/${review.id}/estado`} method="post">
                      <input type="hidden" name="status" value="REJECTED" />
                      <input type="hidden" name="redirectTo" value={activeStatus === "ALL" ? "/admin/comentarios" : `/admin/comentarios?status=${activeStatus}`} />
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                        <ShieldX className="h-3.5 w-3.5" /> Rechazar
                      </button>
                    </form>

                    <form action={`/admin/comentarios/${review.id}/eliminar`} method="post">
                      <input type="hidden" name="redirectTo" value={activeStatus === "ALL" ? "/admin/comentarios" : `/admin/comentarios?status=${activeStatus}`} />
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Trash2 className="h-3.5 w-3.5" /> Eliminar
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <p className="flex items-center gap-2 font-semibold">
          <MessageSquareText className="h-4 w-4" />
          Reglas de publicación en Inicio
        </p>
        <p className="mt-1 text-blue-700">
          Comentarios en estado <strong>APPROVED</strong> se publican automáticamente. En estado
          <strong> PENDING</strong> o <strong>REJECTED</strong> no se muestran.
        </p>
      </section>
    </div>
  );
}
