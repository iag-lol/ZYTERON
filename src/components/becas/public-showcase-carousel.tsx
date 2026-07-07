"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, AtSign, ChevronLeft, ChevronRight, MapPin, Store } from "lucide-react";
import type { PublishedScholarshipProfile } from "@/lib/becas/public-profiles";

type PublicShowcaseCarouselProps = {
  profiles: PublishedScholarshipProfile[];
  title: string;
  description: string;
  badge?: string;
  ctaHref?: string;
  ctaLabel?: string;
  className?: string;
};

const dateFmt = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function PublicShowcaseCarousel({
  profiles,
  title,
  description,
  badge = "Vitrina destacada",
  ctaHref = "/becas-web-pyme/vitrina",
  ctaLabel = "Ver vitrina completa",
  className = "",
}: PublicShowcaseCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (profiles.length <= 1) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % profiles.length);
    }, 4800);

    return () => window.clearInterval(interval);
  }, [profiles.length]);

  if (!profiles.length) return null;

  const currentIndex = activeIndex % profiles.length;
  const activeProfile = profiles[currentIndex] ?? profiles[0];
  const instagramHandle = activeProfile.publicInstagramHandle?.replace(/^@/, "");

  return (
    <section className={className}>
      <div className="overflow-hidden rounded-[2rem] border border-blue-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.96))] shadow-[0_30px_80px_-40px_rgba(29,78,216,0.35)]">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden border-b border-blue-100 p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <div
              aria-hidden
              className="absolute inset-x-10 top-0 h-32 rounded-full bg-blue-100/80 blur-3xl"
            />
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-blue-700">
                  <Store className="h-3.5 w-3.5" />
                  {badge}
                </span>
                <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  {currentIndex + 1}/{profiles.length}
                </span>
              </div>

              <h2 className="mt-5 max-w-xl text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                {title}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                {description}
              </p>

              <div className="mt-8 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((current) => {
                      const normalizedCurrent = current % profiles.length;
                      return normalizedCurrent === 0 ? profiles.length - 1 : normalizedCurrent - 1;
                    })
                  }
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-blue-200 bg-white text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700"
                  aria-label="Perfil anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIndex((current) => (current + 1) % profiles.length)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-blue-200 bg-white text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700"
                  aria-label="Perfil siguiente"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <Link
                  href={ctaHref}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-800"
                >
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {profiles.map((profile, index) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                      index === currentIndex
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                    }`}
                    aria-label={`Ver perfil de ${profile.businessName}`}
                  >
                    {profile.businessName}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <article className="flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_22px_48px_-32px_rgba(15,23,42,0.45)] sm:p-6">
              <div className="grid gap-5 sm:grid-cols-[132px_1fr]">
                <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[radial-gradient(circle_at_top,#eff6ff,white_72%)]">
                  {activeProfile.publicLogoUrl ? (
                    <Image
                      src={activeProfile.publicLogoUrl}
                      alt={`Logo de ${activeProfile.businessName}`}
                      fill
                      sizes="(max-width: 640px) 40vw, 132px"
                      className="object-contain p-5"
                    />
                  ) : (
                    <span className="text-3xl font-extrabold tracking-tight text-slate-700">
                      {getInitials(activeProfile.businessName)}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-700">
                      {activeProfile.industry || "Emprendimiento"}
                    </span>
                  </div>
                  <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">
                    {activeProfile.businessName}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {activeProfile.publicDescription || "Negocio participante en la vitrina pública de Becas Web Pyme."}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <MapPin className="h-4 w-4 text-blue-700" />
                    Ubicación
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {[activeProfile.comuna, activeProfile.region].filter(Boolean).join(", ") || "Chile"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <AtSign className="h-4 w-4 text-blue-700" />
                    Presencia pública
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {instagramHandle ? `@${instagramHandle}` : "Perfil publicado sin Instagram visible"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  {activeProfile.publishedAt
                    ? `Publicado ${dateFmt.format(new Date(activeProfile.publishedAt))}`
                    : "Perfil en vitrina pública"}
                </p>

                {instagramHandle ? (
                  <a
                    href={`https://www.instagram.com/${instagramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-pink-200 hover:text-pink-600"
                  >
                    Ver Instagram
                    <ArrowRight className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
