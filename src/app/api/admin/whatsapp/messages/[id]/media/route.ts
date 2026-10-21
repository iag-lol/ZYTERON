import { mediaHandlers } from "@/lib/whatsapp/media-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  return mediaHandlers.GET(req, (await context.params).id);
}
