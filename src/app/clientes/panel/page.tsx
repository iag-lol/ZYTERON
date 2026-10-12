import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  FileText,
  Headphones,
  Layers3,
  MessageSquare,
  Plus,
  Wallet,
} from "lucide-react";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { getClientPortalSnapshot, currencyCLP } from "@/lib/portal/data";
import { clientDatabase } from "@/lib/portal/scoped-db";
const date = (v: Date) =>
  v.toLocaleDateString("es-CL", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
export default async function PortalDashboardPage() {
  const session = await requirePortalSession(),
    snapshot = await getClientPortalSnapshot(session.user.id);
  const [services, receivables] = await clientDatabase(session.user.id, (db) =>
    Promise.all([
      db.$queryRaw<
        Array<{ id: string; status: string }>
      >`SELECT id,status FROM client_services WHERE portal_visible`,
      db.receivable.findMany({
        where: { clientId: session.user.id, status: { notIn: ["VOID", "CANCELLED"] } },
        include: { allocations: { select: { amount: true } } },
      }),
    ]),
  );
  const overdue = receivables
    .filter((r) => r.dueAt && r.dueAt < new Date())
    .reduce(
      (n, r) => n + Math.max(0, r.totalAmount - r.allocations.reduce((s, a) => s + a.amount, 0)),
      0,
    );
  const openProjects = snapshot.projects.filter(
    (p) => ["ACTIVE", "IN_PROGRESS", "EN_CURSO"].includes((p.status || "").toUpperCase()),
  );
  const openTickets = snapshot.tickets.filter((t) => !["CLOSED", "RESOLVED"].includes(t.status));
  const firstName = snapshot.user?.firstName || snapshot.user?.name.split(" ")[0] || "Cliente";
  const notices = snapshot.notifications.filter((n) => !n.isRead).slice(0, 3);
  const stats = [
    {
      label: "Servicios activos",
      value: services
        .filter((s) => s.status === "ACTIVE")
        .length.toString()
        .padStart(2, "0"),
      icon: Layers3,
      foot: "Tu ecosistema digital",
      path: "/servicios",
      tone: "green",
    },
    {
      label: "Proyectos en curso",
      value: openProjects.length.toString().padStart(2, "0"),
      icon: BriefcaseBusiness,
      foot: "Ideas que toman forma",
      path: "/proyectos",
      tone: "purple",
    },
    {
      label: "Saldo vencido · CLP",
      value: currencyCLP(overdue),
      icon: Wallet,
      foot: "Consulta tus movimientos",
      path: "/cuenta",
      tone: "orange",
    },
    {
      label: "Solicitudes abiertas",
      value: openTickets.length.toString().padStart(2, "0"),
      icon: MessageSquare,
      foot: "Estamos para acompañarte",
      path: "/asistencia",
      tone: "blue",
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TU ESPACIO ZYTERON</p>
          <h1>
            Hola, {firstName} <span className="greeting-spark">✳</span>
          </h1>
          <p>Todo lo que estamos construyendo juntos, aquí.</p>
        </div>
        <Link className="button primary" href="/clientes/panel/solicitudes">
          <Plus size={17} />
          Nueva solicitud
        </Link>
      </div>
      <section className="welcome-banner">
        <div>
          <span className="banner-label">
            <span />
            TECNOLOGÍA QUE TE ACOMPAÑA
          </span>
          <h2>
            Tu negocio avanza.
            <br />
            <span>Nosotros vamos contigo.</span>
          </h2>
          <p>Una mirada a tus proyectos, servicios y próximos pasos.</p>
          <Link href="/clientes/panel/proyectos">
            Exploremos tus proyectos <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <svg viewBox="0 0 160 160">
            <path d="M29 39h103L70 102h62v27H29l62-63H29z" fill="currentColor" />
          </svg>
          <span className="art-star">✳</span>
          <span className="art-coordinate">JUNTOS, MÁS LEJOS ↗</span>
        </div>
      </section>
      <div className="stats-grid">
        {stats.map((s) => (
          <Link className="stat-card" href={"/clientes/panel" + s.path} key={s.label}>
            <div>
              <span>{s.label}</span>
              <span className={`stat-icon ${s.tone}`}>
                <s.icon size={20} />
              </span>
            </div>
            <strong>{s.value}</strong>
            <p>
              {s.foot}
              <ArrowUpRight size={14} />
            </p>
          </Link>
        ))}
      </div>
      {notices.length > 0 && (
        <section className="attention-section">
          <div className="section-heading">
            <h2>
              <span className="attention-dot" />
              Requiere tu atención <span className="count-pill">{notices.length}</span>
            </h2>
          </div>
          <div className="attention-grid">
            {notices.map((n) => (
              <Link key={n.id} href="/clientes/panel/notificaciones">
                <span className="attention-icon">
                  <FileText size={21} />
                </span>
                <span>
                  <b>{n.title}</b>
                  <small>{n.body.slice(0, 100)}</small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
            ))}
          </div>
        </section>
      )}
      <div className="home-columns">
        <section>
          <div className="section-heading">
            <div>
              <h2>Tus proyectos</h2>
              <p>De una buena idea a un gran resultado.</p>
            </div>
            <Link className="text-button" href="/clientes/panel/proyectos">
              Ver todos <ArrowRight size={15} />
            </Link>
          </div>
          <div className="project-grid">
            {openProjects.slice(0, 2).map((p, i) => (
              <article className="project-card" key={p.id}>
                <div className={`project-art ${i % 2 ? "sand" : "forest"}`} aria-hidden="true">
                  <div className="art-grid" />
                  <div className="art-orbit" />
                  <div className="art-window">
                    <div className="art-window-head">
                      <i />
                      <i />
                      <i />
                      <span>zyteron.</span>
                    </div>
                    <div className="art-window-body">
                      <small>TU PRÓXIMO PASO</small>
                      <b>
                        Una idea.
                        <br />
                        Más posibilidades.
                      </b>
                      <div className="art-landscape" />
                    </div>
                  </div>
                  <span className="art-tag">Hecho para tu negocio ↗</span>
                </div>
                <div className="project-body">
                  <div className="project-meta">
                    <span>{p.serviceArea || "PROYECTO"}</span>
                    <span className="badge neutral">{p.status || "Por coordinar"}</span>
                  </div>
                  <Link className="title-link" href="/clientes/panel/proyectos">
                    <h3>{p.title}</h3>
                    <ArrowUpRight size={18} />
                  </Link>
                  <p>{p.description || "Revisa los detalles compartidos por nuestro equipo."}</p>
                  <div className="project-footer">
                    <span>Próxima entrega</span>
                    <span>
                      <Clock3 size={13} />
                      {p.endDate ? date(p.endDate) : "Por coordinar"}
                    </span>
                  </div>
                </div>
              </article>
            ))}
            {snapshot.projects.length === 0 && (
              <div className="empty-state">
                <BriefcaseBusiness size={30} />
                <h2>Las próximas ideas empiezan aquí.</h2>
                <p>Cuando tu equipo abra un proyecto, encontrarás sus avances en este espacio.</p>
                <Link className="button secondary" href="/clientes/panel/solicitudes">
                  Conversemos ↗
                </Link>
              </div>
            )}
          </div>
        </section>
        <section className="agenda-card">
          <div className="section-heading">
            <h2>Últimos documentos</h2>
            <Link className="text-button" href="/clientes/panel/documentos">
              Ver todos ↗
            </Link>
          </div>
          {snapshot.documents.slice(0, 4).map((d) => (
            <Link className="document-row" href="/clientes/panel/documentos" key={d.id}>
              <span className="document-icon">
                <FileText size={20} />
              </span>
              <span className="row-text">
                <b>{d.title}</b>
                <small>
                  {d.category} · {date(d.createdAt)}
                </small>
              </span>
              <ArrowUpRight size={17} />
            </Link>
          ))}
          {snapshot.documents.length === 0 && <p>No hay documentos compartidos todavía.</p>}
          <Link className="text-button" href="/clientes/panel/agenda">
            Ver mi agenda ↗
          </Link>
        </section>
      </div>
      <section className="team-banner">
        <div>
          <p className="eyebrow">PERSONAS DETRÁS DE LA TECNOLOGÍA</p>
          <h2>Un equipo que conoce tu negocio.</h2>
          <p>Encuentra respuestas y seguimiento de tus solicitudes en un solo lugar.</p>
        </div>
        <Link className="button secondary" href="/clientes/panel/comunicacion">
          <Headphones size={17} />
          Conversemos ↗
        </Link>
      </section>
    </>
  );
}
