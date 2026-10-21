import { NextResponse } from "next/server";
import { z } from "zod";
import { commercialAdmin, commercialError } from "@/lib/full-control/commercial-api-guard";
import { prepareLeadQuote } from "@/lib/full-control/quote-commercial";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  try {
    return NextResponse.json(
      await prepareLeadQuote(z.uuid().parse((await params).id), auth.actorId ?? null),
    );
  } catch (e) {
    return commercialError(e);
  }
}
