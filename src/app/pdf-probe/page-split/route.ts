import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const url = new URL(req.url);
  const src = await fetch(`${url.origin}/pdf-probe`).then((r) => r.arrayBuffer());
  const doc = await PDFDocument.load(src);
  if (url.searchParams.get("count") === "1") return NextResponse.json({ paginas: doc.getPageCount() });
  const page = Math.min(Math.max(Number(url.searchParams.get("p") ?? "1"), 1), doc.getPageCount());
  const out = await PDFDocument.create();
  const [copied] = await out.copyPages(doc, [page - 1]);
  out.addPage(copied);
  return new NextResponse(Buffer.from(await out.save()), { headers: { "Content-Type": "application/pdf" } });
}
