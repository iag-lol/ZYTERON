"use client";

import { useState } from "react";
import { ArrowRight, Loader2, MessageSquare, Quote, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PublicReview } from "@/lib/web-control-types";

type Props = {
  reviews: PublicReview[];
};

type ReviewSubmitState =
  | { status: "idle" }
  | { status: "success"; reference: string }
  | { status: "error"; message: string };

function formatDate(value?: string | null) {
  if (!value) return "Reciente";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Reciente";
  return parsed.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ClientReviewsSection({ reviews }: Props) {
  const [reviewState, setReviewState] = useState<ReviewSubmitState>({ status: "idle" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewForm, setReviewForm] = useState({
    name: "",
    email: "",
    company: "",
    service: "",
    comment: "",
  });
  async function handleReviewSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewForm.name.trim() || reviewForm.comment.trim().length < 10) {
      setReviewState({ status: "error", message: "Completa tu nombre y un comentario más detallado." });
      return;
    }

    setSubmittingReview(true);
    setReviewState({ status: "idle" });

    const response = await fetch("/api/comentarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...reviewForm,
        rating,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      reference?: string;
    };

    if (!response.ok || !payload.ok) {
      setReviewState({
        status: "error",
        message: payload.error || "No se pudo enviar tu comentario.",
      });
      setSubmittingReview(false);
      return;
    }

    setReviewState({ status: "success", reference: payload.reference || "RECIBIDO" });
    setSubmittingReview(false);
    setReviewForm({
      name: "",
      email: "",
      company: "",
      service: "",
      comment: "",
    });
    setRating(5);
  }

  return (
    <section className="cv-auto relative overflow-hidden border-y border-slate-200 bg-hero-pattern py-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 text-center">
          <div className="badge-blue mx-auto w-fit">
            <MessageSquare className="h-3.5 w-3.5" />
            Comentarios de clientes
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Opiniones <span className="text-gradient-hero">verificadas</span>
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Publicamos solo reseñas moderadas para mantener transparencia y calidad en cada testimonio.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-3xl border border-slate-200/70 bg-white/85 p-5 shadow-[0_15px_45px_-24px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {reviews.length === 0 ? (
                <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-sm text-slate-500">
                  Aún no hay comentarios aprobados.
                </div>
              ) : (
                reviews.slice(0, 6).map((review, index) => (
                  <article
                    key={review.id}
                    className={`rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      index === 0 ? "sm:col-span-2" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{review.name}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {review.company || "Cliente Zyteron"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-1.5 text-blue-700">
                        <Quote className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: 5 }).map((_, starIndex) => (
                        <Star
                          key={`${review.id}-star-${starIndex + 1}`}
                          className={`h-3.5 w-3.5 ${starIndex < review.rating ? "fill-current" : "text-slate-300"}`}
                        />
                      ))}
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{review.comment}</p>
                    <p className="mt-4 text-xs text-slate-400">{formatDate(review.createdAt)}</p>
                  </article>
                ))
              )}
            </div>
          </div>

          <form
            onSubmit={handleReviewSubmit}
            className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_-26px_rgba(30,64,175,0.45)] sm:p-7"
          >
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-100 p-1.5 text-blue-700">
                <MessageSquare className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Deja tu comentario</h3>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Tu reseña quedará pendiente hasta ser aprobada por nuestro equipo.
            </p>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label>Calificación</Label>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const value = index + 1;
                    return (
                      <button
                        key={`set-rating-${value}`}
                        type="button"
                        onClick={() => setRating(value)}
                        className={`rounded-lg border p-1.5 transition-all ${
                          value <= rating
                            ? "border-amber-300 bg-amber-50 text-amber-500"
                            : "border-slate-200 text-slate-300 hover:border-slate-300 hover:text-slate-500"
                        }`}
                      >
                        <Star className={`h-4 w-4 ${value <= rating ? "fill-current" : ""}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="home-review-name">Nombre</Label>
                  <Input
                    id="home-review-name"
                    value={reviewForm.name}
                    onChange={(event) => setReviewForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="border-slate-200 bg-white/90 focus-visible:ring-blue-500"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="home-review-company">Empresa</Label>
                  <Input
                    id="home-review-company"
                    value={reviewForm.company}
                    onChange={(event) => setReviewForm((prev) => ({ ...prev, company: event.target.value }))}
                    className="border-slate-200 bg-white/90 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="home-review-email">Email</Label>
                  <Input
                    id="home-review-email"
                    type="email"
                    value={reviewForm.email}
                    onChange={(event) => setReviewForm((prev) => ({ ...prev, email: event.target.value }))}
                    className="border-slate-200 bg-white/90 focus-visible:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="home-review-service">Servicio</Label>
                  <Input
                    id="home-review-service"
                    value={reviewForm.service}
                    onChange={(event) => setReviewForm((prev) => ({ ...prev, service: event.target.value }))}
                    placeholder="Ej: Desarrollo web + SEO"
                    className="border-slate-200 bg-white/90 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="home-review-comment">Comentario</Label>
                <Textarea
                  id="home-review-comment"
                  rows={4}
                  value={reviewForm.comment}
                  onChange={(event) => setReviewForm((prev) => ({ ...prev, comment: event.target.value }))}
                  placeholder="¿Cómo fue tu experiencia con Zyteron?"
                  className="border-slate-200 bg-white/90 focus-visible:ring-blue-500"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={submittingReview}
                className="btn-primary-glow w-full gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800"
              >
                {submittingReview ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar comentario <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              {reviewState.status === "success" ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Comentario enviado. Código: <strong>{reviewState.reference}</strong>.
                </div>
              ) : null}

              {reviewState.status === "error" ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {reviewState.message}
                </div>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
