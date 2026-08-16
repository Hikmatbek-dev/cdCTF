import { db } from "@workspace/db";
import { lessonsTable } from "@workspace/db/src/schema/learn.js";
import { eq } from "drizzle-orm";

async function main() {
  const allLessons = await db.select().from(lessonsTable);
  for (const lesson of allLessons) {
    if (!lesson.content.includes("### In-Depth Analysis")) {
      const enrichmentEn = `

### In-Depth Analysis
To truly master this concept, you must understand its underlying mechanics. Modern cybersecurity isn't just about using tools; it's about comprehending the fundamental protocols, memory structures, and network handshakes that make these systems tick. When a system processes these packets or instructions, it relies on implicit trust assumptions. Threat actors exploit these precise assumptions. Your goal as an ethical hacker is to map these out, identify the exact point where trust is broken, and demonstrate the impact.

### End of Lesson Task
**Your Task:** Review the core concepts discussed above and formulate a threat model.
1. Identify the most critical vulnerability point.
2. Outline a hypothetical exploit chain that targets this point.
3. Propose a mitigation strategy to secure it.
`;
      
      const enrichmentUz = `

### Chuqur Tahlil
Ushbu tushunchani mukammal o'zlashtirish uchun siz uning asosiy mexanizmlarini tushunishingiz kerak. Zamonaviy kiberxavfsizlik faqat vositalardan foydalanish emas; bu tizimlarning ishlashiga olib keladigan asosiy protokollar, xotira tuzilmalari va tarmoq ulanishlarini tushunishdir. Tizim ushbu paketlarni yoki ko'rsatmalarni qayta ishlaganda, u yashirin ishonch taxminlariga tayanadi. Xavf tug'diruvchilar aynan shu taxminlardan foydalanadilar. Etik hacker sifatida sizning maqsadingiz bularni xaritada ko'rsatish, ishonch buzilgan aniq nuqtani aniqlash va uning ta'sirini ko'rsatishdir.

### Dars Yakunidagi Vazifa
**Sizning Vazifangiz:** Yuqorida muhokama qilingan asosiy tushunchalarni ko'rib chiqing va tahdid modelini tuzing.
1. Eng zaif nuqtani aniqlang.
2. Ushbu nuqtani nishonga oladigan faraziy ekspluatatsiya zanjirini belgilang.
3. Uni himoya qilish uchun yumshatish strategiyasini taklif qiling.
`;

      const enrichmentRu = `

### Глубокий Анализ
Чтобы по-настоящему овладеть этой концепцией, вы должны понять ее основополагающие механизмы. Современная кибербезопасность — это не просто использование инструментов; это понимание фундаментальных протоколов, структур памяти и сетевых рукопожатий, которые заставляют эти системы работать. Когда система обрабатывает эти пакеты или инструкции, она полагается на неявные допущения доверия. Злоумышленники используют именно эти допущения. Ваша цель как этичного хакера — наметить их, определить точную точку, где доверие нарушается, и продемонстрировать последствия.

### Задание в Конце Урока
**Ваше Задание:** Изучите основные концепции, обсуждаемые выше, и сформулируйте модель угроз.
1. Определите наиболее критическую точку уязвимости.
2. Наметьте гипотетическую цепочку эксплойтов, нацеленную на эту точку.
3. Предложите стратегию смягчения последствий для ее защиты.
`;

      await db.update(lessonsTable).set({
        content: lesson.content + enrichmentEn,
        contentUz: (lesson.contentUz || "") + enrichmentUz,
        contentRu: (lesson.contentRu || "") + enrichmentRu
      }).where(eq(lessonsTable.id, lesson.id));
      
      console.log(`Enriched lesson ID: ${lesson.id}`);
    } else {
      console.log(`Lesson ID: ${lesson.id} already enriched.`);
    }
  }
  console.log("All lessons enriched!");
  process.exit(0);
}

main().catch(console.error);
