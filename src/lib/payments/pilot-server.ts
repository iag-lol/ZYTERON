import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  checkoutUrl,
  digest,
  openToken,
  parseObservation,
  sealToken,
  signedParams,
} from "./pilot-protocol";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type Intent = {
  id: string;
  access_hash: string;
  account_fingerprint: string;
  amount: number;
  currency: string;
  payer_email: string;
  state: string;
  flow_order: number | null;
  token_hash: string | null;
  token_ciphertext: string | null;
  checkout_url: string | null;
  verified_at: string | null;
  paid_at: string | null;
  expires_at: string;
  email_state: string;
  email_lease: string | null;
};
const table = "zyteron_sandbox_payment_pilot";
function configuration() {
  if (process.env.ZYTERON_SANDBOX_ENABLED !== "true") throw new Error("PILOT_DISABLED");
  const apiKey = process.env.ZYTERON_SANDBOX_API_KEY?.trim(),
    secret = process.env.ZYTERON_SANDBOX_SECRET_KEY?.trim(),
    key = process.env.ZYTERON_SANDBOX_TOKEN_KEY?.trim(),
    origin = process.env.ZYTERON_SANDBOX_ORIGIN?.trim();
  if (!apiKey || !secret || !key || !/^[a-f0-9]{64}$/i.test(key) || !origin)
    throw new Error("PILOT_CONFIGURATION_REQUIRED");
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new Error("PILOT_ORIGIN_INVALID");
  }
  const local =
    process.env.NODE_ENV !== "production" &&
    url.protocol === "http:" &&
    ["127.0.0.1", "localhost"].includes(url.hostname);
  if (!local && (url.protocol !== "https:" || url.hostname !== "www.zyteron.cl" || url.port))
    throw new Error("PILOT_ORIGIN_INVALID");
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/")
    throw new Error("PILOT_ORIGIN_INVALID");
  return { apiKey, secret, key, origin: url.origin, account: digest(apiKey) };
}
export function pilotOrigin() {
  return configuration().origin;
}
function database() {
  return createSupabaseServerClient().supabase;
}
async function rpc<T>(name: string, args: Record<string, unknown>) {
  const { data, error } = await database().rpc(name, args);
  if (error) throw new Error("PILOT_DATABASE_OPERATION_FAILED");
  return data as T;
}
async function row(column: string, value: string) {
  const { data, error } = await database().from(table).select("*").eq(column, value).maybeSingle();
  if (error || !data) throw new Error("PILOT_ACCESS_DENIED");
  return data as Intent;
}
function check(r: Intent, expiry = true) {
  const c = configuration();
  if (
    r.account_fingerprint !== c.account ||
    r.amount !== 1000 ||
    r.currency !== "CLP" ||
    (expiry && new Date(r.expires_at).getTime() <= Date.now())
  )
    throw new Error("PILOT_ACCESS_DENIED");
  return c;
}
async function provider(method: "GET" | "POST", path: string, args: Record<string, string>) {
  const c = configuration(),
    params = { apiKey: c.apiKey, ...args },
    s = signedParams(params, c.secret),
    body = new URLSearchParams({ ...params, s });
  const response = await fetch(
    "https://sandbox.flow.cl/api" + path + (method === "GET" ? "?" + body.toString() : ""),
    {
      method,
      headers: method === "POST" ? { "content-type": "application/x-www-form-urlencoded" } : {},
      body: method === "POST" ? body : undefined,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) throw new Error("PILOT_PROVIDER_UNAVAILABLE");
  const data = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("PILOT_PROVIDER_RESPONSE_INVALID");
  return data as Record<string, unknown>;
}
export function grant(id: string, scope: "PAY" | "READ") {
  const c = configuration(),
    payload = Buffer.from(
      JSON.stringify({
        id,
        scope,
        exp: Date.now() + 30 * 60 * 1000,
        nonce: randomBytes(16).toString("hex"),
      }),
    ).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", Buffer.from(c.key, "hex"))
      .update("pilot-cookie/v1:" + payload)
      .digest("base64url")
  );
}
export function principal(cookie: string) {
  const c = configuration();
  if (!/^[A-Za-z0-9_-]{30,400}\.[A-Za-z0-9_-]{43}$/.test(cookie))
    throw new Error("PILOT_SESSION_REQUIRED");
  const [payload, signature] = cookie.split("."),
    expected = createHmac("sha256", Buffer.from(c.key, "hex"))
      .update("pilot-cookie/v1:" + payload)
      .digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "base64url")))
    throw new Error("PILOT_SESSION_REQUIRED");
  const p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    id: string;
    scope: "PAY" | "READ";
    exp: number;
  };
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(p.id) ||
    !["PAY", "READ"].includes(p.scope) ||
    !Number.isFinite(p.exp) ||
    p.exp <= Date.now()
  )
    throw new Error("PILOT_SESSION_REQUIRED");
  return p;
}
export async function openAccess(access: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(access)) throw new Error("PILOT_ACCESS_DENIED");
  const r = await row("access_hash", digest(access));
  check(r);
  return grant(r.id, "PAY");
}
export async function view(cookie: string) {
  const p = principal(cookie),
    r = await row("id", p.id);
  check(r);
  return {
    reference: r.id.slice(0, 8).toUpperCase(),
    amount: r.amount,
    currency: "CLP",
    state: r.state,
    verifiedAt: r.verified_at,
    paidAt: r.paid_at,
    emailStatus: r.email_state,
    receiptAvailable: r.state === "CONFIRMED" && Boolean(r.flow_order && r.verified_at && r.paid_at),
    canPay: p.scope === "PAY" && r.state === "NOT_STARTED",
    environment: "sandbox",
  };
}
export async function start(cookie: string, idempotencyKey: string) {
  const p = principal(cookie);
  if (p.scope !== "PAY" || !/^[A-Za-z0-9_-]{16,80}$/.test(idempotencyKey))
    throw new Error("PILOT_START_DENIED");
  const current = await row("id", p.id),
    c = check(current);
  if (!c.origin.startsWith("https:")) throw new Error("PILOT_PUBLIC_HTTPS_REQUIRED");
  const claim = await rpc<{ created: boolean; intent: Intent }>("zyteron_pilot_claim", {
    p_id: p.id,
    p_key: idempotencyKey,
    p_account: c.account,
  });
  if (!claim.created) {
    if (
      claim.intent.state === "PENDING" &&
      claim.intent.checkout_url &&
      claim.intent.token_ciphertext
    )
      return {
        checkoutUrl: checkoutUrl(
          claim.intent.checkout_url,
          openToken(claim.intent.token_ciphertext, p.id, c.key),
        ),
      };
    throw new Error("PILOT_ATTEMPT_IN_PROGRESS");
  }
  try {
    const remote = await provider("POST", "/payment/create", {
      commerceOrder: p.id,
      subject: "Zyteron · prueba de pago",
      amount: "1000",
      currency: "CLP",
      email: current.payer_email,
      urlConfirmation: c.origin + "/api/client-payment-pilot/confirmation",
      urlReturn: c.origin + "/api/client-payment-pilot/return",
      timeout: "1800",
    });
    const url = checkoutUrl(remote.url, remote.token),
      order = Number(remote.flowOrder);
    if (!Number.isSafeInteger(order) || order <= 0) throw new Error("PILOT_REFERENCE_INVALID");
    const { data, error } = await database()
      .from(table)
      .update({
        state: "PENDING",
        flow_order: order,
        token_hash: digest(String(remote.token)),
        token_ciphertext: sealToken(String(remote.token), p.id, c.key),
        checkout_url: String(remote.url),
      })
      .eq("id", p.id)
      .eq("state", "CREATING")
      .select("id")
      .maybeSingle();
    if (error || !data) throw new Error("PILOT_PERSISTENCE_FAILED");
    return { checkoutUrl: url };
  } catch {
    await database()
      .from(table)
      .update({ state: "CREATE_UNKNOWN" })
      .eq("id", p.id)
      .eq("state", "CREATING");
    throw new Error("PILOT_ATTEMPT_REQUIRES_REVIEW");
  }
}
export async function verify(id: string) {
  const r = await row("id", id),
    c = check(r, false);
  if (!r.token_ciphertext || !r.token_hash || !r.flow_order) throw new Error("PILOT_NOT_STARTED");
  const token = openToken(r.token_ciphertext, r.id, c.key);
  if (digest(token) !== r.token_hash) throw new Error("PILOT_TOKEN_INVALID");
  const observed = parseObservation(await provider("GET", "/payment/getStatusExtended", { token }));
  return rpc<Intent>("zyteron_pilot_apply", {
    p_id: id,
    p_account: c.account,
    p_order: observed.order,
    p_amount: observed.amount,
    p_currency: observed.currency,
    p_commerce: observed.commerce,
    p_state: observed.state,
    p_paid: observed.paidAt,
  });
}
export async function refresh(cookie: string) {
  const p = principal(cookie);
  await verify(p.id);
  return view(cookie);
}
export async function callback(token: string) {
  configuration();
  if (!/^[A-Za-z0-9_-]{12,200}$/.test(token)) return;
  const { data, error } = await database()
    .from(table)
    .select("id")
    .eq("token_hash", digest(token))
    .maybeSingle();
  if (error) throw new Error("PILOT_CALLBACK_NOT_STORED");
  if (!data) return;
  const saved = await database()
    .from(table)
    .update({ callback_received_at: new Date().toISOString() })
    .eq("id", data.id);
  if (saved.error) throw new Error("PILOT_CALLBACK_NOT_STORED");
}
export async function returnAccess(token: string) {
  const r = await row("token_hash", digest(token));
  check(r);
  await verify(r.id);
  return grant(r.id, "READ");
}
export async function receipt(cookie: string) {
  const p = principal(cookie),
    r = await row("id", p.id);
  check(r);
  return pdf(r);
}
async function pdf(r: Intent) {
  if (r.state !== "CONFIRMED" || !r.flow_order || !r.paid_at || !r.verified_at)
    throw new Error("PILOT_PAYMENT_NOT_CONFIRMED");
  const doc = await PDFDocument.create(),
    page = doc.addPage([595.28, 841.89]),
    font = await doc.embedFont(StandardFonts.Helvetica),
    bold = await doc.embedFont(StandardFonts.HelveticaBold),
    green = rgb(0.08, 0.22, 0.17);
  const line = (text: string, y: number, size = 12, strong = false) =>
    page.drawText(text, { x: 42, y, size, font: strong ? bold : font, color: green });
  line("zyteron.", 775, 30, true);
  line("COMPROBANTE DE PAGO DE PRUEBA", 725, 19, true);
  line("SANDBOX - NO ACREDITA UNA COMPRA REAL", 687, 13, true);
  line("Referencia: " + r.id, 635, 10);
  line("Monto verificado: $1.000 CLP", 590, 18, true);
  line(
    "Confirmado: " + new Date(r.paid_at).toLocaleString("es-CL", { timeZone: "America/Santiago" }),
    548,
    11,
  );
  line("Transaccion: " + r.flow_order, 512, 11);
  line("La transaccion fue comprobada con la API de la pasarela.", 450, 11);
  line("Este documento no es una boleta ni factura tributaria.", 428, 11);
  line("Prueba aislada. No crea ventas, saldos, DTE ni descuenta stock.", 406, 11);
  return Buffer.from(await doc.save());
}
async function email(id: string) {
  const r = await rpc<Intent | null>("zyteron_pilot_claim_email", { p_id: id });
  if (!r) return;
  let accepted: string | null = null;
  try {
    const allowed = process.env.ZYTERON_SANDBOX_PAYER_EMAIL?.trim().toLowerCase(),
      key = process.env.RESEND_API_KEY,
      from = process.env.RESEND_FROM_EMAIL;
    if (!allowed || r.payer_email.toLowerCase() !== allowed || !key || !from)
      throw new Error("PILOT_EMAIL_CONFIGURATION_REQUIRED");
    const bytes = await pdf(r),
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: "Bearer " + key,
          "content-type": "application/json",
          "idempotency-key": "zyteron-pilot/" + id,
        },
        body: JSON.stringify({
          from,
          to: [allowed],
          subject: "Zyteron · comprobante de pago de prueba",
          text: "Tu pago de prueba fue confirmado. Adjuntamos su comprobante. Es una transaccion Sandbox; no acredita una compra real ni es un DTE.",
          attachments: [
            { filename: "comprobante-zyteron-PRUEBA.pdf", content: bytes.toString("base64") },
          ],
        }),
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
    if (!response.ok) throw new Error("PILOT_EMAIL_NOT_ACCEPTED");
    const result = (await response.json()) as { id?: unknown };
    if (typeof result.id !== "string") throw new Error("PILOT_EMAIL_NOT_ACCEPTED");
    accepted = result.id;
  } finally {
    await rpc("zyteron_pilot_finish_email", {
      p_id: id,
      p_lease: r.email_lease,
      p_provider: accepted,
    });
  }
}
export async function runPilot() {
  if (process.env.ZYTERON_SANDBOX_ENABLED !== "true") return;
  const { data, error } = await database()
    .from(table)
    .select("id,state")
    .in("state", ["PENDING", "CONFIRMED"])
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw new Error("PILOT_QUEUE_UNAVAILABLE");
  for (const r of data ?? []) {
    try {
      if (r.state === "PENDING") await verify(r.id);
      await email(r.id);
    } catch {
      /* durable state is retried with the same email idempotency key */
    }
  }
}
