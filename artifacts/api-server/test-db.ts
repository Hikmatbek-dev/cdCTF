import { db } from "@workspace/db";
import { ctfTasksTable } from "@workspace/db/schema";
import { ilike } from "drizzle-orm";

async function run() {
  const res = await db.select().from(ctfTasksTable).where(ilike(ctfTasksTable.name, "%handshake%"));
  console.log(res);
  process.exit(0);
}
run();
