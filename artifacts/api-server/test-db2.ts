import { db } from "@workspace/db";
import { ctfTasksTable, labsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const tasks = await db.select({
    id: ctfTasksTable.id,
    name: ctfTasksTable.name,
    flag: ctfTasksTable.flag
  }).from(ctfTasksTable);
  
  const labs = await db.select().from(labsTable);
  
  console.log("TASKS:");
  console.log(tasks.filter(t => t.name.includes("Birlar") || t.name.includes("Asoslar") || t.name.includes("Miya") || t.name.includes("Chinor")));
  
  console.log("LABS:");
  console.log(labs);
  
  process.exit(0);
}
main();
