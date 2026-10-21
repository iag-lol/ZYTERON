export async function register() {
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
