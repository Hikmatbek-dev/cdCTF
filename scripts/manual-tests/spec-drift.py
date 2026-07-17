#!/usr/bin/env python3
"""Compares the OpenAPI spec against the routes the server actually registers.

The spec drifted for months without anyone noticing: it documented three
endpoints that did not exist — which codegen turned into client hooks that 404 —
while 57 real ones were missing. Nothing checked, so nothing caught it.

Exit code 1 on any phantom. Undocumented routes are reported but tolerated:
some are deliberate legacy aliases.
"""
import re, sys, pathlib, yaml

ROOT = pathlib.Path(__file__).resolve().parents[2]
ROUTES = ROOT / "artifacts/api-server/src/routes"

# Backward-compatible aliases kept for old clients; documenting them would
# invite new callers onto paths that exist only to be retired.
ALIASES = {
    ("POST", "/ctf/{id}/flag"),
    ("POST", "/learn/lessons/{id}/start-test"),
    ("POST", "/learn/lessons/{id}/submit-test"),
    ("POST", "/learn/lessons/{id}/escape"),
    ("POST", "/admin/ctf/{id}/unblock-user"),
    ("POST", "/admin/competitions/{id}/users"),
    ("POST", "/admin/unblock"),
    ("PUT", "/admin/ctf/{id}"),
    ("PUT", "/admin/lessons/{id}"),
    ("PUT", "/admin/competitions/{id}"),
}

def real_routes():
    index = (ROUTES / "index.ts").read_text()
    imports = dict(re.findall(r'import\s+(\w+)\s+from\s+"\./(\w+)"', index))
    prefixes = {m.group(2): (m.group(1) or "")
                for m in re.finditer(r'router\.use\((?:"([^"]+)",\s*)?(\w+)\)', index)}
    found = set()
    for var, fname in imports.items():
        if var not in prefixes:
            continue
        text = (ROUTES / f"{fname}.ts").read_text()
        for m in re.finditer(r'router\.(get|post|put|patch|delete)\("([^"]*)"', text):
            path = re.sub(r'/+', '/', prefixes[var] + m.group(2))
            path = (path.rstrip("/") or "/")
            found.add((m.group(1).upper(), re.sub(r':(\w+)', r'{\1}', path)))
    return found

def documented():
    spec = yaml.safe_load((ROOT / "lib/api-spec/openapi.yaml").read_text())
    return {(verb.upper(), path.rstrip("/") or "/")
            for path, ops in spec["paths"].items()
            for verb in ops if verb in ("get", "post", "put", "patch", "delete")}

real, spec = real_routes(), documented()
phantom = sorted(spec - real)
missing = sorted(real - spec - ALIASES)

print(f"server: {len(real)} | spec: {len(spec)} | ikkalasida: {len(real & spec)}")

if phantom:
    print(f"\n❌ FANTOM — specda bor, serverda yo'q ({len(phantom)}):")
    for verb, path in phantom:
        print(f"   {verb:6} {path}")
    print("\n   Bular mijozga hook bo'lib generatsiya qilinadi va 404 beradi.")

if missing:
    print(f"\n⚠️  HUJJATSIZ ({len(missing)}):")
    for verb, path in missing:
        print(f"   {verb:6} {path}")

if not phantom and not missing:
    print("\n🎉 spec serverga to'liq mos")

sys.exit(1 if phantom else 0)
