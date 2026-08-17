import { db } from "./artifacts/api-server/src/lib/db/index";
import { lessons } from "./artifacts/api-server/src/lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const less = await db.select().from(lessons).where(eq(lessons.id, 106));
  if (less.length > 0) {
    const l = less[0];
    const imageMarkdown = `\n\n![Linux Filesystem Hierarchy](https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRt9l4-ab9716tEPKh_5lCOXlWdljiQqy9NXzAy79vozeyY0VDGGf6Nbjdf&s=10)\n\n`;
    
    // Add image right after the first heading or at the top if no heading
    let newContent = l.content.replace("## The ones that matter in security", "## The ones that matter in security" + imageMarkdown);
    let newContentUz = l.contentUz ? l.contentUz.replace("## Xavfsizlikda muhim bo'lganlari", "## Xavfsizlikda muhim bo'lganlari" + imageMarkdown) : null;
    let newContentRu = l.contentRu ? l.contentRu.replace("## Те, которые важны в безопасности", "## Те, которые важны в безопасности" + imageMarkdown) : null;
    
    if (newContent === l.content) {
      newContent = imageMarkdown + l.content;
      newContentUz = imageMarkdown + (l.contentUz || "");
      newContentRu = imageMarkdown + (l.contentRu || "");
    }
    
    await db.update(lessons).set({
      content: newContent,
      contentUz: newContentUz,
      contentRu: newContentRu,
    }).where(eq(lessons.id, 106));
    console.log("Updated lesson 106 with image.");
  }
  process.exit(0);
}
main();
