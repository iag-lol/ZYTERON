import { readCallbackToken, enqueueCallback } from "@/lib/payments/durable-callbacks";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const token = await readCallbackToken(req);
    const quoteId = new URL(req.url).searchParams.get("quoteId") || "";
    await enqueueCallback("SUBSCRIPTION", token, quoteId);
    return new Response("ok", { status: 200 });
  } catch {
    return new Response("confirmation_unavailable", {
      status: 503,
      headers: { "Retry-After": "60" },
    });
  }
}
