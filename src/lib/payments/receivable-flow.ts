import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { clientDatabase } from "@/lib/portal/scoped-db";
import { collectionArchive } from "@/lib/full-control/receivable-archive";
import { payableReceivable, receivablePaymentApplication } from "./receivable-flow-policy";
import {
  createReceivableProviderOrder,
  getFlowPaymentStatus,
  getReceivablePaymentByCommerce,
  receivableFlowAccount,
} from "./flow";
import { digest, openToken, sealToken, parseObservation } from "./pilot-protocol";
import { verifyPaymentObservation } from "./verified-payment";
import { PaymentTargetError } from "./invoice-payment-option";
type Intent = {
  id: string;
  user_id: string;
  receivable_id: string;
  account_hash: string;
  amount: number;
  state: string;
  commerce_order: string;
  flow_order: bigint | null;
  token_cipher: string | null;
  token_hash: string | null;
  checkout_url: string | null;
  expires_at: Date;
  payment_id: string | null;
};
function key() {
  const value = process.env.PAYMENT_TOKEN_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("PAYMENT_TOKEN_KEY_REQUIRED");
  return value;
}
const include = {
  allocations: { where: { payment: { status: "CONFIRMED" } }, select: { amount: true } },
};
export async function createReceivableCheckout(input: {
  userId: string;
  id: string;
  amount: number;
  email: string;
}) {
  const account = receivableFlowAccount();
  key();
  // RLS comprueba la identidad y el acceso al documento antes de reservar el intento.
  await clientDatabase(input.userId, async (db) => {
    payableReceivable(
      await db.receivable.findFirst({ where: { id: input.id, clientId: input.userId }, include }),
      input.userId,
      input.amount,
    );
  });
  const claim = await prisma.$transaction(async (db) => {
    await db.$queryRaw`SELECT id FROM "Receivable" WHERE id=${input.id} AND "clientId"=${input.userId} FOR UPDATE`;
    const bill = await db.receivable.findFirst({
      where: { id: input.id, clientId: input.userId },
      include,
    });
    payableReceivable(bill, input.userId, input.amount);
    const existing = await db.$queryRaw<
      Intent[]
    >`SELECT * FROM zyteron_receivable_flow WHERE receivable_id=${input.id} AND account_hash=${account} AND state IN ('CREATING','UNKNOWN','PENDING') FOR UPDATE`;
    if (existing[0]) return { intent: existing[0], created: false, description: bill!.description };
    const id = randomUUID(),
      commerce = `ZYT-COBRO-${id}`;
    const rows = await db.$queryRaw<
      Intent[]
    >`INSERT INTO zyteron_receivable_flow(id,receivable_id,user_id,account_hash,amount,state,commerce_order) VALUES(${id}::uuid,${input.id},${input.userId},${account},${input.amount},'CREATING',${commerce}) RETURNING *`;
    return { intent: rows[0], created: true, description: bill!.description };
  });
  const r = claim.intent;
  if (!claim.created) {
    if (
      r.state === "PENDING" &&
      r.token_cipher &&
      r.checkout_url &&
      r.amount === input.amount &&
      r.expires_at > new Date()
    )
      return { checkoutUrl: checkout(r), amount: r.amount };
    if (r.state === "PENDING" && r.token_cipher) {
      await reconcileReceivableToken(openToken(r.token_cipher, r.id, key()));
      throw new PaymentTargetError(
        "El intento anterior se está verificando. Actualiza el cobro para continuar.",
      );
    }
    throw new PaymentTargetError(
      "El intento anterior está en verificación. No se generará un cobro duplicado.",
    );
  }
  try {
    const remote = await createReceivableProviderOrder({
      intentId: r.id,
      amount: r.amount,
      email: input.email,
      subject: `Zyteron · ${claim.description}`,
      commerceOrder: r.commerce_order,
    });
    const cipher = sealToken(remote.token, r.id, key());
    await prisma.$executeRaw`UPDATE zyteron_receivable_flow SET state='PENDING',flow_order=${remote.flowOrder}::bigint,token_hash=${digest(remote.token)},token_cipher=${cipher},checkout_url=${remote.url},available_at=now()+interval '15 seconds' WHERE id=${r.id}::uuid AND state='CREATING'`;
    return {
      checkoutUrl: `${remote.url}?token=${encodeURIComponent(remote.token)}`,
      amount: r.amount,
    };
  } catch (error) {
    const rejected =
      error &&
      typeof error === "object" &&
      "httpStatus" in error &&
      typeof error.httpStatus === "number" &&
      [400, 401, 403, 422].includes(error.httpStatus);
    await prisma.$executeRaw`UPDATE zyteron_receivable_flow SET state=${rejected ? "REJECTED" : "UNKNOWN"},available_at=now()+interval '30 seconds' WHERE id=${r.id}::uuid AND state='CREATING'`;
    throw new Error(
      "No pudimos confirmar la creación del pago. Verificaremos este intento antes de permitir otro.",
    );
  }
}
function checkout(r: Intent) {
  return `${r.checkout_url}?token=${encodeURIComponent(openToken(r.token_cipher!, r.id, key()))}`;
}
export async function reconcileReceivableToken(token: string) {
  const rows = await prisma.$queryRaw<
    Intent[]
  >`SELECT * FROM zyteron_receivable_flow WHERE token_hash=${digest(token)}`;
  const row = rows[0];
  if (!row) throw new Error("PAYMENT_UNKNOWN");
  if (row.account_hash !== receivableFlowAccount()) throw new Error("PAYMENT_ACCOUNT_MISMATCH");
  const status = verifyPaymentObservation(
    await getFlowPaymentStatus(token),
    {
      id: row.commerce_order,
      amount: row.amount,
      flowOrder: Number(row.flow_order),
      token: openToken(row.token_cipher!, row.id, key()),
    },
    token,
  );
  return applyReceivableStatus(row, status);
}
async function applyReceivableStatus(
  row: Intent,
  status: Awaited<ReturnType<typeof getFlowPaymentStatus>>,
) {
  const proof = parseObservation({ ...status });
  if (
    proof.commerce !== row.commerce_order ||
    proof.amount !== row.amount ||
    (row.flow_order && proof.order !== Number(row.flow_order))
  )
    throw new Error("PAYMENT_OBSERVATION_MISMATCH");
  await prisma.$transaction(async (db) => {
    await db.$queryRaw`SELECT id FROM "Receivable" WHERE id=${row.receivable_id} FOR UPDATE`;
    const [r] = await db.$queryRaw<
      Intent[]
    >`SELECT * FROM zyteron_receivable_flow WHERE id=${row.id}::uuid FOR UPDATE`;
    if (r.state === "CONFIRMED") return;
    if (status.status !== 2) {
      await db.$executeRaw`UPDATE zyteron_receivable_flow SET state=${status.status === 1 ? (r.token_cipher ? "PENDING" : "UNKNOWN") : status.status === 3 ? "REJECTED" : "CANCELLED"},verified_at=now(),available_at=now()+interval '1 minute' WHERE id=${r.id}::uuid`;
      return;
    }
    const bill = await db.receivable.findFirst({
      where: { id: r.receivable_id, clientId: r.user_id },
      include,
    });
    if (!bill || bill.currency.trim() !== "CLP") throw new Error("PAYMENT_DOCUMENT_MISMATCH");
    const balance = Math.max(
      0,
      bill.totalAmount - bill.allocations.reduce((n, a) => n + a.amount, 0),
    );
    const closed =
      collectionArchive(bill.metadata)?.active === true ||
      ["CANCELLED", "CANCELED", "VOID", "VOIDED"].includes(bill.status);
    const application = receivablePaymentApplication(balance, r.amount, closed);
    const payment = await db.payment.create({
      data: {
        clientId: r.user_id,
        amount: r.amount,
        currency: "CLP",
        method: "FLOW",
        source: "PORTAL",
        status: "CONFIRMED",
        provider: "FLOW",
        providerPaymentId: String(status.flowOrder),
        commerceOrder: r.commerce_order,
        idempotencyKey: `receivable-flow:${r.id}`,
        receivedAt: new Date(proof.paidAt!),
        reference: `Flow ${status.flowOrder}`,
        metadata: {
          receivableId: bill.id,
          quoteId: bill.quoteId,
          intentId: r.id,
          unallocatedCredit: application.credit,
        },
      },
    });
    if (application.allocated > 0) {
      await db.paymentAllocation.create({
        data: { paymentId: payment.id, receivableId: bill.id, amount: application.allocated },
      });
      await db.receivable.update({
        where: { id: bill.id },
        data: {
          status: application.balance === 0 ? "PAID" : "PARTIAL",
          closedAt: application.balance === 0 ? new Date() : null,
        },
      });
    }
    await db.clientAuditLog.create({
      data: {
        targetUserId: r.user_id,
        action: "FLOW_RECEIVABLE_CONFIRMED",
        entityType: "Payment",
        entityId: payment.id,
        details: {
          receivableId: bill.id,
          amount: r.amount,
          allocated: application.allocated,
          credit: application.credit,
        },
      },
    });
    await db.clientNotification.create({
      data: {
        userId: r.user_id,
        title: "Pago recibido y confirmado",
        body: `Registramos tu pago de $${r.amount.toLocaleString("es-CL")}.`,
        link: "/clientes/panel/pagos",
      },
    });
    await db.$executeRaw`UPDATE zyteron_receivable_flow SET state='CONFIRMED',flow_order=${status.flowOrder}::bigint,payment_id=${payment.id},verified_at=now() WHERE id=${r.id}::uuid`;
  });
  return { state: status.status, id: row.receivable_id };
}
export async function runReceivableFlow() {
  await prisma.$executeRaw`UPDATE zyteron_receivable_flow SET state='UNKNOWN',available_at=now() WHERE state='CREATING' AND created_at<now()-interval '2 minutes'`;
  const rows = await prisma.$queryRaw<
    Intent[]
  >`UPDATE zyteron_receivable_flow SET available_at=now()+interval '1 minute' WHERE id IN (SELECT id FROM zyteron_receivable_flow WHERE state IN ('PENDING','UNKNOWN') AND available_at<=now() ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 3) RETURNING *`;
  for (const row of rows)
    try {
      if (row.token_cipher)
        await reconcileReceivableToken(openToken(row.token_cipher, row.id, key()));
      else if (row.account_hash === receivableFlowAccount())
        await applyReceivableStatus(row, await getReceivablePaymentByCommerce(row.commerce_order));
    } catch {
      console.error("RECEIVABLE_FLOW_RECONCILIATION_PENDING");
    }
}
