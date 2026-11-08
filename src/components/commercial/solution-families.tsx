import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { solutionFamilies, industrySolutions } from "@/content/solutions";

export function SolutionFamilies({ detailed = false }: { detailed?: boolean }) {
  return (
    <div className={`solution-families ${detailed ? "solution-families-detailed" : ""}`}>
      {solutionFamilies.map((family, index) => (
        <article id={detailed ? family.id : undefined} key={family.id} className="solution-family">
          <span className="solution-number" aria-hidden="true">
            0{index + 1}
          </span>
          <div>
            <h3>{family.name}</h3>
            <p>{family.description}</p>
            {detailed ? (
              <>
                <div className="solution-capabilities">
                  {family.groups.map((group) => (
                    <div key={group.title}>
                      <h4>{group.title}</h4>
                      <p>{group.text}</p>
                    </div>
                  ))}
                </div>
                <p className="solution-scope">{family.scope}</p>
                <div className="solution-links">
                  {family.links.map((link) => (
                    <Link className="text-link" key={link.href} href={link.href}>
                      {link.label}
                      <ArrowUpRight size={15} />
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="solution-examples">{family.examples}</p>
                <Link
                  className="text-link"
                  href={`/servicios#${family.id}`}
                  data-solution-family={family.id}
                >
                  Explorar {family.shortName.toLowerCase()}
                  <ArrowUpRight size={16} />
                </Link>
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function IndustrySolutions() {
  return (
    <>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
        Cada rubro combina necesidades distintas. Estos ejemplos son posibilidades de desarrollo:
        los módulos, las integraciones y su disponibilidad se confirman en la propuesta.
      </p>
      <div className="industry-solutions">
        {industrySolutions.map((industry) => (
          <article key={industry.id}>
            <h3>{industry.name}</h3>
            <p>{industry.need}</p>
            <div>
              <Link href={industry.href}>
                {industry.label} <ArrowUpRight size={14} />
              </Link>
              <Link
                href={`/contacto?tipo=${industry.type}&rubro=${industry.id}&origen=soluciones-rubro`}
              >
                Evaluar una solución <ArrowUpRight size={14} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
