import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getPortalSession } from "@/lib/auth/portal-session";
import { prisma } from "@/lib/prisma";
import {
  manualOrder,
  manualFailure,
  ManualError,
  type ManualDraft,
} from "@/lib/manual-quote/server";
import { clp } from "@/config/pricing";
export async function GET(req: Request) {
  try {
    const requested = new URL(req.url).searchParams.get("order");
    let order, draft: ManualDraft;
    if (requested) {
      const session = await getPortalSession();
      if (
        !session?.user.id ||
        !session.user.emailVerifiedAt ||
        session.user.accountStatus !== "ACTIVE"
      )
        throw new ManualError("Inicia sesión para consultar tu documento.", 401);
      const found = await prisma.quote.findFirst({
        where: { id: requested, userId: session.user.id },
      });
      if (!found) throw new ManualError("Documento no disponible.", 404);
      order = found;
      const meta = JSON.parse(order.message || "{}");
      draft = meta.type === "MANUAL_QUOTE" ? meta : meta.manualQuote;
    } else ({ order, draft } = await manualOrder());
    const expected = new URL(req.url).searchParams.get("draft");
    if (expected && expected !== order.id)
      throw new ManualError("La cotización activa cambió. Recarga para descargar su alcance.", 409);
    if (!draft?.snapshot) throw new ManualError("Documento no disponible.", 404);
    const q = draft.snapshot,
      pdf = await PDFDocument.create(),
      font = await pdf.embedFont(StandardFonts.Helvetica),
      bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage([595, 842]),
      y = 770;
    const text = (s: string) =>
      s
        .replace(/[–—]/g, "-")
        .replace(/→/g, ">")
        .replace(/[^\x20-\x7e\xa0-\xff\n]/g, "");
    function draw(value: string, size = 10, strong = false) {
      const f = strong ? bold : font;
      for (const para of text(value).split("\n")) {
        const words = para.split(/\s+/);
        let line = "";
        for (const word of words) {
          const next = line ? line + " " + word : word;
          if (f.widthOfTextAtSize(next, size) > 490 && line) {
            render(line);
            line = word;
          } else line = next;
        }
        render(line);
      }
      y -= 7;
      function render(line: string) {
        if (y < 65) {
          page = pdf.addPage([595, 842]);
          y = 775;
        }
        page.drawText(line, { x: 52, y, size, font: f, color: rgb(0.12, 0.22, 0.16) });
        y -= size * 1.5;
      }
    }
    draw("ZYTERON", 24, true);
    draw("ALCANCE Y PRECIO DEL PROYECTO", 12, true);
    draw(`Referencia: ${order.id.slice(0, 8).toUpperCase()} | Catálogo: ${q.version}`);
    draw(
      `Fecha: ${new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(draft.createdAt)).replace(/\//g, "-")}`,
    );
    draw(`Cliente: ${order.name} | Correo: ${order.email}`);
    draw(
      draft.acceptedAt
        ? "Alcance aceptado al preparar el pago. Este documento no acredita un pago ni reemplaza el documento tributario."
        : "Cotización en preparación. No constituye una compra ni acredita un pago.",
    );
    draw(q.base.name, 17, true);
    draw(`Plan base: ${clp(q.base.amount)} netos`, 11, true);
    q.base.includes.forEach((s) => draw("- " + s));
    draw("No incluye: " + q.base.excludes.join(" "));
    for (const a of q.addons) {
      draw(`${a.name} x ${a.quantity}`, 13, true);
      draw(`Precio neto unitario: ${clp(a.amount)} | Total neto: ${clp(a.lineTotal)}`);
      draw(a.scope);
      draw("No incluye: " + a.excludes);
      draw(`Plazo adicional: ${a.days * a.quantity} días hábiles.`);
    }
    draw("RESUMEN ECONÓMICO", 14, true);
    draw(
      `Subtotal neto: ${clp(q.net)}\nIVA (19%): ${clp(q.tax)}\nTotal a pagar: ${clp(q.total)} CLP`,
      12,
      true,
    );
    draw(`Plazo total: ${q.days.join(" a ")} días hábiles`, 12, true);
    draw("CONDICIONES DEL ALCANCE", 14, true);
    Object.values(q.terms).forEach((s) => draw(s));
    draw(
      "Vigencia: 7 días desde el inicio de la cotización, sujeta a catálogo vigente antes de aceptar el pago. Los cambios se acuerdan por escrito antes de su ejecución.",
    );
    const pages = pdf.getPages();
    pages.forEach((p, i) =>
      p.drawText(
        `www.zyteron.cl | Ref. ${order.id.slice(0, 8).toUpperCase()} | ${i + 1} / ${pages.length}`,
        { x: 52, y: 35, font, size: 9, color: rgb(0.35, 0.4, 0.33) },
      ),
    );
    return new Response(Buffer.from(await pdf.save()), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Zyteron-alcance-${order.id.slice(0, 8)}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    return manualFailure(error);
  }
}
