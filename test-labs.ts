import { db } from "./artifacts/db/src/index.js";
import { labsTable } from "./artifacts/db/src/schema.js";

async function main() {
  const labs = await db.select().from(labsTable);
  console.log("Labs:", labs);
  process.exit(0);
}
main();
