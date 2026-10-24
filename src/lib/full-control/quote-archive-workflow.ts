type Control = { managed: boolean; state?: string };
/** La eliminación sólo se declara terminada cuando la renovación está conciliada. */
export async function quoteArchiveWorkflow(work: {
  control: () => Promise<Control>;
  requestCancellation: () => Promise<unknown>;
  archiveState: () => Promise<string | undefined>;
  archive: () => Promise<unknown>;
}) {
  const flow = await work.control();
  if (flow.managed && ["ACTIVE", "CANCEL_REQUESTED"].includes(flow.state || "")) {
    await work.requestCancellation();
    return { ok: true, pending: (await work.archiveState()) !== "ARCHIVED" };
  }
  await work.archive();
  return { ok: true, pending: false };
}
