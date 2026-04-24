import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LookupResponse = {
  found: boolean;
  client?: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    rut?: string | null;
    address?: string | null;
    city?: string | null;
    contactName?: string | null;
  };
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.trim();

    if (!email) {
      return NextResponse.json<LookupResponse>({ found: false });
    }

    const { supabase } = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("User")
      .select("id, name, email, phone, company, rut, address, city, contactName, role, createdAt")
      .ilike("email", email)
      .order("createdAt", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json<LookupResponse>({ found: false });
    }

    const match = (data ?? []).find((row) => !row.role || row.role === "CLIENT") ?? null;
    if (!match) {
      return NextResponse.json<LookupResponse>({ found: false });
    }

    return NextResponse.json<LookupResponse>({
      found: true,
      client: {
        id: match.id,
        name: match.name,
        email: match.email,
        phone: match.phone,
        company: match.company,
        rut: match.rut,
        address: match.address,
        city: match.city,
        contactName: match.contactName,
      },
    });
  } catch {
    return NextResponse.json<LookupResponse>({ found: false });
  }
}
