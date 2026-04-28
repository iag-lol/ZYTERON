"use client";

import { useState } from "react";
import { ArrowRight, Loader2, MessageSquare, Star } from "lucide-react";
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
    <section className="cv-auto border-y border-slate-200 bg-white py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="space-y-2 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Comentarios de clientes</p>
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Opiniones verificadas</h2>
          <p className="mx-auto max-w-2xl text-sm text-slate-600">
            Las reseñas nuevas quedan pendientes hasta que las apruebes desde admin.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {reviews.length === 0 ? (
              <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                Aún no hay comentarios aprobados.
              </div>
            ) : (
              reviews.slice(0, 6).map((review) => (
                <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900">{review.name}</p>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={`${review.id}-star-${index + 1}`}
                          className={`h-3.5 w-3.5 ${index < review.rating ? "fill-current" : "text-slate-300"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{review.comment}</p>
                  <p className="mt-3 text-xs text-slate-400">
                    {review.company || "Cliente Zyteron"} · {formatDate(review.createdAt)}
                  </p>
                </article>
              ))
            )}
          </div>

          <form onSubmit={handleReviewSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-700" />
              <h3 className="text-base font-bold text-slate-900">Deja tu comentario</h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">Se registrará con estado pendiente para moderación.</p>

            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label>Calificación</Label>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const value = index + 1;
                    return (
                      <button
                        key={`set-rating-${value}`}
                        type="button"
                        onClick={() => setRating(value)}
                        className="text-amber-500 transition-opacity hover:opacity-80"
                      >
                        <Star className={`h-5 w-5 ${value <= rating ? "fill-current" : "text-slate-300"}`} />
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
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="home-review-company">Empresa</Label>
                  <Input
                    id="home-review-company"
                    value={reviewForm.company}
                    onChange={(event) => setReviewForm((prev) => ({ ...prev, company: event.target.value }))}
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
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="home-review-service">Servicio</Label>
                  <Input
                    id="home-review-service"
                    value={reviewForm.service}
                    onChange={(event) => setReviewForm((prev) => ({ ...prev, service: event.target.value }))}
                    placeholder="Ej: Desarrollo web + SEO"
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
                  required
                />
              </div>

              <Button type="submit" disabled={submittingReview} className="w-full gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
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
