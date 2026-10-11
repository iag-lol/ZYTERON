import { readCallbackToken, enqueueCallback } from "@/lib/payments/durable-callbacks";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const token = await readCallbackToken(req);
    await enqueueCallback("QUOTE", token);
    return new Response("ok", { status: 200 });
  } catch {
    return new Response("confirmation_unavailable", {
      status: 503,
      headers: { "Retry-After": "60" },
    });
  }
}
