import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { customerContractDocument } from "@/lib/portal/contract-document";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(portalAuthOptions);
  if (
    !session?.user?.id ||
    session.user.role !== "CLIENT" ||
    session.user.accountStatus !== "ACTIVE" ||
    !session.user.emailVerifiedAt
  )
    return NextResponse.json({ error: "Inicia sesión para revisar tu contrato." }, { status: 401 });
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: "Contrato no encontrado." }, { status: 404 });
  try {
    const file = await customerContractDocument(session.user.id, id);
    if (!file)
      return NextResponse.json(
        { error: "Contrato no disponible para esta cuenta." },
        { status: 404 },
      );
    const filename = file.filename.replace(/[^a-zA-Z0-9._-]/g, "-");
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${new URL(request.url).searchParams.get("inline") === "1" ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "frame-ancestors 'self'",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo abrir el contrato. Intenta nuevamente." },
      { status: 503 },
    );
  }
}
