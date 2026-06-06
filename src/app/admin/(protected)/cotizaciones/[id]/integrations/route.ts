import { NextResponse } from "next/server";
import { getQuoteById, updateRowsWithFallback } from "@/lib/admin/repository";
import {
  appendQuoteRequestError,
  isQuoteRequestMeta,
  sendQuoteRequestEmail,
  sendQuoteRequestWhatsapp,
  serializeQuoteRequestMeta,
} from "@/lib/quote-requests";

type Channel = "email" | "whatsapp";

function normalizeChannel(value: unknown): Channel | null {
  const channel = String(value || "").trim().toLowerCase();
  if (channel === "email" || channel === "whatsapp") return channel;
  return null;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const body = (await request.json().catch(() => ({}))) as { channel?: string };
    const channel = normalizeChannel(body.channel);

    if (!channel) {
      return NextResponse.json({ ok: false, error: "Canal invalido." }, { status: 400 });
    }

    const quote = await getQuoteById(id);
    const meta = quote?.meta;

    if (!quote || !isQuoteRequestMeta(meta)) {
      return NextResponse.json({ ok: false, error: "La solicitud no existe." }, { status: 404 });
    }

    let updatedMeta = { ...meta };

    if (channel === "email") {
      const result = await sendQuoteRequestEmail(updatedMeta, id);
      if (result.sent) {
        updatedMeta = {
          ...updatedMeta,
          emailStatus: "sent",
          resendMessageId: result.messageId,
        };
      } else {
        updatedMeta = appendQuoteRequestError(
          {
            ...updatedMeta,
            emailStatus: "failed",
          },
          "email",
          result.error,
        );
      }
    }

    if (channel === "whatsapp") {
      const result = await sendQuoteRequestWhatsapp(updatedMeta, id);
      if (result.sent) {
        updatedMeta = {
          ...updatedMeta,
          whatsappStatus: "sent",
          twilioMessageId: result.messageId,
        };
      } else {
        updatedMeta = appendQuoteRequestError(
          {
            ...updatedMeta,
            whatsappStatus: "failed",
          },
          "whatsapp",
          result.error,
        );
      }
    }

    await updateRowsWithFallback("Quote", { message: serializeQuoteRequestMeta(updatedMeta) }, { id });

    return NextResponse.json({
      ok: true,
      channel,
      emailStatus: updatedMeta.emailStatus,
      whatsappStatus: updatedMeta.whatsappStatus,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "No se pudo reenviar la notificacion.",
      },
      { status: 500 },
    );
  }
}
