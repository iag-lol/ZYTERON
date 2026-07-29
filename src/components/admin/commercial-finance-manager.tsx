"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  BadgeCheck,
  CircleAlert,
  FileSpreadsheet,
  Loader2,
  Plus,
  Receipt,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  COMMISSION_STATUS_INFO,
  DEFAULT_RETENTION_PCT,
  RETENTION_NOTE,
  STATEMENT_STATUS_INFO,
  currentPeriod,
  formatCLP,
  formatPeriod,
} from "@/config/commercial";
import { formatDate, readJson } from "@/lib/commercial/format";
import {
  DataItem,
  EmptyState,
  ErrorNote,
  GhostButton,
  InputField,
  Panel,
  Pill,
  PrimaryButton,
  SectionTitle,
  SelectField,
  StatCard,
  TextareaField,
  Toast,
} from "@/components/commercial/ui";
import { cn } from "@/lib/utils";

/**
 * Finanzas del área comercial: registro y aprobación de comisiones, y emisión
 * de las liquidaciones mensuales con retención, ajustes y control de pago.
 */

type Owner = { id: string; name: string; rut: string; commission_pct: number; status: string };

type Commission = {
  id: string;
  owner_id: string;
  client_name: string | null;
  project_ref: string | null;
  concept: string | null;
  base_amount: number;
  percentage: number;
  gross_amount: number;
  status: string;
  period: string | null;
  notes: string | null;
  statement_id: string | null;
  created_at: string;
};

type Statement = {
  id: string;
  owner_id: string;
  period: string;
  folio: string | null;
  gross_total: number;
  retention: number;
  retention_pct: number;
  adjustments: number;
  adjustments_note: string | null;
  net_total: number;
  commissions_count: number;
  status: string;
  issued_at: string;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
};

export function CommercialFinanceManager() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [modal, setModal] = useState<"commission" | "statement" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersData, commissionData, statementData] = await Promise.all([
        readJson(await fetch("/api/admin/comercial/users", { cache: "no-store" })),
        readJson(await fetch("/api/admin/comercial/commissions", { cache: "no-store" })),
        readJson(await fetch("/api/admin/comercial/statements", { cache: "no-store" })),
      ]);
      setOwners((usersData.users as Owner[]) ?? []);
      setCommissions((commissionData.commissions as Commission[]) ?? []);
      setStatements((statementData.statements as Statement[]) ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar las finanzas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }, []);

  const ownerName = useCallback(
    (id: string) => owners.find((owner) => owner.id === id)?.name ?? "Usuario eliminado",
    [owners],
  );

  const visibleCommissions = useMemo(
    () => (ownerFilter === "all" ? commissions : commissions.filter((item) => item.owner_id === ownerFilter)),
    [commissions, ownerFilter],
  );
  const visibleStatements = useMemo(
    () => (ownerFilter === "all" ? statements : statements.filter((item) => item.owner_id === ownerFilter)),
    [ownerFilter, statements],
  );

  const totals = useMemo(() => {
    const gross = commissions.reduce((sum, item) => sum + item.gross_amount, 0);
    const approved = commissions
      .filter((item) => item.status === "approved" && !item.statement_id)
      .reduce((sum, item) => sum + item.gross_amount, 0);
    const paid = commissions
      .filter((item) => item.status === "paid")
      .reduce((sum, item) => sum + item.gross_amount, 0);
    const pendingStatements = statements.filter((item) => item.status === "issued");
    return {
      gross,
      approved,
      paid,
      pending: gross - paid,
      pendingStatements: pendingStatements.length,
      pendingStatementsAmount: pendingStatements.reduce((sum, item) => sum + item.net_total, 0),
    };
  }, [commissions, statements]);

  const mutate = useCallback(
    async (url: string, init: RequestInit, message: string) => {
      setBusyId(url);
      setError("");
      try {
        await readJson(await fetch(url, init));
        await load();
        flash(message);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo completar la acción.");
      } finally {
        setBusyId(null);
      }
    },
    [flash, load],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-[13px] text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando comisiones y liquidaciones…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {notice && <Toast message={notice} />}

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Comisiones y liquidaciones</h2>
          <p className="text-[12.5px] text-slate-500">
            Registra la comisión de cada proyecto cerrado y emite la liquidación mensual con su retención.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <GhostButton onClick={() => setModal("statement")} disabled={owners.length === 0}>
            <FileSpreadsheet className="h-4 w-4" /> Emitir liquidación
          </GhostButton>
          <PrimaryButton onClick={() => setModal("commission")} disabled={owners.length === 0}>
            <Plus className="h-4 w-4" /> Registrar comisión
          </PrimaryButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Comisión total" value={formatCLP(totals.gross)} icon={Wallet} tone="blue" />
        <StatCard label="Pagado" value={formatCLP(totals.paid)} icon={BadgeCheck} tone="emerald" />
        <StatCard label="Por pagar" value={formatCLP(totals.pending)} icon={Banknote} tone="amber" />
        <StatCard
          label="Aprobado sin liquidar"
          value={formatCLP(totals.approved)}
          icon={Receipt}
          tone="cyan"
          hint="Listo para incluir en una liquidación"
        />
        <StatCard
          label="Liquidaciones emitidas"
          value={totals.pendingStatements}
          icon={FileSpreadsheet}
          tone={totals.pendingStatements > 0 ? "rose" : "slate"}
          hint={`${formatCLP(totals.pendingStatementsAmount)} sin transferir`}
        />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Panel padded>
        <SelectField
          label="Filtrar por ejecutivo"
          value={ownerFilter}
          onChange={(event) => setOwnerFilter(event.target.value)}
          className="sm:max-w-xs"
        >
          <option value="all">Todos los ejecutivos</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name} · {owner.rut}
            </option>
          ))}
        </SelectField>
      </Panel>

      {/* Liquidaciones */}
      <Panel
        title="Liquidaciones mensuales"
        description="Cada liquidación consolida las comisiones aprobadas del periodo."
        icon={FileSpreadsheet}
        padded={false}
      >
        {visibleStatements.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title="Sin liquidaciones emitidas"
            text="Aprueba comisiones y emite la liquidación del periodo para dejar constancia del pago."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleStatements.map((statement) => (
              <StatementRow
                key={statement.id}
                statement={statement}
                ownerName={ownerName(statement.owner_id)}
                busy={busyId?.includes(statement.id) ?? false}
                onUpdate={(body, message) =>
                  mutate(
                    `/api/admin/comercial/statements/${statement.id}`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(body),
                    },
                    message,
                  )
                }
              />
            ))}
          </div>
        )}
      </Panel>

      {/* Comisiones */}
      <Panel
        title="Comisiones registradas"
        description="Aprueba cuando el cliente pague; las aprobadas entran en la próxima liquidación."
        icon={Banknote}
        padded={false}
      >
        {visibleCommissions.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="Sin comisiones registradas"
            text="Registra la comisión cuando un contacto aceptado se convierta en proyecto."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-2.5">Ejecutivo</th>
                  <th className="px-3 py-2.5">Cliente / concepto</th>
                  <th className="px-3 py-2.5">Periodo</th>
                  <th className="px-3 py-2.5 text-right">Base neta</th>
                  <th className="px-3 py-2.5 text-right">%</th>
                  <th className="px-3 py-2.5 text-right">Comisión</th>
                  <th className="px-5 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleCommissions.map((item) => {
                  const status = COMMISSION_STATUS_INFO[item.status] ?? COMMISSION_STATUS_INFO.pending;
                  const busy = busyId?.includes(item.id) ?? false;
                  return (
                    <tr key={item.id} className="text-[12.5px] text-slate-600">
                      <td className="px-5 py-3 font-bold text-slate-800">{ownerName(item.owner_id)}</td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-700">{item.client_name || "Sin cliente"}</p>
                        <p className="text-[10.5px] text-slate-400">
                          {item.concept || item.project_ref || "Comisión de proyecto"}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-[11.5px]">{formatPeriod(item.period)}</td>
                      <td className="px-3 py-3 text-right font-mono text-[11.5px]">{formatCLP(item.base_amount)}</td>
                      <td className="px-3 py-3 text-right font-bold">{item.percentage}%</td>
                      <td className="px-3 py-3 text-right font-extrabold text-slate-900">
                        {formatCLP(item.gross_amount)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Pill label={status.label} cls={status.cls} />
                          {item.status === "pending" && (
                            <button
                              disabled={busy}
                              onClick={() =>
                                mutate(
                                  `/api/admin/comercial/commissions/${item.id}`,
                                  {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ status: "approved" }),
                                  },
                                  "Comisión aprobada.",
                                )
                              }
                              className="rounded-lg border border-emerald-200 px-2 py-1 text-[10.5px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              Aprobar
                            </button>
                          )}
                          {!item.statement_id && item.status !== "paid" && (
                            <button
                              disabled={busy}
                              onClick={() => {
                                if (!window.confirm("¿Eliminar esta comisión?")) return;
                                void mutate(
                                  `/api/admin/comercial/commissions/${item.id}`,
                                  { method: "DELETE" },
                                  "Comisión eliminada.",
                                );
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                              title="Eliminar"
                            >
                              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                        {item.statement_id && (
                          <p className="mt-1 text-[10px] text-slate-400">Incluida en liquidación</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {modal === "commission" && (
        <CommissionModal
          owners={owners}
          onClose={() => setModal(null)}
          onSaved={async (message) => {
            setModal(null);
            await load();
            flash(message);
          }}
        />
      )}
      {modal === "statement" && (
        <StatementModal
          owners={owners}
          onClose={() => setModal(null)}
          onSaved={async (message) => {
            setModal(null);
            await load();
            flash(message);
          }}
        />
      )}
    </div>
  );
}

function StatementRow({
  statement,
  ownerName,
  busy,
  onUpdate,
}: {
  statement: Statement;
  ownerName: string;
  busy: boolean;
  onUpdate: (body: Record<string, unknown>, message: string) => Promise<void>;
}) {
  const [payOpen, setPayOpen] = useState(false);
  const status = STATEMENT_STATUS_INFO[statement.status] ?? STATEMENT_STATUS_INFO.issued;

  async function markPaid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    await onUpdate(
      {
        status: "paid",
        paymentMethod: raw.paymentMethod || "transferencia",
        paymentReference: raw.paymentReference || null,
      },
      "Liquidación marcada como pagada y notificada al ejecutivo.",
    );
    setPayOpen(false);
  }

  return (
    <article className="px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Receipt className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-[13.5px] font-extrabold text-slate-900">
              {ownerName} · {formatPeriod(statement.period)}
            </p>
            <p className="text-[11px] text-slate-500">
              {statement.commissions_count} comisión(es) · Emitida {formatDate(statement.issued_at)}
              {statement.folio ? ` · Folio ${statement.folio}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Pill label={status.label} cls={status.cls} />
          <p className="text-[16px] font-extrabold text-slate-900">{formatCLP(statement.net_total)}</p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3.5 sm:grid-cols-4">
        <DataItem label="Bruto" value={formatCLP(statement.gross_total)} />
        <DataItem
          label={`Retención ${Number(statement.retention_pct) || 0}%`}
          value={`− ${formatCLP(statement.retention)}`}
        />
        <DataItem
          label="Ajustes"
          value={`${statement.adjustments >= 0 ? "+ " : "− "}${formatCLP(Math.abs(statement.adjustments))}`}
        />
        <DataItem label="Neto" value={formatCLP(statement.net_total)} />
      </dl>

      {statement.paid_at && (
        <p className="mt-2 text-[11.5px] text-emerald-700">
          Pagada el {formatDate(statement.paid_at, true)}
          {statement.payment_method ? ` por ${statement.payment_method}` : ""}
          {statement.payment_reference ? ` · Ref. ${statement.payment_reference}` : ""}
        </p>
      )}
      {statement.notes && <p className="mt-1 text-[11.5px] text-slate-500">{statement.notes}</p>}

      {statement.status === "issued" && (
        <div className="mt-3">
          {payOpen ? (
            <form onSubmit={markPaid} className="grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 sm:grid-cols-[1fr_1fr_auto]">
              <SelectField label="Medio de pago" name="paymentMethod" defaultValue="transferencia">
                <option value="transferencia">Transferencia</option>
                <option value="otro">Otro</option>
              </SelectField>
              <InputField label="N° de operación" name="paymentReference" placeholder="Comprobante o referencia" />
              <div className="flex items-end gap-2">
                <PrimaryButton loading={busy} className="bg-emerald-600 hover:bg-emerald-700">
                  Confirmar pago
                </PrimaryButton>
                <GhostButton type="button" onClick={() => setPayOpen(false)}>
                  Cancelar
                </GhostButton>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <PrimaryButton
                onClick={() => setPayOpen(true)}
                className="bg-emerald-600 px-3 py-2 text-[11.5px] hover:bg-emerald-700"
              >
                <BadgeCheck className="h-4 w-4" /> Marcar como pagada
              </PrimaryButton>
              <GhostButton
                onClick={() => {
                  if (!window.confirm("¿Anular esta liquidación? Las comisiones volverán a quedar disponibles."))
                    return;
                  void onUpdate({ status: "cancelled" }, "Liquidación anulada.");
                }}
                className="px-3 py-2 text-[11.5px] text-rose-600 hover:bg-rose-50"
              >
                <X className="h-4 w-4" /> Anular
              </GhostButton>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-5">
      <div className="max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-[16px] font-extrabold text-slate-900">{title}</h2>
            <p className="text-[11.5px] text-slate-500">{subtitle}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function CommissionModal({
  owners,
  onClose,
  onSaved,
}: {
  owners: Owner[];
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? "");
  const [base, setBase] = useState("");
  const [pct, setPct] = useState(String(owners[0]?.commission_pct ?? 0));

  const preview = Math.round(((Number(base) || 0) * (Number(pct) || 0)) / 100);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const raw = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    try {
      await readJson(
        await fetch("/api/admin/comercial/commissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerId: raw.ownerId,
            clientName: raw.clientName,
            projectRef: raw.projectRef,
            concept: raw.concept,
            baseAmount: Number(raw.baseAmount) || 0,
            percentage: Number(raw.percentage) || 0,
            period: raw.period,
            status: raw.status,
            notes: raw.notes,
          }),
        }),
      );
      await onSaved("Comisión registrada y notificada al ejecutivo.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar la comisión.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title="Registrar comisión"
      subtitle="Se calcula como base neta × porcentaje. La base excluye IVA y servicios de terceros."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4 p-5">
        <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Ejecutivo"
            name="ownerId"
            required
            value={ownerId}
            onChange={(event) => {
              setOwnerId(event.target.value);
              const owner = owners.find((item) => item.id === event.target.value);
              if (owner) setPct(String(owner.commission_pct));
            }}
          >
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name} · {owner.commission_pct}%
              </option>
            ))}
          </SelectField>
          <InputField label="Periodo" name="period" required defaultValue={currentPeriod()} placeholder="AAAA-MM" />
          <InputField label="Cliente" name="clientName" placeholder="Razón social del cliente" />
          <InputField label="Referencia del proyecto" name="projectRef" placeholder="N° de cotización o proyecto" />
          <InputField
            label="Concepto"
            name="concept"
            className="sm:col-span-2"
            placeholder="Ej.: Plan Pyme + integración de pagos, primera etapa"
          />
          <InputField
            label="Base neta comisionable (CLP)"
            name="baseAmount"
            type="number"
            min={0}
            required
            value={base}
            onChange={(event) => setBase(event.target.value)}
          />
          <InputField
            label="Porcentaje"
            name="percentage"
            type="number"
            min={0}
            max={100}
            step="0.5"
            required
            value={pct}
            onChange={(event) => setPct(event.target.value)}
          />
          <SelectField label="Estado inicial" name="status" defaultValue="pending">
            <option value="pending">Pendiente (cliente aún no paga)</option>
            <option value="approved">Aprobada (cliente ya pagó)</option>
          </SelectField>
          <TextareaField
            label="Observación"
            name="notes"
            rows={3}
            className="sm:col-span-2"
            placeholder="Condiciones, etapas de pago o cualquier antecedente relevante…"
          />
        </fieldset>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
          <SectionTitle>Comisión calculada</SectionTitle>
          <p className="text-[18px] font-extrabold text-slate-900">{formatCLP(preview)}</p>
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton loading={saving}>Registrar comisión</PrimaryButton>
        </div>
      </form>
    </ModalShell>
  );
}

function StatementModal({
  owners,
  onClose,
  onSaved,
}: {
  owners: Owner[];
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? "");
  const [period, setPeriod] = useState(currentPeriod());
  const [retention, setRetention] = useState(String(DEFAULT_RETENTION_PCT));
  const [adjustments, setAdjustments] = useState("0");
  const [preview, setPreview] = useState<{ gross: number; count: number } | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!ownerId || !/^\d{4}-\d{2}$/.test(period)) return;
    setPreviewing(true);
    setError("");
    try {
      const data = await readJson(
        await fetch(`/api/admin/comercial/statements?preview=1&ownerId=${ownerId}&period=${period}`, {
          cache: "no-store",
        }),
      );
      setPreview({
        gross: Number(data.gross) || 0,
        count: Array.isArray(data.eligible) ? data.eligible.length : 0,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo calcular la vista previa.");
    } finally {
      setPreviewing(false);
    }
  }, [ownerId, period]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const gross = preview?.gross ?? 0;
  const retentionAmount = Math.round((gross * (Number(retention) || 0)) / 100);
  const net = gross - retentionAmount + (Number(adjustments) || 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const raw = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    try {
      await readJson(
        await fetch("/api/admin/comercial/statements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerId,
            period,
            retentionPct: Number(retention) || 0,
            adjustments: Number(adjustments) || 0,
            adjustmentsNote: raw.adjustmentsNote,
            folio: raw.folio,
            notes: raw.notes,
          }),
        }),
      );
      await onSaved("Liquidación emitida y notificada al ejecutivo.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo emitir la liquidación.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title="Emitir liquidación mensual"
      subtitle="Consolida las comisiones aprobadas del periodo que aún no estén liquidadas."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4 p-5">
        <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Ejecutivo"
            required
            value={ownerId}
            onChange={(event) => setOwnerId(event.target.value)}
          >
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name} · {owner.rut}
              </option>
            ))}
          </SelectField>
          <InputField
            label="Periodo"
            required
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            placeholder="AAAA-MM"
          />
          <InputField
            label="Retención (%)"
            type="number"
            min={0}
            max={50}
            step="0.25"
            value={retention}
            onChange={(event) => setRetention(event.target.value)}
            hint="Segunda categoría vigente. Usa 0 si el pago se documenta con factura."
          />
          <InputField
            label="Ajustes (CLP)"
            type="number"
            value={adjustments}
            onChange={(event) => setAdjustments(event.target.value)}
            hint="Positivo suma (bonos), negativo descuenta."
          />
          <InputField label="Folio / referencia" name="folio" placeholder="N° de boleta o documento" />
          <InputField label="Motivo del ajuste" name="adjustmentsNote" placeholder="Bono, corrección, anticipo…" />
          <TextareaField label="Observación" name="notes" rows={3} className="sm:col-span-2" />
        </fieldset>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <SectionTitle>Vista previa del periodo</SectionTitle>
            {previewing && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
          </div>
          {preview && preview.count === 0 ? (
            <p className="mt-2 flex items-center gap-2 text-[12px] font-semibold text-amber-700">
              <CircleAlert className="h-4 w-4" /> No hay comisiones aprobadas sin liquidar en {formatPeriod(period)}.
            </p>
          ) : (
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DataItem label={`Comisiones (${preview?.count ?? 0})`} value={formatCLP(gross)} />
              <DataItem label={`Retención ${retention}%`} value={`− ${formatCLP(retentionAmount)}`} />
              <DataItem
                label="Ajustes"
                value={`${Number(adjustments) >= 0 ? "+ " : "− "}${formatCLP(Math.abs(Number(adjustments) || 0))}`}
              />
              <DataItem label="Neto a pagar" value={formatCLP(net)} />
            </dl>
          )}
          <p className="mt-3 text-[10.5px] leading-4 text-slate-500">{RETENTION_NOTE}</p>
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton
            loading={saving}
            disabled={!preview || preview.count === 0}
            className={cn(!preview || preview.count === 0 ? "opacity-60" : undefined)}
          >
            <FileSpreadsheet className="h-4 w-4" /> Emitir liquidación
          </PrimaryButton>
        </div>
      </form>
    </ModalShell>
  );
}
