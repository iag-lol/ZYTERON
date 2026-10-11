import { siteAccessResponse } from "@/lib/payments/site-access";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    return await siteAccessResponse(req);
  } catch {
    return new Response("Service temporarily unavailable", { status: 503 });
  }
}
