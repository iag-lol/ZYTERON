import {
  BadgeCheck,
  Banknote,
  CircleAlert,
  FileSpreadsheet,
  Hourglass,
  Percent,
  Receipt,
  Wallet,
} from "lucide-react";
import {
  COMMISSION_RULES,
  COMMISSION_STATUS_INFO,
  RETENTION_NOTE,
  STATEMENT_STATUS_INFO,
  currentPeriod,
  formatCLP,
  formatPeriod,
} from "@/config/commercial";
import { requireCommercialUser } from "@/lib/commercial/session";
import { listCommissions, listStatements, summarizeEarnings } from "@/lib/commercial/finance";
import { formatDate, maskAccount } from "@/lib/commercial/format";
import { BarRow, DataItem, EmptyState, Panel, Pill, StatCard } from "@/components/commercial/ui";

export const dynamic = "force-dynamic";

/**
 * Ganancias del ejecutivo: comisiones con su origen y estado, liquidaciones
 * mensuales con retención y neto, y las reglas bajo las que se paga.
 */
export default async function GananciasPage() {
  const user = await requireCommercialUser();
  const period = currentPeriod();
  const [commissions, statements] = await Promise.all([
    listCommissions({ ownerId: user.id }),
    listStatements({ ownerId: user.id }),
  ]);
  const earnings = summarizeEarnings(commissions, statements, period);
  const maxPeriodGross = Math.max(1, ...earnings.byPeriod.map((item) => item.gross));
  const bankReady = Boolean(user.bank_name && user.bank_account_number && user.bank_account_holder);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Ganancias y liquidaciones</h1>
        <p className="text-[12.5px] text-slate-500">
          Detalle de cada comisión registrada a tu nombre y de las liquidaciones mensuales emitidas por
          Zyteron.
        </p>
      </div>

      {!bankReady && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-[12.5px] font-extrabold text-amber-900">Completa tus datos bancarios</p>
            <p className="mt-0.5 text-[11.5px] leading-5 text-amber-800">
              Sin banco, tipo de cuenta, número y titular no es posible emitir ni transferir tu
              liquidación. Complétalos en <strong>Mi perfil</strong>.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Comisión acumulada"
          value={formatCLP(earnings.grossTotal)}
          icon={<Wallet className="h-4 w-4" />}
          tone="blue"
          hint={`${commissions.length} comisión(es) registradas`}
        />
        <StatCard
          label="Pagado"
          value={formatCLP(earnings.paidTotal)}
          icon={<BadgeCheck className="h-4 w-4" />}
          tone="emerald"
          hint={earnings.lastPaymentAt ? `Último pago ${formatDate(earnings.lastPaymentAt)}` : "Sin pagos aún"}
        />
        <StatCard
          label="Aprobado por liquidar"
          value={formatCLP(earnings.approvedPending)}
          icon={<Hourglass className="h-4 w-4" />}
          tone="cyan"
          hint="Entra en la próxima liquidación"
        />
        <StatCard
          label="Pendiente de aprobación"
          value={formatCLP(earnings.pendingTotal)}
          icon={<Percent className="h-4 w-4" />}
          tone="amber"
          hint="A la espera del pago del cliente"
        />
        <StatCard
          label={`Periodo ${formatPeriod(period)}`}
          value={formatCLP(earnings.currentPeriodGross)}
          icon={<Receipt className="h-4 w-4" />}
          tone="violet"
          hint={`${earnings.statementsPaid} de ${earnings.statementsIssued} liquidaciones pagadas`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {/* Liquidaciones */}
          <Panel
            title="Liquidaciones mensuales"
            description="Consolidado del periodo con retención, ajustes y monto neto."
            icon={<FileSpreadsheet className="h-4 w-4" />}
            padded={false}
          >
            {statements.length === 0 ? (
              <EmptyState
                icon={<FileSpreadsheet className="h-4 w-4" />}
                title="Aún no tienes liquidaciones emitidas"
                text="Se emiten al cierre del mes con las comisiones aprobadas de ese periodo."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {statements.map((statement) => {
                  const status = STATEMENT_STATUS_INFO[statement.status] ?? STATEMENT_STATUS_INFO.issued;
                  return (
                    <article key={statement.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                            <Receipt className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-[13.5px] font-extrabold text-slate-900">
                              {formatPeriod(statement.period)}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {statement.commissions_count} comisión(es) ·{" "}
                              {statement.folio ? `Folio ${statement.folio} · ` : ""}
                              Emitida {formatDate(statement.issued_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Pill label={status.label} cls={status.cls} />
                          <p className="text-[16px] font-extrabold text-slate-900">
                            {formatCLP(statement.net_total)}
                          </p>
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
                        <DataItem label="Neto a pagar" value={formatCLP(statement.net_total)} />
                      </dl>

                      {(statement.paid_at || statement.payment_reference || statement.notes || statement.adjustments_note) && (
                        <div className="mt-2.5 space-y-1 text-[11.5px] leading-5 text-slate-500">
                          {statement.paid_at && (
                            <p>
                              <strong className="text-slate-700">Pagada</strong> el{" "}
                              {formatDate(statement.paid_at, true)}
                              {statement.payment_method ? ` por ${statement.payment_method}` : ""}
                              {statement.payment_reference ? ` · Ref. ${statement.payment_reference}` : ""}
                            </p>
                          )}
                          {statement.adjustments_note && <p>Ajuste: {statement.adjustments_note}</p>}
                          {statement.notes && <p>{statement.notes}</p>}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Comisiones */}
          <Panel
            title="Detalle de comisiones"
            description="Origen, base de cálculo, porcentaje y estado de cada comisión."
            icon={<Banknote className="h-4 w-4" />}
            padded={false}
          >
            {commissions.length === 0 ? (
              <EmptyState
                icon={<Banknote className="h-4 w-4" />}
                title="Todavía no registras comisiones"
                text="Se generan cuando un contacto aceptado se convierte en proyecto y el cliente paga."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-2.5">Cliente / concepto</th>
                      <th className="px-3 py-2.5">Periodo</th>
                      <th className="px-3 py-2.5 text-right">Base neta</th>
                      <th className="px-3 py-2.5 text-right">%</th>
                      <th className="px-3 py-2.5 text-right">Comisión</th>
                      <th className="px-5 py-2.5">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {commissions.map((item) => {
                      const status = COMMISSION_STATUS_INFO[item.status] ?? COMMISSION_STATUS_INFO.pending;
                      return (
                        <tr key={item.id} className="text-[12.5px] text-slate-600">
                          <td className="px-5 py-3">
                            <p className="font-bold text-slate-800">{item.client_name || "Sin cliente indicado"}</p>
                            <p className="text-[11px] text-slate-400">
                              {item.concept || item.project_ref || "Comisión de proyecto"}
                            </p>
                            {item.notes && <p className="mt-0.5 text-[11px] text-slate-500">{item.notes}</p>}
                          </td>
                          <td className="px-3 py-3 text-[11.5px]">{formatPeriod(item.period)}</td>
                          <td className="px-3 py-3 text-right font-mono text-[11.5px]">
                            {formatCLP(item.base_amount)}
                          </td>
                          <td className="px-3 py-3 text-right font-bold">{item.percentage}%</td>
                          <td className="px-3 py-3 text-right font-extrabold text-slate-900">
                            {formatCLP(item.gross_amount)}
                          </td>
                          <td className="px-5 py-3">
                            <Pill label={status.label} cls={status.cls} />
                            {item.paid_at && (
                              <p className="mt-1 text-[10px] text-slate-400">Pagada {formatDate(item.paid_at)}</p>
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
        </div>

        <div className="space-y-5">
          <Panel title="Mis condiciones" description="Datos con los que se calcula y paga." icon={<Percent className="h-4 w-4" />}>
            <dl className="grid grid-cols-2 gap-4">
              <DataItem label="Comisión vigente" value={`${user.commission_pct || 0}%`} />
              <DataItem label="Tipo de vínculo" value={user.contract_type ?? "—"} />
              <DataItem label="Banco" value={user.bank_name ?? "Sin registrar"} />
              <DataItem label="Tipo de cuenta" value={user.bank_account_type ?? "—"} />
              <DataItem label="Cuenta" value={maskAccount(user.bank_account_number)} mono />
              <DataItem label="Titular" value={user.bank_account_holder ?? "—"} />
            </dl>
            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500">{RETENTION_NOTE}</p>
          </Panel>

          {earnings.byPeriod.length > 0 && (
            <Panel title="Comisión por periodo" description="Últimos 12 periodos con movimiento." icon={<Banknote className="h-4 w-4" />}>
              <div className="space-y-2.5">
                {earnings.byPeriod.map((item) => (
                  <BarRow
                    key={item.period}
                    label={formatPeriod(item.period)}
                    value={item.gross}
                    total={maxPeriodGross}
                    cls="bg-emerald-500"
                  />
                ))}
              </div>
              <p className="mt-3 text-[10.5px] text-slate-400">Valores en pesos, comisión bruta antes de retención.</p>
            </Panel>
          )}

          <Panel title="Reglas de comisión" description="Cómo se genera y cuándo se paga." icon={<BadgeCheck className="h-4 w-4" />}>
            <ol className="space-y-3">
              {COMMISSION_RULES.map((rule, index) => (
                <li key={rule.title} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-extrabold text-blue-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[12px] font-bold text-slate-800">{rule.title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-5 text-slate-500">{rule.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}
