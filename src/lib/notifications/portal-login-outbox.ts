import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  portalLoginMessage,
  deliverPortalLoginMail,
  loginMailNeedsReview,
  type LoginMailJob,
} from "./portal-login-format";

const recipient = "contacto@zyteron.cl";

export async function recordPortalLogin(userId: string, sessionId: string, provider: string) {
  if (provider !== "credentials" && provider !== "google")
    throw Error("PORTAL_LOGIN_PROVIDER_INVALID");
  return prisma.$transaction(async (db) => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        role: true,
        accountStatus: true,
        emailVerifiedAt: true,
      },
    });
    if (!user || user.accountStatus !== "ACTIVE" || !user.emailVerifiedAt)
      throw Error("PORTAL_LOGIN_ACCOUNT_INACTIVE");
    const occurredAt = new Date();
    if (user.role === "CLIENT") {
      const message = portalLoginMessage(user, occurredAt, provider);
      await db.$executeRaw`INSERT INTO public.zyteron_portal_login_notifications(id,user_id,occurred_at,recipient,subject,body_text,body_html,provider)
        VALUES(${sessionId}::uuid,${user.id},${occurredAt},${recipient},${message.subject},${message.text},${message.html},${provider})
        ON CONFLICT(id) DO NOTHING`;
    }
    await db.user.update({ where: { id: userId }, data: { lastLoginAt: occurredAt } });
  });
}

export async function runPortalLoginNotifications() {
  const lease = randomUUID();
  const jobs = await prisma.$queryRaw<
    LoginMailJob[]
  >`UPDATE public.zyteron_portal_login_notifications
    SET state='PROCESSING',lease=${lease}::uuid,lease_until=now()+interval '2 minutes',updated_at=now()
    WHERE id IN (SELECT id FROM public.zyteron_portal_login_notifications
      WHERE (state IN ('PENDING','WAITING_CONFIGURATION') AND available_at<=now()) OR (state='PROCESSING' AND lease_until<now())
      ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 5) RETURNING *`;
  // Sequential delivery leaves room for the provider's shared account rate limit.
  for (const job of jobs) {
    let state = "PENDING",
      errorCode: string | null = null,
      providerId: string | null = null;
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const configuredSender = (
      process.env.RESEND_FROM_EMAIL ||
      process.env.RESEND_FROM ||
      ""
    ).trim();
    let attempted = false;
    try {
      if (loginMailNeedsReview(job.first_attempt_at)) {
        state = "REVIEW_REQUIRED";
        throw Error("LOGIN_EMAIL_RECONCILIATION_REQUIRED");
      }
      if (!apiKey || !(job.sender || configuredSender)) {
        state = "WAITING_CONFIGURATION";
        throw Error("LOGIN_EMAIL_CONFIGURATION_REQUIRED");
      }
      // Persist the sender before sending so retries keep an identical idempotent payload.
      const [prepared] = await prisma.$queryRaw<
        LoginMailJob[]
      >`UPDATE public.zyteron_portal_login_notifications
        SET sender=coalesce(sender,${configuredSender}),first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1
        WHERE id=${job.id}::uuid AND lease=${lease}::uuid RETURNING *`;
      if (!prepared) throw Error("LOGIN_EMAIL_LEASE_LOST");
      attempted = true;
      providerId = await deliverPortalLoginMail(prepared, apiKey);
      state = "ACCEPTED";
    } catch (error) {
      errorCode =
        error instanceof Error && /^LOGIN_EMAIL_[A-Z0-9_]+$/.test(error.message)
          ? error.message
          : "LOGIN_EMAIL_PROVIDER_UNAVAILABLE";
      console.error("PORTAL_LOGIN_NOTIFICATION_PENDING", { id: job.id, state, code: errorCode });
    }
    const delay =
      state === "WAITING_CONFIGURATION" ? 60 : Math.min(900, 15 * 2 ** Math.min(job.attempts, 6));
    await prisma.$executeRaw`UPDATE public.zyteron_portal_login_notifications
      SET state=${state},provider_id=${providerId},error_code=${errorCode},available_at=now()+(${delay}*interval '1 second'),
        accepted_at=CASE WHEN ${state}='ACCEPTED' THEN now() ELSE accepted_at END,lease=NULL,lease_until=NULL,updated_at=now()
      WHERE id=${job.id}::uuid AND lease=${lease}::uuid`;
    if (attempted) await new Promise((resolve) => setTimeout(resolve, 600));
  }
  return { processed: jobs.length };
}
