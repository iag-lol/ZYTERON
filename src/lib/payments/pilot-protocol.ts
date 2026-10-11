import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { normalizeProviderPayment } from "./provider-money";
import { Temporal } from "@js-temporal/polyfill";

export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function signedParams(params: Record<string, string>, secret: string) {
  return createHmac("sha256", secret)
    .update(
      Object.keys(params)
        .sort()
        .map((key) => key + params[key])
        .join(""),
    )
    .digest("hex");
}
export function sealToken(token: string, id: string, key: string) {
  if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error("PILOT_TOKEN_PROTECTION_MISSING");
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  cipher.setAAD(Buffer.from(id));
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, encrypted, cipher.getAuthTag()]).toString("base64url");
}
export function openToken(value: string, id: string, key: string) {
  const bytes = Buffer.from(value, "base64url");
  if (bytes.length < 29 || !/^[a-f0-9]{64}$/i.test(key)) throw new Error("PILOT_TOKEN_INVALID");
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "hex"), bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(id));
  decipher.setAuthTag(bytes.subarray(-16));
  return Buffer.concat([decipher.update(bytes.subarray(12, -16)), decipher.final()]).toString(
    "utf8",
  );
}
export type PilotObservation = {
  order: number;
  commerce: string;
  amount: number;
  currency: "CLP";
  state: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  paidAt: string | null;
};
export function parseObservation(raw: Record<string, unknown>): PilotObservation {
  const data = normalizeProviderPayment(raw);
  const state = ({ 1: "PENDING", 2: "CONFIRMED", 3: "REJECTED", 4: "CANCELLED" } as const)[
    data.status as 1 | 2 | 3 | 4
  ];
  const order = data.flowOrder,
    amount = data.amount;
  if (
    typeof data.status !== "number" ||
    !state ||
    typeof order !== "number" ||
    !Number.isSafeInteger(order) ||
    order <= 0 ||
    typeof amount !== "number" ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    data.currency !== "CLP" ||
    typeof data.commerceOrder !== "string" ||
    !data.commerceOrder
  )
    throw new Error("PILOT_RESPONSE_INVALID");
  let paidAt: string | null = null;
  if (state === "CONFIRMED") {
    const p = data.paymentData as Record<string, unknown> | undefined;
    if (
      !p ||
      p.currency !== "CLP" ||
      p.amount !== amount ||
      typeof p.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(p.date)
    )
      throw new Error("PILOT_PAYMENT_NOT_PROVEN");
    try {
      paidAt = /[zZ]|[+-]\d{2}:\d{2}$/.test(p.date)
        ? Temporal.Instant.from(p.date).toString()
        : Temporal.PlainDateTime.from(p.date.replace(" ", "T"))
            .toZonedDateTime("America/Santiago", { disambiguation: "reject" })
            .toInstant()
            .toString();
    } catch {
      throw new Error("PILOT_PAYMENT_DATE_INVALID");
    }
  }
  return { order, commerce: data.commerceOrder, amount, currency: "CLP", state, paidAt };
}
export function checkoutUrl(value: unknown, token: unknown) {
  if (
    typeof value !== "string" ||
    typeof token !== "string" ||
    !/^[A-Za-z0-9_-]{12,200}$/.test(token)
  )
    throw new Error("PILOT_CHECKOUT_INVALID");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("PILOT_CHECKOUT_INVALID");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "sandbox.flow.cl" ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("PILOT_CHECKOUT_INVALID");
  url.searchParams.set("token", token);
  return url.href;
}
