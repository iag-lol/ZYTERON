import { NextResponse } from "next/server";
import { z } from "zod";
import { commercialAdmin, commercialError } from "@/lib/full-control/commercial-api-guard";
import { boundedJson } from "@/lib/security/public-intake";
import { monthlyPlan, configureMonthly } from "@/lib/payments/monthly-billing";
import {
  collectionSettings,
  collectionEligibility,
  monthlyContinuity,
} from "@/lib/payments/collection-settings";
async function response(id: string) {
  const [plan, settings, eligibility, continuity] = await Promise.all([
    monthlyPlan(id),
    collectionSettings(id),
    collectionEligibility(id),
    monthlyContinuity(id),
  ]);
  return { plan, settings, eligibility, continuity };
}
type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, { params }: Context) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  try {
    return NextResponse.json(await response(z.uuid().parse((await params).id)), {
      headers: { "cache-control": "no-store" },
    });
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
        status: z.enum(["DRAFT", "ACTIVE", "PAUSED"]),
        chargeDay: z.number().int().min(1).max(31),
        suspensionEnabled: z.boolean(),
        graceDays: z.number().int().min(0).max(90),
        revision: z.number().int().min(0),
        reminders: z.boolean(),
      })
      .strict()
      .parse(await boundedJson(req, 1024));
    const id = z.uuid().parse((await params).id);
    await configureMonthly(id, body, auth.actorId ?? null);
    return NextResponse.json(await response(id));
  } catch (e) {
    return commercialError(e);
  }
}
