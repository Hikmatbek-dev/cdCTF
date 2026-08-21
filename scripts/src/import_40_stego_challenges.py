#!/usr/bin/env python3
"""
Import 40 stego CTF challenges into PostgreSQL database `cyberplace` and local `uploads/ctf/` directory.

Usage:
  python3 scripts/src/import_40_stego_challenges.py
"""

import os
import sys
import json
import shutil
import psycopg2
from pathlib import Path

HERE = Path(__file__).parent.resolve()
PROJECT_ROOT = HERE.parent.parent.resolve()
JSON_PATH = PROJECT_ROOT / "scripts" / "content" / "40_file_challenges.json"
FILES_DIR = PROJECT_ROOT / "scripts" / "content" / "files"
UPLOADS_DIR = PROJECT_ROOT / "uploads" / "ctf"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

if not JSON_PATH.exists():
    print(f"Error: {JSON_PATH} does not exist. Run generator first.")
    sys.exit(1)

with open(JSON_PATH, "r", encoding="utf-8") as f:
    challenges = json.load(f)

print(f"Loaded {len(challenges)} challenges from {JSON_PATH}")

# Connect to database
try:
    conn = psycopg2.connect(
        dbname=os.getenv("PGDATABASE", "cyberplace"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD", "password"),
        host=os.getenv("PGHOST", "localhost"),
        port=os.getenv("PGPORT", "5432")
    )
    cur = conn.cursor()
    print("Connected to PostgreSQL successfully.")
except Exception as e:
    print(f"Database connection error: {e}")
    sys.exit(1)

# Ensure columns exist
for alter in [
    "ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS name_uz text",
    "ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS name_ru text",
    "ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS description_uz text",
    "ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS description_ru text",
    "ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS file_url text",
    "ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true",
]:
    cur.execute(alter)
conn.commit()

added = 0
updated = 0

for c in challenges:
    filename = c["filename"]
    src_file = FILES_DIR / filename
    if not src_file.exists():
        print(f"Warning: File {src_file} missing!")
        continue

    # Copy to uploads/ctf/
    dst_file = UPLOADS_DIR / filename
    shutil.copy2(src_file, dst_file)

    # Read binary for ctf_files DB fallback
    with open(src_file, "rb") as bf:
        import base64
        b64_content = base64.b64encode(bf.read()).decode()

    # Content type
    content_type = "image/png" if filename.endswith(".png") else "image/jpeg"

    # Insert into ctf_files
    cur.execute(
        "INSERT INTO ctf_files (filename, content_type, content) VALUES (%s, %s, %s) RETURNING id",
        (filename, content_type, b64_content)
    )
    file_id = cur.fetchone()[0]
    
    # Public URL accessible both locally via Express static and via API download route
    file_url = f"/api/uploads/download/{file_id}/{filename}"

    # Upsert into ctf_tasks
    cur.execute("SELECT id FROM ctf_tasks WHERE name = %s LIMIT 1", (c["name"],))
    row = cur.fetchone()

    if row:
        cur.execute(
            """UPDATE ctf_tasks SET
                name_uz = %s, name_ru = %s,
                description = %s, description_uz = %s, description_ru = %s,
                category = %s, difficulty = %s, points = %s,
                hint = %s, hint_uz = %s, hint_ru = %s,
                flag = %s, file_url = %s, is_published = true
               WHERE id = %s""",
            (
                c["nameUz"], c["nameRu"],
                c["description"], c.get("descriptionUz"), c.get("descriptionRu"),
                c["category"], c["difficulty"], c["points"],
                c.get("hint"), c.get("hintUz"), c.get("hintRu"),
                c["flagHash"], file_url, row[0]
            )
        )
        updated += 1
    else:
        cur.execute(
            """INSERT INTO ctf_tasks
               (name, name_uz, name_ru, description, description_uz, description_ru,
                category, difficulty, points, hint, hint_uz, hint_ru, flag, file_url, is_published)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,true)""",
            (
                c["name"], c["nameUz"], c["nameRu"],
                c["description"], c.get("descriptionUz"), c.get("descriptionRu"),
                c["category"], c["difficulty"], c["points"],
                c.get("hint"), c.get("hintUz"), c.get("hintRu"),
                c["flagHash"], file_url
            )
        )
        added += 1

conn.commit()
cur.close()
conn.close()

print(f"\n🎉 Done! Added {added} new challenges, updated {updated} existing challenges in PostgreSQL.")
