import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { prisma } from "@/lib/prisma";
import { logPortalAdminAction } from "@/lib/portal/audit";

const optionalId = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
  z.string().max(100).optional(),
);

const optionalText = (maxLength: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
    z.string().max(maxLength).optional(),
  );

const optionalHttpsUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
  z
    .string()
    .url()
    .max(2_000)
    .refine((value) => value.startsWith("https://"), "La URL debe usar HTTPS.")
    .optional(),
);

const bodySchema = z
  .object({
    clientId: z.string().trim().min(1).max(100),
    projectId: optionalId,
    quoteId: optionalId,
    saleId: optionalId,
    type: z.enum(["Factura afecta", "Factura exenta", "Boleta afecta", "Boleta exenta"]),
    documentNumber: optionalText(100),
    siiFolio: optionalText(100),
    issueDate: z.coerce.date(),
    dueDate: z.preprocess(
      (value) => (typeof value === "string" && value.trim() ? value : undefined),
      z.coerce.date().optional(),
    ),
    netAmount: z.coerce.number().int().nonnegative().max(2_147_483_647),
    taxAmount: z.coerce.number().int().nonnegative().max(2_147_483_647),
    totalAmount: z.coerce.number().int().positive().max(2_147_483_647),
    status: z.enum(["Borrador", "Emitida", "Aceptada", "Rechazada", "Anulada"]),
    emissionMethod: z.enum(["Registro interno", "SII manual", "Proveedor DTE", "API propia"]),
    pdfUrl: optionalHttpsUrl,
    xmlUrl: optionalHttpsUrl,
    notes: optionalText(4_000),
  })
  .superRefine((value, context) => {
    if (value.totalAmount !== value.netAmount + value.taxAmount) {
      context.addIssue({
        code: "custom",
        path: ["totalAmount"],
        message: "El total debe coincidir exactamente con neto más IVA.",
      });
    }
    const isExempt = value.type.includes("exenta");
    if (isExempt && value.taxAmount !== 0) {
      context.addIssue({
        code: "custom",
        path: ["taxAmount"],
        message: "Un documento exento no puede incluir IVA.",
      });
    }
    if (value.dueDate && value.dueDate.getTime() < value.issueDate.getTime()) {
      context.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "El vencimiento no puede ser anterior a la emisión.",
      });
    }
    if (value.status !== "Borrador" && !value.documentNumber && !value.siiFolio) {
      context.addIssue({
        code: "custom",
        path: ["documentNumber"],
        message: "Un documento emitido debe tener número interno o folio SII.",
      });
    }
  });

function normalizeStatus(value: string) {
  return value.trim().toUpperCase();
}

export async function POST(request: Request) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;

  try {
    const input = bodySchema.parse(await request.json());
    const result = await prisma.$transaction(async (tx) => {
      const [client, quote, project, sale] = await Promise.all([
        tx.user.findUnique({ where: { id: input.clientId }, select: { id: true, role: true } }),
        input.quoteId
          ? tx.quote.findUnique({
              where: { id: input.quoteId },
              select: { id: true, userId: true, processId: true },
            })
          : null,
        input.projectId
          ? tx.project.findUnique({
              where: { id: input.projectId },
              select: { id: true, clientId: true, processId: true },
            })
          : null,
        input.saleId
          ? tx.sale.findUnique({
              where: { id: input.saleId },
              select: { id: true, clientId: true, processId: true },
            })
          : null,
      ]);

      if (!client || client.role !== "CLIENT") {
        throw new Error("El cliente seleccionado no existe o no es una cuenta cliente.");
      }
      if (input.quoteId && (!quote || quote.userId !== input.clientId)) {
        throw new Error("La cotización seleccionada no pertenece al cliente.");
      }
      if (input.projectId && (!project || project.clientId !== input.clientId)) {
        throw new Error("El proyecto seleccionado no pertenece al cliente.");
      }
      if (input.saleId && (!sale || sale.clientId !== input.clientId)) {
        throw new Error("La venta seleccionada no pertenece al cliente.");
      }

      const processIds = [quote?.processId, project?.processId, sale?.processId].filter(
        (value): value is string => Boolean(value),
      );
      if (new Set(processIds).size > 1) {
        throw new Error("Los registros seleccionados pertenecen a expedientes diferentes.");
      }
      const processId = processIds[0] || null;

      const document = await tx.taxDocument.create({
        data: {
          clientId: input.clientId,
          projectId: input.projectId,
          quoteId: input.quoteId,
          saleId: input.saleId,
          processId,
          type: input.type,
          documentNumber: input.documentNumber,
          siiFolio: input.siiFolio,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          netAmount: input.netAmount,
          taxAmount: input.taxAmount,
          totalAmount: input.totalAmount,
          status: input.status,
          paymentStatus: input.status === "Anulada" ? "Anulada" : "Pendiente",
          emissionMethod: input.emissionMethod,
          pdfUrl: input.pdfUrl,
          xmlUrl: input.xmlUrl,
          notes: input.notes,
        },
        select: { id: true },
      });

      if (input.status !== "Anulada") {
        const existingReceivables = input.quoteId
          ? await tx.receivable.findMany({
              where: {
                clientId: input.clientId,
                quoteId: input.quoteId,
                status: { notIn: ["CANCELLED", "CANCELED", "VOIDED"] },
              },
              orderBy: [{ issuedAt: "asc" }, { createdAt: "asc" }],
              select: {
                id: true,
                taxDocumentId: true,
                totalAmount: true,
                allocations: {
                  where: { payment: { status: "CONFIRMED" } },
                  select: { amount: true },
                },
              },
            })
          : [];

        if (existingReceivables.length > 0) {
          if (
            existingReceivables.some(
              (receivable) => receivable.taxDocumentId && receivable.taxDocumentId !== document.id,
            )
          ) {
            throw new Error(
              "La obligación de esta cotización ya está vinculada a otro documento tributario.",
            );
          }
          const stagedTotal = existingReceivables.reduce(
            (sum, receivable) => sum + receivable.totalAmount,
            0,
          );
          if (existingReceivables.length > 1 && stagedTotal !== input.totalAmount) {
            throw new Error(
              "El total del documento no coincide con la suma de los hitos de cobro de la cotización.",
            );
          }
          const appliedToSingle =
            existingReceivables[0]?.allocations.reduce(
              (sum, allocation) => sum + allocation.amount,
              0,
            ) || 0;
          if (existingReceivables.length === 1 && appliedToSingle > input.totalAmount) {
            throw new Error(
              "El total del documento no puede ser menor que los pagos ya conciliados.",
            );
          }
          await Promise.all(
            existingReceivables.map((receivable) =>
              tx.receivable.update({
                where: { id: receivable.id },
                data: {
                  taxDocumentId: document.id,
                  projectId: input.projectId,
                  saleId: input.saleId,
                  processId,
                  description:
                    existingReceivables.length === 1
                      ? `${input.type}${input.documentNumber ? ` ${input.documentNumber}` : ""}`
                      : undefined,
                  totalAmount: existingReceivables.length === 1 ? input.totalAmount : undefined,
                  issuedAt: input.issueDate,
                  dueAt: input.dueDate,
                },
              }),
            ),
          );
        } else {
          await tx.receivable.create({
            data: {
              sourceKey: `tax-document:${document.id}`,
              clientId: input.clientId,
              processId,
              quoteId: input.quoteId,
              saleId: input.saleId,
              projectId: input.projectId,
              taxDocumentId: document.id,
              description: `${input.type}${input.documentNumber ? ` ${input.documentNumber}` : ""}`,
              kind: "INVOICE",
              currency: "CLP",
              totalAmount: input.totalAmount,
              status: input.dueDate && input.dueDate.getTime() < Date.now() ? "OVERDUE" : "PENDING",
              issuedAt: input.issueDate,
              dueAt: input.dueDate,
            },
          });
        }
      }

      if (processId && ["EMITIDA", "ACEPTADA"].includes(normalizeStatus(input.status))) {
        const process = await tx.clientProcess.findUnique({
          where: { id: processId },
          select: { stage: true },
        });
        if (process && !["COLLECTION", "CLOSED"].includes(process.stage)) {
          await tx.clientProcess.update({
            where: { id: processId },
            data: {
              stage: "INVOICING",
              nextAction: "Conciliar pagos y controlar saldo pendiente",
              version: { increment: 1 },
            },
          });
          await tx.clientProcessEvent.create({
            data: {
              processId,
              actorId: auth.legacy ? null : auth.session.user.id,
              eventType: "TAX_DOCUMENT_CREATED",
              fromStage: process.stage,
              toStage: "INVOICING",
              title: `${input.type} registrada`,
              notes: "Documento tributario vinculado a la cuenta por cobrar del expediente.",
              metadata: { taxDocumentId: document.id },
            },
          });
        }
      }

      return document;
    });

    await logPortalAdminAction({
      actorId: auth.legacy ? null : auth.session.user.id,
      targetUserId: input.clientId,
      action: "TAX_DOCUMENT_CREATED",
      entityType: "TaxDocument",
      entityId: result.id,
      details: { status: input.status, totalAmount: input.totalAmount },
    });

    return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message || "Los datos del documento no son válidos.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "No se pudo registrar el documento.";
    console.error("[admin/tax-documents] create failed", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
