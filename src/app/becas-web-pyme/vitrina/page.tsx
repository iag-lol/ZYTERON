import { Metadata } from "next";
import Link from "next/link";
import { MapPin, Store, Instagram, ArrowLeft, Sparkles } from "lucide-react";
import { Container } from "@/components/layout/container";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";

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
  business_name: string;
  industry: string | null;
  region: string | null;
  comuna: string | null;
  public_description: string | null;
  public_instagram_handle: string | null;
  published_at: string | null;
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
  const supabase = getBecasSupabaseClient();

  // Traer todos los perfiles publicados (sin filtro de campaña para máxima visibilidad)
  const { data } = await supabase
    .from("scholarship_public_profiles")
    .select(
      "id, business_name, industry, region, comuna, public_description, public_instagram_handle, published_at",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const profiles: Profile[] = data ?? [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden pb-16 pt-20">
        {/* Decorative blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"
        />

        <Container className="relative text-center">
          <Link
            href="/becas-web-pyme"
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-blue-300 backdrop-blur-sm transition-colors hover:bg-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Becas Web Pyme
          </Link>

          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            <span className="text-sm font-bold uppercase tracking-widest text-yellow-400">
              Vitrina oficial
            </span>
            <Sparkles className="h-5 w-5 text-yellow-400" />
          </div>

          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Emprendimientos{" "}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              que buscan crecer
            </span>
          </h1>
          <p className="mx-auto mb-6 max-w-2xl text-lg text-slate-300">
            Estos negocios autorizaron voluntariamente aparecer aquí mientras
            participan en el programa de Becas Web Pyme de{" "}
            <strong className="text-white">Zyteron</strong>.
          </p>
          <p className="mx-auto max-w-2xl rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-xs text-slate-400 backdrop-blur-sm">
            Aparecer en esta vitrina no aumenta las posibilidades de selección
            ni representa una recomendación comercial. La selección se realiza
            según las bases publicadas.
          </p>

          {profiles.length > 0 && (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-400">
              <Store className="h-4 w-4 text-blue-400" />
              <span>
                <strong className="text-white">{profiles.length}</strong>{" "}
                {profiles.length === 1 ? "emprendimiento publicado" : "emprendimientos publicados"}
              </span>
            </div>
          )}
        </Container>
      </section>

      {/* Grid de perfiles */}
      <section className="pb-24">
        <Container>
          {profiles.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-16 text-center backdrop-blur-sm">
              <Store className="mx-auto mb-4 h-12 w-12 text-slate-500" />
              <h2 className="mb-2 text-lg font-bold text-white">
                Aún no hay emprendimientos publicados
              </h2>
              <p className="text-sm text-slate-400">
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
                const initials = getInitials(profile.business_name);
                const igHandle = profile.public_instagram_handle?.replace(
                  /^@/,
                  "",
                );

                return (
                  <article
                    key={profile.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:bg-white/10 hover:shadow-blue-900/30"
                  >
                    {/* Card top accent bar */}
                    <div
                      className={`h-1.5 w-full bg-gradient-to-r ${gradient}`}
                    />

                    <div className="flex flex-1 flex-col p-6">
                      {/* Header */}
                      <div className="mb-4 flex items-start gap-4">
                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-lg font-extrabold text-white shadow-lg`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-extrabold leading-tight text-white">
                            {profile.business_name}
                          </h2>
                          {profile.industry && (
                            <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-wide text-blue-400">
                              {profile.industry}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {profile.public_description && (
                        <p className="mb-4 flex-1 text-sm leading-relaxed text-slate-300 line-clamp-4">
                          {profile.public_description}
                        </p>
                      )}

                      {/* Footer info */}
                      <div className="mt-auto space-y-2">
                        {(profile.comuna || profile.region) && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-400" />
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
                            className="flex items-center gap-1.5 text-xs font-semibold text-pink-400 transition-colors hover:text-pink-300"
                          >
                            <Instagram className="h-3.5 w-3.5 shrink-0" />
                            @{igHandle}
                          </a>
                        )}

                        {profile.published_at && (
                          <p className="pt-1 text-[11px] text-slate-600">
                            Publicado {dateFmt.format(new Date(profile.published_at))}
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
      <section className="border-t border-white/10 bg-white/5 py-16 text-center backdrop-blur-sm">
        <Container>
          <h2 className="mb-3 text-2xl font-extrabold text-white sm:text-3xl">
            ¿Quieres aparecer aquí?
          </h2>
          <p className="mb-6 text-slate-400">
            Postula a las Becas Web Pyme de Zyteron y autoriza tu aparición en
            la vitrina pública.
          </p>
          <Link
            href="/becas-web-pyme"
            className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-sm font-extrabold text-white shadow-lg transition-all hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-900/40"
          >
            Ver el programa y postular
          </Link>
        </Container>
      </section>
    </main>
  );
}
