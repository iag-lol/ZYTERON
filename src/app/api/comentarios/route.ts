import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { insertRow } from "@/lib/admin/repository";

const commentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  company: z.string().trim().max(140).optional().or(z.literal("")),
  service: z.string().trim().max(180).optional().or(z.literal("")),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(1200),
});

function normalizeOptional(value?: string) {
  const clean = value?.trim();
  return clean ? clean : null;
}

function isMissingClientReviewTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("pgrst205") ||
    normalized.includes("clientreview") ||
    normalized.includes("client_review") ||
    normalized.includes("could not find the table")
  );
}

async function insertClientReview(payload: Record<string, unknown>) {
  try {
    await insertRow("ClientReview", payload, "id");
    return;
  } catch (primaryError) {
    if (!isMissingClientReviewTableError(primaryError)) {
      throw primaryError;
    }
  }

  await insertRow("client_review", payload, "id");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({ error: issue?.message || "Datos inválidos" }, { status: 400 });
    }

    const data = parsed.data;
    const reviewId = randomUUID();
    await insertClientReview({
      id: reviewId,
      name: data.name,
      email: normalizeOptional(data.email),
      company: normalizeOptional(data.company),
      service: normalizeOptional(data.service),
      rating: data.rating,
      comment: data.comment,
      status: "PENDING",
      source: "WEB",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, reference: reviewId.slice(0, 8).toUpperCase() });
  } catch (error) {
    if (isMissingClientReviewTableError(error)) {
      return NextResponse.json(
        {
          error:
            "La tabla de comentarios (ClientReview) no está disponible en Supabase. Ejecuta el SQL de bootstrap de comentarios y vuelve a intentar.",
        },
        { status: 500 },
      );
    }

    const message = error instanceof Error ? error.message : "No se pudo enviar tu comentario.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
