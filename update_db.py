import psycopg2

conn = psycopg2.connect("postgresql://postgres:password@localhost:5432/cyberplace")
cur = conn.cursor()

cur.execute("SELECT content, content_uz, content_ru FROM lessons WHERE id = 106")
row = cur.fetchone()

if row:
    content, content_uz, content_ru = row
    img = '\n\n<img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRt9l4-ab9716tEPKh_5lCOXlWdljiQqy9NXzAy79vozeyY0VDGGf6Nbjdf&s=10" alt="Linux Filesystem Hierarchy" className="w-full max-w-2xl mx-auto rounded-xl shadow-lg border border-border/50 my-6" />\n\n'
    
    if "## The ones that matter in security" in content:
        content = content.replace("## The ones that matter in security", img + "## The ones that matter in security")
    else:
        content = img + content
        
    if content_uz and "## Xavfsizlikda muhim bo'lganlari" in content_uz:
        content_uz = content_uz.replace("## Xavfsizlikda muhim bo'lganlari", img + "## Xavfsizlikda muhim bo'lganlari")
    elif content_uz:
        content_uz = img + content_uz
        
    if content_ru and "## Те, которые важны в безопасности" in content_ru:
        content_ru = content_ru.replace("## Те, которые важны в безопасности", img + "## Те, которые важны в безопасности")
    elif content_ru:
        content_ru = img + content_ru
        
    cur.execute("UPDATE lessons SET content = %s, content_uz = %s, content_ru = %s WHERE id = 106", (content, content_uz, content_ru))
    conn.commit()
    print("Updated successfully")
