#!/usr/bin/env python3
"""Every environment variable the code reads is named in .env.example.

This keeps happening. Turnstile was written, wired and enforced, and none of its
three variables appeared in .env.example — so there was nothing to tell anyone to
switch it on, and the captcha never ran. Supabase Storage is the same shape: unset,
uploads silently pack themselves into Postgres as base64. EMAIL_VERIFICATION_REQUIRED
is worse than silent — turned on without a Resend key, it deletes each new account
and answers 503, so registration stops entirely.

A variable nobody documents is a feature nobody can turn on, or a trap nobody sees.
The code is the source of truth here: this reads what it actually reaches for and
checks the file mentions it. It says nothing about the values.

Run: python3 scripts/manual-tests/env-documented.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# Injected by the host, not ours to hand anyone. NODE_ENV and CI come from the
# runtime; the VERCEL_* ones from Vercel; REPLIT_DEV_DOMAIN from Replit.
PLATFORM = {
    "NODE_ENV",
    "CI",
    "VERCEL",
    "VERCEL_URL",
    "VERCEL_PROJECT_PRODUCTION_URL",
    "AWS_LAMBDA_FUNCTION_NAME",
    "REPLIT_DEV_DOMAIN",
    "npm_config_resolution_mode",
}

SOURCES = [
    "artifacts/api-server/src/**/*.ts",
    "artifacts/cyberplace/src/**/*.ts",
    "artifacts/cyberplace/src/**/*.tsx",
    "lib/*/src/**/*.ts",
]


def collect_used() -> dict[str, str]:
    """name -> the first file that reads it, for a message that can be acted on."""
    found: dict[str, str] = {}
    for pattern in SOURCES:
        for path in ROOT.glob(pattern):
            if "generated" in path.parts or "node_modules" in path.parts:
                continue
            text = path.read_text()
            names = re.findall(r"process\.env\.([A-Z0-9_]+)", text)
            # Vite inlines these at build time, so they are configuration too.
            names += re.findall(r"import\.meta\.env\.(VITE_[A-Z0-9_]+)", text)
            for name in names:
                found.setdefault(name, str(path.relative_to(ROOT)))
    return found


def collect_documented() -> set[str]:
    example = ROOT / ".env.example"
    if not example.exists():
        print("❌ .env.example yo'q")
        sys.exit(1)
    # Commented-out lines count: the point is that a reader is told the variable
    # exists, not that it ships with a value.
    return set(re.findall(r"^#?\s*([A-Z0-9_]+)=", example.read_text(), re.M))


def main() -> int:
    used = collect_used()
    documented = collect_documented()
    missing = sorted(set(used) - documented - PLATFORM)

    print(f"kod o'qiydi: {len(used)} | .env.example: {len(documented)}")

    if missing:
        print(f"\n❌ KOD O'QIYDI, .env.example'da YO'Q ({len(missing)}):")
        for name in missing:
            print(f"   {name:32} <- {used[name]}")
        print("\n   Har birini .env.example'ga qo'shing: nima qilishi, standarti,")
        print("   va sozlanmaganda NIMA BO'LISHI. Oxirgisi eng muhimi — jimgina")
        print("   o'chib qoladigan himoya ishlaydiganidan farq qilmaydi.")
        return 1

    print("\n🎉 HAR BIR O'ZGARUVCHI HUJJATLASHTIRILGAN")
    return 0


if __name__ == "__main__":
    sys.exit(main())
