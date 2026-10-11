export async function register() {
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
