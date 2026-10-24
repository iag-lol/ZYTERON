import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { commercialAdmin } from "@/lib/full-control/commercial-api-guard";
import { leadEnrollmentSchema, enrollmentError } from "@/lib/full-control/lead-enrollment";
import { boundedJson, publicRateLimit } from "@/lib/security/public-intake";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  const rate = await publicRateLimit(req, "admin-lead-enrollment", 10);
  if (!rate.allowed)
    return NextResponse.json(
      { error: "Espera un minuto antes de volver a intentar." },
      { status: 429 },
    );
  try {
    const id = z.uuid().parse((await params).id);
    const body = leadEnrollmentSchema.parse(await boundedJson(req, 4096));
    const passwordHash = await hash(body.password, 12);
    const [row] = await prisma.$queryRaw<
      Array<{ result: { clientId: string; userId: string; created: boolean } }>
    >`
      SELECT public.zyteron_enroll_lead(${id}::uuid,${body.rut},${body.legalName},${body.email},${passwordHash},${auth.actorId ?? null}) AS result`;
    return NextResponse.json(
      { ...row.result, email: body.email, rut: body.rut, verificationRequired: true },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    return NextResponse.json({ error: enrollmentError(error) }, { status: 409 });
  }
}
