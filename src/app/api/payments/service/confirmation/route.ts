import { NextResponse } from "next/server";
import { getFlowPaymentStatus } from "@/lib/payments/flow";

async function readToken(req: Request) {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const token = form?.get("token");
    if (typeof token === "string" && token.trim()) return token.trim();
  }

  const raw = await req.text().catch(() => "");
  if (raw) {
    const params = new URLSearchParams(raw);
    const token = params.get("token");
    if (token?.trim()) return token.trim();
  }

  return "";
}

export async function POST(req: Request) {
  const token = await readToken(req);
  if (!token) return new NextResponse("token_missing", { status: 200 });

  try {
    await getFlowPaymentStatus(token);
    return new NextResponse("ok", { status: 200 });
  } catch {
    return new NextResponse("error", { status: 200 });
  }
}
