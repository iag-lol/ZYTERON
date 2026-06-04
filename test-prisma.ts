import { prisma } from "./src/lib/prisma";
async function test() {
  try {
    const res = await prisma.workOrder.count();
    console.log("Count:", res);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
