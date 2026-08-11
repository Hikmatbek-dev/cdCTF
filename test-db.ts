import { db } from "./artifacts/db/src/index.js";
import { ctfTasksTable } from "./artifacts/db/src/schema.js";

async function main() {
  const tasks = await db.select({ id: ctfTasksTable.id, name: ctfTasksTable.name, flag: ctfTasksTable.flag }).from(ctfTasksTable);
  console.log(tasks);
  process.exit(0);
}
main();
