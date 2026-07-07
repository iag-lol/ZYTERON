type StatusMeta = {
  label: string;
  dot: string;
  bg: string;
  text: string;
};

const STATUS_META: Record<string, StatusMeta> = {
  // Postulaciones
  draft: { label: "Borrador", dot: "bg-slate-400", bg: "bg-slate-100", text: "text-slate-600" },
  submitted: { label: "Recibida", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
  reviewing: { label: "En revisión", dot: "bg-indigo-500", bg: "bg-indigo-50", text: "text-indigo-700" },
  validated: { label: "Validada", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  observed: { label: "Observada", dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
  rejected: { label: "Rechazada", dot: "bg-rose-500", bg: "bg-rose-50", text: "text-rose-700" },
  withdrawn: { label: "Retirada", dot: "bg-slate-400", bg: "bg-slate-100", text: "text-slate-600" },
  selected: { label: "Preseleccionada", dot: "bg-violet-500", bg: "bg-violet-50", text: "text-violet-700" },
  winner: { label: "Ganadora", dot: "bg-violet-600", bg: "bg-violet-100", text: "text-violet-800" },
  not_selected: { label: "No seleccionada", dot: "bg-slate-400", bg: "bg-slate-100", text: "text-slate-600" },
  // Campañas
  scheduled: { label: "Programada", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
  active: { label: "Activa", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  paused: { label: "Pausada", dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
  closed: { label: "Cerrada", dot: "bg-slate-400", bg: "bg-slate-100", text: "text-slate-600" },
  winner_pending_acceptance: { label: "Ganador por confirmar", dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
  winner_published: { label: "Ganador publicado", dot: "bg-violet-500", bg: "bg-violet-50", text: "text-violet-700" },
  archived: { label: "Archivada", dot: "bg-slate-400", bg: "bg-slate-100", text: "text-slate-600" },
  // Vitrina
  hidden: { label: "Oculta", dot: "bg-slate-400", bg: "bg-slate-100", text: "text-slate-600" },
  pending_approval: { label: "Pendiente de aprobación", dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
  published: { label: "Publicada", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  removed: { label: "Removida", dot: "bg-rose-500", bg: "bg-rose-50", text: "text-rose-700" },
  // Aceptación de ganador
  pending: { label: "Pendiente", dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
  accepted: { label: "Aceptada", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  declined: { label: "Declinada", dot: "bg-rose-500", bg: "bg-rose-50", text: "text-rose-700" },
  expired: { label: "Expirada", dot: "bg-slate-400", bg: "bg-slate-100", text: "text-slate-600" },
};

export function scholarshipStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return STATUS_META[status]?.label ?? status;
}

export function ScholarshipStatusBadge({ status }: { status: string | null | undefined }) {
  const meta = (status && STATUS_META[status]) || {
    label: status ?? "—",
    dot: "bg-slate-400",
    bg: "bg-slate-100",
    text: "text-slate-600",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.bg} ${meta.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
