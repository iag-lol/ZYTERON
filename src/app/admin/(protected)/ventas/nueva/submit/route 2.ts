import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientId, total } = body || {};

    if (typeof total !== "number" || total <= 0) {
      return NextResponse.json({ error: "Total inválido" }, { status: 400 });
    }

    const { supabase } = createSupabaseServerClient();
    const { error } = await supabase.from("Sale").insert({
      clientId: clientId || null,
      total,
      createdAt: new Date().toISOString(),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
