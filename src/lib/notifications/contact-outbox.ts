import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/config/site";
import { sendApprovedTemplate, listWhatsappTemplates } from "@/lib/whatsapp/templates";
import { sendMetaWhatsappMessage } from "./meta-whatsapp";
import { templateFields } from "@/lib/whatsapp/template-format";
import {
  contactEmailContent,
  contactText,
  contactTemplateSummary,
  parseNotificationRecipients,
  type ContactEvent,
} from "./contact-format";
const env = (name: string) =>
  String(process.env[name] || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .trim();
type ContactMailSnapshot = ReturnType<typeof contactEmailContent> & {
  from: string;
  to: string[];
  reply_to?: string;
};
type StoredContactEvent = ContactEvent & { _emailSnapshots?: Record<string, ContactMailSnapshot> };
export type ContactSettings = {
  email_recipients: string[] | null;
  whatsapp_recipients: string[] | null;
  whatsapp_template: string | null;
  whatsapp_language: string;
  waba_id: string | null;
};
export async function contactSettings() {
  const [row] = await prisma.$queryRaw<
    ContactSettings[]
  >`SELECT email_recipients,whatsapp_recipients,whatsapp_template,whatsapp_language,waba_id FROM zyteron_contact_settings WHERE id=true`;
  return row!;
}
export async function queueContactEvent(key: string, payload: ContactEvent) {
  if (!payload.href.startsWith("/administracion/") || payload.href.startsWith("//"))
    throw Error("CONTACT_TARGET_INVALID");
  await prisma.$executeRaw`INSERT INTO zyteron_contact_events(event_key,payload) VALUES(${key},${JSON.stringify(payload)}::jsonb) ON CONFLICT(event_key) DO UPDATE SET payload=EXCLUDED.payload WHERE NOT EXISTS(SELECT 1 FROM zyteron_contact_deliveries d WHERE d.event_key=EXCLUDED.event_key)`;
}
export async function contactNotificationStatus() {
  const settings = await contactSettings();
  const emailRecipients =
    settings.email_recipients ??
    parseNotificationRecipients(
      env("RESEND_LEAD_TO_EMAIL") || env("CHECKOUT_ALERT_EMAILS") || siteConfig.contact.email,
      "EMAIL",
    );
  const whatsappRecipients =
    settings.whatsapp_recipients ??
    parseNotificationRecipients(
      env("WHATSAPP_NOTIFY_TO") || env("META_WHATSAPP_TO") || env("TWILIO_WHATSAPP_TO"),
      "WHATSAPP",
    );
  const deliveries = await prisma.$queryRaw<
    Array<{ channel: string; state: string; count: number }>
  >`SELECT channel,state,count(*)::int AS count FROM zyteron_contact_deliveries GROUP BY channel,state`;
  const recent = await prisma.$queryRaw<
    Array<Record<string, unknown>>
  >`SELECT d.id,d.channel,d.recipient,d.state,d.attempts,d.error_code,d.created_at,d.updated_at,e.payload->>'title' AS title,e.payload->>'href' AS href FROM zyteron_contact_deliveries d JOIN zyteron_contact_events e ON e.event_key=d.event_key ORDER BY d.created_at DESC LIMIT 25`;
  return {
    settings: {
      ...settings,
      email_recipients: emailRecipients,
      whatsapp_recipients: whatsappRecipients,
    },
    emailConfigured: Boolean(env("RESEND_API_KEY") && env("RESEND_FROM_EMAIL")),
    whatsappConfigured: Boolean(env("META_WHATSAPP_TOKEN") && env("META_WHATSAPP_PHONE_ID")),
    deliveries,
    recent,
  };
}
export async function runContactNotifications() {
  const settings = await contactSettings();
  const emails =
    settings.email_recipients ??
    parseNotificationRecipients(
      env("RESEND_LEAD_TO_EMAIL") || env("CHECKOUT_ALERT_EMAILS") || siteConfig.contact.email,
      "EMAIL",
    );
  const phones =
    settings.whatsapp_recipients ??
    parseNotificationRecipients(
      env("WHATSAPP_NOTIFY_TO") || env("META_WHATSAPP_TO") || env("TWILIO_WHATSAPP_TO"),
      "WHATSAPP",
    );
  await prisma.$transaction(async (db) => {
    const events = await db.$queryRaw<
      Array<{ event_key: string }>
    >`SELECT event_key FROM zyteron_contact_events WHERE expanded_at IS NULL ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 20`;
    for (const event of events) {
      for (const [channel, recipients] of [
        ["EMAIL", emails],
        ["WHATSAPP", phones],
      ] as const)
        for (const recipient of recipients)
          await db.$executeRaw`INSERT INTO zyteron_contact_deliveries(event_key,channel,recipient) VALUES(${event.event_key},${channel},${recipient}) ON CONFLICT DO NOTHING`;
      // Sin destinatarios se conserva el evento sin expandir hasta completar configuración.
      if (emails.length && phones.length)
        await db.$executeRaw`UPDATE zyteron_contact_events SET expanded_at=now() WHERE event_key=${event.event_key}`;
    }
  });
  const lease = randomUUID();
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      event_key: string;
      channel: string;
      recipient: string;
      attempts: number;
      first_attempt_at: Date | null;
    }>
  >`
    UPDATE zyteron_contact_deliveries SET state='PROCESSING',lease=${lease}::uuid,lease_until=now()+interval '2 minutes',updated_at=now()
    WHERE id IN(SELECT id FROM zyteron_contact_deliveries WHERE ((state IN ('PENDING','WAITING_CONFIGURATION') AND available_at<=now()) OR (state='PROCESSING' AND lease_until<now())) ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 6) RETURNING *`;
  const outcomes = await Promise.allSettled(
    rows.map(async (row) => {
      let state = "PENDING",
        errorCode: string | null = null,
        providerId: string | null = null,
        attempted = false;
      try {
        const [event] = await prisma.$queryRaw<
          Array<{ payload: StoredContactEvent; created_at: Date }>
        >`SELECT payload,created_at FROM zyteron_contact_events WHERE event_key=${row.event_key}`;
        if (!event) throw Error("EVENT_NOT_FOUND");
        if (
          row.first_attempt_at &&
          Date.now() - new Date(row.first_attempt_at).getTime() > 23 * 3600000
        ) {
          state = "REVIEW_REQUIRED";
          throw Error("DELIVERY_REVIEW_REQUIRED");
        }
        if (row.channel === "WHATSAPP" && row.first_attempt_at) {
          state = "REVIEW_REQUIRED";
          throw Error("WHATSAPP_SEND_UNCONFIRMED");
        }
        if (row.channel === "EMAIL") {
          const cached = event.payload._emailSnapshots?.[row.id];
          if (!env("RESEND_API_KEY") || !(cached?.from || env("RESEND_FROM_EMAIL"))) {
            state = "WAITING_CONFIGURATION";
            throw Error("EMAIL_CONFIGURATION_REQUIRED");
          }
          const content = contactEmailContent(
            event.payload,
            event.created_at,
            Boolean(row.first_attempt_at),
          );
          const email: ContactMailSnapshot = cached || {
            from: env("RESEND_FROM_EMAIL"),
            to: [row.recipient],
            ...content,
            ...(event.payload.replyTo ? { reply_to: event.payload.replyTo } : {}),
          };
          if (!cached) {
            // Freeze each delivery before sending; template changes must not alter an idempotent retry.
            const saved = await prisma.$executeRaw`UPDATE zyteron_contact_events
              SET payload=jsonb_set(payload,'{_emailSnapshots}',coalesce(payload->'_emailSnapshots','{}'::jsonb)||jsonb_build_object(${row.id}::text,${JSON.stringify(email)}::jsonb))
              WHERE event_key=${row.event_key} AND EXISTS(SELECT 1 FROM zyteron_contact_deliveries d WHERE d.id=${row.id}::uuid AND d.lease=${lease}::uuid)`;
            if (saved !== 1) throw Error("EMAIL_LEASE_LOST");
          }
          attempted = true;
          await prisma.$executeRaw`UPDATE zyteron_contact_deliveries SET first_attempt_at=coalesce(first_attempt_at,now()) WHERE id=${row.id}::uuid AND lease=${lease}::uuid`;
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env("RESEND_API_KEY")}`,
              "Content-Type": "application/json",
              "Idempotency-Key": `zyteron-contact/${row.id}`,
            },
            body: JSON.stringify({
              from: email.from,
              to: email.to,
              subject: email.subject,
              html: email.html,
              text: email.text,
              ...(email.reply_to ? { reply_to: email.reply_to } : {}),
            }),
            redirect: "error",
            signal: AbortSignal.timeout(10000),
          });
          const data = await response.json().catch(() => null);
          if (!response.ok || !data?.id) throw Error(`EMAIL_${response.status}`);
          providerId = data.id;
        } else {
          if (!env("META_WHATSAPP_TOKEN") || !env("META_WHATSAPP_PHONE_ID")) {
            state = "WAITING_CONFIGURATION";
            throw Error("WHATSAPP_CONFIGURATION_REQUIRED");
          }
          const [conversation] = await prisma.$queryRaw<
            Array<{ open: boolean }>
          >`SELECT window_expires_at>now() AS open FROM whatsapp_conversations WHERE phone=${row.recipient}`;
          if (conversation?.open) {
            attempted = true;
            await prisma.$executeRaw`UPDATE zyteron_contact_deliveries SET first_attempt_at=coalesce(first_attempt_at,now()) WHERE id=${row.id}::uuid AND lease=${lease}::uuid`;
            const result = await sendMetaWhatsappMessage(row.recipient, contactText(event.payload));
            if (!result.ok || !result.id) {
              state = "REVIEW_REQUIRED";
              throw Error("WHATSAPP_SEND_UNCONFIRMED");
            }
            providerId = result.id;
          } else {
            if (!settings.whatsapp_template) {
              state = "WAITING_CONFIGURATION";
              throw Error("APPROVED_ALERT_TEMPLATE_REQUIRED");
            }
            const template = (await listWhatsappTemplates()).find(
              (t) =>
                t.name === settings.whatsapp_template &&
                t.language === settings.whatsapp_language &&
                t.status === "APPROVED",
            );
            if (!template) {
              state = "WAITING_CONFIGURATION";
              throw Error("APPROVED_ALERT_TEMPLATE_REQUIRED");
            }
            const fields = templateFields(template);
            if (fields.length !== 1 || fields[0]!.component !== "body") {
              state = "WAITING_CONFIGURATION";
              throw Error("ALERT_TEMPLATE_ONE_BODY_PARAMETER_REQUIRED");
            }
            attempted = true;
            await prisma.$executeRaw`UPDATE zyteron_contact_deliveries SET first_attempt_at=coalesce(first_attempt_at,now()) WHERE id=${row.id}::uuid AND lease=${lease}::uuid`;
            const result = await sendApprovedTemplate(
              row.recipient,
              template.name,
              template.language,
              { [fields[0]!.key]: contactTemplateSummary(event.payload) },
            );
            providerId = result.id;
          }
        }
        state = "ACCEPTED";
      } catch (error) {
        errorCode =
          error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
            ? error.message
            : "DELIVERY_PROVIDER_UNAVAILABLE";
        if (attempted && row.channel === "WHATSAPP") state = "REVIEW_REQUIRED";
        if (state === "PENDING" && row.attempts >= 7) state = "FAILED";
      }
      await prisma.$executeRaw`UPDATE zyteron_contact_deliveries SET state=${state},provider_id=${providerId},error_code=${errorCode},attempts=attempts+${attempted ? 1 : 0},first_attempt_at=CASE WHEN ${attempted} THEN coalesce(first_attempt_at,now()) ELSE first_attempt_at END,available_at=now()+(${state === "WAITING_CONFIGURATION" ? 60 : Math.min(1800, 15 * 2 ** Math.min(row.attempts, 7))}*interval '1 second'),lease=NULL,lease_until=NULL,updated_at=now() WHERE id=${row.id}::uuid AND lease=${lease}::uuid`;
    }),
  );
  const failed = outcomes.find((r) => r.status === "rejected");
  if (failed?.status === "rejected") throw failed.reason;
}
