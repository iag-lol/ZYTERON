import Link from "next/link";
import { CalendarDays, FileText, Globe, Layers3, Wallet } from "lucide-react";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { clientDatabase } from "@/lib/portal/scoped-db";
import { currencyCLP } from "@/lib/portal/data";
import { decideSiteAccess } from "@/lib/payments/site-access-policy";
import { NotificationsList } from "./notifications-list";
type Kind =
  | "servicios"
  | "cuenta"
  | "agenda"
  | "notificaciones"
  | "empresa"
  | "informes"
  | "monitoreo";
const titles = {
  servicios: "Tu ecosistema digital.",
  cuenta: "Cada movimiento, más claro.",
  agenda: "Los próximos pasos, juntos.",
  notificaciones: "Lo que está pasando en tu espacio.",
  empresa: "Tu empresa, en un solo lugar.",
  informes: "El trabajo detrás de tu continuidad.",
  monitoreo: "Visibilidad sobre tus servicios.",
};
const intro = {
  servicios: "Servicios contratados y compartidos por tu equipo de Zyteron.",
  cuenta: "Obligaciones y pagos registrados, sin duplicar saldos.",
  agenda: "Reuniones, visitas y compromisos compartidos contigo.",
  notificaciones: "Mantente al día con tus proyectos, mensajes y documentos.",
  empresa:
    "Información vinculada a tu cuenta. Los cambios de titularidad los revisa nuestro equipo.",
  informes: "Informes y evidencias de mantención publicados para tu cuenta.",
  monitoreo:
    "Revisa el estado administrativo y la continuidad de tus servicios. Las mediciones técnicas se muestran cuando están disponibles.",
};
const civil = (v: Date) =>
  v.toLocaleDateString("es-CL", {
    timeZone: "UTC",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
export async function ExperienceModule({ kind }: { kind: Kind }) {
  const session = await requirePortalSession();
  const body = await clientDatabase(session.user.id, async (db) => {
    if (kind === "servicios" || kind === "monitoreo") {
      const services = await db.$queryRaw<
        Array<{
          id: string;
          service_name: string;
          status: string;
          currency: string;
          agreed_price: string | number | null;
          renewal_date: Date | null;
          billing_frequency: string | null;
          sla: string | null;
          legacy_quote_id: string | null;
        }>
      >`SELECT id,service_name,status,currency,agreed_price,renewal_date,billing_frequency,sla,legacy_quote_id FROM client_services WHERE portal_visible ORDER BY created_at DESC LIMIT 100`;
      const lifecycles = await db.$queryRaw<
        Array<{
          quote_id: string;
          state: string;
          paid_through: Date | null;
          verified_at: Date | null;
        }>
      >`SELECT quote_id,state,paid_through,verified_at FROM zyteron_recurring_lifecycle`;
      const confirmed = await db.payment.findMany({
        where: {
          clientId: session.user.id,
          status: "CONFIRMED",
          source: "SUBSCRIPTION",
          provider: "FLOW",
        },
        select: { metadata: true },
      });
      const continuity = (quoteId: string | null) => {
        const life = lifecycles.find((l) => l.quote_id === quoteId);
        if (!life) return null;
        const ends = confirmed
          .map((p) => p.metadata as { quoteId?: string; periodEnd?: string } | null)
          .filter((p) => p?.quoteId === quoteId && p.periodEnd)
          .map((p) => new Date(p!.periodEnd!))
          .filter((d) => Number.isFinite(d.getTime()))
          .sort((a, b) => a.getTime() - b.getTime());
        const paidThrough = ends.at(-1) || null;
        return {
          ...life,
          paidThrough,
          mode: decideSiteAccess({
            state: life.state,
            verifiedAt: life.verified_at,
            paidThrough,
            now: new Date(),
          }),
        };
      };
      if (!services.length)
        return (
          <Empty
            icon="services"
            title={
              kind === "monitoreo"
                ? "Tus servicios aparecerán aquí al vincularlos."
                : "El próximo servicio empieza contigo."
            }
            text="Cuando Zyteron publique un servicio en tu cuenta, podrás consultar su alcance y continuidad."
          />
        );
      return (
        <div className="experience-grid">
          {services.map((s) => {
            const life = continuity(s.legacy_quote_id);
            return (
              <article className="service-row" key={s.id}>
                <span className="eyebrow">
                  {kind === "monitoreo" ? "CONTINUIDAD" : "TU SERVICIO"}
                </span>
                <h2>{s.service_name}</h2>
                <p>
                  <span className="badge green">
                    {life?.mode === "MAINTENANCE"
                      ? "Suspendido · período pagado terminado"
                      : serviceLabel(s.status)}
                  </span>
                </p>
                {kind === "servicios" && s.agreed_price !== null && (
                  <p>
                    <b>
                      {s.currency.trim() === "CLP"
                        ? currencyCLP(Number(s.agreed_price))
                        : `${s.agreed_price} ${s.currency.trim()}`}
                    </b>{" "}
                    · {frequencyLabel(s.billing_frequency)}
                  </p>
                )}
                <p>Renovación: {s.renewal_date ? civil(s.renewal_date) : "Por coordinar"}</p>
                {life && (
                  <p>
                    Suscripción:{" "}
                    {life.state === "CANCELLED" || life.state === "CANCEL_SCHEDULED"
                      ? "Cancelación confirmada"
                      : "Cancelación en revisión"}
                    {life.paidThrough
                      ? " · Cobertura pagada hasta " + civil(life.paidThrough)
                      : " · Sin período pagado acreditado"}
                  </p>
                )}
                {s.sla && <p>Atención: {s.sla}</p>}
                {kind === "monitoreo" && (
                  <p>
                    Sin medición técnica publicada. El estado del servicio no representa una prueba
                    de disponibilidad del sitio.
                  </p>
                )}
                <Link className="text-button" href="/clientes/panel/asistencia">
                  Conversemos sobre este servicio ↗
                </Link>
              </article>
            );
          })}
        </div>
      );
    }
    if (kind === "cuenta") {
      const [debts, payments] = await Promise.all([
        db.receivable.findMany({
          where: { clientId: session.user.id, status: { notIn: ["CANCELLED", "VOID"] } },
          include: {
            allocations: { where: { payment: { status: "CONFIRMED" } }, select: { amount: true } },
          },
          orderBy: { issuedAt: "desc" },
          take: 200,
        }),
        db.payment.findMany({
          where: { clientId: session.user.id, status: "CONFIRMED" },
          select: { id: true, amount: true, receivedAt: true, method: true, provider: true },
          orderBy: { receivedAt: "desc" },
          take: 200,
        }),
      ]);
      const balances = debts.map((r) => ({
        ...r,
        balance: Math.max(0, r.totalAmount - r.allocations.reduce((n, a) => n + a.amount, 0)),
      }));
      return (
        <>
          <div className="stats-grid">
            <article className="stat-card">
              <span>Saldo pendiente · CLP</span>
              <strong>{currencyCLP(balances.reduce((n, r) => n + r.balance, 0))}</strong>
              <p>Obligaciones registradas</p>
            </article>
            <article className="stat-card">
              <span>Pagos confirmados · CLP</span>
              <strong>{currencyCLP(payments.reduce((n, p) => n + p.amount, 0))}</strong>
              <p>Movimientos acreditados</p>
            </article>
          </div>
          <div className="section-heading">
            <h2>Estado de cuenta</h2>
            <Link className="text-button" href="/clientes/panel/cotizaciones">
              Revisar pagos pendientes ↗
            </Link>
          </div>
          {!balances.length ? (
            <Empty
              icon="wallet"
              title="Sin obligaciones registradas."
              text="Las obligaciones publicadas por tu equipo aparecerán aquí."
            />
          ) : (
            <div className="experience-table">
              <table>
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Vencimiento</th>
                    <th>Total CLP</th>
                    <th>Saldo CLP</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((r) => (
                    <tr key={r.id}>
                      <td>{r.description}</td>
                      <td>{r.dueAt ? civil(r.dueAt) : "Sin fecha"}</td>
                      <td>{currencyCLP(r.totalAmount)}</td>
                      <td>{currencyCLP(r.balance)}</td>
                      <td>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="section-heading">
            <h2>Movimientos confirmados</h2>
            <Link className="text-button" href="/clientes/panel/pagos">
              Ver calendario ↗
            </Link>
          </div>
          <div className="resource-list">
            {payments.map((p) => (
              <div className="resource-row" key={p.id}>
                <b>{currencyCLP(p.amount)}</b>
                <p>
                  {civil(p.receivedAt)} · {p.method}
                </p>
                {p.provider === "FLOW" && (
                  <Link className="text-button" href={`/api/portal/payments/receipts/${p.id}`}>
                    Descargar comprobante ↗
                  </Link>
                )}
              </div>
            ))}
            {!payments.length && (
              <p className="resource-row">Todavía no tienes pagos confirmados registrados.</p>
            )}
          </div>
        </>
      );
    }
    if (kind === "agenda") {
      const [events, visits] = await Promise.all([
        db.$queryRaw<
          Array<{ id: string; title: string; description: string | null; occurred_at: Date }>
        >`SELECT id,title,description,occurred_at FROM client_events WHERE visibility='CLIENT_VISIBLE' ORDER BY occurred_at DESC LIMIT 100`,
        db.visit.findMany({
          where: { clientId: session.user.id },
          select: { id: true, date: true, status: true },
          orderBy: { date: "desc" },
          take: 100,
        }),
      ]);
      return !events.length && !visits.length ? (
        <Empty
          icon="calendar"
          title="Una agenda lista para lo que viene."
          text="Las reuniones, visitas y compromisos compartidos por Zyteron aparecerán en este espacio."
        />
      ) : (
        <div className="resource-list">
          {events.map((e) => (
            <article className="resource-row" key={e.id}>
              <small>{civil(e.occurred_at)}</small>
              <h2>{e.title}</h2>
              {e.description && <p>{e.description}</p>}
            </article>
          ))}
          {visits.map((v) => (
            <article className="resource-row" key={v.id}>
              <small>{v.date ? civil(v.date) : "Por coordinar"}</small>
              <h2>Visita técnica</h2>
              <p>{v.status || "Por coordinar"}</p>
            </article>
          ))}
        </div>
      );
    }
    if (kind === "notificaciones") {
      const notifications = await db.clientNotification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return (
        <NotificationsList
          items={notifications.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            isRead: n.isRead,
            date: n.createdAt.toLocaleString("es-CL", { timeZone: "America/Santiago" }),
          }))}
        />
      );
    }
    if (kind === "empresa") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          company: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          country: true,
          rut: true,
        },
      });
      return (
        <section className="service-row">
          <span className="eyebrow">TU CUENTA</span>
          <h2>{user?.company || user?.name}</h2>
          <dl className="company-dl">
            {Object.entries({
              Contacto: user?.name,
              "Correo verificado": user?.email,
              Teléfono: user?.phone,
              "RUT registrado": user?.rut,
              Dirección: user?.address,
              Ciudad: user?.city,
              País: user?.country,
            }).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || "No registrado"}</dd>
              </div>
            ))}
          </dl>
          <Link className="button secondary" href="/clientes/panel/perfil">
            Actualizar información de contacto ↗
          </Link>
          <p>
            Para cambiar los datos de titularidad o vincular otro contacto, envía una solicitud a
            nuestro equipo.
          </p>
        </section>
      );
    }
    const docs = await db.clientDocument.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { category: { contains: "INFORM", mode: "insensitive" } },
          { category: { contains: "REPORT", mode: "insensitive" } },
          { category: { contains: "MANTEN", mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, description: true, category: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return !docs.length ? (
      <Empty
        icon="file"
        title="El trabajo también se comparte."
        text="Los informes y evidencias de mantención publicados por Zyteron aparecerán aquí."
      />
    ) : (
      <div className="resource-list">
        {docs.map((d) => (
          <article className="resource-row" key={d.id}>
            <small>
              {d.category} · {civil(d.createdAt)}
            </small>
            <h2>{d.title}</h2>
            {d.description && <p>{d.description}</p>}
            <Link className="text-button" href={`/api/portal/documents/${d.id}/download`}>
              Descargar informe ↗
            </Link>
          </article>
        ))}
      </div>
    );
  });
  return (
    <>
      <header className="module-heading">
        <p className="eyebrow">TU ESPACIO ZYTERON</p>
        <h1>{titles[kind]}</h1>
        <p>{intro[kind]}</p>
      </header>
      {body}
    </>
  );
}
function Empty({ icon, title, text }: { icon: string; title: string; text: string }) {
  const Icon =
    icon === "services"
      ? Layers3
      : icon === "calendar"
        ? CalendarDays
        : icon === "wallet"
          ? Wallet
          : icon === "monitor"
            ? Globe
            : FileText;
  return (
    <div className="empty-state">
      <div className="empty-symbol">
        <Icon size={30} />
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
      <Link className="button secondary" href="/clientes/panel/solicitudes">
        Conversemos ↗
      </Link>
    </div>
  );
}

const serviceLabel = (value: string) =>
  ({
    ACTIVE: "Activo",
    QUOTED: "En cotización",
    PENDING_ACTIVATION: "Activación pendiente",
    SUSPENDED: "Suspendido",
    PENDING_RENEWAL: "Renovación pendiente",
    CANCELLED: "Cancelado",
    EXPIRED: "Finalizado",
  })[value] || value;
const frequencyLabel = (value: string | null) =>
  ({
    ONE_TIME: "Pago único",
    MONTHLY: "Mensual",
    QUARTERLY: "Trimestral",
    SEMIANNUAL: "Semestral",
    ANNUAL: "Anual",
    CUSTOM: "Según contrato",
  })[value || ""] || "Según contrato";
