import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  LockKeyhole,
  Network,
} from "lucide-react";
import { Container } from "@/components/layout/container";
import {
  homeIndustries,
  integrationGroups,
  integrationPlatforms,
  integrationPlatformCount,
} from "@/content/home-ecosystem";
import { IndustryFlipCard } from "./industry-flip-card";
import { IntegrationLogoCarousel } from "./integration-logo-carousel";
import styles from "./home-ecosystem.module.css";

export function HomeIndustriesSection() {
  return (
    <section
      id="rubros"
      className={`home-section is-tinted ${styles.industries}`}
      aria-labelledby="rubros-title"
    >
      <Container>
        <div className={styles.sectionHeading}>
          <p className="eyebrow">04 / Soluciones por rubro</p>
          <h2 id="rubros-title">Distintas actividades. Necesidades concretas.</h2>
          <p className={styles.intro}>
            Una tienda necesita vender. Una institución, atender a su comunidad. Una empresa,
            ordenar su operación. Diseñamos la web y los sistemas alrededor de lo que necesitas
            resolver.
          </p>
          <div className={styles.sectionLinks}>
            <span>Explora tu rubro y voltea la tarjeta</span>
            <a href="#integraciones">
              Ver integraciones <ArrowDown size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className={styles.industryGrid}>
          {homeIndustries.map((industry, index) => (
            <IndustryFlipCard key={industry.id} industry={industry} index={index} />
          ))}
        </div>
        <noscript>
          <p className={styles.noScript}>
            Desarrollamos páginas web, tiendas y sistemas para comercio, industria, transporte,
            salud, educación, municipalidades, fundaciones, clubes, turismo y servicios
            profesionales. <Link href="/contacto">Consulta por las soluciones para tu rubro.</Link>
          </p>
        </noscript>
        <div className={styles.industryFooter}>
          <p>
            <strong>¿Tu rubro no está aquí?</strong> El punto de partida es tu proceso, tu equipo y
            el objetivo que quieres lograr.
          </p>
          <Link href="/contacto?tipo=sistema&origen=inicio-rubros">
            Conversemos sobre tu proyecto <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </section>
  );
}

export function HomeIntegrationsSection() {
  const previewIds = ["sii", "mercadolibre", "meta", "firmavirtual"];
  const platforms = [
    ...previewIds.map((id) => integrationPlatforms.find((platform) => platform.id === id)!),
    ...integrationPlatforms.filter((platform) => !previewIds.includes(platform.id)),
  ].map(({ id, name, logo }) => ({ id, name, logo }));
  return (
    <section
      id="integraciones"
      className={`home-section ${styles.integrations}`}
      aria-labelledby="integraciones-title"
    >
      <Container>
        <div className={styles.integrationHeading}>
          <div>
            <p className="eyebrow">05 / Integraciones a medida</p>
            <h2 id="integraciones-title">
              Tus herramientas.
              <br />
              <span>Trabajando juntas.</span>
            </h2>
          </div>
          <div className={styles.integrationIntro}>
            <p>
              Conecta pagos, facturación, firmas, ventas y operación. Explora{" "}
              {integrationPlatformCount} plataformas y servicios, sus posibilidades y requisitos en
              nuestro catálogo de integraciones.
            </p>
            <Link href="/integraciones" className="text-link">
              Ver el catálogo completo <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <IntegrationLogoCarousel platforms={platforms} />
        <div className={styles.previewFooter}>
          <p>Conexiones por proyecto, sujetas a evaluación técnica y acceso autorizado.</p>
          <Link href="/integraciones" className="design-button">
            Explorar las {integrationPlatformCount} herramientas{" "}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </section>
  );
}

export function HomeIntegrationDirectory() {
  return (
    <section
      id="directorio-integraciones"
      className={`home-section is-tinted ${styles.directory}`}
      aria-labelledby="directorio-title"
    >
      <Container>
        <div className={styles.directoryHeader}>
          <div>
            <p className="eyebrow">Directorio de plataformas</p>
            <h2 id="directorio-title">
              Encuentra las plataformas
              <br />
              con las que ya trabajas.
            </h2>
            <p className={styles.directoryIntro}>
              Un resumen de {integrationPlatformCount} plataformas y servicios para evaluar
              conexiones con tu web o sistema. Revisa qué aporta cada uno y abre su documentación
              oficial.
            </p>
          </div>
          <div className={styles.directoryCount}>
            <span>{integrationPlatformCount}</span>
            <p>
              plataformas y servicios
              <br />
              en {integrationGroups.length} áreas de trabajo
            </p>
          </div>
        </div>
        <nav className={styles.directoryNav} aria-label="Categorías de integraciones">
          {integrationGroups.map((group) => (
            <a href={`#categoria-${group.id}`} key={group.id}>
              {group.name}
            </a>
          ))}
        </nav>
        <div className={styles.directoryGrid}>
          {integrationGroups.map((group, index) => (
            <article key={group.id} id={`categoria-${group.id}`} className={styles.directoryGroup}>
              <div className={styles.groupHeading}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3>{group.name}</h3>
              </div>
              <p className={styles.groupDescription}>{group.description}</p>
              <ul>
                {group.platforms.map((platform) => (
                  <li key={platform.id} id={`plataforma-${platform.id}`}>
                    <span className={styles.directoryLogo} data-brand={platform.id}>
                      <Image
                        src={`/home/integraciones/${platform.logo}`}
                        alt=""
                        width={34}
                        height={34}
                        unoptimized
                      />
                    </span>
                    <div>
                      <a
                        href={platform.docs}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${platform.name}: información oficial (abre en otra pestaña)`}
                      >
                        {platform.name}
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </a>
                      <p>{platform.use}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <details className={styles.requirements}>
                <summary>
                  Qué se necesita para integrar <ChevronDown size={15} aria-hidden="true" />
                </summary>
                <p>{group.requirement}</p>
              </details>
            </article>
          ))}
        </div>
        <div className={styles.integrationCta}>
          <div>
            <p className={styles.ctaEyebrow}>
              <Network size={17} aria-hidden="true" /> El siguiente paso es conectar lo importante
            </p>
            <h3>
              Cuéntanos qué usas.
              <br />
              Definamos qué necesita conectarse.
            </h3>
            <p>
              Revisamos el proceso, los accesos y la documentación. La propuesta detalla el alcance,
              los costos externos y cómo se comprobará el resultado.
            </p>
          </div>
          <div className={styles.ctaActions}>
            <Link href="/contacto?tipo=sistema&origen=inicio-integraciones">
              Evaluar mi integración <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <span>
              <LockKeyhole size={15} aria-hidden="true" /> Accesos y permisos definidos por proyecto
            </span>
          </div>
        </div>
        <div className={styles.integrationPrinciples}>
          {[
            "Permisos limitados a lo necesario",
            "Credenciales protegidas en el servidor",
            "Pruebas antes de activar el flujo",
          ].map((item) => (
            <p key={item}>
              <Check size={16} aria-hidden="true" />
              {item}
            </p>
          ))}
        </div>
      </Container>
    </section>
  );
}
