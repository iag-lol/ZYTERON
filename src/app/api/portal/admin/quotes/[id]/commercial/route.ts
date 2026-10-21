import { NextResponse } from "next/server";
import { z } from "zod";
import { boundedJson } from "@/lib/security/public-intake";
import { commercialAdmin, commercialError } from "@/lib/full-control/commercial-api-guard";
import { quoteCommercial, editQuote, linkQuoteClient } from "@/lib/full-control/quote-commercial";
import { quoteEditSchema } from "@/lib/full-control/quote-edit-model";
type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, { params }: Context) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  try {
    return NextResponse.json(await quoteCommercial(z.uuid().parse((await params).id)), {
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    return commercialError(e);
  }
}
export async function PATCH(req: Request, { params }: Context) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  try {
    return NextResponse.json(
      await editQuote(
        z.uuid().parse((await params).id),
        quoteEditSchema.parse(await boundedJson(req, 200000)),
        auth.actorId ?? null,
      ),
    );
  } catch (e) {
    return commercialError(e);
  }
}
export async function POST(req: Request, { params }: Context) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  try {
    const body = z
      .object({ clientId: z.uuid() })
      .strict()
      .parse(await boundedJson(req, 1024));
    return NextResponse.json(
      await linkQuoteClient(z.uuid().parse((await params).id), body.clientId, auth.actorId ?? null),
    );
  } catch (e) {
    return commercialError(e);
  }
}
