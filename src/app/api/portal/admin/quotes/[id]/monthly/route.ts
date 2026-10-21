import { NextResponse } from "next/server";
import { z } from "zod";
import { commercialAdmin, commercialError } from "@/lib/full-control/commercial-api-guard";
import { boundedJson } from "@/lib/security/public-intake";
import { monthlyPlan, configureMonthly } from "@/lib/payments/monthly-billing";
type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, { params }: Context) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  try {
    return NextResponse.json(
      { plan: await monthlyPlan(z.uuid().parse((await params).id)) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return commercialError(e);
  }
}
export async function PUT(req: Request, { params }: Context) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  try {
    const body = z
      .object({
        firstDate: z.iso.date(),
        status: z.enum(["ACTIVE", "PAUSED"]),
        reminders: z.boolean(),
      })
      .strict()
      .parse(await boundedJson(req, 1024));
    return NextResponse.json({
      plan: await configureMonthly(z.uuid().parse((await params).id), body, auth.actorId ?? null),
    });
  } catch (e) {
    return commercialError(e);
  }
}
