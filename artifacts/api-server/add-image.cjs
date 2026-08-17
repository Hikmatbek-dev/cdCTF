require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query("SELECT id, content, content_uz, content_ru FROM lessons WHERE id = 106");
  if (res.rows.length > 0) {
    let { content, content_uz, content_ru } = res.rows[0];
    const imgUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRt9l4-ab9716tEPKh_5lCOXlWdljiQqy9NXzAy79vozeyY0VDGGf6Nbjdf&s=10";
    const imageMarkdown = `\n\n<img src="${imgUrl}" alt="Linux Filesystem Hierarchy" className="w-full max-w-2xl mx-auto rounded-xl shadow-lg border border-border/50 my-6" />\n\n`;
    
    // Add image right after the first heading
    let newContent = content.replace("## The ones that matter in security", "## The ones that matter in security" + imageMarkdown);
    let newContentUz = content_uz ? content_uz.replace("## Xavfsizlikda muhim bo'lganlari", "## Xavfsizlikda muhim bo'lganlari" + imageMarkdown) : null;
    let newContentRu = content_ru ? content_ru.replace("## Те, которые важны в безопасности", "## Те, которые важны в безопасности" + imageMarkdown) : null;
    
    if (newContent === content) {
      newContent = imageMarkdown + content;
      newContentUz = imageMarkdown + (content_uz || "");
      newContentRu = imageMarkdown + (content_ru || "");
    }
    
    await client.query("UPDATE lessons SET content = $1, content_uz = $2, content_ru = $3 WHERE id = 106", [newContent, newContentUz, newContentRu]);
    console.log("Updated lesson 106 with image.");
  } else {
    console.log("Lesson 106 not found!");
  }
  await client.end();
}
main();
