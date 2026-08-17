import psycopg2
conn = psycopg2.connect("postgresql://postgres:password@localhost:5432/cyberplace")
cur = conn.cursor()
cur.execute("SELECT id, title, flag FROM challenges WHERE title ILIKE '%handshake%'")
print(cur.fetchall())
