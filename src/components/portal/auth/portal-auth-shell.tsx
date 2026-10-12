import Link from "next/link";
import { BriefcaseBusiness, Headphones, ShieldCheck } from "lucide-react";
import { ExperienceBrand } from "@/components/client-experience/brand";
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
  return (
    <main className={`login-page ${minimal ? "compact-login" : ""}`}>
      <section className="login-story">
        <ExperienceBrand light />
        <div className="login-copy">
          <p className="eyebrow">BIENVENIDO A TU ESPACIO</p>
          <h1>
            Grandes ideas.
            <br />
            Próximos pasos.
            <br />
            <span>Siempre contigo.</span>
          </h1>
          <p>
            Tus proyectos, tus servicios y las personas que te acompañan. Una relación más cercana,
            en un solo lugar.
          </p>
          <div className="login-points">
            <span>
              <BriefcaseBusiness size={17} />
              Cada avance de tus proyectos
            </span>
            <span>
              <ShieldCheck size={17} />
              Tu información compartida con control
            </span>
            <span>
              <Headphones size={17} />
              Un equipo que conoce tu negocio
            </span>
          </div>
        </div>
        <div className="login-decor" aria-hidden="true" />
        <div className="login-story-footer">Zyteron · Tecnología que te acompaña.</div>
      </section>
      <section className="login-form-area">
        <div className="login-form-box">
          <p className="eyebrow">PORTAL CLIENTE ZYTERON</p>
          <h2>{title === "Iniciar sesión" ? "Qué bueno verte aquí." : title}</h2>
          <p>{subtitle}</p>
          <div style={{ marginTop: 24 }}>{children}</div>
          {footer && <div style={{ marginTop: 20 }}>{footer}</div>}
          {!hideBackLink && (
            <Link className="login-demo-link" href="/">
              Volver al sitio Zyteron ↗
            </Link>
          )}
          <p className="login-invitation">
            Tu cuenta y los registros compartidos contigo
            <br />
            permanecen en un espacio privado.
          </p>
        </div>
      </section>
    </main>
  );
}
