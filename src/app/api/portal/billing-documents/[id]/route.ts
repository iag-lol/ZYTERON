import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { clientDatabase } from "@/lib/portal/scoped-db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(portalAuthOptions);
  if (
    !session?.user?.id ||
    session.user.accountStatus !== "ACTIVE" ||
    !session.user.emailVerifiedAt
  )
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });
  try {
    const [file] = await clientDatabase(
      session.user.id,
      (db) =>
        db.$queryRaw<
          Array<{ storagePath: string; fileName: string | null }>
        >`SELECT d."storagePath",d."fileName" FROM public.zyteron_billing_documents l JOIN public."ClientDocument" d ON d.id=l.document_id AND d."userId"=l.user_id WHERE l.id=${id}::uuid AND l.user_id=${session.user.id} AND d."mimeType"='application/pdf' AND d."storagePath" IS NOT NULL`,
    );
    if (!file) return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });
    const { supabase } = createSupabaseServerClient();
    const download = new URL(req.url).searchParams.get("download") === "1";
    const signed = await supabase.storage
      .from("client-files")
      .createSignedUrl(
        file.storagePath,
        90,
        download ? { download: file.fileName || "factura.pdf" } : undefined,
      );
    if (signed.error || !signed.data?.signedUrl) throw Error("FILE_UNAVAILABLE");
    return NextResponse.redirect(signed.data.signedUrl, {
      status: 307,
      headers: {
        "Cache-Control": "private,no-store,max-age=0",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo autorizar el acceso a la factura." },
      { status: 403 },
    );
  }
}
