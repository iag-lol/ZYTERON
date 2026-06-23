import { prisma } from "./src/lib/prisma";
async function debug() {
  try {
    const id = "test-id";
    const quoteId = "test-quote";
    await prisma.workOrder.create({
      data: {
        id,
        code: "TEST-01",
        source: "MANUAL_QUOTE",
        status: "ACTIVE",
        priority: "NORMAL",
        quoteId,
        clientId: null,
        title: "Test",
        description: "Test desc",
        scope: ["Test scope"],
        plannedDate: new Date(),
        dueDate: new Date(),
        estimatedHours: 12,
        budget: 1000,
        notes: "Test notes",
        pdfUrl: `/admin/ordenes-trabajo/${id}/pdf`,
      },
    });
    console.log("Success");
    await prisma.workOrder.delete({ where: { id } });
  } catch (error: unknown) {
    console.error("Error creating WorkOrder:");
    console.error(error instanceof Error ? error.message : String(error));
  }
}
debug();
