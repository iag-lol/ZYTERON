import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientId, date, notes, status } = body || {};

    if (!date) {
      return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });
    }

    const { supabase } = createSupabaseServerClient();
    const { error } = await supabase.from("Visit").insert({
      clientId: clientId || null,
      date,
      notes,
      status: status || "Programada",
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
