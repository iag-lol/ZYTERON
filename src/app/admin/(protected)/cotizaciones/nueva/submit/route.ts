import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, company, message, total, status } = body || {};

    if (!name || !email || typeof total !== "number") {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const { supabase } = createSupabaseServerClient();
    const { error } = await supabase.from("Quote").insert({
      name,
      email,
      phone,
      company,
      message,
      subtotal: total,
      discount: 0,
      total,
      status: status || "PENDING",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
