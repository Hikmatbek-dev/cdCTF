import fs from 'fs';

const filePath = 'artifacts/api-server/src/routes/ctf.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Add import for competitionTasksTable
content = content.replace(
  'ctfTasksTable, ctfAttemptsTable, ctfWriteupsTable, titlesTable, usersTable, modulesTable, labsTable, labInstancesTable',
  'ctfTasksTable, ctfAttemptsTable, ctfWriteupsTable, titlesTable, usersTable, modulesTable, labsTable, labInstancesTable, competitionTasksTable'
);

// Replace the `published` query to filter out competition tasks
const oldQuery = `  const published = await db.select().from(ctfTasksTable).where(eq(ctfTasksTable.isPublished, true));`;
const newQuery = `  // Exclude tasks that are mapped to any competition. Competition tasks belong ONLY to their competition.
  const compTasks = await db.select({ ctfId: competitionTasksTable.ctfId }).from(competitionTasksTable);
  const compTaskIds = new Set(compTasks.map(t => t.ctfId));

  const allPublished = await db.select().from(ctfTasksTable).where(eq(ctfTasksTable.isPublished, true));
  const published = allPublished.filter(c => !compTaskIds.has(c.id));`;

content = content.replace(oldQuery, newQuery);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched ctf.ts successfully');
