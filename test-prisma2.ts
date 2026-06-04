import { prisma } from "./src/lib/prisma";
async function test() {
  const order = await prisma.workOrder.findFirst();
  if (order) {
    console.log("createdAt type:", typeof order.createdAt);
    console.log("Is Date?", order.createdAt instanceof Date);
  } else {
    console.log("No order");
  }
}
test();
