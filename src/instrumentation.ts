export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.RENDER_SERVICE_ID) {
    const { assertFlowCheckoutReady, checkFlowConnection } = await import("./lib/payments/flow");
    let checkoutReady = false;
    try {
      assertFlowCheckoutReady();
      checkoutReady = true;
    } catch {
      /* No secrets in readiness logs. */
    }
    console.info(
      "MANUAL_QUOTE_READINESS",
      JSON.stringify({
        checkoutReady,
        paymentWorker: process.env.PAYMENT_WORKER_ENABLED === "true",
        emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
        whatsappConfigured: Boolean(
          process.env.META_WHATSAPP_TOKEN && process.env.META_WHATSAPP_PHONE_ID,
        ),
      }),
    );
    // Una caída del proveedor no debe impedir el arranque de la web.
    void checkFlowConnection()
      .then((result) => console.info("FLOW_CONNECTION_CHECK", JSON.stringify(result)))
      .catch((error: unknown) =>
        console.warn(
          "FLOW_CONNECTION_CHECK",
          JSON.stringify({
            authenticated: false,
            httpStatus:
              error &&
              typeof error === "object" &&
              "httpStatus" in error &&
              typeof error.httpStatus === "number"
                ? error.httpStatus
                : null,
          }),
        ),
      );
  }
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runPortalLoginNotifications } = await import("./lib/notifications/portal-login-outbox");
    let busy = false;
    let ready = false;
    const tick = () => {
      if (busy) return;
      busy = true;
      void runPortalLoginNotifications()
        .then(() => {
          if (!ready) {
            console.info("PORTAL_LOGIN_NOTIFICATIONS_READY");
            ready = true;
          }
        })
        .catch(() => console.error("PORTAL_LOGIN_NOTIFICATIONS_UNAVAILABLE"))
        .finally(() => {
          busy = false;
        });
    };
    const timer = setInterval(tick, 5000);
    timer.unref();
    const initial = setTimeout(tick, 2000);
    initial.unref();
  }
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.BILLING_WORKER_ENABLED === "true") {
    const { runReceivableFlow } = await import("./lib/payments/receivable-flow");
    let busy = false;
    const timer = setInterval(() => {
      if (busy) return;
      busy = true;
      void runReceivableFlow()
        .catch(() => console.error("RECEIVABLE_FLOW_WORKER_UNAVAILABLE"))
        .finally(() => {
          busy = false;
        });
    }, 15000);
    timer.unref();
  }
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.BILLING_WORKER_ENABLED === "true") {
    const { runPendingQuoteArchives } = await import("./lib/payments/recurring-lifecycle");
    let busy = false;
    const tick = () => {
      if (busy) return;
      busy = true;
      void runPendingQuoteArchives()
        .catch(() => console.error("CLIENT_QUOTE_ARCHIVE_RETRY_UNAVAILABLE"))
        .finally(() => {
          busy = false;
        });
    };
    const timer = setInterval(tick, 15000);
    timer.unref();
    const initial = setTimeout(tick, 3000);
    initial.unref();
  }
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.BILLING_WORKER_ENABLED === "true") {
    const { runContactNotifications } = await import("./lib/notifications/contact-outbox");
    let busy = false;
    const tick = () => {
      if (busy) return;
      busy = true;
      void runContactNotifications()
        .catch(() => console.error("CONTACT_NOTIFICATIONS_UNAVAILABLE"))
        .finally(() => {
          busy = false;
        });
    };
    const timer = setInterval(tick, 5000);
    timer.unref();
    const initial = setTimeout(tick, 2000);
    initial.unref();
  }

  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.BILLING_WORKER_ENABLED === "true") {
    const { runMonthlyBilling } = await import("./lib/payments/monthly-billing");
    let busy = false;
    let ready = false;
    const tick = () => {
      if (busy) return;
      busy = true;
      void runMonthlyBilling()
        .then(() => {
          if (!ready) {
            console.info("MONTHLY_BILLING_READY");
            ready = true;
          }
        })
        .catch((error: unknown) =>
          console.error(
            "MONTHLY_BILLING_UNAVAILABLE",
            error && typeof error === "object" && "code" in error
              ? String(error.code)
              : "UNAVAILABLE",
          ),
        )
        .finally(() => {
          busy = false;
        });
    };
    const timer = setInterval(tick, 60000);
    timer.unref();
    const initial = setTimeout(tick, 10000);
    initial.unref();
  }
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.PAYMENT_WORKER_ENABLED === "true") {
    const { runPaymentInbox } = await import("./lib/payments/durable-callbacks");
    const { runPaymentMail } = await import("./lib/payments/payment-outbox");
    const { runRecurringCancellations } = await import("./lib/payments/recurring-lifecycle");
    let busy = false;
    const timer = setInterval(() => {
      if (!busy) {
        busy = true;
        void runPaymentInbox()
          .then(() => Promise.allSettled([runPaymentMail(), runRecurringCancellations()]))
          .catch(() => console.error("PAYMENT_WORKER_UNAVAILABLE"))
          .finally(() => {
            busy = false;
          });
      }
    }, 15000);
    timer.unref();
  }
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.ZYTERON_SANDBOX_ENABLED === "true" &&
    process.env.ZYTERON_SANDBOX_WORKER_ENABLED === "true"
  ) {
    const { runPilot } = await import("./lib/payments/pilot-server");
    let running = false;
    const timer = setInterval(() => {
      if (!running) {
        running = true;
        void runPilot()
          .catch(() => undefined)
          .finally(() => {
            running = false;
          });
      }
    }, 15000);
    timer.unref();
  }
}
