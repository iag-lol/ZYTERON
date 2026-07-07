import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, AtSign, Building2, MapPin, Sparkles, Store } from "lucide-react";
import { Container } from "@/components/layout/container";
import { getPublishedScholarshipProfiles } from "@/lib/becas/public-profiles";

export const metadata: Metadata = {
  title: "Vitrina de Emprendimientos | Becas Web Pyme Zyteron",
  description:
    "Conoce los emprendimientos y pymes chilenas que están postulando a las Becas Web Pyme de Zyteron. Negocios reales, historias reales.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Vitrina de Emprendimientos | Becas Web Pyme Zyteron",
    description:
      "Emprendimientos chilenos que buscan dar el salto digital con Zyteron.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

type Profile = {
  id: string;
  businessName: string;
  industry: string | null;
  region: string | null;
  comuna: string | null;
  publicDescription: string | null;
  publicInstagramHandle: string | null;
  publicLogoUrl: string | null;
  publishedAt: string | null;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const INDUSTRY_COLORS: Record<string, string> = {
  default: "from-blue-500 to-indigo-600",
  gastronomia: "from-orange-500 to-rose-500",
  alimentos: "from-orange-500 to-rose-500",
  moda: "from-pink-500 to-purple-600",
  tecnologia: "from-cyan-500 to-blue-600",
  salud: "from-emerald-500 to-teal-600",
  educacion: "from-violet-500 to-indigo-600",
  construccion: "from-amber-500 to-orange-600",
  transporte: "from-slate-500 to-slate-700",
};

function getGradient(industry: string | null) {
  if (!industry) return INDUSTRY_COLORS.default;
  const key = industry.toLowerCase();
  for (const [word, gradient] of Object.entries(INDUSTRY_COLORS)) {
    if (key.includes(word)) return gradient;
  }
  return INDUSTRY_COLORS.default;
}

export default async function VitrinaPage() {
  const profiles: Profile[] = await getPublishedScholarshipProfiles();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_28%,#f8fafc_100%)]">
      {/* Hero */}
      <section className="relative overflow-hidden pb-16 pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-blue-200/60 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan-100 blur-3xl"
        />

        <Container className="relative text-center">
          <Link
            href="/becas-web-pyme"
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Becas Web Pyme
          </Link>

          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-700" />
            <span className="text-sm font-bold uppercase tracking-widest text-blue-700">
              Vitrina oficial
            </span>
            <Sparkles className="h-5 w-5 text-blue-700" />
          </div>

          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Emprendimientos{" "}
            <span className="bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
              que buscan crecer
            </span>
          </h1>
          <p className="mx-auto mb-6 max-w-2xl text-lg text-slate-600">
            Estos negocios autorizaron voluntariamente aparecer aquí mientras
            participan en el programa de Becas Web Pyme de{" "}
            <strong className="text-slate-950">Zyteron</strong>.
          </p>
          <p className="mx-auto max-w-3xl rounded-[1.4rem] border border-blue-100 bg-white px-5 py-4 text-xs text-slate-500 shadow-[0_15px_35px_-28px_rgba(59,130,246,0.6)]">
            Aparecer en esta vitrina no aumenta las posibilidades de selección
            ni representa una recomendación comercial. La selección se realiza
            según las bases publicadas.
          </p>

          {profiles.length > 0 && (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Store className="h-4 w-4 text-blue-700" />
              <span>
                <strong className="text-slate-950">{profiles.length}</strong>{" "}
                {profiles.length === 1 ? "emprendimiento publicado" : "emprendimientos publicados"}
              </span>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/becas-web-pyme"
              className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-800"
            >
              Ver programa
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/becas-web-pyme#que-incluye"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50"
            >
              Revisar beneficio
            </Link>
          </div>
        </Container>
      </section>

      {/* Grid de perfiles */}
      <section className="pb-24">
        <Container>
          {profiles.length === 0 ? (
            <div className="rounded-[1.8rem] border border-slate-200 bg-white p-16 text-center shadow-[0_20px_40px_-35px_rgba(59,130,246,0.5)]">
              <Store className="mx-auto mb-4 h-12 w-12 text-slate-400" />
              <h2 className="mb-2 text-lg font-bold text-slate-950">
                Aún no hay emprendimientos publicados
              </h2>
              <p className="text-sm text-slate-600">
                Los negocios irán apareciendo a medida que postulaciones sean
                revisadas. ¡Pronto habrá más aquí!
              </p>
              <Link
                href="/becas-web-pyme"
                className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500"
              >
                Postula tu negocio
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {profiles.map((profile) => {
                const gradient = getGradient(profile.industry);
                const initials = getInitials(profile.businessName);
                const igHandle = profile.publicInstagramHandle?.replace(
                  /^@/,
                  "",
                );

                return (
                  <article
                    key={profile.id}
                    className="group relative flex flex-col overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_30px_60px_-42px_rgba(15,23,42,0.4)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_32px_65px_-40px_rgba(37,99,235,0.32)]"
                  >
                    <div
                      className={`h-1.5 w-full bg-gradient-to-r ${gradient}`}
                    />

                    <div className="flex flex-1 flex-col p-6">
                      <div className="mb-4 flex items-start gap-4">
                        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.4rem] border border-slate-200 bg-[radial-gradient(circle_at_top,#eff6ff,white_72%)]">
                          {profile.publicLogoUrl ? (
                            <Image
                              src={profile.publicLogoUrl}
                              alt={`Logo de ${profile.businessName}`}
                              fill
                              sizes="80px"
                              className="object-contain p-3"
                            />
                          ) : (
                            <div
                              className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient} text-lg font-extrabold text-white`}
                            >
                              {initials}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-extrabold leading-tight text-slate-950">
                            {profile.businessName}
                          </h2>
                          {profile.industry && (
                            <p className="mt-1 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                              {profile.industry}
                            </p>
                          )}
                        </div>
                      </div>

                      {profile.publicDescription && (
                        <p className="mb-4 flex-1 text-sm leading-relaxed text-slate-600 line-clamp-4">
                          {profile.publicDescription}
                        </p>
                      )}

                      <div className="mt-auto space-y-2">
                        {(profile.comuna || profile.region) && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-700" />
                            <span>
                              {[profile.comuna, profile.region]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        )}

                        {igHandle && (
                          <a
                            href={`https://www.instagram.com/${igHandle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-semibold text-pink-600 transition-colors hover:text-pink-500"
                          >
                            <AtSign className="h-3.5 w-3.5 shrink-0" />
                            @{igHandle}
                          </a>
                        )}

                        {profile.publishedAt && (
                          <p className="pt-1 text-[11px] text-slate-400">
                            Publicado {dateFmt.format(new Date(profile.publishedAt))}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Container>
      </section>

      {/* CTA bottom */}
      <section className="border-t border-slate-200 bg-white py-16 text-center">
        <Container>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Building2 className="h-7 w-7" />
          </div>
          <h2 className="mb-3 text-2xl font-extrabold text-slate-950 sm:text-3xl">
            ¿Quieres aparecer aquí?
          </h2>
          <p className="mb-6 text-slate-600">
            Postula a las Becas Web Pyme de Zyteron y autoriza tu aparición en
            la vitrina pública.
          </p>
          <Link
            href="/becas-web-pyme"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-8 py-4 text-sm font-extrabold text-white shadow-[0_20px_35px_-24px_rgba(29,78,216,0.55)] transition-all hover:bg-blue-800"
          >
            Ver el programa y postular
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Container>
      </section>
    </main>
  );
}
