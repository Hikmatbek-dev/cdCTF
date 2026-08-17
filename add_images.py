import psycopg2

conn = psycopg2.connect("postgresql://postgres:password@localhost:5432/cyberplace")
cur = conn.cursor()

images = ["1518770660439-4636190af475", "1563206767-5b18f218e8de", "1526374965328-7f61d4dc18c5", "1451187580459-43490279c0fa", "1550751827-4bd374c3f58b", "1558494949-ef010cbdcc31"]

cur.execute("SELECT id, content, content_uz, content_ru FROM lessons")
lessons = cur.fetchall()

updated = 0
for row in lessons:
    lid, c, cu, cr = row
    if lid == 106 or "<img" in (c or "") or "![" in (c or ""):
        continue
        
    img_id = images[lid % len(images)]
    img_md = f"![cdCTF Lesson Image](https://images.unsplash.com/photo-{img_id}?w=800&q=80)\n\n"
    
    c = img_md + (c or "")
    cu = img_md + (cu or "") if cu else None
    cr = img_md + (cr or "") if cr else None
    
    cur.execute("UPDATE lessons SET content=%s, content_uz=%s, content_ru=%s WHERE id=%s", (c, cu, cr, lid))
    updated += 1

conn.commit()
print(f"Updated {updated} lessons with images.")
