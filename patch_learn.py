import re

with open("scripts/src/seed-network-hard.ts", "r") as f:
    content = f.read()

# Extract NETWORK_LESSONS and EXAM_QUESTIONS
match = re.search(r'(const NETWORK_LESSONS.*?];)', content, re.DOTALL)
network_lessons = match.group(1)

with open("artifacts/api-server/src/routes/learn.ts", "r") as f:
    learn_ts = f.read()

new_hack = """// TEMPORARY SEEDER ENDPOINT FOR PRODUCTION (TO BE REMOVED LATER)
router.get("/seed-hack", async (req, res) => {
""" + network_lessons + """

  const modTitle = "Networking basics";
  const modRes = await db.select().from(modulesTable).where(eq(modulesTable.title, modTitle));
  if (modRes.length === 0) return res.status(404).json({ error: "Module not found" });
  const mid = modRes[0].id;

  // Insert hard exam questions
  await db.delete(moduleQuestionsTable).where(eq(moduleQuestionsTable.moduleId, mid));
  for (let i = 0; i < EXAM_QUESTIONS.length; i++) {
    const q = EXAM_QUESTIONS[i];
    await db.insert(moduleQuestionsTable).values({
      moduleId: mid,
      question: q.q, questionUz: q.quz, questionRu: q.qru,
      options: q.options, optionsUz: q.optionsuz, optionsRu: q.optionsru,
      correctOption: q.correct, orderIndex: i
    });
  }

  // Insert medium lesson questions
  const lessons = await db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, mid));
  let added = 0;
  for (const l of lessons) {
    const qs = NETWORK_LESSONS[l.title];
    if (qs) {
      await db.delete(lessonQuestionsTable).where(eq(lessonQuestionsTable.lessonId, l.id));
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i];
        await db.insert(lessonQuestionsTable).values({
          lessonId: l.id,
          question: q.q, questionUz: q.quz, questionRu: q.qru,
          options: q.options, optionsUz: q.optionsuz, optionsRu: q.optionsru,
          correctOption: q.correct, orderIndex: i
        });
        added++;
      }
    }
  }

  res.json({ success: true, message: "Networking basics fully seeded with hard/medium trilingual questions!" });
});

export default router;
"""

new_learn = re.sub(r'// TEMPORARY SEEDER ENDPOINT FOR PRODUCTION.*', new_hack, learn_ts, flags=re.DOTALL)

with open("artifacts/api-server/src/routes/learn.ts", "w") as f:
    f.write(new_learn)

