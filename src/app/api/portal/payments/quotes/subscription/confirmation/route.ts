import { NextResponse } from "next/server";
import { processQuoteSubscriptionChargeConfirmation } from "@/lib/payments/quote-payment-workflow";

async function extractToken(req: Request) {
  const form = await req.formData().catch(() => null);
  const token = form?.get("token");
  if (typeof token === "string" && token.trim()) return token.trim();

  const urlToken = new URL(req.url).searchParams.get("token");
  if (urlToken?.trim()) return urlToken.trim();

  const raw = await req.text().catch(() => "");
  if (raw) {
    const params = new URLSearchParams(raw);
    const bodyToken = params.get("token");
    if (bodyToken?.trim()) return bodyToken.trim();
  }

  return "";
}

async function handle(req: Request) {
  const quoteId = new URL(req.url).searchParams.get("quoteId")?.trim() || "";
  const token = await extractToken(req);
  if (!quoteId || !token) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await processQuoteSubscriptionChargeConfirmation({
    quoteId,
    token,
    req,
  });

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  try {
    return await handle(req);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
