import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export const selectedProjects = [
  {
    name: "Fenice",
    category: "Sitios web / Energía y logística",
    evidence: "Trabajo para cliente · Sitio público",
    description: "Una presencia digital para una operación que no se detiene.",
    image: "/projects/fenice.jpg",
    alt: "Página de inicio actual de Fenice SPA",
    href: "/casos-exito/fenice-spa",
    external: "https://fenice.cl",
    domain: "fenice.cl",
    tone: "fenice",
  },
  {
    name: "Denurvia",
    category: "Software empresarial / Gestión de procesos",
    evidence: "Producto propio · Sitio público",
    description: "Una plataforma para gestionar investigaciones internas con orden y trazabilidad.",
    image: "/projects/denurvia.jpg",
    alt: "Sitio público de Denurvia, plataforma de gestión de investigaciones internas",
    href: "/soluciones/denurvia",
    external: "https://denurvia.cl",
    domain: "denurvia.cl",
    tone: "denurvia",
  },
  {
    name: "Control de Flota",
    category: "Personas y operaciones / Logística",
    evidence: "Demostración · Datos de ejemplo",
    description: "Vehículos, despachos y operación en una misma vista.",
    image: "/projects/control-de-flota.jpg",
    alt: "Control de Flota: interfaz de demostración sin datos operativos de clientes",
    href: "/sistemas-web/control-flota",
    domain: "Vista de demostración",
    tone: "fleet",
  },
  {
    name: "Centro de Caja",
    category: "Software empresarial / Comercio",
    evidence: "Trabajo para cliente · Vista ilustrativa",
    description: "Punto de venta, inventario y control de caja para la gestión diaria.",
    image: "/projects/centro-de-caja.svg",
    alt: "Vista ilustrativa de Centro de Caja con productos y valores de ejemplo",
    href: "/casos-exito/casos-exito-sistema-control-interno-negocios-eliana",
    domain: "Vista ilustrativa · Datos de ejemplo",
    tone: "caja",
  },
];

export function ProjectGallery() {
  return (
    <div className="project-gallery">
      {selectedProjects.map((project, index) => (
        <article key={project.name} className={`project project-${project.tone}`}>
          <Link
            href={project.href}
            className="project-visual"
            data-project-id={project.tone}
            aria-label={`Conocer el proyecto ${project.name}`}
          >
            <div className="project-screen">
              <div className="project-browser" aria-hidden="true">
                <span>•••</span>
                <span>{project.domain}</span>
                <ArrowUpRight size={13} />
              </div>
              <div className="project-image">
                <Image
                  src={project.image}
                  alt={project.alt}
                  fill
                  sizes="(max-width: 760px) 90vw, 600px"
                  className="object-cover object-top"
                />
              </div>
            </div>
          </Link>
          <div className="project-info">
            <div>
              <p className="project-category">
                <span>0{index + 1}</span> {project.category}
              </p>
              <h3>
                <Link href={project.href} data-project-id={project.tone}>
                  {project.name} <ArrowUpRight size={24} />
                </Link>
              </h3>
              <p className="project-description">{project.description}</p>
              <p className="project-evidence">{project.evidence}</p>
            </div>
            {project.external && (
              <a
                href={project.external}
                target="_blank"
                rel="noopener noreferrer"
                className="project-domain"
              >
                {project.domain} <ArrowUpRight size={13} />
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
