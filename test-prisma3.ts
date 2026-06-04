import { prisma } from "./src/lib/prisma";
async function test() {
  const order = await prisma.workOrder.create({
    data: {
      id: "test1",
      code: "TEST-01",
      title: "Test",
      status: "ACTIVE"
    }
  });
  console.log("createdAt type:", typeof order.createdAt);
  console.log("Is Date?", order.createdAt instanceof Date);
  await prisma.workOrder.delete({ where: { id: "test1" } });
}
test();
