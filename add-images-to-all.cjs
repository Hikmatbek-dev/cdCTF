require("dotenv").config({ path: "./artifacts/api-server/.env" });
const { Client } = require("pg");

const categoryImages = {
  linux: [
    "1629654297299-c8506221ca97", "1624835569420-5c6046e3ac2c", 
    "1550751827-4bd374c3f58b", "1526374965328-7f61d4dc18c5"
  ],
  web: [
    "1451187580459-43490279c0fa", "1558494949-ef010cbdcc31",
    "1498050108023-c5249f4df085", "1504639725590-34d0984388bd"
  ],
  default: [
    "1518770660439-4636190af475", "1563206767-5b18f218e8de",
    "1526374965328-7f61d4dc18c5", "1451187580459-43490279c0fa"
  ]
};

async function main() {
  const client = new Client({ connectionString: "postgresql://postgres:password@localhost:5432/cyberplace" });
  await client.connect();
  const res = await client.query("SELECT id, category_id, content, content_uz, content_ru FROM lessons");
  
  // also fetch categories to map category_id to slug
  const catRes = await client.query("SELECT id, slug FROM categories");
  const categories = {};
  catRes.rows.forEach(r => { categories[r.id] = r.slug; });
  
  let updatedCount = 0;
  for (const row of res.rows) {
    if (row.id === 106 || row.content.includes("<img") || row.content.includes("![")) {
      continue;
    }
    
    const catSlug = categories[row.category_id] || "default";
    const imgSet = categoryImages[catSlug] || categoryImages.default;
    const imgId = imgSet[row.id % imgSet.length];
    const imgUrl = `https://images.unsplash.com/photo-${imgId}?w=800&q=80`;
    const imageMarkdown = `![cdCTF Lesson Image](${imgUrl})\n\n`;
    
    // Add image right at the start
    const newContent = imageMarkdown + row.content;
    const newContentUz = row.content_uz ? imageMarkdown + row.content_uz : null;
    const newContentRu = row.content_ru ? imageMarkdown + row.content_ru : null;
    
    await client.query("UPDATE lessons SET content = $1, content_uz = $2, content_ru = $3 WHERE id = $4", 
      [newContent, newContentUz, newContentRu, row.id]);
    updatedCount++;
  }
  
  console.log(`Updated ${updatedCount} lessons with contextual header images!`);
  await client.end();
}
main();
