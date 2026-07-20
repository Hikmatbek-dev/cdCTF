#!/usr/bin/env python3
"""
Build the module curriculum into curriculum.json.

This is the source of truth for the platform's courses. Each module is a real,
in-order set of deep lessons — TryHackMe-depth, with commands you actually run
and the output they actually print — ending in a final exam and a certificate.

Everything is trilingual (English, Uzbek, Russian). The build refuses to emit
anything that is missing a translation, or whose quiz has an out-of-range
answer, so a partly-written lesson can never reach a database.

    python3 scripts/curriculum/build.py        # writes curriculum.json
    python3 scripts/curriculum/build.py --check # validate only, write nothing

Modules are authored one file per module under scripts/curriculum/modules/ and
assembled here. Adding a module is: write its file, import it in MODULE_SOURCES.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

# ---------------------------------------------------------------------------
# Categories. Every module names one; they exist independently so the whole
# six-month path has a stable set of tracks regardless of which modules ship.
# ---------------------------------------------------------------------------
CATEGORIES = [
    {"key": "linux",      "name": "Linux for Security",     "nameUz": "Xavfsizlik uchun Linux",   "nameRu": "Linux для безопасности"},
    {"key": "networking", "name": "Networking",             "nameUz": "Tarmoqlar",                "nameRu": "Сети"},
    {"key": "web",        "name": "Web Security",           "nameUz": "Veb xavfsizlik",           "nameRu": "Веб-безопасность"},
    {"key": "crypto",     "name": "Cryptography",           "nameUz": "Kriptografiya",            "nameRu": "Криптография"},
    {"key": "recon",      "name": "Recon & Scanning",       "nameUz": "Razvedka va skanerlash",   "nameRu": "Разведка и сканирование"},
    {"key": "exploit",    "name": "Exploitation",           "nameUz": "Ekspluatatsiya",           "nameRu": "Эксплуатация"},
    {"key": "forensics",  "name": "Forensics & IR",         "nameUz": "Forenzika va IR",          "nameRu": "Форензика и IR"},
    {"key": "capstone",   "name": "CTF Methodology",        "nameUz": "CTF metodologiyasi",       "nameRu": "Методология CTF"},
]


def q(en, uz, ru, options, opts_uz, opts_ru, correct):
    """One multiple-choice question in three languages."""
    return {
        "question": en, "questionUz": uz, "questionRu": ru,
        "options": options, "optionsUz": opts_uz, "optionsRu": opts_ru,
        "correctOption": correct,
    }


# Assemble modules from their per-file authors.
import mod01_linux  # noqa: E402
import mod02_networking  # noqa: E402
import mod03_web  # noqa: E402
import mod04_crypto  # noqa: E402
import mod05_recon  # noqa: E402
import mod06_exploit  # noqa: E402

MODULE_SOURCES = [
    mod01_linux,
    mod02_networking,
    mod03_web,
    mod04_crypto,
    mod05_recon,
    mod06_exploit,
]


def collect():
    modules_out = []
    lessons_out = []
    for src in MODULE_SOURCES:
        m = src.MODULE
        modules_out.append({
            "slug": m["slug"], "category": m["category"],
            "title": m["title"], "titleUz": m["titleUz"], "titleRu": m["titleRu"],
            "description": m["description"], "descriptionUz": m["descriptionUz"], "descriptionRu": m["descriptionRu"],
            "difficulty": m["difficulty"], "estimatedHours": m["estimatedHours"],
            "passScore": m["passScore"], "orderIndex": m["orderIndex"],
            "exam": m["exam"],
        })
        for i, lesson in enumerate(src.LESSONS):
            lessons_out.append({**lesson, "module": m["slug"], "orderIndex": i})
    return modules_out, lessons_out


def validate(categories, modules, lessons):
    errors = []
    cat_keys = {c["key"] for c in categories}
    for c in categories:
        for k in ("name", "nameUz", "nameRu"):
            if not c.get(k, "").strip():
                errors.append(f"category {c['key']}: bo'sh {k}")

    slugs = set()
    for m in modules:
        if m["slug"] in slugs:
            errors.append(f"module {m['slug']}: takroriy slug")
        slugs.add(m["slug"])
        if m["category"] not in cat_keys:
            errors.append(f"module {m['slug']}: noma'lum kategoriya {m['category']}")
        for k in ("title", "titleUz", "titleRu", "description", "descriptionUz", "descriptionRu"):
            if not str(m.get(k, "")).strip():
                errors.append(f"module {m['slug']}: bo'sh {k}")
        if len(m["exam"]) < 10:
            errors.append(f"module {m['slug']}: imtihonda {len(m['exam'])} savol (kamida 10 kerak)")
        _check_questions(m["exam"], f"module {m['slug']} exam", errors)

    titles = set()
    per_module = {}
    for l in lessons:
        if l["title"] in titles:
            errors.append(f"lesson '{l['title']}': takroriy sarlavha")
        titles.add(l["title"])
        if l["module"] not in slugs:
            errors.append(f"lesson '{l['title']}': noma'lum modul {l['module']}")
        per_module[l["module"]] = per_module.get(l["module"], 0) + 1
        for k in ("title", "titleUz", "titleRu", "content", "contentUz", "contentRu"):
            if not str(l.get(k, "")).strip():
                errors.append(f"lesson '{l['title']}': bo'sh {k}")
        # Depth floor: a lesson under ~400 chars in any language is a stub, not
        # the "six-month, knowledge-sharing" content this platform is for.
        for k in ("content", "contentUz", "contentRu"):
            if len(str(l.get(k, ""))) < 400:
                errors.append(f"lesson '{l['title']}': {k} juda qisqa ({len(str(l.get(k,'')))} belgi)")
        _check_questions(l["questions"], f"lesson '{l['title']}'", errors)

    for slug in slugs:
        n = per_module.get(slug, 0)
        if n < 5:
            errors.append(f"module {slug}: {n} dars (kamida 5 kerak)")
    return errors


def _check_questions(questions, where, errors):
    for i, qq in enumerate(questions):
        tag = f"{where} savol #{i+1}"
        for k in ("question", "questionUz", "questionRu"):
            if not str(qq.get(k, "")).strip():
                errors.append(f"{tag}: bo'sh {k}")
        lens = {len(qq["options"]), len(qq["optionsUz"]), len(qq["optionsRu"])}
        if len(lens) != 1:
            errors.append(f"{tag}: variantlar soni tillarda mos emas {lens}")
        n = len(qq["options"])
        if n < 2:
            errors.append(f"{tag}: {n} ta variant")
        if not (0 <= qq["correctOption"] < n):
            errors.append(f"{tag}: correctOption {qq['correctOption']} chegaradan tashqarida")
        for lst in (qq["options"], qq["optionsUz"], qq["optionsRu"]):
            if any(not str(o).strip() for o in lst):
                errors.append(f"{tag}: bo'sh variant")


def main():
    check_only = "--check" in sys.argv
    modules, lessons = collect()
    errors = validate(CATEGORIES, modules, lessons)
    if errors:
        print("❌ Validatsiya yiqildi:")
        for e in errors:
            print("   -", e)
        sys.exit(1)

    total_q = sum(len(l["questions"]) for l in lessons) + sum(len(m["exam"]) for m in modules)
    print(f"✅ {len(modules)} modul, {len(lessons)} dars, {total_q} savol — validatsiya o'tdi.")
    for m in modules:
        n = sum(1 for l in lessons if l["module"] == m["slug"])
        print(f"   • {m['slug']}: {n} dars, {len(m['exam'])} imtihon savoli, ~{m['estimatedHours']} soat")

    if check_only:
        print("(--check: fayl yozilmadi)")
        return
    out = {"categories": CATEGORIES, "modules": modules, "lessons": lessons}
    path = os.path.join(HERE, "curriculum.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"→ {path} ({os.path.getsize(path)//1024} KB)")


if __name__ == "__main__":
    main()
